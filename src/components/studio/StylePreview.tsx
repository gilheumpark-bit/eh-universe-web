"use client";

// ============================================================
// PART 1 — Sample Text Bank & Types
// ============================================================

import React, { useMemo, useState } from 'react';
import type { StyleProfile, AppLanguage } from '@/lib/studio-types';
import { STYLE_ARCHETYPES, sliderToRadarPoints, StyleArchetype } from '@/lib/style-benchmarks';


interface Props {
  profile: StyleProfile;
  language: AppLanguage;
}

const SAMPLE_KO = {
  action: '그가 문을 열었다. 안에는 아무도 없었다. 바닥에 뭔가가 떨어져 있었다. 그는 조심스럽게 다가갔다. 차가운 금속 질감이 손끝에 닿았다.',
  dialogue: '"이건 네가 할 일이 아니야." 그녀가 말했다. "알아. 그래도 해야 해." 그는 대답했다. 침묵이 둘 사이를 채웠다.',
  introspection: '왜 이 길을 선택했는지 더 이상 기억나지 않았다. 분명 처음에는 이유가 있었다. 지금은 그저 관성이다. 멈추면 무너질 것 같았다.',
  description: '창밖으로 비가 내렸다. 도시의 불빛이 빗줄기에 번져 흐릿했다. 가로등 아래 고인 물웅덩이가 하늘을 거꾸로 비추고 있었다.',
};

const SAMPLE_EN = {
  action: 'He opened the door. No one was inside. Something lay on the floor. He approached carefully. Cold metal touched his fingertips.',
  dialogue: '"This isn\'t your job." she said. "I know. But I have to." he replied. Silence filled the space between them.',
  introspection: 'He couldn\'t remember why he chose this path. There had been a reason once. Now it was just inertia. Stopping felt like collapsing.',
  description: 'Rain fell outside the window. City lights blurred through the streaks. A puddle beneath the streetlamp reflected the sky upside down.',
};

type SampleKey = keyof typeof SAMPLE_KO;

// IDENTITY_SEAL: PART-1 | role=samples-types | inputs=none | outputs=SAMPLE_KO,SAMPLE_EN

// ============================================================
// PART 2 — Style Transformation Engine (client-side)
// ============================================================

export function applyStyleTransform(text: string, sliders: Record<string, number>, language: AppLanguage): string {
  let result = text;
  const s1 = sliders.s1 ?? 3; // sentence length
  const s2 = sliders.s2 ?? 3; // emotion density
  const s3 = sliders.s3 ?? 3; // description style
  const s5 = sliders.s5 ?? 3; // tempo

  const sentences = result.split(/(?<=[.!?。！？])\s*/);

  // s1: sentence length — merge or split
  if (s1 >= 4 && sentences.length >= 2) {
    // Merge pairs of short sentences
    const merged: string[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      if (i + 1 < sentences.length) {
        const joiner = language === 'KO' ? ', 그리고 ' : ', and ';
        const a = sentences[i].replace(/[.!?。！？]+$/, '');
        merged.push(a + joiner + sentences[i + 1].charAt(0).toLowerCase() + sentences[i + 1].slice(1));
      } else {
        merged.push(sentences[i]);
      }
    }
    result = merged.join(' ');
  } else if (s1 <= 2) {
    // Split long sentences at commas
    result = sentences.map(s => {
      if (s.length > 30) {
        return s.replace(/,\s*/g, '.\n');
      }
      return s;
    }).join(' ');
  }

  // s2: emotion density — add emotion markers
  if (s2 >= 4) {
    const emotionMarkers = language === 'KO'
      ? ['마음이 무거웠다.', '가슴이 조여왔다.', '호흡이 가빠졌다.']
      : ['A weight settled in his chest.', 'His throat tightened.', 'His breath quickened.'];
    const midPoint = Math.floor(result.split(/[.!?。！？]/).length / 2);
    const parts = result.split(/(?<=[.!?。！？])\s*/);
    if (parts.length > midPoint) {
      parts.splice(midPoint, 0, emotionMarkers[midPoint % emotionMarkers.length]);
    }
    result = parts.join(' ');
  }

  // s3: description style — add sensory phrases
  if (s3 >= 4) {
    const sensory = language === 'KO'
      ? ['차가운 공기가 피부를 스쳤다.', '먼 곳에서 기계음이 울렸다.']
      : ['Cold air brushed against skin.', 'A distant hum resonated.'];
    result = result + ' ' + sensory[0];
  }

  // s5: tempo — paragraph breaks
  if (s5 >= 4) {
    const finalSentences = result.split(/(?<=[.!?。！？])\s*/);
    const grouped: string[] = [];
    for (let i = 0; i < finalSentences.length; i += 2) {
      grouped.push(finalSentences.slice(i, i + 2).join(' '));
    }
    result = grouped.join('\n\n');
  }

  return result;
}

// IDENTITY_SEAL: PART-2 | role=transform | inputs=text,sliders | outputs=transformed text

// ============================================================
// PART 3 — Radar Chart + Preview Renderer
// ============================================================

function RadarChart({ profile, archetypes, language }: {
  profile: StyleProfile;
  archetypes: StyleArchetype[];
  language: AppLanguage;
}) {
  const isKO = language === 'KO';
  const cx = 100, cy = 100, radius = 70;
  const axisLabels = isKO
    ? ['문장길이', '감정밀도', '묘사방식', '시점거리', '템포']
    : ['Length', 'Emotion', 'Describe', 'POV', 'Tempo'];

  // Pentagon grid
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const axes = axisLabels.map((_, i) => {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });

  // User profile polygon
  const userPoints = sliderToRadarPoints(profile.sliders, cx, cy, radius);
  const userPath = userPoints.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[220px]" role="img" aria-label={isKO ? '스타일 레이더 차트' : 'Style radar chart'}>
      {/* Grid */}
      {gridLevels.map(level => {
        const pts = Array.from({ length: 5 }, (_, i) => {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          return `${cx + radius * level * Math.cos(angle)},${cy + radius * level * Math.sin(angle)}`;
        }).join(' ');
        return <polygon key={level} points={pts} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />;
      })}

      {/* Axis lines */}
      {axes.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={a.x} y2={a.y} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      ))}

      {/* Archetype polygons */}
      {archetypes.map(arch => {
        const pts = sliderToRadarPoints(arch.sliders, cx, cy, radius);
        return (
          <polygon key={arch.id}
            points={pts.map(([x, y]) => `${x},${y}`).join(' ')}
            fill={arch.color} fillOpacity="0.08" stroke={arch.color} strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
        );
      })}

      {/* User polygon */}
      <polygon points={userPath} fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeWidth="2" />
      {userPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#f59e0b" />
      ))}

      {/* Labels */}
      {axes.map((a, i) => {
        const labelOffset = 14;
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const lx = cx + (radius + labelOffset) * Math.cos(angle);
        const ly = cy + (radius + labelOffset) * Math.sin(angle);
        return (
          <text key={i} x={lx} y={ly} fill="rgba(255,255,255,0.4)" fontSize="7" textAnchor="middle" dominantBaseline="central">
            {axisLabels[i]}
          </text>
        );
      })}
    </svg>
  );
}

export default function StylePreview({ profile, language }: Props) {
  const isKO = language === 'KO';
  const samples = isKO ? SAMPLE_KO : SAMPLE_EN;
  const [sampleKey, setSampleKey] = useState<SampleKey>('action');
  const [compareArchs, setCompareArchs] = useState<string[]>([]);

  const original = samples[sampleKey];
  const transformed = useMemo(
    () => applyStyleTransform(original, profile.sliders, language),
    [original, profile.sliders, language]
  );

  const selectedArchs = STYLE_ARCHETYPES.filter(a => compareArchs.includes(a.id));

  const toggleArch = (id: string) => {
    setCompareArchs(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const sampleLabels: Record<SampleKey, { ko: string; en: string }> = {
    action: { ko: '액션', en: 'Action' },
    dialogue: { ko: '대화', en: 'Dialogue' },
    introspection: { ko: '내면', en: 'Inner' },
    description: { ko: '묘사', en: 'Description' },
  };

  return (
    <div className="space-y-4">
      {/* Radar chart + archetype selector */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex justify-center">
          <RadarChart profile={profile} archetypes={selectedArchs} language={language} />
        </div>
        <div className="flex-1 space-y-2">
          <h4 className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">
            {isKO ? '아키타입 비교 (최대 2)' : 'Compare Archetypes (max 2)'}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {STYLE_ARCHETYPES.map(arch => {
              const active = compareArchs.includes(arch.id);
              return (
                <button key={arch.id} onClick={() => toggleArch(arch.id)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
                    active ? 'text-white' : 'text-text-tertiary border-border hover:border-white/20'
                  }`}
                  style={active ? { borderColor: arch.color, background: `${arch.color}20` } : undefined}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: arch.color }} />
                  {isKO ? arch.ko : arch.en}
                </button>
              );
            })}
          </div>
          {selectedArchs.map(a => (
            <p key={a.id} className="text-[9px] text-text-tertiary" style={{ color: a.color }}>
              {isKO ? a.descKO : a.descEN}
            </p>
          ))}
        </div>
      </div>

      {/* Sample text selector */}
      <div className="flex gap-1">
        {(Object.keys(sampleLabels) as SampleKey[]).map(key => (
          <button key={key} onClick={() => setSampleKey(key)}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
              sampleKey === key ? 'bg-white/10 text-white border-white/20' : 'text-text-tertiary border-border'
            }`}
          >
            {isKO ? sampleLabels[key].ko : sampleLabels[key].en}
          </button>
        ))}
      </div>

      {/* Before / After */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-black/30 border border-border/30 rounded-xl p-3 space-y-1.5">
          <h5 className="text-[9px] font-bold text-text-tertiary uppercase">
            {isKO ? '원문' : 'Original'}
          </h5>
          <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">{original}</p>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-1.5">
          <h5 className="text-[9px] font-bold text-amber-400 uppercase">
            {isKO ? '변환 프리뷰' : 'Transformed'}
          </h5>
          <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">{transformed}</p>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=radar+preview | inputs=StyleProfile,language | outputs=JSX
