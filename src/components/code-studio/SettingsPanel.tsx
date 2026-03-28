"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Sun, Moon, Brain, Plus, Unplug, Server, Download, Upload, RotateCcw } from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import { mcpClient, type MCPServer } from "@/lib/mcp-client";
import { Tabs } from "@/components/ui/Tabs";
import { useLocale } from "@/lib/i18n";

export interface IDESettings {
  // Editor
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  bracketGuides: boolean;
  stickyScroll: boolean;
  renderWhitespace: "none" | "selection" | "all";
  cursorStyle: "line" | "block" | "underline";
  // Theme
  theme: "dark" | "light";
  // Save
  autoSave: boolean;
  autoSaveDelay: number;
  formatOnSave: boolean;
  // Terminal
  terminalFontSize: number;
  // AI
  aiTemperature: number;
  aiMaxTokens: number;
  aiGhostText: boolean;
  aiAutoSuggestDelay: number;
  // Pipeline
  pipelinePassThreshold: number;
  pipelineTeams: {
    syntax: boolean;
    security: boolean;
    performance: boolean;
    style: boolean;
    testing: boolean;
  };
}

const DEFAULT_SETTINGS: IDESettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  lineNumbers: true,
  bracketGuides: true,
  stickyScroll: true,
  renderWhitespace: "selection",
  cursorStyle: "line",
  theme: "dark",
  autoSave: true,
  autoSaveDelay: 500,
  formatOnSave: false,
  terminalFontSize: 12,
  aiTemperature: 0.7,
  aiMaxTokens: 4096,
  aiGhostText: true,
  aiAutoSuggestDelay: 800,
  pipelinePassThreshold: 77,
  pipelineTeams: {
    syntax: true,
    security: true,
    performance: true,
    style: true,
    testing: true,
  },
};

const STORAGE_KEY = "csl_ide_settings";

export function loadSettings(): IDESettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: IDESettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

interface Props {
  settings: IDESettings;
  onChange: (settings: IDESettings) => void;
  onClose: () => void;
}

type SettingsTab = "general" | "editor" | "ai" | "pipeline";

const SETTINGS_TAB_LABELS: Record<SettingsTab, string> = {
  general: "General",
  editor: "Editor",
  ai: "AI",
  pipeline: "Pipeline",
};

// Map each setting label to its tab for filtering
const SETTING_TAB_MAP: Record<string, SettingsTab> = {
  "settings.theme": "general", "settings.language": "general", "자동 저장": "general",
  "폰트 크기": "editor", "탭 크기": "editor", "자동 줄 바꿈": "editor", "미니맵": "editor",
  "줄 번호": "editor", "괄호 가이드": "editor", "Sticky Scroll": "editor",
  "공백 문자 렌더링": "editor", "커서 스타일": "editor", "저장 시 포맷": "editor",
  "터미널 폰트 크기": "editor",
  "Ghost Text": "ai", "Temperature": "ai", "Max Tokens": "ai", "자동 제안 지연 (ms)": "ai",
  "모델 슬롯 구성": "ai",
  "통과 기준점": "pipeline", "Syntax 팀": "pipeline", "Security 팀": "pipeline",
  "Performance 팀": "pipeline", "Style 팀": "pipeline", "Testing 팀": "pipeline",
};

export function SettingsPanel({ settings, onChange, onClose }: Props) {
  const { locale, setLocale: changeLocale, t } = useLocale();
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [mcpUrl, setMcpUrl] = useState("");
  const [mcpConnecting, setMcpConnecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SettingsTab | "all">("all");
  const [pendingSettings, setPendingSettings] = useState<IDESettings | null>(null);

  // Check if a setting label should be visible given current search & tab filters
  const isVisible = (label: string): boolean => {
    if (searchQuery && !label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeTab !== "all" && SETTING_TAB_MAP[label] && SETTING_TAB_MAP[label] !== activeTab) return false;
    return true;
  };

  // Preview changes: diff between current and pending
  const pendingChanges = pendingSettings
    ? (Object.keys(pendingSettings) as (keyof IDESettings)[]).filter(
        (k) => JSON.stringify(pendingSettings[k]) !== JSON.stringify(settings[k])
      )
    : [];

  const applyPendingChanges = () => {
    if (pendingSettings) {
      onChange(pendingSettings);
      saveSettings(pendingSettings);
      setPendingSettings(null);
    }
  };

  useEffect(() => {
    setMcpServers(mcpClient.getServers());
  }, []);

  const handleMcpConnect = useCallback(async () => {
    if (!mcpUrl.trim()) return;
    setMcpConnecting(true);
    try {
      await mcpClient.connect(mcpUrl.trim());
      setMcpServers(mcpClient.getServers());
      setMcpUrl("");
    } catch (err) {
      console.error("[MCP] connect error:", err);
    } finally {
      setMcpConnecting(false);
    }
  }, [mcpUrl]);

  const handleMcpDisconnect = useCallback((serverId: string) => {
    mcpClient.disconnect(serverId);
    setMcpServers(mcpClient.getServers());
  }, []);

  const update = <K extends keyof IDESettings>(key: K, value: IDESettings[K]) => {
    const next = { ...settings, [key]: value };
    onChange(next);
    saveSettings(next);
  };

  const handleExportSettings = useCallback(() => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "csl-ide-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [settings]);

  const handleImportSettings = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result as string);
          const merged = { ...DEFAULT_SETTINGS, ...imported };
          onChange(merged);
          saveSettings(merged);
        } catch {
          alert("설정 파일을 읽을 수 없습니다.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [onChange]);

  const handleResetDefaults = useCallback(() => {
    if (confirm("모든 설정을 기본값으로 초기화하시겠습니까?")) {
      onChange(DEFAULT_SETTINGS);
      saveSettings(DEFAULT_SETTINGS);
    }
  }, [onChange]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl w-[420px] max-h-[500px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="text-sm font-semibold">설정</span>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white"><X size={14} /></button>
        </div>

        {/* Search settings */}
        <div className="px-4 pt-3">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="설정 검색..."
            className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1 text-[11px] outline-none focus:border-[var(--accent-blue)]"
          />
        </div>

        {/* Category tabs */}
        <div className="px-4 pt-2 pb-1">
          <Tabs
            tabs={[
              { id: "all", label: "All" },
              { id: "general", label: SETTINGS_TAB_LABELS.general },
              { id: "editor", label: SETTINGS_TAB_LABELS.editor },
              { id: "ai", label: SETTINGS_TAB_LABELS.ai },
              { id: "pipeline", label: SETTINGS_TAB_LABELS.pipeline },
            ]}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as SettingsTab | "all")}
            variant="pills"
            size="sm"
          />
        </div>

        {/* Preview pending changes banner */}
        {pendingChanges.length > 0 && (
          <div className="mx-4 mt-1 p-2 bg-[var(--accent-yellow)]/10 border border-[var(--accent-yellow)]/30 rounded text-[10px]">
            <div className="text-[var(--accent-yellow)] font-semibold mb-1">{pendingChanges.length}개 변경 미적용</div>
            <div className="text-[var(--text-secondary)] mb-1">{pendingChanges.join(", ")}</div>
            <div className="flex gap-2">
              <button onClick={applyPendingChanges} className="px-2 py-0.5 bg-[var(--accent-green)]/20 text-[var(--accent-green)] rounded text-[9px]">적용</button>
              <button onClick={() => setPendingSettings(null)} className="px-2 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded text-[9px]">취소</button>
            </div>
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* Theme */}
          {isVisible(t("settings.theme")) && (
          <SettingRow label={t("settings.theme")}>
            <div className="flex gap-1">
              <ToggleButton active={settings.theme === "dark"} onClick={() => update("theme", "dark")}><Moon size={12} /> Dark</ToggleButton>
              <ToggleButton active={settings.theme === "light"} onClick={() => update("theme", "light")}><Sun size={12} /> Light</ToggleButton>
            </div>
          </SettingRow>
          )}

          {/* Language */}
          {isVisible(t("settings.language")) && (
          <SettingRow label={t("settings.language")}>
            <div className="flex gap-1">
              <ToggleButton active={locale === "ko"} onClick={() => changeLocale("ko")}>한국어</ToggleButton>
              <ToggleButton active={locale === "en"} onClick={() => changeLocale("en")}>English</ToggleButton>
            </div>
          </SettingRow>
          )}

          {/* Font Size */}
          {isVisible("폰트 크기") && (
          <SettingRow label="폰트 크기">
            <div className="flex items-center gap-2">
              <input
                type="range" min={10} max={24} value={settings.fontSize}
                onChange={(e) => update("fontSize", Number(e.target.value))}
                className="flex-1 accent-[var(--accent-blue)]"
              />
              <span className="text-xs w-8 text-center">{settings.fontSize}px</span>
            </div>
          </SettingRow>
          )}

          {/* Tab Size */}
          {isVisible("탭 크기") && (
          <SettingRow label="탭 크기">
            <div className="flex gap-1">
              {[2, 4, 8].map((n) => (
                <ToggleButton key={n} active={settings.tabSize === n} onClick={() => update("tabSize", n)}>{n}</ToggleButton>
              ))}
            </div>
          </SettingRow>
          )}

          {/* Toggles */}
          {isVisible("자동 줄 바꿈") && (
          <SettingRow label="자동 줄 바꿈">
            <Toggle checked={settings.wordWrap} onChange={(v) => update("wordWrap", v)} />
          </SettingRow>
          )}

          {isVisible("미니맵") && (
          <SettingRow label="미니맵">
            <Toggle checked={settings.minimap} onChange={(v) => update("minimap", v)} />
          </SettingRow>
          )}

          {isVisible("줄 번호") && (
          <SettingRow label="줄 번호">
            <Toggle checked={settings.lineNumbers} onChange={(v) => update("lineNumbers", v)} />
          </SettingRow>
          )}

          {isVisible("자동 저장") && (
          <SettingRow label="자동 저장">
            <Toggle checked={settings.autoSave} onChange={(v) => update("autoSave", v)} />
          </SettingRow>
          )}

          {/* Advanced Editor */}
          <div className="border-t border-[var(--border)] pt-3 mt-3">
            <p className="text-[10px] font-semibold text-[var(--text-secondary)] mb-2">에디터 고급</p>
          </div>

          <SettingRow label="괄호 가이드">
            <Toggle checked={settings.bracketGuides} onChange={(v) => update("bracketGuides", v)} />
          </SettingRow>

          <SettingRow label="Sticky Scroll">
            <Toggle checked={settings.stickyScroll} onChange={(v) => update("stickyScroll", v)} />
          </SettingRow>

          <SettingRow label="공백 문자 렌더링">
            <div className="flex gap-1">
              {(["none", "selection", "all"] as const).map((v) => (
                <ToggleButton key={v} active={settings.renderWhitespace === v} onClick={() => update("renderWhitespace", v)}>{v}</ToggleButton>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="커서 스타일">
            <div className="flex gap-1">
              {(["line", "block", "underline"] as const).map((v) => (
                <ToggleButton key={v} active={settings.cursorStyle === v} onClick={() => update("cursorStyle", v)}>{v}</ToggleButton>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="저장 시 포맷">
            <Toggle checked={settings.formatOnSave} onChange={(v) => update("formatOnSave", v)} />
          </SettingRow>

          {/* Terminal */}
          <div className="border-t border-[var(--border)] pt-3 mt-3">
            <p className="text-[10px] font-semibold text-[var(--text-secondary)] mb-2">터미널</p>
          </div>

          <SettingRow label="터미널 폰트 크기">
            <div className="flex items-center gap-2">
              <input type="range" min={10} max={20} value={settings.terminalFontSize} onChange={(e) => update("terminalFontSize", Number(e.target.value))} className="flex-1 accent-[var(--accent-blue)]" />
              <span className="text-xs w-8 text-center">{settings.terminalFontSize}px</span>
            </div>
          </SettingRow>

          {/* AI */}
          <div className="border-t border-[var(--border)] pt-3 mt-3">
            <p className="text-[10px] font-semibold text-[var(--text-secondary)] mb-2">AI</p>
          </div>

          <SettingRow label="Ghost Text">
            <Toggle checked={settings.aiGhostText} onChange={(v) => update("aiGhostText", v)} />
          </SettingRow>

          <SettingRow label="Temperature">
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={100} value={Math.round(settings.aiTemperature * 100)} onChange={(e) => update("aiTemperature", Number(e.target.value) / 100)} className="flex-1 accent-[var(--accent-purple)]" />
              <span className="text-xs w-8 text-center">{settings.aiTemperature.toFixed(1)}</span>
            </div>
          </SettingRow>

          <SettingRow label="Max Tokens">
            <div className="flex items-center gap-2">
              <input type="range" min={256} max={32768} step={256} value={settings.aiMaxTokens} onChange={(e) => update("aiMaxTokens", Number(e.target.value))} className="flex-1 accent-[var(--accent-purple)]" />
              <span className="text-xs w-12 text-center">{settings.aiMaxTokens}</span>
            </div>
          </SettingRow>

          <SettingRow label="자동 제안 지연 (ms)">
            <div className="flex items-center gap-2">
              <input type="range" min={300} max={2000} step={100} value={settings.aiAutoSuggestDelay} onChange={(e) => update("aiAutoSuggestDelay", Number(e.target.value))} className="flex-1 accent-[var(--accent-purple)]" />
              <span className="text-xs w-10 text-center">{settings.aiAutoSuggestDelay}</span>
            </div>
          </SettingRow>

          {/* Model Settings */}
          <div className="border-t border-[var(--border)] pt-3 mt-3">
            <p className="text-[10px] font-semibold text-[var(--text-secondary)] mb-2">모델 설정</p>
          </div>

          <SettingRow label="모델 슬롯 구성">
            <button
              onClick={() => setShowModelSelector(true)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] border border-[var(--accent-purple)]/40 hover:bg-[var(--accent-purple)]/30 transition-colors"
            >
              <Brain size={10} /> 모델 선택
            </button>
          </SettingRow>

          {/* MCP 서버 */}
          <div className="border-t border-[var(--border)] pt-3 mt-3">
            <p className="text-[10px] font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-1"><Server size={10} /> MCP 서버</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <input
                value={mcpUrl}
                onChange={(e) => setMcpUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleMcpConnect(); }}
                placeholder="MCP 서버 URL (http://...)"
                className="flex-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded px-2 py-1 text-[10px] outline-none"
              />
              <button
                onClick={handleMcpConnect}
                disabled={mcpConnecting || !mcpUrl.trim()}
                className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] border border-[var(--accent-blue)]/40 hover:bg-[var(--accent-blue)]/30 disabled:opacity-40 transition-colors"
              >
                <Plus size={10} /> {mcpConnecting ? "연결 중…" : "연결"}
              </button>
            </div>

            {mcpServers.length === 0 ? (
              <p className="text-[10px] text-[var(--text-secondary)]">연결된 MCP 서버가 없습니다</p>
            ) : (
              mcpServers.map((server) => (
                <div key={server.id} className="bg-[var(--bg-primary)] border border-[var(--border)] rounded p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold">{server.name}</span>
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${server.status === "connected" ? "bg-green-400" : server.status === "error" ? "bg-red-400" : "bg-gray-400"}`} />
                      <span className="text-[9px] text-[var(--text-secondary)]">{server.status}</span>
                      <button
                        onClick={() => handleMcpDisconnect(server.id)}
                        className="ml-1 text-[var(--accent-red)] hover:text-red-300 transition-colors"
                        title="연결 해제"
                      >
                        <Unplug size={10} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[9px] text-[var(--text-secondary)] truncate">{server.url}</p>
                  {server.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {server.tools.map((tool) => (
                        <span key={tool.name} className="text-[9px] px-1 py-0.5 bg-[var(--bg-tertiary)] rounded" title={tool.description}>
                          {tool.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pipeline Settings */}
          <div className="border-t border-[var(--border)] pt-3 mt-3">
            <p className="text-[10px] font-semibold text-[var(--text-secondary)] mb-2">파이프라인</p>
          </div>

          <SettingRow label="통과 기준점">
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={100} value={settings.pipelinePassThreshold} onChange={(e) => update("pipelinePassThreshold", Number(e.target.value))} className="flex-1 accent-[var(--accent-green)]" />
              <span className="text-xs w-8 text-center">{settings.pipelinePassThreshold}</span>
            </div>
          </SettingRow>

          <SettingRow label="Syntax 팀">
            <Toggle checked={settings.pipelineTeams.syntax} onChange={(v) => update("pipelineTeams", { ...settings.pipelineTeams, syntax: v })} />
          </SettingRow>

          <SettingRow label="Security 팀">
            <Toggle checked={settings.pipelineTeams.security} onChange={(v) => update("pipelineTeams", { ...settings.pipelineTeams, security: v })} />
          </SettingRow>

          <SettingRow label="Performance 팀">
            <Toggle checked={settings.pipelineTeams.performance} onChange={(v) => update("pipelineTeams", { ...settings.pipelineTeams, performance: v })} />
          </SettingRow>

          <SettingRow label="Style 팀">
            <Toggle checked={settings.pipelineTeams.style} onChange={(v) => update("pipelineTeams", { ...settings.pipelineTeams, style: v })} />
          </SettingRow>

          <SettingRow label="Testing 팀">
            <Toggle checked={settings.pipelineTeams.testing} onChange={(v) => update("pipelineTeams", { ...settings.pipelineTeams, testing: v })} />
          </SettingRow>

          {/* Export/Import/Reset */}
          <div className="border-t border-[var(--border)] pt-3 mt-3">
            <p className="text-[10px] font-semibold text-[var(--text-secondary)] mb-2">설정 관리</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportSettings}
              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] border border-[var(--accent-blue)]/40 hover:bg-[var(--accent-blue)]/30 transition-colors"
            >
              <Download size={10} /> 설정 내보내기
            </button>
            <button
              onClick={handleImportSettings}
              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-[var(--accent-green)]/20 text-[var(--accent-green)] border border-[var(--accent-green)]/40 hover:bg-[var(--accent-green)]/30 transition-colors"
            >
              <Upload size={10} /> 설정 가져오기
            </button>
            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-[var(--accent-red)]/20 text-[var(--accent-red)] border border-[var(--accent-red)]/40 hover:bg-[var(--accent-red)]/30 transition-colors"
            >
              <RotateCcw size={10} /> 기본값 복원
            </button>
          </div>
        </div>
        {showModelSelector && <ModelSelector onClose={() => setShowModelSelector(false)} />}
      </div>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-8 h-4 rounded-full transition-colors relative ${checked ? "bg-[var(--accent-blue)]" : "bg-[var(--border)]"}`}
    >
      <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors ${
        active ? "bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] border border-[var(--accent-blue)]/40" : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-transparent"
      }`}
    >
      {children}
    </button>
  );
}
