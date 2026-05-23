export interface MenuCategoryDto {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface MenuProductDto {
  id: string
  name: string
  categoryId: string
  priceVnd: number
  imageUrl?: string | null
  isActive: boolean
  sortOrder: number
  optionGroupIds: string[]
}

export interface MenuOptionDto {
  id: string
  label: string
  priceDeltaVnd: number
  isDefault: boolean
  sortOrder: number
}

export interface MenuOptionGroupDto {
  id: string
  name: string
  isRequired: boolean
  minSelect: number
  maxSelect: number
  sortOrder: number
  options: MenuOptionDto[]
}

export interface MenuSnapshotDto {
  menuVersion: number
  categories: MenuCategoryDto[]
  products: MenuProductDto[]
  optionGroups: MenuOptionGroupDto[]
}
