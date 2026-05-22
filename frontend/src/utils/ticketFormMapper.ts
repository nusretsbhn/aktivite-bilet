import type { TicketLineItem } from "@/types/ticketLine";
import type { PaymentType } from "@/types/ticket";

export type TicketDetailResponse = {
  id: number;
  ticketNo: string;
  status: string;
  revisionCount: number;
  customerName: string;
  customerPhone: string;
  bankAccountId: number | null;
  activities: {
    id: number;
    activityId: number;
    tourDate: string;
    tourStartTime: string | null;
    adultCount: number;
    childCount: number;
    infantCount: number;
    adultSellPrice: number;
    childSellPrice: number;
    infantSellPrice: number;
    adultBuyPrice: number;
    childBuyPrice: number;
    infantBuyPrice: number;
    unitPrice: number;
    prepaidAmount: number;
    paymentType: PaymentType;
    remainderToOperator: boolean;
    hasTransfer: boolean;
    hotelName: string | null;
    pickupTime: string | null;
    notes: string | null;
    activity: { name: string; displayName: string };
  }[];
};

export function mapTicketToLines(ticket: TicketDetailResponse): TicketLineItem[] {
  return ticket.activities.map((a) => ({
    id: `line-${a.id}`,
    activityId: a.activityId,
    name: a.activity.name,
    displayName: a.activity.displayName,
    tourDate: a.tourDate.slice(0, 10),
    tourStartTime: a.tourStartTime ?? "",
    adultCount: a.adultCount,
    childCount: a.childCount,
    infantCount: a.infantCount,
    adultSellPrice: a.adultSellPrice,
    childSellPrice: a.childSellPrice,
    infantSellPrice: a.infantSellPrice,
    adultBuyPrice: a.adultBuyPrice,
    childBuyPrice: a.childBuyPrice,
    infantBuyPrice: a.infantBuyPrice,
    sellTotal: a.unitPrice,
    sellTotalManual: true,
    prepaidAmount: a.prepaidAmount,
    prepaidManual: true,
    paymentType: a.paymentType,
    remainderToOperator: a.remainderToOperator ?? false,
    hasTransfer: a.hasTransfer,
    hotelName: a.hotelName ?? "",
    pickupTime: a.pickupTime ?? "",
    notes: a.notes ?? "",
  }));
}
