"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, Sparkles, Loader2 } from "lucide-react";
import { IncentiveCard } from "./IncentiveCard";
import { cn } from "@/lib/utils";
import type { Incentive } from "@/lib/types";

interface Message { role: "user" | "assistant"; content: string; }

export function BusinessIntakeChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Hi! I'm here to help match your business with government incentives. What does your company do, and where are you located?",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [matched, setMatched] = useState<Incentive[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, matched, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.message }]);
      if (data.matched?.length) setMatched(data.matched);
    } catch {
      setMessages([...next, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-3 rounded-xl transition-colors shadow-lg mt-4"
      >
        <Sparkles size={16} />
        Find My Incentives with AI
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Incentive Matcher</p>
                  <p className="text-xs text-slate-400">Powered by AI</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-brand-600 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
                    <Loader2 size={16} className="text-slate-400 animate-spin" />
                  </div>
                </div>
              )}

              {/* Matched incentives */}
              {matched.length > 0 && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {matched.length} Matched Program{matched.length !== 1 ? "s" : ""}
                  </p>
                  {matched.map((inc) => <IncentiveCard key={inc.id} incentive={inc} />)}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Describe your business…"
                  className="flex-1 input text-sm text-slate-900 placeholder:text-slate-400 py-2"
                  disabled={loading}
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || loading}
                  className="btn-primary px-3 py-2 disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
