import type { DiscountType } from "@prisma/client";

export type ActivityPrices = {
  adultSellPrice: number;
  childSellPrice: number;
  infantSellPrice: number;
};

export function calcActivityLineTotal(
  prices: ActivityPrices,
  counts: { adult: number; child: number; infant: number }
): number {
  return (
    prices.adultSellPrice * counts.adult +
    prices.childSellPrice * counts.child +
    prices.infantSellPrice * counts.infant
  );
}

export function applyDiscount(
  total: number,
  discountType?: DiscountType | null,
  discountValue?: number | null
): number {
  if (!discountType || discountValue == null || discountValue <= 0) {
    return total;
  }
  if (discountType === "PERCENTAGE") {
    return Math.max(0, total * (1 - discountValue));
  }
  return Math.max(0, total - discountValue);
}
