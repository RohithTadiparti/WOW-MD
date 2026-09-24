import { MigrationInterface, QueryRunner } from 'typeorm';

/** Reconciles original cm installs and installs already migrated to decimal feet. */
export class BiodataFeetAndFamilyPhoto1710000090000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "profile_details" ADD COLUMN IF NOT EXISTS "familyPhotoUrl" varchar(2000)');
    for (const [oldName, name] of [
      ['heightCm', 'heightFeet'],
      ['preferredHeightMinCm', 'preferredHeightMinFeet'],
      ['preferredHeightMaxCm', 'preferredHeightMaxFeet'],
    ]) {
      const columns: { column_name: string }[] = await queryRunner.query(
        'SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1',
        ['profile_details'],
      );
      const oldExists = columns.some((column) => column.column_name === oldName);
      const exists = columns.some((column) => column.column_name === name);
      if (oldExists && exists) throw new Error(`Both ${oldName} and ${name} exist; resolve the ambiguous height data before migrating.`);
      if (!exists) {
        if (!oldExists) throw new Error(`Missing height column ${oldName}`);
        await queryRunner.query(`ALTER TABLE "profile_details" RENAME COLUMN "${oldName}" TO "${name}"`);
        await queryRunner.query(`ALTER TABLE "profile_details" ALTER COLUMN "${name}" TYPE numeric(3,1) USING round("${name}"::numeric / 30.48, 1)`);
      }
      // Existing feet values are deliberately never converted or rewritten.
      const constraint = `CK_${name}_feet`;
      const rows = await queryRunner.query('SELECT 1 FROM pg_constraint WHERE conrelid = \'profile_details\'::regclass AND conname = $1', [constraint]);
      if (!rows.length) await queryRunner.query(`ALTER TABLE "profile_details" ADD CONSTRAINT "${constraint}" CHECK ("${name}" BETWEEN 3 AND 8)`);
    }
  }

  async down(): Promise<void> {
    // The database may have had feet and family photos before this migration.
    // Reversing it cannot safely distinguish that data, and cm rounding loses precision.
    throw new Error('Restore a pre-migration backup to roll back height conversion safely.');
  }
}
