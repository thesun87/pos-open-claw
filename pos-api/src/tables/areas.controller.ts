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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import type { TenantContext as TenantContextType } from '../common/decorators/tenant-context.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { AreasService } from './areas.service';

const areaExample = {
  id: '018f0000-0000-7000-8000-0000000000a1',
  name: 'Quầy chính',
  sortOrder: 10,
  isActive: true,
  createdAt: '2026-05-25T08:00:00.000Z',
  updatedAt: '2026-05-25T08:00:00.000Z',
};

@ApiTags('areas')
@ApiBearerAuth()
@Controller('areas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AreasController {
  constructor(private readonly service: AreasService) {}

  @Get()
  @Roles('cashier', 'admin')
  @ApiResponse({ status: 200, schema: { example: [areaExample] } })
  list(@TenantContext() context: TenantContextType | undefined) {
    return this.service.list(context);
  }

  @Post()
  @Roles('admin')
  @ApiBody({
    type: CreateAreaDto,
    examples: {
      create: { value: { name: 'Sân ngoài', sortOrder: 20 } },
    },
  })
  @ApiResponse({ status: 201, schema: { example: areaExample } })
  @ApiResponse({
    status: 409,
    description: 'Duplicate area name Problem Details',
    schema: {
      example: {
        type: 'https://pos.example/errors/area-name-conflict',
        title: 'Tên khu vực đã tồn tại',
        status: 409,
        detail: 'Tên khu vực phải duy nhất trong store.',
        instance: '/api/v1/areas',
        traceId: '01HZX9...',
      },
    },
  })
  create(
    @TenantContext() context: TenantContextType | undefined,
    @Body() body: CreateAreaDto,
  ) {
    return this.service.create(context, body);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiParam({ name: 'id', example: areaExample.id })
  @ApiBody({
    type: UpdateAreaDto,
    examples: {
      update: { value: { name: 'Khu VIP', sortOrder: 30 } },
    },
  })
  @ApiResponse({
    status: 200,
    schema: { example: { ...areaExample, name: 'Khu VIP', sortOrder: 30 } },
  })
  @ApiResponse({
    status: 404,
    description: 'Area not found Problem Details',
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate area name Problem Details',
    schema: {
      example: {
        type: 'https://pos.example/errors/area-name-conflict',
        title: 'Tên khu vực đã tồn tại',
        status: 409,
        detail: 'Tên khu vực phải duy nhất trong store.',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — cashier cannot mutate areas',
  })
  update(
    @TenantContext() context: TenantContextType | undefined,
    @Param('id') id: string,
    @Body() body: UpdateAreaDto,
  ) {
    return this.service.update(context, id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', example: areaExample.id })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({
    status: 409,
    description: 'Area has tables or duplicate name Problem Details',
    schema: {
      examples: {
        areaHasTables: {
          value: {
            type: 'https://pos.example/errors/area-has-tables',
            title: 'Khu vực đang chứa bàn',
            status: 409,
            detail: 'Khu vực đang chứa 3 bàn; hãy chuyển hoặc xóa bàn trước.',
            tableCount: 3,
            instance: '/api/v1/areas/018f...',
            traceId: '01HZX9...',
          },
        },
        areaNameConflict: {
          value: {
            type: 'https://pos.example/errors/area-name-conflict',
            title: 'Tên khu vực đã tồn tại',
            status: 409,
            detail: 'Tên khu vực phải duy nhất trong store.',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Area not found Problem Details',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — cashier cannot mutate areas',
  })
  async delete(
    @TenantContext() context: TenantContextType | undefined,
    @Param('id') id: string,
  ) {
    await this.service.delete(context, id);
  }
}
