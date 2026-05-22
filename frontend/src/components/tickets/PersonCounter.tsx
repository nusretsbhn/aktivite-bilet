type Props = {
  label: string;
  value: number;
  onChange: (v: number) => void;
};

export function PersonCounter({ label, value, onChange }: Props) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm font-medium text-muted">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-xl hover:bg-app"
          aria-label={`${label} azalt`}
        >
          −
        </button>
        <span className="min-w-8 text-center text-lg font-semibold">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-xl hover:bg-app"
          aria-label={`${label} artır`}
        >
          +
        </button>
      </div>
    </div>
  );
}
