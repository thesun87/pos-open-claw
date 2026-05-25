import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { PROBLEM_TYPES } from '../common/errors/problem-types';
import { CurrentStoreRecord, StoresRepository } from './stores.repository';

export type CurrentStoreResponse = CurrentStoreRecord;

@Injectable()
export class StoresService {
  constructor(private readonly repo: StoresRepository) {}

  async getCurrentStore(
    context: TenantContext | undefined,
  ): Promise<CurrentStoreResponse> {
    if (!context?.tenantId || !context.storeId)
      throw new ForbiddenException({
        type: PROBLEM_TYPES.forbidden,
        title: 'Forbidden',
        detail: 'Missing tenant context',
      });
    const store = await this.repo.findCurrentStore(context);
    if (!store)
      throw new NotFoundException({
        type: PROBLEM_TYPES.notFound,
        title: 'Not Found',
        detail: 'Store not found',
      });
    return store;
  }
}
