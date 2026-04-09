// @ts-nocheck
"use client";

import React, { useState, useEffect } from "react";
import { X, Key, Save } from "lucide-react";
import { useToast } from "@/components/code-studio/ToastSystem";

interface Props {
  onClose?: () => void;
}

export function APIKeyConfigPanel({ onClose }: Props) {
  const { toast } = useToast();
  const [openAiKey, setOpenAiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");

  useEffect(() => {
    // Load existing keys from local storage
    if (typeof window !== "undefined") {
      setOpenAiKey(localStorage.getItem("OPENAI_API_KEY") || "");
      setGeminiKey(localStorage.getItem("GEMINI_API_KEY") || "");
      setClaudeKey(localStorage.getItem("ANTHROPIC_API_KEY") || "");
    }
  }, []);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      if (openAiKey) localStorage.setItem("OPENAI_API_KEY", openAiKey.trim());
      else localStorage.removeItem("OPENAI_API_KEY");

      if (geminiKey) localStorage.setItem("GEMINI_API_KEY", geminiKey.trim());
      else localStorage.removeItem("GEMINI_API_KEY");

      if (claudeKey) localStorage.setItem("ANTHROPIC_API_KEY", claudeKey.trim());
      else localStorage.removeItem("ANTHROPIC_API_KEY");

      toast("API keys saved successfully", "success");
      onClose?.();
    }
  };

  return (
    <div className="flex h-full flex-col bg-bg-primary text-text-primary">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <h2 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-purple">
          <Key size={14} />
          <span>API Key Config</span>
        </h2>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="닫기" className="text-text-tertiary hover:text-text-primary">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-1">
          <label className="text-xs text-text-secondary">OpenAI API Key</label>
          <input
            type="password"
            value={openAiKey}
            onChange={(e) => setOpenAiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-white/8 bg-white/2 px-3 py-2 text-xs text-text-primary outline-none focus:border-accent-purple/40"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-text-secondary">Google Gemini API Key</label>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIza..."
            className="w-full rounded-lg border border-white/8 bg-white/2 px-3 py-2 text-xs text-text-primary outline-none focus:border-accent-purple/40"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-text-secondary">Anthropic Claude API Key</label>
          <input
            type="password"
            value={claudeKey}
            onChange={(e) => setClaudeKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full rounded-lg border border-white/8 bg-white/2 px-3 py-2 text-xs text-text-primary outline-none focus:border-accent-purple/40"
          />
        </div>

        <div className="pt-4 border-t border-white/8">
          <button
            type="button"
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-purple px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95"
          >
            <Save size={14} />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-1 | role=APIKeyConfigPanel | inputs=Props | outputs=JSX
