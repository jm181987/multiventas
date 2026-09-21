import { Global, Injectable, Module } from '@nestjs/common';
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

  private safeFilename(filename: string) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  }

  private productKey(tenantId: string, productId: string, filename: string) {
    return `products/${tenantId}/${productId}/${randomUUID()}-${this.safeFilename(filename)}`;
  }

  private storeAssetKey(tenantId: string, storeId: string, kind: 'logo' | 'cover', filename: string) {
    return `stores/${tenantId}/${storeId}/${kind}-${randomUUID()}-${this.safeFilename(filename)}`;
  }

  private userAvatarKey(userId: string, filename: string) {
    return `users/${userId}/avatar-${randomUUID()}-${this.safeFilename(filename)}`;
  }

  private publicUrl(key: string) {
    // Las imágenes se sirven por el mismo dominio del frontend.
    // Así el navegador no depende de que MinIO tenga un dominio público separado.
    return `/media/${key}`;
  }

  normalizeMediaUrl(url: string) {
    if (!url || url.startsWith('/media/')) return url;
    const match = url.match(/\/(?:multiventas\/)?((?:products|stores|users)\/[^?#]+)(?:[?#].*)?$/i);
    return match ? `/media/${match[1]}` : url;
  }

  normalizeProductImageUrl(url: string) {
    return this.normalizeMediaUrl(url);
  }

  async createProductUploadUrl(tenantId: string, productId: string, filename: string, contentType: string) {
    const key = this.productKey(tenantId, productId, filename);
    const command = new PutObjectCommand({
      Bucket: this.config.getOrThrow('S3_BUCKET'),
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 600 });
    return { uploadUrl, key, publicUrl: this.publicUrl(key) };
  }

  private async upload(key: string, contentType: string, body: Buffer) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.config.getOrThrow('S3_BUCKET'),
      Key: key,
      ContentType: contentType,
      Body: body,
    }));
    return { key, publicUrl: this.publicUrl(key) };
  }

  uploadProductImage(tenantId: string, productId: string, filename: string, contentType: string, body: Buffer) {
    return this.upload(this.productKey(tenantId, productId, filename), contentType, body);
  }

  uploadStoreAsset(tenantId: string, storeId: string, kind: 'logo' | 'cover', filename: string, contentType: string, body: Buffer) {
    return this.upload(this.storeAssetKey(tenantId, storeId, kind, filename), contentType, body);
  }

  uploadUserAvatar(userId: string, filename: string, contentType: string, body: Buffer) {
    return this.upload(this.userAvatarKey(userId, filename), contentType, body);
  }
}

@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
