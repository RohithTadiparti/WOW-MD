import { MigrationInterface, QueryRunner } from 'typeorm';

export class BiodataSourceDocument1710000079000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "profile_details" ADD COLUMN "biodataDocumentUrl" text');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "profile_details" DROP COLUMN "biodataDocumentUrl"');
  }
}
