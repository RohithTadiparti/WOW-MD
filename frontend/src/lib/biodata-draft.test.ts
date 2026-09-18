import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, loadDraft, saveDraft, submitDraft } from './biodata-draft';

/**
 * A biodata section's local draft is the only copy of what was typed until the
 * server accepts it. The personal section is refused until three photographs
 * are on the profile, and clearing the draft before sending meant that refusal
 * lost every answer the moment the section was closed.
 */
describe('biodata drafts', () => {
  const KEY = 'biodata:p1:personal';

  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the draft when the server refuses the save', async () => {
    saveDraft(KEY, { firstName: 'Bhavana' });

    const ok = await submitDraft(Promise.resolve(false), () => clearDraft(KEY));

    expect(ok).toBe(false);
    expect(loadDraft(KEY)).toEqual({ firstName: 'Bhavana' });
  });

  it('drops the draft once the server has accepted it', async () => {
    saveDraft(KEY, { firstName: 'Bhavana' });

    const ok = await submitDraft(Promise.resolve(true), () => clearDraft(KEY));

    expect(ok).toBe(true);
    expect(loadDraft(KEY)).toBeNull();
  });

  it('does not clear before the answer arrives', async () => {
    saveDraft(KEY, { firstName: 'Bhavana' });
    let accept: (ok: boolean) => void = () => {};
    const pending = submitDraft(
      new Promise<boolean>((resolve) => (accept = resolve)),
      () => clearDraft(KEY),
    );

    expect(loadDraft(KEY)).toEqual({ firstName: 'Bhavana' });
    accept(true);
    await pending;
    expect(loadDraft(KEY)).toBeNull();
  });
});
