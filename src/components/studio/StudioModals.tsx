"use client";

import { X, Keyboard, Command } from 'lucide-react';
import type { AppLanguage, SavedSlot, StoryConfig } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import { INITIAL_CONFIG } from '@/hooks/useProjectManager';

// ============================================================
// PART 1 — Shortcuts Modal (Premium Design)
// ============================================================

const SHORTCUT_GROUPS = (t: ReturnType<typeof createT>) => [
  {
    label: 'Navigation',
    shortcuts: [
      ['F1', t('shortcuts.worldDesign')],
      ['F2', t('shortcuts.worldSimulator')],
      ['F3', t('shortcuts.characterStudio')],
      ['F4', t('shortcuts.rulebook')],
      ['F5', t('shortcuts.writingStudio')],
      ['F6', t('shortcuts.styleStudio')],
      ['F7', t('shortcuts.manuscript')],
      ['F8', t('shortcuts.archive')],
      ['F9', t('shortcuts.settings')],
    ],
  },
  {
    label: 'Actions',
    shortcuts: [
      ['Ctrl+N', t('shortcuts.newSession')],
      ['Ctrl+F', t('shortcuts.search')],
      ['Ctrl+E', t('shortcuts.exportTxt')],
      ['Ctrl+P', t('shortcuts.print')],
    ],
  },
  {
    label: 'Editor',
    shortcuts: [
      ['Enter', t('shortcuts.sendMessage')],
      ['Shift+Enter', t('shortcuts.newLine')],
      ['F11', t('shortcuts.focusMode')],
      ['F12', t('shortcuts.shortcutsHelp')],
    ],
  },
];

export function ShortcutsModal({ language, onClose }: { language: AppLanguage; onClose: () => void }) {
  const t = createT(language);
  const groups = SHORTCUT_GROUPS(t);
  const isKO = language === 'KO';

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-200" 
      onClick={onClose}
    >
      <div 
        className="relative bg-gradient-to-b from-bg-secondary/95 to-bg-primary/95 border border-white/[0.08] rounded-2xl p-6 max-w-lg w-full mx-4 shadow-[0_32px_64px_rgba(0,0,0,0.5)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" 
        onClick={e => e.stopPropagation()} 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <h3 id="shortcuts-title" className="font-bold text-base text-text-primary">
                {t('ui.keyboardShortcuts')}
              </h3>
              <p className="text-[10px] text-text-tertiary uppercase tracking-wider">
                {isKO ? '빠른 작업을 위한 단축키' : 'Quick access shortcuts'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl hover:bg-white/5 text-text-tertiary hover:text-text-primary transition-colors"
            aria-label="close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcut Groups */}
        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
          {groups.map((group, gi) => (
            <div key={gi}>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-2 px-1">
                {group.label}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {group.shortcuts.map(([key, desc]) => (
                  <div 
                    key={key} 
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-colors group"
                  >
                    <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors truncate">
                      {desc}
                    </span>
                    <kbd className="shrink-0 flex items-center gap-1 px-2 py-1 bg-bg-secondary/80 border border-white/[0.08] rounded-lg text-[10px] font-bold font-mono text-text-tertiary">
                      {key.includes('Ctrl') && <Command className="w-3 h-3" />}
                      {key.replace('Ctrl+', '')}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Hint */}
        <div className="mt-5 pt-4 border-t border-white/[0.06] text-center">
          <p className="text-[10px] text-text-tertiary">
            {isKO ? 'F12를 눌러 언제든지 이 창을 열 수 있습니다' : 'Press F12 anytime to open this panel'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PART 2 — Move Session Modal
// ============================================================

interface MoveModalData {
  sessionId: string;
  others: { id: string; name: string }[];
}

export function MoveSessionModal({
  data, language, onMove, onClose,
}: {
  data: MoveModalData;
  language: AppLanguage;
  onMove: (sessionId: string, projectId: string) => void;
  onClose: () => void;
}) {
  const t = createT(language);
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="text-sm font-black uppercase tracking-widest">{t('project.moveSession')}</h3>
        <select autoFocus
          className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-accent-purple"
          defaultValue=""
          onChange={e => { if (e.target.value) { onMove(data.sessionId, e.target.value); onClose(); } }}>
          <option value="" disabled>{L4(language, { ko: '프로젝트 선택...', en: 'Select project...', ja: 'プロジェクトを選択...', zh: '选择项目...' })}</option>
          {data.others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={onClose} className="w-full py-2 text-xs font-black uppercase tracking-widest text-text-tertiary hover:text-text-primary transition-colors">
          {L4(language, { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' })}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PART 3 — Save Slot Name Modal
// ============================================================

export function SaveSlotModal({
  language, activeTab, config, onSave, onClose,
}: {
  language: AppLanguage;
  activeTab: string;
  config: StoryConfig | undefined;
  onSave: (slot: SavedSlot) => void;
  onClose: () => void;
}) {
  const t = createT(language);
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="text-sm font-bold text-text-primary">{t('saveSlot.enterSaveName')}</h3>
        <input
          autoFocus
          type="text"
          placeholder={L4(language, { ko: '세이브 이름...', en: 'Save name...', ja: 'セーブ名...', zh: '存档名称...' })}
          maxLength={40}
          className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-accent-purple"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const val = (e.target as HTMLInputElement).value.trim();
              if (!val) return;
              onSave({
                id: `slot-${Date.now()}`,
                name: val,
                tab: activeTab,
                timestamp: Date.now(),
                data: { ...(config || INITIAL_CONFIG) },
              });
              onClose();
            }
          }}
          id="save-slot-input"
        />
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 text-xs font-bold text-text-tertiary border border-border rounded-lg hover:bg-bg-secondary transition-colors">
            {L4(language, { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' })}
          </button>
          <button
            onClick={() => {
              const input = document.getElementById('save-slot-input') as HTMLInputElement;
              const val = input?.value?.trim();
              if (!val) return;
              onSave({
                id: `slot-${Date.now()}`,
                name: val,
                tab: activeTab,
                timestamp: Date.now(),
                data: { ...(config || INITIAL_CONFIG) },
              });
              onClose();
            }}
            className="flex-1 py-2 bg-accent-purple text-white rounded-lg text-xs font-bold hover:opacity-80 transition-opacity">
            {t('saveSlot.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
