"use client";

// ============================================================
// PART 1 — Settings Types & Defaults
// ============================================================
// Ported from CSL IDE SettingsPanel.tsx (simplified)

import { useState, useCallback } from "react";
import { X, RotateCcw } from "lucide-react";

export interface IDESettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  bracketGuides: boolean;
  stickyScroll: boolean;
  renderWhitespace: "none" | "selection" | "all";
  cursorStyle: "line" | "block" | "underline";
  theme: "dark" | "light";
  autoSave: boolean;
  autoSaveDelay: number;
  formatOnSave: boolean;
  terminalFontSize: number;
  aiTemperature: number;
  aiMaxTokens: number;
  aiGhostText: boolean;
  aiAutoSuggestDelay: number;
  pipelinePassThreshold: number;
}

const DEFAULT_SETTINGS: IDESettings = {
  fontSize: 14, tabSize: 2, wordWrap: true, minimap: true, lineNumbers: true,
  bracketGuides: true, stickyScroll: true, renderWhitespace: "selection",
  cursorStyle: "line", theme: "dark", autoSave: true, autoSaveDelay: 500,
  formatOnSave: false, terminalFontSize: 12, aiTemperature: 0.7,
  aiMaxTokens: 4096, aiGhostText: true, aiAutoSuggestDelay: 800,
  pipelinePassThreshold: 77,
};

const STORAGE_KEY = "eh_code_studio_settings";

export function loadIDESettings(): IDESettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

export function saveIDESettings(settings: IDESettings): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

// IDENTITY_SEAL: PART-1 | role=settings types + persistence | inputs=none | outputs=IDESettings

// ============================================================
// PART 2 — Settings Panel Component
// ============================================================

type SettingsTab = "editor" | "ai" | "pipeline";

interface Props {
  settings?: IDESettings;
  onChange?: (settings: IDESettings) => void;
  onClose?: () => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button" onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-accent-purple" : "bg-white/10"}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : ""}`} />
    </button>
  );
}

function NumberInput({ value, onChange, min, max, step = 1 }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <input
      type="number" value={value} min={min} max={max} step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-20 rounded-lg border border-white/8 bg-white/[0.02] px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-purple/40"
    />
  );
}

function SelectInput<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value as T)}
      className="rounded-lg border border-white/8 bg-white/[0.02] px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-purple/40"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-text-secondary">{label}</span>
      {children}
    </div>
  );
}

export function SettingsPanel({ settings: settingsProp, onChange: onChangeProp, onClose }: Props) {
  const [internalSettings, setInternalSettings] = useState<IDESettings>(() => settingsProp ?? loadIDESettings());
  const settings = settingsProp ?? internalSettings;
  const onChange = onChangeProp ?? ((next: IDESettings) => { setInternalSettings(next); saveIDESettings(next); });
  const [tab, setTab] = useState<SettingsTab>("editor");

  const update = useCallback(<K extends keyof IDESettings>(key: K, value: IDESettings[K]) => {
    const next = { ...settings, [key]: value };
    onChange(next);
    saveIDESettings(next);
  }, [settings, onChange]);

  const reset = useCallback(() => {
    onChange(DEFAULT_SETTINGS);
    saveIDESettings(DEFAULT_SETTINGS);
  }, [onChange]);

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "editor", label: "Editor" },
    { id: "ai", label: "AI" },
    { id: "pipeline", label: "Pipeline" },
  ];

  return (
    <div className="flex h-full flex-col" data-modal="settings" onKeyDown={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-accent-purple">Settings</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={reset} title="Reset" aria-label="설정 초기화" className="text-text-tertiary hover:text-text-primary"><RotateCcw size={14} /></button>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-text-tertiary hover:text-text-primary"><X size={14} /></button>
        </div>
      </div>

      <div className="flex border-b border-white/8">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs transition ${tab === t.id ? "border-b-2 border-accent-purple text-text-primary" : "text-text-tertiary hover:text-text-secondary"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {tab === "editor" && (
          <>
            <Row label="Font Size"><NumberInput value={settings.fontSize} onChange={(v) => update("fontSize", v)} min={10} max={24} /></Row>
            <Row label="Tab Size"><NumberInput value={settings.tabSize} onChange={(v) => update("tabSize", v)} min={1} max={8} /></Row>
            <Row label="Word Wrap"><Toggle checked={settings.wordWrap} onChange={(v) => update("wordWrap", v)} /></Row>
            <Row label="Minimap"><Toggle checked={settings.minimap} onChange={(v) => update("minimap", v)} /></Row>
            <Row label="Line Numbers"><Toggle checked={settings.lineNumbers} onChange={(v) => update("lineNumbers", v)} /></Row>
            <Row label="Bracket Guides"><Toggle checked={settings.bracketGuides} onChange={(v) => update("bracketGuides", v)} /></Row>
            <Row label="Sticky Scroll"><Toggle checked={settings.stickyScroll} onChange={(v) => update("stickyScroll", v)} /></Row>
            <Row label="Whitespace">
              <SelectInput value={settings.renderWhitespace} onChange={(v) => update("renderWhitespace", v)} options={[{ value: "none", label: "None" }, { value: "selection", label: "Selection" }, { value: "all", label: "All" }]} />
            </Row>
            <Row label="Cursor Style">
              <SelectInput value={settings.cursorStyle} onChange={(v) => update("cursorStyle", v)} options={[{ value: "line", label: "Line" }, { value: "block", label: "Block" }, { value: "underline", label: "Underline" }]} />
            </Row>
            <Row label="Auto Save"><Toggle checked={settings.autoSave} onChange={(v) => update("autoSave", v)} /></Row>
            <Row label="Format on Save"><Toggle checked={settings.formatOnSave} onChange={(v) => update("formatOnSave", v)} /></Row>
            <Row label="Terminal Font"><NumberInput value={settings.terminalFontSize} onChange={(v) => update("terminalFontSize", v)} min={8} max={20} /></Row>
          </>
        )}
        {tab === "ai" && (
          <>
            <Row label="Ghost Text"><Toggle checked={settings.aiGhostText} onChange={(v) => update("aiGhostText", v)} /></Row>
            <Row label="Temperature"><NumberInput value={settings.aiTemperature} onChange={(v) => update("aiTemperature", v)} min={0} max={2} step={0.1} /></Row>
            <Row label="Max Tokens"><NumberInput value={settings.aiMaxTokens} onChange={(v) => update("aiMaxTokens", v)} min={256} max={32768} step={256} /></Row>
            <Row label="Suggest Delay (ms)"><NumberInput value={settings.aiAutoSuggestDelay} onChange={(v) => update("aiAutoSuggestDelay", v)} min={200} max={3000} step={100} /></Row>
          </>
        )}
        {tab === "pipeline" && (
          <>
            <Row label="Pass Threshold"><NumberInput value={settings.pipelinePassThreshold} onChange={(v) => update("pipelinePassThreshold", v)} min={0} max={100} /></Row>
            <p className="pt-2 text-[10px] text-text-tertiary">
              Score below this threshold will be marked as &quot;fail&quot;. Default: 77.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=settings panel UI | inputs=IDESettings | outputs=settings form with tabs
