export interface SignedStorageUrl {
  url: string;
  expiresAt: Date;
}

export interface StoredObjectMetadata {
  sizeBytes: number;
  mimeType: string;
}

export abstract class ObjectStorage {
  abstract isReady(): Promise<boolean>;

  abstract createUploadUrl(
    storageKey: string,
    mimeType: string,
    sizeBytes: number,
  ): Promise<SignedStorageUrl>;

  abstract createViewUrl(storageKey: string): Promise<SignedStorageUrl>;

  abstract headObject(storageKey: string): Promise<StoredObjectMetadata>;

  abstract copyObject(sourceStorageKey: string, destinationStorageKey: string): Promise<void>;

  abstract deleteObject(storageKey: string): Promise<void>;
}
