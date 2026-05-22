export type ActivityPricePeriod = {
  id: number;
  activityId: number;
  startDate: string;
  endDate: string;
  adultBuyPrice: number;
  childBuyPrice: number;
  infantBuyPrice: number;
  adultSellPrice: number;
  childSellPrice: number;
  infantSellPrice: number;
};

export type FullPrices = {
  adultSellPrice: number;
  childSellPrice: number;
  infantSellPrice: number;
  adultBuyPrice: number;
  childBuyPrice: number;
  infantBuyPrice: number;
};

export const emptyPriceForm = (activityId: number, startDate: string, endDate: string) => ({
  activityId,
  startDate,
  endDate,
  adultBuyPrice: 0,
  childBuyPrice: 0,
  infantBuyPrice: 0,
  adultSellPrice: 0,
  childSellPrice: 0,
  infantSellPrice: 0,
});
