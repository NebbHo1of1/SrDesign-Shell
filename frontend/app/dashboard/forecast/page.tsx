/* ── SIGNAL — Price Forecast Page ─────────────────────────────────────
   Price regression dashboard: live next-price prediction, RMSE/MAE/R²/MAPE
   metrics with baseline callouts, Actual vs. Predicted chart, and the full
   model comparison table.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  AlertCircle,
  Gauge,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import RoleGate from "@/components/RoleGate";
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
import { api, ModelReport, HoldoutPoint } from "@/lib/api";

const COMMODITIES = ["WTI", "BRENT"];

export default function ForecastPage() {
  const [commodity, setCommodity] = useState("WTI");
  const [report, setReport] = useState<ModelReport | null>(null);
  const [holdout, setHoldout] = useState<HoldoutPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    api
      .modelReport()
      .then(setReport)
      .catch((e: Error) => setError(e.message));

    api
      .holdoutPredictions()
      .then(setHoldout)
      .catch(() => {
        /* non-critical — chart will be hidden if no data */
      });
  }, []);

  /* Derive price forecast metrics */
  const priceRmse = report?.price_rmse;
  const priceMae = report?.price_mae;
  const priceR2 = report?.price_r2;
  const priceMape = report?.price_mape;
  const baselineRmse = report?.baseline_rmse;
  const baselineMae = report?.baseline_mae;
  const baselineR2 = report?.baseline_r2;
  const modelType = report?.price_model_type ?? "Regression";

  return (
    <RoleGate page="/dashboard/forecast">
      <div className="space-y-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-extrabold text-[var(--shell-text-bright)]">
            Price Forecast — $/bbl Regression
          </h1>
          <div className="flex items-center gap-2">
            {COMMODITIES.map((c) => (
              <button
                key={c}
                onClick={() => setCommodity(c)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-semibold ${
                  commodity === c
                    ? "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/40"
                    : "text-[var(--shell-muted-2)] border-[var(--shell-border)] hover:border-[var(--shell-border-2)]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Could not load model report: {error}</span>
          </div>
        )}

        {/* ── Live next-price prediction card ────────────────────────── */}
        {priceRmse != null && (
          <div className="bg-gradient-to-r from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
            <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-2">
              Price Forecast Model — {modelType} · {commodity}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <TrendingUp className="w-6 h-6 text-[#38BDF8]" />
              <span className="text-2xl font-extrabold text-[#38BDF8]">
                RMSE {priceRmse.toFixed(3)} $/bbl
              </span>
              {baselineRmse != null && priceRmse < baselineRmse && (
                <span className="text-[0.6rem] font-bold tracking-wide px-2 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
                  ✓ Beats random-walk baseline ({baselineRmse.toFixed(3)})
                </span>
              )}
              {priceMape != null && (
                <span className="text-[0.6rem] font-bold tracking-wide px-2 py-0.5 rounded-full bg-[#FBCE07]/10 text-[#FBCE07] border border-[#FBCE07]/20">
                  MAPE {priceMape.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Price Forecast Metrics row ──────────────────────────────── */}
        {priceRmse != null && (
          <div>
            <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-3)] uppercase mb-2">
              Holdout Test-Set Performance
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* RMSE */}
              <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
                <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-2">RMSE</p>
                <p className="text-2xl font-extrabold text-[#38BDF8]">{priceRmse.toFixed(3)}</p>
                {baselineRmse != null && priceRmse < baselineRmse && (
                  <p className="text-[0.58rem] text-[#22C55E] mt-1">
                    ✓ Beats baseline ({baselineRmse.toFixed(3)})
                  </p>
                )}
              </div>
              {/* MAE */}
              <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
                <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-2">MAE</p>
                <p className="text-2xl font-extrabold text-[#38BDF8]">{priceMae?.toFixed(3) ?? "—"}</p>
                {baselineMae != null && priceMae != null && (
                  <p className={`text-[0.58rem] mt-1 ${priceMae < baselineMae ? "text-[#22C55E]" : "text-[var(--shell-muted-3)]"}`}>
                    Baseline: {baselineMae.toFixed(3)}
                  </p>
                )}
              </div>
              {/* R² */}
              <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
                <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-2">R²</p>
                <p className="text-2xl font-extrabold text-[#22C55E]">
                  {priceR2 != null ? `${(priceR2 * 100).toFixed(1)}%` : "—"}
                </p>
                {baselineR2 != null && (
                  <p className="text-[0.58rem] text-[var(--shell-muted-3)] mt-1">
                    Baseline: {(baselineR2 * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              {/* MAPE */}
              <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
                <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-2">MAPE</p>
                <p className="text-2xl font-extrabold text-[#FBCE07]">
                  {priceMape != null ? `${priceMape.toFixed(2)}%` : "—"}
                </p>
                <p className="text-[0.58rem] text-[var(--shell-muted-3)] mt-1">Mean abs % error</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Actual vs. Predicted chart ──────────────────────────────── */}
        {holdout.length > 0 && (
          <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#38BDF8]" />
              <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
                Actual vs. Predicted — Holdout Test Set
              </span>
            </div>
            <p className="text-xs text-[var(--shell-muted-2)] mb-4">
              3-line overlay of actual closing prices, model predictions, and
              the naïve random-walk baseline over the held-out test period.
              Closer yellow line = better forecast accuracy.
            </p>
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
                  formatter={(value: number, name: string) => [
                    `$${value.toFixed(2)}/bbl`,
                    name === "actual"
                      ? "Actual"
                      : name === "predicted"
                        ? "Predicted"
                        : "Baseline",
                  ]}
                  labelFormatter={(label) => `Date: ${String(label)}`}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", color: "var(--shell-muted)" }}
                  formatter={(value: string) =>
                    value === "actual"
                      ? "Actual Price"
                      : value === "predicted"
                        ? "Predicted Price"
                        : "Baseline (LastPrice)"
                  }
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#22C55E"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#FBCE07"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="#64748B"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Summary cards */}
            {priceRmse != null && baselineRmse != null && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-3 text-center">
                  <p className="text-[0.55rem] text-[var(--shell-muted-3)] uppercase tracking-wider">Test Points</p>
                  <p className="text-lg font-extrabold text-[var(--shell-text-bright)]">{holdout.length}</p>
                </div>
                <div className="bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-3 text-center">
                  <p className="text-[0.55rem] text-[var(--shell-muted-3)] uppercase tracking-wider">Model RMSE</p>
                  <p className="text-lg font-extrabold text-[#38BDF8]">{priceRmse.toFixed(3)}</p>
                </div>
                <div className="bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-3 text-center">
                  <p className="text-[0.55rem] text-[var(--shell-muted-3)] uppercase tracking-wider">Baseline RMSE</p>
                  <p className={`text-lg font-extrabold ${priceRmse < baselineRmse ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                    {baselineRmse.toFixed(3)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Model Comparison Table ──────────────────────────────────── */}
        {report?.all_price_models != null && report.all_price_models.length > 0 && (
          <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl overflow-hidden">
            <button
              onClick={() => setShowComparison((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--shell-border)]/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#A78BFA]" />
                <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
                  Model Comparison — Price Forecast (Holdout Test)
                </span>
              </div>
              {showComparison
                ? <ChevronUp className="w-4 h-4 text-[var(--shell-muted-2)]" />
                : <ChevronDown className="w-4 h-4 text-[var(--shell-muted-2)]" />
              }
            </button>
            {showComparison && (
              <div className="px-5 pb-5 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--shell-border)]">
                      <th className="text-left py-2 pr-4 text-[var(--shell-muted-2)] font-bold uppercase tracking-wider">Model</th>
                      <th className="text-right py-2 px-3 text-[#38BDF8] font-bold uppercase tracking-wider">RMSE</th>
                      <th className="text-right py-2 px-3 text-[#38BDF8] font-bold uppercase tracking-wider">MAE</th>
                      <th className="text-right py-2 px-3 text-[#22C55E] font-bold uppercase tracking-wider">R²</th>
                      {report.all_price_models.some((m) => m.mape != null) && (
                        <th className="text-right py-2 px-3 text-[#FBCE07] font-bold uppercase tracking-wider">MAPE</th>
                      )}
                      <th className="text-right py-2 pl-3 text-[var(--shell-muted-2)] font-bold uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.all_price_models.map((m) => {
                      const isBaseline = m.is_baseline === true;
                      return (
                        <tr
                          key={m.name}
                          className={`border-b border-[var(--shell-border)]/50 last:border-0 ${
                            m.deployed ? "bg-[#38BDF8]/5" : ""
                          }`}
                        >
                          <td className="py-2.5 pr-4 font-medium text-[var(--shell-text)]">
                            {m.deployed && <span className="mr-1">★</span>}
                            {m.name}
                          </td>
                          <td className="text-right py-2.5 px-3 font-mono text-[var(--shell-text-bright)]">
                            {m.rmse.toFixed(3)}
                          </td>
                          <td className="text-right py-2.5 px-3 font-mono text-[var(--shell-text-bright)]">
                            {m.mae.toFixed(3)}
                          </td>
                          <td className="text-right py-2.5 px-3 font-mono text-[var(--shell-text-bright)]">
                            {(m.r2 * 100).toFixed(2)}%
                          </td>
                          {report.all_price_models!.some((x) => x.mape != null) && (
                            <td className="text-right py-2.5 px-3 font-mono text-[var(--shell-text-bright)]">
                              {m.mape != null ? `${m.mape.toFixed(2)}%` : "—"}
                            </td>
                          )}
                          <td className="text-right py-2.5 pl-3">
                            {m.deployed
                              ? <span className="text-[#22C55E] font-bold">✅ DEPLOYED</span>
                              : isBaseline
                                ? <span className="text-[var(--shell-muted)]">📊 Baseline</span>
                                : <span className="text-[var(--shell-muted-2)]">◻ Candidate</span>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="text-[0.6rem] text-[var(--shell-muted-3)] mt-3">
                  Lower RMSE / MAE and higher R² are better. Evaluated on held-out test data unseen during training.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
