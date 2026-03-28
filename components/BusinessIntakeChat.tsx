"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, RotateCcw, ChevronDown, ChevronUp, ExternalLink, ChevronRight } from "lucide-react";
import { cn, formatCurrency, formatDeadline } from "@/lib/utils";
import { INCENTIVE_TYPE_COLORS, JURISDICTION_COLORS } from "@/lib/types";
import { LogoMark } from "@/components/Logo";
import type { Incentive } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "15-person HVAC company in Texas — want to electrify our service fleet",
  "Family farm in Iowa, 200 acres — looking for USDA and state ag programs",
  "501(c)(3) environmental nonprofit in Georgia — clean energy grant opportunities",
  "Biotech startup in Boston — SBIR/STTR and federal R&D programs",
  "University research team — renewable energy funding and fellowships",
  "Manufacturing facility in Ohio — expansion credits and equipment grants",
];

// Render bold (**text**) and bullet lists from assistant messages
function MessageContent({ text, streaming }: { text: string; streaming?: boolean }) {
  if (!text && streaming) {
    return <span className="typing-cursor text-slate-400 text-sm" />;
  }
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
              <span className="text-forest-400 mt-0.5 flex-shrink-0">•</span>
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }
        if (!trimmed) return <div key={i} className="h-1.5" />;
        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
      {streaming && text && <span className="typing-cursor" />}
    </div>
  );
}

// Compact expandable card for matched results
function MatchedCard({ inc }: { inc: Incentive }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={cn(
      "bg-white rounded-xl border border-slate-200 overflow-hidden text-xs shadow-sm",
      "hover:border-forest-300 hover:shadow-md transition-all duration-200"
    )}>
      <div className="px-3.5 py-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap gap-1">
            <span className={cn("badge text-[10px] py-0.5", INCENTIVE_TYPE_COLORS[inc.incentiveType])}>
              {inc.incentiveType.replace(/_/g, " ")}
            </span>
            <span className={cn("badge text-[10px] py-0.5", JURISDICTION_COLORS[inc.jurisdictionLevel])}>
              {inc.jurisdictionLevel}
            </span>
          </div>
          {inc.fundingAmount && (
            <span className="text-emerald-600 font-bold whitespace-nowrap flex-shrink-0 text-[12px]">
              {formatCurrency(inc.fundingAmount)}
            </span>
          )}
        </div>

        <a
          href={`/incentives/${inc.slug}`}
          target="_blank"
          className="font-semibold text-slate-900 hover:text-forest-700 transition-colors line-clamp-2 block mb-1 text-[13px] leading-snug"
        >
          {inc.title}
        </a>
        <p className="text-slate-400 text-[11px] mb-1">{inc.managingAgency}</p>

        {expanded && (
          <div className="mt-2.5 space-y-2 border-t border-slate-100 pt-2.5">
            <p className="text-slate-600 leading-relaxed text-[12px]">{inc.shortSummary}</p>
            {inc.keyRequirements.length > 0 && (
              <ul className="space-y-1">
                {inc.keyRequirements.slice(0, 3).map((r, j) => (
                  <li key={j} className="flex gap-1.5 text-slate-600 text-[12px]">
                    <span className="text-forest-500 mt-0.5 flex-shrink-0">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400 text-[11px]">{formatDeadline(inc.deadline)}</span>
              <a
                href={inc.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-forest-700 hover:text-forest-800 font-semibold text-[11px]"
              >
                Apply now <ExternalLink size={10} />
              </a>
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 flex items-center gap-1 text-[11px] text-slate-400 hover:text-forest-700 transition-colors"
        >
          {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          {expanded ? "Show less" : "Details & eligibility"}
        </button>
      </div>
    </div>
  );
}

export function BusinessIntakeChat() {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Hi! I'm your incentive advisor — I'll ask a few targeted questions about your business so I can find the programs most likely to approve you.\n\nTo start: what does your company do, and what state are you in?",
  }]);
  const [matched, setMatched] = useState<Incentive[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (expanded) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, matched, expanded]);

  useEffect(() => {
    if (expanded) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [expanded]);

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

    if (!expanded) setExpanded(true);

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
  }, [messages, streaming, expanded]);

  const hasUserMessage = messages.some((m) => m.role === "user");
  const lastUserText = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  return (
    <div className="w-full max-w-2xl mx-auto mt-4">
      {/* ── Collapsed affordance ─────────────────────────────────────────── */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className={cn(
            "w-full group text-left rounded-2xl border border-white/15 bg-white/6 backdrop-blur-sm",
            "hover:bg-white/10 hover:border-white/25 transition-all duration-200",
            "px-5 py-4 flex items-center gap-4"
          )}
        >
          <div className="w-9 h-9 rounded-xl bg-forest-700/80 flex items-center justify-center flex-shrink-0 shadow-sm">
            <LogoMark size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/90 font-semibold text-sm leading-tight">
              ✨ Describe your situation — AI will find your programs
            </p>
            <p className="text-white/45 text-xs mt-0.5">
              Tell us about your business, farm, or organization
            </p>
          </div>
          <ChevronRight size={16} className="text-white/35 group-hover:text-white/60 transition-colors flex-shrink-0" />
        </button>
      )}

      {/* ── Expanded inline chat ──────────────────────────────────────────── */}
      {expanded && (
        <div className="rounded-2xl border border-white/15 bg-white/6 backdrop-blur-sm overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-forest-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                <LogoMark size={20} />
              </div>
              <div>
                <p className="font-semibold text-white text-sm leading-tight">Incentive Matcher</p>
                <p className="text-white/45 text-[11px]">Powered by Claude AI</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {hasUserMessage && (
                <button
                  onClick={reset}
                  title="Start over"
                  className="p-1.5 rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <RotateCcw size={14} />
                </button>
              )}
              <button
                onClick={() => setExpanded(false)}
                className="p-1.5 rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium px-3"
              >
                Collapse
              </button>
            </div>
          </div>

          {/* Suggestion pills — always visible until user sends a message */}
          {!hasUserMessage && (
            <div className="px-5 pt-4 pb-2">
              <p className="text-[11px] text-white/40 font-medium mb-2 uppercase tracking-wide">
                Quick starts — click to use
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className={cn(
                      "text-left text-[12px] px-3 py-2.5 rounded-xl transition-all",
                      "border border-white/12 bg-white/5 text-white/70",
                      "hover:bg-white/12 hover:border-white/25 hover:text-white"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation area */}
          <div className="px-5 py-4 space-y-4 max-h-[420px] overflow-y-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-forest-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                    <LogoMark size={17} />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[84%] rounded-2xl px-4 py-3 shadow-sm",
                    m.role === "user"
                      ? "bg-forest-700 text-white rounded-br-sm"
                      : "bg-white/10 text-white/90 rounded-bl-sm border border-white/10 backdrop-blur-sm"
                  )}
                >
                  {m.role === "assistant" ? (
                    <MessageContent
                      text={m.content}
                      streaming={streaming && i === messages.length - 1}
                    />
                  ) : (
                    <p className="text-sm leading-relaxed">{m.content}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Matched incentive cards */}
            {matched.length > 0 && (
              <div className="pl-9 space-y-2 pt-1">
                <div className="flex items-center justify-between pr-1">
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wide">
                    {matched.length} Matched Program{matched.length !== 1 ? "s" : ""}
                  </p>
                  {lastUserText && (
                    <a
                      href={`/?search=${encodeURIComponent(lastUserText.slice(0, 80))}`}
                      target="_blank"
                      className="text-xs text-forest-300 hover:text-forest-200 flex items-center gap-1"
                    >
                      Browse all <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                {matched.map((inc) => <MatchedCard key={inc.id} inc={inc} />)}
              </div>
            )}

            {error && (
              <div className="text-xs text-red-300 bg-red-900/30 border border-red-500/30 rounded-xl px-3 py-2">
                {error} — please try again.
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-white/10">
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Describe your business, farm, organization, or situation…"
                disabled={streaming}
                rows={2}
                className={cn(
                  "flex-1 rounded-xl border border-white/15 bg-white/8 backdrop-blur-sm",
                  "px-3.5 py-2.5 text-sm text-white placeholder:text-white/35",
                  "focus:outline-none focus:ring-1 focus:ring-forest-500 focus:border-forest-500",
                  "resize-none disabled:opacity-60 leading-relaxed"
                )}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || streaming}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-forest-500",
                  input.trim() && !streaming
                    ? "bg-forest-600 hover:bg-forest-700 text-white shadow-sm"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                )}
              >
                <Send size={15} />
              </button>
            </div>
            <p className="text-[10px] text-white/25 mt-1.5 text-center">
              AI responses may be incomplete. Verify eligibility directly with the managing agency.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
