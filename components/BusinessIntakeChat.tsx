"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Sparkles, RotateCcw, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { cn, formatCurrency, formatDeadline } from "@/lib/utils";
import { INCENTIVE_TYPE_COLORS, JURISDICTION_COLORS } from "@/lib/types";
import type { Incentive } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "We're a 15-person HVAC company in Texas looking to electrify our service fleet",
  "Small farm in Iowa, want to upgrade irrigation equipment and storage",
  "50-person biotech startup in Massachusetts, seeking federal R&D grants",
  "Commercial contractor in Ohio doing energy efficiency retrofits",
];

// Render bold (**text**) and bullet lists from assistant messages
function MessageContent({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const renderInline = (str: string) => {
          const parts = str.split(/(\*\*[^*]+\*\*)/g);
          return parts.map((p, j) =>
            p.startsWith("**") && p.endsWith("**")
              ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>
              : <span key={j}>{p}</span>
          );
        };
        if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-emerald-400 mt-0.5 flex-shrink-0">•</span>
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }
        if (!trimmed) return <div key={i} className="h-1.5" />;
        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

// Compact expandable card for matched results
function MatchedCard({ inc }: { inc: Incentive }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs shadow-sm">
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex flex-wrap gap-1">
            <span className={cn("badge text-[10px] py-0", INCENTIVE_TYPE_COLORS[inc.incentiveType])}>
              {inc.incentiveType.replace(/_/g, " ")}
            </span>
            <span className={cn("badge text-[10px] py-0", JURISDICTION_COLORS[inc.jurisdictionLevel])}>
              {inc.jurisdictionLevel}
            </span>
          </div>
          {inc.fundingAmount && (
            <span className="text-emerald-600 font-bold whitespace-nowrap flex-shrink-0">
              {formatCurrency(inc.fundingAmount)}
            </span>
          )}
        </div>

        <a
          href={`/incentives/${inc.slug}`}
          target="_blank"
          className="font-semibold text-slate-900 hover:text-brand-700 transition-colors line-clamp-2 block mb-1"
        >
          {inc.title}
        </a>
        <p className="text-slate-500 text-[11px]">{inc.managingAgency}</p>

        {expanded && (
          <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
            <p className="text-slate-600 leading-relaxed">{inc.shortSummary}</p>
            {inc.keyRequirements.length > 0 && (
              <ul className="space-y-0.5">
                {inc.keyRequirements.slice(0, 3).map((r, j) => (
                  <li key={j} className="flex gap-1.5 text-slate-600">
                    <span className="text-brand-500 mt-0.5 flex-shrink-0">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-slate-400">{formatDeadline(inc.deadline)}</span>
              <a
                href={inc.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium"
              >
                Apply <ExternalLink size={10} />
              </a>
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-1.5 flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
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
    content: "Hi! I'm your incentive advisor — I'll ask a few targeted questions about your business so I can find the programs most likely to approve you.\n\nTo start: what does your company do, and what state are you in?",
  }]);
  const [matched, setMatched] = useState<Incentive[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, matched]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([{
      role: "assistant",
      content: "Hi! I'm your incentive advisor — I'll ask a few targeted questions about your business so I can find the programs most likely to approve you.\n\nTo start: what does your company do, and what state are you in?",
    }]);
    setMatched([]);
    setInput("");
    setError(null);
    setStreaming(false);
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setError(null);
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

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
            if (parsed.text) {
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  ...copy[copy.length - 1],
                  content: copy[copy.length - 1].content + parsed.text,
                };
                return copy;
              });
            }
            if (parsed.done && parsed.matched?.length) {
              setMatched(parsed.matched);
            }
          } catch (e) {
            if ((e as Error).name !== "SyntaxError") throw e;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setMessages((prev) =>
        prev[prev.length - 1].content === "" ? prev.slice(0, -1) : prev
      );
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, streaming]);

  const hasUserMessage = messages.some((m) => m.role === "user");
  const lastUserText = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  return (
    <>
      {/* Inline trigger button */}
      <div className="mt-5 flex flex-col items-center gap-1.5">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.03] active:scale-100"
        >
          <Sparkles size={16} />
          Not sure where to start? Let AI find your programs
        </button>
        <p className="text-white/40 text-xs">Describe your business — get matched in seconds</p>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "min(82vh, 700px)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm leading-tight">Incentive Matcher</p>
                  <p className="text-emerald-100 text-xs">Powered by Claude AI</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {hasUserMessage && (
                  <button
                    onClick={reset}
                    title="Start over"
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Conversation area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0 bg-slate-50/40">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  {m.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <Sparkles size={13} className="text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-4 py-3 shadow-sm",
                      m.role === "user"
                        ? "bg-brand-600 text-white rounded-br-sm"
                        : "bg-white text-slate-800 rounded-bl-sm border border-slate-100"
                    )}
                  >
                    {m.role === "assistant" && m.content === "" ? (
                      <div className="flex items-center gap-1 h-5 px-1">
                        {[0, 1, 2].map((dot) => (
                          <div
                            key={dot}
                            className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
                            style={{ animationDelay: `${dot * 150}ms` }}
                          />
                        ))}
                      </div>
                    ) : m.role === "assistant" ? (
                      <MessageContent text={m.content} />
                    ) : (
                      <p className="text-sm leading-relaxed">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Quick-start suggestions — only before first user message */}
              {!hasUserMessage && (
                <div className="pt-1 space-y-2">
                  <p className="text-xs text-slate-400 font-medium pl-9">Quick starts:</p>
                  <div className="pl-9 flex flex-col gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors shadow-sm"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched incentive cards */}
              {matched.length > 0 && (
                <div className="pl-9 space-y-2 pt-1">
                  <div className="flex items-center justify-between pr-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {matched.length} Matched Program{matched.length !== 1 ? "s" : ""}
                    </p>
                    {lastUserText && (
                      <a
                        href={`/?search=${encodeURIComponent(lastUserText.slice(0, 80))}`}
                        target="_blank"
                        className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
                      >
                        Browse all <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  {matched.map((inc) => <MatchedCard key={inc.id} inc={inc} />)}
                </div>
              )}

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {error} — please try again.
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-200 bg-white flex-shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send(input)}
                  placeholder="Describe your business or ask a question…"
                  disabled={streaming}
                  className="flex-1 input text-sm py-2.5 disabled:opacity-60"
                />
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || streaming}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500",
                    input.trim() && !streaming
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <Send size={15} />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                AI responses may be incomplete. Verify eligibility directly with the managing agency.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
