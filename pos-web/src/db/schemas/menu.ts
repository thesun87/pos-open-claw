export const MENU_META_ID = 'current'

export interface MenuCategoryRecord {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface MenuProductRecord {
  id: string
  name: string
  categoryId: string
  priceVnd: number
  imageUrl?: string | null
  isActive: boolean
  sortOrder: number
  optionGroupIds: string[]
}

export interface MenuOptionRecord {
  id: string
  optionGroupId: string
  label: string
  priceDeltaVnd: number
  isDefault: boolean
  sortOrder: number
  isActive?: boolean
}

export interface MenuOptionGroupRecord {
  id: string
  name: string
  isRequired: boolean
  minSelect: number
  maxSelect: number
  sortOrder: number
  optionIds: string[]
  isActive?: boolean
}

export interface MenuMetaRecord {
  id: typeof MENU_META_ID
  menuVersion: number
  lastPulledAt: string
  lastCheckedAt?: string
}
