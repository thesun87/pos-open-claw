import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import {
  TenantContext,
  TenantContext as TenantContextDecorator,
} from '../common/decorators/tenant-context.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { MenuSyncQueryDto } from './dto/menu-sync-query.dto';
import { MenuService, VersionedMenuSyncDto } from './menu.service';

@Controller('menu')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('cashier', 'admin')
export class MenuSyncController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Pull versioned menu snapshot for POS sync',
    description:
      'Returns a minimal no-change payload when since_version matches the current menu version; otherwise returns a full menu snapshot. Admin can request inactive entities with include_inactive=true.',
  })
  @ApiQuery({
    name: 'since_version',
    required: false,
    type: Number,
    minimum: 0,
  })
  @ApiQuery({ name: 'include_inactive', required: false, type: Boolean })
  @ApiOkResponse({
    description: 'Versioned menu sync response',
    schema: {
      oneOf: [
        {
          example: { menuVersion: 4, hasChanges: false, snapshot: null },
        },
        {
          example: {
            menuVersion: 5,
            hasChanges: true,
            snapshot: {
              categories: [
                {
                  id: '018f0000-0000-7000-8000-000000000010',
                  name: 'Coffee',
                  sortOrder: 10,
                  isActive: true,
                },
              ],
              products: [
                {
                  id: '018f0000-0000-7000-8000-000000000020',
                  name: 'Latte',
                  categoryId: '018f0000-0000-7000-8000-000000000010',
                  priceVnd: 45000,
                  isActive: true,
                  sortOrder: 10,
                  optionGroupIds: ['018f0000-0000-7000-8000-000000000030'],
                },
              ],
              optionGroups: [
                {
                  id: '018f0000-0000-7000-8000-000000000030',
                  name: 'Size',
                  isRequired: true,
                  minSelect: 1,
                  maxSelect: 1,
                  sortOrder: 10,
                  options: [
                    {
                      id: '018f0000-0000-7000-8000-000000000040',
                      label: 'Large',
                      priceDeltaVnd: 10000,
                      isDefault: false,
                      sortOrder: 20,
                    },
                  ],
                },
              ],
            },
          },
        },
        {
          example: {
            menuVersion: 3,
            hasChanges: true,
            snapshot: { categories: [], products: [], optionGroups: [] },
            description:
              'Stale/recovery response when client sends a version newer than server.',
          },
        },
      ],
    },
  })
  async getMenu(
    @TenantContextDecorator() context: TenantContext | undefined,
    @Query() query: MenuSyncQueryDto,
  ): Promise<VersionedMenuSyncDto> {
    if (!context?.tenantId || !context.storeId)
      throw new ForbiddenException('Missing tenant context');
    return this.menuService.getVersionedMenu(context, query);
  }
}
