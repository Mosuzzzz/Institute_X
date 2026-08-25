import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ReadinessIndicator } from '../src/health/readiness.indicator';
import { PrismaService } from '../src/database/prisma.service';

describe('Health endpoints', () => {
  let app: INestApplication;
  const readiness = { check: jest.fn<Promise<boolean>, []>() };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ isReady: jest.fn() })
      .overrideProvider(ReadinessIndicator)
      .useValue(readiness)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    jest.resetAllMocks();
    await app.close();
  });

  it('GET /api/health returns an OK status', async () => {
    await request(app.getHttpServer() as Server)
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /api/ready returns 200 when dependencies are ready', async () => {
    readiness.check.mockResolvedValue(true);

    await request(app.getHttpServer() as Server)
      .get('/api/ready')
      .expect(200)
      .expect({ status: 'ready' });
  });

  it('GET /api/ready returns 503 when a dependency is unavailable', async () => {
    readiness.check.mockResolvedValue(false);

    await request(app.getHttpServer() as Server)
      .get('/api/ready')
      .expect(503)
      .expect({ statusCode: 503, message: 'Service unavailable' });
  });
});
