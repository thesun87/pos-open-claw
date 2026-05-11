import { create } from 'zustand'
import { createUuidV7 } from '../../shared/lib/uuid'
import type { CartItem, CartItemInput } from './types'

interface CartState {
  items: CartItem[]
  addItem: (item: CartItemInput) => CartItem
  resetCart: () => void
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) => {
    const cartItem: CartItem = { ...item, tempId: createUuidV7(), options: item.options.map((option) => ({ ...option })) }
    set((state) => ({ items: [...state.items, cartItem] }))
    return cartItem
  },
  resetCart: () => set({ items: [] }),
}))
