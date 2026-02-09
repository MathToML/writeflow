"use client";

import { useState, useRef } from "react";

interface ClassificationResult {
  type: "event" | "task" | "record";
  title: string;
  aiReasoning?: string;
}

interface DumpResponse {
  classifications?: ClassificationResult[];
  classification?: ClassificationResult | null;
  error?: string;
}

const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  event: { label: "Event", emoji: "📅" },
  task: { label: "Task", emoji: "✅" },
  record: { label: "Record", emoji: "📝" },
};

export default function BrainDumpInput({
  onDumpCreated,
}: {
  onDumpCreated?: () => void;
}) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: string;
    title: string;
    reasoning?: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawContent: content.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const data: DumpResponse = await res.json();

      const items = data.classifications ?? (data.classification ? [data.classification] : []);
      if (items.length > 0) {
        if (items.length === 1) {
          const typeInfo = TYPE_LABELS[items[0].type];
          setFeedback({
            type: `${typeInfo.emoji} ${typeInfo.label}`,
            title: items[0].title,
            reasoning: items[0].aiReasoning,
          });
        } else {
          const summary = items.map((item) => {
            const typeInfo = TYPE_LABELS[item.type];
            return `${typeInfo.emoji} ${item.title}`;
          }).join("\n");
          setFeedback({
            type: `📦 ${items.length} items`,
            title: "Classified",
            reasoning: summary,
          });
        }
      } else {
        setFeedback({
          type: "💾",
          title: "Saved",
          reasoning: data.error || "Your entry has been saved",
        });
      }

      setContent("");
      onDumpCreated?.();

      setTimeout(() => setFeedback(null), 4000);
    } catch {
      setFeedback({
        type: "⚠️",
        title: "Error",
        reasoning: "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tasks, events, notes — just type anything"
          className="w-full min-h-[100px] p-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-slate-800 placeholder:text-slate-400"
          disabled={isLoading}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <span className="text-xs text-slate-400">⌘+Enter</span>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isLoading}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing
              </span>
            ) : (
              "Submit"
            )}
          </button>
        </div>
      </div>

      {feedback && (
        <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-xl animate-in slide-in-from-top-2 duration-300">
          <span className="text-lg">{feedback.type}</span>
          <div>
            <p className="font-medium text-green-900 text-sm">
              {feedback.title}
            </p>
            {feedback.reasoning && (
              <p className="text-green-700 text-xs mt-0.5">
                {feedback.reasoning}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
