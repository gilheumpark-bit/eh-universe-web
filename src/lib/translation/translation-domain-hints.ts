/**
 * translation-domain-hints.ts (2026-05-10 신설 — P-04 수리)
 *
 * 번역 Stage 4 (Market track Cultural Immersion) 의 도메인 정형 hint 매트릭스.
 *
 * 배경:
 *   - creative-domain-prompts/ 의 4 도메인 매트릭스는 창작 구조화 생성 전용
 *   - 번역 시장에는 별도 정형 hint 필요 — 회차 끝 hook / 페이싱 / 클리셰
 *   - Stage 4 가 cultural immersion 핵심이나 현재 도메인 hint 미주입
 *
 * 매트릭스 구조:
 *   - 4 target market (ko / en / ja / zh) 별 핵심 정형
 *   - source 가 target 과 다를 때 추가 override hint (시장 적응 강화)
 *
 * 사용 패턴:
 *   const hint = getTranslationDomainHint(from, to);
 *   // build-prompt.ts stage 4 (market track) 에서 baseInstructions 에 prepend
 *
 * [C] 안전성: 비표준 lang 입력 fallback (target='ko')
 * [G] 성능: O(1) Record lookup
 * [K] 간결성: 4 market profile + source-aware override + 단일 빌더
 */

// ============================================================
// PART 1 — Target market 핵심 정형
// ============================================================

export type TranslationMarket = 'ko' | 'en' | 'ja' | 'zh';

/**
 * target market 별 핵심 정형 (LLM hint, 번역 Stage 4 Market track).
 * 각 시장이 native reader 에게 익숙한 회차 구조·hook·페이싱.
 */
const MARKET_PROFILES: Record<TranslationMarket, string> = {
  ko: `[Korean web-novel market]
- Chapter end MUST hook with a cliffhanger (회차 끝 강한 hook): boss appearance / revelation / confession / cliff-jump.
- Goguma-cider cycle (고구마/사이다): build tension (frustration) then release with the protagonist's decisive win.
- Fast pacing: short paragraphs, dialogue-heavy, scene transitions every 200-400 chars.
- Status windows / awakening / regression triggers — keep them visible if present.
- Honorifics: 형/오빠/누나/언니/씨/님 — calibrate by relationship distance.`,

  en: `[Western fantasy/general English fiction market]
- Chapter rhythm: setup → inciting incident → midpoint reversal → climax → cliffhanger.
- Stronger interior monologue. Show character thought process between actions.
- Less status-window / system-game language; prefer descriptive prose.
- Dialogue tags varied (said/replied/whispered) — avoid 200 consecutive "said".
- Idioms: convert Eastern to Western equivalents only when context demands; keep proper nouns.`,

  ja: `[Japanese light-novel market]
- 章末は引き (chapter-end hook): 必殺技発動 / 敵登場 / ヒロイン告白 / ステータス画面.
- バトル時はオノマトペ・効果音 (ドオン!/ガキィン!) を活用.
- 短い段落・会話多め・地の文は適度に. 異世界転生系はステータス画面風表記が自然.
- 敬称 (さん・くん・ちゃん・様・先輩) を関係性に合わせて使い分け.
- 章の引きは "次回、〇〇――!?" 形式で煽る場合あり.`,

  zh: `[Chinese xianxia/xuanhuan/online-novel market]
- 章末必有钩子 (chapter-end hook): 突破境界 / 强敌登场 / 道侣表白 / 法宝出世.
- 战斗描写: 招式名 + 灵气流转 + 决定性时刻的顿悟.
- 修真境界、宗门规矩、灵根属性 — 文中自然出现.
- 称呼: 道友、师兄、师姐、前辈、晚辈 — 根据辈分使用.
- 节奏: 段落短促, 对话多, 场景切换频繁, 每章伏笔回收 1-2 个.`,
};

// ============================================================
// PART 2 — Source-target 조합별 추가 override
// ============================================================

/**
 * source 가 target 과 다를 때 추가 override hint.
 * 원작 시장의 정형이 target 시장에 자연스럽게 흡수되도록 변환 가이드.
 * 모든 16 조합을 정의하지 않고, 영향이 큰 8 조합만 명시. 나머지는 빈 string.
 */
const SOURCE_OVERRIDES: Partial<Record<`${TranslationMarket}->${TranslationMarket}`, string>> = {
  // KO → 다른 시장
  'ko->en': `\n[Source: Korean web-novel] Convert 회차 hook → Western chapter cliffhanger. Soften status-window text into descriptive prose. Keep Korean honorifics minimally if culturally critical.`,
  'ko->ja': `\n[Source: Korean web-novel] Korean web-novel hooks → Japanese 引き. Status window 표기 → ステータス画面. Korean honorifics → Japanese 敬称 (형 → 先輩 / 오빠 → お兄さん).`,
  'ko->zh': `\n[Source: Korean web-novel] Korean web-novel hooks → 中文 章末钩子. Status window → 修真状态 / 系统提示. Korean honorifics → 中文称呼 (형 → 师兄 / 오빠 → 哥哥).`,

  // JA → 다른 시장
  'ja->ko': `\n[Source: Japanese light novel] 異世界転生·チート 정형은 한국 웹소설 헌터물 정형으로 자연스럽게 변환. 必殺技 → 궁극기. 敬称 → 한국 호칭.`,
  'ja->en': `\n[Source: Japanese light novel] Soften ライトノベル onomatopoeia. Convert 必殺技 names to evocative English (e.g. "Crimson Strike"). Honorifics → first names or "Sir/Lord" only when status matters.`,
  'ja->zh': `\n[Source: Japanese light novel] 异世界转生·必杀技 → 中文修真·神通. 敬称 → 中文称呼. ステータス画面 → 系统面板.`,

  // EN → 다른 시장
  'en->ko': `\n[Source: Western fiction] 서양식 chapter cliffhanger 를 한국 웹소설 회차 hook 으로 강화. 내면 독백을 약간 압축. 한국 독자 페이싱 (200~400자 단락).`,
  'en->ja': `\n[Source: Western fiction] 西洋的章末を日本ライトノベル風の引きに強化. 内面独白を会話多めに. ステータス画面・スキル表記を世界観に合えば追加可.`,

  // ZH → 다른 시장 (xianxia 정형 변환)
  'zh->ko': `\n[Source: Chinese xianxia] 修真境界·法宝 정형 → 한국 무협물 정형 (화경/현경 + 신물). 道侣 → 정인. 师兄 → 사형.`,
  'zh->ja': `\n[Source: Chinese xianxia] 修真境界 → 日本ファンタジー的修行体系. 法宝 → 神器. 道侣 → 婚約者/伴侶. 师兄 → 兄弟子.`,
  'zh->en': `\n[Source: Chinese xianxia] Translate 修真境界 with footnote-style consistency (e.g. "Foundation-Building stage"). Keep 道 / 仙 / 法宝 with explanatory adjective. Honorifics → "Senior/Junior + brother/sister".`,
};

// ============================================================
// PART 3 — Builder
// ============================================================

function normalizeLang(code: string): TranslationMarket {
  const u = (code || '').toLowerCase();
  if (u.startsWith('ko') || u.startsWith('kr')) return 'ko';
  if (u.startsWith('ja') || u.startsWith('jp')) return 'ja';
  if (u.startsWith('zh') || u.startsWith('cn') || u.startsWith('tw')) return 'zh';
  return 'en';
}

/**
 * source/target 언어로 도메인 hint 조립.
 * @returns LLM hint string. Stage 4 (Market track) baseInstructions 에 append.
 */
export function getTranslationDomainHint(from: string, to: string): string {
  const target = normalizeLang(to);
  const source = normalizeLang(from);

  const baseProfile = MARKET_PROFILES[target];
  if (source === target) {
    // 같은 시장 내 변형 (예: 한국어 → 한국어 사투리). 추가 override 없음.
    return baseProfile;
  }

  const overrideKey = `${source}->${target}` as `${TranslationMarket}->${TranslationMarket}`;
  const override = SOURCE_OVERRIDES[overrideKey] ?? '';
  return baseProfile + override;
}

/** 마켓 ID 만 반환 (호출 측이 분기용으로 사용 가능). */
export function getMarketFor(to: string): TranslationMarket {
  return normalizeLang(to);
}
