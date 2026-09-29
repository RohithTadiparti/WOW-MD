import { MigrationInterface, QueryRunner } from 'typeorm';

export class WowEmployeePlannerFoundation1710000089000 implements MigrationInterface {
  name = 'WowEmployeePlannerFoundation1710000089000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "planner_profiles_status_enum" AS ENUM ('incomplete','complete');`);
    await queryRunner.query(`CREATE TYPE "planner_profiles_type_enum" AS ENUM ('independent','wow_employee');`);
    await queryRunner.query(`ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'wow_planner_assigned';`);
    await queryRunner.query(`ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'wow_planner_booking_confirmed';`);
      await queryRunner.query(`ALTER TYPE "notifications_type_enum" ADD VALUE IF NOT EXISTS 'wow_planner_reassigned';`);
    await queryRunner.query(`ALTER TABLE "planner_profiles" ADD COLUMN "plannerType" "planner_profiles_type_enum" NOT NULL DEFAULT 'independent';`);
    await queryRunner.query(`
      CREATE TABLE "wow_employee_planner_profiles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE RESTRICT,
        "employeeId" varchar(80) NOT NULL UNIQUE,
        "joiningDate" date NOT NULL,
        "firstName" varchar(120) NOT NULL,
        "lastName" varchar(120) NOT NULL,
        "alternateMobile" varchar(20),
        "profilePhotoUrl" varchar(2000),
        "plannerType" "planner_profiles_type_enum" NOT NULL DEFAULT 'wow_employee',
        "profileStatus" "planner_profiles_status_enum" NOT NULL DEFAULT 'incomplete',
        "profileCompletion" integer NOT NULL DEFAULT 0,
        "displayName" varchar(120),
        "headline" varchar(240),
        "about" text,
        "languages" jsonb NOT NULL DEFAULT '[]',
        "primaryCity" varchar(120),
        "state" varchar(120),
        "serviceAreas" jsonb NOT NULL DEFAULT '[]',
        "yearsExperience" integer NOT NULL DEFAULT 0,
        "weddingsHandled" integer NOT NULL DEFAULT 0,
        "expertise" jsonb NOT NULL DEFAULT '[]',
        "specializations" jsonb NOT NULL DEFAULT '[]',
        "preferredWeddingTypes" jsonb NOT NULL DEFAULT '[]',
        "supportedEvents" jsonb NOT NULL DEFAULT '[]',
        "services" jsonb NOT NULL DEFAULT '[]',
        "workingDays" jsonb NOT NULL DEFAULT '[]',
        "workingHoursStart" varchar(5),
        "workingHoursEnd" varchar(5),
        "availableDates" jsonb NOT NULL DEFAULT '[]',
        "unavailableDates" jsonb NOT NULL DEFAULT '[]',
        "leaveDates" jsonb NOT NULL DEFAULT '[]',
        "portfolio" jsonb NOT NULL DEFAULT '[]',
        "achievements" jsonb NOT NULL DEFAULT '[]',
        "certifications" jsonb NOT NULL DEFAULT '[]',
        "experienceHighlights" jsonb NOT NULL DEFAULT '[]',
        "destinationWeddingsSupported" boolean NOT NULL DEFAULT false,
        "maxSimultaneousWeddings" integer NOT NULL DEFAULT 1,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "IDX_wow_employee_planner_type_status" ON "wow_employee_planner_profiles" ("plannerType", "profileStatus");`);
    await queryRunner.query(`
      CREATE TABLE "wow_planner_assignments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "plannerUserId" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "clientUserId" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "weddingPlanId" uuid NOT NULL REFERENCES "wedding_plans"("id") ON DELETE RESTRICT,
        "weddingDate" date NOT NULL,
        "eventIds" jsonb NOT NULL DEFAULT '[]',
        "eventDates" jsonb NOT NULL DEFAULT '[]',
        "services" jsonb NOT NULL DEFAULT '[]',
        "status" varchar NOT NULL DEFAULT 'confirmed',
        "createdAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX "IDX_wow_planner_assignments_planner" ON "wow_planner_assignments" ("plannerUserId");`);
    await queryRunner.query(`CREATE INDEX "IDX_wow_planner_assignments_client" ON "wow_planner_assignments" ("clientUserId");`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_wow_planner_assignment_plan" ON "wow_planner_assignments" ("weddingPlanId") WHERE "status" = 'confirmed';`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_wow_planner_assignment_plan";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wow_planner_assignments_client";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wow_planner_assignments_planner";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wow_planner_assignments";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_wow_employee_planner_type_status";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wow_employee_planner_profiles";`);
    await queryRunner.query(`ALTER TABLE "planner_profiles" DROP COLUMN IF EXISTS "plannerType";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "planner_profiles_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "planner_profiles_status_enum";`);
  }
}