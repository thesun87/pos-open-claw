import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { generateTraceId, TRACE_ID_HEADER } from '../common/utils/trace-id';

@Controller('health')
export class HealthController {
  @Get()
  getHealth(@Req() request?: Request): { status: 'ok'; traceId: string } {
    const headerTraceId = request?.headers[TRACE_ID_HEADER.toLowerCase()];
    return {
      status: 'ok',
      traceId:
        (Array.isArray(headerTraceId) ? headerTraceId[0] : headerTraceId) ??
        generateTraceId(),
    };
  }
}
