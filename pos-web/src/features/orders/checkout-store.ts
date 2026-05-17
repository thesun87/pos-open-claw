import { create } from 'zustand'
import type { LocalOrderRecord } from '../../db/schemas/orders'
import type { PaymentMethod } from './types'

interface CheckoutState {
  paymentMethod: PaymentMethod
  isCheckingOut: boolean
  isPaymentMethodModalOpen: boolean
  lastFinalizedOrder: LocalOrderRecord | null
  errorMessage: string | null
  setPaymentMethod: (paymentMethod: PaymentMethod) => void
  openPaymentMethodModal: () => void
  closePaymentMethodModal: () => void
  startCheckout: () => void
  finishCheckout: () => void
  completeCheckout: (order: LocalOrderRecord) => void
  failCheckout: (message: string) => void
  clearLastFinalizedOrder: () => void
  resetCheckoutState: () => void
}

const initialState = {
  paymentMethod: 'cash' as PaymentMethod,
  isCheckingOut: false,
  isPaymentMethodModalOpen: false,
  lastFinalizedOrder: null,
  errorMessage: null,
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  ...initialState,
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  openPaymentMethodModal: () => set({ isPaymentMethodModalOpen: true, errorMessage: null }),
  closePaymentMethodModal: () => set({ isPaymentMethodModalOpen: false }),
  startCheckout: () => set({ isCheckingOut: true, errorMessage: null }),
  finishCheckout: () => set({ isCheckingOut: false }),
  completeCheckout: (order) => set({ ...initialState, lastFinalizedOrder: order }),
  failCheckout: (message) => set({ isCheckingOut: false, errorMessage: message }),
  clearLastFinalizedOrder: () => set({ lastFinalizedOrder: null }),
  resetCheckoutState: () => set(initialState),
}))
