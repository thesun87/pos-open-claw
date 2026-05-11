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

@Injectable()
export class MenuService {
  constructor(private readonly repository: MenuRepository) {}

  async getMenuSnapshot(context: TenantContext): Promise<MenuSnapshotDto> {
    const [menuVersion, categories, products, optionGroups] = await Promise.all(
      [
        this.repository.findCurrentMenuVersion(context),
        this.repository.findCategories(context),
        this.repository.findProducts(context),
        this.repository.findOptionGroups(context),
      ],
    );

    return {
      menuVersion,
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
