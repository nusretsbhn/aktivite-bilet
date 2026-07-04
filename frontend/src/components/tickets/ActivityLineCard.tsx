import { useState } from "react";
import { PersonCounter } from "./PersonCounter";
import { calcLineTotal } from "@/utils/linePricing";
import type { TicketLineItem } from "@/types/ticketLine";
import { PAYMENT_TYPE_OPTIONS } from "@/types/ticketLine";
import type { PaymentType } from "@/types/ticket";
import type { FullPrices } from "@/types/activityPrice";
import { inputClassSm as inputClass } from "@/lib/ui";

type Props = {
  line: TicketLineItem;
  index: number;
  onChange: (line: TicketLineItem) => void;
  onRemove: () => void;
  onTourDateChange?: (activityId: number, tourDate: string) => Promise<FullPrices>;
  applyPrices?: (line: TicketLineItem, prices: FullPrices, resetManual?: boolean) => TicketLineItem;
  manualPricing?: boolean;
};

export function ActivityLineCard({
  line,
  index,
  onChange,
  onRemove,
  onTourDateChange,
  applyPrices,
  manualPricing = false,
}: Props) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(String(line.sellTotal));
  const [editingCost, setEditingCost] = useState(false);
  const [costInput, setCostInput] = useState(String(line.buyTotal));

  const counts = {
    adult: line.adultCount,
    child: line.childCount,
    infant: line.infantCount,
  };

  const calculatedSell = calcLineTotal(
    {
      adultSellPrice: line.adultSellPrice,
      childSellPrice: line.childSellPrice,
      infantSellPrice: line.infantSellPrice,
    },
    counts
  );

  const calculatedBuy = calcLineTotal(
    {
      adultSellPrice: line.adultBuyPrice,
      childSellPrice: line.childBuyPrice,
      infantSellPrice: line.infantBuyPrice,
    },
    counts
  );

  function update(partial: Partial<TicketLineItem>) {
    const next = { ...line, ...partial };
    if (!next.sellTotalManual) {
      next.sellTotal = calcLineTotal(
        {
          adultSellPrice: next.adultSellPrice,
          childSellPrice: next.childSellPrice,
          infantSellPrice: next.infantSellPrice,
        },
        {
          adult: next.adultCount,
          child: next.childCount,
          infant: next.infantCount,
        }
      );
    }
    if (!next.buyTotalManual) {
      next.buyTotal = calcLineTotal(
        {
          adultSellPrice: next.adultBuyPrice,
          childSellPrice: next.childBuyPrice,
          infantSellPrice: next.infantBuyPrice,
        },
        {
          adult: next.adultCount,
          child: next.childCount,
          infant: next.infantCount,
        }
      );
    }
    if (next.paymentType === "FREE") {
      next.sellTotal = 0;
      next.remainderToOperator = false;
    }
    const sellAfter = next.paymentType === "FREE" ? 0 : next.sellTotal;
    if (
      next.paymentType !== "FULL_PAID" ||
      next.prepaidAmount <= 0 ||
      next.prepaidAmount >= sellAfter
    ) {
      next.remainderToOperator = false;
    }
    onChange(next);
  }

  function applyManualPrice() {
    const v = Math.round(Number(priceInput) || 0);
    onChange({
      ...line,
      sellTotal: line.paymentType === "FREE" ? 0 : v,
      sellTotalManual: true,
    });
    setEditingPrice(false);
  }

  function applyManualCost() {
    const v = Math.round(Number(costInput) || 0);
    onChange({
      ...line,
      buyTotal: v,
      buyTotalManual: true,
    });
    setEditingCost(false);
  }

  const displaySell =
    line.paymentType === "FREE" ? 0 : line.sellTotal;
  const lineRemainder = Math.max(0, displaySell - line.prepaidAmount);
  const showRemainderToOperator =
    line.paymentType === "FULL_PAID" &&
    line.prepaidAmount > 0 &&
    lineRemainder > 0;

  return (
    <div className="rounded-xl border-2 border-primary-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-subtle">#{index + 1}</span>
          <h4 className="font-semibold text-primary">{line.displayName}</h4>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-sm text-red-600"
          aria-label="Kaldır"
        >
          ✕
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">
          Tur tarihi
          <input
            type="date"
            required
            value={line.tourDate}
            onChange={async (e) => {
              const tourDate = e.target.value;
              if (onTourDateChange && applyPrices) {
                const prices = await onTourDateChange(line.activityId, tourDate);
                onChange(applyPrices({ ...line, tourDate }, prices, true));
              } else {
                update({ tourDate });
              }
            }}
            className={`mt-0.5 ${inputClass}`}
          />
        </label>
        <label className="text-xs text-muted">
          Başlangıç saati
          <input
            type="time"
            value={line.tourStartTime}
            onChange={(e) => update({ tourStartTime: e.target.value })}
            className={`mt-0.5 ${inputClass}`}
          />
        </label>
      </div>

      {!manualPricing && (
        <div className="mt-2 text-xs text-muted">
          <span>
            Alış: Y {line.adultBuyPrice} · Ç {line.childBuyPrice} · B{" "}
            {line.infantBuyPrice}
          </span>
        </div>
      )}

      <div className="mt-3 flex justify-around border-y border-border py-2">
        <PersonCounter
          label="Y"
          value={line.adultCount}
          onChange={(v) => update({ adultCount: v })}
        />
        <PersonCounter
          label="Ç"
          value={line.childCount}
          onChange={(v) => update({ childCount: v })}
        />
        <PersonCounter
          label="B"
          value={line.infantCount}
          onChange={(v) => update({ infantCount: v })}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-muted">Tur ücreti</span>
        <div className="flex items-center gap-2">
          {editingPrice ? (
            <>
              <input
                type="number"
                inputMode="numeric"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="w-24 rounded border px-2 py-1 text-right"
              />
              <button
                type="button"
                onClick={applyManualPrice}
                className="text-sm text-primary"
              >
                OK
              </button>
            </>
          ) : (
            <>
              <span className="text-lg font-bold text-primary">
                {displaySell.toLocaleString("tr-TR")} ₺
              </span>
              {line.paymentType !== "FREE" && (
                <button
                  type="button"
                  onClick={() => {
                    setPriceInput(String(line.sellTotal));
                    setEditingPrice(true);
                  }}
                  className="rounded p-1 text-muted hover:bg-muted-surface"
                  title="Fiyat düzenle"
                >
                  ✎
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {!manualPricing && !line.sellTotalManual && calculatedSell !== line.sellTotal && (
        <p className="text-xs text-subtle">Hesaplanan: {calculatedSell} ₺</p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm text-muted">Toplam maliyet</span>
        <div className="flex items-center gap-2">
          {editingCost ? (
            <>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                className="w-24 rounded border px-2 py-1 text-right"
              />
              <button
                type="button"
                onClick={applyManualCost}
                className="text-sm text-primary"
              >
                OK
              </button>
            </>
          ) : (
            <>
              <span className="text-lg font-bold text-foreground">
                {line.buyTotal.toLocaleString("tr-TR")} ₺
              </span>
              <button
                type="button"
                onClick={() => {
                  setCostInput(String(line.buyTotal));
                  setEditingCost(true);
                }}
                className="rounded p-1 text-muted hover:bg-muted-surface"
                title="Maliyet düzenle"
              >
                ✎
              </button>
            </>
          )}
        </div>
      </div>
      {!manualPricing && !line.buyTotalManual && calculatedBuy !== line.buyTotal && (
        <p className="text-xs text-subtle">Hesaplanan maliyet: {calculatedBuy} ₺</p>
      )}

      <label className="mt-3 flex min-h-10 items-center gap-2">
        <input
          type="checkbox"
          checked={line.hasTransfer}
          onChange={(e) => update({ hasTransfer: e.target.checked })}
        />
        <span className="text-sm">Transfer</span>
      </label>
      {line.hasTransfer && (
        <div className="mt-2 grid gap-2">
          <input
            placeholder="Otel"
            value={line.hotelName}
            onChange={(e) => update({ hotelName: e.target.value })}
            className={inputClass}
          />
          <input
            type="time"
            value={line.pickupTime}
            onChange={(e) => update({ pickupTime: e.target.value })}
            className={inputClass}
          />
        </div>
      )}

      <textarea
        placeholder="Not"
        value={line.notes}
        onChange={(e) => update({ notes: e.target.value })}
        className={`mt-2 ${inputClass}`}
        rows={2}
      />

      {!manualPricing && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-muted">Ödeme tipi</p>
          <div className="grid grid-cols-1 gap-1">
            {PAYMENT_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  update({
                    paymentType: opt.value as PaymentType,
                    remainderToOperator: false,
                    sellTotal:
                      opt.value === "FREE"
                        ? 0
                        : line.sellTotalManual
                          ? line.sellTotal
                          : calculatedSell,
                  })
                }
                className={`rounded-lg border px-2 py-2 text-left text-xs ${
                  line.paymentType === opt.value
                    ? "border-teal-700 bg-primary-soft"
                    : "border-border"
                }`}
              >
                <span className="font-semibold">{opt.label}</span>
                <span className="block text-muted">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!manualPricing && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
          <span className="text-sm text-amber-900">Ön ödeme (bu satır)</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={line.prepaidAmount}
            onChange={(e) => {
              const prepaidAmount = Math.round(Number(e.target.value) || 0);
              const remainder = Math.max(0, displaySell - prepaidAmount);
              onChange({
                ...line,
                prepaidAmount,
                prepaidManual: true,
                remainderToOperator:
                  line.remainderToOperator &&
                  line.paymentType === "FULL_PAID" &&
                  prepaidAmount > 0 &&
                  remainder > 0,
              });
            }}
            className="w-24 rounded border bg-card px-2 py-1 text-right font-semibold"
          />
        </div>
      )}

      {!manualPricing && showRemainderToOperator && (
        <label className="mt-2 flex min-h-10 items-start gap-2 rounded-lg border border-primary-border bg-primary-soft px-3 py-2">
          <input
            type="checkbox"
            checked={line.remainderToOperator}
            onChange={(e) => update({ remainderToOperator: e.target.checked })}
            className="mt-1"
          />
          <span className="text-sm text-primary">
            <span className="font-medium">Kalan gelince bana ödenecek</span>
            <span className="block text-xs text-primary">
              {lineRemainder.toLocaleString("tr-TR")} ₺ aktiviteciye değil, size
              tahsil edilecek (Full Paid)
            </span>
          </span>
        </label>
      )}
    </div>
  );
}
