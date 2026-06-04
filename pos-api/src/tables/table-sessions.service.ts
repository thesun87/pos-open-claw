import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { PROBLEM_TYPES } from '../common/errors/problem-types';
import { PrismaService } from '../prisma/prisma.service';
import { OpenSessionDto } from './dto/open-session.dto';
import {
  TableSessionRecord,
  TableSessionsRepository,
} from './table-sessions.repository';

export interface OpenSessionResponse extends TableSessionRecord {
  idempotent_replay: boolean;
}

function isP2002(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class TableSessionsService {
  constructor(
    private readonly repo: TableSessionsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async openSession(
    context: TenantContext | undefined,
    tableId: string,
    dto: OpenSessionDto,
  ): Promise<OpenSessionResponse> {
    this.ensureContext(context);

    // Replay-wins: check idempotency before attempting create
    const existing = await this.repo.findByClientSessionId(
      context,
      dto.clientSessionId,
    );
    if (existing) {
      return { ...existing, idempotent_replay: true };
    }

    // Validate table belongs to this store (tenant-scoped findFirst will enforce)
    const table = await this.repo.tableExists(context, tableId);
    if (!table) {
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Bad Request',
        detail: 'Table không thuộc store',
      });
    }

    try {
      const createDto: {
        tableId: string;
        clientSessionId: string;
        deviceId: string;
        openedAt?: Date;
      } = {
        tableId,
        clientSessionId: dto.clientSessionId,
        deviceId: dto.deviceId,
      };
      if (dto.openedAt) {
        createDto.openedAt = new Date(dto.openedAt);
      }
      const session = await this.prisma.$transaction(async (tx) => {
        return this.repo.create(context, createDto, tx);
      });
      return { ...session, idempotent_replay: false };
    } catch (error) {
      if (isP2002(error)) {
        // Race: another request created same clientSessionId — re-fetch and return
        const replay = await this.repo.findByClientSessionId(
          context,
          dto.clientSessionId,
        );
        if (replay) return { ...replay, idempotent_replay: true };
      }
      throw error;
    }
  }

  async listOpenSessions(
    context: TenantContext | undefined,
    status?: string,
  ): Promise<TableSessionRecord[]> {
    this.ensureContext(context);
    return this.repo.listOpen(context, status ?? 'open');
  }

  async settleSession(
    context: TenantContext | undefined,
    id: string,
  ): Promise<TableSessionRecord> {
    this.ensureContext(context);

    const session = await this.repo.findById(context, id);
    if (!session) {
      throw new NotFoundException({
        type: PROBLEM_TYPES.notFound,
        title: 'Not Found',
        detail: 'Session not found',
      });
    }

    // Idempotent settle: already settled → return as-is
    if (session.status === 'settled') {
      return session;
    }

    const settled = await this.repo.settle(context, id);
    if (!settled) {
      throw new NotFoundException({
        type: PROBLEM_TYPES.notFound,
        title: 'Not Found',
        detail: 'Session not found',
      });
    }
    return settled;
  }

  private ensureContext(
    context: TenantContext | undefined,
  ): asserts context is TenantContext {
    if (!context?.tenantId || !context.storeId)
      throw new ForbiddenException({
        type: PROBLEM_TYPES.forbidden,
        title: 'Forbidden',
        detail: 'Missing tenant context',
      });
  }
}
