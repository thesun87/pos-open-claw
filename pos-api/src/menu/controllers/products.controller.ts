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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantContext } from '../../common/decorators/tenant-context.decorator';
import type { TenantContext as TenantContextType } from '../../common/decorators/tenant-context.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateProductDto } from '../dto/create-product.dto';
import { ListProductsQueryDto } from '../dto/list-products-query.dto';
import { ToggleProductActiveDto } from '../dto/toggle-product-active.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductImagesService } from '../services/product-images.service';
import { ProductsService } from '../services/products.service';

const productExample = {
  id: '018f0000-0000-7000-8000-000000000201',
  name: 'Bạc xỉu',
  categoryId: '018f0000-0000-7000-8000-000000000001',
  category: { id: '018f0000-0000-7000-8000-000000000001', name: 'Cà phê' },
  priceVnd: 35000,
  imageUrl:
    'https://res.cloudinary.com/demo/image/upload/v123/products/bac-xiu.jpg',
  isActive: true,
  sortOrder: 10,
  optionGroupIds: ['018f0000-0000-7000-8000-000000000101'],
  optionGroups: [
    {
      id: '018f0000-0000-7000-8000-000000000101',
      name: 'Size',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      sortOrder: 10,
    },
  ],
};

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(
    private readonly service: ProductsService,
    private readonly images: ProductImagesService,
  ) {}

  @Get()
  @Roles('cashier', 'admin')
  @ApiQuery({
    name: 'categoryId',
    required: false,
    example: productExample.categoryId,
  })
  @ApiQuery({ name: 'search', required: false, example: 'bạc' })
  @ApiQuery({ name: 'isActive', required: false, example: true })
  @ApiResponse({ status: 200, schema: { example: [productExample] } })
  list(
    @TenantContext() context: TenantContextType | undefined,
    @Query() query: ListProductsQueryDto,
  ) {
    return this.service.list(context, query);
  }

  @Post('images')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    description: 'Multipart form-data with image file field named `file`.',
  })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        imageUrl: productExample.imageUrl,
        publicId: 'pos/products/bac-xiu',
      },
    },
  })
  uploadImage(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.images.upload(file);
  }

  @Post()
  @Roles('admin')
  @ApiBody({
    type: CreateProductDto,
    examples: {
      createWithGroups: {
        value: {
          name: 'Bạc xỉu',
          categoryId: productExample.categoryId,
          priceVnd: 35000,
          isActive: true,
          sortOrder: 10,
          optionGroupIds: productExample.optionGroupIds,
        },
      },
    },
  })
  @ApiResponse({ status: 201, schema: { example: productExample } })
  create(
    @TenantContext() context: TenantContextType | undefined,
    @Body() body: CreateProductDto,
  ) {
    return this.service.create(context, body);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiParam({ name: 'id', example: productExample.id })
  @ApiBody({
    type: UpdateProductDto,
    examples: {
      assignGroups: {
        value: { optionGroupIds: productExample.optionGroupIds },
      },
    },
  })
  @ApiResponse({ status: 200, schema: { example: productExample } })
  update(
    @TenantContext() context: TenantContextType | undefined,
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
  ) {
    return this.service.update(context, id, body);
  }

  @Patch(':id/toggle-active')
  @Roles('admin')
  @ApiParam({ name: 'id', example: productExample.id })
  @ApiBody({
    type: ToggleProductActiveDto,
    examples: { temporarilyDisable: { value: { isActive: false } } },
    description: 'Tắt thay vì xóa nếu sẽ bán lại.',
  })
  @ApiResponse({
    status: 200,
    schema: { example: { ...productExample, isActive: false } },
  })
  toggleActive(
    @TenantContext() context: TenantContextType | undefined,
    @Param('id') id: string,
    @Body() body: ToggleProductActiveDto,
  ) {
    return this.service.toggleActive(context, id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', example: productExample.id })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({
    status: 409,
    description: 'Product in use Problem Details',
    schema: {
      example: {
        type: 'https://pos.example/errors/product-in-use',
        title: 'Sản phẩm đã có lịch sử bán hàng',
        status: 409,
        detail:
          'Sản phẩm đã xuất hiện trong 2 dòng đơn hàng; hãy “Tạm tắt” bằng isActive=false thay vì xóa nếu sẽ bán lại.',
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
