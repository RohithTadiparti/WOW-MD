import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds the family-photo reference without changing the established cm contract. */
export class BiodataFeetAndFamilyPhoto1710000090000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "profile_details" ADD COLUMN IF NOT EXISTS "familyPhotoUrl" varchar(2000)');
  }

  async down(): Promise<void> {
    // The database may have had feet and family photos before this migration.
    // Reversing it cannot safely distinguish that data, and cm rounding loses precision.
    throw new Error('Restore a pre-migration backup to roll back height conversion safely.');
  }
}
