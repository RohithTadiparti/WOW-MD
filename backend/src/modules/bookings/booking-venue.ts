/**
 * Where, when and for how many a booking is, when no wedding function is
 * linked to say so.
 *
 * A request placed straight from a vendor's page carries these on the service's
 * own booking form — the date of the function, where it is held, the guest
 * count — and a venue business is itself the place. Reading only the linked
 * event left every such booking saying "Date not set" and "Venue not given"
 * over details the customer (or their planner) had typed in.
 */

export interface VenueSource {
  answers?: Record<string, unknown> | null;
  providerName?: string | null;
  providerCity?: string | null;
  /** The booked listing is a venue, so the booking is held there. */
  providerIsVenue?: boolean;
}

export function venueOf(src: VenueSource): { venue: string | null; city: string | null } {
  // A venue business is where its bookings are held, whatever else was typed.
  if (src.providerIsVenue && src.providerName) {
    return { venue: src.providerName, city: src.providerCity ?? null };
  }
  // Otherwise the place given on the booking form: a location answer is an
  // object carrying a city, and optionally a label for the venue itself.
  for (const value of Object.values(src.answers ?? {})) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const place = value as { label?: unknown; city?: unknown };
    const city = typeof place.city === 'string' ? place.city.trim() : '';
    if (!city) continue;
    const label = typeof place.label === 'string' ? place.label.trim() : '';
    return { venue: label && label !== city ? label : null, city };
  }
  return { venue: null, city: null };
}

/** The function's date from the booking form, when the booking has none of its own. */
export function dateOf(answers?: Record<string, unknown> | null): string | null {
  const value = answers?.event_date;
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

/** The guest count from the booking form, when no linked function carries one. */
export function guestsOf(answers?: Record<string, unknown> | null): number | null {
  const value = Number(answers?.guest_count);
  return Number.isFinite(value) && value > 0 ? value : null;
}
