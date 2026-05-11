export interface CartItemOptionSnapshot {
  optionId: string
  labelSnapshot: string
  priceDeltaSnapshot: number
}

export interface CartItem {
  tempId: string
  productId: string
  productNameSnapshot: string
  unitPriceSnapshot: number
  options: CartItemOptionSnapshot[]
  note?: string
  quantity: 1
  lineTotal: number
}

export type CartItemInput = Omit<CartItem, 'tempId'>
