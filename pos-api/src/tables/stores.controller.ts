import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import type { TenantContext as TenantContextType } from '../common/decorators/tenant-context.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StoresService } from './stores.service';

const currentStoreExample = {
  id: '018f0000-0000-7000-8000-000000000101',
  name: 'Cafe Demo',
  code: 'DEMO',
  tableMode: true,
  createdAt: '2026-05-25T08:00:00.000Z',
  updatedAt: '2026-05-25T08:00:00.000Z',
};

@ApiTags('stores')
@ApiBearerAuth()
@Controller('stores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StoresController {
  constructor(private readonly service: StoresService) {}

  @Get('me')
  @Roles('cashier', 'admin')
  @ApiResponse({ status: 200, schema: { example: currentStoreExample } })
  getMe(@TenantContext() context: TenantContextType | undefined) {
    return this.service.getCurrentStore(context);
  }
}
