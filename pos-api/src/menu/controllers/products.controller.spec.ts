import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { CreateProductDto } from '../dto/create-product.dto';
import { ListProductsQueryDto } from '../dto/list-products-query.dto';
import { ToggleProductActiveDto } from '../dto/toggle-product-active.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductsController } from './products.controller';

const uuid1 = '018f0000-0000-7000-8000-000000000001';
const uuid2 = '018f0000-0000-7000-8000-000000000002';

describe('ProductsController', () => {
  const service = {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    toggleActive: jest.fn(),
    delete: jest.fn(),
  };
  const controller = new ProductsController(service as never);
  const reflector = new Reflector();

  it('allows cashier/admin list and admin-only mutations', () => {
    expect(
      reflector.get(
        ROLES_KEY,
        Reflect.get(ProductsController.prototype, 'list'),
      ),
    ).toEqual(['cashier', 'admin']);
    for (const method of [
      'create',
      'update',
      'toggleActive',
      'delete',
    ] as const) {
      expect(
        reflector.get(
          ROLES_KEY,
          Reflect.get(ProductsController.prototype, method),
        ),
      ).toEqual(['admin']);
    }
  });

  it('delegates CRUD methods', async () => {
    const ctx = { tenantId: 't1', storeId: 's1' };
    const dto = {
      name: 'Bạc xỉu',
      categoryId: uuid1,
      priceVnd: 35000,
      sortOrder: 10,
      optionGroupIds: [uuid2],
    };
    await controller.list(ctx, { search: 'bạc' });
    await controller.create(ctx, dto);
    await controller.update(ctx, 'p1', { priceVnd: 36000 });
    await controller.toggleActive(ctx, 'p1', { isActive: false });
    await controller.delete(ctx, 'p1');
    expect(service.list).toHaveBeenCalledWith(ctx, { search: 'bạc' });
    expect(service.create).toHaveBeenCalledWith(ctx, dto);
    expect(service.update).toHaveBeenCalledWith(ctx, 'p1', { priceVnd: 36000 });
    expect(service.toggleActive).toHaveBeenCalledWith(ctx, 'p1', {
      isActive: false,
    });
    expect(service.delete).toHaveBeenCalledWith(ctx, 'p1');
  });
});

describe('Products DTO validation', () => {
  it('validates create payload and rejects duplicates/invalid primitives', async () => {
    const valid = plainToInstance(CreateProductDto, {
      name: 'Bạc xỉu',
      categoryId: uuid1,
      priceVnd: 35000,
      isActive: true,
      sortOrder: 10,
      optionGroupIds: [uuid2],
    });
    expect(await validate(valid)).toHaveLength(0);

    const invalid = plainToInstance(CreateProductDto, {
      name: '',
      categoryId: 'bad',
      priceVnd: -1,
      sortOrder: 1.5,
      optionGroupIds: [uuid2, uuid2],
    });
    const errors = await validate(invalid);
    expect(errors.map((e) => e.property)).toEqual(
      expect.arrayContaining([
        'name',
        'categoryId',
        'priceVnd',
        'sortOrder',
        'optionGroupIds',
      ]),
    );
  });

  it('validates query filters and toggle contract', async () => {
    const query = plainToInstance(ListProductsQueryDto, {
      categoryId: uuid1,
      search: 'bạc',
      isActive: 'false',
    });
    expect(query.isActive).toBe(false);
    expect(await validate(query)).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(ListProductsQueryDto, { isActive: 'maybe' }),
      ),
    ).not.toHaveLength(0);
    expect(
      await validate(
        plainToInstance(ToggleProductActiveDto, { isActive: false }),
      ),
    ).toHaveLength(0);
  });

  it('allows partial update with empty option groups to unassign all', async () => {
    const dto = plainToInstance(UpdateProductDto, { optionGroupIds: [] });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
