import { MigrationInterface, QueryRunner } from 'typeorm';

/** Service concurrency is no longer part of catalog or availability setup. */
export class RemoveServiceConcurrency1710000088000 implements MigrationInterface {
  name = 'RemoveServiceConcurrency1710000088000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "vendor_services" DROP COLUMN IF EXISTS "concurrentCapacity"');
    await queryRunner.query('ALTER TABLE "service_definitions" DROP COLUMN IF EXISTS "defaultCapacity"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "service_definitions" ADD COLUMN IF NOT EXISTS "defaultCapacity" integer NOT NULL DEFAULT 1');
    await queryRunner.query('ALTER TABLE "vendor_services" ADD COLUMN IF NOT EXISTS "concurrentCapacity" integer NOT NULL DEFAULT 1');
  }
}