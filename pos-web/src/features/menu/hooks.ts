import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import type { MenuCategoryRecord, MenuOptionGroupRecord, MenuOptionRecord, MenuProductRecord } from '../../db/schemas/menu'

function bySortOrderThenName<T extends { sortOrder: number; name: string }>(a: T, b: T): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi')
}

function bySortOrderThenLabel<T extends { sortOrder: number; label?: string; name?: string }>(a: T, b: T): number {
  const aLabel = a.label ?? a.name ?? ''
  const bLabel = b.label ?? b.name ?? ''
  return a.sortOrder - b.sortOrder || aLabel.localeCompare(bLabel, 'vi')
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi')
}

export function useDebouncedValue(value: string, delayMs: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs)
    return () => window.clearTimeout(timeoutId)
  }, [delayMs, value])

  return debouncedValue
}

export function useCategories(): MenuCategoryRecord[] | undefined {
  return useLiveQuery(async () => {
    const categories = await db.categories.toArray()
    return categories.sort(bySortOrderThenName)
  }, [])
}

export function useProducts({ categoryId, search }: { categoryId?: string; search?: string } = {}): MenuProductRecord[] | undefined {
  return useLiveQuery(async () => {
    let products = categoryId
      ? await db.products.where('categoryId').equals(categoryId).toArray()
      : await db.products.toArray()
    products = products.filter((product) => product.isActive)
    const normalizedSearch = search?.trim() ? normalizeSearch(search) : ''
    if (normalizedSearch) {
      products = products.filter((product) => normalizeSearch(product.name).includes(normalizedSearch))
    }
    return products.sort(bySortOrderThenName)
  }, [categoryId, search])
}

export function useOptionGroupsForProduct(product: Pick<MenuProductRecord, 'optionGroupIds'> | null | undefined): Array<{ group: MenuOptionGroupRecord; options: MenuOptionRecord[] }> | undefined {
  const optionGroupIds = product?.optionGroupIds ?? []
  return useLiveQuery(async () => {
    if (!optionGroupIds.length) return []
    const groups = await db.optionGroups.bulkGet(optionGroupIds)
    const validGroups = groups.filter((group): group is MenuOptionGroupRecord => group !== undefined && group.isActive !== false)
      .sort(bySortOrderThenName)
    const optionsByGroup = await Promise.all(validGroups.map(async (group) => {
      const options = (await db.options.bulkGet(group.optionIds)).filter((option): option is MenuOptionRecord => option !== undefined && option.optionGroupId === group.id && option.isActive !== false)
      return {
        group,
        options: options.sort(bySortOrderThenLabel),
      }
    }))
    return optionsByGroup
  }, [optionGroupIds.join('|')])
}

export function useMenuOptionGroupsForProduct(product: Pick<MenuProductRecord, 'optionGroupIds'> | null | undefined) {
  return useOptionGroupsForProduct(product)
}
