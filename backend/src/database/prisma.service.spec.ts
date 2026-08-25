import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('connects when the Nest application starts', async () => {
    const service = new PrismaService();
    const connect = jest.spyOn(service, '$connect').mockResolvedValue();

    await service.onModuleInit();

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('disconnects when the Nest application shuts down', async () => {
    const service = new PrismaService();
    const disconnect = jest.spyOn(service, '$disconnect').mockResolvedValue();

    await service.onModuleDestroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('reports false instead of throwing when PostgreSQL is unavailable', async () => {
    const service = new PrismaService();
    jest.spyOn(service, '$queryRaw').mockRejectedValue(new Error('offline'));

    await expect(service.isReady()).resolves.toBe(false);
  });
});
