/* ── SIGNAL — Baseline Comparison Panel ───────────────────────────────
   Side-by-side RMSE / MAE / R² / MAPE table comparing the deployed
   Stacking price-forecast model against the LastPrice random-walk
   baseline. Shown on the Command Center at 2/3 width.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import type { ModelReport } from "@/lib/api";
import { BarChart2, CheckCircle2, Link } from "lucide-react";
import NextLink from "next/link";

interface Props {
  report: ModelReport | null;
  loading: boolean;
}

interface RowProps {
  label: string;
  model: number | null | undefined;
  baseline: number | null | undefined;
  higherBetter?: boolean;
  formatter?: (v: number) => string;
}

function MetricRow({ label, model, baseline, higherBetter = false, formatter }: RowProps) {
  if (model == null) return null;
  const fmt = formatter ?? ((v: number) => v.toFixed(3));
  const modelWins =
    baseline != null
      ? higherBetter
        ? model > baseline
        : model < baseline
      : true;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[var(--shell-border)] last:border-0">
      <span className="text-xs text-[var(--shell-muted)]">{label}</span>
      <div className="flex items-center gap-8">
        {/* Model value */}
        <span
          className={`text-sm font-bold flex items-center gap-1 ${
            modelWins ? "text-[#22C55E]" : "text-[var(--shell-text-bright)]"
          }`}
        >
          {fmt(model)}
          {modelWins && <CheckCircle2 className="w-3 h-3" />}
        </span>
        {/* Baseline value */}
        <span className="text-sm text-[var(--shell-muted-2)] min-w-[52px] text-right">
          {baseline != null ? fmt(baseline) : "—"}
        </span>
      </div>
    </div>
  );
}

export default function BaselineComparisonPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5 h-full animate-pulse">
        <div className="h-4 w-48 bg-[var(--shell-border-2)] rounded mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-[var(--shell-border)] rounded-lg mb-2" />
        ))}
      </div>
    );
  }

  const modelName = report?.price_model_type ?? "Stacking";
  const rmseDelta =
    report?.price_rmse != null && report?.baseline_rmse != null
      ? ((report.baseline_rmse - report.price_rmse) / report.baseline_rmse) * 100
      : null;

  return (
    <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-[#38BDF8]" />
          <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
            Price Forecast — Model vs Baseline
          </span>
        </div>
        <NextLink
          href="/dashboard/forecast"
          className="inline-flex items-center gap-1 text-[0.6rem] text-[#38BDF8] hover:text-[#7DD3FC] transition-colors"
        >
          Full analysis <Link className="w-3 h-3" />
        </NextLink>
      </div>

      {/* Column headers */}
      <div className="flex items-center justify-between text-[0.6rem] font-bold tracking-[0.08em] text-[var(--shell-muted-3)] uppercase mb-1 pb-1 border-b border-[var(--shell-border)]">
        <span>Metric</span>
        <div className="flex gap-8">
          <span className="text-[#38BDF8]">{modelName}</span>
          <span className="min-w-[52px] text-right">Baseline</span>
        </div>
      </div>

      {/* Metric rows */}
      <MetricRow
        label="RMSE ($/bbl)"
        model={report?.price_rmse}
        baseline={report?.baseline_rmse}
      />
      <MetricRow
        label="MAE ($/bbl)"
        model={report?.price_mae}
        baseline={report?.baseline_mae}
      />
      <MetricRow
        label="R² Score"
        model={report?.price_r2}
        baseline={report?.baseline_r2}
        higherBetter
        formatter={(v) => v.toFixed(4)}
      />
      {report?.price_mape != null && (
        <div className="flex items-center justify-between py-2.5">
          <span className="text-xs text-[var(--shell-muted)]">MAPE</span>
          <div className="flex items-center gap-8">
            <span className="text-sm font-bold text-[#22C55E] flex items-center gap-1">
              {report.price_mape.toFixed(2)}%
              <CheckCircle2 className="w-3 h-3" />
            </span>
            <span className="text-sm text-[var(--shell-muted-3)] min-w-[52px] text-right">—</span>
          </div>
        </div>
      )}

      {/* Summary badge */}
      {rmseDelta != null && (
        <div className="mt-4 pt-4 border-t border-[var(--shell-border)]">
          <div className="flex items-start gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
            <p className="text-[var(--shell-muted)] leading-relaxed">
              <span className="text-[#22C55E] font-semibold">{modelName}</span> beats the
              LastPrice (random-walk) baseline by{" "}
              <span className="text-[var(--shell-text-bright)] font-semibold">
                {rmseDelta.toFixed(1)}%
              </span>{" "}
              on RMSE. Green values indicate the model outperforms the baseline.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
