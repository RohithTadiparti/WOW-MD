import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * The card is owned by the wedding host, rather than by a single function.
 * It can therefore be replaced without changing a guest or an RSVP.
 */
@Entity('wedding_invitations')
@Index(['userId'], { unique: true })
export class WeddingInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  cardUrl: string | null;

  /**
   * The wedding's Direct Link, as issued. Stored rather than hashed so the
   * couple can copy the same link again (migration 1710000112000 says why).
   * Never returned except to the couple, and never with a guest's data.
   */
  @Index('IDX_wedding_invitations_share_token', { unique: true, where: '"shareToken" IS NOT NULL' })
  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  shareToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  shareTokenCreatedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
