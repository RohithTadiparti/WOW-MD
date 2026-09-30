import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsUrl, MaxLength } from 'class-validator';

/**
 * Public social links on a vendor or planner listing.
 *
 * Instagram and YouTube must be a full https:// address on the platform's own
 * domain: a handle or bare text is refused rather than guessed into a URL. The
 * website is normalised first (see `normaliseWebsite`). A blank value clears
 * the link (stored as null).
 */
const blankToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

/**
 * A website as people actually type it, made into the https:// link it means.
 *
 * Planner and vendor listings carried a free-text website long before it was
 * validated, so `www.everafter.in` and `http://everafter.in` are already stored
 * and are resubmitted with every edit of the profile. Refusing them would lock
 * those listings out of saving anything; a bare domain gains https:// and an
 * http:// link is upgraded, and anything still not a URL is refused as before.
 */
export const normaliseWebsite = ({ value }: { value: unknown }) => {
  const trimmed = blankToNull({ value });
  if (typeof trimmed !== 'string') return trimmed;
  if (/^http:\/\//i.test(trimmed)) return `https://${trimmed.slice('http://'.length)}`;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return `https://${trimmed.replace(/^\/+/, '')}`;
  return trimmed;
};

const onHosts =(hosts: RegExp[] | undefined, label: string) =>
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
  @Transform(normaliseWebsite)
  @onHosts(undefined, 'website')
  @MaxLength(200)
  website?: string | null;
}

export const SOCIAL_LINK_FIELDS = [
  'instagramUrl',
  'youtubeUrl',
  'website',
] as const;
