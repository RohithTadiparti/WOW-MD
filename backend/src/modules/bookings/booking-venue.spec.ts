import { dateOf, guestsOf, venueOf } from './booking-venue';

describe('where a booking is held', () => {
  it('is the venue business itself when a venue was booked', () => {
    expect(
      venueOf({
        answers: { venue_address: { label: 'f', city: 'hyf' } },
        providerName: 'Venue 6ae014f0',
        providerCity: 'Hyderabad',
        providerIsVenue: true,
      }),
    ).toEqual({ venue: 'Venue 6ae014f0', city: 'Hyderabad' });
  });

  it('is the place given on the booking form for any other vendor', () => {
    expect(
      venueOf({
        answers: { functions: ['engagement'], venue_address: { label: 'Taj Krishna', city: 'Hyderabad' } },
        providerName: 'Sharma Studios',
        providerIsVenue: false,
      }),
    ).toEqual({ venue: 'Taj Krishna', city: 'Hyderabad' });
  });

  it('keeps a city on its own when no venue is fixed yet', () => {
    expect(venueOf({ answers: { venue_address: { label: 'Pune', city: 'Pune' } } })).toEqual({
      venue: null,
      city: 'Pune',
    });
  });

  it('says nothing rather than guessing when nothing was given', () => {
    expect(venueOf({ answers: { venue_address: { city: '  ' } } })).toEqual({ venue: null, city: null });
    expect(venueOf({})).toEqual({ venue: null, city: null });
  });

  it('reads the date and guest count off the form, and ignores what is not one', () => {
    expect(dateOf({ event_date: '2026-09-24' })).toBe('2026-09-24');
    expect(dateOf({ event_date: 'soon' })).toBeNull();
    expect(guestsOf({ guest_count: 450 })).toBe(450);
    expect(guestsOf({ guest_count: 'lots' })).toBeNull();
    expect(guestsOf(null)).toBeNull();
  });
});
