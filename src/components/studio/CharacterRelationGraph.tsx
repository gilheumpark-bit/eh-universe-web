"use client";

// ============================================================
// CharacterRelationGraph — 캐릭터 관계 미니 SVG 그래프
// ============================================================
// 2026-04-21 (P2): "이 화에 등장하는 캐릭터들의 관계를 한 눈에" 시각화.
//
// 데이터: config.characters + config.charRelations
// 디자인:
//   - 원형 배치 (force-directed는 과함, N≤20 가정)
//   - 노드: 캐릭터 이름 (이니셜 + 풀 이름)
//   - 엣지: 관계 타입별 색상 (lover=red, rival=amber, friend=green, enemy=red, family=blue, mentor=purple, subordinate=gray)
//   - hover: 노드 강조 + 연결된 엣지만 강조
//   - 클릭: 캐릭터 정보 패널 (옵션, 향후)
//
// 위치: WritingContextPanel 인물 탭 하단 (관계 데이터 있을 때만)
// ============================================================

import React, { useMemo, useState } from 'react';
import type { Character, CharRelation, CharRelationType, AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

// ============================================================
// PART 1 — 관계 타입별 색상 (Tailwind 호환)
// ============================================================

const REL_COLORS: Record<CharRelationType, { stroke: string; label: string }> = {
  lover: { stroke: '#c4786d', label: '연인' },          // accent-red
  rival: { stroke: '#caa572', label: '라이벌' },         // accent-amber
  friend: { stroke: '#6aaa90', label: '친구' },          // accent-green
  enemy: { stroke: '#a04938', label: '적' },             // accent-red dark
  family: { stroke: '#8898ad', label: '가족' },          // accent-blue
  mentor: { stroke: '#a08573', label: '스승' },          // accent-purple
  subordinate: { stroke: '#71717a', label: '부하' },     // zinc
};

const REL_LABELS_4LANG: Record<CharRelationType, { ko: string; en: string; ja: string; zh: string }> = {
  lover: { ko: '연인', en: 'Lover', ja: '恋人', zh: '恋人' },
  rival: { ko: '라이벌', en: 'Rival', ja: 'ライバル', zh: '对手' },
  friend: { ko: '친구', en: 'Friend', ja: '友人', zh: '朋友' },
  enemy: { ko: '적', en: 'Enemy', ja: '敵', zh: '敌人' },
  family: { ko: '가족', en: 'Family', ja: '家族', zh: '家人' },
  mentor: { ko: '스승', en: 'Mentor', ja: '師匠', zh: '导师' },
  subordinate: { ko: '부하', en: 'Subordinate', ja: '部下', zh: '下属' },
};

// ============================================================
// PART 2 — 원형 좌표 계산
// ============================================================

interface NodePosition {
  x: number;
  y: number;
  initial: string;
}

function computePositions(characters: Character[], cx: number, cy: number, radius: number): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const n = characters.length;
  if (n === 0) return positions;

  characters.forEach((c, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2; // 12시 방향에서 시작
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    const initial = (c.name || '').slice(0, 1).toUpperCase() || '?';
    positions.set(c.name, { x, y, initial });
  });

  return positions;
}

// ============================================================
// PART 3 — Props + Component
// ============================================================

export interface CharacterRelationGraphProps {
  characters: Character[];
  relations: CharRelation[] | undefined;
  language: AppLanguage;
  /** 그래프 크기 (px). 정사각형. 기본 240. */
  size?: number;
}

export function CharacterRelationGraph({
  characters,
  relations,
  language,
  size = 240,
}: CharacterRelationGraphProps) {
  const [hoveredChar, setHoveredChar] = useState<string | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const nodeRadius = 16;
  const orbitRadius = size / 2 - nodeRadius - 8;

  const positions = useMemo(
    () => computePositions(characters, cx, cy, orbitRadius),
    [characters, cx, cy, orbitRadius],
  );

  const validRelations = useMemo(
    () =>
      (relations ?? []).filter(
        r => positions.has(r.from) && positions.has(r.to) && r.from !== r.to,
      ),
    [relations, positions],
  );

  // 빈 데이터 처리
  if (characters.length < 2) {
    return (
      <p className="text-[10px] text-text-tertiary text-center py-4 italic">
        {L4(language, {
          ko: '캐릭터 2명 이상 등록 시 관계 그래프가 표시됩니다.',
          en: 'Add at least 2 characters to see relation graph.',
          ja: 'キャラクター2名以上登録で関係グラフが表示されます。',
          zh: '添加 2 名以上角色后将显示关系图。',
        })}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
          {L4(language, { ko: '관계 그래프', en: 'Relation Graph', ja: '関係グラフ', zh: '关系图' })}
        </span>
        <span className="text-[9px] text-text-quaternary font-mono tabular-nums">
          {characters.length}c · {validRelations.length}r
        </span>
      </div>

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rounded-lg bg-bg-secondary/30 border border-border/30"
        role="img"
        aria-label={L4(language, {
          ko: '캐릭터 관계 그래프',
          en: 'Character relation graph',
          ja: 'キャラクター関係グラフ',
          zh: '角色关系图',
        })}
      >
        {/* 엣지 (배경) — 라인 + 라벨 */}
        {validRelations.map((rel, i) => {
          const a = positions.get(rel.from);
          const b = positions.get(rel.to);
          if (!a || !b) return null;
          const color = REL_COLORS[rel.type] || REL_COLORS.friend;
          const isDimmed = hoveredChar !== null && hoveredChar !== rel.from && hoveredChar !== rel.to;
          return (
            <line
              key={`r-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={color.stroke}
              strokeWidth={isDimmed ? 0.8 : 1.5}
              strokeOpacity={isDimmed ? 0.2 : 0.7}
              strokeLinecap="round"
            />
          );
        })}

        {/* 노드 (전경) — 원 + 이니셜 */}
        {characters.map((c) => {
          const pos = positions.get(c.name);
          if (!pos) return null;
          const isHovered = hoveredChar === c.name;
          const isDimmed = hoveredChar !== null && !isHovered &&
            !validRelations.some(r => (r.from === c.name && r.to === hoveredChar) || (r.to === c.name && r.from === hoveredChar));
          return (
            <g
              key={c.id}
              onMouseEnter={() => setHoveredChar(c.name)}
              onMouseLeave={() => setHoveredChar(null)}
              className="cursor-pointer transition-opacity"
              style={{ opacity: isDimmed ? 0.3 : 1 }}
            >
              <title>{`${c.name}${c.role ? ` (${c.role})` : ''}`}</title>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeRadius}
                fill={isHovered ? 'var(--color-accent-amber)' : 'var(--color-bg-tertiary)'}
                stroke="var(--color-border)"
                strokeWidth={isHovered ? 2 : 1}
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="11"
                fontWeight="700"
                fill={isHovered ? 'var(--color-bg-primary)' : 'var(--color-text-primary)'}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {pos.initial}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 호버 캐릭터 정보 */}
      {hoveredChar && (
        <p className="text-[10px] text-text-secondary" aria-live="polite">
          <span className="font-bold text-text-primary">{hoveredChar}</span>
          {' — '}
          {validRelations
            .filter(r => r.from === hoveredChar || r.to === hoveredChar)
            .slice(0, 3)
            .map(r => {
              const other = r.from === hoveredChar ? r.to : r.from;
              const label = REL_LABELS_4LANG[r.type];
              return `${other} (${L4(language, label)})`;
            })
            .join(', ') ||
            L4(language, {
              ko: '관계 미설정',
              en: 'No relations',
              ja: '関係未設定',
              zh: '未设定关系',
            })}
        </p>
      )}

      {/* 범례 (관계 타입 → 색) — 사용 중인 타입만 노출 */}
      {validRelations.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-1 pt-1">
          {Array.from(new Set(validRelations.map(r => r.type))).map(t => (
            <span key={t} className="inline-flex items-center gap-1 text-[9px] text-text-tertiary">
              <span
                className="inline-block w-2 h-0.5 rounded"
                style={{ background: REL_COLORS[t]?.stroke || '#888' }}
                aria-hidden="true"
              />
              {L4(language, REL_LABELS_4LANG[t] || { ko: t, en: t, ja: t, zh: t })}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default CharacterRelationGraph;
