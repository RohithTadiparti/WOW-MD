import { create } from 'zustand';

/**
 * Which managed profile is active for the current session.
 *
 * A Family Member (role: 'family') is the authenticated ACTOR, but all Biodata
 * reads and writes must target the selected managed profile — the Bride or Groom
 * they are filling in on behalf of — not the Family Member's own account.
 *
 * The ID here is the Profile entity's `id` (UUID), not the user's `id`. It is
 * read from GET /agents/profiles/actable and stored in memory so every screen
 * that needs it (Biodata, IndividualHome completion, photos) reads the same one.
 *
 * On logout the store is cleared via `clear()` so the next sign-in cannot
 * inherit a stale profile from a previous session.
 */
interface ManagedProfileState {
  /** The UUID of the currently selected managed profile, or null if none. */
  activeManagedProfileId: string | null;
  /** The display name of the selected profile, for UI headers. */
  activeManagedProfileName: string | null;
  /** The stewardRelation (e.g. "Daughter", "Son") for the selected profile. */
  activeManagedProfileRelation: string | null;
  /** Set the active managed profile. */
  setActiveManagedProfile: (
    id: string,
    displayName: string,
    relation?: string | null,
  ) => void;
  /** Clear on logout or when no profile is selected. */
  clear: () => void;
}

export const useManagedProfileStore = create<ManagedProfileState>()((set) => ({
  activeManagedProfileId: null,
  activeManagedProfileName: null,
  activeManagedProfileRelation: null,
  setActiveManagedProfile: (id, displayName, relation = null) =>
    set({
      activeManagedProfileId: id,
      activeManagedProfileName: displayName,
      activeManagedProfileRelation: relation,
    }),
  clear: () =>
    set({
      activeManagedProfileId: null,
      activeManagedProfileName: null,
      activeManagedProfileRelation: null,
    }),
}));
