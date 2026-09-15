import { dateOf, guestsOf, venueOf, weddingContextOf } from './booking-venue';

describe('the wedding a planner was booked for', () => {
  const events = [
    { name: 'Mehendi', eventDate: null, venue: 'Hall A', city: null, expectedGuests: null },
    { name: 'Reception', eventDate: '2026-12-02', venue: null, city: 'Hyderabad', expectedGuests: 400 },
  ];
  const vendorBookings = [
    { eventDate: '2026-09-24', venue: 'Venue 6ae014f0', city: 'Hyderabad', isVenue: true },
  ];

  it('takes the date from the wedding plan first', () => {
    expect(weddingContextOf({ weddingDate: '2027-01-10', events, vendorBookings }).date).toBe('2027-01-10');
  });

  it('falls back to the earliest function, then the earliest vendor booking', () => {
    expect(weddingContextOf({ weddingDate: null, events, vendorBookings }).date).toBe('2026-12-02');
    expect(
      weddingContextOf({ weddingDate: null, events: [events[0]], vendorBookings }).date,
    ).toBe('2026-09-24');
  });

  it('prefers a venue business already booked over a venue typed on a function', () => {
    const ctx = weddingContextOf({ weddingDate: null, events, vendorBookings });
    expect([ctx.venue, ctx.city]).toEqual(['Venue 6ae014f0', 'Hyderabad']);
  });

  it('picks the venue booked for that day when several venues are booked', () => {
    const ctx = weddingContextOf({
      weddingDate: null,
      events: [],
      vendorBookings: [
        { eventDate: null, venue: 'Venue f61a19fb', city: 'Hyderabad', isVenue: true },
        { eventDate: '2026-09-24', venue: 'Venue 6ae014f0', city: 'Hyderabad', isVenue: true },
      ],
    });
    expect([ctx.date, ctx.venue]).toEqual(['2026-09-24', 'Venue 6ae014f0']);
  });

  it('uses the function venue when no venue has been booked', () => {
    const ctx = weddingContextOf({ weddingDate: null, events, vendorBookings: [] });
    expect([ctx.venue, ctx.city]).toEqual(['Hall A', 'Hyderabad']);
  });

  it('names the functions and the largest head count', () => {
    const ctx = weddingContextOf({ weddingDate: null, events, vendorBookings });
    expect([ctx.eventNames, ctx.guests]).toEqual(['Mehendi, Reception', 400]);
  });

  it('says nothing when the wedding has nothing to say', () => {
    expect(weddingContextOf({ weddingDate: null, events: [], vendorBookings: [] })).toEqual({
      date: null,
      venue: null,
      city: null,
      eventNames: null,
      guests: null,
    });
  });
});

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
