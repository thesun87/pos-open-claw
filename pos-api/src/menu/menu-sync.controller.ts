import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import {
  TenantContext,
  TenantContext as TenantContextDecorator,
} from '../common/decorators/tenant-context.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { MenuSnapshotDto, MenuService } from './menu.service';

@Controller('menu')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('cashier', 'admin')
export class MenuSyncController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  async getMenu(
    @TenantContextDecorator() context: TenantContext | undefined,
  ): Promise<MenuSnapshotDto> {
    if (!context?.tenantId || !context.storeId)
      throw new ForbiddenException('Missing tenant context');
    return this.menuService.getMenuSnapshot(context);
  }
}
