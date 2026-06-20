"use client";

/**
 * BrandGuardSection (2026-05-10 신설 — S-04)
 *
 * `lib/ip-guard/brand-blocklist.ts` 의 BRAND_BLOCKLIST 를 사용자에게 가시화.
 *
 * 표시 정보:
 *   - 전체 brand entry 수
 *   - 카테고리별 (us-entertainment / jp-manga-anime / kr-webnovel 등) 분포
 *   - 심각도별 (critical / warning / info) 분포
 *   - sample list (최대 10개) — 작가가 어떤 IP 가 차단되는지 인지
 *
 * Mount: SettingsView 의 Advanced 탭 안.
 *
 * [C] 안전성: BRAND_BLOCKLIST readonly array — 사용자 수정 불가
 * [G] 성능: useMemo 캐시
 * [K] 간결성: 단일 ds-accordion + 4언어 라벨
 */

import { useMemo, useState } from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { BRAND_BLOCKLIST, type BrandCategory, type BrandSeverity } from '@/lib/ip-guard/brand-blocklist';
import type { AppLanguage } from '@/lib/studio-types';

// ============================================================
// PART 1 — 4언어 라벨
// ============================================================

const SECTION_LABELS = {
  KO: {
    title: 'IP·브랜드 차단 목록',
    desc: '본문 제안 과정에서 피해야 할 실존 상표·프랜차이즈 목록입니다. 작품 내 이름 충돌을 줄이는 참고용입니다.',
    total: '전체',
    byCategory: '카테고리별',
    bySeverity: '심각도별',
    sample: '예시',
    moreNote: '추가 항목은 앱 내부 기준 목록에 포함되어 있습니다.',
  },
  EN: {
    title: 'IP & Brand Blocklist',
    desc: 'A reference list of real-world IPs and brands to avoid during manuscript suggestions, reducing name-collision risk in your work.',
    total: 'Total',
    byCategory: 'By category',
    bySeverity: 'By severity',
    sample: 'Sample',
    moreNote: 'Additional entries are included in the app’s internal reference list.',
  },
  JP: {
    title: 'IP・ブランド遮断リスト',
    desc: '本文提案時に避けたい実在IP・ブランドの参照リストです。作品内の名称衝突を減らすために使います。',
    total: '全体',
    byCategory: 'カテゴリー別',
    bySeverity: '重大度別',
    sample: '例示',
    moreNote: '追加項目はアプリ内部の基準リストに含まれています。',
  },
  CN: {
    title: 'IP·品牌屏蔽列表',
    desc: '正文建议过程中应避开的真实 IP 与品牌参考列表，用于降低作品内名称冲突风险。',
    total: '总数',
    byCategory: '按类别',
    bySeverity: '按严重度',
    sample: '示例',
    moreNote: '更多条目已包含在应用内部参考列表中。',
  },
} as const;

const CATEGORY_LABELS: Record<BrandCategory, Record<AppLanguage, string>> = {
  'us-entertainment': { KO: '미국 엔터', EN: 'US Entertainment', JP: '米エンタメ', CN: '美国娱乐' },
  'jp-manga-anime': { KO: '일본 만화/애니', EN: 'Japan Manga/Anime', JP: '日本漫画/アニメ', CN: '日本漫画/动漫' },
  'kr-webnovel': { KO: '한국 웹소설', EN: 'Korean Web Novel', JP: '韓国ウェブ小説', CN: '韩国网络小说' },
  'kr-webtoon': { KO: '한국 웹툰', EN: 'Korean Webtoon', JP: '韓国ウェブトゥーン', CN: '韩国漫画' },
  'games': { KO: '게임', EN: 'Games', JP: 'ゲーム', CN: '游戏' },
  'tech-it': { KO: 'Tech/IT', EN: 'Tech/IT', JP: 'Tech/IT', CN: 'Tech/IT' },
  'luxury-consumer': { KO: '럭셔리/소비', EN: 'Luxury/Consumer', JP: 'ラグジュアリー/消費', CN: '奢侈品/消费' },
  'food-beverage': { KO: '식음료', EN: 'Food/Beverage', JP: '食品/飲料', CN: '食品/饮料' },
  'sports-fashion': { KO: '스포츠/패션', EN: 'Sports/Fashion', JP: 'スポーツ/ファッション', CN: '运动/时尚' },
  'film-tv': { KO: '영화/TV', EN: 'Film/TV', JP: '映画/TV', CN: '影视' },
};

const SEVERITY_LABELS: Record<BrandSeverity, Record<AppLanguage, string>> = {
  critical: { KO: '치명적', EN: 'Critical', JP: '致命的', CN: '关键' },
  warning: { KO: '경고', EN: 'Warning', JP: '警告', CN: '警告' },
  info: { KO: '정보', EN: 'Info', JP: '情報', CN: '信息' },
};

// ============================================================
// PART 2 — Component
// ============================================================

interface Props {
  language: AppLanguage;
}

export default function BrandGuardSection({ language }: Props) {
  const [open, setOpen] = useState(false);
  const L = SECTION_LABELS[language];

  const stats = useMemo(() => {
    const byCategory: Partial<Record<BrandCategory, number>> = {};
    const bySeverity: Partial<Record<BrandSeverity, number>> = {};
    for (const entry of BRAND_BLOCKLIST) {
      byCategory[entry.category] = (byCategory[entry.category] ?? 0) + 1;
      bySeverity[entry.severity] = (bySeverity[entry.severity] ?? 0) + 1;
    }
    return { byCategory, bySeverity, total: BRAND_BLOCKLIST.length };
  }, []);

  const sample = useMemo(() => {
    return BRAND_BLOCKLIST.slice(0, 10).map(e => e.canonical);
  }, []);

  return (
    <details
      className="ds-accordion border border-border bg-bg-primary my-4"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer px-4 py-3 flex items-center justify-between min-h-[44px]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent-blue" aria-hidden="true" />
          <span className="font-bold text-text-primary text-sm">{L.title}</span>
          <span className="text-text-tertiary text-xs">({stats.total})</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </summary>

      <div className="px-4 pb-4 space-y-4 text-xs">
        <p className="text-text-secondary text-[11px] leading-relaxed">{L.desc}</p>

        {/* 카테고리별 */}
        <div>
          <div className="text-text-tertiary uppercase tracking-wider text-[10px] mb-2">{L.byCategory}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(stats.byCategory) as BrandCategory[]).map(cat => (
              <div key={cat} className="flex justify-between border border-border px-2 py-1.5 bg-bg-secondary">
                <span className="text-text-primary text-[11px]">{CATEGORY_LABELS[cat][language]}</span>
                <span className="text-text-tertiary font-mono text-[11px]">{stats.byCategory[cat]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 심각도별 */}
        <div>
          <div className="text-text-tertiary uppercase tracking-wider text-[10px] mb-2">{L.bySeverity}</div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(stats.bySeverity) as BrandSeverity[]).map(sev => (
              <div key={sev} className="flex justify-between border border-border px-2 py-1.5 bg-bg-secondary">
                <span className={`text-[11px] ${
                  sev === 'critical' ? 'text-accent-red' :
                  sev === 'warning' ? 'text-accent-amber' : 'text-text-secondary'
                }`}>{SEVERITY_LABELS[sev][language]}</span>
                <span className="text-text-tertiary font-mono text-[11px]">{stats.bySeverity[sev]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* sample list */}
        <div>
          <div className="text-text-tertiary uppercase tracking-wider text-[10px] mb-2">{L.sample}</div>
          <div className="text-text-secondary text-[11px] font-mono leading-relaxed">
            {sample.join(' · ')}
          </div>
          <p className="text-text-tertiary text-[10px] mt-2">{L.moreNote}</p>
        </div>
      </div>
    </details>
  );
}
