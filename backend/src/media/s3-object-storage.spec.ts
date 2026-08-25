import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { S3ObjectStorage } from './s3-object-storage';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://storage.example/signed'),
}));

describe('S3ObjectStorage', () => {
  const client = { send: jest.fn() };
  let storage: S3ObjectStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new S3ObjectStorage(client as never, {
      bucket: 'institute-x-private',
      signedUrlTtlSeconds: 300,
    });
  });

  it('creates a short-lived signed upload command with enforced metadata', async () => {
    const result = await storage.createUploadUrl('courses/key', 'video/mp4', 1_000);

    const { getSignedUrl } = jest.requireMock('@aws-sdk/s3-request-presigner') as {
      getSignedUrl: jest.Mock;
    };
    expect(getSignedUrl).toHaveBeenCalledWith(client, expect.any(PutObjectCommand), {
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
});
