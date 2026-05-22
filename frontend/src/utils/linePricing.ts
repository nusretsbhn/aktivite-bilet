import type { ActivityPrices } from "@/types/ticket";

export function calcLineTotal(
  prices: ActivityPrices,
  counts: { adult: number; child: number; infant: number }
): number {
  return Math.round(
    prices.adultSellPrice * counts.adult +
      prices.childSellPrice * counts.child +
      prices.infantSellPrice * counts.infant
  );
}

export type FullPrices = ActivityPrices & {
  adultBuyPrice: number;
  childBuyPrice: number;
  infantBuyPrice: number;
};

export function calcBuyTotal(
  prices: FullPrices,
  counts: { adult: number; child: number; infant: number }
): number {
  return Math.round(
    prices.adultBuyPrice * counts.adult +
      prices.childBuyPrice * counts.child +
      prices.infantBuyPrice * counts.infant
  );
}
