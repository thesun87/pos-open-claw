/* eslint-disable @typescript-eslint/unbound-method */
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { Reflector } from '@nestjs/core';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: ReportsService;

  const mockReportsService = {
    getReports: jest
      .fn()
      .mockResolvedValue({ totals: { totalOrders: 0, totalRevenue: 0 } }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportsService, useValue: mockReportsService },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ReportsController);
    service = module.get(ReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('calls reportsService.getReports with context and query', async () => {
    const context = {
      tenantId: '018f0000-0000-7000-8000-000000000001',
      storeId: '018f0000-0000-7000-8000-000000000002',
    };
    const query = {
      from: '2026-05-01',
      to: '2026-05-07',
      metric: 'all' as const,
    };
    await controller.getReports(context, query);
    expect(service.getReports).toHaveBeenCalledWith(context, query);
  });

  it('throws ForbiddenException when context is missing tenantId', async () => {
    await expect(
      controller.getReports(undefined, {
        from: '2026-05-01',
        to: '2026-05-07',
        metric: 'all',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws ForbiddenException when context has no storeId', async () => {
    await expect(
      controller.getReports(
        { tenantId: '018f0000-0000-7000-8000-000000000001', storeId: '' },
        { from: '2026-05-01', to: '2026-05-07', metric: 'all' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('has @Roles("admin") metadata on getReports handler', () => {
    const reflector = new Reflector();
    const roles = reflector.get<string[]>(ROLES_KEY, controller.getReports);
    expect(roles).toContain('admin');
  });
});
