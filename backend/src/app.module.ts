import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { validateEnvironment } from './config/environment.validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TeacherPermissionsModule } from './teacher-permissions/teacher-permissions.module';
import { CoursesModule } from './courses/courses.module';
import { ContentModule } from './content/content.module';
import { CourseVersionsModule } from './course-versions/course-versions.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { LearningModule } from './learning/learning.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { MediaModule } from './media/media.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CategoriesModule } from './categories/categories.module';
import { SessionAuthModule } from './auth/session-auth.module';
import { AccountsModule } from './accounts/accounts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    AuthModule,
    SessionAuthModule,
    AccountsModule,
    TeacherPermissionsModule,
    CoursesModule,
    ContentModule,
    CourseVersionsModule,
    QuizzesModule,
    LearningModule,
    AssessmentsModule,
    MediaModule,
    AnalyticsModule,
    CategoriesModule,
    HealthModule,
  ],
})
export class AppModule {}
