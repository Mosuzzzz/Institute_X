import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PreTestService } from './pre-test.service';
import { RandomizerService } from './randomizer.service';
import { PostTestService } from './post-test.service';
import { AssessmentsController } from './assessments.controller';

@Module({
  imports: [AuthModule],
  controllers: [AssessmentsController],
  providers: [PreTestService, PostTestService, RandomizerService],
  exports: [PreTestService, PostTestService],
})
export class AssessmentsModule {}
