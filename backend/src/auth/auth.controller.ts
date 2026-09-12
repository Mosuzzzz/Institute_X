import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, CurrentUserValue } from './current-user.decorator';
import { AuthService } from './auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  @HttpCode(200)
  requestOtp(@Body() input: RequestOtpDto): ReturnType<AuthService['requestOtp']> {
    // The BFF shares one IP across users; enforce the per-mailbox limit here.
    return this.auth.requestOtp(input.email);
  }

  @Post('otp/verify')
  @HttpCode(200)
  verifyOtp(@Body() input: VerifyOtpDto): ReturnType<AuthService['verifyOtp']> {
    return this.auth.verifyOtp(input.challengeId, input.otp);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: CurrentUserValue): ReturnType<AuthService['me']> {
    return this.auth.me(user.id);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  async logout(@Req() request: Request): Promise<void> {
    await this.auth.logout(request.headers.authorization!.slice(7));
  }
}
