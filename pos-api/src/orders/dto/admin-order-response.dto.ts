export type AdminPaymentMethod = 'cash' | 'transfer' | 'card';

export type AdminOrderListItem = {
  id: string;
  orderCode: string;
  soldAt: string;
  syncedAt: string;
  cashierName?: string | null;
  paymentMethod: AdminPaymentMethod;
  discountAmount: number;
  total: number;
  itemLineCount: number;
  itemQuantity: number;
  isVoided: boolean;
  voidedAt?: string | null;
};

export type AdminOrderDetail = AdminOrderListItem & {
  clientOrderId: string;
  deviceId: string;
  menuVersionAtSale: number;
  voids: Array<{
    id: string;
    reason: string;
    voidedAt: string;
    voidedByName?: string | null;
  }>;
  items: Array<{
    id: string;
    productNameSnapshot: string;
    unitPriceSnapshot: number;
    quantity: number;
    note?: string | null;
    lineTotal: number;
    options: Array<{
      id: string;
      labelSnapshot: string;
      priceDeltaSnapshot: number;
    }>;
  }>;
};
