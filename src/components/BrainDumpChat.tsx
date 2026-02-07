"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface Dump {
  id: string;
  raw_content: string;
  ai_analysis: unknown;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: string;
}

// Legacy format from old /api/ai/classify
interface LegacyClassification {
  type?: string;
  title?: string;
}

function formatLegacy(items: LegacyClassification[]): string {
  const labels: Record<string, string> = {
    event: "\u{1F4C5} 일정",
    task: "\u2705 할 일",
    record: "\u{1F4DD} 기록",
  };
  return items
    .map((i) => `${labels[i.type || ""] || "\u{1F4BE}"}: ${i.title}`)
    .join("\n");
}

function dumpsToMessages(dumps: Dump[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const dump of dumps) {
    messages.push({
      id: `${dump.id}-user`,
      role: "user",
      content: dump.raw_content,
      timestamp: dump.created_at,
    });

    const analysis = dump.ai_analysis;
    let aiText: string | null = null;

    if (
      analysis &&
      typeof analysis === "object" &&
      !Array.isArray(analysis) &&
      "response" in (analysis as Record<string, unknown>)
    ) {
      aiText = (analysis as { response: string }).response;
    } else if (Array.isArray(analysis) && analysis.length > 0) {
      aiText = formatLegacy(analysis as LegacyClassification[]);
    }

    if (aiText) {
      messages.push({
        id: `${dump.id}-ai`,
        role: "ai",
        content: aiText,
        timestamp: dump.created_at,
      });
    }
  }
  return messages;
}

export default function BrainDumpChat({
  dumps,
  onDumpCreated,
  isChatOpen,
  onChatOpenChange,
}: {
  dumps: Dump[];
  onDumpCreated?: () => void;
  isChatOpen: boolean;
  onChatOpenChange: (open: boolean) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    dumpsToMessages(dumps)
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Lock body scroll when chat is open
  useEffect(() => {
    if (isChatOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isChatOpen]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (isChatOpen) {
      // Small delay so the panel has time to expand
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, isChatOpen]);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    onChatOpenChange(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          history: chatHistory,
        }),
      });

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: data.message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      onDumpCreated?.();
    } catch {
      const errMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: "ai",
        content: "\u26A0\uFE0F 오류가 발생했어요. 다시 시도해 주세요.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* Backdrop — portal to body so it covers everything */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
              isChatOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => onChatOpenChange(false)}
          />,
          document.body,
        )}

      {/* Chat area — stays in normal flow, elevated above backdrop when open */}
      <div className={`relative ${isChatOpen ? "z-50" : ""}`}>
        {/* Messages panel — grows upward from input */}
        <div
          className="absolute bottom-full left-0 right-0 overflow-hidden transition-all duration-300 ease-out"
          style={{ maxHeight: isChatOpen ? "calc(60dvh)" : "0" }}
        >
          <div className="bg-white rounded-t-2xl border border-b-0 border-slate-200 shadow-2xl overflow-y-auto" style={{ maxHeight: "calc(60dvh)" }}>
            <div className="px-4 py-4">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">
                  대화가 시작되면 여기에 표시돼요
                </p>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-slate-100 text-slate-700 rounded-bl-md"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 text-slate-400 px-3 py-2 rounded-2xl rounded-bl-md text-sm">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Input bar — always visible, same position */}
        <div className={`pt-2 pb-safe ${isChatOpen ? "bg-white rounded-b-2xl border border-t-0 border-slate-200 shadow-2xl px-2 pb-3" : ""}`}>
          <div className={`flex items-center gap-2 p-1 rounded-xl border border-slate-200 shadow-sm ${isChatOpen ? "bg-slate-50" : "bg-white"}`}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => { if (!isChatOpen) onChatOpenChange(true); }}
              onKeyDown={handleKeyDown}
              placeholder="할 일, 일정, 메모 — 그냥 말해보세요"
              className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
              disabled={isLoading}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              ) : (
                "보내기"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
