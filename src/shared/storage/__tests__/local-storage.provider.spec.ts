import { ConfigService } from '@nestjs/config';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { LocalStorageProvider } from '../local-storage.provider';

describe('LocalStorageProvider', () => {
  const testDir = 'uploads-test-tmp';
  let provider: LocalStorageProvider;

  beforeEach(() => {
    const config = { get: jest.fn().mockReturnValue(testDir) } as unknown as ConfigService;
    provider = new LocalStorageProvider(config);
  });

  afterAll(async () => {
    await rm(join(process.cwd(), testDir), { recursive: true, force: true });
  });

  it('saves the buffer to disk and returns a servable url', async () => {
    const result = await provider.save({
      buffer: Buffer.from('conteudo'),
      originalName: 'foto.png',
      mimeType: 'image/png',
      folder: 'drivers/driver-1',
    });

    expect(result.url).toMatch(/^\/uploads\/drivers\/driver-1\/.+\.png$/);
    expect(result.key).toContain('drivers/driver-1');
  });

  it('generates a unique file name per call to avoid collisions', async () => {
    const a = await provider.save({
      buffer: Buffer.from('x'),
      originalName: 'a.png',
      mimeType: 'image/png',
      folder: 'drivers/driver-2',
    });
    const b = await provider.save({
      buffer: Buffer.from('y'),
      originalName: 'a.png',
      mimeType: 'image/png',
      folder: 'drivers/driver-2',
    });

    expect(a.url).not.toBe(b.url);
  });
});
