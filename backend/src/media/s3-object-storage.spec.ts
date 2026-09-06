import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { S3ObjectStorage } from './s3-object-storage';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://storage.example/signed'),
}));

describe('S3ObjectStorage', () => {
  const client = { send: jest.fn() };
  const signingClient = { send: jest.fn() };
  let storage: S3ObjectStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new S3ObjectStorage(
      client as never,
      {
        bucket: 'institute-x-private',
        signedUrlTtlSeconds: 300,
      },
      signingClient as never,
    );
  });

  it('creates a short-lived signed upload command with enforced metadata', async () => {
    const result = await storage.createUploadUrl('courses/key', 'video/mp4', 1_000);

    const { getSignedUrl } = jest.requireMock('@aws-sdk/s3-request-presigner') as {
      getSignedUrl: jest.Mock;
    };
    expect(getSignedUrl).toHaveBeenCalledWith(signingClient, expect.any(PutObjectCommand), {
      expiresIn: 300,
    });
    const command = getSignedUrl.mock.calls[0][1] as PutObjectCommand;
    expect(command.input).toEqual(
      expect.objectContaining({
        Bucket: 'institute-x-private',
        Key: 'courses/key',
        ContentType: 'video/mp4',
        ContentLength: 1_000,
      }),
    );
    expect(result.url).toBe('https://storage.example/signed');
  });

  it('reports whether the private bucket is reachable', async () => {
    client.send.mockResolvedValue({});
    await expect(storage.isReady()).resolves.toBe(true);
    expect(client.send).toHaveBeenCalledWith(expect.any(HeadBucketCommand));

    client.send.mockRejectedValueOnce(new Error('offline'));
    await expect(storage.isReady()).resolves.toBe(false);
  });

  it('creates an inline private view URL', async () => {
    await storage.createViewUrl('courses/key');

    const { getSignedUrl } = jest.requireMock('@aws-sdk/s3-request-presigner') as {
      getSignedUrl: jest.Mock;
    };
    const command = getSignedUrl.mock.calls[0][1] as GetObjectCommand;
    expect(command.input).toEqual(
      expect.objectContaining({
        Bucket: 'institute-x-private',
        Key: 'courses/key',
        ResponseContentDisposition: 'inline',
      }),
    );
  });

  it('reads object size and normalized MIME metadata', async () => {
    client.send.mockResolvedValue({
      ContentLength: 1_000,
      ContentType: 'video/mp4; charset=binary',
    });

    await expect(storage.headObject('courses/key')).resolves.toEqual({
      sizeBytes: 1_000,
      mimeType: 'video/mp4',
    });
    expect(client.send).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
  });

  it('deletes an object from the private bucket', async () => {
    client.send.mockResolvedValue({});

    await storage.deleteObject('courses/key');

    expect(client.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    const command = client.send.mock.calls[0][0] as DeleteObjectCommand;
    expect(command.input).toEqual({ Bucket: 'institute-x-private', Key: 'courses/key' });
  });

  it('copies an existing private object to a new storage key', async () => {
    client.send.mockResolvedValue({});

    await storage.copyObject('courses/old file.mp4', 'courses/new-file.mp4');

    expect(client.send).toHaveBeenCalledWith(expect.any(CopyObjectCommand));
    const command = client.send.mock.calls[0][0] as CopyObjectCommand;
    expect(command.input).toEqual({
      Bucket: 'institute-x-private',
      CopySource: 'institute-x-private/courses/old%20file.mp4',
      Key: 'courses/new-file.mp4',
    });
  });
});
