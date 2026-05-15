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
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantContext } from '../../common/decorators/tenant-context.decorator';
import type { TenantContext as TenantContextType } from '../../common/decorators/tenant-context.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateOptionGroupDto } from '../dto/create-option-group.dto';
import { UpdateOptionGroupDto } from '../dto/update-option-group.dto';
import { OptionGroupsService } from '../services/option-groups.service';
const optionGroupExample = {
  id: '018f0000-0000-7000-8000-000000000100',
  name: 'Size',
  isRequired: true,
  minSelect: 1,
  maxSelect: 1,
  sortOrder: 10,
  options: [
    {
      id: '018f0000-0000-7000-8000-000000000101',
      label: 'Size M',
      priceDeltaVnd: 0,
      isDefault: true,
      sortOrder: 10,
    },
    {
      id: '018f0000-0000-7000-8000-000000000102',
      label: 'Size L',
      priceDeltaVnd: 5000,
      isDefault: false,
      sortOrder: 20,
    },
  ],
};
@ApiTags('option-groups')
@ApiBearerAuth()
@Controller('option-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OptionGroupsController {
  constructor(private readonly service: OptionGroupsService) {}
  @Get()
  @Roles('cashier', 'admin')
  @ApiResponse({ status: 200, schema: { example: [optionGroupExample] } })
  list(@TenantContext() context: TenantContextType | undefined) {
    return this.service.list(context);
  }
  @Post()
  @Roles('admin')
  @ApiBody({
    type: CreateOptionGroupDto,
    examples: {
      size: {
        value: {
          name: 'Size',
          isRequired: true,
          minSelect: 1,
          maxSelect: 1,
          sortOrder: 10,
          options: [
            {
              label: 'Size M',
              priceDeltaVnd: 0,
              isDefault: true,
              sortOrder: 10,
            },
            { label: 'Size L', priceDeltaVnd: 5000, sortOrder: 20 },
          ],
        },
      },
      validationError: {
        value: {
          name: 'Size',
          isRequired: true,
          minSelect: 2,
          maxSelect: 1,
          sortOrder: 10,
          options: [],
        },
      },
    },
  })
  @ApiResponse({ status: 201, schema: { example: optionGroupExample } })
  create(
    @TenantContext() context: TenantContextType | undefined,
    @Body() body: CreateOptionGroupDto,
  ) {
    return this.service.create(context, body);
  }
  @Patch(':id')
  @Roles('admin')
  @ApiParam({ name: 'id', example: optionGroupExample.id })
  @ApiBody({
    type: UpdateOptionGroupDto,
    examples: {
      update: {
        value: {
          name: 'Đá',
          isRequired: false,
          minSelect: 0,
          maxSelect: 1,
          sortOrder: 20,
          options: [
            {
              id: '018f0000-0000-7000-8000-000000000101',
              label: 'Ít đá',
              priceDeltaVnd: 0,
              isDefault: true,
              sortOrder: 10,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 200, schema: { example: optionGroupExample } })
  update(
    @TenantContext() context: TenantContextType | undefined,
    @Param('id') id: string,
    @Body() body: UpdateOptionGroupDto,
  ) {
    return this.service.update(context, id, body);
  }
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({
    status: 409,
    description: 'Delete in use Problem Details',
    schema: {
      example: {
        type: 'https://pos.example/errors/option-group-in-use',
        title: 'Nhóm tùy chọn đang được dùng',
        status: 409,
        detail:
          'Nhóm tùy chọn đang được gán cho 2 sản phẩm; hãy gỡ liên kết trước khi xóa.',
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
