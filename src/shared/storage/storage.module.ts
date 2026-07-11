import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { STORAGE_PROVIDER } from './storage-provider.interface';
import { LocalStorageProvider } from './local-storage.provider';

/**
 * Único provider implementado hoje é "local". STORAGE_PROVIDER env var
 * existe para o futuro (ex: "s3") — ver docs/architecture.md para a decisão
 * pendente de confirmação do cliente.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: LocalStorageProvider,
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
