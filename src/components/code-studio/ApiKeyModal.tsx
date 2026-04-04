"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useState } from "react";
import { Key, Code2, Play, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  onSave: (key: string, provider: string) => void;
  onSkip: () => void;
}

const PROVIDERS = [
  { id: "gemini", name: "Gemini", placeholder: "AIza..." },
  { id: "openai", name: "OpenAI", placeholder: "sk-..." },
  { id: "anthropic", name: "Claude", placeholder: "sk-ant-..." },
  { id: "groq", name: "Groq", placeholder: "gsk_..." },
  { id: "ollama", name: "Ollama", placeholder: "http://localhost:11434" },
];

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=Props,PROVIDERS

// ============================================================
// PART 2 — Component
// ============================================================

export function ApiKeyModal({ onSave, onSkip }: Props) {
  const [provider, setProvider] = useState("gemini");
  const [key, setKey] = useState("");
  const [showApiSetup, setShowApiSetup] = useState(false);

  const selectedProvider = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f1419] border border-white/10 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <Code2 size={28} className="text-amber-400" />
          <div>
            <h2 className="text-lg font-bold text-white">EH Code Studio</h2>
            <p className="text-xs text-white/50">AI 기반 코드 에디터에 오신 것을 환영합니다</p>
          </div>
        </div>

        <button onClick={onSkip}
          className="w-full py-3 mb-3 bg-amber-800 text-stone-100 text-sm rounded-lg font-semibold hover:bg-amber-700 transition-colors flex items-center justify-center gap-2">
          <Play size={16} />둘러보기
        </button>
        <p className="text-[10px] text-white/60 text-center mb-4">API 키 없이도 기본 편집 기능을 사용할 수 있습니다</p>

        <button onClick={() => setShowApiSetup(!showApiSetup)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-white/50 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
          <span className="flex items-center gap-2"><Key size={12} />API 키가 있으신가요?</span>
          {showApiSetup ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showApiSetup && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-5 gap-1">
              {PROVIDERS.map((p) => (
                <button key={p.id} onClick={() => setProvider(p.id)}
                  className={`px-2 py-1.5 text-[10px] rounded transition-colors ${
                    provider === p.id
                      ? "bg-amber-900/30 text-amber-400 border border-amber-700/40"
                      : "bg-white/5 text-white/50 border border-transparent hover:border-white/10"
                  }`}>{p.name}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
              <Key size={14} className="text-white/50" />
              <input type="password" value={key} onChange={(e) => setKey(e.target.value)}
                placeholder={selectedProvider.placeholder}
                className="flex-1 bg-transparent text-sm text-white outline-none" />
            </div>
            <button onClick={() => onSave(key, provider)} disabled={!key.trim() && provider !== "ollama"}
              className="w-full py-2 bg-green-600 text-white text-sm rounded-lg font-semibold hover:bg-green-700 disabled:opacity-30 transition-colors">
              저장하고 시작
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=Component | inputs=Props | outputs=JSX
