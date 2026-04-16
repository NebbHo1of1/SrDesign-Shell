/* ── SIGNAL — Command Palette (⌘K) ────────────────────────────────────
   Global search + quick navigation overlay. Press ⌘K / Ctrl+K to open.
   Search headlines, navigate pages, or run quick actions.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Newspaper,
  TrendingUp,
  BarChart3,
  Brain,
  Zap,
  Settings,
  RefreshCw,
  LogOut,
  Command,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { accessiblePaths } from "@/lib/permissions";
import { api, type Headline } from "@/lib/api";

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: "navigation" | "action" | "headline";
}

const PAGE_ICONS: Record<string, React.ReactNode> = {
  "/dashboard": <LayoutDashboard className="w-4 h-4" />,
  "/dashboard/feed": <Newspaper className="w-4 h-4" />,
  "/dashboard/commodity": <TrendingUp className="w-4 h-4" />,
  "/dashboard/analytics": <BarChart3 className="w-4 h-4" />,
  "/dashboard/model": <Brain className="w-4 h-4" />,
  "/dashboard/signals": <Zap className="w-4 h-4" />,
  "/dashboard/settings": <Settings className="w-4 h-4" />,
};

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Command Center",
  "/dashboard/feed": "Intelligence Feed",
  "/dashboard/commodity": "Commodity View",
  "/dashboard/analytics": "Data Analytics",
  "/dashboard/model": "AI Model",
  "/dashboard/signals": "Signal Engine",
  "/dashboard/settings": "Settings & Profile",
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const allowed = user ? accessiblePaths(user.role) : new Set<string>();

  // Fetch headlines once for search
  useEffect(() => {
    if (open && headlines.length === 0) {
      api.headlines("WTI", 100).then(setHeadlines).catch(() => {});
    }
  }, [open, headlines.length]);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build items list
  const items = useMemo<PaletteItem[]>(() => {
    const result: PaletteItem[] = [];

    // Navigation items
    for (const [path, label] of Object.entries(PAGE_LABELS)) {
      if (!allowed.has(path)) continue;
      if (path === pathname) continue; // don't show current page
      result.push({
        id: `nav-${path}`,
        label,
        description: `Navigate to ${label}`,
        icon: PAGE_ICONS[path] || <LayoutDashboard className="w-4 h-4" />,
        action: () => { router.push(path); setOpen(false); },
        category: "navigation",
      });
    }

    // Actions
    result.push({
      id: "action-refresh",
      label: "Refresh Data",
      description: "Re-seed and refresh all dashboard data",
      icon: <RefreshCw className="w-4 h-4" />,
      action: () => { api.seed().then(() => window.location.reload()).catch(() => {}); setOpen(false); },
      category: "action",
    });

    result.push({
      id: "action-logout",
      label: "Sign Out",
      description: "Log out of SIGNAL",
      icon: <LogOut className="w-4 h-4" />,
      action: () => { logout(); setOpen(false); },
      category: "action",
    });

    // Headlines (search results)
    if (query.length >= 2) {
      const q = query.toLowerCase();
      const matching = headlines
        .filter((h) => h.title.toLowerCase().includes(q))
        .slice(0, 5);
      for (const h of matching) {
        result.push({
          id: `headline-${h.id}`,
          label: h.title,
          description: `${h.source} · ${h.event_type} · ${h.pred_label}`,
          icon: <Newspaper className="w-4 h-4" />,
          action: () => { window.open(h.url, "_blank"); setOpen(false); },
          category: "headline",
        });
      }
    }

    return result;
  }, [allowed, pathname, query, headlines, router, logout]);

  // Filter by query
  const filtered = useMemo(() => {
    if (!query) return items.filter((i) => i.category !== "headline");
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filtered[selected]) {
        e.preventDefault();
        filtered[selected].action();
      }
    },
    [filtered, selected]
  );

  // Reset selection when filtered changes
  useEffect(() => {
    setSelected(0);
  }, [query]);

  if (!user) return null;

  const categoryLabels: Record<string, string> = {
    navigation: "Pages",
    action: "Actions",
    headline: "Headlines",
  };

  // Group items by category
  const grouped = filtered.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, PaletteItem[]>
  );

  let globalIndex = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50"
          >
            <div className="bg-[#0D1321] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1E293B]">
                <Search className="w-4 h-4 text-[#64748B] shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages, headlines, or actions…"
                  className="flex-1 bg-transparent text-sm text-[#F8FAFC] placeholder-[#475569] focus:outline-none"
                />
                <kbd className="hidden sm:inline text-[0.55rem] text-[#475569] bg-[#1A2234] px-1.5 py-0.5 rounded border border-[#1E293B]">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-y-auto py-2">
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Search className="w-6 h-6 text-[#334155] mx-auto mb-2" />
                    <p className="text-sm text-[#64748B]">No results found</p>
                  </div>
                ) : (
                  Object.entries(grouped).map(([category, categoryItems]) => (
                    <div key={category}>
                      <div className="px-4 py-1.5">
                        <span className="text-[0.6rem] font-bold tracking-[0.1em] text-[#475569] uppercase">
                          {categoryLabels[category] ?? category}
                        </span>
                      </div>
                      {categoryItems.map((item) => {
                        const idx = globalIndex++;
                        return (
                          <button
                            key={item.id}
                            onClick={item.action}
                            onMouseEnter={() => setSelected(idx)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              selected === idx
                                ? "bg-[#1E293B] text-[#F8FAFC]"
                                : "text-[#94A3B8] hover:bg-[#1E293B]/50"
                            }`}
                          >
                            <span className={selected === idx ? "text-[#38BDF8]" : "text-[#64748B]"}>
                              {item.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {item.label}
                              </p>
                              {item.description && (
                                <p className="text-[0.6rem] text-[#475569] truncate">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer hint */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[#1E293B] text-[0.55rem] text-[#475569]">
                <span className="flex items-center gap-1">
                  <kbd className="bg-[#1A2234] px-1 py-0.5 rounded border border-[#1E293B]">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-[#1A2234] px-1 py-0.5 rounded border border-[#1E293B]">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="bg-[#1A2234] px-1 py-0.5 rounded border border-[#1E293B]">ESC</kbd>
                  Close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
