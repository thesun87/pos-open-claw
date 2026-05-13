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
}
