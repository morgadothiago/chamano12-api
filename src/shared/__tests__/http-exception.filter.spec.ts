import { ArgumentsHost, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { AppException } from '../filters/app-exception';

function makeHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { method: 'GET', url: '/api/v1/drivers/1' };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('formats AppException with its custom code', () => {
    const { host, status, json } = makeHost();
    const exception = new AppException(
      'DRIVER_NOT_FOUND',
      'Motorista não encontrado.',
      HttpStatus.NOT_FOUND,
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'DRIVER_NOT_FOUND', message: 'Motorista não encontrado.', statusCode: 404 },
    });
  });

  it('formats a generic NestJS HttpException with a default code', () => {
    const { host, status, json } = makeHost();
    const exception = new NotFoundException('não achei');

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'NOT_FOUND', message: 'não achei', statusCode: 404 },
    });
  });

  it('joins array validation messages into a single string', () => {
    const { host, json } = makeHost();
    const exception = {
      getStatus: () => 400,
      getResponse: () => ({ message: ['campo a é obrigatório', 'campo b é obrigatório'] }),
      message: 'Bad Request',
    };
    Object.setPrototypeOf(exception, HttpException.prototype);

    filter.catch(exception, host);

    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'campo a é obrigatório; campo b é obrigatório',
        statusCode: 400,
      },
    });
  });

  it('normalizes an unhandled error to 500 without leaking internals', () => {
    const { host, status, json } = makeHost();

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro interno inesperado.',
        statusCode: 500,
      },
    });
  });
});
