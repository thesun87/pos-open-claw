import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TableSessionsService } from './table-sessions.service';

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

const openDto = {
  clientSessionId: 'client-session-1',
  deviceId: 'device-001',
};

describe('TableSessionsService', () => {
  const setup = () => {
    const repo = {
      findByClientSessionId: jest.fn().mockResolvedValue(null),
      tableExists: jest.fn().mockResolvedValue({ id: 'table-1' }),
      create: jest.fn().mockResolvedValue(session),
      findById: jest.fn().mockResolvedValue(session),
      listOpen: jest.fn().mockResolvedValue([session]),
      settle: jest.fn().mockResolvedValue({ ...session, status: 'settled' }),
    };
    const prisma = {
      $transaction: jest.fn(<T>(fn: (tx: object) => Promise<T>) =>
        fn({ tx: true }),
      ),
    };
    return {
      service: new TableSessionsService(repo as never, prisma as never),
      repo,
      prisma,
    };
  };

  describe('openSession', () => {
    it('rejects missing tenant context', async () => {
      const { service } = setup();
      await expect(
        service.openSession(undefined, 'table-1', openDto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates new session and returns with idempotent_replay=false', async () => {
      const { service, repo } = setup();
      const result = await service.openSession(context, 'table-1', openDto);
      expect(result.idempotent_replay).toBe(false);
      expect(result.id).toBe('session-1');
      expect(repo.create).toHaveBeenCalledWith(
        context,
        expect.objectContaining({
          tableId: 'table-1',
          clientSessionId: 'client-session-1',
          deviceId: 'device-001',
        }),
        { tx: true },
      );
    });

    it('returns existing session with idempotent_replay=true when clientSessionId already exists (replay-wins)', async () => {
      const { service, repo } = setup();
      repo.findByClientSessionId.mockResolvedValue(session);
      const result = await service.openSession(context, 'table-1', openDto);
      expect(result.idempotent_replay).toBe(true);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('returns 400 when table does not belong to store', async () => {
      const { service, repo } = setup();
      repo.tableExists.mockResolvedValue(null);
      await expect(
        service.openSession(context, 'foreign-table', openDto),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.openSession(context, 'foreign-table', openDto),
      ).rejects.toHaveProperty('response.detail', 'Table không thuộc store');
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('handles P2002 race condition by re-fetching and returning replay', async () => {
      const { service, repo } = setup();
      // First lookup returns null (not yet created)
      repo.findByClientSessionId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(session);
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique failed', {
        code: 'P2002',
        clientVersion: 'test',
      });
      repo.create.mockRejectedValue(p2002);
      const result = await service.openSession(context, 'table-1', openDto);
      expect(result.idempotent_replay).toBe(true);
    });

    it('sets openedAt from DTO when provided', async () => {
      const { service, repo } = setup();
      const dtoWithTime = { ...openDto, openedAt: '2026-06-04T10:00:00.000Z' };
      await service.openSession(context, 'table-1', dtoWithTime);
      expect(repo.create).toHaveBeenCalledWith(
        context,
        expect.objectContaining({
          openedAt: new Date('2026-06-04T10:00:00.000Z'),
        }),
        { tx: true },
      );
    });
  });

  describe('listOpenSessions', () => {
    it('rejects missing context', async () => {
      const { service } = setup();
      await expect(service.listOpenSessions(undefined)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns open sessions for store', async () => {
      const { service, repo } = setup();
      const result = await service.listOpenSessions(context);
      expect(result).toEqual([session]);
      expect(repo.listOpen).toHaveBeenCalledWith(context, 'open');
    });

    it('passes status filter to repo', async () => {
      const { service, repo } = setup();
      await service.listOpenSessions(context, 'settled');
      expect(repo.listOpen).toHaveBeenCalledWith(context, 'settled');
    });
  });

  describe('settleSession', () => {
    it('rejects missing context', async () => {
      const { service } = setup();
      await expect(
        service.settleSession(undefined, 'session-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('settles open session and returns updated entity', async () => {
      const { service, repo } = setup();
      const settled = { ...session, status: 'settled' as const };
      repo.settle.mockResolvedValue(settled);
      const result = await service.settleSession(context, 'session-1');
      expect(result.status).toBe('settled');
    });

    it('idempotent settle: already settled session returns as-is without calling settle()', async () => {
      const { service, repo } = setup();
      repo.findById.mockResolvedValue({ ...session, status: 'settled' });
      const result = await service.settleSession(context, 'session-1');
      expect(result.status).toBe('settled');
      expect(repo.settle).not.toHaveBeenCalled();
    });

    it('returns 404 when session not found / cross-store', async () => {
      const { service, repo } = setup();
      repo.findById.mockResolvedValue(null);
      await expect(
        service.settleSession(context, 'non-existent'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns 404 when settle returns null (race condition or cross-store)', async () => {
      const { service, repo } = setup();
      repo.settle.mockResolvedValue(null);
      await expect(
        service.settleSession(context, 'session-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
