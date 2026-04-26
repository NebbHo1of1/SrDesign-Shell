/* ── SIGNAL — Price Forecast KPI Cards ────────────────────────────────
   Three compact cards on the Command Center surfacing the price-forecast
   model's headline metrics: MAPE (accuracy), R² (fit quality), and
   RMSE improvement over the random-walk baseline.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import type { ModelReport } from "@/lib/api";
import { Target, BarChart2, TrendingUp } from "lucide-react";

interface Props {
  report: ModelReport | null;
  loading: boolean;
}

function Skeleton() {
  return (
    <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5 animate-pulse">
      <div className="h-3 w-20 bg-[var(--shell-border-2)] rounded mb-3" />
      <div className="h-7 w-16 bg-[var(--shell-border-2)] rounded mb-2" />
      <div className="h-3 w-24 bg-[var(--shell-border)] rounded" />
    </div>
  );
}

export default function ForecastKPICards({ report, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} />)}
      </div>
    );
  }

  const mape = report?.price_mape;
  const r2 = report?.price_r2;
  const modelRmse = report?.price_rmse;
  const baselineRmse = report?.baseline_rmse;
  const rmseDelta =
    modelRmse != null && baselineRmse != null
      ? ((baselineRmse - modelRmse) / baselineRmse) * 100
      : null;

  const cards = [
    {
      label: "Forecast Accuracy",
      value: mape != null ? `${mape.toFixed(2)}%` : "—",
      sub: "Mean abs % error (MAPE)",
      icon: <Target className="w-5 h-5 text-[#FBCE07]" />,
      color:
        mape != null && mape < 3 ? "text-[#22C55E]" : "text-[#F59E0B]",
      border:
        mape != null && mape < 3
          ? "border-[#22C55E]/30"
          : "border-[#F59E0B]/30",
    },
    {
      label: "R² Score",
      value: r2 != null ? `${(r2 * 100).toFixed(1)}%` : "—",
      sub: "Variance explained by model",
      icon: <BarChart2 className="w-5 h-5 text-[#38BDF8]" />,
      color: "text-[#38BDF8]",
      border: "border-[#38BDF8]/30",
    },
    {
      label: "vs Baseline",
      value: rmseDelta != null ? `+${rmseDelta.toFixed(1)}%` : "—",
      sub: "RMSE improvement over random walk",
      icon: <TrendingUp className="w-5 h-5 text-[#22C55E]" />,
      color: "text-[#22C55E]",
      border: "border-[#22C55E]/30",
    },
  ];

  return (
    <div>
      <div className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-3)] uppercase mb-3 px-0.5">
        Price Forecast Model
      </div>
      <div className="grid grid-cols-3 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-[#38BDF8]/5 ${c.border}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
                {c.label}
              </span>
              {c.icon}
            </div>
            <div className={`text-2xl font-extrabold ${c.color}`}>{c.value}</div>
            <p className="text-xs text-[var(--shell-muted-2)] mt-1">{c.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
