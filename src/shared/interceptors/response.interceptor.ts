import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';
import { PaginatedResult } from '../interfaces/paginated-result.interface';

function isPaginatedResult(value: unknown): value is PaginatedResult<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    'meta' in value &&
    Array.isArray((value as PaginatedResult<unknown>).items)
  );
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((result: T) => {
        if (isPaginatedResult(result)) {
          return {
            success: true,
            data: result.items,
            meta: result.meta,
          } as unknown as ApiSuccessResponse<T>;
        }

        return {
          success: true,
          data: result,
        };
      }),
    );
  }
}
