/* ── SIGNAL — Analytics Page ──────────────────────────────────────────
   Data analytics: prediction distribution, event type breakdown,
   live model KPIs from /model-report, Power BI embed placeholder.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type Headline, type ModelReport } from "@/lib/api";
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
import { BarChart3, PieChart as PieIcon } from "lucide-react";

const EVENT_COLORS: Record<string, string> = {
  Geopolitics: "#EF4444",
  Supply: "#F59E0B",
  Demand: "#22C55E",
  Macro: "#38BDF8",
  Weather: "#06B6D4",
  Regulatory: "#A78BFA",
  Other: "#94A3B8",
};

export default function AnalyticsPage() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [report, setReport] = useState<ModelReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .headlines("WTI", 200)
      .then(setHeadlines)
      .catch(() => [])
      .finally(() => setLoading(false));

    api.modelReport().then(setReport).catch(() => {});
  }, []);

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
    color: EVENT_COLORS[type] ?? "#94A3B8",
  }));

  const predColors: Record<string, string> = {
    UP: "#22C55E",
    DOWN: "#EF4444",
    NEUTRAL: "#F59E0B",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold text-[#F8FAFC]">
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
            className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5"
          >
            <p className="text-[0.6rem] font-bold tracking-[0.1em] text-[#64748B] uppercase mb-2">
              {m.label}
            </p>
            <p className={`text-2xl font-extrabold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prediction distribution */}
        <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-[#38BDF8]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
              Prediction Distribution
            </span>
          </div>
          {loading ? (
            <div className="h-48 bg-[#0A0E17]/50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={predData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  dataKey="label"
                  stroke="#334155"
                  tick={{ fill: "#64748B", fontSize: 11 }}
                />
                <YAxis
                  stroke="#334155"
                  tick={{ fill: "#64748B", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1A2234",
                    border: "1px solid #1E293B",
                    borderRadius: "8px",
                    color: "#E2E8F0",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {predData.map((d) => (
                    <Cell key={d.label} fill={predColors[d.label] ?? "#94A3B8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Event type donut */}
        <div className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-[#FBCE07]" />
            <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[#64748B] uppercase">
              Event Type Breakdown
            </span>
          </div>
          {loading ? (
            <div className="h-48 bg-[#0A0E17]/50 rounded-lg animate-pulse" />
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
                    background: "#1A2234",
                    border: "1px solid #1E293B",
                    borderRadius: "8px",
                    color: "#E2E8F0",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {eventData.map((d) => (
              <div key={d.type} className="flex items-center gap-1.5 text-[0.6rem] text-[#94A3B8]">
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

      {/* Power BI Embed Placeholder */}
      <motion.div
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#1A2234] to-[#1E293B] border border-[#1E293B] rounded-xl p-8 text-center"
      >
        <div className="text-[0.65rem] font-bold tracking-[0.1em] text-[#FBCE07] uppercase mb-2">
          Power BI Embedded Analytics
        </div>
        <p className="text-sm text-[#64748B] mb-4">
          Advanced correlation dashboards, historical trend analysis, and
          executive reporting are rendered via embedded Power BI visuals.
        </p>
        <div className="h-64 bg-[#0A0E17]/80 border border-dashed border-[#334155] rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-8 h-8 text-[#334155] mx-auto mb-2" />
            <p className="text-xs text-[#475569]">
              Power BI Dashboard Embed Area
            </p>
            <p className="text-[0.55rem] text-[#334155] mt-1">
              Configure POWER_BI_EMBED_URL in environment
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
