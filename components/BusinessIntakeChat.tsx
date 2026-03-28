"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, RotateCcw, ChevronDown, ChevronUp, ExternalLink, Sparkles } from "lucide-react";
import { cn, formatCurrency, formatDeadline } from "@/lib/utils";
import { INCENTIVE_TYPE_COLORS, JURISDICTION_COLORS } from "@/lib/types";
import { LogoMark } from "@/components/Logo";
import type { Incentive } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  { label: "Small business fleet", text: "15-person HVAC company in Texas — want to electrify our service fleet" },
  { label: "Family farm", text: "200-acre family farm in Iowa — USDA and state agriculture programs" },
  { label: "Nonprofit", text: "501(c)(3) environmental nonprofit in Georgia — clean energy grants" },
  { label: "Startup R&D", text: "Biotech startup in Boston — SBIR, STTR, and federal R&D programs" },
  { label: "University", text: "University research team in Colorado — renewable energy fellowships" },
  { label: "Manufacturing", text: "Ohio manufacturing facility — expansion credits and equipment grants" },
];

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
        <a href={`/incentives/${inc.slug}`} target="_blank" className="font-semibold text-slate-900 hover:text-forest-700 transition-colors line-clamp-2 block mb-1 text-[13px] leading-snug">{inc.title}</a>
        <p className="text-slate-400 text-[11px]">{inc.managingAgency} · {inc.jurisdictionName}</p>
        {expanded && (
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
            <p className="text-slate-600 leading-relaxed">{inc.shortSummary}</p>
            {inc.keyRequirements.slice(0, 3).map((r, j) => (
              <div key={j} className="flex gap-1.5 text-slate-600"><span className="text-forest-600 mt-0.5 flex-shrink-0">•</span><span>{r}</span></div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400">{formatDeadline(inc.deadline)}</span>
              <a href={inc.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-forest-700 hover:text-forest-800 font-semibold text-[11px]">Apply <ExternalLink size={10} /></a>
            </div>
          </div>
        )}
        <button onClick={() => setExpanded((e) => !e)} className="mt-2 flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors text-[11px]">
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {expanded ? "Show less" : "Details & apply"}
        </button>
      </div>
    </div>
  );
}

export function BusinessIntakeChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Tell me about your organization — what you do, where you're based, and what you're hoping to fund. I'll find the best-fit programs.",
  }]);
  const [matched, setMatched] = useState<Incentive[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, matched]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([{ role: "assistant", content: "Tell me about your organization — what you do, where you're based, and what you're hoping to fund. I'll find the best-fit programs." }]);
    setMatched([]); setInput(""); setError(null); setStreaming(false);
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    if (!open) setOpen(true);
    const userMsg: Message = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next); setInput(""); setError(null); setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }), signal: controller.signal });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
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
            if (parsed.text) setMessages((prev) => { const copy = [...prev]; copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + parsed.text }; return copy; });
            if (parsed.done && parsed.matched?.length) setMatched(parsed.matched);
          } catch (e) { if ((e as Error).name !== "SyntaxError") throw e; }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((prev) => prev[prev.length - 1].content === "" ? prev.slice(0, -1) : prev);
    } finally { setStreaming(false); abortRef.current = null; }
  }, [messages, streaming, open]);

  const hasUserMessage = messages.some((m) => m.role === "user");

  if (!open) {
    return (
      <div className="mt-4 w-full max-w-2xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 pt-4 pb-3">
            <div className="w-7 h-7 rounded-lg bg-forest-700/70 flex items-center justify-center flex-shrink-0">
              <Sparkles size={13} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">AI Program Finder</p>
              <p className="text-white/40 text-[11px]">Describe your situation — get matched instantly</p>
            </div>
          </div>
          <div className="px-5 pb-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button key={s.label} onClick={() => send(s.text)}
                className="text-[11px] px-3 py-1 rounded-full border border-white/12 bg-white/6 text-white/55 hover:bg-white/13 hover:text-white hover:border-white/22 transition-all">
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-4 pb-4">
            <button onClick={() => setOpen(true)} className="flex-1 text-left rounded-xl bg-white/8 border border-white/10 px-4 py-2.5 text-sm text-white/30 hover:bg-white/12 hover:text-white/50 transition-colors">
              Or describe your situation in detail…
            </button>
            <button onClick={() => setOpen(true)} className="w-9 h-9 rounded-xl bg-forest-700 flex items-center justify-center text-white hover:bg-forest-600 transition-colors flex-shrink-0">
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 w-full max-w-2xl mx-auto">
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden flex flex-col" style={{ maxHeight: "min(68vh, 540px)" }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-forest-700/70 flex items-center justify-center overflow-hidden">
              <LogoMark size={16} />
            </div>
            <span className="text-white font-semibold text-sm">AI Program Finder</span>
          </div>
          <div className="flex items-center gap-1">
            {hasUserMessage && <button onClick={reset} title="Start over" className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"><RotateCcw size={13} /></button>}
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"><X size={15} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && (
                <div className="w-6 h-6 rounded-lg bg-forest-700/60 flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden">
                  <LogoMark size={16} />
                </div>
              )}
              <div className={cn("max-w-[84%] rounded-2xl px-4 py-2.5", m.role === "user" ? "bg-forest-700 text-white rounded-br-sm" : "bg-white/10 text-white rounded-bl-sm border border-white/8")}>
                {m.role === "assistant" ? <MessageContent text={m.content} streaming={streaming && i === messages.length - 1} /> : <p className="text-sm leading-relaxed">{m.content}</p>}
              </div>
            </div>
          ))}

          {!hasUserMessage && (
            <div className="pl-8 space-y-1.5 pt-1">
              {SUGGESTIONS.map((s) => (
                <button key={s.label} onClick={() => send(s.text)}
                  className="w-full text-left text-xs px-3.5 py-2 rounded-xl border border-white/10 bg-white/6 text-white/50 hover:bg-white/12 hover:text-white/75 transition-all">
                  {s.text}
                </button>
              ))}
            </div>
          )}

          {matched.length > 0 && (
            <div className="pl-8 space-y-2 pt-1">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{matched.length} matched program{matched.length !== 1 ? "s" : ""}</p>
              {matched.map((inc) => <MatchedCard key={inc.id} inc={inc} />)}
            </div>
          )}

          {error && <div className="text-xs text-red-300 bg-red-900/30 border border-red-500/30 rounded-xl px-3 py-2">{error} — please try again.</div>}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-3 border-t border-white/10 bg-black/10 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Describe your situation or ask a follow-up…"
              rows={1} disabled={streaming}
              className="flex-1 resize-none rounded-xl bg-white/10 border border-white/12 px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-forest-500 focus:border-forest-500 disabled:opacity-50"
            />
            <button onClick={() => send(input)} disabled={!input.trim() || streaming}
              className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors", input.trim() && !streaming ? "bg-forest-700 hover:bg-forest-600 text-white" : "bg-white/10 text-white/20 cursor-not-allowed")}>
              <Send size={14} />
            </button>
          </div>
          <p className="text-[10px] text-white/18 mt-1.5 text-center">Enter to send · Shift+Enter for new line · Always verify directly with the administering agency</p>
        </div>
      </div>
    </div>
  );
}
