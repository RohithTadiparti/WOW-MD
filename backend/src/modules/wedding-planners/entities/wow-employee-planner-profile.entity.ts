import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlannerProfileStatus, PlannerType } from '../../../common/enums';

@Entity('wow_employee_planner_profiles')
export class WowEmployeePlannerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column('uuid')
  userId: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80 })
  employeeId: string;

  @Column({ type: 'date' })
  joiningDate: string;

  @Column({ type: 'varchar', length: 120 })
  firstName: string;

  @Column({ type: 'varchar', length: 120 })
  lastName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  alternateMobile: string | null;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  profilePhotoUrl: string | null;

  @Column({
    type: 'enum',
    enum: PlannerType,
    enumName: 'planner_profiles_type_enum',
    default: PlannerType.WOW_EMPLOYEE,
  })
  plannerType: PlannerType;

  @Column({
    type: 'enum',
    enum: PlannerProfileStatus,
    enumName: 'planner_profiles_status_enum',
    default: PlannerProfileStatus.INCOMPLETE,
  })
  profileStatus: PlannerProfileStatus;

  @Column({ type: 'int', default: 0 })
  profileCompletion: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  displayName: string | null;

  @Column({ type: 'varchar', length: 240, nullable: true })
  headline: string | null;

  @Column({ type: 'text', nullable: true })
  about: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  languages: string[];

  @Column({ type: 'varchar', length: 120, nullable: true })
  primaryCity: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  state: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  serviceAreas: string[];

  @Column({ type: 'int', default: 0 })
  yearsExperience: number;

  @Column({ type: 'int', default: 0 })
  weddingsHandled: number;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  expertise: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  specializations: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  preferredWeddingTypes: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  supportedEvents: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  services: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  workingDays: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  availableDates: string[];

  @Column({ type: 'varchar', length: 5, nullable: true })
  workingHoursStart: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  workingHoursEnd: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  unavailableDates: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  leaveDates: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  portfolio: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  achievements: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  certifications: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  experienceHighlights: string[];

  @Column({ default: false })
  destinationWeddingsSupported: boolean;

  @Column({ type: 'int', default: 1 })
  maxSimultaneousWeddings: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}