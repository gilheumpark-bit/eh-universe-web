'use client';

// ============================================================
// PART 1 — Imports & Types (ActiveItemSelector)
// ============================================================
//
// 이번 화에 활성화할 아이템/스킬을 작가가 체크박스로 선택.
// 선택된 항목만 pipeline.ts에서 프롬프트에 주입 (M3 — 감사 구멍 #1 해결).
//
// 미선택 시: 기존 폴백(상위 20개) — 하위호환 보장.

import React from 'react';
import { Package, Zap } from 'lucide-react';
import { L4 } from '@/lib/i18n';
import type { AppLanguage, Item, Skill } from '@/lib/studio-types';

interface ActiveItemSelectorProps {
  language: AppLanguage;
  items: Item[];
  skills: Skill[];
  /** 현재 활성 아이템 ID 목록 */
  activeItemIds: string[];
  activeSkillIds: string[];
  onChange: (next: { activeItems: string[]; activeSkills: string[] }) => void;
}

// ============================================================
// PART 2 — Component
// ============================================================

export function ActiveItemSelector({
  language,
  items,
  skills,
  activeItemIds,
  activeSkillIds,
  onChange,
}: ActiveItemSelectorProps) {
  const itemSet = new Set(activeItemIds);
  const skillSet = new Set(activeSkillIds);

  const toggleItem = (id: string) => {
    const next = new Set(itemSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ activeItems: Array.from(next), activeSkills: activeSkillIds });
  };

  const toggleSkill = (id: string) => {
    const next = new Set(skillSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ activeItems: activeItemIds, activeSkills: Array.from(next) });
  };

  const clearAll = () => {
    onChange({ activeItems: [], activeSkills: [] });
  };

  const hasItems = items.length > 0;
  const hasSkills = skills.length > 0;
  const totalActive = activeItemIds.length + activeSkillIds.length;

  if (!hasItems && !hasSkills) {
    return (
      <div className="text-center py-4 text-xs text-text-tertiary">
        {L4(language, {
          ko: '등록된 아이템/스킬이 없습니다',
          en: 'No items/skills registered',
          ja: '登録されたアイテム/スキルなし',
          zh: '没有注册的物品/技能',
        })}
      </div>
    );
  }

  // ============================================================
  // PART 3 — Render
  // ============================================================

  return (
    <div
      role="group"
      aria-label={L4(language, {
        ko: '이번 화 활성 아이템 선택',
        en: 'Active items selection for this episode',
        ja: '今話のアクティブアイテム選択',
        zh: '本话活跃物品选择',
      })}
      className="space-y-3"
    >
      <header className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">
          {L4(language, {
            ko: '선택한 항목만 프롬프트에 주입됩니다. 미선택 시 상위 20개 자동.',
            en: 'Only selected items inject into prompt. None → top 20 fallback.',
            ja: '選択した項目のみプロンプトに注入。未選択時は上位20個。',
            zh: '只有选中的项目会注入提示。未选时使用前20个。',
          })}
        </p>
        {totalActive > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[10px] font-mono text-text-tertiary hover:text-accent-red px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[44px]"
            aria-label={L4(language, {
              ko: '선택 모두 해제',
              en: 'Clear all selections',
              ja: 'すべての選択を解除',
              zh: '清除所有选择',
            })}
          >
            {L4(language, { ko: '전체 해제', en: 'Clear all', ja: 'すべて解除', zh: '全部清除' })}
          </button>
        )}
      </header>

      {hasItems && (
        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-2 text-xs font-bold text-text-primary flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-accent-blue" aria-hidden="true" />
            {L4(language, { ko: '아이템', en: 'Items', ja: 'アイテム', zh: '物品' })}
            <span className="text-[9px] font-mono text-text-tertiary ml-1">
              ({activeItemIds.length}/{items.length})
            </span>
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {items.map(it => {
              const checked = itemSet.has(it.id);
              return (
                <label
                  key={it.id}
                  className={`flex items-start gap-2 p-2 min-h-[44px] rounded-lg border cursor-pointer transition-colors ${
                    checked
                      ? 'bg-accent-blue/10 border-accent-blue text-text-primary'
                      : 'bg-bg-secondary border-border text-text-secondary hover:border-accent-blue/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleItem(it.id)}
                    aria-label={`${it.name} (${it.category})`}
                    className="mt-0.5 w-4 h-4 accent-accent-blue shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{it.name || '(unnamed)'}</div>
                    <div className="text-[9px] font-mono text-text-tertiary">{it.category}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {hasSkills && (
        <fieldset className="rounded-lg border border-border p-3">
          <legend className="px-2 text-xs font-bold text-text-primary flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-accent-amber" aria-hidden="true" />
            {L4(language, { ko: '스킬', en: 'Skills', ja: 'スキル', zh: '技能' })}
            <span className="text-[9px] font-mono text-text-tertiary ml-1">
              ({activeSkillIds.length}/{skills.length})
            </span>
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
            {skills.map(sk => {
              const checked = skillSet.has(sk.id);
              return (
                <label
                  key={sk.id}
                  className={`flex items-start gap-2 p-2 min-h-[44px] rounded-lg border cursor-pointer transition-colors ${
                    checked
                      ? 'bg-accent-amber/10 border-accent-amber text-text-primary'
                      : 'bg-bg-secondary border-border text-text-secondary hover:border-accent-amber/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSkill(sk.id)}
                    aria-label={`${sk.name} (${sk.type})`}
                    className="mt-0.5 w-4 h-4 accent-accent-amber shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{sk.name || '(unnamed)'}</div>
                    <div className="text-[9px] font-mono text-text-tertiary">{sk.type}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}

export default ActiveItemSelector;

// IDENTITY_SEAL: ActiveItemSelector | role=active item/skill picker | inputs=props | outputs=JSX
