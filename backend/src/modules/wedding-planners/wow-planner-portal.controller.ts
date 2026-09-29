import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Permission } from '../../common/authz/permissions';
import { HireWowPlannerDto, UpdateWowPlannerProfileDto } from './dto/wow-employee-planner.dto';
import { WowEmployeePlannersService } from './wow-employee-planners.service';

@ApiTags('wow-planners')
@Controller()
export class WowPlannerPortalController {
  constructor(private readonly planners: WowEmployeePlannersService) {}

  @ApiBearerAuth()
  @RequirePermissions(Permission.PLAN_MANAGE_ENGAGED)
  @Get('planner/profile')
  ownProfile(@CurrentUser('userId') userId: string) {
    return this.planners.ownProfile(userId);
  }

  @ApiBearerAuth()
  @RequirePermissions(Permission.PLAN_MANAGE_ENGAGED)
  @ApiOperation({ summary: 'Update the current WOW employee planner profile; employee fields are immutable here' })
  @Patch('planner/profile')
  updateOwnProfile(
    @CurrentUser() actor: import('../../common/decorators/current-user.decorator').AuthUser,
    @Body() dto: UpdateWowPlannerProfileDto,
  ) {
    return this.planners.updateOwnProfile(actor, dto);
  }

  @Public()
  @ApiOperation({ summary: 'Browse active WOW employee planners with complete client-facing profiles' })
  @Get('wow-planners')
  discover(@Query('city') city?: string, @Query('event') event?: string) {
    return this.planners.discover(city, event);
  }

  @Public()
  @Get('wow-planners/:userId')
  publicProfile(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.planners.publicProfile(userId);
  }

  @Public()
  @Get('wow-planners/:userId/availability')
  availability(@Param('userId', ParseUUIDPipe) userId: string, @Query('date') date: string) {
    return this.planners.publicAvailability(userId, date);
  }

  @ApiBearerAuth()
  @RequirePermissions(Permission.BOOKING_CREATE)
  @ApiOperation({ summary: 'Hire an available WOW employee planner at ₹0 service fee' })
  @Post('wow-planners/:userId/book')
  hire(
    @CurrentUser() actor: import('../../common/decorators/current-user.decorator').AuthUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: HireWowPlannerDto,
  ) {
    return this.planners.hire(actor, userId, dto);
  }
}