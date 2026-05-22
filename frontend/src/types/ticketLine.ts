import type { PaymentType } from "./ticket";

export type TicketLineItem = {
  id: string;
  activityId: number;
  name: string;
  displayName: string;
  tourDate: string;
  tourStartTime: string;
  adultCount: number;
  childCount: number;
  infantCount: number;
  adultSellPrice: number;
  childSellPrice: number;
  infantSellPrice: number;
  adultBuyPrice: number;
  childBuyPrice: number;
  infantBuyPrice: number;
  sellTotal: number;
  sellTotalManual: boolean;
  prepaidAmount: number;
  prepaidManual: boolean;
  paymentType: PaymentType;
  /** Full Paid + ön ödeme: kalan müşteriden size ödenir (aktiviteciye değil) */
  remainderToOperator: boolean;
  hasTransfer: boolean;
  hotelName: string;
  pickupTime: string;
  notes: string;
};

export const PAYMENT_TYPE_OPTIONS: {
  value: PaymentType;
  label: string;
  hint: string;
}[] = [
  {
    value: "FULL_PAID",
    label: "Full Paid",
    hint: "Tam ödeme veya ön ödeme + kalan size",
  },
  {
    value: "TO_PAY",
    label: "To Pay",
    hint: "Kısmi ödeme, kalan tahsil edilecek",
  },
  {
    value: "FREE",
    label: "Free",
    hint: "Ücretsiz bilet",
  },
];
