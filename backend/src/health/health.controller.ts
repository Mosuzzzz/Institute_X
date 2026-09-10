import {
  Controller,
  Get,
  Header,
  HttpCode,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { ReadinessIndicator } from './readiness.indicator';
import { Inject } from '@nestjs/common';
import { AUTH_SESSION_CACHE, AuthSessionCache } from '../auth/auth-session-cache';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('system')
@Controller()
export class HealthController {
  constructor(
    private readonly readiness: ReadinessIndicator,
    @Inject(AUTH_SESSION_CACHE) private readonly sessionCache: AuthSessionCache,
  ) {}

  @Get('health')
  @HttpCode(200)
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('health/auth-cache')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EXECUTIVE)
  @ApiOkResponse({ description: 'Local authentication cache counters and readiness' })
  authCache(): ReturnType<AuthSessionCache['stats']> {
    return this.sessionCache.stats();
  }

  @Get('metrics/auth-cache')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.EXECUTIVE)
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOkResponse({ description: 'Prometheus authentication cache metrics' })
  authCacheMetrics(): string {
    const stats = this.sessionCache.stats();
    return [
      '# HELP institute_x_auth_cache_hits_total Authentication cache hits.',
      '# TYPE institute_x_auth_cache_hits_total counter',
      `institute_x_auth_cache_hits_total ${stats.hits}`,
      '# HELP institute_x_auth_cache_misses_total Authentication cache misses.',
      '# TYPE institute_x_auth_cache_misses_total counter',
      `institute_x_auth_cache_misses_total ${stats.misses}`,
      '# HELP institute_x_auth_cache_errors_total Authentication cache errors.',
      '# TYPE institute_x_auth_cache_errors_total counter',
      `institute_x_auth_cache_errors_total ${stats.errors}`,
      '# HELP institute_x_auth_cache_ready Whether the Redis cache is ready.',
      '# TYPE institute_x_auth_cache_ready gauge',
      `institute_x_auth_cache_ready ${stats.ready ? 1 : 0}`,
      '',
    ].join('\n');
  }

  @Get('ready')
  @HttpCode(200)
  @ApiOkResponse({ schema: { example: { status: 'ready' } } })
  @ApiServiceUnavailableResponse({
    schema: { example: { statusCode: 503, message: 'Service unavailable' } },
  })
  async ready(): Promise<{ status: 'ready' }> {
    if (!(await this.readiness.check())) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        message: 'Service unavailable',
      });
    }

    return { status: 'ready' };
  }
}
