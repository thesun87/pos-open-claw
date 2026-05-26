import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import type { TenantContext as TenantContextType } from '../common/decorators/tenant-context.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateCurrentStoreDto } from './dto/update-current-store.dto';
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

  @Patch('me')
  @Roles('admin')
  @ApiBody({
    type: UpdateCurrentStoreDto,
    examples: { update: { value: { tableMode: true } } },
  })
  @ApiResponse({ status: 200, schema: { example: currentStoreExample } })
  @ApiResponse({ status: 400, description: 'Validation Problem Details' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Store not found Problem Details' })
  updateMe(
    @TenantContext() context: TenantContextType | undefined,
    @Body() body: UpdateCurrentStoreDto,
  ) {
    return this.service.updateCurrentStoreTableMode(context, body.tableMode);
  }
}
