export interface StoredFile {
  /** URL (ou path servível) para acessar o arquivo depois de salvo. */
  url: string;
  /** Chave interna do provider (path local, S3 key, etc) — útil para deletar depois. */
  key: string;
}

/**
 * Interface abstrata de storage de arquivos. A implementação padrão desta
 * fase é local em disco (LocalStorageProvider). Trocar para um provider
 * S3-compatible no futuro é só implementar esta interface e trocar o
 * provider no StorageModule — nenhum outro código do domínio de motoristas
 * precisa mudar.
 *
 * DECISÃO PENDENTE DE CONFIRMAÇÃO DO CLIENTE: qual storage definitivo usar
 * em produção (S3, GCS, Cloudflare R2, etc). Ver docs/architecture.md.
 */
export interface IStorageProvider {
  save(params: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    folder: string;
  }): Promise<StoredFile>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
