export interface CartItemOptionSnapshot {
  optionId: string
  labelSnapshot: string
  priceDeltaSnapshot: number
}

export interface CartDiscount {
  type: 'fixed' | 'percentage'
  value: number
}

export interface CartItem {
  tempId: string
  productId: string
  productNameSnapshot: string
  unitPriceSnapshot: number
  options: CartItemOptionSnapshot[]
  note?: string
  quantity: number
  lineTotal: number
}

export type CartItemInput = Omit<CartItem, 'tempId'>
