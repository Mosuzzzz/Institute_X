import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionAuthModule } from '../auth/session-auth.module';
import { DatabaseModule } from '../database/database.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  imports: [DatabaseModule, AuthModule, SessionAuthModule],
  controllers: [AccountsController],
  providers: [AccountsService],
})
export class AccountsModule {}
