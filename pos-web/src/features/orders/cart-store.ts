import { create } from 'zustand'
import { createUuidV7 } from '../../shared/lib/uuid'
import type { CartDiscount, CartItem, CartItemInput } from './types'

interface CartState {
  items: CartItem[]
  discount: CartDiscount | null
  addItem: (item: CartItemInput) => CartItem
  updateQuantity: (tempId: string, quantity: number) => void
  removeItem: (tempId: string) => void
  updateItemNote: (tempId: string, note: string) => void
  setDiscount: (discount: CartDiscount | null) => void
  clearCart: () => void
  resetCart: () => void
}

export function normalizeCartNote(note?: string) {
  const trimmed = note?.trim().slice(0, 200) ?? ''
  return trimmed.length > 0 ? trimmed : undefined
}

export function calculateLineTotal(item: Pick<CartItem, 'unitPriceSnapshot' | 'options' | 'quantity'>) {
  const unitTotal = item.unitPriceSnapshot + item.options.reduce((sum, option) => sum + option.priceDeltaSnapshot, 0)
  return unitTotal * Math.max(1, Math.trunc(item.quantity))
}

export function calculateCartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.lineTotal, 0)
}

export function sanitizeDiscount(discount: CartDiscount | null, subtotal: number): CartDiscount | null {
  if (!discount) return null
  const value = Math.trunc(discount.value)
  if (!Number.isFinite(value) || value <= 0) return null
  if (discount.type === 'percentage') return { type: 'percentage', value: Math.min(value, 100) }
  const fixedValue = Math.min(value, Math.max(0, subtotal))
  return fixedValue > 0 ? { type: 'fixed', value: fixedValue } : null
}

export function calculateDiscountAmount(discount: CartDiscount | null, subtotal: number) {
  if (!discount) return 0
  return discount.type === 'fixed' ? Math.min(discount.value, subtotal) : Math.floor((subtotal * discount.value) / 100)
}

export function calculateCartTotals(items: CartItem[], discount: CartDiscount | null) {
  const subtotal = calculateCartSubtotal(items)
  const safeDiscount = sanitizeDiscount(discount, subtotal)
  const discountAmount = calculateDiscountAmount(safeDiscount, subtotal)
  return { subtotal, discount: safeDiscount, discountAmount, total: subtotal - discountAmount }
}

function hasSameOptions(left: CartItem['options'], right: CartItem['options']) {
  if (left.length !== right.length) return false
  return left.every((option, index) => {
    const other = right[index]
    return other?.optionId === option.optionId && other.labelSnapshot === option.labelSnapshot && other.priceDeltaSnapshot === option.priceDeltaSnapshot
  })
}

function canMergeCartItem(existing: CartItem, incoming: CartItemInput) {
  return existing.productId === incoming.productId
    && existing.unitPriceSnapshot === incoming.unitPriceSnapshot
    && normalizeCartNote(existing.note) === normalizeCartNote(incoming.note)
    && hasSameOptions(existing.options, incoming.options)
}

function toCartItem(input: CartItemInput): CartItem {
  const note = normalizeCartNote(input.note)
  const item: CartItem = {
    ...input,
    tempId: createUuidV7(),
    options: input.options.map((option) => ({ ...option })),
    quantity: Math.max(1, Math.trunc(input.quantity)),
    lineTotal: 0,
    ...(note ? { note } : {}),
  }
  return { ...item, lineTotal: calculateLineTotal(item) }
}

function resetState() {
  return { items: [], discount: null }
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: null,
  addItem: (input) => {
    let result: CartItem | undefined
    set((state) => {
      const incoming = toCartItem(input)
      const existingIndex = state.items.findIndex((item) => canMergeCartItem(item, incoming))
      if (existingIndex >= 0) {
        const items = state.items.map((item, index) => {
          if (index !== existingIndex) return item
          const next = { ...item, quantity: item.quantity + incoming.quantity }
          result = { ...next, lineTotal: calculateLineTotal(next) }
          return result
        })
        const subtotal = calculateCartSubtotal(items)
        return { items, discount: sanitizeDiscount(state.discount, subtotal) }
      }
      result = incoming
      return { items: [...state.items, incoming] }
    })
    return result ?? get().items.at(-1)!
  },
  updateQuantity: (tempId, quantity) => set((state) => {
    const nextQuantity = Math.trunc(quantity)
    const items = nextQuantity <= 0
      ? state.items.filter((item) => item.tempId !== tempId)
      : state.items.map((item) => item.tempId === tempId ? { ...item, quantity: nextQuantity, lineTotal: calculateLineTotal({ ...item, quantity: nextQuantity }) } : item)
    const subtotal = calculateCartSubtotal(items)
    return { items, discount: sanitizeDiscount(state.discount, subtotal) }
  }),
  removeItem: (tempId) => set((state) => {
    const items = state.items.filter((item) => item.tempId !== tempId)
    const subtotal = calculateCartSubtotal(items)
    return { items, discount: sanitizeDiscount(state.discount, subtotal) }
  }),
  updateItemNote: (tempId, note) => set((state) => ({
    items: state.items.map((item) => {
      if (item.tempId !== tempId) return item
      const normalizedNote = normalizeCartNote(note)
      const itemWithoutNote: CartItem = {
        tempId: item.tempId,
        productId: item.productId,
        productNameSnapshot: item.productNameSnapshot,
        unitPriceSnapshot: item.unitPriceSnapshot,
        options: item.options,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      }
      return normalizedNote ? { ...itemWithoutNote, note: normalizedNote } : itemWithoutNote
    }),
  })),
  setDiscount: (discount) => set((state) => ({ discount: sanitizeDiscount(discount, calculateCartSubtotal(state.items)) })),
  clearCart: () => set(resetState()),
  resetCart: () => set(resetState()),
}))
