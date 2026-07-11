import { of } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { ResponseInterceptor } from '../interceptors/response.interceptor';

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor();
  const context = {} as ExecutionContext;

  function handlerFor(value: unknown): CallHandler {
    return { handle: () => of(value) };
  }

  it('wraps plain data in { success: true, data }', (done) => {
    interceptor.intercept(context, handlerFor({ id: '1' })).subscribe((result) => {
      expect(result).toEqual({ success: true, data: { id: '1' } });
      done();
    });
  });

  it('unwraps paginated results into { data, meta }', (done) => {
    const paginated = { items: [{ id: '1' }], meta: { page: 1, total: 1, limit: 20 } };
    interceptor.intercept(context, handlerFor(paginated)).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: [{ id: '1' }],
        meta: { page: 1, total: 1, limit: 20 },
      });
      done();
    });
  });

  it('handles primitive results', (done) => {
    interceptor.intercept(context, handlerFor(null)).subscribe((result) => {
      expect(result).toEqual({ success: true, data: null });
      done();
    });
  });
});
