import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadGatewayException } from '@nestjs/common';
import { ObjectStorage, SignedStorageUrl, StoredObjectMetadata } from './object-storage';

export interface S3ObjectStorageConfig {
  bucket: string;
  signedUrlTtlSeconds: number;
}

export class S3ObjectStorage extends ObjectStorage {
  constructor(
    private readonly client: S3Client,
    private readonly config: S3ObjectStorageConfig,
  ) {
    super();
  }

  async createUploadUrl(
    storageKey: string,
    mimeType: string,
    sizeBytes: number,
  ): Promise<SignedStorageUrl> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: storageKey,
      ContentType: mimeType,
      ContentLength: sizeBytes,
    });
    return this.sign(command);
  }

  async createViewUrl(storageKey: string): Promise<SignedStorageUrl> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: storageKey,
      ResponseContentDisposition: 'inline',
    });
    return this.sign(command);
  }

  async headObject(storageKey: string): Promise<StoredObjectMetadata> {
    const result = await this.client.send(
      new HeadObjectCommand({ Bucket: this.config.bucket, Key: storageKey }),
    );
    if (result.ContentLength === undefined || !result.ContentType) {
      throw new BadGatewayException('Object storage returned incomplete metadata');
    }
    return {
      sizeBytes: result.ContentLength,
      mimeType: result.ContentType.split(';', 1)[0].trim().toLowerCase(),
    };
  }

  private async sign(command: PutObjectCommand | GetObjectCommand): Promise<SignedStorageUrl> {
    const url = await getSignedUrl(this.client, command, {
      expiresIn: this.config.signedUrlTtlSeconds,
    });
    return {
      url,
      expiresAt: new Date(Date.now() + this.config.signedUrlTtlSeconds * 1000),
    };
  }
}
