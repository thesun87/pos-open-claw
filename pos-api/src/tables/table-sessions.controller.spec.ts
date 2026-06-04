import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { TableSessionsController } from './table-sessions.controller';
import { OpenSessionDto } from './dto/open-session.dto';
import { ListSessionsQueryDto } from './dto/list-sessions-query.dto';

const context = { tenantId: 't1', storeId: 's1', role: 'cashier' as const };

const session = {
  id: 'session-1',
  tableId: 'table-1',
  tenantId: 't1',
  storeId: 's1',
  status: 'open' as const,
  openedByDevice: 'device-001',
  openedAt: new Date('2026-06-04T08:00:00Z'),
  clientSessionId: 'client-session-1',
  createdAt: new Date('2026-06-04T08:00:00Z'),
  updatedAt: new Date('2026-06-04T08:00:00Z'),
};

describe('TableSessionsController', () => {
  const service = {
    openSession: jest.fn(),
    listOpenSessions: jest.fn(),
    settleSession: jest.fn(),
  };
  const controller = new TableSessionsController(service as never);
  const reflector = new Reflector();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('openSession', () => {
    it('returns 201 with idempotent_replay=false for new session', async () => {
      const newSession = { ...session, idempotent_replay: false };
      service.openSession.mockResolvedValue(newSession);
      const mockRes = { status: jest.fn() };
      const result = await controller.openSession(
        context,
        'table-1',
        { clientSessionId: 'client-session-1', deviceId: 'device-001' },
        mockRes as never,
      );
      expect(result.idempotent_replay).toBe(false);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('sets response status to 200 for idempotent replay', async () => {
      service.openSession.mockResolvedValue({
        ...session,
        idempotent_replay: true,
      });
      const mockRes = { status: jest.fn() };
      const result = await controller.openSession(
        context,
        'table-1',
        { clientSessionId: 'client-session-1', deviceId: 'device-001' },
        mockRes as never,
      );
      expect(result.idempotent_replay).toBe(true);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('passes tableId and dto to service', async () => {
      service.openSession.mockResolvedValue({
        ...session,
        idempotent_replay: false,
      });
      const mockRes = { status: jest.fn() };
      const dto = {
        clientSessionId: 'client-session-1',
        deviceId: 'device-001',
      };
      await controller.openSession(context, 'table-1', dto, mockRes as never);
      expect(service.openSession).toHaveBeenCalledWith(context, 'table-1', dto);
    });

    it('has cashier/admin roles', () => {
      expect(
        reflector.get(
          ROLES_KEY,
          Reflect.get(TableSessionsController.prototype, 'openSession'),
        ),
      ).toEqual(['cashier', 'admin']);
    });
  });

  describe('listSessions', () => {
    it('returns list from service', async () => {
      service.listOpenSessions.mockResolvedValue([session]);
      const result = await controller.listSessions(context, {});
      expect(result).toEqual([session]);
      expect(service.listOpenSessions).toHaveBeenCalledWith(context, undefined);
    });

    it('passes status query param to service', async () => {
      service.listOpenSessions.mockResolvedValue([]);
      await controller.listSessions(context, { status: 'open' });
      expect(service.listOpenSessions).toHaveBeenCalledWith(context, 'open');
    });

    it('has cashier/admin roles', () => {
      expect(
        reflector.get(
          ROLES_KEY,
          Reflect.get(TableSessionsController.prototype, 'listSessions'),
        ),
      ).toEqual(['cashier', 'admin']);
    });
  });

  describe('settleSession', () => {
    it('returns settled session', async () => {
      const settled = { ...session, status: 'settled' as const };
      service.settleSession.mockResolvedValue(settled);
      const result = await controller.settleSession(context, 'session-1');
      expect(result.status).toBe('settled');
      expect(service.settleSession).toHaveBeenCalledWith(context, 'session-1');
    });

    it('has cashier/admin roles', () => {
      expect(
        reflector.get(
          ROLES_KEY,
          Reflect.get(TableSessionsController.prototype, 'settleSession'),
        ),
      ).toEqual(['cashier', 'admin']);
    });
  });

  describe('DTO validation', () => {
    it('OpenSessionDto rejects missing required fields', async () => {
      const dto = plainToInstance(OpenSessionDto, {});
      const errors = await validate(dto);
      const props = errors.map((e) => e.property);
      expect(props).toContain('clientSessionId');
      expect(props).toContain('deviceId');
    });

    it('OpenSessionDto rejects non-UUID clientSessionId', async () => {
      const dto = plainToInstance(OpenSessionDto, {
        clientSessionId: 'not-a-uuid',
        deviceId: 'device-001',
      });
      const errors = await validate(dto);
      expect(
        errors.find((e) => e.property === 'clientSessionId')?.constraints,
      ).toHaveProperty('isUuid');
    });

    it('OpenSessionDto accepts valid DTO with optional openedAt', async () => {
      const dto = plainToInstance(OpenSessionDto, {
        clientSessionId: '018f0000-0000-7000-8000-000000000001',
        deviceId: 'device-001',
        openedAt: '2026-06-04T08:00:00.000Z',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('OpenSessionDto rejects invalid ISO8601 openedAt', async () => {
      const dto = plainToInstance(OpenSessionDto, {
        clientSessionId: '018f0000-0000-7000-8000-000000000001',
        deviceId: 'device-001',
        openedAt: 'not-a-date',
      });
      const errors = await validate(dto);
      expect(
        errors.find((e) => e.property === 'openedAt')?.constraints,
      ).toHaveProperty('isIso8601');
    });

    it('ListSessionsQueryDto accepts undefined status', async () => {
      const dto = plainToInstance(ListSessionsQueryDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
