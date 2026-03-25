"use client";

import { X } from 'lucide-react';
import type { AppLanguage, SavedSlot, StoryConfig } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import { INITIAL_CONFIG } from '@/hooks/useProjectManager';

// ============================================================
// PART 1 — Shortcuts Modal
// ============================================================

export function ShortcutsModal({ language, onClose }: { language: AppLanguage; onClose: () => void }) {
  const t = createT(language);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-xl p-6 max-w-md mx-4 space-y-3 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="font-black text-sm">{t('ui.keyboardShortcuts')}</h3>
          <button onClick={onClose} aria-label="close"><X className="w-4 h-4 text-text-tertiary" /></button>
        </div>
        <div className="space-y-2 text-xs">
          {[
            ['F1', t('shortcuts.worldDesign')], ['F2', t('shortcuts.worldSimulator')],
            ['F3', t('shortcuts.characterStudio')], ['F4', t('shortcuts.rulebook')],
            ['F5', t('shortcuts.writingStudio')], ['F6', t('shortcuts.styleStudio')],
            ['F7', t('shortcuts.manuscript')], ['F8', t('shortcuts.archive')],
            ['F9', t('shortcuts.settings')], ['F11', t('shortcuts.focusMode')],
            ['F12', t('shortcuts.shortcutsHelp')],
            ['Ctrl+N', t('shortcuts.newSession')], ['Ctrl+F', t('shortcuts.search')],
            ['Ctrl+E', t('shortcuts.exportTxt')], ['Ctrl+P', t('shortcuts.print')],
            ['Enter', t('shortcuts.sendMessage')], ['Shift+Enter', t('shortcuts.newLine')],
          ].map(([key, desc]) => (
            <div key={key} className="flex justify-between">
              <span className="px-2 py-0.5 bg-bg-secondary rounded text-text-tertiary font-[family-name:var(--font-mono)]">{key}</span>
              <span className="text-text-secondary">{desc}</span>
            </div>
          ))}
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
  const isKO = language === 'KO';
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-2xl p-6 w-80 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-black uppercase tracking-widest">{t('project.moveSession')}</h3>
        <select autoFocus
          className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-accent-purple"
          defaultValue=""
          onChange={e => { if (e.target.value) { onMove(data.sessionId, e.target.value); onClose(); } }}>
          <option value="" disabled>{isKO ? '프로젝트 선택...' : 'Select project...'}</option>
          {data.others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={onClose} className="w-full py-2 text-xs font-black uppercase tracking-widest text-text-tertiary hover:text-text-primary transition-colors">
          {isKO ? '취소' : 'Cancel'}
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
  const isKO = language === 'KO';
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-primary border border-border rounded-2xl p-6 w-[360px] space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-text-primary">{t('saveSlot.enterSaveName')}</h3>
        <input
          autoFocus
          type="text"
          placeholder={isKO ? '세이브 이름...' : 'Save name...'}
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
            {isKO ? '취소' : 'Cancel'}
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
