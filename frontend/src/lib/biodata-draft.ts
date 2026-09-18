export type Draft = Record<string, unknown>;

/*
 * Unsaved bio-data must survive leaving the page and coming back (EZ1-I73).
 *
 * Every section form seeds itself from the server copy on mount, so navigating
 * to Security and back re-seeded from the server and wiped anything typed but
 * not yet saved. These back the working values with sessionStorage, keyed per
 * profile and section, so a return restores the draft rather than the last save.
 * All three swallow their own errors: a private window or a storage quota must
 * degrade to the old behaviour, never throw.
 */
export function loadDraft(storageKey?: string): Draft | null {
  if (!storageKey) return null;
  try {
    const raw = sessionStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(storageKey: string | undefined, value: Draft): void {
  if (!storageKey) return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    /* private window / quota — the form still works, it just will not restore. */
  }
}

export function clearDraft(storageKey?: string): void {
  if (!storageKey) return;
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    /* ignore */
  }
}

/**
 * Sends a section, and drops its local draft only once the server has taken it.
 *
 * Every form used to clear its draft *before* sending. When the server refused
 * the save -- the personal section is refused until three photographs are on
 * the profile, and it is the section the page opens on -- the draft was already
 * gone, so opening Photographs (which closes and unmounts the form) and coming
 * back showed an empty personal section: everything typed was lost. The draft
 * is the only copy of those answers until the server accepts them.
 */
export async function submitDraft(
  sent: Promise<boolean>,
  clear: () => void,
): Promise<boolean> {
  const ok = await sent;
  if (ok) clear();
  return ok;
}
