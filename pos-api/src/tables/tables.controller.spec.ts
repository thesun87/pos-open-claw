import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { CreateTableDto } from './dto/create-table.dto';
import { ListTablesQueryDto } from './dto/list-tables-query.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { TablesController } from './tables.controller';

describe('TablesController', () => {
  const service = {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const controller = new TablesController(service as never);
  const reflector = new Reflector();

  it('delegates list/create/update/delete with context', async () => {
    const ctx = { tenantId: 't1', storeId: 's1' };
    service.list.mockResolvedValue([]);
    service.create.mockResolvedValue({});
    service.update.mockResolvedValue({});
    service.delete.mockResolvedValue(undefined);
    await controller.list(ctx, {
      areaId: '018f0000-0000-7000-8000-0000000000a1',
    });
    await controller.create(ctx, {
      name: 'Bàn 01',
      areaId: '018f0000-0000-7000-8000-0000000000a1',
    });
    await controller.update(ctx, 'tbl1', { capacity: 4 });
    await controller.delete(ctx, 'tbl1');
    expect(service.list).toHaveBeenCalledWith(ctx, {
      areaId: '018f0000-0000-7000-8000-0000000000a1',
    });
    expect(service.create).toHaveBeenCalledWith(ctx, {
      name: 'Bàn 01',
      areaId: '018f0000-0000-7000-8000-0000000000a1',
    });
    expect(service.update).toHaveBeenCalledWith(ctx, 'tbl1', { capacity: 4 });
    expect(service.delete).toHaveBeenCalledWith(ctx, 'tbl1');
  });

  it('has cashier/admin roles for GET list', () => {
    expect(
      reflector.get(ROLES_KEY, Reflect.get(TablesController.prototype, 'list')),
    ).toEqual(['cashier', 'admin']);
  });

  it('has admin-only roles for POST/PATCH/DELETE mutations', () => {
    expect(
      reflector.get(
        ROLES_KEY,
        Reflect.get(TablesController.prototype, 'create'),
      ),
    ).toEqual(['admin']);
    expect(
      reflector.get(
        ROLES_KEY,
        Reflect.get(TablesController.prototype, 'update'),
      ),
    ).toEqual(['admin']);
    expect(
      reflector.get(
        ROLES_KEY,
        Reflect.get(TablesController.prototype, 'delete'),
      ),
    ).toEqual(['admin']);
  });

  it('validates create DTO constraints', async () => {
    const dto = plainToInstance(CreateTableDto, {
      name: '',
      areaId: 'bad',
      capacity: 0,
      sortOrder: -1,
      isActive: 'yes',
    });
    const errors = await validate(dto);
    expect(
      errors.find((e) => e.property === 'name')?.constraints,
    ).toHaveProperty('minLength');
    expect(
      errors.find((e) => e.property === 'areaId')?.constraints,
    ).toHaveProperty('isUuid');
    expect(
      errors.find((e) => e.property === 'capacity')?.constraints,
    ).toHaveProperty('min');
    expect(
      errors.find((e) => e.property === 'sortOrder')?.constraints,
    ).toHaveProperty('min');
    expect(
      errors.find((e) => e.property === 'isActive')?.constraints,
    ).toHaveProperty('isBoolean');
  });

  it('validates update DTO and query areaId', async () => {
    const updateDto = plainToInstance(UpdateTableDto, {
      areaId: 'bad',
      capacity: 0,
      sortOrder: -1,
      isActive: 'yes',
    });
    const queryDto = plainToInstance(ListTablesQueryDto, { areaId: 'bad' });
    const updateErrors = await validate(updateDto);
    const queryErrors = await validate(queryDto);
    expect(
      updateErrors.find((e) => e.property === 'areaId')?.constraints,
    ).toHaveProperty('isUuid');
    expect(
      updateErrors.find((e) => e.property === 'capacity')?.constraints,
    ).toHaveProperty('min');
    expect(
      updateErrors.find((e) => e.property === 'sortOrder')?.constraints,
    ).toHaveProperty('min');
    expect(
      updateErrors.find((e) => e.property === 'isActive')?.constraints,
    ).toHaveProperty('isBoolean');
    expect(
      queryErrors.find((e) => e.property === 'areaId')?.constraints,
    ).toHaveProperty('isUuid');
  });
});
