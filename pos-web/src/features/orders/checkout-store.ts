import { create } from 'zustand'
import type { PaymentMethod } from './types'

interface CheckoutState {
  paymentMethod: PaymentMethod
  isCheckingOut: boolean
  setPaymentMethod: (paymentMethod: PaymentMethod) => void
  startCheckout: () => void
  finishCheckout: () => void
  resetCheckoutState: () => void
}

const initialState = { paymentMethod: 'cash' as PaymentMethod, isCheckingOut: false }

export const useCheckoutStore = create<CheckoutState>((set) => ({
  ...initialState,
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  startCheckout: () => set({ isCheckingOut: true }),
  finishCheckout: () => set({ isCheckingOut: false }),
  resetCheckoutState: () => set(initialState),
}))
