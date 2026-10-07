import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

/** Formato único de erro devolvido pela API (o cliente nunca recebe stack traces). */
export interface ApiErrorBody {
  statusCode: number;
  /** Código estável para o cliente tratar o erro (ex.: NOT_FOUND, VALIDATION_FAILED). */
  code: string;
  message: string;
  details?: unknown;
  path: string;
  timestamp: string;
}

const CODE_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "VALIDATION_FAILED",
  [HttpStatus.TOO_MANY_REQUESTS]: "TOO_MANY_REQUESTS",
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = isHttp ? exception.getResponse() : undefined;
    const fromResponse = typeof response === "object" && response !== null ? response : {};
    const rawMessage = (fromResponse as { message?: unknown }).message;

    const body: ApiErrorBody = {
      statusCode: status,
      code:
        (fromResponse as { code?: string }).code ?? CODE_BY_STATUS[status] ?? "INTERNAL_ERROR",
      message:
        status >= 500
          ? "Erro interno. Tenta novamente mais tarde."
          : Array.isArray(rawMessage)
            ? "Pedido inválido."
            : typeof rawMessage === "string"
              ? rawMessage
              : isHttp
                ? exception.message
                : "Erro",
      path: req.originalUrl ?? req.url,
      timestamp: new Date().toISOString(),
    };
    const details = (fromResponse as { details?: unknown }).details;
    if (details !== undefined) body.details = details;
    else if (Array.isArray(rawMessage)) body.details = rawMessage;

    if (status >= 500) {
      this.logger.error(
        { err: exception, path: req.originalUrl, method: req.method },
        "Erro não tratado no pedido",
      );
    }
    res.status(status).json(body);
  }
}
