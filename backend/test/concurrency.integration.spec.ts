import 'dotenv/config';
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  AccountStatus,
  AssetStatus,
  ContentType,
  CourseEligibilityMode,
  CourseVersionStatus,
  PrismaClient,
  QuizType,
  UserRole,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { CourseVersionsService } from '../src/course-versions/course-versions.service';
import { MediaService } from '../src/media/media.service';
import { S3ObjectStorage } from '../src/media/s3-object-storage';

const describeIntegration =
  process.env.RUN_DATABASE_INTEGRATION === 'true' ? describe : describe.skip;

describeIntegration('PostgreSQL and MinIO concurrency integration', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('serializes Lesson deletion ahead of submission on the real PostgreSQL row lock', async () => {
    const marker = randomUUID();
    const teacherId = randomUUID();
    const categoryId = randomUUID();
    const courseId = randomUUID();
    const versionId = randomUUID();
    const mediaItemId = randomUUID();
    const mediaAssetId = randomUUID();
    let releaseDelete!: () => void;
    let deletionStarted!: () => void;
    const deleteReleased = new Promise<void>((resolve) => {
      releaseDelete = resolve;
    });
    const deleteEntered = new Promise<void>((resolve) => {
      deletionStarted = resolve;
    });
    const storage = {
      deleteObject: async (): Promise<void> => {
        deletionStarted();
        await deleteReleased;
      },
    };
    const media = new MediaService(prisma as never, storage as never);
    const versions = new CourseVersionsService(prisma as never, storage as never);

    try {
      await prisma.user.create({
        data: {
          id: teacherId,
          universityEmail: `concurrency-${marker}@institute.example`,
          fullName: 'Concurrency Teacher',
          emailVerifiedAt: new Date(),
          roles: { create: { role: UserRole.TEACHER } },
          accountStatus: AccountStatus.ACTIVE,
        },
      });
      await prisma.category.create({
        data: { id: categoryId, slug: `concurrency-${marker}`, name: 'Concurrency' },
      });
      await prisma.course.create({
        data: {
          id: courseId,
          teacherId,
          eligibilityMode: CourseEligibilityMode.OPEN,
          categories: { create: { categoryId } },
          versions: {
            create: {
              id: versionId,
              versionNumber: 1,
              title: 'Concurrency Course',
              status: CourseVersionStatus.DRAFT,
              contentItems: {
                create: [
                  { contentType: ContentType.TEXT, textBody: 'Retained lesson', position: 1 },
                  {
                    id: mediaItemId,
                    contentType: ContentType.VIDEO,
                    title: 'Deleted before submission',
                    position: 2,
                    mediaAsset: {
                      create: {
                        id: mediaAssetId,
                        fileName: 'race.mp4',
                        mimeType: 'video/mp4',
                        storageKey: `integration/${marker}/race.mp4`,
                        sizeBytes: 4,
                        status: AssetStatus.READY,
                      },
                    },
                  },
                ],
              },
              quizzes: {
                create: [QuizType.PRE_TEST, QuizType.POST_TEST].map((quizType) => ({
                  quizType,
                  title: quizType,
                  questions: {
                    create: {
                      questionText: `${quizType} question`,
                      points: 1,
                      position: 1,
                      options: {
                        create: [
                          { optionText: 'Correct', isCorrect: true, position: 1 },
                          { optionText: 'Wrong', isCorrect: false, position: 2 },
                        ],
                      },
                    },
                  },
                })),
              },
            },
          },
        },
      });

      const actor = { id: teacherId, role: UserRole.TEACHER };
      const deletion = media.deleteDraftAsset(actor, mediaAssetId);
      await deleteEntered;
      const submission = versions.submit(actor, versionId);
      const stateWhileDeleteHoldsLock = await Promise.race([
        submission.then(() => 'submitted'),
        new Promise<'blocked'>((resolve) => setTimeout(() => resolve('blocked'), 150)),
      ]);
      expect(stateWhileDeleteHoldsLock).toBe('blocked');

      releaseDelete();
      await Promise.all([deletion, submission]);

      await expect(
        prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } }),
      ).resolves.toBeNull();
      await expect(
        prisma.courseVersion.findUniqueOrThrow({ where: { id: versionId } }),
      ).resolves.toMatchObject({
        status: CourseVersionStatus.SUBMITTED,
      });
    } finally {
      releaseDelete?.();
      await prisma.courseVersionReview.deleteMany({ where: { version: { courseId } } });
      await prisma.courseVersion.deleteMany({ where: { courseId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
      await prisma.category.deleteMany({ where: { id: categoryId } });
      await prisma.user.deleteMany({ where: { id: teacherId } });
    }
  });

  it('keeps one final object when two completions race against real MinIO', async () => {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION;
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error('MinIO integration environment is not configured');
    }

    const client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
    const copiedKeys: string[] = [];
    let releaseCopies!: () => void;
    const bothCopiesEntered = new Promise<void>((resolve) => {
      releaseCopies = resolve;
    });
    class RacingStorage extends S3ObjectStorage {
      override async copyObject(source: string, destination: string): Promise<void> {
        copiedKeys.push(destination);
        if (copiedKeys.length === 2) releaseCopies();
        await bothCopiesEntered;
        await super.copyObject(source, destination);
      }
    }
    const storage = new RacingStorage(client, { bucket, signedUrlTtlSeconds: 60 });
    await expect(storage.isReady()).resolves.toBe(true);

    const marker = randomUUID();
    const teacherId = randomUUID();
    const courseId = randomUUID();
    const versionId = randomUUID();
    const contentItemId = randomUUID();
    const assetId = randomUUID();
    const sourceKey = `integration/${marker}/pending.txt`;
    const body = Buffer.from('race');
    const media = new MediaService(prisma as never, storage);

    try {
      await prisma.user.create({
        data: {
          id: teacherId,
          universityEmail: `minio-${marker}@institute.example`,
          fullName: 'MinIO Teacher',
          emailVerifiedAt: new Date(),
          roles: { create: { role: UserRole.TEACHER } },
          accountStatus: AccountStatus.ACTIVE,
        },
      });
      await prisma.course.create({
        data: {
          id: courseId,
          teacherId,
          versions: {
            create: {
              id: versionId,
              versionNumber: 1,
              title: 'MinIO race',
              status: CourseVersionStatus.DRAFT,
              contentItems: {
                create: {
                  id: contentItemId,
                  contentType: ContentType.DOCUMENT,
                  position: 1,
                  mediaAsset: {
                    create: {
                      id: assetId,
                      fileName: 'pending.txt',
                      mimeType: 'text/plain',
                      storageKey: sourceKey,
                      sizeBytes: body.length,
                      status: AssetStatus.PENDING,
                    },
                  },
                },
              },
            },
          },
        },
      });
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: sourceKey,
          Body: body,
          ContentLength: body.length,
          ContentType: 'text/plain',
        }),
      );

      const actor = { id: teacherId, role: UserRole.TEACHER };
      const [first, second] = await Promise.all([
        media.completeUpload(actor, assetId),
        media.completeUpload(actor, assetId),
      ]);
      expect(first.storageKey).toBe(second.storageKey);
      expect(copiedKeys).toHaveLength(2);

      const winnerKey = first.storageKey;
      const loserKey = copiedKeys.find((key) => key !== winnerKey);
      await expect(
        client.send(new HeadObjectCommand({ Bucket: bucket, Key: winnerKey })),
      ).resolves.toBeDefined();
      await expect(
        client.send(new HeadObjectCommand({ Bucket: bucket, Key: sourceKey })),
      ).rejects.toBeDefined();
      expect(loserKey).toBeDefined();
      await expect(
        client.send(new HeadObjectCommand({ Bucket: bucket, Key: loserKey! })),
      ).rejects.toBeDefined();
    } finally {
      releaseCopies?.();
      await Promise.allSettled(
        [sourceKey, ...copiedKeys].map((key) =>
          client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })),
        ),
      );
      await prisma.courseVersion.deleteMany({ where: { courseId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
      await prisma.user.deleteMany({ where: { id: teacherId } });
      client.destroy();
    }
  });
});
