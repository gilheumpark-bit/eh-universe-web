"use client";

import React, { useState } from 'react';
import { Key, X, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { AppLanguage } from '@/lib/studio-types';
import {
  PROVIDER_LIST, ProviderId, PROVIDERS,
  getActiveProvider, setActiveProvider,
  getApiKey, setApiKey,
  getActiveModel, setActiveModel,
  testApiKey, isPreviewModel, getModelWarning,
} from '@/lib/ai-providers';

// ============================================================
// PART 0: TYPES
// ============================================================

interface ApiKeyModalProps {
  language: AppLanguage;
  onClose: () => void;
  onSave: (key: string) => void;
}

// ============================================================
// PART 1: COMPONENT
// ============================================================

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ language, onClose, onSave }) => {
  const isKO = language === 'KO';

  const [activeId, setActiveId] = useState<ProviderId>(getActiveProvider());
  const [keys, setKeys] = useState<Record<ProviderId, string>>(() => {
    const loaded = {} as Record<ProviderId, string>;
    for (const p of PROVIDER_LIST) loaded[p.id] = getApiKey(p.id);
    return loaded;
  });
  const [selectedModel, setSelectedModel] = useState(getActiveModel());
  const [testStatus, setTestStatus] = useState<Record<ProviderId, 'idle' | 'testing' | 'success' | 'error'>>(() => {
    const s = {} as Record<ProviderId, 'idle' | 'testing' | 'success' | 'error'>;
    for (const p of PROVIDER_LIST) s[p.id] = 'idle';
    return s;
  });
  const [showModels, setShowModels] = useState(false);

  const currentProvider = PROVIDERS[activeId];
  const currentKey = keys[activeId] || '';

  // ============================================================
  // PART 2: HANDLERS
  // ============================================================

  const handleProviderSwitch = (id: ProviderId) => {
    setActiveId(id);
    setSelectedModel(PROVIDERS[id].defaultModel);
    setShowModels(false);
  };

  const handleKeyChange = (value: string) => {
    setKeys(prev => ({ ...prev, [activeId]: value }));
    setTestStatus(prev => ({ ...prev, [activeId]: 'idle' }));
  };

  const handleTest = async () => {
    if (!currentKey.trim()) return;
    setTestStatus(prev => ({ ...prev, [activeId]: 'testing' }));
    const ok = await testApiKey(activeId, currentKey.trim());
    setTestStatus(prev => ({ ...prev, [activeId]: ok ? 'success' : 'error' }));
  };

  const handleSave = () => {
    if (!currentKey.trim()) return;
    setApiKey(activeId, currentKey.trim());
    setActiveProvider(activeId);
    setActiveModel(selectedModel);
    // Backward compat: also save to noa_api_key if gemini
    if (activeId === 'gemini') {
      localStorage.setItem('noa_api_key', currentKey.trim());
    }
    onSave(currentKey.trim());
    onClose();
  };

  const status = testStatus[activeId] || 'idle';

  // ============================================================
  // PART 3: RENDER
  // ============================================================

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-bg-primary border border-border rounded-2xl p-6 space-y-5 mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent-purple/10 rounded-xl">
              <Key className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <h3 className="font-black text-base">{isKO ? 'BYOK — API 키 관리' : 'BYOK — API Key Manager'}</h3>
              <p className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)] tracking-wider uppercase">
                Bring Your Own Key
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bg-secondary rounded-xl transition-colors">
            <X className="w-5 h-5 text-text-tertiary" />
          </button>
        </div>

        {/* Recommendation notice */}
        <div className="flex items-start gap-2 px-3 py-2 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
          <span className="text-accent-blue text-xs mt-0.5">💡</span>
          <p className="text-[10px] text-text-secondary leading-relaxed">
            {isKO
              ? 'Gemini 권장 — 캐릭터 자동생성, 구조화 JSON 출력 등 일부 고급 기능은 Gemini에서만 지원됩니다. 다른 프로바이더는 소설 집필(스트리밍)에 사용 가능합니다.'
              : 'Gemini recommended — Some advanced features (auto character generation, structured JSON output) are Gemini-only. Other providers can be used for story writing (streaming).'}
          </p>
        </div>

        {/* Provider selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {PROVIDER_LIST.map(p => {
            const hasKey = !!(keys[p.id]?.trim());
            const isActive = activeId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleProviderSwitch(p.id)}
                className={`relative px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap border transition-all font-[family-name:var(--font-mono)] ${
                  isActive
                    ? 'text-white border-transparent'
                    : 'text-text-tertiary border-border hover:border-text-tertiary bg-bg-primary'
                }`}
                style={isActive ? { background: p.color, borderColor: p.color } : undefined}
              >
                {p.name}
                {p.id === 'gemini' && !isActive && (
                  <span className="ml-1 text-[7px] opacity-60">★</span>
                )}
                {hasKey && !isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent-green" />
                )}
              </button>
            );
          })}
        </div>

        {/* Key input */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
            {currentProvider.name} API Key
          </label>
          <input
            type="password"
            value={currentKey}
            onChange={e => handleKeyChange(e.target.value)}
            placeholder={currentProvider.placeholder}
            className="w-full bg-bg-secondary border border-border rounded-xl p-3 text-sm font-[family-name:var(--font-mono)] focus:border-accent-purple outline-none transition-all"
            autoFocus
          />
        </div>

        {/* Model selector */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
            {isKO ? '모델 선택' : 'Model'}
          </label>
          <div className="relative">
            <button
              onClick={() => setShowModels(!showModels)}
              className="w-full flex items-center justify-between bg-bg-secondary border border-border rounded-xl p-3 text-xs font-bold font-[family-name:var(--font-mono)] hover:border-text-tertiary transition-colors"
            >
              <span>{selectedModel}</span>
              <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${showModels ? 'rotate-180' : ''}`} />
            </button>
            {showModels && (
              <div className="absolute z-10 mt-1 w-full bg-bg-primary border border-border rounded-xl shadow-xl overflow-hidden">
                {currentProvider.models.map(m => (
                  <button
                    key={m}
                    onClick={() => { setSelectedModel(m); setShowModels(false); }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-[family-name:var(--font-mono)] hover:bg-bg-secondary transition-colors ${
                      selectedModel === m ? 'text-accent-purple font-bold' : 'text-text-secondary'
                    }`}
                  >
                    {m}
                    {m === currentProvider.defaultModel && (
                      <span className="ml-2 text-[10px] text-text-tertiary uppercase">{isKO ? '기본' : 'Default'}</span>
                    )}
                    {isPreviewModel(m) && (
                      <span className="ml-2 text-[10px] text-accent-amber uppercase">⚠ Preview</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Preview model warning */}
        {isPreviewModel(selectedModel) && (
          <div className="flex items-start gap-2 px-3 py-2 bg-accent-amber/5 border border-accent-amber/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
            <p className="text-[10px] text-accent-amber leading-relaxed">
              {getModelWarning(selectedModel, isKO ? 'ko' : 'en')}
            </p>
          </div>
        )}

        {/* Status */}
        {status === 'success' && (
          <div className="flex items-center gap-2 text-accent-green text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" /> {isKO ? 'API 키 검증 완료' : 'API key verified'}
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 text-accent-red text-xs font-bold">
            <AlertCircle className="w-4 h-4" /> {isKO ? '유효하지 않은 API 키' : 'Invalid API key'}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={!currentKey.trim() || status === 'testing'}
            className="flex-1 py-3 bg-bg-secondary border border-border rounded-xl text-xs font-black uppercase tracking-widest hover:bg-bg-tertiary transition-all disabled:opacity-30 flex items-center justify-center gap-2 font-[family-name:var(--font-mono)]"
          >
            {status === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isKO ? '테스트' : 'Test'}
          </button>
          <button
            onClick={handleSave}
            disabled={!currentKey.trim()}
            className="flex-1 py-3 bg-accent-purple text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-30 font-[family-name:var(--font-mono)]"
          >
            {isKO ? '저장' : 'Save'}
          </button>
          <button
            onClick={() => {
              setApiKey(activeId, '');
              setKeys(prev => ({ ...prev, [activeId]: '' }));
              setTestStatus(prev => ({ ...prev, [activeId]: 'idle' }));
              if (activeId === 'gemini') localStorage.removeItem('noa_api_key');
            }}
            disabled={!currentKey.trim()}
            className="py-3 px-4 bg-accent-red/10 border border-accent-red/30 text-accent-red rounded-xl text-xs font-black uppercase tracking-widest hover:bg-accent-red/20 transition-all disabled:opacity-30 font-[family-name:var(--font-mono)]"
          >
            {isKO ? '삭제' : 'Delete'}
          </button>
        </div>

        {/* Saved keys overview */}
        <div className="pt-3 border-t border-border space-y-1.5">
          <div className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase tracking-wider">
            {isKO ? '등록된 키' : 'Saved Keys'}
          </div>
          {PROVIDER_LIST.map(p => {
            const hasKey = !!(keys[p.id]?.trim());
            const isCurrentActive = getActiveProvider() === p.id;
            return (
              <div key={p.id} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: hasKey ? p.color : 'var(--color-border)' }} />
                  <span className={hasKey ? 'text-text-secondary font-bold' : 'text-text-tertiary'}>
                    {p.name}
                  </span>
                  {isCurrentActive && hasKey && (
                    <span className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[10px] font-black uppercase">
                      Active
                    </span>
                  )}
                </div>
                <span className="text-text-tertiary font-[family-name:var(--font-mono)]">
                  {hasKey ? `${keys[p.id].slice(0, 6)}...` : (isKO ? '미설정' : 'Not set')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
