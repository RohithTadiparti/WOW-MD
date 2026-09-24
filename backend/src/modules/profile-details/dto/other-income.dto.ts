import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { plainToInstance, Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, Matches, validateSync, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

export const OTHER_INCOME_SOURCES = ['rental', 'business', 'agricultural', 'investment', 'other'] as const;

export class OtherIncomeEntryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsUUID('4')
  id?: string;

  @ApiProperty({ enum: OTHER_INCOME_SOURCES })
  @IsIn(OTHER_INCOME_SOURCES)
  source: typeof OTHER_INCOME_SOURCES[number];

  @ApiProperty({ description: 'Annual income in whole rupees, including zero', example: '120000' })
  @Transform(({ value }) => typeof value === 'number' ? String(value) : value)
  @IsString() @Matches(/^\d{1,15}$/)
  amount: string;
}

/** Validate the new nested field without restricting legacy employment keys. */
@ValidatorConstraint({ name: 'otherIncome', async: false })
export class OtherIncomeConstraint implements ValidatorConstraintInterface {
  validate(employment: unknown): boolean {
    if (!employment || typeof employment !== 'object' || Array.isArray(employment)) return false;
    const entries = (employment as Record<string, unknown>).otherIncome;
    if (entries === undefined) return true;
    if (!Array.isArray(entries)) return false;
    const ids = entries.map((entry) => entry?.id).filter((id) => id != null);
    return new Set(ids).size === ids.length && entries.every((entry) =>
      entry !== null && typeof entry === 'object' && !Array.isArray(entry) &&
      validateSync(plainToInstance(OtherIncomeEntryDto, entry), {
        whitelist: true, forbidNonWhitelisted: true,
      }).length === 0);
  }

  defaultMessage(): string {
    return 'Other income must be an array of entries with a valid source, a non-negative whole-rupee amount (up to 15 digits), and optional unique UUIDs';
  }
}
