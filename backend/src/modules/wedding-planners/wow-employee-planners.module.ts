import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { WeddingPlan } from '../planner/entities/wedding-plan.entity';
import { WeddingEvent } from '../events/entities/event.entity';
import { Profile } from '../users/entities/profile.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../../platform/audit/audit.module';
import { WowEmployeePlannerProfile } from './entities/wow-employee-planner-profile.entity';
import { WowPlannerAssignment } from './entities/wow-planner-assignment.entity';
import { AdminWowEmployeePlannersController } from './wow-employee-planners.controller';
import { WowPlannerPortalController } from './wow-planner-portal.controller';
import { WowEmployeePlannersService } from './wow-employee-planners.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      WowEmployeePlannerProfile,
      WowPlannerAssignment,
      WeddingPlan,
      WeddingEvent,
      Profile,
    ]),
    AuthModule,
    AuditModule,
    NotificationsModule,
  ],
  controllers: [AdminWowEmployeePlannersController, WowPlannerPortalController],
  providers: [WowEmployeePlannersService],
  exports: [WowEmployeePlannersService, TypeOrmModule],
})
export class WowEmployeePlannersModule {}