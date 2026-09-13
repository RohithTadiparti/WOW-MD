import { Injectable } from '@nestjs/common';
import { createHash, createHmac, randomBytes } from 'crypto';
import { AppConfigService } from '../../config/app-config.service';

/** A host that names this machine to itself and to nothing else. */
const LOOPBACK = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])$/i;

export interface PresignedUpload {
  uploadUrl: string; // client PUTs the file here
  publicUrl: string; // final CDN/public URL to persist
  key: string;
}

/**
 * Storage abstraction. 'mock' returns fake URLs so uploads work end-to-end
 * locally without AWS; 's3' returns a real AWS Signature V4 presigned PUT URL,
 * computed with node crypto (no AWS SDK dependency). Chosen by
 * MEDIA_STORAGE_PROVIDER with no calling code changes.
 */
@Injectable()
export class MediaStorageProvider {
  constructor(private readonly cfg: AppConfigService) {}

  /**
   * The stored name.
   *
   * The filename comes from someone's phone or laptop, so it arrives with
   * spaces, brackets, apostrophes and occasionally an emoji in it. Those are
   * fine in a filename and awkward in a URL — a raw space produces a link that
   * some clients encode and others truncate, and the file appears to vanish.
   *
   * So the name is folded down here rather than refused at the door. What the
   * person sees is unchanged; what goes in the key is the same name with the
   * awkward runs turned into hyphens, and the extension preserved because that
   * is what decides the content type on the way back out.
   */
  private safeName(filename: string): string {
    const dot = filename.lastIndexOf('.');
    const stem = dot > 0 ? filename.slice(0, dot) : filename;
    const extension = dot > 0 ? filename.slice(dot + 1).toLowerCase() : '';

    const folded =
      stem
        .normalize('NFKD')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'file';
    return extension ? `${folded}.${extension.replace(/[^a-z0-9]/g, '')}` : folded;
  }

  presign(userId: string, filename: string, requestOrigin?: string): PresignedUpload {
    const key = `uploads/${userId}/${Date.now()}-${randomBytes(8).toString('hex')}-${this.safeName(filename)}`;
    if (this.cfg.media.storageProvider === 's3' && this.cfg.media.s3Bucket) {
      return this.presignS3(key);
    }
    // `?mock=put` is dropped: it distinguished nothing, and a client that has
    // to strip a query parameter before displaying the file is a client with a
    // rule the real provider does not have.
    const base = this.cfg.media.cdnBaseUrl || this.mockBase(requestOrigin);
    return { uploadUrl: `${base}/${key}`, publicUrl: `${base}/${key}`, key };
  }

  /**
   * Where the mock storage is reached, for the device that asked.
   *
   * The configured base comes from APP_BASE_URL, which on a local stack is
   * `http://localhost:8085`: this machine, to this machine and nothing else. A
   * phone on the same Wi-Fi was handed an upload URL on its own loopback, so
   * every photograph failed at the PUT, and a browser on a second laptop failed
   * the same way. When the configured base is loopback, the origin the request
   * actually reached is used instead. A real address in configuration always
   * wins, and so does a CDN.
   */
  private mockBase(requestOrigin?: string): string {
    const configured = this.cfg.media.mockBaseUrl;
    if (!requestOrigin) return configured;
    try {
      const url = new URL(configured);
      if (!LOOPBACK.test(url.hostname)) return configured;
      const origin = new URL(requestOrigin);
      return `${origin.protocol}//${origin.host}${url.pathname.replace(/\/+$/, '')}`;
    } catch {
      return configured;
    }
  }

  /** AWS SigV4 presigned PUT URL (query-string auth, UNSIGNED-PAYLOAD). */
  private presignS3(key: string): PresignedUpload {
    const { s3Bucket, s3Region, s3AccessKeyId, s3SecretAccessKey, presignExpirySeconds, cdnBaseUrl } =
      this.cfg.media;
    const region = s3Region || 'us-east-1';
    const host = `${s3Bucket}.s3.${region}.amazonaws.com`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
    const dateStamp = amzDate.slice(0, 8);
    const scope = `${dateStamp}/${region}/s3/aws4_request`;
    const encodedKey = key.split('/').map(encodeURIComponent).join('/');
    const canonicalUri = `/${encodedKey}`;

    const params: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${s3AccessKeyId}/${scope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(presignExpirySeconds),
      'X-Amz-SignedHeaders': 'host',
    };
    const canonicalQuery = Object.keys(params)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');

    const canonicalRequest = [
      'PUT',
      canonicalUri,
      canonicalQuery,
      `host:${host}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const kDate = createHmac('sha256', `AWS4${s3SecretAccessKey}`).update(dateStamp).digest();
    const kRegion = createHmac('sha256', kDate).update(region).digest();
    const kService = createHmac('sha256', kRegion).update('s3').digest();
    const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
    const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const uploadUrl = `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
    const publicUrl = cdnBaseUrl ? `${cdnBaseUrl}/${key}` : `https://${host}${canonicalUri}`;
    return { uploadUrl, publicUrl, key };
  }
}
