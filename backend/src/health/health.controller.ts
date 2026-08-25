import { Controller, Get, HttpCode, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { ReadinessIndicator } from './readiness.indicator';

@ApiTags('system')
@Controller()
export class HealthController {
  constructor(private readonly readiness: ReadinessIndicator) {}

  @Get('health')
  @HttpCode(200)
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  health(): { status: 'ok' } {
    return { status: 'ok' };
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
