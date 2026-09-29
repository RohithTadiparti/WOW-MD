import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('wow_planner_assignments')
export class WowPlannerAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  plannerUserId: string;

  @Index()
  @Column('uuid')
  clientUserId: string;

  @Index()
  @Column('uuid')
  weddingPlanId: string;

  @Column({ type: 'date' })
  weddingDate: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  eventIds: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  eventDates: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  services: string[];

  @Column({ type: 'varchar', default: 'confirmed' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}