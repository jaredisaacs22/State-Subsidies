"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const PLACEHOLDER_EXAMPLES = [
  "EV charging grants in California",
  "open a restaurant in Texas",
  "solar installation rebates for small business",
  "manufacturing tax credits",
  "workforce training programs in Ohio",
  "agriculture loans for beginning farmers",
];

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder, className }: SearchBarProps) {
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    if (placeholder) return; // use static placeholder if provided
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [placeholder]);

  const activePlaceholder = placeholder ?? PLACEHOLDER_EXAMPLES[placeholderIdx];

  return (
    <div className={cn("relative", className)}>
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={activePlaceholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pl-11 pr-10 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-700/30 focus:border-slate-700 transition-shadow"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
