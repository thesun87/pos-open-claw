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


export type PaymentMethod = 'cash' | 'transfer' | 'card'

export interface LocalOrderItem {
  productId: string
  productNameSnapshot: string
  unitPriceSnapshot: number
  options: CartItemOptionSnapshot[]
  note?: string
  quantity: number
  lineTotal: number
}

export interface LocalOrder {
  clientOrderId: string
  orderCode: string
  deviceId: string
  soldAt: string
  menuVersionAtSale: number
  items: LocalOrderItem[]
  discountAmount: number
  total: number
  paymentMethod: PaymentMethod
  // Story 6.8: pair invariant — both null or both non-null (FR51/AR24/NFR14)
  // tableNameSnapshot is immutable after buildLocalOrder creates the order
  tableId: string | null
  tableNameSnapshot: string | null
}
