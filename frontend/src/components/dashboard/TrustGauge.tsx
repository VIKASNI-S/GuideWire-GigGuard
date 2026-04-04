export function TrustGauge({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color =
    pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const label =
    pct >= 70 ? "High Trust" : pct >= 50 ? "Moderate Trust" : "Low Trust";

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative h-36 w-36 rounded-full"
        style={{
          background: `conic-gradient(${color} ${pct * 3.6}deg, #e2e8f0 0deg)`,
        }}
      >
        <div className="absolute inset-3 rounded-full bg-white flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{pct}</span>
          <span className="text-xs text-slate-500">/ 100</span>
        </div>
      </div>
      <span
        className="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold"
        style={{ background: `${color}22`, color }}
      >
        {label}
      </span>
      <p className="mt-3 text-sm text-slate-600 text-center">
        Higher trust unlocks faster payouts and fewer reviews.
      </p>
    </div>
  );
}
