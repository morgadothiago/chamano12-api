import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exceção de domínio com um código estável (ex: "DRIVER_NOT_FOUND") que o
 * client (painel web) pode usar para tratamento programático, além da
 * mensagem legível para exibição.
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message, statusCode }, statusCode);
  }
}
