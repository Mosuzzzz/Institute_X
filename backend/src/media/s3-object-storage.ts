import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
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
    private readonly signingClient: S3Client = client,
  ) {
    super();
  }

  async isReady(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
      return true;
    } catch {
      return false;
    }
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

  async deleteObject(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: storageKey }),
    );
  }

  async copyObject(sourceStorageKey: string, destinationStorageKey: string): Promise<void> {
    const encodedSource = sourceStorageKey
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.config.bucket,
        CopySource: `${this.config.bucket}/${encodedSource}`,
        Key: destinationStorageKey,
      }),
    );
  }

  private async sign(command: PutObjectCommand | GetObjectCommand): Promise<SignedStorageUrl> {
    const url = await getSignedUrl(this.signingClient, command, {
      expiresIn: this.config.signedUrlTtlSeconds,
    });
    return {
      url,
      expiresAt: new Date(Date.now() + this.config.signedUrlTtlSeconds * 1000),
    };
  }
}
