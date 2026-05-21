import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import type { TenantContext as TenantContextType } from '../common/decorators/tenant-context.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { SyncOrderDto, syncOrderExample } from './dto/sync-order.dto';
import { VoidOrderDto, voidOrderExample } from './dto/void-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles('admin')
  @ApiResponse({ status: 200, description: 'Danh sách đơn hàng admin' })
  list(
    @TenantContext() context: TenantContextType | undefined,
    @Query() query: ListOrdersQueryDto,
  ) {
    return this.ordersService.listOrders(context, query);
  }

  @Get(':id')
  @Roles('admin')
  @ApiParam({ name: 'id', example: '018f0000-0000-7000-8000-000000009999' })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn hàng admin' })
  @ApiResponse({ status: 404, description: 'Order not found Problem Details' })
  detail(
    @TenantContext() context: TenantContextType | undefined,
    @Param('id') id: string,
  ) {
    return this.ordersService.getOrderDetail(context, id);
  }

  @Post()
  @Roles('cashier', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiBody({
    type: SyncOrderDto,
    examples: { create: { value: syncOrderExample } },
  })
  @ApiResponse({
    status: 201,
    description: 'Created',
    schema: {
      example: {
        orderId: '018f0000-0000-7000-8000-000000009999',
        idempotent_replay: false,
        syncedAt: '2026-05-13T07:23:12.000Z',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Idempotent replay',
    schema: {
      example: {
        orderId: '018f0000-0000-7000-8000-000000009999',
        idempotent_replay: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation Problem Details',
    schema: {
      example: {
        type: 'https://pos.example/errors/validation',
        title: 'Bad Request',
        status: 400,
        detail: 'items[0].lineTotal expected 40000 got 39000',
        instance: '/api/v1/orders',
        traceId: '018f0000-0000-7000-8000-000000000000',
      },
    },
  })
  async create(
    @TenantContext() context: TenantContextType | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: SyncOrderDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.ordersService.syncOrder(
      context,
      idempotencyKey,
      body,
    );
    if (result.idempotent_replay) response.status(HttpStatus.OK);
    return result;
  }

  @Post(':id/void')
  @Roles('cashier', 'admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: 'id', example: '018f0000-0000-7000-8000-000000009999' })
  @ApiBody({
    type: VoidOrderDto,
    examples: { void: { value: voidOrderExample } },
  })
  @ApiResponse({
    status: 201,
    description: 'Voided',
    schema: {
      example: {
        voidId: '018f0000-0000-7000-8000-000000008888',
        voidedAt: '2026-05-14T15:03:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Order not found Problem Details' })
  @ApiResponse({ status: 409, description: 'Already voided Problem Details' })
  async void(
    @TenantContext() context: TenantContextType | undefined,
    @Param('id') id: string,
    @Body() body: VoidOrderDto,
  ) {
    return this.ordersService.voidOrder(context, id, body);
  }
}
