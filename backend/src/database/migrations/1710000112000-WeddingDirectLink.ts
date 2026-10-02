import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One shareable registration link for the whole wedding.
 *
 * The open links that existed were per event, so a couple with five functions
 * had five links to send and five forms for a guest to fill. The wedding now
 * has one: the invitation card and a short form, and the reply joins the
 * guest list against every event.
 *
 * The token is stored as issued rather than hashed, unlike the per-event and
 * per-guest tokens: the couple must be able to copy the same link again next
 * week without breaking the one already forwarded, and it grants nothing but
 * the ability to add oneself to the guest list. Revoking clears it.
 */
export class WeddingDirectLink1710000112000 implements MigrationInterface {
  name = 'WeddingDirectLink1710000112000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wedding_invitations"
        ADD COLUMN IF NOT EXISTS "shareToken" varchar(64),
        ADD COLUMN IF NOT EXISTS "shareTokenCreatedAt" TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_wedding_invitations_share_token" ON "wedding_invitations" ("shareToken") WHERE "shareToken" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wedding_invitations_share_token"`);
    await queryRunner.query(`
      ALTER TABLE "wedding_invitations"
        DROP COLUMN IF EXISTS "shareTokenCreatedAt",
        DROP COLUMN IF EXISTS "shareToken"
    `);
  }
}
