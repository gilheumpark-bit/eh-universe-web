"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Zap, Check, AlertTriangle } from "lucide-react";
import {
  PROVIDERS, PROVIDER_LIST_UI, getActiveProvider, setActiveProvider,
  getActiveModel, setActiveModel, getApiKey, isPreviewModel,
  type ProviderId,
} from "@/lib/ai-providers";

interface ModelSelectorProps {
  onProviderChange?: (id: ProviderId) => void;
  onModelChange?: (model: string) => void;
  compact?: boolean;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=props

// ============================================================
// PART 2 — Token Cost Estimate
// ============================================================

const COST_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "Free", color: "text-green-400" },
  cheap: { label: "$", color: "text-green-300" },
  moderate: { label: "$$", color: "text-yellow-400" },
  expensive: { label: "$$$", color: "text-red-400" },
};

function CostBadge({ tier }: { tier: string }) {
  const info = COST_LABELS[tier] ?? COST_LABELS.free;
  return <span className={`text-[10px] font-bold ${info.color}`}>{info.label}</span>;
}

// IDENTITY_SEAL: PART-2 | role=CostEstimate | inputs=costTier | outputs=JSX

// ============================================================
// PART 3 — Dropdown Component
// ============================================================

export default function ModelSelector({
  onProviderChange,
  onModelChange,
  compact = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [activeProvider, setActiveProviderState] = useState<ProviderId>(getActiveProvider());
  const [activeModel, setActiveModelState] = useState(getActiveModel());
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const provider = PROVIDERS[activeProvider];
  const hasKey = !!getApiKey(activeProvider);

  const handleSelectModel = (providerId: ProviderId, model: string) => {
    setActiveProvider(providerId);
    setActiveModel(model);
    setActiveProviderState(providerId);
    setActiveModelState(model);
    onProviderChange?.(providerId);
    onModelChange?.(model);
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-300 hover:bg-white/10 transition-colors"
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: provider.color }}
        />
        {!compact && <span className="max-w-[120px] truncate">{activeModel}</span>}
        {compact && <span className="max-w-[80px] truncate">{provider.name.split(" ")[0]}</span>}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 max-h-80 overflow-y-auto rounded-lg border border-white/10 bg-[#1e1e2e] shadow-xl">
          {PROVIDER_LIST_UI.map((p) => {
            const pId = p.id as ProviderId;
            const pKey = getApiKey(pId);
            const configured = !!pKey || p.capabilities.isLocal;
            return (
              <div key={p.id} className="border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="font-medium">{p.name}</span>
                  <CostBadge tier={p.capabilities.costTier} />
                  {!configured && (
                    <span className="ml-auto text-[10px] text-yellow-500">No key</span>
                  )}
                </div>
                {p.models.map((m) => {
                  const isActive = activeProvider === pId && activeModel === m;
                  const preview = isPreviewModel(m);
                  return (
                    <button
                      key={m}
                      disabled={!configured}
                      onClick={() => handleSelectModel(pId, m)}
                      className={`flex w-full items-center gap-2 px-4 py-1 text-xs transition-colors ${
                        isActive
                          ? "bg-white/10 text-white"
                          : configured
                          ? "text-gray-300 hover:bg-white/5"
                          : "text-gray-600 cursor-not-allowed"
                      }`}
                    >
                      {isActive && <Check size={12} className="text-green-400" />}
                      <span className="truncate">{m}</span>
                      {preview && <AlertTriangle size={10} className="ml-auto text-yellow-500" />}
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

// IDENTITY_SEAL: PART-3 | role=ModelSelectorUI | inputs=props | outputs=JSX
