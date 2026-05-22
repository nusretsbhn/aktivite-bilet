export type PaymentType = "FULL_PAID" | "TO_PAY" | "FREE" | "NO_SHOW";
export type DiscountType = "PERCENTAGE" | "FIXED";

export type Activity = {
  id: number;
  name: string;
  displayName: string;
  description?: string | null;
  duration?: string | null;
  isActive?: boolean;
};

export type Agency = {
  id: number;
  name: string;
  region: string;
  phone: string;
};

export type BankAccount = {
  id: number;
  name: string;
  description?: string | null;
};

export type ActivityPrices = {
  adultSellPrice: number;
  childSellPrice: number;
  infantSellPrice: number;
};

export type SelectedActivity = {
  activityId: number;
  name: string;
  prices: ActivityPrices;
};

export type TicketListItem = {
  id: number;
  ticketNo: string;
  tourDate: string;
  customerName: string;
  customerPhone: string;
  paymentType: PaymentType;
  finalAmount: number;
  prepaidAmount: number;
  remainingAmount: number;
  status: string;
  revisionCount: number;
  adultCount: number;
  childCount: number;
  infantCount: number;
  agency?: { name: string } | null;
  activities: { activity: { name: string; displayName: string } }[];
};

export const PAYMENT_PREFIX: Partial<Record<PaymentType, string>> = {
  FULL_PAID: "FP",
  TO_PAY: "TP",
  FREE: "FR",
};

export const PAYMENT_LABELS: Record<PaymentType, string> = {
  FULL_PAID: "Tam Ödendi",
  TO_PAY: "Ödenecek",
  FREE: "Ücretsiz",
  NO_SHOW: "Gelmedi",
};

export const PAYMENT_COLORS: Record<PaymentType, string> = {
  FULL_PAID: "bg-green-100 text-green-800",
  TO_PAY: "bg-yellow-100 text-yellow-800",
  FREE: "bg-blue-100 text-blue-800",
  NO_SHOW: "bg-red-100 text-red-800",
};
