import { resolveLocalizationMarketProfile, type LocalizationMarketProfile } from './localization-persona-registry';

export type LocalizationIssueCategory =
  | 'missing'
  | 'tone'
  | 'names'
  | 'honorific'
  | 'length'
  | 'platform'
  | 'culture'
  | 'dual-track'
  | 'ready';

export type LocalizationRecommendation = 'accept' | 'review' | 'hold';

export interface LocalizationIssueCard {
  id: string;
  category: LocalizationIssueCategory;
  recommendation: LocalizationRecommendation;
  koreanDecisionTitle: string;
  evidenceKo: string;
  originalIntentKo: string;
  suggestionKo: string;
  nuanceChangeKo: string;
  userCanJudgeWithoutTargetLanguage: true;
}

export interface LocalizationDecisionReport {
  profile: LocalizationMarketProfile;
  summaryKo: string;
  riskCount: number;
  cards: LocalizationIssueCard[];
}

interface BuildLocalizationDecisionReportArgs {
  source: string;
  result: string;
  targetLanguage: string;
  faithfulResult?: string;
  marketResult?: string;
  glossary?: Record<string, string>;
}

function hasHangul(value: string): boolean {
  return /[가-힣]/.test(value);
}

function hasJapanese(value: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
}

function hasLatin(value: string): boolean {
  return /[A-Za-z]/.test(value);
}

function lengthRatio(source: string, result: string): number {
  const sourceLength = Math.max(1, source.trim().length);
  return result.trim().length / sourceLength;
}

function excerpt(value: string, max = 90): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1)}…`;
}

function makeCard(
  id: string,
  category: LocalizationIssueCategory,
  recommendation: LocalizationRecommendation,
  koreanDecisionTitle: string,
  evidenceKo: string,
  originalIntentKo: string,
  suggestionKo: string,
  nuanceChangeKo: string,
): LocalizationIssueCard {
  return {
    id,
    category,
    recommendation,
    koreanDecisionTitle,
    evidenceKo,
    originalIntentKo,
    suggestionKo,
    nuanceChangeKo,
    userCanJudgeWithoutTargetLanguage: true,
  };
}

export function buildLocalizationDecisionReport({
  source,
  result,
  targetLanguage,
  faithfulResult,
  marketResult,
  glossary = {},
}: BuildLocalizationDecisionReportArgs): LocalizationDecisionReport {
  const profile = resolveLocalizationMarketProfile(targetLanguage);
  const cards: LocalizationIssueCard[] = [];
  const sourceText = source.trim();
  const resultText = (marketResult || result).trim();
  const faithfulText = faithfulResult?.trim() ?? '';
  const ratio = lengthRatio(sourceText, resultText);
  const target = targetLanguage.trim().toLowerCase();

  if (sourceText.length < 20 || resultText.length < 20) {
    cards.push(makeCard(
      'localization-not-ready',
      'missing',
      'hold',
      '판단할 원문과 번역문이 아직 부족합니다.',
      '원문 또는 번역문이 짧아 독자 관점의 흐름을 보기 어렵습니다.',
      '먼저 한 장면 또는 한 단락 이상을 놓고 판단해야 합니다.',
      '원문과 현지화안을 채운 뒤 다시 확인하세요.',
      '지금 판단하면 문장 하나의 취향 문제가 작품 톤 판단으로 과대 해석될 수 있습니다.',
    ));
  }

  if (sourceText.length >= 20 && resultText.length >= 20 && ratio < 0.65) {
    cards.push(makeCard(
      'localization-short-result',
      'missing',
      'hold',
      '번역문이 원문에 비해 너무 짧습니다.',
      `분량 비율이 약 ${Math.round(ratio * 100)}%입니다. 일부 정보가 빠졌을 수 있습니다.`,
      '원문의 사건, 관계, 감정 단서가 충분히 옮겨졌는지 확인해야 합니다.',
      '누락 의심 단락을 먼저 대조하고, 줄거리·감정·고유명사를 우선 보강하세요.',
      '짧게 다듬는 과정에서 속도감은 좋아질 수 있지만 복선이나 관계 압력이 약해질 수 있습니다.',
    ));
  }

  if (sourceText.length >= 20 && resultText.length >= 20 && ratio > 2.1) {
    cards.push(makeCard(
      'localization-long-result',
      'length',
      'review',
      '번역문 설명량이 원문보다 크게 늘었습니다.',
      `분량 비율이 약 ${Math.round(ratio * 100)}%입니다.`,
      '원문이 빠르게 넘기는 장면이라면 설명이 늘어난 만큼 장면 속도가 느려질 수 있습니다.',
      '설명으로 풀린 문장을 대사, 행동, 짧은 문장으로 나눌지 검토하세요.',
      '이해도는 올라가지만 장르 독자가 기대하는 속도감은 떨어질 수 있습니다.',
    ));
  }

  if ((target === 'en' || target === 'en-us' || target === 'en-sea') && hasHangul(resultText)) {
    cards.push(makeCard(
      'localization-hangul-left-in-english',
      'names',
      'review',
      '영문 결과 안에 한글이 남아 있습니다.',
      `남은 한글 예시: ${excerpt(resultText.match(/[가-힣][가-힣\s]{0,24}/)?.[0] ?? resultText)}`,
      '이름이나 고유명사를 일부러 남긴 것인지, 옮기지 못한 것인지 구분해야 합니다.',
      '고유명사 표기표에 남길 항목과 번역할 항목을 나눠 정하세요.',
      '고유명사를 살리면 정체성이 유지되지만, 설명 없는 한글은 독자 진입을 막을 수 있습니다.',
    ));
  }

  if ((target === 'ja' || target === 'jp' || target === 'japanese') && !hasJapanese(resultText)) {
    cards.push(makeCard(
      'localization-japanese-script-missing',
      'platform',
      'hold',
      '일본어권 결과로 보기 어렵습니다.',
      '일본어 문자나 한자권 문장 구성이 거의 보이지 않습니다.',
      '일본어 출고용이라면 문장 표기부터 다시 확인해야 합니다.',
      '대상 언어 설정과 실제 결과 언어가 맞는지 먼저 확인하세요.',
      '언어 설정이 어긋나면 이후 품질 점검도 잘못된 기준으로 진행됩니다.',
    ));
  }

  if ((target === 'ko' || target === 'kr') && hasLatin(resultText) && resultText.length > 80) {
    cards.push(makeCard(
      'localization-korean-foreign-heavy',
      'culture',
      'review',
      '한국어 결과에 외국어 표현이 많이 남아 있습니다.',
      '본문 안에 영문 단어가 길게 남아 독서 흐름을 끊을 수 있습니다.',
      '고유명사인지, 번역되지 않은 설명인지 구분해야 합니다.',
      '작품 고유어는 표기표에 남기고, 설명문은 한국어 문장으로 정리하세요.',
      '세계관 느낌은 유지되지만 독자의 첫 이해 속도는 떨어질 수 있습니다.',
    ));
  }

  const glossaryMisses = Object.entries(glossary)
    .filter(([sourceTerm, targetTerm]) => sourceTerm.trim() && targetTerm.trim())
    .filter(([, targetTerm]) => !resultText.includes(targetTerm.trim()))
    .slice(0, 3);

  if (glossaryMisses.length > 0) {
    cards.push(makeCard(
      'localization-glossary-miss',
      'names',
      'review',
      '용어집 표기와 다른 부분이 있을 수 있습니다.',
      glossaryMisses.map(([src, tgt]) => `${src} → ${tgt}`).join(' / '),
      '이름, 지명, 기술명은 한 번 흔들리면 뒤 회차의 신뢰도가 떨어집니다.',
      '용어집 표기를 우선 적용하고, 일부러 바꾼 경우에는 예외 메모를 남기세요.',
      '표기를 맞추면 안정감은 올라가지만 현지 독자에게 더 자연스러운 별칭이 사라질 수 있습니다.',
    ));
  }

  if (faithfulText && resultText && faithfulText === resultText) {
    cards.push(makeCard(
      'localization-dual-track-same',
      'dual-track',
      'review',
      '보존안과 현지화안의 차이가 거의 없습니다.',
      '두 안의 문장이 같습니다.',
      '보존안은 원문 의도 보관, 현지화안은 독자 반응을 위한 조정이라는 역할이 다릅니다.',
      '현지화안에서 호칭, 문장 길이, 문화 설명, 대사 리듬 중 하나는 의식적으로 검토하세요.',
      '차이를 만들면 현지 독자 친화성은 올라가지만 원문 특유의 낯선 맛은 줄 수 있습니다.',
    ));
  }

  if (cards.length === 0) {
    cards.push(makeCard(
      'localization-ready',
      'ready',
      'accept',
      '현재 결과는 현지 판단 카드 기준에서 큰 걸림돌이 적습니다.',
      `${profile.labelKo} 관점에서 분량, 표기, 두 안의 역할을 빠르게 확인했습니다.`,
      '원문의 핵심 정보와 독자 흐름이 대체로 함께 유지된 상태로 보입니다.',
      '출고 전에는 플랫폼별 금칙어, 제목 표기, 고유명사 표기표만 마지막으로 확인하세요.',
      '지금 상태를 유지하면 안정적이지만, 장르 독자의 더 강한 반응을 노리려면 대사 리듬은 한 번 더 다듬을 수 있습니다.',
    ));
  }

  const riskCount = cards.filter((card) => card.recommendation !== 'accept').length;
  const summaryKo = riskCount > 0
    ? `${profile.labelKo} 관점에서 ${riskCount}개 판단 지점을 찾았습니다.`
    : `${profile.labelKo} 관점에서 큰 걸림돌은 적습니다.`;

  return {
    profile,
    summaryKo,
    riskCount,
    cards,
  };
}
