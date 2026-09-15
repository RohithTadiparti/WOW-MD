import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

/**
 * Whether matchmaking is open for a profile, and why not when it is closed.
 *
 * The same rule as the web client's matchmaking gate. Matches asked for
 * suggestions regardless, so a profile that was incomplete or had already fixed
 * its match got a refusal from the server instead of the reason.
 */
export interface MatchStatus {
  profileId: string;
  profileCompleted: boolean;
  matchFixedState: string;
}

export function matchmakingGate(status?: MatchStatus): string | undefined {
  if (!status) return undefined;
  if (!status.profileCompleted) {
    return 'Fill in the profile first: basic details, preferences and a photo.';
  }
  if (status.matchFixedState === 'confirmed') {
    return 'This profile has a fixed match, so matchmaking is closed.';
  }
  return undefined;
}

/** `profileId` is the client an agency acts for; null asks about your own profile. */
export function useMatchmakingGate(profileId: string | null, enabled: boolean) {
  const query = useQuery({
    queryKey: ['match-status', profileId ?? 'self'],
    queryFn: async () =>
      (await api.get('/matches/status', { params: profileId ? { profileId } : {} }))
        .data as MatchStatus,
    enabled,
    retry: false,
  });
  return {
    status: query.data,
    gate: matchmakingGate(query.data),
    /** Answered either way, so a failed status check does not hold the list back. */
    settled: query.isFetched || query.isError,
  };
}
