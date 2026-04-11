/* ── SIGNAL — Intelligence Feed Page ──────────────────────────────────
   Full-screen headline browser with filtering, sentiment tags, and
   prediction badges. Essentially an expanded version of the News Panel.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, type Headline } from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Search,
  Filter,
} from "lucide-react";

const EVENT_TYPES = [
  "All",
  "Geopolitics",
  "Supply",
  "Demand",
  "Macro",
  "Weather",
  "Regulatory",
];

function sentimentColor(score: number) {
  return score > 0.15
    ? "text-[#22C55E]"
    : score < -0.15
      ? "text-[#EF4444]"
      : "text-[#F59E0B]";
}

export default function FeedPage() {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .headlines("WTI", 200)
      .then(setHeadlines)
      .catch(() => setHeadlines([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = headlines.filter((h) => {
    if (filter !== "All" && h.event_type !== filter) return false;
    if (search && !h.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-[#F8FAFC]">
          Intelligence Feed
        </h1>
        <span className="flex items-center gap-1.5 text-[0.6rem] text-[#22C55E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse-dot" />
          Live
        </span>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search headlines…"
            className="w-full bg-[#0A0E17] border border-[#1E293B] rounded-lg pl-9 pr-4 py-2 text-sm text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#38BDF8] transition-colors"
          />
        </div>

        {/* Event type filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-[#475569]" />
          {EVENT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                filter === t
                  ? "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/40"
                  : "text-[#64748B] border-[#1E293B] hover:border-[#334155]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Headlines grid */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-[#1A2234] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-[#64748B] py-10">No headlines match your filters.</p>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          className="space-y-2"
        >
          {filtered.map((h) => (
            <motion.a
              key={h.id}
              href={h.url}
              target="_blank"
              rel="noopener noreferrer"
              variants={{
                hidden: { opacity: 1, y: 0 },
                show: { opacity: 1, y: 0 },
              }}
              className="block bg-[#1A2234] border border-[#1E293B] rounded-xl p-4 hover:border-[#38BDF8]/40 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#F8FAFC] group-hover:text-[#38BDF8] transition-colors line-clamp-2">
                    {h.title}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[0.65rem] text-[#475569]">
                    <span>{h.source}</span>
                    <span>{h.event_type}</span>
                    <span
                      className={`font-semibold ${
                        h.impact_score >= 70
                          ? "text-[#EF4444]"
                          : h.impact_score >= 40
                            ? "text-[#F59E0B]"
                            : "text-[#22C55E]"
                      }`}
                    >
                      Impact {h.impact_score.toFixed(0)}
                    </span>
                    <span className={sentimentColor(h.sentiment_score)}>
                      Sentiment {h.sentiment_score > 0 ? "+" : ""}
                      {h.sentiment_score.toFixed(3)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 text-[0.6rem] font-bold px-2 py-0.5 rounded-full border ${
                      h.pred_label === "UP"
                        ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30"
                        : h.pred_label === "DOWN"
                          ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30"
                          : "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30"
                    }`}
                  >
                    {h.pred_label === "UP" ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : h.pred_label === "DOWN" ? (
                      <TrendingDown className="w-3 h-3" />
                    ) : (
                      <Minus className="w-3 h-3" />
                    )}
                    {h.pred_label}
                  </span>
                  <span className="text-[0.55rem] text-[#475569]">
                    {(h.pred_confidence * 100).toFixed(0)}% conf
                  </span>
                  <ExternalLink className="w-3 h-3 text-[#334155] group-hover:text-[#38BDF8] transition-colors" />
                </div>
              </div>
            </motion.a>
          ))}
        </motion.div>
      )}
    </div>
  );
}
