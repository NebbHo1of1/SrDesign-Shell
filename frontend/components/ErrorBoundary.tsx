/* ── Error Boundary ────────────────────────────────────────────────────
   Catches rendering errors in the dashboard tree and displays a
   user-friendly fallback instead of a blank page.
   ──────────────────────────────────────────────────────────────────── */

"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[SIGNAL] Rendering error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-[#F59E0B] mb-4" />
          <h2 className="text-lg font-bold text-[#F8FAFC] mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-[#94A3B8] mb-4 max-w-md">
            A rendering error occurred. Check the browser console for details.
          </p>
          <pre className="text-xs text-[#EF4444] bg-[#0A0E17] border border-[#1E293B] rounded-lg p-4 max-w-lg overflow-auto">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 text-sm font-medium text-[#38BDF8] border border-[#38BDF8]/30 rounded-lg hover:bg-[#38BDF8]/10 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
