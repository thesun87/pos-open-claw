import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { AreasController } from './areas.controller';

describe('AreasController', () => {
  const service = {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const controller = new AreasController(service as never);
  const reflector = new Reflector();

  it('delegates list with tenant context', async () => {
    const ctx = { tenantId: 't1', storeId: 's1' };
    service.list.mockResolvedValue([]);
    await controller.list(ctx);
    expect(service.list).toHaveBeenCalledWith(ctx);
  });

  it('has cashier/admin roles for GET list', () => {
    expect(
      reflector.get(ROLES_KEY, Reflect.get(AreasController.prototype, 'list')),
    ).toEqual(['cashier', 'admin']);
  });

  it('has admin-only roles for POST/PATCH/DELETE mutations', () => {
    expect(
      reflector.get(
        ROLES_KEY,
        Reflect.get(AreasController.prototype, 'create'),
      ),
    ).toEqual(['admin']);
    expect(
      reflector.get(
        ROLES_KEY,
        Reflect.get(AreasController.prototype, 'update'),
      ),
    ).toEqual(['admin']);
    expect(
      reflector.get(
        ROLES_KEY,
        Reflect.get(AreasController.prototype, 'delete'),
      ),
    ).toEqual(['admin']);
  });

  it('rejects invalid name (empty) and sortOrder (negative) through DTO validation', async () => {
    const createDto = plainToInstance(CreateAreaDto, {
      name: '',
      sortOrder: -1,
    });
    const errors = await validate(createDto);
    const nameError = errors.find((e) => e.property === 'name');
    const sortOrderError = errors.find((e) => e.property === 'sortOrder');
    expect(nameError?.constraints).toHaveProperty('minLength');
    expect(sortOrderError?.constraints).toHaveProperty('min');
  });

  it('rejects non-boolean isActive values through DTO validation', async () => {
    const createDto = plainToInstance(CreateAreaDto, {
      name: 'A',
      isActive: 'yes',
    });
    const updateDto = plainToInstance(UpdateAreaDto, { isActive: 'yes' });

    const [createError] = await validate(createDto);
    const [updateError] = await validate(updateDto);

    expect(createError?.property).toBe('isActive');
    expect(createError?.constraints).toHaveProperty('isBoolean');
    expect(updateError?.property).toBe('isActive');
    expect(updateError?.constraints).toHaveProperty('isBoolean');
  });

  it('delegates create/update/delete with context', async () => {
    const ctx = { tenantId: 't1', storeId: 's1' };
    service.create.mockResolvedValue({});
    service.update.mockResolvedValue({});
    service.delete.mockResolvedValue(undefined);
    await controller.create(ctx, { name: 'A' });
    await controller.update(ctx, 'a1', { name: 'B' });
    await controller.delete(ctx, 'a1');
    expect(service.create).toHaveBeenCalledWith(ctx, { name: 'A' });
    expect(service.update).toHaveBeenCalledWith(ctx, 'a1', { name: 'B' });
    expect(service.delete).toHaveBeenCalledWith(ctx, 'a1');
  });
});
