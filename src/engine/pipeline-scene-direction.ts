import type { AppLanguage, EntryOrigin, StoryConfig, TaggedField } from '../lib/studio-types';
import { createT } from '@/lib/i18n';
import { getOrigin, unwrap } from '@/lib/origin-migration';

const ORIGIN_TAG_LABELS: Record<EntryOrigin, string> = {
  USER: '[USER]',
  TEMPLATE: '[TEMPLATE]',
  ENGINE_SUGGEST: '[ENGINE_SUGGEST]',
  ENGINE_DRAFT: '[ENGINE_DRAFT]',
};

function describeField<T>(field: TaggedField<T> | T | undefined): { value: T | undefined; tag: string } {
  if (field === undefined || field === null) return { value: undefined, tag: '' };
  const value = unwrap(field as TaggedField<T>);
  const meta = getOrigin(field as TaggedField<T>);
  const refSuffix = meta.sourceReferenceId ? `:${meta.sourceReferenceId}` : '';
  const tag = `${ORIGIN_TAG_LABELS[meta.origin].slice(0, -1)}${refSuffix}]`;
  return { value, tag };
}

function buildOriginGuide(language: AppLanguage): string {
  const guides: Record<AppLanguage, string> = {
    KO: `[출처 태그 해석 규칙]
- [USER] 작가 직접 입력 — 우선 존중. 그대로 반영하라.
- [TEMPLATE] 시스템 기본값 — 덮어쓸 수 있음. 문맥에 맞으면 활용.
- [ENGINE_SUGGEST] 엔진 제안(작가 수락) — 참고 우선, 강요 금지.
- [ENGINE_DRAFT] 엔진 미확정 초안 — 그대로 따라 쓰지 말고 작가 의도 추정.`,
    EN: `[Origin Tag Interpretation Rules]
- [USER] Direct author input — highest priority. Reflect verbatim.
- [TEMPLATE] System defaults — may be overridden. Use if context fits.
- [ENGINE_SUGGEST] Engine suggestion (author-accepted) — reference, do not enforce.
- [ENGINE_DRAFT] Engine draft (unconfirmed) — do not follow blindly; infer author intent.`,
    JP: `[出典タグの解釈ルール]
- [USER] 作家直接入力 — 最優先。そのまま反映せよ。
- [TEMPLATE] システム既定値 — 上書き可。文脈に合えば活用。
- [ENGINE_SUGGEST] エンジン提案(作家承認) — 参考優先、強制禁止。
- [ENGINE_DRAFT] エンジン未確定草案 — 鵜呑みにせず作家意図を推定。`,
    CN: `[来源标签解读规则]
- [USER] 作家直接输入 — 最高优先。照实反映。
- [TEMPLATE] 系统默认值 — 可覆盖。若契合则使用。
- [ENGINE_SUGGEST] 引擎建议（作家已采纳）— 参考为主，不可强制。
- [ENGINE_DRAFT] 引擎未确定草案 — 切勿盲从，需推断作家意图。`,
  };
  return guides[language] ?? guides.KO;
}

export function buildSceneDirectionBlock(
  sceneDirection: StoryConfig['sceneDirection'],
  language: AppLanguage,
): string {
  if (!sceneDirection) return '';

  const translator = createT(language);
  const parts: string[] = [];
  let hasAnyContent = false;

  const sdAny = sceneDirection as Record<string, unknown>;
  type GogumaT = { type: 'goguma' | 'cider'; intensity: string; desc: string };
  type HookT = { position: string; hookType: string; desc: string };
  type EmoT = { emotion: string; intensity: number };
  type DToneT = { character: string; tone: string; notes: string };
  type DopT = { scale: string; device: string; desc: string };
  type CliffT = { cliffType: string; desc: string };
  type ForeT = { planted: string; payoff: string; episode: number; resolved: boolean };
  type PaceT = { section: string; percent: number; desc: string };
  type TenT = { position: number; level: number; label: string };
  type CanonT = { character: string; rule: string };
  type TransT = { fromScene: string; toScene: string; method: string };

  const goguma = sdAny.goguma as TaggedField<GogumaT>[] | undefined;
  if (goguma && goguma.length > 0) {
    parts.push(`[${translator('pipeline.tensionRhythm')}]`);
    goguma.forEach(raw => {
      const { value: item, tag } = describeField(raw);
      if (!item) return;
      parts.push(`  - ${tag} ${item.type === 'goguma' ? translator('pipeline.goguma') : translator('pipeline.cider')} (${item.intensity}): ${item.desc}`);
      hasAnyContent = true;
    });
  }

  const hooks = sdAny.hooks as TaggedField<HookT>[] | undefined;
  if (hooks && hooks.length > 0) {
    parts.push(`[${translator('pipeline.hookPlacement')}]`);
    hooks.forEach(raw => {
      const { value: item, tag } = describeField(raw);
      if (!item) return;
      parts.push(`  - ${tag} ${item.position}: ${item.hookType} — ${item.desc}`);
      hasAnyContent = true;
    });
  }

  const emotionTargets = sdAny.emotionTargets as TaggedField<EmoT>[] | undefined;
  if (emotionTargets && emotionTargets.length > 0) {
    parts.push(`[${translator('pipeline.emotionTargets')}]`);
    emotionTargets.forEach(raw => {
      const { value: item, tag } = describeField(raw);
      if (!item) return;
      parts.push(`  - ${tag} ${item.emotion}: ${translator('pipeline.intensity')} ${item.intensity}%`);
      hasAnyContent = true;
    });
  }

  const dialogueTones = sdAny.dialogueTones as TaggedField<DToneT>[] | undefined;
  if (dialogueTones && dialogueTones.length > 0) {
    parts.push(`[${translator('pipeline.dialogueToneRules')}]`);
    dialogueTones.forEach(raw => {
      const { value: item, tag } = describeField(raw);
      if (!item) return;
      parts.push(`  - ${tag} ${item.character}: ${item.tone}${item.notes ? ` (${item.notes})` : ''}`);
      hasAnyContent = true;
    });
  }

  const dopamineDevices = sdAny.dopamineDevices as TaggedField<DopT>[] | undefined;
  if (dopamineDevices && dopamineDevices.length > 0) {
    parts.push(`[${translator('pipeline.dopamineDevices')}]`);
    dopamineDevices.forEach(raw => {
      const { value: item, tag } = describeField(raw);
      if (!item) return;
      parts.push(`  - ${tag} [${item.scale}] ${item.device}: ${item.desc}`);
      hasAnyContent = true;
    });
  }

  const cliffhangerRaw = sdAny.cliffhanger as TaggedField<CliffT> | undefined;
  if (cliffhangerRaw) {
    const { value: item, tag } = describeField(cliffhangerRaw);
    if (item) {
      parts.push(`[${translator('pipeline.cliffhangerLabel')}] ${tag} ${translator('pipeline.cliffType')}: ${item.cliffType} — ${item.desc}`);
      hasAnyContent = true;
    }
  }

  const plotRaw = sdAny.plotStructure as TaggedField<string> | undefined;
  if (plotRaw) {
    const { value: item, tag } = describeField(plotRaw);
    if (item) {
      parts.push(`[${translator('pipeline.plotStructure')}] ${tag} ${item}`);
      hasAnyContent = true;
    }
  }

  const foreshadows = sdAny.foreshadows as TaggedField<ForeT>[] | undefined;
  if (foreshadows && foreshadows.length > 0) {
    parts.push(`[${translator('pipeline.foreshadowing')}]`);
    foreshadows.forEach(raw => {
      const { value: item, tag } = describeField(raw);
      if (!item) return;
      const status = item.resolved ? translator('pipeline.resolved') : translator('pipeline.pending');
      parts.push(`  - ${tag} EP${item.episode}: ${item.planted} → ${item.payoff} (${status})`);
      hasAnyContent = true;
    });
  }

  const pacings = sdAny.pacings as TaggedField<PaceT>[] | undefined;
  if (pacings && pacings.length > 0) {
    parts.push(`[${translator('pipeline.pacingSection')}]`);
    pacings.forEach(raw => {
      const { value: item, tag } = describeField(raw);
      if (!item) return;
      parts.push(`  - ${tag} ${item.section}: ${item.percent}% — ${item.desc}`);
      hasAnyContent = true;
    });
  }

  const tensionArr = sdAny.tensionCurve as TaggedField<TenT>[] | undefined;
  if (tensionArr && tensionArr.length > 0) {
    parts.push(`[${translator('pipeline.tensionCurve')}]`);
    tensionArr.forEach(raw => {
      const { value: item, tag } = describeField(raw);
      if (!item) return;
      parts.push(`  - ${tag} ${item.label}: ${translator('pipeline.position')} ${item.position}%, ${translator('pipeline.level')} ${item.level}%`);
      hasAnyContent = true;
    });
  }

  const canon = sdAny.canonRules as TaggedField<CanonT>[] | undefined;
  if (canon && canon.length > 0) {
    parts.push(`[${translator('pipeline.canonRules')}]`);
    canon.forEach(raw => {
      const { value: item, tag } = describeField(raw);
      if (!item) return;
      parts.push(`  - ${tag} ${item.character}: ${item.rule}`);
      hasAnyContent = true;
    });
  }

  const transitions = sdAny.sceneTransitions as TaggedField<TransT>[] | undefined;
  if (transitions && transitions.length > 0) {
    parts.push(`[${translator('pipeline.sceneTransitions')}]`);
    transitions.forEach(raw => {
      const { value: item, tag } = describeField(raw);
      if (!item) return;
      parts.push(`  - ${tag} ${item.fromScene} → ${item.toScene}: ${item.method}`);
      hasAnyContent = true;
    });
  }

  const notesRaw = sdAny.writerNotes as TaggedField<string> | undefined;
  if (notesRaw) {
    const { value: item, tag } = describeField(notesRaw);
    if (item) {
      parts.push(`[${translator('pipeline.writerNotes')}] ${tag} ${item}`);
      hasAnyContent = true;
    }
  }

  if (parts.length === 0 || !hasAnyContent) return '';
  return '\n[SCENE DIRECTION — 작품 연출]\n' + buildOriginGuide(language) + '\n' + parts.join('\n');
}
