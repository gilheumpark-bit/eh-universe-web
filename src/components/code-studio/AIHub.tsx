"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState } from "react";
import { Cpu, ToggleLeft, ToggleRight, BarChart3, Settings, Zap, Shield, Bot, Code2 } from "lucide-react";
import { PROVIDERS, PROVIDER_LIST, getApiKey, type ProviderId } from "@/lib/ai-providers";

export interface AIFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: "generation" | "analysis" | "automation" | "security";
  enabled: boolean;
  usageCount: number;
}

interface AIHubProps {
  features: AIFeature[];
  onToggleFeature: (id: string, enabled: boolean) => void;
  onConfigureProvider?: (id: ProviderId) => void;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=AIFeature

// ============================================================
// PART 2 — Provider Status Cards
// ============================================================

function ProviderCard({
  providerId,
  onConfigure,
}: {
  providerId: ProviderId;
  onConfigure?: () => void;
}) {
  const provider = PROVIDERS[providerId];
  const hasKey = !!getApiKey(providerId);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: provider.color }} />
      <div className="flex-1">
        <div className="text-sm text-white">{provider.name}</div>
        <div className="text-[10px] text-gray-500">
          {hasKey ? "Configured" : "Not configured"} | {provider.capabilities.costTier}
        </div>
      </div>
      <span className={`h-2 w-2 rounded-full ${hasKey ? "bg-green-400" : "bg-gray-600"}`} />
      {onConfigure && (
        <button onClick={onConfigure} className="p-1 text-gray-500 hover:text-white">
          <Settings size={12} />
        </button>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=ProviderCard | inputs=ProviderId | outputs=JSX

// ============================================================
// PART 3 — Feature Grid
// ============================================================

const CATEGORY_COLORS: Record<AIFeature["category"], string> = {
  generation: "text-blue-400",
  analysis: "text-green-400",
  automation: "text-purple-400",
  security: "text-red-400",
};

function FeatureCard({
  feature,
  onToggle,
}: {
  feature: AIFeature;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
      <span className={CATEGORY_COLORS[feature.category]}>{feature.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{feature.name}</span>
          <span className="text-[10px] text-gray-600 uppercase">{feature.category}</span>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{feature.description}</p>
        {feature.usageCount > 0 && (
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-gray-600">
            <BarChart3 size={10} /> {feature.usageCount} uses
          </span>
        )}
      </div>
      <button onClick={onToggle} className="shrink-0 mt-0.5">
        {feature.enabled ? (
          <ToggleRight size={20} className="text-green-400" />
        ) : (
          <ToggleLeft size={20} className="text-gray-600" />
        )}
      </button>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=FeatureGrid | inputs=AIFeature | outputs=JSX

// ============================================================
// PART 4 — Main Hub Component
// ============================================================

export default function AIHub({ features, onToggleFeature, onConfigureProvider }: AIHubProps) {
  const [categoryFilter, setCategoryFilter] = useState<AIFeature["category"] | "all">("all");

  const categories: Array<AIFeature["category"] | "all"> = ["all", "generation", "analysis", "automation", "security"];

  const filtered = categoryFilter === "all" ? features : features.filter((f) => f.category === categoryFilter);

  const totalEnabled = features.filter((f) => f.enabled).length;
  const totalUsage = features.reduce((s, f) => s + f.usageCount, 0);

  return (
    <div className="flex h-full flex-col bg-[#16161e]">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <Cpu size={18} />
          <h2 className="text-lg font-semibold">AI Hub</h2>
        </div>
        <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
          <span>{totalEnabled}/{features.length} features enabled</span>
          <span>{totalUsage} total uses</span>
        </div>
      </div>

      {/* Providers */}
      <div className="border-b border-white/5 p-4">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Providers</h3>
        <div className="grid grid-cols-2 gap-2">
          {PROVIDER_LIST.map((p) => (
            <ProviderCard
              key={p.id}
              providerId={p.id}
              onConfigure={onConfigureProvider ? () => onConfigureProvider(p.id) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="border-b border-white/5 px-4 py-2 flex gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`rounded-full px-2.5 py-0.5 text-xs capitalize transition-colors ${
              categoryFilter === c
                ? "bg-white/10 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Features */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filtered.map((f) => (
          <FeatureCard
            key={f.id}
            feature={f}
            onToggle={() => onToggleFeature(f.id, !f.enabled)}
          />
        ))}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=AIHubUI | inputs=features,providers | outputs=JSX
