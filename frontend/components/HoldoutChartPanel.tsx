/* ── SIGNAL — Holdout Chart Panel ─────────────────────────────────────
   Self-contained "Actual vs. Predicted — Holdout Test Set" chart for
   the Command Center. Fetches holdout predictions from the backend and
   renders the 3-line overlay (Actual / Predicted / Baseline) plus the
   error-analysis stats row (Within $2/bbl · Largest Miss · Direction
   Accuracy).
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import NextLink from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { api, type HoldoutPoint } from "@/lib/api";

export default function HoldoutChartPanel() {
  const [holdout, setHoldout] = useState<HoldoutPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .holdoutPredictions()
      .then(setHoldout)
      .catch(() => setHoldout([]))
      .finally(() => setLoading(false));
  }, []);

  /* Error analysis stats */
  const errorStats = useMemo(() => {
    if (holdout.length < 2) return null;
    const errors = holdout.map((h) => Math.abs(h.actual - h.predicted));
    const within2 = errors.filter((e) => e <= 2).length;
    const maxError = Math.max(...errors);
    const maxErrorIdx = errors.indexOf(maxError);
    const maxErrorDate = holdout[maxErrorIdx]?.date?.slice(0, 7) ?? "";
    let dirCorrect = 0;
    for (let i = 1; i < holdout.length; i++) {
      const actualUp = holdout[i].actual > holdout[i - 1].actual;
      const predUp = holdout[i].predicted > holdout[i - 1].predicted;
      if (actualUp === predUp) dirCorrect++;
    }
    return {
      within2Pct: ((within2 / holdout.length) * 100).toFixed(0),
      maxError: maxError.toFixed(2),
      maxErrorDate,
      dirAccuracy: ((dirCorrect / (holdout.length - 1)) * 100).toFixed(0),
    };
  }, [holdout]);

  const holdoutDateRange =
    holdout.length > 0
      ? `${holdout[0].date.slice(0, 7)} → ${holdout[holdout.length - 1].date.slice(0, 7)}`
      : null;

  const handleLegendClick = (payload: { dataKey?: string }) => {
    const key = payload?.dataKey;
    if (!key) return;
    setHiddenLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5 h-full animate-pulse">
        <div className="h-4 w-64 bg-[var(--shell-border-2)] rounded mb-4" />
        <div className="h-[300px] bg-[var(--shell-border)] rounded-lg" />
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 bg-[var(--shell-border)] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  /* No data state */
  if (holdout.length === 0) {
    return (
      <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5 h-full flex items-center justify-center">
        <p className="text-sm text-[var(--shell-muted-2)]">
          No holdout data available — run{" "}
          <code className="text-[#FBCE07]">train_price_model.py</code> to generate predictions.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#38BDF8]" />
          <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
            Actual vs. Predicted — Holdout Test Set
          </span>
        </div>
        <div className="flex items-center gap-2">
          {holdoutDateRange && (
            <span className="text-[0.6rem] font-mono text-[var(--shell-muted-3)] border border-[var(--shell-border)] px-2 py-0.5 rounded">
              {holdoutDateRange}
            </span>
          )}
          <NextLink
            href="/dashboard/forecast"
            className="text-[0.6rem] text-[#38BDF8] hover:text-[#7DD3FC] transition-colors"
          >
            Full analysis →
          </NextLink>
        </div>
      </div>
      <p className="text-xs text-[var(--shell-muted-2)] mb-4">
        3-line overlay of actual closing prices, model predictions, and the naïve
        random-walk baseline over the held-out test period.{" "}
        <span className="text-[var(--shell-muted-3)]">
          Click legend items to show/hide individual lines.
        </span>
      </p>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={holdout} margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--shell-border)" />
          <XAxis
            dataKey="date"
            stroke="var(--shell-border-2)"
            tick={{ fill: "var(--shell-muted-2)", fontSize: 10 }}
            tickFormatter={(d: string) => d.slice(5)}
            interval={Math.floor(holdout.length / 8)}
          />
          <YAxis
            stroke="var(--shell-border-2)"
            tick={{ fill: "var(--shell-muted-2)", fontSize: 10 }}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            width={55}
          />
          <Tooltip
            contentStyle={{
              background: "var(--shell-card)",
              border: "1px solid var(--shell-border)",
              borderRadius: "8px",
              color: "var(--shell-text)",
              fontSize: "12px",
            }}
            formatter={(value, name) => [
              `$${(value as number).toFixed(2)}/bbl`,
              String(name) === "actual"
                ? "Actual"
                : String(name) === "predicted"
                  ? "Predicted"
                  : "Baseline",
            ]}
            labelFormatter={(label) => `Date: ${String(label)}`}
          />
          <Legend
            wrapperStyle={{
              fontSize: "11px",
              color: "var(--shell-muted)",
              cursor: "pointer",
            }}
            formatter={(value: string) =>
              value === "actual"
                ? "Actual Price"
                : value === "predicted"
                  ? "Predicted Price"
                  : "Baseline (LastPrice)"
            }
            onClick={(payload) => handleLegendClick(payload as { dataKey?: string })}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#22C55E"
            strokeWidth={2}
            dot={false}
            hide={hiddenLines.has("actual")}
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#FBCE07"
            strokeWidth={2}
            dot={false}
            hide={hiddenLines.has("predicted")}
          />
          <Line
            type="monotone"
            dataKey="baseline"
            stroke="#64748B"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            hide={hiddenLines.has("baseline")}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Error Analysis Row */}
      {errorStats && (
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-3 text-center">
            <p className="text-[0.55rem] text-[var(--shell-muted-3)] uppercase tracking-wider mb-1">
              Within $2/bbl
            </p>
            <p className="text-lg font-extrabold text-[#22C55E]">
              {errorStats.within2Pct}%
            </p>
            <p className="text-[0.55rem] text-[var(--shell-muted-3)]">of test days</p>
          </div>
          <div className="bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-3 text-center">
            <p className="text-[0.55rem] text-[var(--shell-muted-3)] uppercase tracking-wider mb-1">
              Largest Miss
            </p>
            <p className="text-lg font-extrabold text-[#EF4444]">
              ${errorStats.maxError}
            </p>
            <p className="text-[0.55rem] text-[var(--shell-muted-3)]">
              {errorStats.maxErrorDate}
            </p>
          </div>
          <div className="bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-3 text-center">
            <p className="text-[0.55rem] text-[var(--shell-muted-3)] uppercase tracking-wider mb-1">
              Direction Accuracy
            </p>
            <p className="text-lg font-extrabold text-[#A78BFA]">
              {errorStats.dirAccuracy}%
            </p>
            <p className="text-[0.55rem] text-[var(--shell-muted-3)]">
              correct next-day move
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
