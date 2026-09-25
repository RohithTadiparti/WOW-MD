import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/** Reviewed intake values, stored in the existing profile_details row. */
const trimAndTruncate = (len: number) =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().slice(0, len) : value));

/** Intake values from uploaded biodata document, stored in the existing profile_details row. */
export class IntakeBiodataDto {
  @IsOptional() @IsString() @trimAndTruncate(80) @MaxLength(80) firstName?: string;
  @IsOptional() @IsString() @trimAndTruncate(80) @MaxLength(80) lastName?: string;
  @IsOptional() @IsString() @trimAndTruncate(80) @MaxLength(80) surname?: string;
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(50) @Max(250) heightCm?: number;
  @IsOptional() @IsString() @trimAndTruncate(40) @MaxLength(40) complexion?: string;
  @IsOptional() @IsString() @trimAndTruncate(120) @MaxLength(120) nativePlace?: string;
  @IsOptional() @IsString() @trimAndTruncate(80) @MaxLength(80) nativeState?: string;
  @IsOptional() @IsString() @trimAndTruncate(80) @MaxLength(80) nativeCountry?: string;
  @IsOptional() @IsString() @trimAndTruncate(120) @MaxLength(120) nativeDistrict?: string;
  @IsOptional() @IsString() @trimAndTruncate(120) @MaxLength(120) placeOfBirth?: string;
  @IsOptional() @IsString() communicationAddress?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() alternateMobile?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() dateOfBirth?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() city?: string;

  @IsOptional() @IsString() @trimAndTruncate(60) @MaxLength(60) religion?: string;
  @IsOptional() @IsString() @trimAndTruncate(60) @MaxLength(60) caste?: string;
  @IsOptional() @IsString() @trimAndTruncate(60) @MaxLength(60) subCaste?: string;
  @IsOptional() @IsString() @trimAndTruncate(60) @MaxLength(60) motherTongue?: string;
  @IsOptional() @IsString() @trimAndTruncate(60) @MaxLength(60) denomination?: string;

  @IsOptional() @IsString() gothram?: string;
  @IsOptional() @IsString() rashi?: string;
  @IsOptional() @IsString() star?: string;
  @IsOptional() @IsString() padam?: string;
  @IsOptional() @IsString() kujaDosham?: string;
  @IsOptional() @IsString() timeOfBirth?: string;
  @IsOptional() @IsBoolean() horoscopeAvailable?: boolean;

  @IsOptional() @IsString() maritalStatus?: string;

  @IsOptional() @IsString() fatherName?: string;
  @IsOptional() @IsString() fatherProfession?: string;
  @IsOptional() @IsString() motherName?: string;
  @IsOptional() @IsString() motherProfession?: string;
  @IsOptional() @IsString() familyType?: string;
  @IsOptional() @IsString() @trimAndTruncate(60) @MaxLength(60) familyStatus?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(99) brothers?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(99) sisters?: number;

  @IsOptional() @IsString() @trimAndTruncate(120) @MaxLength(120) highestQualification?: string;
  @IsOptional() @IsString() @trimAndTruncate(160) @MaxLength(160) course?: string;
  @IsOptional() @IsString() @trimAndTruncate(160) @MaxLength(160) institution?: string;
  @IsOptional() @IsString() @trimAndTruncate(120) @MaxLength(120) collegePlace?: string;
  @IsOptional() @IsString() occupationStatus?: string;
  @IsOptional() @IsString() profession?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() workLocation?: string;
  @IsOptional() @IsString() annualIncome?: string;
  @IsOptional() @IsString() salary?: string;

  @IsOptional() @IsObject() father?: Record<string, unknown>;
  @IsOptional() @IsObject() mother?: Record<string, unknown>;
  @IsOptional() @IsObject() horoscope?: Record<string, unknown>;
  @IsOptional() @IsObject() employment?: Record<string, unknown>;
  @IsOptional() @IsObject() business?: Record<string, unknown>;
  @IsOptional() @IsObject() residence?: Record<string, string>;
  @IsOptional() @IsString() bio?: string;
}
