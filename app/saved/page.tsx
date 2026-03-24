"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, ArrowLeft } from "lucide-react";
import { useBookmarks } from "@/lib/useBookmarks";
import { IncentiveCard } from "@/components/IncentiveCard";
import type { Incentive } from "@/lib/types";

export default function SavedPage() {
  const { bookmarks } = useBookmarks();
  const [all, setAll] = useState<Incentive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/incentives?limit=500")
      .then((r) => r.json())
      .then((d) => {
        setAll(d.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const saved = all.filter((i) => bookmarks.includes(i.slug));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to browse
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <Bookmark size={22} className="text-brand-600" />
        <h1 className="text-2xl font-bold text-slate-900">Saved Programs</h1>
        {bookmarks.length > 0 && (
          <span className="badge bg-brand-100 text-brand-700 font-semibold">
            {bookmarks.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-52 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-20">
          <Bookmark size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg font-medium mb-2">
            No saved programs yet
          </p>
          <p className="text-slate-400 text-sm mb-6">
            Click the bookmark icon on any program card to save it here.
          </p>
          <Link href="/" className="btn-primary">
            Browse Programs
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {saved.map((incentive) => (
            <IncentiveCard key={incentive.slug} incentive={incentive} />
          ))}
        </div>
      )}
    </div>
  );
}
