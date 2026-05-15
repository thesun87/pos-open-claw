import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { CreateOptionGroupDto } from '../dto/create-option-group.dto';
import { OptionGroupsController } from './option-groups.controller';

describe('OptionGroupsController', () => {
  const service = {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const controller = new OptionGroupsController(service as never);
  const reflector = new Reflector();
  it('allows cashier/admin list and admin-only mutations', () => {
    expect(
      reflector.get(
        ROLES_KEY,
        Reflect.get(OptionGroupsController.prototype, 'list'),
      ),
    ).toEqual(['cashier', 'admin']);
    expect(
      reflector.get(
        ROLES_KEY,
        Reflect.get(OptionGroupsController.prototype, 'create'),
      ),
    ).toEqual(['admin']);
    expect(
      reflector.get(
        ROLES_KEY,
        Reflect.get(OptionGroupsController.prototype, 'update'),
      ),
    ).toEqual(['admin']);
    expect(
      reflector.get(
        ROLES_KEY,
        Reflect.get(OptionGroupsController.prototype, 'delete'),
      ),
    ).toEqual(['admin']);
  });
  it('delegates CRUD methods', async () => {
    const ctx = { tenantId: 't1', storeId: 's1' };
    const dto = {
      name: 'Size',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      sortOrder: 0,
      options: [
        { label: 'M', priceDeltaVnd: 0, isDefault: true, sortOrder: 0 },
      ],
    };
    await controller.list(ctx);
    await controller.create(ctx, dto);
    await controller.update(ctx, 'g1', dto);
    await controller.delete(ctx, 'g1');
    expect(service.list).toHaveBeenCalledWith(ctx);
    expect(service.create).toHaveBeenCalledWith(ctx, dto);
    expect(service.update).toHaveBeenCalledWith(ctx, 'g1', dto);
    expect(service.delete).toHaveBeenCalledWith(ctx, 'g1');
  });
  const invalids = [
    [
      'minSelect > maxSelect',
      {
        name: 'A',
        isRequired: false,
        minSelect: 2,
        maxSelect: 1,
        sortOrder: 0,
        options: [{ label: 'x', priceDeltaVnd: 0, sortOrder: 0 }],
      },
    ],
    [
      'required min rule',
      {
        name: 'A',
        isRequired: true,
        minSelect: 0,
        maxSelect: 1,
        sortOrder: 0,
        options: [{ label: 'x', priceDeltaVnd: 0, sortOrder: 0 }],
      },
    ],
    [
      'empty options',
      {
        name: 'A',
        isRequired: false,
        minSelect: 0,
        maxSelect: 1,
        sortOrder: 0,
        options: [],
      },
    ],
    [
      'two defaults for single select',
      {
        name: 'A',
        isRequired: false,
        minSelect: 0,
        maxSelect: 1,
        sortOrder: 0,
        options: [
          { label: 'x', priceDeltaVnd: 0, isDefault: true, sortOrder: 0 },
          { label: 'y', priceDeltaVnd: -1000, isDefault: true, sortOrder: 1 },
        ],
      },
    ],
    [
      'non-integer price delta',
      {
        name: 'A',
        isRequired: false,
        minSelect: 0,
        maxSelect: 1,
        sortOrder: 0,
        options: [{ label: 'x', priceDeltaVnd: 1.5, sortOrder: 0 }],
      },
    ],
  ] as const;
  it.each(invalids)('rejects %s', async (_, payload) => {
    const dto = plainToInstance(CreateOptionGroupDto, payload);
    expect(await validate(dto)).not.toHaveLength(0);
  });
  it('accepts negative integer priceDeltaVnd', async () => {
    const dto = plainToInstance(CreateOptionGroupDto, {
      name: 'Discount',
      isRequired: false,
      minSelect: 0,
      maxSelect: 2,
      sortOrder: 0,
      options: [{ label: 'Less', priceDeltaVnd: -1000, sortOrder: 0 }],
    });
    expect(await validate(dto)).toHaveLength(0);
  });
});
