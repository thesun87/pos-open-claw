import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import type { TenantContext as TenantContextType } from '../common/decorators/tenant-context.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ListSessionsQueryDto } from './dto/list-sessions-query.dto';
import { OpenSessionDto } from './dto/open-session.dto';
import { TableSessionsService } from './table-sessions.service';

const sessionExample = {
  id: '018f0000-0000-7000-8000-000000000001',
  tableId: '018f0000-0000-7000-8000-0000000000b1',
  status: 'open',
  openedByDevice: 'device-pos-001',
  openedAt: '2026-06-04T08:00:00.000Z',
  clientSessionId: '018f0000-0000-7000-8000-000000000002',
  createdAt: '2026-06-04T08:00:00.000Z',
  updatedAt: '2026-06-04T08:00:00.000Z',
};

/**
 * NOTE: This controller is registered with @Controller('tables') alongside TablesController.
 * NestJS allows multiple controllers with the same prefix; routes are merged at module level.
 *
 * ROUTE ORDER SAFETY:
 * - GET  tables/sessions    (static path — comes before :id routes)
 * - POST tables/sessions/:id/settle  (static "sessions" prefix before :id)
 * - POST tables/:id/sessions  (dynamic :id — registered in this controller only)
 *
 * TablesController has GET tables/status declared first, so it takes priority there.
 * Placing session-specific static routes in a separate controller avoids :id collision.
 */
@ApiTags('tables')
@ApiBearerAuth()
@Controller('tables')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TableSessionsController {
  constructor(private readonly service: TableSessionsService) {}

  /**
   * GET /tables/sessions?status=open
   * Must be declared before :id routes to avoid NestJS consuming "sessions" as :id
   */
  @Get('sessions')
  @Roles('cashier', 'admin')
  @ApiQuery({ name: 'status', required: false, example: 'open' })
  @ApiResponse({
    status: 200,
    schema: {
      example: [sessionExample],
    },
  })
  listSessions(
    @TenantContext() context: TenantContextType | undefined,
    @Query() query: ListSessionsQueryDto,
  ) {
    return this.service.listOpenSessions(context, query.status);
  }

  /**
   * POST /tables/sessions/:id/settle
   * Static "sessions" prefix prevents :id (table ID) from capturing "sessions"
   */
  @Post('sessions/:id/settle')
  @Roles('cashier', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', example: sessionExample.id })
  @ApiResponse({ status: 200, schema: { example: sessionExample } })
  @ApiResponse({ status: 404, description: 'Session not found / cross-store' })
  settleSession(
    @TenantContext() context: TenantContextType | undefined,
    @Param('id') id: string,
  ) {
    return this.service.settleSession(context, id);
  }

  /**
   * POST /tables/:id/sessions
   * Opens a new table session for the given table
   */
  @Post(':id/sessions')
  @Roles('cashier', 'admin')
  @ApiParam({
    name: 'id',
    description: 'Table ID',
    example: sessionExample.tableId,
  })
  @ApiBody({
    type: OpenSessionDto,
    examples: {
      open: {
        value: {
          clientSessionId: sessionExample.clientSessionId,
          deviceId: 'device-pos-001',
          openedAt: sessionExample.openedAt,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    schema: { example: { ...sessionExample, idempotent_replay: false } },
  })
  @ApiResponse({
    status: 200,
    description: 'Idempotent replay — session already exists',
    schema: { example: { ...sessionExample, idempotent_replay: true } },
  })
  @ApiResponse({
    status: 400,
    description: 'Table does not belong to store / validation error',
    schema: {
      example: {
        type: 'https://pos.example/errors/validation',
        title: 'Bad Request',
        status: 400,
        detail: 'Table không thuộc store',
      },
    },
  })
  async openSession(
    @TenantContext() context: TenantContextType | undefined,
    @Param('id') tableId: string,
    @Body() body: OpenSessionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.openSession(context, tableId, body);
    if (result.idempotent_replay) {
      res.status(HttpStatus.OK);
    }
    return result;
  }
}
