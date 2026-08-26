import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { MajorsController } from './majors.controller';

@Module({
  imports: [AuthModule],
  controllers: [CategoriesController, MajorsController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
