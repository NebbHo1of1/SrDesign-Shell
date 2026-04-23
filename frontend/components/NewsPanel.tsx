/* ── SIGNAL — News Panel ──────────────────────────────────────────────
   Real-time headline feed with sentiment tags, impact indicators,
   and prediction badges. Clickable to open source content.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import type { Headline } from "@/lib/api";
import {
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface Props {
  headlines: Headline[];
  loading: boolean;
}

function sentimentTag(score: number) {
  if (score > 0.15)
    return {
      label: "Positive",
      cls: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30",
    };
  if (score < -0.15)
    return {
      label: "Negative",
      cls: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30",
    };
  return {
    label: "Neutral",
    cls: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
  };
}

function PredBadge({ label }: { label: string }) {
  const cfg =
    label === "UP"
      ? {
          icon: <TrendingUp className="w-3 h-3" />,
          cls: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30",
        }
      : label === "DOWN"
        ? {
            icon: <TrendingDown className="w-3 h-3" />,
            cls: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30",
          }
        : {
            icon: <Minus className="w-3 h-3" />,
            cls: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
          };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[0.6rem] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}
    >
      {cfg.icon}
      {label}
    </span>
  );
}

export default function NewsPanel({ headlines, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5 h-full animate-pulse">
        <div className="h-4 w-32 bg-[var(--shell-border-2)] rounded mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-[var(--shell-border)] rounded-lg mb-2" />
        ))}
      </div>
    );
  }

  const items = headlines.slice(0, 8);

  return (
    <div className="bg-gradient-to-br from-[var(--shell-card)] to-[var(--shell-border)] border border-[var(--shell-border)] rounded-xl p-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[0.65rem] font-bold tracking-[0.1em] text-[var(--shell-muted-2)] uppercase">
          Intelligence Feed
        </span>
        <span className="flex items-center gap-1.5 text-[0.6rem] text-[#22C55E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse-dot" />
          Live
        </span>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-[var(--shell-muted-2)] text-center py-8">
          No headlines available. Seed the database via POST /seed.
        </p>
      )}

      {/* Headline list */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {items.map((h) => {
          const sent = sentimentTag(h.sentiment_score);
          const impactClass =
            h.impact_score >= 70
              ? "text-[#EF4444]"
              : h.impact_score >= 40
                ? "text-[#F59E0B]"
                : "text-[#22C55E]";

          return (
            <a
              key={h.id}
              href={h.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-[var(--shell-bg)]/50 border border-[var(--shell-border)] rounded-lg p-3 hover:border-[#38BDF8]/50 transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--shell-text-bright)] font-semibold leading-snug line-clamp-2 group-hover:text-[#38BDF8] transition-colors">
                    {h.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[0.6rem] text-[var(--shell-muted-3)]">
                      {h.source}
                    </span>
                    <span className="text-[0.6rem] text-[var(--shell-border-2)]">•</span>
                    <span className="text-[0.6rem] text-[var(--shell-muted-3)]">
                      {h.event_type}
                    </span>
                    <span className="text-[0.6rem] text-[var(--shell-border-2)]">•</span>
                    <span className={`text-[0.6rem] font-semibold ${impactClass}`}>
                      Impact {h.impact_score.toFixed(0)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <PredBadge label={h.pred_label} />
                  <span
                    className={`text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full border ${sent.cls}`}
                  >
                    {sent.label}
                  </span>
                </div>
              </div>

              {/* Sentiment bar */}
              <div className="mt-2 h-[3px] bg-[var(--shell-border)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.max(5, ((h.sentiment_score + 1) / 2) * 100)}%`,
                    background:
                      h.sentiment_score > 0.15
                        ? "#22C55E"
                        : h.sentiment_score < -0.15
                          ? "#EF4444"
                          : "#F59E0B",
                  }}
                />
              </div>

              {/* External link hint */}
              <ExternalLink className="w-3 h-3 text-[var(--shell-border-2)] group-hover:text-[#38BDF8] absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
