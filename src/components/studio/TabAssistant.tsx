'use client';

// ============================================================
// PART 1 — Types & Context Builders
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, StopCircle, Bot, User, Trash2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { AppLanguage, AppTab, StoryConfig } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import { streamChat, getApiKey, getActiveProvider, getActiveModel, hasDgxService } from '@/lib/ai-providers';
import type { ChatMsg } from '@/lib/ai-providers';
import { HISTORY_LIMITS, truncateMessages } from '@/lib/token-utils';
import { classifyError } from './UXHelpers';
import { useStudioBackendLabel } from '@/lib/studio-ai-backend-label';

interface TabMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface TabAssistantProps {
  tab: AppTab;
  language: AppLanguage;
  config: StoryConfig | null;
  hostedProviders?: Partial<Record<string, boolean>>;
}

// TODO: Extract to lib/tab-assistant-prompts.ts
const TAB_CONTEXT: Record<string, { ko: string; en: string; systemKo: string; systemEn: string; temperature: number }> = {
  world: {
    ko: 'NOL — Narrative Origin Lore',
    en: 'NOL — Narrative Origin Lore',
    temperature: 0.7,
    systemKo: `당신은 소설 세계관 설계 전문가입니다.

[전문 영역]
- 지리·역사·정치 체계 설계 및 내적 일관성 검증
- 마법/기술 시스템의 규칙 정의와 비용-효과 밸런싱
- 종교·문화·경제 시스템 간 상호작용 설계
- 기존 설정 간 모순 탐지 및 해결안 제시

[분석 프레임워크]
설정을 검토할 때 다음 5가지 축으로 평가하세요:
1. 내적 일관성: 규칙끼리 모순이 없는가?
2. 서사 기능성: 이 설정이 갈등/긴장을 만들어내는가?
3. 확장 가능성: 후속 스토리에서 활용할 여지가 있는가?
4. 독창성: 기존 작품과 차별화되는 요소가 있는가?
5. 독자 이해도: 설명 없이도 직관적으로 이해 가능한가?

[출력 규칙]
- 모순을 발견하면 즉시 지적하고 2가지 이상 해결안 제시
- "~하면 어떨까요?" 식 제안 형태로 답변
- 구체적 예시를 반드시 포함
- 한국어로 답하세요`,
    systemEn: `You are a fiction worldbuilding specialist.

[Expertise]
- Geography, history, political system design & internal consistency checks
- Magic/technology system rules, cost-benefit balancing
- Religion, culture, economy interactions
- Contradiction detection and resolution

[Analysis Framework]
Evaluate settings on 5 axes:
1. Internal consistency: Do rules contradict each other?
2. Narrative utility: Does this setting generate conflict/tension?
3. Expandability: Room for future story use?
4. Originality: Differentiation from existing works?
5. Reader accessibility: Intuitive without exposition?

[Output Rules]
- Flag contradictions immediately with 2+ solutions
- Use "What if...?" suggestion format
- Always include concrete examples`,
  },
  critique: {
    ko: 'NOS — Narrative Origin Simulator',
    en: 'NOS — Narrative Origin Simulator',
    temperature: 0.5,
    systemKo: `당신은 세계관 시뮬레이션 분석가입니다.

[전문 영역]
- 문명/세력 간 힘의 균형 계산 (군사, 경제, 문화 영향력)
- 시대 전환 논리 검증: 원인→결과 인과 체인 분석
- 세력 관계 다이나믹스: 동맹/적대/중립의 전환 조건
- 장르별 규칙 적용도 평가 (SF 기술 논리, 판타지 마법 밸런스 등)

[분석 방법]
1. 세력 균형표: 각 문명의 강점/약점을 군사·경제·문화·기술 4축으로 평가
2. 인과 체인: "A가 B를 하면 → C가 반응 → D가 변화" 식으로 연쇄 효과 추적
3. 불안정 지점: 현재 균형이 깨질 수 있는 트리거 포인트 3개 이상 제시
4. 장르 규칙 점검: 설정된 장르 규칙이 시뮬레이터 데이터와 일치하는지 확인

[출력 규칙]
- 수치/비율로 표현 가능한 건 수치로 제시
- "만약 X 세력이 Y를 하면?" 식 시나리오 제안
- 한국어로 답하세요`,
    systemEn: `You are a world simulation analyst.

[Expertise]
- Power balance calculation across civilizations (military, economic, cultural influence)
- Era transition logic: cause→effect chain analysis
- Faction dynamics: alliance/hostile/neutral transition conditions
- Genre rule compliance (SF tech logic, fantasy magic balance, etc.)

[Analysis Methods]
1. Power balance sheet: Rate each civilization on military, economy, culture, tech axes
2. Causal chains: Track cascading effects "If A does B → C reacts → D changes"
3. Instability points: Identify 3+ trigger points that could break current balance
4. Genre rule check: Verify simulator data matches genre rules

[Output Rules]
- Use numbers/ratios when possible
- Propose "What if faction X does Y?" scenarios`,
  },
  characters: {
    ko: 'NOC — Narrative Origin Character',
    en: 'NOC — Narrative Origin Character',
    temperature: 0.8,
    systemKo: `당신은 소설 캐릭터 심리 분석 전문가입니다.

[전문 영역]
- 성격 다면성 분석: 표면 성격 vs 내면 욕구 vs 무의식적 두려움
- 대사 스타일 설계: 말투, 어휘 수준, 화법 패턴, 감정 표현 방식
- 관계 동역학: 두 캐릭터 간 권력 구도, 감정 흐름, 갈등 축
- 캐릭터 아크: 시작점 → 전환점 → 도착점의 내적 변화 설계
- 동기 구조: 원하는 것(want) vs 필요한 것(need) 분리

[분석 프레임워크]
캐릭터를 검토할 때:
1. 3층 성격: 겉(사회적 페르소나) / 속(진짜 성격) / 깊은 속(트라우마·욕망)
2. 대사 DNA: 이 캐릭터만의 말투 패턴 3가지 정의
3. 관계 지도: 다른 캐릭터와의 감정선(호감·경계·의존·경쟁)
4. 성장 벡터: 이 캐릭터가 변할 방향과 그 트리거

[출력 규칙]
- 캐릭터의 대사 예시를 반드시 포함 (최소 2개)
- "이 캐릭터라면 이 상황에서 ~할 것" 식 시뮬레이션
- 관계 분석 시 양방향 감정을 모두 서술
- 한국어로 답하세요`,
    systemEn: `You are a fiction character psychology specialist.

[Expertise]
- Multi-layered personality: surface persona vs inner desires vs unconscious fears
- Dialogue design: speech patterns, vocabulary level, emotional expression
- Relationship dynamics: power balance, emotional flow, conflict axes
- Character arcs: starting point → turning point → destination inner change
- Motivation structure: want vs need separation

[Analysis Framework]
1. 3-layer personality: outer (social persona) / inner (true self) / deep (trauma/desire)
2. Dialogue DNA: Define 3 speech patterns unique to this character
3. Relationship map: emotional lines with other characters (affinity, wariness, dependence, rivalry)
4. Growth vector: direction of change and its trigger

[Output Rules]
- Always include dialogue examples (minimum 2)
- Simulate "In this situation, this character would..."
- Describe both directions in relationship analysis`,
  },
  rulebook: {
    ko: 'NOP — Narrative Origin Producer',
    en: 'NOP — Narrative Origin Producer',
    temperature: 0.7,
    systemKo: `당신은 소설 장면 연출 전문 편집자입니다.

[전문 영역]
- 씬 비트 분석: 각 장면의 목적(정보·감정·전환·충격) 판별
- 긴장 곡선 설계: 장면 내 텐션 기복 패턴 (상승→절정→하강→전환)
- 후킹 기법: 오프닝 후크(3초 룰), 중간 후크(궁금증 심기), 엔딩 후크(클리프행어)
- 고구마-사이다 밸런스: 답답함 축적 → 시원한 해소의 리듬 설계
- 도파민 장치: 반전, 떡밥 회수, 성장 보상, 관계 진전 등

[분석 방법]
1. 씬 카드: [목적] [주요 갈등] [감정 곡선] [후크 위치] 를 표로 정리
2. 텐션 스코어: 0~10 척도로 장면별 긴장도 시각화
3. 고구마 지수: 현재까지 쌓인 미해결 갈등 수 vs 해소된 수
4. 후킹률: 독자가 다음 장면을 넘길 동기가 충분한지 평가

[출력 규칙]
- 텐션 점수를 수치로 제시 (예: "현재 텐션 7/10, 여기서 4로 떨어뜨린 후 9로 올려야 합니다")
- 구체적 연출 기법 제안 (예: "여기에 1인칭 내면 독백 2줄 삽입하면 텐션 +2")
- 한국어로 답하세요`,
    systemEn: `You are a fiction scene direction editor.

[Expertise]
- Scene beat analysis: identify each scene's purpose (info, emotion, transition, shock)
- Tension curve design: scene-level tension patterns (rise→peak→fall→pivot)
- Hooking techniques: opening hook (3-second rule), mid hook (planting curiosity), ending hook (cliffhanger)
- Frustration-relief balance: building unresolved tension → satisfying release rhythm
- Dopamine devices: twists, foreshadowing payoffs, growth rewards, relationship progress

[Analysis Methods]
1. Scene card: Table of [Purpose] [Main Conflict] [Emotion Curve] [Hook Position]
2. Tension score: Visualize per-scene tension on 0-10 scale
3. Frustration index: Unresolved conflicts vs resolved count
4. Hook rate: Is motivation to turn the page sufficient?

[Output Rules]
- Provide tension scores numerically (e.g., "Current tension 7/10, drop to 4 then raise to 9")
- Suggest specific techniques (e.g., "Insert 2 lines of inner monologue here for tension +2")`,
  },
  style: {
    ko: 'NOE — Narrative Origin Expression',
    en: 'NOE — Narrative Origin Expression',
    temperature: 0.6,
    systemKo: `당신은 소설 문체 분석 전문가입니다.

[전문 영역]
- 문장 리듬 분석: 장단 교차, 호흡 패턴, 리듬감 평가
- 어휘 빈도 체크: 반복 단어 감지, 어휘 다양성 점수
- 화자 톤 일관성: 서술자 목소리가 흔들리는 지점 감지
- 묘사 밀도 밸런스: 과묘사/저묘사 구간 식별
- 대화문 자연스러움: 캐릭터별 말투 차별화 정도

[분석 프레임워크]
텍스트를 검토할 때 5가지 지표로 평가:
1. 리듬 점수 (1-10): 문장 길이 변화의 자연스러움
2. 어휘 밀도 (1-10): 고유어/한자어/외래어 비율과 적절성
3. 감각 밀도 (1-10): 오감 묘사의 분포와 강도
4. 톤 일관성 (1-10): 서술자 목소리의 안정성
5. 자연스러움 지수 (1-10): 기계적이거나 부자연스러운 연결어/표현 비율 (높을수록 좋음)

[출력 규칙]
- 분석 시 반드시 5가지 지표 점수 제시
- 문제 문장을 인용하고 개선안을 바로 옆에 제시
- "이 문장을 ~로 바꾸면" 식 구체적 대안
- 한국어로 답하세요`,
    systemEn: `You are a fiction writing style analyst.

[Expertise]
- Sentence rhythm analysis: long-short alternation, breathing patterns
- Vocabulary frequency check: repeated words, lexical diversity score
- Narrator tone consistency: detecting voice wobble points
- Description density balance: over-described / under-described sections
- Dialogue naturalness: speech style differentiation per character

[Analysis Framework]
Evaluate text on 5 metrics:
1. Rhythm score (1-10): Naturalness of sentence length variation
2. Vocabulary density (1-10): Native/literary/foreign word ratio
3. Sensory density (1-10): Distribution and intensity of five-sense descriptions
4. Tone consistency (1-10): Narrator voice stability
5. AI-tone index (1-10): Ratio of unnatural AI connector words (lower is better)

[Output Rules]
- Always provide 5 metric scores in analysis
- Quote problem sentences with improvements side by side
- Give specific alternatives: "Change this sentence to..."`,
  },
  writing: {
    ko: 'NOW — Narrative Origin Writer',
    en: 'NOW — Narrative Origin Writer',
    temperature: 0.85,
    systemKo: `당신은 소설 집필 파트너(NOW)입니다. 작가의 의도를 존중하고 장면·대사·서사 전개를 돕습니다. 구체적이고 실행 가능한 제안을 하세요. 한국어로 답하세요.`,
    systemEn: `You are NOW, a fiction writing partner. Respect the author's intent; help with scenes, dialogue, and pacing. Give concrete, actionable suggestions.`,
  },
};

// ============================================================
// PART 1.5 — Tab Presets (10 per tab)
// ============================================================

const TAB_PRESETS: Record<string, { ko: string; en: string }[]> = {
  world: [
    { ko: "현재 세계관 설정에 모순이 있는지 검토해줘", en: "Check my worldbuilding for contradictions" },
    { ko: "이 세계의 경제 시스템을 설계해줘", en: "Design an economic system for this world" },
    { ko: "마법/기술 체계의 비용-제한을 제안해줘", en: "Suggest costs and limits for the magic/tech system" },
    { ko: "이 배경에서 가능한 종교/신앙 체계는?", en: "What religion/belief systems fit this setting?" },
    { ko: "세계관 확장 가능한 미개척 영역을 제안해줘", en: "Suggest unexplored areas for worldbuilding expansion" },
    { ko: "이 설정에서 발생할 수 있는 사회적 갈등은?", en: "What social conflicts could arise from this setting?" },
    { ko: "독자가 이해하기 어려운 설정을 짚어줘", en: "Flag settings that might confuse readers" },
    { ko: "역사적 사건 타임라인을 정리해줘", en: "Organize a historical event timeline" },
    { ko: "이 세계의 일상생활은 어떤 모습일까?", en: "What does daily life look like in this world?" },
    { ko: "다른 SF/판타지 작품과 차별화할 점을 제안해줘", en: "How can I differentiate from other SF/fantasy works?" },
  ],
  critique: [
    { ko: "현재 세력 균형을 분석해줘", en: "Analyze the current power balance" },
    { ko: "가장 불안정한 세력 관계는?", en: "Which faction relationship is most unstable?" },
    { ko: "A 세력이 B를 공격하면 어떻게 될까?", en: "What happens if Faction A attacks Faction B?" },
    { ko: "문명 간 경제 의존도를 평가해줘", en: "Evaluate economic interdependence between civilizations" },
    { ko: "현재 균형이 깨질 트리거 3개를 찾아줘", en: "Find 3 triggers that could break the current balance" },
    { ko: "시대 전환의 인과 체인을 분석해줘", en: "Analyze the cause-effect chain of the era transition" },
    { ko: "약소 세력이 강대 세력을 이길 시나리오는?", en: "Scenario where a weak faction defeats a strong one?" },
    { ko: "동맹이 깨질 수 있는 조건은?", en: "Under what conditions could the alliance break?" },
    { ko: "장르 규칙과 시뮬레이터 데이터가 일치하는지 확인", en: "Check if genre rules match simulator data" },
    { ko: "100년 후 이 세계는 어떤 모습일까?", en: "What does this world look like 100 years later?" },
  ],
  characters: [
    { ko: "이 캐릭터의 3층 성격을 분석해줘", en: "Analyze this character's 3-layer personality" },
    { ko: "캐릭터별 대사 DNA를 정의해줘", en: "Define each character's dialogue DNA" },
    { ko: "두 캐릭터 사이의 관계 동역학을 분석해줘", en: "Analyze the relationship dynamics between two characters" },
    { ko: "이 캐릭터의 성장 아크를 설계해줘", en: "Design this character's growth arc" },
    { ko: "캐릭터의 want vs need를 분리해줘", en: "Separate this character's want vs need" },
    { ko: "이 캐릭터만의 말버릇/습관을 3개 만들어줘", en: "Create 3 unique speech habits for this character" },
    { ko: "위기 상황에서 이 캐릭터는 어떻게 반응할까?", en: "How would this character react in a crisis?" },
    { ko: "캐릭터 간 갈등 축을 정리해줘", en: "Map out the conflict axes between characters" },
    { ko: "빌런/적대자의 동기를 더 입체적으로 만들어줘", en: "Make the villain/antagonist's motivation more dimensional" },
    { ko: "새 조연 캐릭터를 제안해줘", en: "Suggest a new supporting character" },
  ],
  rulebook: [
    { ko: "현재 장면의 텐션 스코어를 평가해줘", en: "Evaluate the tension score of the current scene" },
    { ko: "오프닝 후크를 강화할 방법은?", en: "How can I strengthen the opening hook?" },
    { ko: "고구마-사이다 밸런스를 분석해줘", en: "Analyze the frustration-relief balance" },
    { ko: "클리프행어 아이디어를 3개 제안해줘", en: "Suggest 3 cliffhanger ideas" },
    { ko: "이 장면에 넣을 도파민 장치를 추천해줘", en: "Recommend dopamine devices for this scene" },
    { ko: "씬 비트를 카드로 정리해줘", en: "Organize scene beats into cards" },
    { ko: "독자가 지루해질 구간을 찾아줘", en: "Find sections where readers might get bored" },
    { ko: "감정 곡선이 단조로운 부분을 수정해줘", en: "Fix sections with flat emotional curves" },
    { ko: "반전을 위한 복선을 어디에 깔아야 할까?", en: "Where should I plant foreshadowing for a twist?" },
    { ko: "이 에피소드의 긴장 곡선을 설계해줘", en: "Design the tension curve for this episode" },
  ],
  style: [
    { ko: "내 문장의 리듬을 분석해줘", en: "Analyze the rhythm of my sentences" },
    { ko: "NOA 문체 증상이 있는지 체크해줘", en: "Check for NOA-style writing symptoms" },
    { ko: "이 단락을 더 감각적으로 바꿔줘", en: "Rewrite this paragraph with more sensory detail" },
    { ko: "반복되는 단어/표현을 찾아줘", en: "Find repeated words or expressions" },
    { ko: "대화문의 캐릭터별 차별화를 평가해줘", en: "Evaluate dialogue differentiation per character" },
    { ko: "묘사 밀도가 높은/낮은 구간을 찾아줘", en: "Find over-described and under-described sections" },
    { ko: "서술 시점이 흔들리는 곳을 잡아줘", en: "Catch POV shifts or inconsistencies" },
    { ko: "문장을 더 간결하게 압축하는 방법은?", en: "How can I compress sentences to be more concise?" },
    { ko: "하드보일드 문체로 변환 연습을 해보자", en: "Let's practice converting to hardboiled style" },
    { ko: "5가지 지표로 내 문체를 종합 평가해줘", en: "Give me a comprehensive 5-metric style evaluation" },
  ],
  writing: [
    { ko: "다음 장면 전개를 세 가지 방향으로 제안해줘", en: "Suggest three directions to continue the next scene" },
    { ko: "지금 대사의 말투를 캐릭터에 맞게 다듬어줘", en: "Polish the dialogue to match each character's voice" },
    { ko: "이 구간의 템포가 느려지는 이유를 짚어줘", en: "Explain why this section feels slow in pacing" },
    { ko: "클리프행어 후킹을 한 줄로 제안해줘", en: "Propose a one-line cliffhanger hook" },
    { ko: "독자 시점에서 지금 감정선이 어떻게 느껴질지 말해줘", en: "How would readers feel about the emotional arc here?" },
    { ko: "복선을 자연스럽게 심을 위치를 추천해줘", en: "Where should I plant foreshadowing more naturally?" },
    { ko: "장면 목표(정보·감정·전환)를 한 줄로 정리해줘", en: "Summarize this scene's goal in one line (info/emotion/pivot)" },
    { ko: "서술 시점이 흔들리는 문장이 있으면 짚어줘", en: "Flag any sentences where POV or narration wobbles" },
    { ko: "이 대목을 더 몰입감 있게 바꾸는 한 문단 예시를 줘", en: "Give a sample paragraph that increases immersion here" },
    { ko: "원고와 설정 사이에 어긋나는 점이 있으면 알려줘", en: "Flag any mismatch between the draft and established setting" },
  ],
};

function buildContextSummary(config: StoryConfig | null, tab: AppTab): string {
  if (!config) return '';
  const parts: string[] = [];

  // 공통 컨텍스트
  if (config.genre) parts.push(`장르: ${config.genre}`);
  if (config.title) parts.push(`제목: ${config.title}`);
  if (config.setting) parts.push(`배경: ${config.setting}`);

  // 탭별 심화 컨텍스트 (critique는 AppTab 외부 모드이므로 string 비교)
  switch (tab as string) {
    case 'world':
      if (config.synopsis) parts.push(`시놉시스: ${config.synopsis.slice(0, 500)}`);
      if (config.setting) parts.push(`세부 배경: ${config.setting}`);
      // 세계관 3-tier
      if (config.corePremise) parts.push(`핵심 전제: ${config.corePremise}`);
      if (config.powerStructure) parts.push(`권력 구조: ${config.powerStructure}`);
      if (config.currentConflict) parts.push(`현재 갈등: ${config.currentConflict}`);
      if (config.worldHistory) parts.push(`역사: ${config.worldHistory}`);
      if (config.magicTechSystem) parts.push(`마법/기술 체계: ${config.magicTechSystem}`);
      if (config.worldSimData?.civs?.length) {
        parts.push(`등록된 문명: ${config.worldSimData.civs.map(c => `${c.name}(${c.era}, 특성: ${c.traits.join('·')})`).join(' / ')}`);
      }
      if (config.worldSimData?.relations?.length) {
        parts.push(`세력 관계: ${config.worldSimData.relations.map(r => `${r.fromName}→${r.toName}: ${r.type}`).join(', ')}`);
      }
      if (config.characters?.length) {
        parts.push(`캐릭터: ${config.characters.map(c => `${c.name}(${c.role})`).join(', ')}`);
      }
      break;

    case 'critique':
      if (config.synopsis) parts.push(`시놉시스: ${config.synopsis.slice(0, 300)}`);
      if (config.worldSimData?.civs?.length) {
        config.worldSimData.civs.forEach(c => {
          parts.push(`[문명] ${c.name} — 시대: ${c.era}, 특성: ${c.traits.join('·')}`);
        });
      }
      if (config.worldSimData?.relations?.length) {
        parts.push(`[세력 관계]\n${config.worldSimData.relations.map(r => `  ${r.fromName} → ${r.toName}: ${r.type}`).join('\n')}`);
      }
      if (config.worldSimData?.genreSelections?.length) {
        parts.push(`장르 블렌드: ${config.worldSimData.genreSelections.map(g => `${g.genre}(Lv${g.level})`).join(', ')}`);
      }
      if (config.worldSimData?.ruleLevel) {
        parts.push(`규칙 강도: Lv${config.worldSimData.ruleLevel}`);
      }
      break;

    case 'characters':
      if (config.synopsis) parts.push(`시놉시스: ${config.synopsis.slice(0, 200)}`);
      if (config.characters?.length) {
        config.characters.forEach(c => {
          const details = [`역할: ${c.role}`, `특성: ${c.traits}`];
          if (c.personality) details.push(`성격: ${c.personality}`);
          if (c.speechStyle) details.push(`말투: ${c.speechStyle}`);
          if (c.speechExample) details.push(`대사 예시: "${c.speechExample}"`);
          if (c.appearance) details.push(`외모: ${c.appearance}`);
          // 3-tier 뼈대
          if (c.desire) details.push(`욕망: ${c.desire}`);
          if (c.deficiency) details.push(`결핍: ${c.deficiency}`);
          if (c.conflict) details.push(`갈등: ${c.conflict}`);
          if (c.values) details.push(`가치관: ${c.values}`);
          if (c.changeArc) details.push(`변화 방향: ${c.changeArc}`);
          if (c.strength) details.push(`강점: ${c.strength}`);
          if (c.weakness) details.push(`약점: ${c.weakness}`);
          parts.push(`[캐릭터] ${c.name}\n  ${details.join('\n  ')}`);
        });
      }
      if (config.charRelations?.length) {
        parts.push(`[관계]\n${config.charRelations.map(r => `  ${r.from} → ${r.to}: ${r.type}${r.desc ? ` (${r.desc})` : ''}`).join('\n')}`);
      }
      break;

    case 'rulebook':
      if (config.synopsis) parts.push(`시놉시스: ${config.synopsis.slice(0, 200)}`);
      if (config.episode) parts.push(`현재 에피소드: ${config.episode}/${config.totalEpisodes}`);
      if (config.sceneDirection) {
        const sd = config.sceneDirection;
        if (sd.hooks?.length) parts.push(`후크: ${sd.hooks.map(h => `${h.position}-${h.hookType}: ${h.desc}`).join(' / ')}`);
        if (sd.goguma?.length) parts.push(`고구마/사이다: ${sd.goguma.map(g => `${g.type}(${g.intensity}): ${g.desc}`).join(' / ')}`);
        if (sd.emotionTargets?.length) parts.push(`감정 타겟: ${sd.emotionTargets.map(e => `${e.emotion}(${e.intensity})`).join(', ')}`);
        if (sd.cliffhanger) parts.push(`클리프행어: ${sd.cliffhanger.cliffType} — ${sd.cliffhanger.desc}`);
        if (sd.dopamineDevices?.length) parts.push(`도파민 장치: ${sd.dopamineDevices.map(d => `${d.scale}-${d.device}: ${d.desc}`).join(' / ')}`);
      }
      if (config.characters?.length) {
        parts.push(`캐릭터: ${config.characters.map(c => c.name).join(', ')}`);
      }
      break;

    case 'writing':
      if (config.synopsis) parts.push(`시놉시스: ${config.synopsis.slice(0, 400)}`);
      if (config.episode) parts.push(`에피소드: ${config.episode}/${config.totalEpisodes}`);
      if (config.characters?.length) {
        parts.push(`캐릭터: ${config.characters.map(c => `${c.name}(${c.role})`).join(', ')}`);
      }
      if (config.setting) parts.push(`배경: ${config.setting}`);
      break;

    case 'style':
      if (config.synopsis) parts.push(`시놉시스: ${config.synopsis.slice(0, 150)}`);
      if (config.styleProfile) {
        const sp = config.styleProfile;
        const sliderKeys = Object.keys(sp.sliders || {});
        if (sliderKeys.length) {
          parts.push(`스타일 슬라이더: ${sliderKeys.map(k => `${k}=${sp.sliders[k]}`).join(', ')}`);
        }
        if (sp.selectedDNA?.length) parts.push(`선택된 DNA: ${sp.selectedDNA.join(', ')}`);
        if (sp.checkedSF?.length) parts.push(`SF 기법 체크: ${sp.checkedSF.length}개`);
        if (sp.checkedWeb?.length) parts.push(`웹소설 기법 체크: ${sp.checkedWeb.length}개`);
      }
      if (config.primaryEmotion) parts.push(`핵심 감정: ${config.primaryEmotion}`);
      break;

    default:
      if (config.synopsis) parts.push(`시놉시스: ${config.synopsis.slice(0, 300)}`);
  }

  return parts.length > 0 ? `\n\n[현재 프로젝트 컨텍스트]\n${parts.join('\n')}` : '';
}

// ============================================================
// PART 2 — Component
// ============================================================

const STORAGE_PREFIX = 'noa_tab_chat_';

const TabAssistant: React.FC<TabAssistantProps> = ({ tab, language, config, hostedProviders = {} }) => {
  const ctx = TAB_CONTEXT[tab];
  const lk: 'ko' | 'en' = (language === 'KO' || language === 'JP') ? 'ko' : 'en';
  const tl = createT(language);
  const backendLabel = useStudioBackendLabel(language, hostedProviders);

  // Check AI access: local key OR hosted provider
  // TODO: Ctrl+/ keyboard shortcut would be useful to toggle this assistant panel open/closed
  const hasAiKey = Boolean(getApiKey(getActiveProvider()) || hostedProviders[getActiveProvider()] || hasDgxService());

  const [messages, setMessages] = useState<TabMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${tab}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Persist messages
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${STORAGE_PREFIX}${tab}`, JSON.stringify(messages.slice(-HISTORY_LIMITS.STORAGE)));
  }, [messages, tab]);

  // Auto-scroll
  useEffect(() => {
    if (!collapsed) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, collapsed]);

  const handleSend = useCallback(async () => {
    if (!ctx) return;
    const text = input.trim();
    if (!text || isStreaming) return;

    if (!hasAiKey) {
      const errMsg: TabMessage = { id: `te-${Date.now()}`, role: 'assistant', content: tl('tabAssistant.apiKeyMissing') };
      setMessages(prev => [...prev, errMsg]);
      return;
    }

    const userMsg: TabMessage = { id: `tu-${Date.now()}`, role: 'user', content: text };
    const aiMsgId = `ta-${Date.now()}`;
    const aiMsg: TabMessage = { id: aiMsgId, role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const systemPrompt = (lk === 'ko' ? ctx.systemKo : ctx.systemEn) + buildContextSummary(config, tab);
    const recentMsgs: ChatMsg[] = messages.slice(-HISTORY_LIMITS.CHAT_API).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    const model = getActiveModel();
    const { messages: trimmedHistory } = truncateMessages(systemPrompt, recentMsgs, model);
    const chatHistory: ChatMsg[] = [...trimmedHistory, { role: 'user', content: text }];

    let fullContent = '';
    try {
      await streamChat({
        systemInstruction: systemPrompt,
        messages: chatHistory,
        temperature: ctx.temperature,
        signal: controller.signal,
        isChatMode: true,
        onChunk: (chunk) => {
          fullContent += chunk;
          const snapshot = fullContent;
          setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: snapshot } : m));
        },
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') { /* cancelled */ }
      else {
        const info = classifyError(err, language);
        const detail = info.action ? `\n\n💡 ${info.action}` : '';
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, content: `⚠️ ${info.title}\n${info.message}${detail}` } : m
        ));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, messages, config, tab, language, lk, ctx, tl, hasAiKey]);

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(`${STORAGE_PREFIX}${tab}`);
  };

  if (!ctx) return null;

  return (
    <div className="border border-border rounded-2xl bg-bg-secondary/50 overflow-hidden flex flex-col">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        aria-label="Toggle tab assistant"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-secondary/80 transition-colors"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-black uppercase tracking-widest text-accent-purple font-mono min-w-0 text-left">
          <span className="inline-flex items-center gap-2 shrink-0">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {ctx[lk]}
          </span>
          {backendLabel ? (
            <span className="text-[10px] font-mono font-bold text-text-tertiary normal-case tracking-normal truncate max-w-[min(100%,14rem)]" title={backendLabel}>
              · {backendLabel}
            </span>
          ) : null}
        </span>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <span className="text-xs text-text-tertiary font-mono">{messages.length} msg</span>
          )}
          {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" /> : <ChevronUp className="w-3.5 h-3.5 text-text-tertiary" />}
        </div>
      </button>

      {!collapsed && (
        <>
          {/* Messages */}
          <div className="max-h-60 sm:max-h-80 overflow-y-auto px-4 py-2 space-y-3 custom-scrollbar">
            {messages.length === 0 && (
              <div className="py-4 space-y-3">
                <p className="text-sm text-text-tertiary italic text-center">
                  {tl('tabAssistant.askAnything').replace('{name}', ctx[lk])}
                </p>
                {TAB_PRESETS[tab] && (
                  <div className="flex flex-wrap gap-1.5 justify-center px-2">
                    {TAB_PRESETS[tab].map((preset, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(preset[lk]); }}
                        className="px-3 py-1.5 bg-bg-tertiary/50 border border-border rounded-lg text-xs text-text-tertiary hover:text-accent-purple hover:border-accent-purple/50 transition-all font-mono leading-tight"
                      >
                        {preset[lk]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-bg-tertiary' : 'bg-accent-purple/20'
                }`}>
                  {msg.role === 'user' ? <User className="w-3 h-3 text-text-tertiary" /> : <Bot className="w-3 h-3 text-accent-purple" />}
                </div>
                <div className={`max-w-[90%] sm:max-w-[80%] px-3 py-2.5 rounded-xl text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-bg-tertiary/80 text-text-secondary' :
                  msg.content?.includes('NOA 보안 차단') ? 'bg-accent-red/10 text-accent-red border border-accent-red/30' :
                  'bg-transparent text-text-secondary'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content || (isStreaming ? '...' : '')}</p>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex items-end gap-2">
              {messages.length > 0 && (
                <button onClick={clearChat} aria-label={tl('tabAssistant.clearChat')} className="p-2 rounded-lg text-text-tertiary hover:text-accent-red hover:bg-bg-tertiary/50 transition-colors shrink-0" title={tl('tabAssistant.clearChat')}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.nativeEvent.isComposing || e.keyCode === 229) return; if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={!hasAiKey
                  ? tl('tabAssistant.apiKeyRequired')
                  : tl('tabAssistant.askQuestion')}
                maxLength={5000}
                className={`flex-1 bg-bg-tertiary/50 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-text-tertiary resize-none outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple/30 max-h-24 transition-colors ${!hasAiKey ? 'opacity-60' : ''}`}
                rows={1}
                disabled={isStreaming || !hasAiKey}
              />
              {isStreaming ? (
                <button onClick={handleCancel} aria-label="중단" className="p-2 rounded-xl bg-accent-red text-white shrink-0 hover:opacity-80 transition-opacity">
                  <StopCircle className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSend} disabled={!input.trim()} aria-label="전송" className={`p-2 rounded-xl shrink-0 transition-colors ${input.trim() ? 'bg-accent-purple text-white' : 'bg-bg-tertiary text-text-tertiary'}`}>
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TabAssistant;
