// ============================================================
// Platform Builder — 연재 플랫폼별 프롬프트 규칙 생성
// pipeline.ts에서 추출
// ============================================================

import { PublishPlatform, PLATFORM_PRESETS } from '../types';
import type { AppLanguage } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';

export function buildPublishPlatformBlock(publishPlatform: PublishPlatform | undefined, language: AppLanguage): string {
  if (!publishPlatform || publishPlatform === PublishPlatform.NONE) return '';
  const preset = PLATFORM_PRESETS[publishPlatform];
  if (!preset) return '';

  const isKO = language === 'KO';
  const t = createT(language);

  const platformNames: Record<string, string> = {
    MUNPIA: '문피아',
    NOVELPIA: '노벨피아',
    KAKAOPAGE: '카카오페이지',
    SERIES: '시리즈',
  };
  const name = platformNames[publishPlatform] || publishPlatform;

  const parts = [
    `[${t('pipeline.publishPlatform')}: ${name}]`,
    `- ${t('pipeline.targetReader')}: ${preset.targetReader}`,
    `- ${t('pipeline.billingModel')}: ${preset.billingModel}`,
    `- ${t('pipeline.recommendedLength')}: ${preset.episodeLength.min.toLocaleString()}~${preset.episodeLength.max.toLocaleString()}${isKO ? '자' : ' chars'}`,
    `- ${t('pipeline.pacePace')}: ${preset.pace}`,
    `- ${t('pipeline.endingHookStrength')}: ${preset.endingHook}`,
    `- ${t('pipeline.worldComplexityLabel')}: ${preset.worldComplexity}`,
  ];

  if (publishPlatform === 'MUNPIA') {
    parts.push(
      `[문피아 특화 규칙]`,
      `- 편당결제 구조: 매화 100원의 가치를 증명해야 한다. 늘여쓰기 금지.`,
      `- 투베(투데이베스트) 의식: 1화부터 강한 훅으로 조회수 확보.`,
      `- 대화 비율 높게, 내면 독백은 짧고 강렬하게.`,
      `- 에피소드 끝은 반드시 다음 화 결제를 유도하는 클리프행어.`,
    );
  } else if (publishPlatform === 'NOVELPIA') {
    parts.push(
      `[노벨피아 특화 규칙]`,
      `- 짧은 분량, 빠른 전개. 2000~4000자로 밀도 높게.`,
      `- 라노벨/서브컬쳐 감성 허용. 독자층이 젊음.`,
      `- 무거운 세계관 설명은 최소화. 액션·감정 위주.`,
    );
  } else if (publishPlatform === 'KAKAOPAGE') {
    parts.push(
      `[카카오페이지 특화 규칙]`,
      `- 기다리면 무료 구조: 매화 끝에 강한 훅이 필수 (다음 화를 기다리지 않고 결제하게).`,
      `- 성인 콘텐츠 불가. 전 연령 대상 톤 유지.`,
      `- 빠른 전개, 짧은 단락. 모바일 최적화 필수.`,
    );
  } else if (publishPlatform === 'SERIES') {
    parts.push(
      `[시리즈 특화 규칙]`,
      `- 완결작 선호 플랫폼. 전체 구조의 완성도를 의식할 것.`,
      `- 감정선의 일관성 중요. 급격한 톤 변화 지양.`,
      `- 메인스트림 독자 대상. 지나치게 마니아적인 설정 자제.`,
    );
  } else if (publishPlatform === 'ROYAL_ROAD') {
    parts.push(
      `[Royal Road Rules]`,
      `- LitRPG/Progression Fantasy core audience. System mechanics and stats welcome.`,
      `- Long chapters preferred (2000-4000 words). Readers expect substance.`,
      `- Free with Patreon model. Build reader loyalty through consistent quality.`,
      `- Community-driven: author notes and reader interaction matter.`,
    );
  } else if (publishPlatform === 'WEBNOVEL') {
    parts.push(
      `[Webnovel Rules]`,
      `- Global audience, translated fiction norms. Clear, punchy prose.`,
      `- Spirit stone unlock model: every chapter must justify the unlock.`,
      `- Strong cliffhangers mandatory. Readers decide per-chapter.`,
      `- No explicit adult content. Keep it clean but exciting.`,
    );
  } else if (publishPlatform === 'KINDLE_VELLA') {
    parts.push(
      `[Kindle Vella Rules]`,
      `- Token-per-episode model. Short, punchy episodes (600-5000 words).`,
      `- Romance and thriller dominate. Hook in first 3 sentences.`,
      `- Episode 1-3 are free: make them count for retention.`,
      `- Amazon audience expects polished, edited prose.`,
    );
  } else if (publishPlatform === 'WATTPAD') {
    parts.push(
      `[Wattpad Rules]`,
      `- Young adult audience (13-25). Conversational, accessible tone.`,
      `- Short chapters (1500-3000 words). Mobile-first reading experience.`,
      `- High dialogue ratio (40%+). Internal monologue drives engagement.`,
      `- Tags and description matter for discovery. Genre conventions expected.`,
    );
  } else if (publishPlatform === 'KAKUYOMU') {
    parts.push(
      `[カクヨム特化ルール]`,
      `- ラノベ・文芸読者向け。ジャンルの王道を押さえつつ個性を出す。`,
      `- 1話3,000～6,000字。テンポよく読ませる構成。`,
      `- リワード広告モデル。PV数が収益に直結するため、連載ペースと更新頻度が重要。`,
      `- コンテスト文化が強い。受賞狙いなら完成度重視。`,
    );
  } else if (publishPlatform === 'NAROU') {
    parts.push(
      `[小説家になろう特化ルール]`,
      `- 異世界転生・転移が圧倒的主流。ジャンルコードを守ること。`,
      `- 1話2,000～5,000字。毎日更新が理想。`,
      `- 書籍化への登竜門。ランキング入りが出版社の目に留まる条件。`,
      `- テンプレを踏まえた上での差別化がカギ。`,
    );
  } else if (publishPlatform === 'ALPHAPOLIS') {
    parts.push(
      `[アルファポリス特化ルール]`,
      `- ファンタジー・恋愛が主力。書籍化スカウト制度あり。`,
      `- 1話3,000～6,000字。安定した更新ペースが評価される。`,
      `- 投稿インセンティブ制度あり。スコア蓄積で報酬。`,
      `- 完結作品を好む傾向。構成力が問われる。`,
    );
  } else if (publishPlatform === 'QIDIAN') {
    parts.push(
      `[起点中文网特化规则]`,
      `- 男频玄幻/都市/仙侠为主。节奏快，爽点密集。`,
      `- 每章3,000～5,000字。日更两章以上为佳。`,
      `- VIP章节付费模式。每章结尾必须有强钩子，读者按章付费。`,
      `- 开头三章决定生死。追读率是核心指标。`,
    );
  } else if (publishPlatform === 'JJWXC') {
    parts.push(
      `[晋江文学城特化规则]`,
      `- 女频言情/古言/现代为主。感情线是核心驱动力。`,
      `- 每章3,000～6,000字。情感节奏要细腻。`,
      `- VIP付费模式。读者对感情戏质量要求极高。`,
      `- 榜单文化浓厚。积分和收藏数决定曝光。`,
    );
  } else if (publishPlatform === 'FANQIE') {
    parts.push(
      `[番茄小说特化规则]`,
      `- 免费阅读+广告模式。全年龄向，下沉市场。`,
      `- 每章2,000～4,000字。节奏极快，不拖沓。`,
      `- 完读率是核心。每章必须有进展，禁止灌水。`,
      `- 开篇黄金三章定生死。第一章就要抓住读者。`,
    );
  }

  return '\n' + parts.join('\n');
}

