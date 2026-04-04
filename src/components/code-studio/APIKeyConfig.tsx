"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState, useMemo, useCallback } from "react";
import {
  Key, Plus, Trash2, Pencil, Check, X, ToggleLeft, ToggleRight,
  Shield, Code2, Bug, FileText, Eye, TestTube, Layers, Sparkles, Loader2,
} from "lucide-react";

type SlotRole = "coder" | "reviewer" | "tester" | "security" | "architect" | "debugger" | "documenter" | "custom";

interface APIKeySlot {
  id: string;
  provider: string;
  apiKey: string;
  model: string;
  role: SlotRole;
  customPerspective?: string;
  label: string;
  enabled: boolean;
}

interface Props {
  onClose: () => void;
}

const ROLE_LABELS: Record<SlotRole, string> = {
  coder: "코더", reviewer: "리뷰어", tester: "테스터",
  security: "보안", architect: "아키텍트", debugger: "디버거",
  documenter: "문서화", custom: "커스텀",
};

const ROLE_COLORS: Record<SlotRole, string> = {
  coder: "#60a5fa", reviewer: "#a78bfa", tester: "#34d399",
  security: "#f87171", architect: "#fbbf24", debugger: "#fb923c",
  documenter: "#2dd4bf", custom: "#e879f9",
};

const ROLE_ICONS: Record<SlotRole, React.ReactNode> = {
  coder: <Code2 size={14} />, reviewer: <Eye size={14} />,
  tester: <TestTube size={14} />, security: <Shield size={14} />,
  architect: <Layers size={14} />, debugger: <Bug size={14} />,
  documenter: <FileText size={14} />, custom: <Sparkles size={14} />,
};

const ALL_ROLES: SlotRole[] = ["coder", "reviewer", "tester", "security", "architect", "debugger", "documenter", "custom"];

const PROVIDERS = [
  { id: "gemini", name: "Gemini", color: "#4285f4", placeholder: "AIza...", models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-3.1-flash-lite-preview"] },
  { id: "openai", name: "OpenAI", color: "#10a37f", placeholder: "sk-...", models: ["gpt-5.4", "gpt-5.4-mini", "gpt-4.1"] },
  { id: "anthropic", name: "Claude", color: "#d4a373", placeholder: "sk-ant-...", models: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"] },
  { id: "groq", name: "Groq", color: "#f55036", placeholder: "gsk_...", models: ["llama-3.3-70b-versatile", "qwen-qwq-32b"] },
  { id: "lmstudio", name: "LM Studio", color: "#2d5d8d", placeholder: "http://192.168.219.102:1234", models: ["openai/gpt-oss-20b", "qwen/qwen3-30b-a3b-2507", "qwen/qwen3-14b"] },
];

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=APIKeySlot,SlotRole,Props

// ============================================================
// PART 2 — Storage Helpers
// ============================================================

const STORAGE_KEY = "eh-api-key-slots";

function loadSlots(): APIKeySlot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSlots(slots: APIKeySlot[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
}

// IDENTITY_SEAL: PART-2 | role=Storage | inputs=localStorage | outputs=APIKeySlot[]

// ============================================================
// PART 3 — Component
// ============================================================

export function APIKeyConfig({ onClose }: Props) {
  const [slots, setSlots] = useState<APIKeySlot[]>(loadSlots);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formProvider, setFormProvider] = useState("gemini");
  const [formKey, setFormKey] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formRole, setFormRole] = useState<SlotRole>("coder");
  const [formCustom, setFormCustom] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  const provider = useMemo(() => PROVIDERS.find((p) => p.id === formProvider) ?? PROVIDERS[0], [formProvider]);

  const autoLabel = useMemo(() => `${provider.name} - ${ROLE_LABELS[formRole]}`, [provider, formRole]);

  const persist = useCallback((next: APIKeySlot[]) => { setSlots(next); saveSlots(next); }, []);

  function resetForm() {
    setFormProvider("gemini"); setFormKey(""); setFormModel(""); setFormRole("coder");
    setFormCustom(""); setFormLabel(""); setTesting(false); setTestResult(null);
    setEditingId(null); setShowForm(false);
  }

  function handleStartEdit(slot: APIKeySlot) {
    setEditingId(slot.id); setFormProvider(slot.provider); setFormKey(slot.apiKey);
    setFormModel(slot.model); setFormRole(slot.role); setFormCustom(slot.customPerspective ?? "");
    setFormLabel(slot.label); setTestResult(null); setShowForm(true);
  }

  // [시뮬레이션] 실제 API 검증 없음 — 키 길이 체크만
  async function handleTest() {
    if (!formKey.trim()) return;
    setTesting(true); setTestResult(null);
    await new Promise((r) => setTimeout(r, 800));
    setTestResult(formKey.trim().length > 5);
    setTesting(false);
  }

  function handleSave() {
    const model = formModel || provider.models[0] || "";
    const label = formLabel.trim() || autoLabel;
    const slot: APIKeySlot = {
      id: editingId ?? crypto.randomUUID(),
      provider: formProvider, apiKey: formKey, model, role: formRole,
      customPerspective: formRole === "custom" ? formCustom : undefined,
      label, enabled: true,
    };
    if (editingId) {
      persist(slots.map((s) => (s.id === editingId ? slot : s)));
    } else {
      persist([...slots, slot]);
    }
    resetForm();
  }

  function handleToggle(id: string) {
    persist(slots.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }

  function handleDelete(id: string) {
    persist(slots.filter((s) => s.id !== id));
  }

  const enabledSlots = slots.filter((s) => s.enabled && s.apiKey.trim().length > 0);

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" style={{ zIndex: 9999 }} role="dialog" aria-modal="true" aria-label="API 키 슬롯 관리">
      <div className="bg-[#0f1419] border border-white/10 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col" style={{ minHeight: 320 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <Key size={20} className="text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">API 키 슬롯 관리</h2>
              <p className="text-[11px] text-white/50">동일 프로바이더의 키를 여러 역할로 등록 가능</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="닫기" className="p-1.5 rounded hover:bg-white/10 text-white/50"><X size={18} /></button>
        </div>

        {/* Slot List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {slots.length === 0 && !showForm && (
            <div className="text-center py-10 text-white/60 text-sm">등록된 API 키가 없습니다.</div>
          )}
          {slots.map((slot) => {
            const p = PROVIDERS.find((pr) => pr.id === slot.provider);
            return (
              <div key={slot.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${slot.enabled ? "border-white/10 bg-white/5" : "border-transparent bg-white/3 opacity-50"}`}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p?.color ?? "#888" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{slot.label}</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0" style={{ backgroundColor: ROLE_COLORS[slot.role] + "22", color: ROLE_COLORS[slot.role] }}>
                      {ROLE_ICONS[slot.role]}{ROLE_LABELS[slot.role]}
                    </span>
                  </div>
                  <div className="text-[11px] text-white/60 truncate">{p?.name} / {slot.model}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleToggle(slot.id)} className="p-1 rounded hover:bg-white/10 text-white/50">
                    {slot.enabled ? <ToggleRight size={18} className="text-green-400" /> : <ToggleLeft size={18} />}
                  </button>
                  <button onClick={() => handleStartEdit(slot)} className="p-1 rounded hover:bg-white/10 text-white/50"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(slot.id)} aria-label="키 슬롯 삭제" className="p-1 rounded hover:bg-white/10 text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}

          {/* Add / Edit Form */}
          {showForm && (
            <div className="border border-amber-700/30 rounded-lg p-4 bg-white/5 space-y-3 mt-2">
              <div className="text-sm font-semibold text-amber-400">{editingId ? "슬롯 편집" : "새 슬롯 추가"}</div>
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">프로바이더</label>
                <div className="grid grid-cols-4 gap-1">
                  {PROVIDERS.map((p) => (
                    <button key={p.id} onClick={() => { setFormProvider(p.id); setFormModel(p.models[0]); setTestResult(null); }}
                      className={`px-2 py-1.5 text-[10px] rounded transition-colors text-center ${formProvider === p.id ? "text-white font-semibold" : "bg-white/5 text-white/50 hover:bg-white/10"}`}
                      style={formProvider === p.id ? { backgroundColor: p.color } : undefined}>{p.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">API 키</label>
                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <Key size={14} className="text-white/50 shrink-0" />
                  <input type="password" value={formKey} onChange={(e) => { setFormKey(e.target.value); setTestResult(null); }}
                    placeholder={provider.placeholder} className="flex-1 bg-transparent text-sm text-white outline-none" />
                  <button onClick={handleTest} disabled={testing || !formKey.trim()}
                    className="px-2 py-0.5 text-[10px] rounded border border-white/10 hover:bg-white/10 disabled:opacity-30 flex items-center gap-1 text-white/70">
                    {testing ? <Loader2 size={12} className="animate-spin" /> : testResult === true ? <Check size={12} className="text-green-400" /> : testResult === false ? <X size={12} className="text-red-400" /> : null}
                    테스트
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">모델</label>
                <select value={formModel || provider.models[0]} onChange={(e) => setFormModel(e.target.value)}
                  className="w-full bg-white/5 text-sm text-white rounded-lg px-3 py-2 outline-none border border-white/10">
                  {provider.models.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">역할</label>
                <div className="grid grid-cols-4 gap-1">
                  {ALL_ROLES.map((r) => (
                    <button key={r} onClick={() => setFormRole(r)}
                      className={`flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] rounded transition-colors ${formRole === r ? "font-semibold border" : "bg-white/5 text-white/50 border border-transparent hover:border-white/10"}`}
                      style={formRole === r ? { backgroundColor: ROLE_COLORS[r] + "22", color: ROLE_COLORS[r], borderColor: ROLE_COLORS[r] + "55" } : undefined}>
                      {ROLE_ICONS[r]}{ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
              {formRole === "custom" && (
                <div>
                  <label className="text-[11px] text-white/50 mb-1 block">커스텀 관점 설명</label>
                  <input type="text" value={formCustom} onChange={(e) => setFormCustom(e.target.value)}
                    placeholder="예: 접근성 전문가, 성능 최적화 관점..."
                    className="w-full bg-white/5 text-sm text-white rounded-lg px-3 py-2 outline-none border border-white/10" />
                </div>
              )}
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">라벨 (선택)</label>
                <input type="text" value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder={autoLabel}
                  className="w-full bg-white/5 text-sm text-white rounded-lg px-3 py-2 outline-none border border-white/10" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSave} disabled={!formKey.trim()}
                  className="flex-1 py-2 bg-amber-800 text-stone-100 text-sm rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-30 transition-colors">
                  {editingId ? "저장" : "추가"}
                </button>
                <button onClick={resetForm} className="px-4 py-2 bg-white/5 text-white/50 text-sm rounded-lg hover:bg-white/10 transition-colors">취소</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/8 px-5 py-3 flex items-center justify-between">
          <div className="text-[11px] text-white/60">등록: {slots.length}개 | 활성: {enabledSlots.length}개</div>
          {!showForm && (
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-amber-900/22 text-amber-400 hover:bg-amber-900/30 transition-colors">
              <Plus size={14} />슬롯 추가
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return modalContent;
}

// IDENTITY_SEAL: PART-3 | role=Component | inputs=Props | outputs=JSX 
