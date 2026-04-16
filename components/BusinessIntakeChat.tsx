"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Search, X, RotateCcw, ChevronDown, ChevronUp, ExternalLink, Sparkles, Zap, Target, AlertCircle } from "lucide-react";
import { cn, formatCurrency, formatDeadline, sourceRedirectUrl } from "@/lib/utils";
import { INCENTIVE_TYPE_COLORS, JURISDICTION_COLORS } from "@/lib/types";
import { LogoMark } from "@/components/Logo";
import type { Incentive } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type ChatMode = "quick" | "tailored" | null;

const STORAGE_KEY = "ss_chat_v1";

// ── Expertise scoring ──────────────────────────────────────────────────────────
const EXPERT_TERMS = [
  "ira", "sbir", "sttr", "reap", "eqip", "section 48", "section 45", "section 25c",
  "tax equity", "credit monetization", "transferability", "direct pay", "bonus depreciation",
  "179d", "nevi", "dera", "sgip", "hvip", "wazip", "macrs", "prevailing wage",
  "energy community", "domestic content", "low-income community", "standalone storage",
];
const INTERMEDIATE_TERMS = [
  "tax credit", "grant", "loan", "deduction", "rebate", "subsidy", "voucher",
  "roi", "capex", "opex", "eligible", "jurisdiction", "federal", "state program",
  "nonprofit", "501c3", "llc", "s-corp", "c-corp", "compliance", "matching funds",
];

function scoreExpertise(msgs: string[]): "expert" | "intermediate" | "beginner" {
  const combined = msgs.join(" ").toLowerCase();
  const expertScore = EXPERT_TERMS.filter((t) => combined.includes(t)).length;
  const interScore = INTERMEDIATE_TERMS.filter((t) => combined.includes(t)).length;
  if (expertScore >= 2) return "expert";
  if (expertScore >= 1 || interScore >= 3) return "intermediate";
  return "beginner";
}

const FOLLOW_UPS_EXPERT = [
  "What's the prevailing wage requirement?",
  "Are these transferable or direct pay eligible?",
  "Show programs with domestic content adder",
];
const FOLLOW_UPS_INTERMEDIATE = [
  "How do I apply for the top match?",
  "What documents will I need?",
  "Show me federal grants only",
];
const FOLLOW_UPS_BEGINNER = [
  "Which is easiest to apply for?",
  "How much money could I get?",
  "Walk me through the next step",
];

function getFollowUps(expertise: "expert" | "intermediate" | "beginner") {
  if (expertise === "expert") return FOLLOW_UPS_EXPERT;
  if (expertise === "intermediate") return FOLLOW_UPS_INTERMEDIATE;
  return FOLLOW_UPS_BEGINNER;
}

// ── Message renderer ───────────────────────────────────────────────────────────
function MessageContent({ text, streaming }: { text: string; streaming?: boolean }) {
  if (!text && streaming) return <span className="typing-cursor text-white/40 text-sm" />;
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const renderInline = (str: string) =>
          str.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
            p.startsWith("**") && p.endsWith("**")
              ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>
              : <span key={j}>{p}</span>
          );
        if (trimmed.startsWith("- ") || trimmed.startsWith("• "))
          return <div key={i} className="flex gap-2"><span className="text-forest-400 mt-0.5 flex-shrink-0">•</span><span>{renderInline(trimmed.slice(2))}</span></div>;
        if (!trimmed) return <div key={i} className="h-1.5" />;
        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
      {streaming && text && <span className="typing-cursor" />}
    </div>
  );
}

function getMatchTag(inc: Incentive): string {
  const typeLabel: Record<string, string> = {
    GRANT: "Grant", TAX_CREDIT: "Tax credit", LOAN: "Low-interest loan",
    POINT_OF_SALE_REBATE: "Instant rebate", VOUCHER: "Equipment voucher", SUBSIDY: "Subsidy",
  };
  const scope = inc.jurisdictionLevel === "FEDERAL" ? "Federal" : inc.jurisdictionName;
  return [typeLabel[inc.incentiveType] ?? inc.incentiveType, scope, inc.industryCategories[0] ?? ""].filter(Boolean).join(" · ");
}

function MatchedCard({ inc }: { inc: Incentive }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap gap-1">
            <span className={cn("badge text-[10px] py-0", INCENTIVE_TYPE_COLORS[inc.incentiveType])}>{inc.incentiveType.replace(/_/g, " ")}</span>
            <span className={cn("badge text-[10px] py-0", JURISDICTION_COLORS[inc.jurisdictionLevel])}>{inc.jurisdictionLevel}</span>
          </div>
          {inc.fundingAmount && <span className="text-emerald-700 font-bold text-sm whitespace-nowrap flex-shrink-0">{formatCurrency(inc.fundingAmount)}</span>}
        </div>
        <a href={`/incentives/${inc.slug}`} className="font-semibold text-slate-900 hover:text-forest-700 transition-colors line-clamp-2 block mb-1 text-[13px] leading-snug">{inc.title}</a>
        <p className="text-slate-400 text-[11px]">{inc.managingAgency} · {inc.jurisdictionName}</p>
        <p className="text-[10px] text-forest-400/80 font-medium mt-1">{getMatchTag(inc)}</p>
        {expanded && (
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
            <p className="text-slate-600 leading-relaxed">{inc.shortSummary}</p>
            {inc.keyRequirements.slice(0, 3).map((r, j) => (
              <div key={j} className="flex gap-1.5 text-slate-600"><span className="text-forest-600 mt-0.5 flex-shrink-0">•</span><span>{r}</span></div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400">{formatDeadline(inc.deadline)}</span>
              <a href={sourceRedirectUrl(inc)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-forest-700 hover:text-forest-800 font-semibold text-[11px]">Apply <ExternalLink size={10} /></a>
            </div>
          </div>
        )}
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="mt-2 flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors text-[11px]"
        >
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {expanded ? "Show less" : "Details & apply"}
        </button>
      </div>
    </div>
  );
}

// ── Keyword suggestions with synonym aliases ──────────────────────────────────
const SUGGESTIONS: { label: string; terms: string[] }[] = [
  // Industry categories — label is the canonical search term that returns most results
  { label: "Agriculture",           terms: ["farm", "farming", "crop", "livestock", "usda", "rural", "ranch", "food production", "agri"] },
  { label: "Clean Technology",      terms: ["solar", "wind", "renewable", "green energy", "clean energy", "photovoltaic", "battery storage", "geothermal", "biomass", "biofuel"] },
  { label: "Energy Management",     terms: ["energy efficiency", "hvac", "insulation", "utility", "electricity", "natural gas", "efficiency upgrade", "energy audit", "smart meter"] },
  { label: "EV Charging",           terms: ["electric vehicle", "ev", "charging station", "electric truck", "electric fleet", "zero emission", "carb", "evse"] },
  { label: "Manufacturing",         terms: ["factory", "production", "industrial", "fabrication", "machinery", "equipment", "assembly", "plant", "forge", "defense"] },
  { label: "Technology",            terms: ["software", "tech", "digital", "it", "cyber", "saas", "app", "ai", "machine learning", "data", "computer"] },
  { label: "Research & Development",terms: ["r&d", "research", "innovation", "sbir", "sttr", "prototype", "lab", "university", "science", "discovery", "testing"] },
  { label: "Healthcare",            terms: ["medical", "health", "hospital", "clinic", "biotech", "pharma", "life sciences", "telemedicine", "dental", "mental health"] },
  { label: "Real Estate",           terms: ["construction", "building", "property", "renovation", "rehab", "brownfield", "pace", "commercial real estate", "developer", "affordable housing"] },
  { label: "Education",             terms: ["school", "college", "university", "training", "workforce", "job training", "k-12", "childcare", "daycare", "stem"] },
  { label: "Hospitality",           terms: ["restaurant", "hotel", "tourism", "food service", "lodging", "travel", "events", "bar", "cafe", "brewery"] },
  { label: "Logistics",             terms: ["trucking", "freight", "distribution", "warehouse", "supply chain", "shipping", "fleet", "transport", "delivery"] },
  { label: "Finance",               terms: ["microloan", "cdfi", "credit union", "community bank", "capital access", "revolving loan", "investment", "equity"] },
  // Incentive types
  { label: "Grant",                 terms: ["free money", "award", "funding", "no repayment", "no payback"] },
  { label: "Tax Credit",            terms: ["tax break", "irs", "deduction", "section 48", "section 45", "179d", "credits", "return"] },
  { label: "Loan",                  terms: ["low interest", "financing", "sba loan", "below market", "debt", "borrow", "lend"] },
  { label: "Rebate",                terms: ["discount", "cashback", "instant rebate", "utility rebate", "point of sale"] },
  { label: "Voucher",               terms: ["certificate", "prepaid", "equipment voucher", "hvip", "wazip"] },
  // Common goal-based terms
  { label: "small business",        terms: ["startup", "entrepreneur", "sole proprietor", "llc", "s-corp", "under 500", "main street"] },
  { label: "minority-owned",        terms: ["minority", "mbe", "disadvantaged", "wosb", "8a", "hubzone", "diverse"] },
  { label: "women-owned",           terms: ["woman", "women", "wbe", "female founder"] },
  { label: "rural development",     terms: ["rural", "usda rural", "remote area", "underserved", "tribal"] },
  { label: "broadband",             terms: ["internet", "fiber", "connectivity", "telecom", "5g", "network infrastructure"] },
  { label: "housing",               terms: ["affordable housing", "hud", "multifamily", "low income housing", "lihtc", "cdbg"] },
  { label: "job creation",          terms: ["hiring", "employment", "jobs", "workforce expansion", "new hires", "job retention"] },
  { label: "water",                 terms: ["wastewater", "stormwater", "irrigation", "drinking water", "watershed", "epa water"] },
  { label: "export",                terms: ["international", "trade", "overseas", "exporter", "import", "global market"] },
];

function SearchInput({ onSearch }: { onSearch?: (q: string) => void }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const matches = value.trim().length > 0
    ? SUGGESTIONS
        .filter(({ label, terms }) => {
          const v = value.toLowerCase();
          return label.toLowerCase().includes(v) || terms.some((t) => t.includes(v));
        })
        .sort(({ label: a }, { label: b }) => {
          const v = value.toLowerCase();
          return (a.toLowerCase().startsWith(v) ? 0 : 1) - (b.toLowerCase().startsWith(v) ? 0 : 1);
        })
        .slice(0, 7)
    : [];

  const submit = (q: string) => { onSearch?.(q); setValue(""); setOpen(false); };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) submit(value.trim());
            if (e.key === "Escape") setOpen(false);
          }}
          onFocus={() => value.trim() && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search programs by keyword…"
          className="w-full rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
          aria-label="Search programs"
          aria-autocomplete="list"
          aria-expanded={open && matches.length > 0}
        />
        {open && matches.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            {matches.map(({ label }) => (
              <button
                key={label}
                onMouseDown={() => submit(label)}
                className="w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-forest-50 hover:text-forest-800 transition-colors flex items-center gap-2"
              >
                <Search size={11} className="text-slate-300 flex-shrink-0" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => value.trim() && submit(value.trim())}
        className="px-3 py-2.5 rounded-lg bg-forest-700 hover:bg-forest-600 text-white transition-colors flex-shrink-0"
        aria-label="Search"
      >
        <Search size={13} aria-hidden />
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function BusinessIntakeChat({ onSearch }: { onSearch?: (query: string) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [matched, setMatched] = useState<Incentive[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPreviousSession, setHasPreviousSession] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Check AI config + restore session on mount
  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => setAiConfigured(!!d.configured))
      .catch(() => setAiConfigured(false));
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { messages: m, matched: mtch, mode: md } = JSON.parse(saved);
        if (Array.isArray(m) && m.length > 0) {
          setMessages(m);
          if (Array.isArray(mtch) && mtch.length) setMatched(mtch);
          if (md) setMode(md);
          setHasPreviousSession(true);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, matched, mode })); } catch {}
  }, [messages, matched, mode]);

  // Scroll the chat's own overflow container — NOT the page
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const container = el.closest(".overflow-y-auto");
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, matched]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setMessages([]); setMatched([]); setInput(""); setError(null);
    setStreaming(false); setMode(null); setHasPreviousSession(false);
  }, []);

  const startMode = useCallback((selectedMode: ChatMode, initialText?: string) => {
    setMode(selectedMode);
    setOpen(true);
    // Inject the appropriate first assistant message for the chosen mode
    const greeting = selectedMode === "quick"
      ? "What are you looking for? Give me a quick description — your business type, location, and goal — and I'll search right away."
      : "I'll find you every program you qualify for. Let's start with the basics:\n\n**Where is your business or organization located?** (State or city)";
    setMessages([{ role: "assistant", content: greeting }]);
    if (initialText) {
      // Will be picked up by a follow-on send()
      setTimeout(() => {
        const textarea = document.querySelector<HTMLTextAreaElement>("#chat-input");
        if (textarea) { textarea.value = initialText; textarea.focus(); }
      }, 150);
    }
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next); setInput(""); setError(null); setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, mode }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) setMessages((prev) => {
              const copy = [...prev];
              copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + parsed.text };
              return copy;
            });
            if (parsed.done && parsed.matched?.length) setMatched(parsed.matched);
          } catch (e) { if ((e as Error).name !== "SyntaxError") throw e; }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((prev) => prev[prev.length - 1]?.content === "" ? prev.slice(0, -1) : prev);
    } finally { setStreaming(false); abortRef.current = null; }
  }, [messages, streaming, mode]);

  const userMessages = messages.filter((m) => m.role === "user").map((m) => m.content);
  const expertise = scoreExpertise(userMessages);
  const hasUserMessage = userMessages.length > 0;
  const lastMsg = messages[messages.length - 1];
  const showFollowUps = !streaming && hasUserMessage && lastMsg?.role === "assistant";
  const followUps = matched.length > 0 ? getFollowUps(expertise) : [
    "Tell me more about the top match",
    "What documents do I need?",
    "Show similar programs",
  ];

  // ── Not configured ────────────────────────────────────────────────────────
  if (aiConfigured === false) {
    return (
      <div className="mt-6 w-full max-w-2xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-5 py-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles size={14} className="text-white/30" aria-hidden />
          </div>
          <div>
            <p className="text-white/55 font-semibold text-sm">AI advisor not configured</p>
            <p className="text-white/30 text-[11px] mt-0.5 leading-relaxed">
              Add your <code className="font-mono bg-white/8 px-1 rounded">ANTHROPIC_API_KEY</code> to <code className="font-mono bg-white/8 px-1 rounded">.env</code> and restart to enable AI program matching.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Collapsed / mode-selection state ─────────────────────────────────────
  if (!open) {
    return (
      <div className="mt-6 w-full max-w-lg mx-auto">
        <div className="rounded-2xl overflow-hidden shadow-xl border border-white/20" style={{ background: "rgba(255,255,255,0.97)" }}>

          {/* Subtle header */}
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-forest-600 flex items-center justify-center flex-shrink-0">
              <Sparkles size={11} className="text-white" aria-hidden />
            </div>
            <p className="text-slate-700 font-semibold text-sm">Find your programs</p>
            {hasPreviousSession && matched.length > 0 && (
              <span className="ml-auto text-[11px] text-slate-400">{matched.length} saved results</span>
            )}
          </div>

          {/* Body */}
          {hasPreviousSession ? (
            <div className="px-4 pb-4">
              <div className="mb-3"><SearchInput onSearch={onSearch} /></div>
              <div className="flex gap-2">
                <button onClick={() => setOpen(true)} className="flex-1 py-2 rounded-xl bg-forest-700 hover:bg-forest-600 text-white text-sm font-semibold transition-colors shadow-sm">
                  Continue AI search
                </button>
                <button onClick={reset} aria-label="Clear session" className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 text-sm transition-colors">
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ── AI mode cards — uniform, no wrapping ── */}
              <div className="px-4 pb-2 grid grid-cols-2 gap-2">
                <button
                  onClick={() => startMode("quick")}
                  className="text-left p-3 rounded-lg border border-t-2 border-t-amber-400 border-slate-200 bg-white hover:border-amber-400 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap size={12} className="text-amber-500 flex-shrink-0" aria-hidden />
                    <span className="text-slate-800 font-semibold text-[13px] whitespace-nowrap">Quick AI</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-snug">Describe in one message</p>
                </button>

                <button
                  onClick={() => startMode("tailored")}
                  className="text-left p-3 rounded-lg border border-t-2 border-t-forest-600 border-slate-200 bg-white hover:border-forest-500 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target size={12} className="text-forest-600 flex-shrink-0" aria-hidden />
                    <span className="text-slate-800 font-semibold text-[13px] whitespace-nowrap">Tailored AI</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-snug">4 questions, best accuracy</p>
                </button>
              </div>

              {/* ── Divider ── */}
              <div className="px-4 py-2 flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[11px] text-slate-400">or search by keyword</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* ── Search ── */}
              <div className="px-4 pb-4">
                <SearchInput onSearch={onSearch} />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Open chat ──────────────────────────────────────────────────────────────
  return (
    <div className="mt-4 w-full max-w-lg mx-auto">
      <div
        className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden flex flex-col"
        style={{ maxHeight: "min(68vh, 560px)" }}
        role="region"
        aria-label="AI Program Finder chat"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-forest-700/70 flex items-center justify-center overflow-hidden">
              <LogoMark size={16} />
            </div>
            <span className="text-white font-semibold text-sm">AI Program Finder</span>
            {mode && (
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                mode === "quick"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/20"
                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
              )}>
                {mode === "quick"
                  ? <><Zap size={9} className="inline mr-0.5" aria-hidden /> Quick</>
                  : <><Target size={9} className="inline mr-0.5" aria-hidden /> Tailored</>}
              </span>
            )}
            {expertise !== "beginner" && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/10 text-white/50">
                {expertise === "expert" ? "Expert mode" : "Intermediate"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {hasUserMessage && (
              <button
                onClick={reset}
                aria-label="Start over"
                title="Start over"
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <RotateCcw size={13} aria-hidden />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={15} aria-hidden />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0" aria-live="polite" aria-atomic="false">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && (
                <div className="w-6 h-6 rounded-lg bg-forest-700/60 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden" aria-hidden>
                  <LogoMark size={16} />
                </div>
              )}
              <div className={cn(
                "max-w-[84%] rounded-2xl px-4 py-2.5",
                m.role === "user"
                  ? "bg-forest-700 text-white rounded-br-sm"
                  : "bg-white/10 text-white rounded-bl-sm border border-white/8"
              )}>
                {m.role === "assistant"
                  ? <MessageContent text={m.content} streaming={streaming && i === messages.length - 1} />
                  : <p className="text-sm leading-relaxed">{m.content}</p>
                }
              </div>
            </div>
          ))}

          {/* Follow-up chips after AI response */}
          {showFollowUps && (
            <div className="pl-8 flex flex-wrap gap-1.5 pt-1">
              {followUps.map((chip) => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  className="text-[11px] px-3 py-1 rounded-full border border-white/12 bg-white/6 text-white/55 hover:bg-white/13 hover:text-white/80 transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Matched programs */}
          {matched.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider pl-8">
                {matched.length} program{matched.length !== 1 ? "s" : ""} found — click to view &amp; apply
              </p>
              {matched.map((inc) => <MatchedCard key={inc.id} inc={inc} />)}
            </div>
          )}

          {/* Error */}
          {error && (
            <div role="alert" className="text-xs text-red-300 bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 leading-relaxed">
              <strong className="font-semibold flex items-center gap-1">
                <AlertCircle size={12} aria-hidden />
                {error.includes("ANTHROPIC_API_KEY") ? "AI not configured" : "Something went wrong"}
              </strong>
              <br />
              {error.includes("ANTHROPIC_API_KEY")
                ? "Add ANTHROPIC_API_KEY to your .env file and restart."
                : error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/10 bg-black/10 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder={mode === "tailored" ? "Answer the question above…" : "Type your message…"}
              rows={1}
              disabled={streaming}
              aria-label="Chat message input"
              className="flex-1 resize-none rounded-xl bg-white/10 border border-white/12 px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-forest-500 focus:border-forest-500 disabled:opacity-50"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || streaming}
              aria-label="Send message"
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                input.trim() && !streaming
                  ? "bg-forest-700 hover:bg-forest-600 text-white"
                  : "bg-white/10 text-white/20 cursor-not-allowed"
              )}
            >
              <Send size={14} aria-hidden />
            </button>
          </div>
          <p className="text-[10px] text-white/18 mt-1.5 text-center">
            Enter to send · Shift+Enter for new line · Always verify with the administering agency
          </p>
        </div>
      </div>
    </div>
  );
}
