/* ── SIGNAL — Analytics Page ──────────────────────────────────────────
   Data analytics: prediction distribution, event type breakdown,
   live model KPIs from /model-report, Power BI embed placeholder.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type Headline, type ModelReport } from "@/lib/api";
import RoleGate from "@/components/RoleGate";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { BarChart3, PieChart as PieIcon, AlertTriangle, RefreshCw } from "lucide-react";

const EVENT_COLORS: Record<string, string> = {
  Geopolitics: "#EF4444",
  Supply: "#F59E0B",
  Demand: "#22C55E",
  Macro: "#38BDF8",
  Weather: "#06B6D4",
  Regulatory: "#A78BFA",
  Other: "var(--shell-muted)",
};

export default function AnalyticsPage() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [report, setReport] = useState<ModelReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .headlines("WTI", 200)
      .then(setHeadlines)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load data");
      })
      .finally(() => setLoading(false));

    api.modelReport().then(setReport).catch(() => {});
  }, [retryKey]);

  /* Derive KPI values from the trained model report */
  const accuracy = report
    ? `${(report.test_accuracy * 100).toFixed(1)}%`
    : "—";
  const precision = report
    ? report.classification_metrics.precision.toFixed(2)
    : "—";
  const recall = report
    ? report.classification_metrics.recall.toFixed(2)
    : "—";
  const f1 = report
    ? report.classification_metrics.f1_score.toFixed(2)
    : "—";

  // Prediction distribution
  const predCounts = headlines.reduce(
    (acc, h) => {
      acc[h.pred_label] = (acc[h.pred_label] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const predData = Object.entries(predCounts).map(([label, count]) => ({
    label,
    count,
  }));

  // Event type distribution
  const eventCounts = headlines.reduce(
    (acc, h) => {
      acc[h.event_type] = (acc[h.event_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const eventData = Object.entries(eventCounts).map(([type, count]) => ({
    type,
    count,
    color: EVENT_COLORS[type] ?? "var(--shell-muted)",
  }));

  const predColors: Record<string, string> = {
    UP: "#22C55E",
    DOWN: "#EF4444",
    NEUTRAL: "#F59E0B",
  };

  return (
    <RoleGate page="/dashboard/analytics">
    <div className="space-y-6">
      {/* ── Error Banner ─────────────────────────────────────── */}
      {error && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#EF4444]">Unable to load data</p>
            <p className="text-xs text-[#F87171] mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setRetryKey((n) => n + 1)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--shell-text-bright)] bg-[#EF4444]/20 hover:bg-[#EF4444]/30 border border-[#EF4444]/40 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Retry
          </button>
        </div>
      )}

      <h1 className="text-xl font-extrabold text-[var(--shell-text-bright)]">
        Data Analytics
      </h1>

      {/* Model metrics KPIs — live from /model-report */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Model Accuracy", value: accuracy, color: "text-[#22C55E]" },
          { label: "Precision", value: precision, color: "text-[#38BDF8]" },
          { label: "Recall", value: recall, color: "text-[#FBCE07]" },
          { label: "F1 Score", value: f1, color: "text-[#A78BFA]" },
        ].map((m) => (
          <div
            key={m.label}
            className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5"
          >
            <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase mb-2">
              {m.label}
            </p>
            <p className={`text-2xl font-extrabold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prediction distribution */}
        <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#38BDF8]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
              Prediction Distribution
            </span>
          </div>
          {loading ? (
            <div className="h-48 bg-[var(--shell-bg)]/50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={predData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--shell-border)" />
                <XAxis
                  dataKey="label"
                  stroke="var(--shell-border-2)"
                  tick={{ fill: "var(--shell-muted-2)", fontSize: 11 }}
                />
                <YAxis
                  stroke="var(--shell-border-2)"
                  tick={{ fill: "var(--shell-muted-2)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--shell-card)",
                    border: "1px solid var(--shell-border)",
                    borderRadius: "8px",
                    color: "var(--shell-text)",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {predData.map((d) => (
                    <Cell key={d.label} fill={predColors[d.label] ?? "var(--shell-muted)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Event type donut */}
        <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-[#FBCE07]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
              Event Type Breakdown
            </span>
          </div>
          {loading ? (
            <div className="h-48 bg-[var(--shell-bg)]/50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={eventData}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {eventData.map((d) => (
                    <Cell key={d.type} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--shell-card)",
                    border: "1px solid var(--shell-border)",
                    borderRadius: "8px",
                    color: "var(--shell-text)",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {eventData.map((d) => (
              <div key={d.type} className="flex items-center gap-1.5 text-[0.6rem] text-[var(--shell-muted)]">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: d.color }}
                />
                {d.type}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Power BI Embedded Analytics */}
      <motion.div
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-8 text-center"
      >
        <div className="text-[0.65rem] font-bold tracking-[0.1em] text-[#FBCE07] uppercase mb-2">
          Power BI Embedded Analytics
        </div>
        <p className="text-sm text-[var(--shell-muted-2)] mb-4">
          Advanced correlation dashboards, historical trend analysis, and
          executive reporting are rendered via embedded Power BI visuals.
        </p>
        <iframe
          title="Power BI Report"
          src="https://app.powerbi.com/reportEmbed?reportId=1dd4d8e9-c9b0-4d7c-b527-5838cd218b5a&autoAuth=true&ctid=f48da9de-989b-4b23-8a82-d9206b7d33d3"
          className="h-[600px] w-full rounded-lg border-0"
          allowFullScreen
        />
      </motion.div>
    </div>
    </RoleGate>
  );
}
