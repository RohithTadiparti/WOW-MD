import { expect, type Page } from '@playwright/test';

/** The template's grounds, as the browser reports them. */
const LIGHT_GROUND = 'rgb(250, 246, 239)';
const DARK_GROUND = 'rgb(26, 11, 17)';

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? '';

export const DEMO_ROLES = [
  'admin',
  'bride',
  'groom',
  'family',
  'agent',
  'vendor',
  'planner',
  'in-person',
] as const;

export const demoEmail = (role: (typeof DEMO_ROLES)[number]) => `demo.${role}@wow.local`;

/**
 * Everything that says a screen is drawn in the template, measured rather
 * than eyeballed: the ground, the serif masthead, square corners on the
 * controls, nothing wider than the window, and no crash panel.
 *
 * Returns the problems found instead of throwing, so one walk over thirty
 * screens reports every one that is wrong rather than only the first.
 */
export async function templateIssues(page: Page, theme: 'light' | 'dark' = 'light'): Promise<string[]> {
  return page.evaluate(
    ({ theme, light, dark }) => {
      const issues: string[] = [];
      // Transitions would report the colour mid-fade.
      const still = document.createElement('style');
      still.textContent = '*{transition:none!important;animation:none!important}';
      document.head.appendChild(still);
      document.documentElement.classList.toggle('dark', theme === 'dark');

      const ground = getComputedStyle(document.body).backgroundColor;
      const expected = theme === 'dark' ? dark : light;
      if (ground !== expected) issues.push(`ground is ${ground}, expected ${expected}`);

      if (document.body.innerText.includes('This page could not be shown')) {
        issues.push('the page crashed into the error boundary');
      }

      // The page's own masthead, not the section label in the top bar: inside
      // the app shell it must be in <main>; public pages have no shell.
      const main = document.querySelector('main');
      const heading = main ? main.querySelector('h1') : document.querySelector('h1');
      if (!heading) issues.push('no page heading');
      else if (!getComputedStyle(heading).fontFamily.includes('Cormorant')) {
        issues.push(`heading "${heading.textContent?.trim()}" is not in the template serif`);
      }

      // Field captions: whichever way a form writes them, a caption for a
      // template field is set in the template's tracked capitals.
      const plain = [...document.querySelectorAll<HTMLLabelElement>('label')]
        // Visible captions only: a screen-reader-only label has no look to check.
        .filter((l) => l.offsetParent !== null && !l.classList.contains('sr-only'))
        .filter((l) => l.querySelector('.input') || document.getElementById(l.htmlFor)?.classList.contains('input'))
        .map((l) => (l.classList.contains('label') ? l : (l.querySelector(':scope > span:first-child') ?? l)))
        .filter((c) => getComputedStyle(c).textTransform !== 'uppercase')
        .map((c) => `"${c.textContent?.trim().slice(0, 30)}"`);
      if (plain.length) issues.push(`field captions not in template capitals: ${plain.slice(0, 5).join(', ')}`);

      const rounded =[...document.querySelectorAll<HTMLElement>('.btn, .btn-outline, .input, .card')].filter(
        (el) => parseFloat(getComputedStyle(el).borderTopLeftRadius) > 0,
      );
      if (rounded.length) issues.push(`${rounded.length} controls or panels have rounded corners`);

      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      if (overflow > 1) issues.push(`page is ${overflow}px wider than the window`);

      document.documentElement.classList.remove('dark');
      still.remove();
      return issues;
    },
    { theme, light: LIGHT_GROUND, dark: DARK_GROUND },
  );
}

/** Both themes: the template in daylight and by candlelight. */
export async function expectTemplate(page: Page, where: string): Promise<string[]> {
  const found = [
    ...(await templateIssues(page, 'light')).map((i) => `${where} [light]: ${i}`),
    ...(await templateIssues(page, 'dark')).map((i) => `${where} [dark]: ${i}`),
  ];
  return found;
}

/**
 * Signs in through the real form, the way a person would.
 *
 * The auth routes allow ten requests a minute per address and every page load
 * spends one on the silent refresh, so a 429 means wait out the window and try
 * again rather than fail.
 */
export async function signIn(page: Page, email: string, password: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto('/login');
    await page.locator('#email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    const response = page.waitForResponse((r) => r.url().includes('/api/auth/login'));
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    const status = (await response).status();
    if (status === 429) {
      await page.waitForTimeout(61_000);
      continue;
    }
    expect(status, `sign-in for ${email}`).toBeLessThan(300);
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
    return;
  }
  throw new Error(`sign-in for ${email} was rate limited three times running`);
}

/** Lets a screen finish its first round of requests before it is measured. */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page
    .waitForFunction(() => !document.querySelector('.skeleton, .animate-pulse'), null, { timeout: 8_000 })
    .catch(() => undefined);
  await page.waitForTimeout(400);
}
