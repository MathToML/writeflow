"use client";

import { useState, useRef, useEffect } from "react";

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

    // New agent format: { response: string, toolCalls: [...] }
    if (
      analysis &&
      typeof analysis === "object" &&
      !Array.isArray(analysis) &&
      "response" in (analysis as Record<string, unknown>)
    ) {
      aiText = (analysis as { response: string }).response;
    }
    // Legacy classify format: [{ type, title }, ...]
    else if (Array.isArray(analysis) && analysis.length > 0) {
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

  // Auto-scroll when messages change and chat is open
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isChatOpen]);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // Auto-open chat panel on submit
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
      // Build conversation history for context
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
    <div className="flex flex-col shrink-0">
      {/* Animated chat panel using CSS Grid height transition */}
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: isChatOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          {/* Collapse button */}
          <button
            onClick={() => onChatOpenChange(false)}
            className="w-full py-3 flex items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span>접기</span>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </button>

          {/* Messages area with top fade */}
          <div className="relative">
            <div
              className="pointer-events-none absolute top-0 left-0 right-0 h-8 z-10"
              style={{
                background:
                  "linear-gradient(to bottom, var(--tw-gradient-from, #f8fafc) 0%, transparent 100%)",
              }}
            />
            <div className="max-h-64 overflow-y-auto space-y-2 px-1 pt-6 pb-2">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-4">
                  대화가 시작되면 여기에 표시돼요
                </p>
              ) : (
                messages.map((msg) => (
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
                ))
              )}
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
          </div>
        </div>
      </div>

      {/* Input - always visible */}
      <div className="bg-slate-50 pt-2 pb-safe">
        <div className="flex items-center gap-2 p-1 bg-white rounded-xl border border-slate-200 shadow-sm">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (e.target.value && !isChatOpen) onChatOpenChange(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="무엇이든 던져보세요..."
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
  );
}
