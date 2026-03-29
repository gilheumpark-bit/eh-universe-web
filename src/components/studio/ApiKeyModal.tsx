"use client";

import React, { useState } from 'react';
import { Key, X, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { AppLanguage } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import {
  PROVIDER_LIST_UI, ProviderId, PROVIDERS,
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
  hostedProviders?: Partial<Record<ProviderId, boolean>>;
  onClose: () => void;
  onSave: (key: string) => void;
}

// ============================================================
// PART 1: COMPONENT
// ============================================================

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ language, hostedProviders, onClose, onSave }) => {
  const t = createT(language);

  const [activeId, setActiveId] = useState<ProviderId>(() => {
    const current = getActiveProvider();
    // 로컬 provider(ollama/lmstudio)가 활성인데 키(URL)가 없으면 gemini로 초기화
    const isLocal = current === 'ollama' || current === 'lmstudio';
    if (isLocal && !getApiKey(current)) return 'gemini';
    return current;
  });
  const [keys, setKeys] = useState<Record<ProviderId, string>>(() => {
    const loaded = {} as Record<ProviderId, string>;
    for (const p of PROVIDER_LIST_UI) { const pid = p.id as ProviderId; loaded[pid] = getApiKey(pid); }
    return loaded;
  });
  const [selectedModel, setSelectedModel] = useState(getActiveModel());
  const [testStatus, setTestStatus] = useState<Record<ProviderId, 'idle' | 'testing' | 'success' | 'error'>>(() => {
    const s = {} as Record<ProviderId, 'idle' | 'testing' | 'success' | 'error'>;
    for (const p of PROVIDER_LIST_UI) { s[p.id as ProviderId] = 'idle'; }
    return s;
  });
  const [showModels, setShowModels] = useState(false);

  const currentProvider = PROVIDERS[activeId];
  const currentKey = keys[activeId] || '';
  const hostedReady = Boolean(hostedProviders?.[activeId]);
  const hostedGeminiReady = Boolean(hostedProviders?.gemini);
  const subtitle = hostedReady
    ? t('apiKeyModalExtra.hostedSubtitle')
    : t('apiKeyModalExtra.byokSubtitle');
  const helperCopy = hostedGeminiReady
    ? t('apiKeyModalExtra.hostedHelper')
    : t('apiKeyModal.geminiRecommend');

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
    // setApiKey already saves to the correct storageKey (noa_api_key for gemini)
    // with proper obfuscation — no plaintext override needed
    onSave(currentKey.trim());
    onClose();
  };

  const status = testStatus[activeId] || 'idle';

  // ============================================================
  // PART 3: RENDER
  // ============================================================

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="api-key-modal-title" onClick={onClose}>
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
              <h3 id="api-key-modal-title" className="font-black text-base">{t('apiKeyModal.title')}</h3>
              <p className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)] tracking-wider uppercase">
                {subtitle}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label={t('ui.close')} className="p-2 hover:bg-bg-secondary rounded-xl transition-colors">
            <X className="w-5 h-5 text-text-tertiary" />
          </button>
        </div>

        {/* Recommendation notice */}
        <div className="flex items-start gap-2 px-3 py-2 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
          <span className="text-accent-blue text-xs mt-0.5">💡</span>
          <p className="text-[10px] text-text-secondary leading-relaxed">
            {helperCopy}
          </p>
        </div>

        {/* Provider selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {PROVIDER_LIST_UI.map(p => {
            const hasKey = !!(keys[p.id]?.trim());
            const isActive = activeId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleProviderSwitch(p.id)}
                aria-label={`Select ${p.name} provider`}
                aria-pressed={isActive}
                className={`relative px-4 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider whitespace-nowrap border transition-all font-[family-name:var(--font-mono)] ${
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

        {/* Key / URL input */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
            {currentProvider.isUrlBased
              ? `${currentProvider.name} ${language === 'KO' ? '서버 주소' : 'Server URL'}`
              : `${currentProvider.name} API Key`}
          </label>
          <input
            type={currentProvider.isUrlBased ? 'text' : 'password'}
            value={currentKey}
            onChange={e => handleKeyChange(e.target.value)}
            placeholder={currentProvider.placeholder}
            className="w-full bg-bg-secondary border border-border rounded-xl p-3 text-sm font-[family-name:var(--font-mono)] focus:border-accent-purple outline-none transition-all"
            autoFocus
          />
          {currentProvider.capabilities.isLocal && (
            <div className="space-y-1.5">
              <p className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)]">
                {language === 'KO'
                  ? '💡 로컬 서버가 실행 중이어야 합니다. Ollama: ollama serve / LM Studio: 서버 시작'
                  : '💡 Local server must be running. Ollama: ollama serve / LM Studio: Start server'}
              </p>
              <details className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)]">
                <summary className="cursor-pointer text-amber-400 hover:text-amber-300">
                  {language === 'KO' ? '📖 로컬 LLM 설정 가이드' : '📖 Local LLM Setup Guide'}
                </summary>
                <div className="mt-2 space-y-1.5 bg-black/30 rounded-lg p-3 text-[8px] leading-relaxed">
                  <p className="font-bold text-text-secondary">{language === 'KO' ? '▸ LM Studio' : '▸ LM Studio'}</p>
                  <p>{language === 'KO'
                    ? '1. LM Studio 실행 → 모델 다운로드\n2. Local Server 탭 → Start Server\n3. 위 URL에 http://localhost:1234 입력'
                    : '1. Open LM Studio → Download model\n2. Local Server tab → Start Server\n3. Enter http://localhost:1234 above'}</p>
                  <p className="font-bold text-text-secondary mt-2">{language === 'KO' ? '▸ Ollama' : '▸ Ollama'}</p>
                  <p>{language === 'KO'
                    ? '1. ollama pull llama3.2 (모델 다운로드)\n2. ollama serve (서버 시작)\n3. 위 URL에 http://localhost:11434 입력'
                    : '1. ollama pull llama3.2 (download model)\n2. ollama serve (start server)\n3. Enter http://localhost:11434 above'}</p>
                  <p className="font-bold text-amber-400 mt-2">{language === 'KO'
                    ? '⚠️ 로컬 LLM은 localhost (npm run dev) 환경에서만 사용 가능합니다.'
                    : '⚠️ Local LLM only works on localhost (npm run dev).'}</p>
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Model selector */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
            {t('apiKeyModal.modelSelect')}
          </label>
          <div className="relative">
            <button
              onClick={() => setShowModels(!showModels)}
              aria-expanded={showModels}
              aria-haspopup="listbox"
              aria-label={`Select model: ${selectedModel}`}
              className="w-full flex items-center justify-between bg-bg-secondary border border-border rounded-xl p-3 text-xs font-bold font-[family-name:var(--font-mono)] hover:border-text-tertiary transition-colors"
            >
              <span>{selectedModel}</span>
              <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${showModels ? 'rotate-180' : ''}`} />
            </button>
            {showModels && (
              <div className="absolute z-[110] mt-1 w-full bg-bg-primary border border-border rounded-xl shadow-xl overflow-hidden">
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
                      <span className="ml-2 text-[10px] text-text-tertiary uppercase">{t('apiKeyModal.defaultModel')}</span>
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

        {/* Custom model input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            placeholder={language === 'KO' ? '커스텀 모델명 직접 입력...' : 'Enter custom model name...'}
            className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-[10px] font-[family-name:var(--font-mono)] outline-none focus:border-accent-purple transition-colors"
          />
          <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] shrink-0">
            {language === 'KO' ? '직접 입력' : 'Custom'}
          </span>
        </div>

        {/* Preview model warning */}
        {isPreviewModel(selectedModel) && (
          <div className="flex items-start gap-2 px-3 py-2 bg-accent-amber/5 border border-accent-amber/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
            <p className="text-[10px] text-accent-amber leading-relaxed">
              {getModelWarning(selectedModel, language === 'KO' ? 'ko' : 'en')}
            </p>
          </div>
        )}

        {/* Status */}
        {status === 'success' && (
          <div className="flex items-center gap-2 text-accent-green text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" /> {t('apiKeyModal.verified')}
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-2 text-accent-red text-xs font-bold">
            <AlertCircle className="w-4 h-4" /> {t('apiKeyModal.invalid')}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={!currentKey.trim() || status === 'testing'}
            aria-label={t('ui.testApiKey')}
            className="flex-1 py-3 bg-bg-secondary border border-border rounded-xl text-xs font-black uppercase tracking-widest hover:bg-bg-tertiary transition-all disabled:opacity-30 flex items-center justify-center gap-2 font-[family-name:var(--font-mono)]"
          >
            {status === 'testing' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t('apiKeyModal.test')}
          </button>
          <button
            onClick={handleSave}
            disabled={!currentKey.trim()}
            aria-label={t('ui.saveApiKey')}
            className="flex-1 py-3 bg-accent-purple text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-30 font-[family-name:var(--font-mono)]"
          >
            {t('apiKeyModal.save')}
          </button>
          <button
            onClick={() => {
              setApiKey(activeId, '');
              setKeys(prev => ({ ...prev, [activeId]: '' }));
              setTestStatus(prev => ({ ...prev, [activeId]: 'idle' }));
              if (activeId === 'gemini') localStorage.removeItem('noa_api_key');
            }}
            disabled={!currentKey.trim()}
            aria-label={t('ui.deleteApiKey')}
            className="py-3 px-4 bg-accent-red/10 border border-accent-red/30 text-accent-red rounded-xl text-xs font-black uppercase tracking-widest hover:bg-accent-red/20 transition-all disabled:opacity-30 font-[family-name:var(--font-mono)]"
          >
            {t('apiKeyModal.delete')}
          </button>
        </div>

        {/* Saved keys overview */}
        <div className="pt-3 border-t border-border space-y-1.5">
          <div className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase tracking-wider">
            {t('apiKeyModal.savedKeys')}
          </div>
          {PROVIDER_LIST_UI.map(p => {
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
                  {hasKey ? `${keys[p.id].slice(0, 6)}...` : t('apiKeyModal.notSet')}
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
