import { spawn } from 'child_process';
import { once } from 'events';
import { readFile, mkdtemp, writeFile } from 'fs/promises';
import { request as proxyRequest } from 'http';
import { AddressInfo } from 'net';
import { tmpdir } from 'os';
import { resolve, join } from 'path';
import express from 'express';

/** Real Chromium smoke test without adding a browser dependency to the app. */
export async function checkBiodataBrowser(apiOrigin: string, email: string, password: string, png: Buffer) {
  const site = express();
  site.use('/api', (req, res) => {
    const outgoing = proxyRequest(new URL(req.originalUrl, apiOrigin), { method: req.method, headers: req.headers }, (incoming) => {
      res.writeHead(incoming.statusCode ?? 500, incoming.headers);
      incoming.pipe(res);
    });
    outgoing.on('error', () => res.sendStatus(502));
    req.pipe(outgoing);
  });
  const dist = resolve('../frontend/dist');
  site.use(express.static(dist));
  site.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')));
  const server = site.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const directory = await mkdtemp(join(tmpdir(), 'wow-biodata-browser-'));
  const fixture = join(directory, 'family.png');
  await writeFile(fixture, png);
  const chrome = spawn(process.env.CHROME_BIN!, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${directory}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket: WebSocket | undefined;
  const pause = () => new Promise((done) => setTimeout(done, 100));
  try {
    let port = '';
    for (let i = 0; i < 100 && !port; i++) {
      try { port = (await readFile(join(directory, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { await pause(); }
    }
    if (!port) throw new Error('Headless browser did not start');
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json() as { type: string; webSocketDebuggerUrl: string }[];
    socket = new WebSocket(targets.find((target) => target.type === 'page')!.webSocketDebuggerUrl);
    await new Promise<void>((done, reject) => { socket!.onopen = () => done(); socket!.onerror = () => reject(new Error('Browser connection failed')); });
    let sequence = 0;
    const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as { id: number; result: unknown; error?: { message: string } };
      const receiver = pending.get(message.id);
      if (!receiver) return;
      pending.delete(message.id);
      if (message.error) receiver.reject(new Error(message.error.message));
      else receiver.resolve(message.result);
    };
    const send = <T>(method: string, params: object = {}): Promise<T> => new Promise((done, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve: (value) => done(value as T), reject });
      socket!.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async <T>(expression: string): Promise<T> => {
      const result = await send<{ result: { value: T }; exceptionDetails?: unknown }>('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(`Browser evaluation failed: ${expression}`);
      return result.result.value;
    };
    const waitFor = async (expression: string) => {
      for (let i = 0; i < 150; i++) {
        try { if (await evaluate<boolean>(expression)) return; } catch { /* navigation changes the JS context */ }
        await pause();
      }
      throw new Error(`Browser condition timed out: ${expression}; page: ${await evaluate('document.body.innerText')}`);
    };
    const fill = (selector: string, value: string) => evaluate(`(() => { const input = document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    const navigate = async (path: string) => { await send('Page.navigate', { url: origin + path }); };
    const login = async () => {
      await navigate('/login');
      await waitFor('Boolean(document.querySelector("#email"))');
      await fill('#email', email);
      await fill('input[type=password]', password);
      await evaluate('document.querySelector("#email").closest("form").requestSubmit()');
      await waitFor('location.pathname !== "/login"');
    };
    const openPhoto = async () => {
      await waitFor('Boolean(document.querySelector("#section-family-photo button"))');
      await evaluate('document.querySelector("#section-family-photo button").click()');
      await waitFor('Boolean(document.querySelector("#section-family-photo input[type=file]"))');
    };
    await send('Page.enable');
    await login();
    await navigate('/biodata');
    await waitFor('document.querySelector("#section-personal input[aria-label]")?.value === "8"');
    const heightSelector = 'input[aria-label="Height in feet"]';
    for (const invalid of ['abc', '-5', '5..6', '5.', '8.1', '']) {
      await fill(heightSelector, invalid);
      if (await evaluate(`document.querySelector(${JSON.stringify(heightSelector)}).checkValidity()`)) throw new Error(`Browser accepted invalid height ${invalid}`);
    }
    await fill(heightSelector, '5.6');
    const invalidFields = await evaluate<string[]>(`Array.from(document.querySelector(${JSON.stringify(heightSelector)}).closest('form').querySelectorAll(':invalid')).map(input => input.outerHTML + ': ' + input.validationMessage)`);
    if (invalidFields.length) throw new Error(`Invalid form fields: ${invalidFields.join('; ')}`);
    await evaluate(`document.querySelector(${JSON.stringify(heightSelector)}).closest('form').requestSubmit()`);
    await waitFor('document.body.innerText.includes("Saved. Next:")');
    await openPhoto();
    let url = await evaluate<string>('document.querySelector("#section-family-photo img")?.src ?? ""');
    for (let i = 0; i < 2; i++) {
      const doc = await send<{ root: { nodeId: number } }>('DOM.getDocument');
      const input = await send<{ nodeId: number }>('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#section-family-photo input[type=file]' });
      await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [fixture] });
      await waitFor(`(() => { const image = document.querySelector('#section-family-photo img'); return image && image.src !== ${JSON.stringify(url)} && image.naturalWidth > 0 && !document.querySelector('#section-family-photo input[type=file]').disabled; })()`);
      url = await evaluate<string>('document.querySelector("#section-family-photo img").src');
    }
    await navigate('/biodata');
    await openPhoto();
    await waitFor(`document.querySelector('#section-family-photo img')?.src === ${JSON.stringify(url)}`);
    await evaluate(`fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })`);
    await login();
    await navigate('/biodata');
    await waitFor('Boolean(document.querySelector("#section-saved button"))');
    await evaluate('document.querySelector("#section-saved button").click()');
    await waitFor(`document.querySelector('#section-saved')?.innerText.includes('5.6 feet') && document.querySelector('#section-saved img[alt="Family photo"]')?.src === ${JSON.stringify(url)}`);
    return url;
  } finally {
    socket?.close();
    chrome.kill();
    await new Promise<void>((done) => server.close(() => done()));
  }
}
