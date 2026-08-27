import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { AuthModule } from '../auth/auth.module';
import { MediaService } from './media.service';
import { ObjectStorage } from './object-storage';
import { UnconfiguredObjectStorage } from './unconfigured-object-storage';
import { MediaController } from './media.controller';
import { MediaUploadsController } from './media-uploads.controller';
import { S3ObjectStorage } from './s3-object-storage';
import { CourseCoversController } from './course-covers.controller';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [MediaController, MediaUploadsController, CourseCoversController],
  providers: [
    MediaService,
    {
      provide: ObjectStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ObjectStorage => {
        const endpoint = config.get<string>('S3_ENDPOINT');
        const region = config.get<string>('S3_REGION');
        const bucket = config.get<string>('S3_BUCKET');
        const accessKeyId = config.get<string>('S3_ACCESS_KEY_ID');
        const secretAccessKey = config.get<string>('S3_SECRET_ACCESS_KEY');
        if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
          return new UnconfiguredObjectStorage();
        }
        const client = new S3Client({
          endpoint,
          region,
          forcePathStyle: config.get<boolean>('S3_FORCE_PATH_STYLE', true),
          credentials: { accessKeyId, secretAccessKey },
        });
        return new S3ObjectStorage(client, {
          bucket,
          signedUrlTtlSeconds: config.get<number>('S3_SIGNED_URL_TTL_SECONDS', 300),
        });
      },
    },
  ],
  exports: [MediaService, ObjectStorage],
})
export class MediaModule {}
