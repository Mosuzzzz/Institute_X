import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ObjectStorage, SignedStorageUrl, StoredObjectMetadata } from './object-storage';

@Injectable()
export class UnconfiguredObjectStorage extends ObjectStorage {
  isReady(): Promise<boolean> {
    return Promise.resolve(false);
  }

  createUploadUrl(): Promise<SignedStorageUrl> {
    throw new ServiceUnavailableException('Object storage is not configured');
  }

  createViewUrl(): Promise<SignedStorageUrl> {
    throw new ServiceUnavailableException('Object storage is not configured');
  }

  headObject(): Promise<StoredObjectMetadata> {
    throw new ServiceUnavailableException('Object storage is not configured');
  }

  copyObject(): Promise<void> {
    throw new ServiceUnavailableException('Object storage is not configured');
  }

  deleteObject(): Promise<void> {
    throw new ServiceUnavailableException('Object storage is not configured');
  }
}
