"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Key, Trash2, RotateCcw, Zap, Shield, Eye, EyeOff,
  Activity, DollarSign, ChevronDown, ChevronRight, CheckCircle2,
  AlertTriangle, Loader2, Layers, BarChart3,
} from "lucide-react";
import {
  type ProviderId,
  type AgentRole,
  type KeySlot,
  type MultiKeyConfig,
  loadMultiKeyConfig,
  saveMultiKeyConfig,
  createEmptySlot,
  getActiveSlotCount,
  getTotalUsage,
  resetSlotUsage,
} from "@/lib/multi-key-manager";
import { PROVIDERS, PROVIDER_LIST_UI, testApiKey } from "@/lib/ai-providers";

// ============================================================
// PART 1 — Constants & Labels
// ============================================================

const ROLE_LABELS: Record<AgentRole, { ko: string; en: string; icon: string }> = {
  writer:       { ko: "집필", en: "Writer", icon: "✍️" },
  reviewer:     { ko: "리뷰", en: "Reviewer", icon: "🔍" },
  translator:   { ko: "번역", en: "Translator", icon: "🌐" },
  worldbuilder: { ko: "세계관", en: "Worldbuilder", icon: "🌌" },
  coder:        { ko: "코드", en: "Coder", icon: "</>" },
  analyst:      { ko: "분석", en: "Analyst", icon: "📊" },
  general:      { ko: "범용", en: "General", icon: "⚡" },
};

const ROLES: AgentRole[] = ["general", "writer", "reviewer", "translator", "worldbuilder", "coder", "analyst"];

const PROVIDER_COLORS: Record<ProviderId, string> = {
  gemini: "#4285f4",
  openai: "#10a37f",
  claude: "#d97706",
  groq: "#f55036",
  mistral: "#ff7000",
  ollama: "#6c4c3e",
  lmstudio: "#2d5d8d",
};

// ============================================================
// PART 2 — Props & Sub-types
// ============================================================

interface MultiKeyPanelProps {
  language?: "ko" | "en";
  onClose?: () => void;
}

type TestState = "idle" | "testing" | "success" | "error";

// ============================================================
// PART 3 — Main Component
// ============================================================

const MultiKeyPanel: React.FC<MultiKeyPanelProps> = ({ language = "ko", onClose }) => {
  const ko = language === "ko";
  const [config, setConfig] = useState<MultiKeyConfig>(() => loadMultiKeyConfig());
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testStates, setTestStates] = useState<Record<string, TestState>>({});
  const [showDashboard, setShowDashboard] = useState(false);

  const activeCount = useMemo(() => getActiveSlotCount(config), [config]);
  const totalUsage = useMemo(() => getTotalUsage(config), [config]);

  // ============================================================
  // PART 4 — Handlers
  // ============================================================

  const persist = useCallback((next: MultiKeyConfig) => {
    setConfig(next);
    saveMultiKeyConfig(next);
  }, []);

  const updateSlot = useCallback((slotId: string, patch: Partial<KeySlot>) => {
    persist({
      ...config,
      slots: config.slots.map((s) =>
        s.id === slotId ? { ...s, ...patch } : s
      ),
    });
  }, [config, persist]);

  const handleProviderChange = useCallback((slotId: string, provider: ProviderId) => {
    const defaultModel = PROVIDERS[provider]?.defaultModel ?? "default";
    updateSlot(slotId, { provider, model: defaultModel });
  }, [updateSlot]);

  const handleKeyTest = useCallback(async (slot: KeySlot) => {
    if (!slot.apiKey.trim()) return;
    setTestStates((p) => ({ ...p, [slot.id]: "testing" }));
    try {
      const ok = await testApiKey(slot.provider, slot.apiKey);
      setTestStates((p) => ({ ...p, [slot.id]: ok ? "success" : "error" }));
    } catch {
      setTestStates((p) => ({ ...p, [slot.id]: "error" }));
    }
  }, []);

  const handleResetUsage = useCallback((slotId: string) => {
    persist(resetSlotUsage(config, slotId));
  }, [config, persist]);

  const handleClearSlot = useCallback((slotId: string) => {
    const idx = config.slots.findIndex((s) => s.id === slotId);
    if (idx === -1) return;
    persist({
      ...config,
      slots: config.slots.map((s) =>
        s.id === slotId ? createEmptySlot(idx + 1) : s
      ),
    });
  }, [config, persist]);

  const toggleExpand = useCallback((slotId: string) => {
    setExpandedSlot((prev) => (prev === slotId ? null : slotId));
  }, []);

  // ============================================================
  // PART 5 — Render: Header
  // ============================================================

  return (
    <div className="flex flex-col h-full bg-bg-tertiary text-text-primary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">
            {ko ? "멀티키 매니저" : "Multi-Key Manager"}
          </h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
            {activeCount}/7
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            aria-expanded={showDashboard}
            aria-pressed={showDashboard}
            aria-label={ko ? '사용량 대시보드 토글' : 'Toggle usage dashboard'}
            className="p-1.5 rounded hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            title={ko ? "사용량 대시보드" : "Usage Dashboard"}
          >
            <BarChart3 className="w-4 h-4 text-gray-400" />
          </button>
          {onClose && (
            <button onClick={onClose} aria-label={ko ? '패널 닫기' : 'Close panel'} className="p-1.5 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* PART 6 — Render: Usage Dashboard */}
      {/* ============================================================ */}

      {showDashboard && (
        <div className="px-4 py-3 border-b border-white/10 bg-bg-secondary">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-400">{totalUsage.calls.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500 uppercase">{ko ? "총 호출" : "Total Calls"}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">
                {totalUsage.tokens > 1_000_000
                  ? `${(totalUsage.tokens / 1_000_000).toFixed(1)}M`
                  : totalUsage.tokens > 1_000
                    ? `${(totalUsage.tokens / 1_000).toFixed(1)}K`
                    : totalUsage.tokens}
              </div>
              <div className="text-[10px] text-gray-500 uppercase">{ko ? "총 토큰" : "Total Tokens"}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-400">${totalUsage.cost.toFixed(4)}</div>
              <div className="text-[10px] text-gray-500 uppercase">{ko ? "추정 비용" : "Est. Cost"}</div>
            </div>
          </div>

          {/* Global toggles */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={config.crossValidation}
                onChange={(e) => persist({ ...config, crossValidation: e.target.checked })}
                className="accent-emerald-500"
              />
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              {ko ? "크로스밸리데이션" : "Cross-Validation"}
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={config.parallelExecution}
                onChange={(e) => persist({ ...config, parallelExecution: e.target.checked })}
                className="accent-emerald-500"
              />
              <Zap className="w-3.5 h-3.5 text-accent-amber" />
              {ko ? "병렬 실행" : "Parallel Exec"}
            </label>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>{ko ? "최대" : "Max"}</span>
              <select
                value={config.maxParallel}
                onChange={(e) => persist({ ...config, maxParallel: Number(e.target.value) })}
                className="bg-transparent border border-white/10 rounded px-1 py-0.5 text-text-secondary text-xs"
              >
                {[2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PART 7 — Render: Slot List */}
      {/* ============================================================ */}

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {config.slots.map((slot) => {
          const isExpanded = expandedSlot === slot.id;
          const isActive = slot.enabled && !!slot.apiKey;
          const testState = testStates[slot.id] ?? "idle";
          const providerDef = PROVIDERS[slot.provider];
          const roleInfo = ROLE_LABELS[slot.assignedRole];

          return (
            <div
              key={slot.id}
              className={`rounded-lg border transition-[transform,opacity,background-color,border-color,color] ${
                isActive
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              {/* Slot Header */}
              <button
                onClick={() => toggleExpand(slot.id)}
                aria-expanded={isExpanded}
                aria-label={ko ? `슬롯 ${slot.id} ${isExpanded ? '접기' : '펼치기'}` : `${isExpanded ? 'Collapse' : 'Expand'} slot ${slot.id}`}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              >
                {isExpanded
                  ? <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                }
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: isActive ? PROVIDER_COLORS[slot.provider] : "#374151" }}
                />
                <span className="text-xs font-mono text-gray-400 shrink-0">
                  {slot.id.replace("slot-", "#")}
                </span>
                {isActive ? (
                  <>
                    <span className="text-xs font-medium text-white truncate">
                      {providerDef?.name ?? slot.provider}
                    </span>
                    <span className="text-[10px] text-gray-500 truncate">
                      {slot.model}
                    </span>
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                      {roleInfo.icon} {ko ? roleInfo.ko : roleInfo.en}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-600 italic">
                    {ko ? "비활성" : "Empty"}
                  </span>
                )}
              </button>

              {/* ============================================================ */}
              {/* PART 8 — Render: Expanded Slot Detail */}
              {/* ============================================================ */}

              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-white/5">
                  {/* Provider + Model */}
                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase mb-1 block">
                        {ko ? "노아 엔진" : "Provider"}
                      </label>
                      <select
                        value={slot.provider}
                        onChange={(e) => handleProviderChange(slot.id, e.target.value as ProviderId)}
                        className="w-full bg-bg-tertiary border border-white/10 rounded px-2 py-1.5 text-xs text-text-primary"
                      >
                        {PROVIDER_LIST_UI.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase mb-1 block">
                        {ko ? "모델" : "Model"}
                      </label>
                      <select
                        value={slot.model}
                        onChange={(e) => updateSlot(slot.id, { model: e.target.value })}
                        className="w-full bg-bg-tertiary border border-white/10 rounded px-2 py-1.5 text-xs text-text-primary"
                      >
                        {(providerDef?.models ?? []).map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Label */}
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase mb-1 block">
                      {ko ? "라벨" : "Label"}
                    </label>
                    <input
                      type="text"
                      value={slot.label}
                      onChange={(e) => updateSlot(slot.id, { label: e.target.value })}
                      placeholder={ko ? "예: 빠른 생성용" : "e.g. Fast generation"}
                      className="w-full bg-bg-tertiary border border-white/10 rounded px-2 py-1.5 text-xs text-text-primary placeholder:text-white/50"
                    />
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase mb-1 block">
                      {providerDef?.isUrlBased ? "Base URL" : "API Key"}
                    </label>
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type={showKeys[slot.id] ? "text" : "password"}
                          value={slot.apiKey}
                          onChange={(e) => updateSlot(slot.id, { apiKey: e.target.value })}
                          placeholder={providerDef?.placeholder ?? ""}
                          className="w-full bg-bg-tertiary border border-white/10 rounded px-2 py-1.5 text-xs text-text-primary pr-8 font-mono placeholder:text-white/50"
                        />
                        <button
                          onClick={() => setShowKeys((p) => ({ ...p, [slot.id]: !p[slot.id] }))}
                          aria-pressed={!!showKeys[slot.id]}
                          aria-label={ko ? (showKeys[slot.id] ? 'API 키 숨기기' : 'API 키 표시') : (showKeys[slot.id] ? 'Hide API key' : 'Show API key')}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
                        >
                          {showKeys[slot.id]
                            ? <EyeOff className="w-3.5 h-3.5" />
                            : <Eye className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                      <button
                        onClick={() => handleKeyTest(slot)}
                        disabled={!slot.apiKey.trim() || testState === "testing"}
                        className="px-2.5 py-1.5 rounded border border-white/10 text-xs hover:bg-white/5 disabled:opacity-40 transition-colors flex items-center gap-1"
                      >
                        {testState === "testing" && <Loader2 className="w-3 h-3 animate-spin" />}
                        {testState === "success" && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {testState === "error" && <AlertTriangle className="w-3 h-3 text-red-400" />}
                        {testState === "idle" && <Key className="w-3 h-3" />}
                        {ko ? "테스트" : "Test"}
                      </button>
                    </div>
                  </div>

                  {/* Role + Enable */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase mb-1 block">
                        {ko ? "에이전트 역할" : "Agent Role"}
                      </label>
                      <select
                        value={slot.assignedRole}
                        onChange={(e) => updateSlot(slot.id, { assignedRole: e.target.value as AgentRole })}
                        className="w-full bg-bg-tertiary border border-white/10 rounded px-2 py-1.5 text-xs text-text-primary"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r].icon} {ko ? ROLE_LABELS[r].ko : ROLE_LABELS[r].en}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2 text-xs cursor-pointer py-1.5">
                        <input
                          type="checkbox"
                          checked={slot.enabled}
                          onChange={(e) => updateSlot(slot.id, { enabled: e.target.checked })}
                          className="accent-emerald-500"
                        />
                        <span className={slot.enabled ? "text-emerald-400" : "text-gray-500"}>
                          {slot.enabled
                            ? (ko ? "활성" : "Active")
                            : (ko ? "비활성" : "Disabled")
                          }
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  {slot.usage.totalCalls > 0 && (
                    <div className="rounded bg-white/[0.03] p-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {ko ? "사용량" : "Usage"}
                        </span>
                        <button
                          onClick={() => handleResetUsage(slot.id)}
                          className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-0.5"
                          title={ko ? "초기화" : "Reset"}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xs font-mono text-white">{slot.usage.totalCalls}</div>
                          <div className="text-[9px] text-gray-600">{ko ? "호출" : "Calls"}</div>
                        </div>
                        <div>
                          <div className="text-xs font-mono text-white">
                            {((slot.usage.totalInputTokens + slot.usage.totalOutputTokens) / 1000).toFixed(1)}K
                          </div>
                          <div className="text-[9px] text-gray-600">{ko ? "토큰" : "Tokens"}</div>
                        </div>
                        <div>
                          <div className="text-xs font-mono text-amber-400">
                            ${slot.usage.estimatedCostUSD.toFixed(4)}
                          </div>
                          <div className="text-[9px] text-gray-600">{ko ? "비용" : "Cost"}</div>
                        </div>
                      </div>
                      {slot.usage.lastUsed && (
                        <div className="text-[9px] text-gray-600 text-right mt-1">
                          {ko ? "마지막" : "Last"}: {new Date(slot.usage.lastUsed).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleClearSlot(slot.id)}
                      className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {ko ? "슬롯 초기화" : "Clear Slot"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* PART 9 — Render: Footer Info */}
      {/* ============================================================ */}

      <div className="px-4 py-2.5 border-t border-white/10 bg-bg-tertiary">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
          <DollarSign className="w-3 h-3" />
          {ko
            ? "API 키는 브라우저에 저장됩니다. 과금은 각 노아 엔진 계정에서 직접 발생합니다."
            : "Keys stored locally. Costs billed directly to your provider accounts."
          }
        </div>
      </div>
    </div>
  );
};

export default MultiKeyPanel;

// IDENTITY_SEAL: PART-1 | role=Constants | inputs=none | outputs=labels,colors
// IDENTITY_SEAL: PART-2 | role=Props | inputs=none | outputs=types
// IDENTITY_SEAL: PART-3 | role=Component | inputs=language,onClose | outputs=JSX
// IDENTITY_SEAL: PART-4 | role=Handlers | inputs=config | outputs=persist,updateSlot
// IDENTITY_SEAL: PART-5 | role=Header | inputs=activeCount | outputs=JSX
// IDENTITY_SEAL: PART-6 | role=Dashboard | inputs=totalUsage,config | outputs=JSX
// IDENTITY_SEAL: PART-7 | role=SlotList | inputs=config.slots | outputs=JSX
// IDENTITY_SEAL: PART-8 | role=SlotDetail | inputs=slot,expandedSlot | outputs=JSX
// IDENTITY_SEAL: PART-9 | role=Footer | inputs=none | outputs=JSX
