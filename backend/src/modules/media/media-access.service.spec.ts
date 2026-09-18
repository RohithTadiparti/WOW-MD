import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { BookingsService } from '../bookings/bookings.service';
import { Booking } from '../bookings/entities/booking.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { MediaAccessService } from './media-access.service';

const user = (userId: string, role = UserRole.BRIDE) =>
  ({ userId, role, email: null, managedByAgentId: null }) as AuthUser;

const BRIDE = user('bride');
const PARTNER = user('groom-partner', UserRole.GROOM);
const PHOTOGRAPHER = user('photographer', UserRole.VENDOR);
const STRANGER = user('stranger');
const OTHER_VENDOR = user('other-vendor', UserRole.VENDOR);
const ADMIN = user('admin', UserRole.ADMIN);

const BOOKING = 'b-1';
const delivery = `bookings/${BOOKING}/deliveries/1-ab-sangeet.jpg`;
const reference = `bookings/${BOOKING}/references/1-ab-look.jpg`;

/**
 * The booking's own participant rule, as BookingsService applies it: the
 * customer, their match-fixed partner, the provider, and admins.
 */
function bookingsFake() {
  const booking = { id: BOOKING, userId: BRIDE.userId } as Booking;
  const participants = new Set([BRIDE.userId, PARTNER.userId, PHOTOGRAPHER.userId]);
  const forParticipant = jest.fn(async (actor: AuthUser, id: string) => {
    if (id !== BOOKING) throw new ForbiddenException('Booking not found');
    if (actor.role !== UserRole.ADMIN && !participants.has(actor.userId)) {
      throw new ForbiddenException('This booking does not belong to you');
    }
    return booking;
  });
  const assertSeller = jest.fn(async (actor: AuthUser) => {
    if (actor.role !== UserRole.ADMIN && actor.userId !== PHOTOGRAPHER.userId) {
      throw new ForbiddenException('This booking was not made against your listing');
    }
  });
  return { forParticipant, assertSeller } as unknown as BookingsService & {
    forParticipant: jest.Mock;
  };
}

function service() {
  const bookings = bookingsFake();
  const vendors = {
    findOne: jest.fn(async ({ where }: { where: { ownerUserId: string } }) =>
      where.ownerUserId === PHOTOGRAPHER.userId ? { id: 'vendor-1' } : null,
    ),
  } as unknown as Repository<Vendor>;
  return { access: new MediaAccessService(bookings, vendors), bookings };
}

describe('MediaAccessService', () => {
  describe('who may open a booking delivery', () => {
    it.each([
      ['the customer', BRIDE, true],
      ['their match-fixed partner', PARTNER, true],
      ['the photographer who delivered it', PHOTOGRAPHER, true],
      ['an admin', ADMIN, true],
      ['another customer', STRANGER, false],
      ['another vendor', OTHER_VENDOR, false],
      ['somebody not signed in', undefined, false],
    ])('%s: %s', async (_who, viewer, allowed) => {
      const { access } = service();
      await expect(access.canView(viewer, delivery)).resolves.toBe(allowed);
      // And the same answer when it turns up inside any other response.
      await expect(access.canReceive(viewer, delivery)).resolves.toBe(allowed);
    });
  });

  describe('who may upload to a booking', () => {
    it('lets only the provider fill its deliveries', async () => {
      const { access } = service();
      await expect(access.canUpload(PHOTOGRAPHER, delivery)).resolves.toBe(true);
      await expect(access.canUpload(BRIDE, delivery)).resolves.toBe(false);
      await expect(access.canUpload(OTHER_VENDOR, delivery)).resolves.toBe(false);
    });

    it('lets either side add a reference, and nobody else', async () => {
      const { access } = service();
      await expect(access.canUpload(BRIDE, reference)).resolves.toBe(true);
      await expect(access.canUpload(PARTNER, reference)).resolves.toBe(true);
      await expect(access.canUpload(STRANGER, reference)).resolves.toBe(false);
    });
  });

  describe("a person's own files", () => {
    it('shows profile photographs to anyone signed in, and nothing else of theirs', async () => {
      const { access } = service();
      await expect(access.canView(STRANGER, 'users/bride/profile/1-a-me.jpg')).resolves.toBe(true);
      await expect(access.canView(undefined, 'users/bride/profile/1-a-me.jpg')).resolves.toBe(false);
      await expect(access.canView(STRANGER, 'users/bride/attachments/1-a-receipt.pdf')).resolves.toBe(false);
      await expect(access.canView(STRANGER, 'users/bride/albums/1-a-haldi.jpg')).resolves.toBe(false);
      await expect(access.canView(BRIDE, 'users/bride/attachments/1-a-receipt.pdf')).resolves.toBe(true);
    });

    it('lets the endpoint decide for anything that is not a booking file', async () => {
      // The vendor reading the couple's reference attachment on a booking: the
      // booking endpoint already said yes, and that is not second-guessed.
      const { access } = service();
      await expect(access.canReceive(PHOTOGRAPHER, 'users/bride/attachments/1-a-look.jpg')).resolves.toBe(true);
    });

    it('lets people write only into their own space', async () => {
      const { access } = service();
      await expect(access.canUpload(BRIDE, 'users/bride/profile/1-a-me.jpg')).resolves.toBe(true);
      await expect(access.canUpload(STRANGER, 'users/bride/profile/1-a-me.jpg')).resolves.toBe(false);
      await expect(access.canUpload(ADMIN, 'users/bride/profile/1-a-me.jpg')).resolves.toBe(false);
      await expect(access.canUpload(PHOTOGRAPHER, 'vendors/vendor-1/portfolio/1-a-x.jpg')).resolves.toBe(true);
      await expect(access.canUpload(OTHER_VENDOR, 'vendors/vendor-1/portfolio/1-a-x.jpg')).resolves.toBe(false);
    });
  });

  it('refuses a key the platform never minted', async () => {
    const { access } = service();
    await expect(access.canView(BRIDE, 'uploads/bride/old.jpg')).resolves.toBe(false);
    await expect(access.canUpload(BRIDE, 'users/bride/../x/a.jpg')).resolves.toBe(false);
  });

  it('looks a booking up once for a whole response', async () => {
    const { access, bookings } = service();
    const memo = new Map();
    await Promise.all(
      [1, 2, 3].map((n) => access.canReceive(BRIDE, `bookings/${BOOKING}/deliveries/${n}-a-x.jpg`, memo)),
    );
    expect(bookings.forParticipant).toHaveBeenCalledTimes(1);
  });
});
