import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsArray,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  Max,
  Min,
  IsUUID,
} from 'class-validator';
import { StrictBoolean } from '../../../common/decorators/strict-boolean.decorator';
import { IsUploadedUrl } from '../../../common/decorators/uploaded-url.decorator';
import { MOBILE_MESSAGE, MOBILE_PATTERN, normaliseMobile } from '../../../common/util/identity-fields';

export class CreateWowEmployeePlannerDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @Length(1, 120)
  firstName: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @Length(1, 120)
  lastName: string;

  @ApiProperty({ example: 'planner@wow.example' })
  @IsEmail()
  @MaxLength(254)
  officialEmail: string;

  @ApiProperty({ example: '9876543210' })
  @Transform(normaliseMobile)
  @Matches(MOBILE_PATTERN, { message: MOBILE_MESSAGE })
  mobileNumber: string;

  @ApiProperty({ maxLength: 80 })
  @IsString()
  @Length(1, 80)
  employeeId: string;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  joiningDate: string;

  @ApiProperty({ type: Boolean, default: true })
  @StrictBoolean()
  isActive: boolean | string;

  @ApiPropertyOptional({ example: '9876543211' })
  @IsOptional()
  @Transform(normaliseMobile)
  @Matches(MOBILE_PATTERN, { message: MOBILE_MESSAGE })
  alternateMobile?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @IsUploadedUrl()
  @MaxLength(2000)
  profilePhotoUrl?: string;
}

export class UpdateWowEmployeePlannerStatusDto {
  @ApiProperty({ type: Boolean })
  @StrictBoolean()
  isActive: boolean | string;
}

export class UpdateWowEmployeePlannerAdminDto {
  @ApiPropertyOptional({ example: 'planner@wow.example' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  officialEmail?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @Transform(normaliseMobile)
  @Matches(MOBILE_PATTERN, { message: MOBILE_MESSAGE })
  mobileNumber?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  firstName?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  lastName?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  joiningDate?: string;

  @ApiPropertyOptional({ example: '9876543211' })
  @IsOptional()
  @Transform(normaliseMobile)
  @Matches(MOBILE_PATTERN, { message: MOBILE_MESSAGE })
  alternateMobile?: string | null;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  profilePhotoUrl?: string | null;
}

export class UpdateWowPlannerProfileDto {
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional() @IsString() @IsUploadedUrl() @MaxLength(2000)
  profilePhotoUrl?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional() @IsString() @Length(1, 120)
  displayName?: string;

  @ApiPropertyOptional({ maxLength: 240 })
  @IsOptional() @IsString() @Length(1, 240)
  headline?: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional() @IsString() @MaxLength(4000)
  about?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(60, { each: true })
  languages?: string[];

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional() @IsString() @MaxLength(120)
  primaryCity?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional() @IsString() @MaxLength(120)
  state?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @MaxLength(120, { each: true })
  serviceAreas?: string[];

  @ApiPropertyOptional({ minimum: 0, maximum: 80 })
  @IsOptional() @IsInt() @Min(0) @Max(80)
  yearsExperience?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10000 })
  @IsOptional() @IsInt() @Min(0) @Max(10000)
  weddingsHandled?: number;

  @ApiPropertyOptional({ type: [String], maxItems: 30 })
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true })
  expertise?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 30 })
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true })
  specializations?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 30 })
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true })
  preferredWeddingTypes?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 40 })
  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsString({ each: true })
  supportedEvents?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 50 })
  @IsOptional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true })
  services?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 7 })
  @IsOptional() @IsArray() @ArrayMaxSize(7) @IsString({ each: true })
  workingDays?: string[];

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  workingHoursStart?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  workingHoursEnd?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 100 })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsDateString({}, { each: true })
  availableDates?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 100 })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsDateString({}, { each: true })
  unavailableDates?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 100 })
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsDateString({}, { each: true })
  leaveDates?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 30 })
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsUploadedUrl({ each: true })
  portfolio?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 30 })
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true })
  achievements?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 30 })
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 30 })
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true })
  experienceHighlights?: string[];

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  destinationWeddingsSupported?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 20 })
  @IsOptional() @IsInt() @Min(1) @Max(20)
  maxSimultaneousWeddings?: number;
}

export class HireWowPlannerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  weddingPlanId: string;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  weddingDate: string;

  @ApiProperty({ type: [String], maxItems: 30 })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @IsUUID('4', { each: true })
  eventIds: string[];

  @ApiProperty({ type: [String], maxItems: 50 })
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50) @IsString({ each: true }) @MaxLength(120, { each: true })
  services: string[];
}

export class ReassignWowPlannerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  weddingPlanId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  newPlannerUserId: string;

  @ApiProperty({ minLength: 5, maxLength: 1000 })
  @IsString()
  @Length(5, 1000)
  reason: string;
}

export class AssignWowPlannerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  weddingPlanId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  plannerUserId: string;

  @ApiProperty({ format: 'date' })
  @IsDateString({ strict: true })
  weddingDate: string;

  @ApiProperty({ minLength: 5, maxLength: 1000 })
  @IsString()
  @Length(5, 1000)
  reason: string;
}