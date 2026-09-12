import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { AuthGuard } from '../src/auth/auth.guard';

describe('Email OTP REST API', () => {
  let app: INestApplication;
  const auth = { requestOtp: jest.fn(), verifyOtp: jest.fn() };
  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthGuard, { provide: AuthService, useValue: auth }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });
  afterEach(async () => app.close());

  it('rejects a non-institutional email before requesting an OTP', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/api/auth/otp/request')
      .send({ email: 'fake@notx.ac.th' });
    expect({ status: response.status, body: response.body }).toMatchObject({ status: 400 });
    expect(auth.requestOtp).not.toHaveBeenCalled();
  });

  it('returns only challenge metadata when requesting an OTP', async () => {
    auth.requestOtp.mockResolvedValue({
      challengeId: '11111111-1111-4111-8111-111111111111',
      expiresAt: '2026-09-12T10:05:00Z',
    });
    const response = await request(app.getHttpServer() as Server)
      .post('/api/auth/otp/request')
      .send({ email: 'student@x.ac.th' })
      .expect(200);
    expect(response.body).toEqual({
      challengeId: '11111111-1111-4111-8111-111111111111',
      expiresAt: '2026-09-12T10:05:00Z',
    });
    expect(response.body).not.toHaveProperty('otp');
    expect(auth.requestOtp).toHaveBeenCalledWith('student@x.ac.th');
  });

  it('rejects malformed OTPs before verification', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/auth/otp/verify')
      .send({ challengeId: '11111111-1111-4111-8111-111111111111', otp: '12345' })
      .expect(400);
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it('does not expose a password-login endpoint', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/auth/login')
      .send({ email: 'student@x.ac.th', password: 'password' })
      .expect(404);
  });
});
