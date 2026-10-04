import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(new URL('../../.github/workflows/codeql.yml', import.meta.url), 'utf8');

test('private repository CodeQL keeps SARIF without requiring code scanning', () => {
  assert.match(workflow, /upload:\s*never/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /retention-days:\s*30/);
  assert.match(workflow, /path:\s*results\/\*\.sarif/);
});
