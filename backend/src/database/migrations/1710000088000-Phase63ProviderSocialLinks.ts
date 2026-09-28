import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Public social links on vendor and planner listings.
 *
 * Planners already had `website` (Phase35); vendors get the same column so both
 * listings share one set of names. All nullable — an existing listing is not
 * invalid for having none.
 */
export class Phase63ProviderSocialLinks1710000088000 implements MigrationInterface {
  name = 'Phase63ProviderSocialLinks1710000088000';

  private readonly links = ['instagramUrl', 'youtubeUrl'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['vendors', 'planner_profiles']) {
      for (const name of this.links) {
        await queryRunner.query(
          `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${name}" varchar(200)`,
        );
      }
    }
    await queryRunner.query(
      `ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "website" varchar(200)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['vendors', 'planner_profiles']) {
      for (const name of this.links) {
        await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${name}"`);
      }
    }
    await queryRunner.query(`ALTER TABLE "vendors" DROP COLUMN IF EXISTS "website"`);
  }
}
