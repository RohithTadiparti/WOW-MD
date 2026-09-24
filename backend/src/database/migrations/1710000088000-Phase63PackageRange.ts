import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase63PackageRange1710000088000 implements MigrationInterface {
  name = 'Phase63PackageRange1710000088000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "profile_details"
      ADD COLUMN "preferredPackageMin" double precision,
      ADD COLUMN "preferredPackageMax" double precision,
      ADD CONSTRAINT "CHK_profile_package_range" CHECK (
        ("preferredPackageMin" IS NULL OR ("preferredPackageMin" BETWEEN 0 AND 9007199254740991 AND "preferredPackageMin" = floor("preferredPackageMin"))) AND
        ("preferredPackageMax" IS NULL OR ("preferredPackageMax" BETWEEN 0 AND 9007199254740991 AND "preferredPackageMax" = floor("preferredPackageMax"))) AND
        ("preferredPackageMin" IS NULL OR "preferredPackageMax" IS NULL OR "preferredPackageMin" <= "preferredPackageMax")
      )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "profile_details"
      DROP CONSTRAINT "CHK_profile_package_range",
      DROP COLUMN "preferredPackageMax",
      DROP COLUMN "preferredPackageMin"`);
  }
}
