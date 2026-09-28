import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsUrl, MaxLength } from 'class-validator';

/**
 * Public social links on a vendor or planner listing.
 *
 * Each must be a full https:// address on the platform's own domain: a handle
 * or bare text is refused rather than guessed into a URL. A blank value clears
 * the link (stored as null).
 */
const blankToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

const onHosts = (hosts: RegExp[] | undefined, label: string) =>
  IsUrl(
    { protocols: ['https'], require_protocol: true, ...(hosts ? { host_whitelist: hosts } : {}) },
    { message: `Enter a full ${label} link starting with https://` },
  );

export class SocialLinksDto {
  @ApiPropertyOptional({ example: 'https://www.instagram.com/yourpage', nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @onHosts([/^(www\.|m\.)?instagram\.com$/], 'Instagram')
  @MaxLength(200)
  instagramUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://www.youtube.com/@yourchannel', nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @onHosts([/^(www\.|m\.)?youtube\.com$/, /^youtu\.be$/], 'YouTube')
  @MaxLength(200)
  youtubeUrl?: string | null;

  @ApiPropertyOptional({ example: 'https://www.yourbusiness.in', nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @onHosts(undefined, 'website')
  @MaxLength(200)
  website?: string | null;
}

export const SOCIAL_LINK_FIELDS = [
  'instagramUrl',
  'youtubeUrl',
  'website',
] as const;
