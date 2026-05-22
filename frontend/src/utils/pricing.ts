import type { ActivityPrices, DiscountType } from "@/types/ticket";

export function calcLineTotal(
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
  discountType?: DiscountType,
  discountValue?: number
): number {
  if (!discountType || !discountValue || discountValue <= 0) return total;
  if (discountType === "PERCENTAGE") {
    return Math.max(0, total * (1 - discountValue));
  }
  return Math.max(0, total - discountValue);
}
