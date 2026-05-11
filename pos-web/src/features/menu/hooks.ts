import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import type { MenuCategoryRecord, MenuProductRecord } from '../../db/schemas/menu'

function bySortOrderThenName<T extends { sortOrder: number; name: string }>(a: T, b: T): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi')
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
