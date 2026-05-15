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
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoriesService } from '../services/categories.service';

const categoryExample = {
  id: '018f0000-0000-7000-8000-000000000001',
  name: 'Cà phê',
  sortOrder: 10,
  isActive: true,
  createdAt: '2026-05-15T14:00:00.000Z',
  updatedAt: '2026-05-15T14:00:00.000Z',
};

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @Roles('cashier', 'admin')
  @ApiResponse({ status: 200, schema: { example: [categoryExample] } })
  list(@TenantContext() context: TenantContextType | undefined) {
    return this.service.list(context);
  }

  @Post()
  @Roles('admin')
  @ApiBody({
    type: CreateCategoryDto,
    examples: { create: { value: { name: 'Trà', sortOrder: 20 } } },
  })
  @ApiResponse({ status: 201, schema: { example: categoryExample } })
  @ApiResponse({
    status: 409,
    description: 'Duplicate category name Problem Details',
  })
  create(
    @TenantContext() context: TenantContextType | undefined,
    @Body() body: CreateCategoryDto,
  ) {
    return this.service.create(context, body);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiParam({ name: 'id', example: categoryExample.id })
  @ApiBody({
    type: UpdateCategoryDto,
    examples: { update: { value: { name: 'Trà sữa', sortOrder: 30 } } },
  })
  @ApiResponse({
    status: 200,
    schema: { example: { ...categoryExample, name: 'Trà sữa', sortOrder: 30 } },
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found Problem Details',
  })
  update(
    @TenantContext() context: TenantContextType | undefined,
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.service.update(context, id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', example: categoryExample.id })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({
    status: 409,
    description: 'Category has products Problem Details',
    schema: {
      example: {
        type: 'https://pos.example/errors/category-has-products',
        title: 'Danh mục đang chứa sản phẩm',
        status: 409,
        detail:
          'Danh mục đang chứa 2 sản phẩm; hãy chuyển hoặc xóa sản phẩm trước.',
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
