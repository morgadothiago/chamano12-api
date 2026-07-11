import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { IStorageProvider, StoredFile } from './storage-provider.interface';

/**
 * Implementação padrão: salva em disco local sob STORAGE_LOCAL_DIR
 * (default: "uploads/"), servido estaticamente em /uploads/*.
 * Suficiente para dev/staging; trocar por S3-compatible antes de produção
 * multi-instância (disco local não é compartilhado entre réplicas).
 */
@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly baseDir: string;

  constructor(private readonly config: ConfigService) {
    this.baseDir = this.config.get<string>('STORAGE_LOCAL_DIR') ?? 'uploads';
  }

  async save(params: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    folder: string;
  }): Promise<StoredFile> {
    const { buffer, originalName, folder } = params;
    const dir = join(process.cwd(), this.baseDir, folder);
    await mkdir(dir, { recursive: true });

    const ext = extname(originalName) || '';
    const fileName = `${crypto.randomUUID()}${ext}`;
    const fullPath = join(dir, fileName);
    await writeFile(fullPath, buffer);

    const key = join(folder, fileName);
    return {
      key,
      url: `/uploads/${folder}/${fileName}`,
    };
  }
}
