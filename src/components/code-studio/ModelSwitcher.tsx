"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check, Key } from "lucide-react";
import { getApiKey, getActiveProvider, setActiveProvider, type ProviderId } from "@/lib/ai-providers";

interface ProviderDef {
  id: string;
  name: string;
  color: string;
  models: string[];
}

const PROVIDERS: ProviderDef[] = [
  { id: "gemini", name: "Gemini", color: "#4285f4", models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-3.1-pro-preview", "gemini-3-flash-preview"] },
  { id: "openai", name: "OpenAI", color: "#10a37f", models: ["gpt-5.4", "gpt-5.4-mini", "gpt-4.1"] },
  { id: "anthropic", name: "Claude", color: "#d4a373", models: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"] },
  { id: "groq", name: "Groq", color: "#f55036", models: ["llama-3.3-70b-versatile"] },
];

interface Props { compact?: boolean }

export function ModelSwitcher({ compact = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeProviderId, setActiveProviderId] = useState<ProviderId>(getActiveProvider());
  const [activeModel, setActiveModel] = useState(() => {
    const p = PROVIDERS.find((pr) => pr.id === getActiveProvider());
    return p?.models[0] ?? "gemini-2.5-pro";
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleSelect = useCallback((providerId: string, model: string) => {
    setActiveProvider(providerId as ProviderId);
    setActiveProviderId(providerId as ProviderId);
    setActiveModel(model);
    setIsOpen(false);
  }, []);

  const providerDef = PROVIDERS.find((p) => p.id === activeProviderId) ?? PROVIDERS[0];

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors bg-white/5 hover:bg-white/10 text-white/60 border border-white/10"
        title={`${providerDef.name} / ${activeModel}`}>
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: providerDef.color }} />
        <span className={`truncate ${compact ? "max-w-[100px]" : "max-w-[140px]"}`}>{activeModel}</span>
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[280px] max-h-[420px] overflow-y-auto rounded-lg border border-white/10 bg-[#0f1419] shadow-xl">
          <div className="px-3 py-2 border-b border-white/8">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">모델 선택</span>
          </div>
          {PROVIDERS.map((provider) => {
            const hasKey = getApiKey(provider.id as ProviderId).trim().length > 0;
            return (
              <div key={provider.id}>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/3">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: provider.color }} />
                  <span className="text-[11px] font-semibold text-white/60">{provider.name}</span>
                  <span className="ml-auto">
                    <Key className={`w-3 h-3 ${hasKey ? "text-green-400" : "text-white/20"}`} />
                  </span>
                </div>
                {provider.models.map((model) => {
                  const isActive = provider.id === activeProviderId && model === activeModel;
                  return (
                    <button key={`${provider.id}-${model}`} onClick={() => handleSelect(provider.id, model)}
                      className={`w-full flex items-center gap-2 px-4 py-1.5 text-left text-xs transition-colors hover:bg-white/5 ${isActive ? "text-amber-400 bg-white/5" : "text-white/70"} ${!hasKey ? "opacity-50" : ""}`}>
                      {isActive ? <Check className="w-3 h-3 flex-shrink-0 text-amber-400" /> : <span className="w-3 h-3 flex-shrink-0" />}
                      <span className="truncate">{model}</span>
                      {!hasKey && <span className="ml-auto text-[10px] text-amber-500/70">키 필요</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
