// ============================================================
// context-block — 세계관~연출 확정 항목 → AI 프롬프트 풀텍스트 빌더
// + 직전 본문 약점(휴리스틱) → 개선 지시 retry hint 빌더.
// 순수 함수. 절대금지 8파일 import 0.
// ============================================================

import { analyzeRevision } from './revision-analysis';
import { scanAISignature } from '@/lib/creative/ai-signature-scan';
import { foreshadowHealth, scanForeshadows } from '@/lib/creative/foreshadow-tracker';
import { auditManuscript, auditVerdict } from '@/lib/creative/qa-auditor';
import { observeStyle } from '@/lib/creative/style-profile';
import { panelReaction } from '@/lib/creative/reader-persona-16';
import { buildAgentSystemPrompt, type AgentContext } from '@/lib/ai/writing-agent-registry';
import { buildAppBrainDecisionDirective, decideAppBrain } from '@/lib/noa/app-brain-policy';
import { buildTabExpertSystemDirective } from '@/lib/noa/tab-expert-registry';

export interface ContextItem {
  tab: string;
  label: string;
  /** 한 줄 요약(목록 표시용). */
  fact: string;
  /** 도메인 폼 전체 필드 또는 worldgraph bodyRaw 평탄화 — AI 프롬프트 주입용 풀텍스트. */
  details: string;
}

/** 탭별 그룹화된 풀텍스트 컨텍스트 블록 (AI 프롬프트 주입용). */
export function buildContextBlock(items: ContextItem[]): string {
  if (items.length === 0) return '(아직 없음)';
  const byTab = new Map<string, ContextItem[]>();
  for (const it of items) {
    const arr = byTab.get(it.label) ?? [];
    arr.push(it);
    byTab.set(it.label, arr);
  }
  const sections: string[] = [];
  for (const [label, arr] of byTab) {
    sections.push(`### ${label} (${arr.length}건)`);
    arr.forEach((it, i) => {
      sections.push(arr.length > 1 ? `[${i + 1}] ${it.fact}` : it.fact);
      if (it.details && it.details !== it.fact) sections.push(it.details);
    });
  }
  return sections.join('\n');
}

/** 직전 본문 약점 → 다음 생성 retry hint. 본문 없으면 빈 문자열.
 *  11 lib-ready 모듈 중 본문에서 자동 도출 가능한 8종 흡수:
 *  revision-analysis(05)·ai-signature(05)·foreshadow(05)·qa-auditor(08/01)·style-profile(05)·reader-persona-16(01).
 */
export function buildRetryHint(manuscript: string): string {
  if (!manuscript || !manuscript.trim()) return '';
  const r = analyzeRevision(manuscript);
  const sig = scanAISignature(manuscript);
  const fore = foreshadowHealth(scanForeshadows(manuscript));
  const audit = auditManuscript(manuscript);
  const verdict = auditVerdict(audit);
  const style = observeStyle(manuscript);
  const panel = panelReaction(manuscript);
  const hints: string[] = [];

  // 기본 5지표 (revision-analysis)
  if (r.tellPct >= 25) hints.push(`설명형(tell) ${r.tellPct}% — show 위주로 전환`);
  if (r.repetitionPct >= 35) hints.push(`반복어 ${r.repetitionPct}% — 동의어·재구성`);
  if (r.chars >= 300 && r.sentenceVariety < 25) hints.push(`문장 단조(다양성 ${r.sentenceVariety}) — 장단 리듬 섞기`);
  if (r.dialoguePct < 10 && r.chars >= 500) hints.push(`대사 ${r.dialoguePct}% — 대사 보강`);
  if (r.artifacts.length) hints.push(`출고 부적합 잔여: ${r.artifacts.join(', ')} — 제거`);

  // 표현 습관 (05_집필)
  if (sig.score >= 40 && sig.hits.length) {
    hints.push(`어색한 표현 후보: ${sig.hits.slice(0, 3).map((h) => h.pattern).join(', ')} — 해당 표현은 줄이기`);
  }

  // 복선 5-state (05_집필 chg_156)
  if (fore.unresolved > 0) hints.push(`미회수 복선 ${fore.unresolved}/${fore.total} — 회수 또는 새 떡밥 회피`);

  // QA 감사원 A/B/C/D 비수렴 (08·01 chg_151) — high 결함만 prompt에 반영(잡음 제거)
  if (r.chars >= 200) {
    const QA_LABEL: Record<string, string> = { consistency: 'A 정합', outsider: 'B 외부독자', refuter: 'C 반증', structure: 'D 구조' };
    const highIssues = audit.filter((f) => f.severity === 'high').slice(0, 3);
    if (highIssues.length > 0) {
      hints.push(`QA 감사원 결함: ${highIssues.map((f) => `[${QA_LABEL[f.perspective] ?? f.perspective}] ${f.issue}`).join(' / ')}`);
    } else if (!verdict.passed) {
      hints.push('QA 감사원 보류 — 정합·외부독자·반증·구조 4관점 점검');
    }
  }

  // 문체 관측 (05 chg_169 집필전 문체제작)
  if (r.chars >= 300 && style.rhythmVariety > 0 && style.rhythmVariety < 30) {
    hints.push(`문체 다양성 ${style.rhythmVariety} 부족 — 짧은 문장·긴 문장 혼합`);
  }

  // 16 페르소나 독자 패널 (01 chg_133)
  if (r.chars >= 300 && panel.avgEngagement < 50) {
    hints.push(`독자 패널 평균 몰입 ${panel.avgEngagement}/100 — 훅·결제 후크 보강`);
  }
  if (r.chars >= 500 && panel.dropoutCount > 4) {
    hints.push(`16 페르소나 중 ${panel.dropoutCount}명 이탈 위험 — 도입 속도·정보 게이트 조정`);
  }

  if (hints.length === 0) return '';
  return `[개선 지시 — 직전 본문 약점]\n${hints.map((h) => `· ${h}`).join('\n')}`;
}

/** AI 집필 시스템 프롬프트 — 가드(영어 사고 누설 금지·컨텍스트 준수). */
export const AI_WRITE_SYSTEM = [
  '너는 한국 웹소설 작가다. 출력 규칙:',
  '- 한국어 본문만. 영어 "Thinking…"/메타 사고 누설 금지.',
  '- 설명·번호·머리말 없이 본문 산문만.',
  '- 아래 [컨텍스트]는 세계관·캐릭터·씬시트·연출의 **확정된 설정**이다. 무시·왜곡·새 사실 발명 금지.',
  '- [장면 지시]의 의도 우선, 그 안에서 [컨텍스트]를 반영하라.',
  '- [개선 지시]가 있으면 다음 본문에서 그 약점을 교정한다.',
].join('\n');

type AgentContextSlot = Exclude<keyof AgentContext, 'language' | 'extraDirectives'>;

function contextSlotForItem(item: ContextItem): AgentContextSlot {
  const label = `${item.label} ${item.tab}`;
  if (label.includes('캐릭터')) return 'character-dna';
  if (label.includes('씬시트')) return 'scene-sheet';
  if (label.includes('연출')) return 'act-guide';
  if (label.includes('세계관') || label.includes('아이템')) return 'world-book';
  if (label.includes('장르')) return 'genre-rules';
  if (label.includes('문체') || label.includes('외부 기법')) return 'style-dna';
  if (label.includes('이전 화')) return 'story-summary';
  if (label.includes('시나리오') || label.includes('구성') || label.includes('선택 영역')) return 'story-summary';
  return 'story-summary';
}

/** contextItems → writing-agent-registry AgentContext 매핑.
 *  기준선 라벨 패턴을 registry 슬롯으로 묶어 character-dna / world-book / scene-sheet / act-guide 등에 주입.
 */
export function contextItemsToAgentContext(items: ContextItem[]): AgentContext {
  const groups: Partial<Record<AgentContextSlot, string[]>> = {};
  for (const it of items) {
    const slot = contextSlotForItem(it);
    const arr = groups[slot] ?? [];
    arr.push(it.details && it.details !== it.fact ? `${it.fact}\n${it.details}` : it.fact);
    groups[slot] = arr;
  }
  const join = (slot: AgentContextSlot): string | undefined => {
    const arr = groups[slot];
    return arr && arr.length ? arr.join('\n\n') : undefined;
  };
  return {
    language: 'ko',
    'world-book': join('world-book'),
    'character-dna': join('character-dna'),
    'scene-sheet': join('scene-sheet'),
    'act-guide': join('act-guide'),
    'story-summary': join('story-summary'),
    'genre-rules': join('genre-rules'),
    'style-dna': join('style-dna'),
  };
}

/** 풀 AI 집필 프롬프트 조립.
 *  useAgentRegistry: true 시 writing-agent-registry 'studio-draft' 의
 *  통합 시스템 프롬프트(가드 6·contextBlock 11·4언어 LANG_DIRECTIVE)를 시스템 자리에 주입.
 *  false(기본) 시 AI_WRITE_SYSTEM 사용 — 가벼움, 의존성 0.
 */
export function buildAIWritePrompt(params: {
  contextItems: ContextItem[];
  scene: string;
  manuscript: string;
  genrePrefix?: string;
  useAgentRegistry?: boolean;
}): string {
  const ctx = buildContextBlock(params.contextItems);
  const retry = buildRetryHint(params.manuscript);
  const prior = params.manuscript.trim() ? `[직전 본문 — 자연스럽게 이어쓰기]\n${params.manuscript.slice(-1200)}\n\n` : '';
  const g = params.genrePrefix ? `${params.genrePrefix}\n\n` : '';
  const appBrainDecision = decideAppBrain({
    actionKind: 'noa_suggestion',
    tabId: 'writing',
    approxChars: params.scene.length + Math.min(params.manuscript.length, 1_200),
    scores: {
      intentClarity: params.scene.trim().length < 12 ? 0.42 : 0.76,
      contextFit: params.contextItems.length > 0 ? 0.74 : 0.44,
      evidenceFit: params.contextItems.length > 0 ? 0.7 : 0.46,
      userControl: 0.82,
      reversibility: 0.72,
      expertConfidence: 0.68,
      userIntentUnclear: params.scene.trim().length < 12 ? 0.62 : 0.24,
    },
  });
  const appBrainDirective = [
    buildTabExpertSystemDirective('writing', 'KO'),
    buildAppBrainDecisionDirective(appBrainDecision),
  ].join('\n\n');
  // 시스템 프롬프트 선택: registry 통합 또는 기본 가드.
  const system = [
    params.useAgentRegistry
      ? buildAgentSystemPrompt('studio-draft', contextItemsToAgentContext(params.contextItems))
      : AI_WRITE_SYSTEM,
    appBrainDirective,
  ].join('\n\n');
  // registry 모드에선 컨텍스트가 시스템에 이미 주입되었으므로 [컨텍스트] 섹션 생략(중복 방지).
  const ctxSection = params.useAgentRegistry ? '' : `[컨텍스트]\n${ctx}\n\n`;
  return `${system}\n${g}${ctxSection}${retry ? retry + '\n\n' : ''}${prior}[장면 지시]\n${params.scene}\n\n[본문]`;
}
