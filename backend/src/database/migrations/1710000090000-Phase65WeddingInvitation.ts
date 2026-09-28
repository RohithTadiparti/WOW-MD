import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One invitation per guest for the whole wedding, and host notes on a guest.
 *
 * The RSVP link used to be per event, so a guest invited to four functions got
 * four links and four questions. The wedding invitation lives on the guest row:
 * one token, one answer, covering every event the host has. All nullable —
 * existing guests are simply "not invited yet" at wedding level, and their
 * per-event invites and links are untouched.
 */
export class Phase65WeddingInvitation1710000090000 implements MigrationInterface {
  name = 'Phase65WeddingInvitation1710000090000';

  private readonly columns: [string, string][] = [
    ['notes', 'text'],
    ['rsvpStatus', 'varchar(20)'],
    ['rsvpTokenHash', 'varchar'],
    ['rsvpTokenExpiresAt', 'timestamptz'],
    ['respondedAt', 'timestamptz'],
    ['attendingCount', 'int'],
    ['declineReason', 'text'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [name, type] of this.columns) {
      await queryRunner.query(`ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "${name}" ${type}`);
    }
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_guests_rsvp_token_hash" ON "guests" ("rsvpTokenHash") ` +
        `WHERE "rsvpTokenHash" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_guests_rsvp_token_hash"`);
    for (const [name] of this.columns) {
      await queryRunner.query(`ALTER TABLE "guests" DROP COLUMN IF EXISTS "${name}"`);
    }
  }
}
