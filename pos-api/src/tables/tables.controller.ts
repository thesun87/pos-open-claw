import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
import { Roles } from '../common/decorators/roles.decorator';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import type { TenantContext as TenantContextType } from '../common/decorators/tenant-context.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateTableDto } from './dto/create-table.dto';
import { ListTablesQueryDto } from './dto/list-tables-query.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { TableStatusService } from './table-status.service';
import { TablesService } from './tables.service';

const tableExample = {
  id: '018f0000-0000-7000-8000-0000000000b1',
  areaId: '018f0000-0000-7000-8000-0000000000a1',
  name: 'Bàn 01',
  capacity: 4,
  sortOrder: 10,
  isActive: true,
  createdAt: '2026-05-25T08:00:00.000Z',
  updatedAt: '2026-05-25T08:00:00.000Z',
};

@ApiTags('tables')
@ApiBearerAuth()
@Controller('tables')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TablesController {
  constructor(
    private readonly service: TablesService,
    private readonly tableStatusService: TableStatusService,
  ) {}

  @Get('status')
  @Roles('cashier', 'admin')
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          tableId: tableExample.id,
          status: 'occupied',
          activeOrderCount: 1,
          openSessionCount: 1,
          conflict: false,
        },
        {
          tableId: '018f0000-0000-7000-8000-0000000000b2',
          status: 'occupied',
          activeOrderCount: 0,
          openSessionCount: 2,
          conflict: true,
        },
        {
          tableId: '018f0000-0000-7000-8000-0000000000b3',
          status: 'empty',
          activeOrderCount: 0,
          openSessionCount: 0,
          conflict: false,
        },
      ],
    },
  })
  listStatus(@TenantContext() context: TenantContextType | undefined) {
    return this.tableStatusService.listStatus(context);
  }

  @Get()
  @Roles('cashier', 'admin')
  @ApiQuery({ name: 'areaId', required: false, example: tableExample.areaId })
  @ApiResponse({ status: 200, schema: { example: [tableExample] } })
  @ApiResponse({
    status: 400,
    description: 'Invalid/cross-store areaId Problem Details',
  })
  list(
    @TenantContext() context: TenantContextType | undefined,
    @Query() query: ListTablesQueryDto,
  ) {
    return this.service.list(context, query);
  }

  @Post()
  @Roles('admin')
  @ApiBody({
    type: CreateTableDto,
    examples: {
      create: {
        value: {
          name: 'Bàn 01',
          areaId: tableExample.areaId,
          capacity: 4,
          sortOrder: 10,
        },
      },
    },
  })
  @ApiResponse({ status: 201, schema: { example: tableExample } })
  @ApiResponse({ status: 400, description: 'Validation Problem Details' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — cashier cannot mutate tables',
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate table name Problem Details',
    schema: {
      example: {
        type: 'https://pos.example/errors/table-name-conflict',
        title: 'Tên bàn đã tồn tại',
        status: 409,
        detail: 'Tên bàn phải duy nhất trong store.',
      },
    },
  })
  create(
    @TenantContext() context: TenantContextType | undefined,
    @Body() body: CreateTableDto,
  ) {
    return this.service.create(context, body);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiParam({ name: 'id', example: tableExample.id })
  @ApiBody({
    type: UpdateTableDto,
    examples: {
      update: { value: { name: 'Bàn VIP', capacity: 6, isActive: false } },
    },
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        ...tableExample,
        name: 'Bàn VIP',
        capacity: 6,
        isActive: false,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation Problem Details' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — cashier cannot mutate tables',
  })
  @ApiResponse({ status: 404, description: 'Table not found Problem Details' })
  @ApiResponse({
    status: 409,
    description: 'Duplicate table name Problem Details',
  })
  update(
    @TenantContext() context: TenantContextType | undefined,
    @Param('id') id: string,
    @Body() body: UpdateTableDto,
  ) {
    return this.service.update(context, id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', example: tableExample.id })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — cashier cannot mutate tables',
  })
  @ApiResponse({ status: 404, description: 'Table not found Problem Details' })
  @ApiResponse({
    status: 409,
    description: 'Table has pending order Problem Details',
    schema: {
      example: {
        type: 'https://pos.example/errors/table-has-pending-order',
        title: 'Bàn đang có đơn chưa tất toán',
        status: 409,
        detail:
          'Bàn đang có 2 đơn trong ngày; hãy xử lý/hủy đơn trước khi xóa.',
        activeOrderCount: 2,
      },
    },
  })
  async delete(
    @TenantContext() context: TenantContextType | undefined,
    @Param('id') id: string,
  ) {
    await this.service.delete(context, id);
  }
}
