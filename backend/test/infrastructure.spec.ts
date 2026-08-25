import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Docker infrastructure contract', () => {
  const repositoryRoot = resolve(__dirname, '../..');

  it('defines all required services, health checks, and persistent volumes', () => {
    const compose = readFileSync(resolve(repositoryRoot, 'docker-compose.yml'), 'utf8');

    for (const service of [
      'postgres:',
      'redis:',
      'minio:',
      'minio-init:',
      'migrate:',
      'backend:',
      'nginx:',
    ]) {
      expect(compose).toContain(service);
    }
    expect(compose.match(/healthcheck:/g)?.length).toBeGreaterThanOrEqual(4);
    expect(compose).toContain('postgres_data:');
    expect(compose).toContain('redis_data:');
    expect(compose).toContain('minio_data:');
    expect(compose).toContain('mc anonymous set none');
    expect(compose).toContain('condition: service_completed_successfully');
    expect(compose).toContain('target: migration');
  });

  it('builds a production backend image that runs as a non-root user', () => {
    const dockerfile = readFileSync(resolve(repositoryRoot, 'backend/Dockerfile'), 'utf8');

    expect(dockerfile).toContain('AS build');
    expect(dockerfile).toContain('AS production');
    expect(dockerfile).toContain('AS migration');
    expect(dockerfile).toMatch(/"prisma",\s*"migrate",\s*"deploy"/);
    expect(dockerfile).toMatch(/USER\s+nestjs/);
    expect(dockerfile).toContain('npm run start:prod');
  });

  it('proxies API traffic and exposes only private internal services', () => {
    const nginx = readFileSync(resolve(repositoryRoot, 'infrastructure/nginx.conf'), 'utf8');
    const compose = readFileSync(resolve(repositoryRoot, 'docker-compose.yml'), 'utf8');

    expect(nginx).toContain('proxy_pass http://backend:3000');
    expect(nginx).toContain('location /api/');
    expect(compose).not.toMatch(/postgres:[\s\S]*?ports:\s*\n\s*-\s*["']?5432:5432/);
    expect(compose).not.toMatch(/redis:[\s\S]*?ports:\s*\n\s*-\s*["']?6379:6379/);
  });
});
