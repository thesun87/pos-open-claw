import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { MissingTenantContextError } from '../errors/missing-tenant-context.error';
import { PROBLEM_TYPES } from '../errors/problem-types';
import { generateTraceId, TRACE_ID_HEADER } from '../utils/trace-id';

const TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

function typeFor(status: number, exception: unknown): string {
  if (exception instanceof MissingTenantContextError)
    return PROBLEM_TYPES.missingTenantContext;
  if (status === 400) return PROBLEM_TYPES.validation;
  if (status === 401) return PROBLEM_TYPES.unauthorized;
  if (status === 403) return PROBLEM_TYPES.forbidden;
  if (status === 404) return PROBLEM_TYPES.notFound;
  if (status === 409) return PROBLEM_TYPES.conflict;
  if (status >= 500) return PROBLEM_TYPES.internal;
  return PROBLEM_TYPES.aboutBlank;
}

export function sanitizeDetail(
  value: unknown,
  fallback = 'Request failed',
): string {
  const raw =
    typeof value === 'string'
      ? value
      : Array.isArray(value)
        ? value.join('; ')
        : value && typeof value === 'object' && 'message' in value
          ? String(value.message)
          : fallback;
  if (
    /stack|select\s|insert\s|update\s|delete\s|jwt|secret|password|token|hash|database_url|postgresql:/i.test(
      raw,
    )
  )
    return fallback;
  return raw.slice(0, 300);
}

@Injectable()
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<{
      url: string;
      headers: Record<string, string | string[] | undefined>;
    }>();
    const response = ctx.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : exception instanceof MissingTenantContextError
          ? HttpStatus.FORBIDDEN
          : HttpStatus.INTERNAL_SERVER_ERROR;
    const traceHeader = request.headers?.[TRACE_ID_HEADER.toLowerCase()];
    const traceId =
      (Array.isArray(traceHeader) ? traceHeader[0] : traceHeader) ??
      generateTraceId();
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const detail =
      status >= 500
        ? 'Internal server error'
        : sanitizeDetail(exceptionResponse, TITLES[status] ?? 'Request failed');
    if (status >= 500 || exception instanceof Error)
      this.logger.error({ err: exception, traceId }, 'request failed');
    this.adapterHost.httpAdapter.setHeader(response, TRACE_ID_HEADER, traceId);
    this.adapterHost.httpAdapter.setHeader(
      response,
      'Content-Type',
      'application/problem+json',
    );
    this.adapterHost.httpAdapter.reply(
      response,
      {
        type: typeFor(status, exception),
        title: TITLES[status] ?? 'Error',
        status,
        detail,
        instance: request.url,
        traceId,
      },
      status,
    );
  }
}
