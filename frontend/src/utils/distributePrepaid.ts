export function distributePrepaidInteger(
  total: number,
  lineCount: number
): number[] {
  const amount = Math.max(0, Math.round(total));
  if (lineCount <= 0) return [];
  const base = Math.floor(amount / lineCount);
  const remainder = amount - base * lineCount;
  return Array.from({ length: lineCount }, (_, i) =>
    base + (i < remainder ? 1 : 0)
  );
}
