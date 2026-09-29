import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permission } from '../../common/authz/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import {
  CreateWowEmployeePlannerDto,
  AssignWowPlannerDto,
  ReassignWowPlannerDto,
  UpdateWowEmployeePlannerAdminDto,
  UpdateWowEmployeePlannerStatusDto,
} from './dto/wow-employee-planner.dto';
import { WowEmployeePlannersService } from './wow-employee-planners.service';

@ApiTags('admin-wow-planners')
@ApiBearerAuth()
@Controller('admin/wow-planners')
export class AdminWowEmployeePlannersController {
  constructor(private readonly planners: WowEmployeePlannersService) {}

  @RequirePermissions(Permission.ADMIN_USERS_READ)
  @ApiOperation({ summary: 'Create an active or inactive WOW employee planner account' })
  @Post()
  create(@CurrentUser() actor: AuthUser, @Body() dto: CreateWowEmployeePlannerDto) {
    return this.planners.create(actor, dto);
  }

  @RequirePermissions(Permission.ADMIN_USERS_READ)
  @ApiOperation({ summary: 'List WOW employee planners, separate from independent planners' })
  @Get()
  list() {
    return this.planners.list();
  }

  @RequirePermissions(Permission.ADMIN_USERS_READ)
  @Get('assignments')
  assignments() {
    return this.planners.listAssignments();
  }

  @RequirePermissions(Permission.ADMIN_USERS_READ)
  @Get('available-weddings')
  availableWeddings() {
    return this.planners.listAvailableWeddings();
  }

  @RequirePermissions(Permission.ADMIN_USERS_READ)
  @ApiOperation({ summary: 'Assign an unassigned client wedding to a WOW employee planner' })
  @Post('assignments')
  assign(@CurrentUser() actor: AuthUser, @Body() dto: AssignWowPlannerDto) {
    return this.planners.assignByAdmin(actor, dto);
  }

  @RequirePermissions(Permission.ADMIN_USERS_READ)
  @Get(':userId')
  get(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.planners.getByUserId(userId);
  }

  @RequirePermissions(Permission.ADMIN_USERS_READ)
  @Patch(':userId')
  update(
    @CurrentUser() actor: AuthUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateWowEmployeePlannerAdminDto,
  ) {
    return this.planners.updateAdmin(actor, userId, dto);
  }

  @RequirePermissions(Permission.ADMIN_USERS_READ)
  @ApiOperation({ summary: 'Activate or deactivate a WOW employee planner without deleting history' })
  @Patch(':userId/status')
  setStatus(
    @CurrentUser() actor: AuthUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateWowEmployeePlannerStatusDto,
  ) {
    return this.planners.setStatus(actor, userId, dto.isActive);
  }

  @RequirePermissions(Permission.ADMIN_USERS_READ)
  @ApiOperation({ summary: 'Reassign an existing WOW employee planner wedding with an audit reason' })
  @Post('reassignments')
  reassign(@CurrentUser() actor: AuthUser, @Body() dto: ReassignWowPlannerDto) {
    return this.planners.reassign(actor, dto);
  }
}