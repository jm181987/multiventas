import { Global, Module } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  constructor(private readonly config: ConfigService) {
    this.client = new S3Client({
      region: config.get('S3_REGION') ?? 'us-east-1',
      endpoint: config.get('S3_ENDPOINT'),
      forcePathStyle: (config.get('S3_FORCE_PATH_STYLE') ?? 'true') === 'true',
      credentials: {
        accessKeyId: config.getOrThrow('S3_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow('S3_SECRET_KEY'),
      },
    });
  }

  async createProductUploadUrl(tenantId: string, productId: string, filename: string, contentType: string) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
    const key = `products/${tenantId}/${productId}/${randomUUID()}-${safe}`;
    const command = new PutObjectCommand({
      Bucket: this.config.getOrThrow('S3_BUCKET'),
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 600 });
    const publicBase = this.config.getOrThrow<string>('S3_PUBLIC_URL').replace(/\/$/, '');
    return { uploadUrl, key, publicUrl: `${publicBase}/${key}` };
  }
}

@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
