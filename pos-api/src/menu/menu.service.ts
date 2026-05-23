import { Injectable } from '@nestjs/common';
import { TenantContext } from '../common/decorators/tenant-context.decorator';
import { MenuRepository } from './repositories/menu.repository';

export interface MenuCategoryDto {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MenuProductDto {
  id: string;
  name: string;
  categoryId: string;
  priceVnd: number;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  optionGroupIds: string[];
}

export interface MenuOptionDto {
  id: string;
  label: string;
  priceDeltaVnd: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface MenuOptionGroupDto {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  options: MenuOptionDto[];
}

export interface MenuSnapshotDto {
  menuVersion: number;
  categories: MenuCategoryDto[];
  products: MenuProductDto[];
  optionGroups: MenuOptionGroupDto[];
}

export interface MenuSnapshotPayloadDto {
  categories: MenuCategoryDto[];
  products: MenuProductDto[];
  optionGroups: MenuOptionGroupDto[];
}

export type VersionedMenuSyncDto =
  | { menuVersion: number; hasChanges: false; snapshot: null }
  | { menuVersion: number; hasChanges: true; snapshot: MenuSnapshotPayloadDto };

export interface GetVersionedMenuQuery {
  since_version?: number;
  include_inactive?: boolean;
}

@Injectable()
export class MenuService {
  constructor(private readonly repository: MenuRepository) {}

  async getVersionedMenu(
    context: TenantContext,
    query: GetVersionedMenuQuery = {},
  ): Promise<VersionedMenuSyncDto> {
    const menuVersion = await this.repository.findCurrentMenuVersion(context);

    if (query.since_version === menuVersion) {
      return { menuVersion, hasChanges: false, snapshot: null };
    }

    const includeInactive =
      context.role === 'admin' && query.include_inactive === true;
    const snapshot = await this.getMenuSnapshotPayload(context, {
      includeInactive,
    });

    return { menuVersion, hasChanges: true, snapshot };
  }

  async getMenuSnapshot(context: TenantContext): Promise<MenuSnapshotDto> {
    const menuVersion = await this.repository.findCurrentMenuVersion(context);
    const snapshot = await this.getMenuSnapshotPayload(context);

    return { menuVersion, ...snapshot };
  }

  private async getMenuSnapshotPayload(
    context: TenantContext,
    options: { includeInactive?: boolean } = {},
  ): Promise<MenuSnapshotPayloadDto> {
    const [categories, products, optionGroups] = await Promise.all([
      this.repository.findCategories(context, options),
      this.repository.findProducts(context, options),
      this.repository.findOptionGroups(context, options),
    ]);

    return {
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      })),
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        categoryId: product.categoryId,
        priceVnd: product.priceVnd,
        imageUrl: product.imageUrl,
        isActive: product.isActive,
        sortOrder: product.sortOrder,
        optionGroupIds: product.productOptionGroups.map(
          (item) => item.optionGroupId,
        ),
      })),
      optionGroups: optionGroups.map((group) => ({
        id: group.id,
        name: group.name,
        isRequired: group.isRequired,
        minSelect: group.minSelect,
        maxSelect: group.maxSelect,
        sortOrder: group.sortOrder,
        options: group.options.map((option) => ({
          id: option.id,
          label: option.name,
          priceDeltaVnd: option.priceDeltaVnd,
          isDefault: option.isDefault,
          sortOrder: option.sortOrder,
        })),
      })),
    };
  }
}
