"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface Dump {
  id: string;
  raw_content: string;
  ai_analysis: unknown;
  created_at: string;
  type?: string;
  media_url?: string | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: string;
  imageUrl?: string;
}

interface SelectedImage {
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
}

// Legacy format from old /api/ai/classify
interface LegacyClassification {
  type?: string;
  title?: string;
}

const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

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
      imageUrl: dump.media_url || undefined,
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
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

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

  const handleImageSelect = useCallback((file: File) => {
    if (!VALID_IMAGE_TYPES.includes(file.type)) {
      alert("지원하지 않는 이미지 형식이에요. (JPEG, PNG, WebP, GIF)");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      alert("이미지가 너무 커요. (최대 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setSelectedImage({
        file,
        preview: URL.createObjectURL(file),
        base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  // Full-screen drag-and-drop
  useEffect(() => {
    const hasImageFile = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (!hasImageFile(e)) return;
      dragCounterRef.current++;
      if (dragCounterRef.current === 1) setIsDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) setIsDragging(false);
    };
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) {
        handleImageSelect(file);
      }
    };

    document.addEventListener("dragenter", onDragEnter);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragenter", onDragEnter);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
    };
  }, [handleImageSelect]);

  // Clean up object URL on unmount or image change
  useEffect(() => {
    return () => {
      if (selectedImage?.preview) {
        URL.revokeObjectURL(selectedImage.preview);
      }
    };
  }, [selectedImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
    e.target.value = "";
  };

  const removeImage = () => {
    if (selectedImage?.preview) {
      URL.revokeObjectURL(selectedImage.preview);
    }
    setSelectedImage(null);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageSelect(file);
        return;
      }
    }
  };

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text && !selectedImage) return;
    if (isLoading) return;

    onChatOpenChange(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text || "[이미지]",
      timestamp: new Date().toISOString(),
      imageUrl: selectedImage?.preview,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        content: m.content,
      }));

      const body: Record<string, unknown> = {
        message: text,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        history: chatHistory,
      };

      if (imageToSend) {
        body.image = {
          base64: imageToSend.base64,
          mimeType: imageToSend.mimeType,
        };
      }

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      // Update user message with permanent URL from storage
      if (data.mediaUrl) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMsg.id ? { ...m, imageUrl: data.mediaUrl } : m
          )
        );
      }

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

      {/* Drag-and-drop overlay — portal to body */}
      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-200 ${
              isDragging ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm" />
            <div className="relative flex flex-col items-center gap-3 p-8 bg-white/90 rounded-2xl shadow-xl border-2 border-dashed border-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p className="text-lg font-medium text-blue-700">이미지를 여기에 놓으세요</p>
              <p className="text-sm text-blue-500/70">JPEG, PNG, WebP, GIF (최대 5MB)</p>
            </div>
          </div>,
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
                        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-slate-100 text-slate-700 rounded-bl-md"
                        }`}
                      >
                        {msg.imageUrl && (
                          <img
                            src={msg.imageUrl}
                            alt="첨부 이미지"
                            className="max-w-full rounded-lg mb-1"
                          />
                        )}
                        {msg.content !== "[이미지]" && (
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        )}
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
          {/* Image preview */}
          {selectedImage && (
            <div className="px-3 pb-2">
              <div className="relative inline-block">
                <img
                  src={selectedImage.preview}
                  alt="첨부 이미지"
                  className="h-20 rounded-lg border border-slate-200 object-cover"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-slate-700 text-white rounded-full text-xs flex items-center justify-center hover:bg-slate-900 transition-colors"
                  aria-label="이미지 제거"
                >
                  &times;
                </button>
              </div>
            </div>
          )}

          <div className={`flex items-center gap-1 p-1 rounded-xl border border-slate-200 shadow-sm ${isChatOpen ? "bg-slate-50" : "bg-white"}`}>
            {/* Image attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40 shrink-0"
              aria-label="이미지 첨부"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => { if (!isChatOpen) onChatOpenChange(true); }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="할 일, 일정, 메모 — 그냥 말해보세요"
              className="flex-1 px-2 py-2.5 text-sm bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
              disabled={isLoading}
            />
            <button
              onClick={handleSubmit}
              disabled={(!input.trim() && !selectedImage) || isLoading}
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
