import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

/**
 * Normaliza toda exceção (HttpException do Nest, class-validator, ou erro
 * não tratado) para o formato { success: false, error: { code, message,
 * statusCode } }. Nunca expõe stack trace ao client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const { code, message } = this.extractCodeAndMessage(exception, statusCode);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      error: { code, message, statusCode },
    };

    response.status(statusCode).json(body);
  }

  private extractCodeAndMessage(
    exception: unknown,
    statusCode: number,
  ): { code: string; message: string } {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();

      if (typeof payload === 'object' && payload !== null) {
        const obj = payload as Record<string, unknown>;
        const code = typeof obj.code === 'string' ? obj.code : this.defaultCode(statusCode);
        const rawMessage = obj.message;
        const message = Array.isArray(rawMessage)
          ? rawMessage.join('; ')
          : typeof rawMessage === 'string'
            ? rawMessage
            : exception.message;
        return { code, message };
      }

      return { code: this.defaultCode(statusCode), message: exception.message };
    }

    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno inesperado.',
    };
  }

  private defaultCode(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
