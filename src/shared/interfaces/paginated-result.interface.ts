export interface PaginationMeta {
  page: number;
  total: number;
  limit: number;
}

/**
 * Retorno interno de services/repositories para listas paginadas.
 * O ResponseInterceptor detecta esse formato e monta { data, meta } na
 * resposta HTTP final.
 */
export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}
