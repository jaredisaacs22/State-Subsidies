"use client";

import { useState, useEffect, useCallback } from "react";
import { LogoMark } from "@/components/Logo";

interface Event {
  type: string;
  vid: string;
  page: string;
  ref: string;
  ts: number;
  q?: string;
}

interface Stats {
  totalEvents: number;
  uniqueVisitors: number;
  topPages: [string, number][];
  topRefs: [string, number][];
  topQueries: [string, number][];
  eventsByType: Record<string, number>;
  recentEvents: Event[];
  hourlyBuckets: { hour: string; count: number }[];
}

function computeStats(events: Event[], queries: Event[]): Stats {
  const allEvents = [...events];
  const uniqueVids = new Set(allEvents.map((e) => e.vid));

  const pageCounts: Record<string, number> = {};
  const refCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const queryCounts: Record<string, number> = {};

  for (const e of allEvents) {
    pageCounts[e.page] = (pageCounts[e.page] || 0) + 1;
    refCounts[e.ref] = (refCounts[e.ref] || 0) + 1;
    typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
  }
  for (const q of queries) {
    if (q.q) queryCounts[q.q] = (queryCounts[q.q] || 0) + 1;
  }

  const sortPairs = (obj: Record<string, number>) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 10) as [string, number][];

  // Last 24 hours bucketed by hour
  const now = Date.now();
  const hourMs = 3600000;
  const buckets: Record<string, number> = {};
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now - i * hourMs);
    const key = `${d.getHours()}:00`;
    buckets[key] = 0;
  }
  for (const e of allEvents) {
    const age = now - Number(e.ts);
    if (age < 24 * hourMs) {
      const d = new Date(Number(e.ts));
      const key = `${d.getHours()}:00`;
      if (key in buckets) buckets[key]++;
    }
  }

  return {
    totalEvents: allEvents.length,
    uniqueVisitors: uniqueVids.size,
    topPages: sortPairs(pageCounts),
    topRefs: sortPairs(refCounts),
    topQueries: sortPairs(queryCounts),
    eventsByType: typeCounts,
    recentEvents: allEvents.slice(0, 20),
    hourlyBuckets: Object.entries(buckets).map(([hour, count]) => ({ hour, count })),
  };
}

function BarChart({ data }: { data: { hour: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-20 w-full">
      {data.map((d) => (
        <div key={d.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full bg-blue-500 rounded-sm transition-all group-hover:bg-blue-400"
            style={{ height: `${Math.max(2, (d.count / max) * 72)}px` }}
          />
          <span className="absolute -top-5 text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 whitespace-nowrap">
            {d.hour}: {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-800">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function Table({ rows, cols }: { rows: [string, number][]; cols: [string, string] }) {
  if (!rows.length) return <p className="text-sm text-slate-400">No data</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100">
          <th className="text-left py-1.5 text-xs text-slate-400 font-semibold uppercase tracking-widest">{cols[0]}</th>
          <th className="text-right py-1.5 text-xs text-slate-400 font-semibold uppercase tracking-widest">{cols[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-b border-slate-50 hover:bg-slate-50">
            <td className="py-1.5 text-slate-700 truncate max-w-[200px]">{k || "(none)"}</td>
            <td className="py-1.5 text-right font-mono text-slate-500">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function DashboardPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [upstashMissing, setUpstashMissing] = useState(false);

  const fetchData = useCallback(async (s: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analytics", {
        headers: { "x-dashboard-secret": s },
      });
      if (res.status === 401) { setError("Invalid secret"); setAuthed(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error === 'Upstash not configured') setUpstashMissing(true);
      setStats(computeStats(data.events ?? [], data.queries ?? []));
      setAuthed(true);
      setLastFetch(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(secret);
  };

  // Auto-refresh every 60s when authed
  useEffect(() => {
    if (!authed) return;
    const id = setInterval(() => fetchData(secret), 60000);
    return () => clearInterval(id);
  }, [authed, secret, fetchData]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-sm shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <LogoMark height={32} />
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Analytics</p>
              <p className="text-slate-800 font-bold">Dashboard</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              placeholder="Dashboard secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !secret}
              className="w-full bg-slate-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Loading…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoMark height={28} />
          <span className="font-semibold text-slate-800">Analytics Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          {lastFetch && (
            <span className="text-xs text-slate-400">
              Updated {lastFetch.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchData(secret)}
            disabled={loading}
            className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {upstashMissing && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-sm text-amber-800">
          <strong>Upstash not connected.</strong> Analytics will show empty until{" "}
          <code className="bg-amber-100 px-1 rounded">UPSTASH_REDIS_REST_URL</code> and{" "}
          <code className="bg-amber-100 px-1 rounded">UPSTASH_REDIS_REST_TOKEN</code> are added to Vercel environment variables.
        </div>
      )}

      {stats && (
        <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Events" value={stats.totalEvents} sub="last 2000 events stored" />
            <StatCard label="Unique Visitors" value={stats.uniqueVisitors} />
            <StatCard label="Page Views" value={stats.eventsByType["pageview"] ?? 0} />
            <StatCard label="Searches" value={stats.topQueries.reduce((s, [, v]) => s + v, 0)} />
          </div>

          {/* Hourly chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Activity — Last 24 Hours</p>
            <BarChart data={stats.hourlyBuckets} />
            <div className="flex justify-between text-[10px] text-slate-300 mt-2">
              <span>{stats.hourlyBuckets[0]?.hour}</span>
              <span>Now</span>
            </div>
          </div>

          {/* Tables row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Top Pages</p>
              <Table rows={stats.topPages} cols={["Page", "Views"]} />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Top Referrers</p>
              <Table rows={stats.topRefs} cols={["Source", "Visits"]} />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Top Searches</p>
              <Table rows={stats.topQueries} cols={["Query", "Count"]} />
            </div>
          </div>

          {/* Event type breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Event Types</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.eventsByType).map(([type, count]) => (
                <div key={type} className="bg-slate-50 rounded-lg px-4 py-2 text-sm">
                  <span className="text-slate-500">{type}: </span>
                  <span className="font-bold text-slate-800">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent events */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Recent Events</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Time", "Type", "Page", "Visitor", "Referrer", "Query"].map((h) => (
                      <th key={h} className="text-left py-1.5 pr-4 text-slate-400 font-semibold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentEvents.map((e, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-1.5 pr-4 text-slate-400 whitespace-nowrap">
                        {new Date(Number(e.ts)).toLocaleTimeString()}
                      </td>
                      <td className="py-1.5 pr-4">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          e.type === "pageview" ? "bg-blue-50 text-blue-600" :
                          e.type === "query" ? "bg-green-50 text-green-600" :
                          "bg-slate-100 text-slate-500"
                        }`}>{e.type}</span>
                      </td>
                      <td className="py-1.5 pr-4 text-slate-600 max-w-[160px] truncate">{e.page}</td>
                      <td className="py-1.5 pr-4 font-mono text-slate-400">{e.vid.slice(0, 8)}…</td>
                      <td className="py-1.5 pr-4 text-slate-400 max-w-[120px] truncate">{e.ref}</td>
                      <td className="py-1.5 text-slate-500 italic">{e.q ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
