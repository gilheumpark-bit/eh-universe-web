/**
 * M5 Genre Translation Layer — AI system prompt addendum per genre.
 *
 * 4개 장르(novel/webtoon/drama/game) × 4개 언어(ko/en/ja/zh) 시스템 프롬프트.
 * buildSystemInstruction()에 **추가** (replace 아님) 되어 기본 프롬프트 뒤에
 * 포맷 가이드로 연결된다.
 *
 * 설계 원칙:
 *   - novel: 기존 산문 프롬프트가 정답 — 빈 문자열(no-op) 반환.
 *   - webtoon: [Panel N: 묘사/대사] 포맷, 4-6 패널, 마지막 훅.
 *   - drama: 스크린플레이 (INT./EXT. LOCATION - TIME), 3인칭 현재형,
 *            내적독백 금지.
 *   - game: 선택지 분기 [A]/[B], 상태 플래그 {flag:value}, 결과 힌트.
 *
 * 반환 문자열은 이미 빈 줄을 선행하므로 pipeline.ts에서 그대로 이어붙이면 된다.
 */

// ============================================================
// PART 1 — Types
// ============================================================

export type GenreMode = 'novel' | 'webtoon' | 'drama' | 'game';
export type PromptLang = 'ko' | 'en' | 'ja' | 'zh';

// ============================================================
// PART 2 — Prompt templates
// ============================================================
// 각 템플릿은 "\n[HEADER]\n..." 형태로 시작하여, 기존 시스템 프롬프트
// 뒤에 단순 concatenation 으로 덧붙일 수 있도록 설계되었다.

const NOVEL_PROMPTS: Record<PromptLang, string> = {
  ko: '',
  en: '',
  ja: '',
  zh: '',
};

const WEBTOON_PROMPTS: Record<PromptLang, string> = {
  ko: `
[WEBTOON 포맷 지시]
- 씬을 4~6개의 패널로 나누어 서술한다.
- 각 패널은 다음 형식으로 작성한다:
  [Panel N: 묘사]
  (1~2문장의 시각 묘사 — 앵글, 구도, 등장 인물의 표정)
  [Panel N: 대사]
  (말풍선 내용. 내적 독백은 […] 로 구분)
- 산문 문단 대신 패널 블록을 출력하라.
- 마지막 패널은 반드시 다음 화를 끌어당기는 cliff(훅)로 종결한다.
- 긴 내적 묘사 금지 — 장면 전환은 패널 분할로 표현한다.
`,
  en: `
[WEBTOON FORMAT DIRECTIVE]
- Break the scene into 4-6 panels.
- Each panel uses this format:
  [Panel N: Visual]
  (1-2 sentences of visual description — angle, framing, expressions)
  [Panel N: Dialogue]
  (Speech-bubble content. Use [...] for internal monologue)
- Output panel blocks instead of prose paragraphs.
- The final panel MUST end on a cliffhanger that pulls the next episode.
- No long interior descriptions — convey scene transitions through panel breaks.
`,
  ja: `
[WEBTOON フォーマット指示]
- シーンを4~6のパネルに分割して記述する。
- 各パネルは次の形式で書く:
  [Panel N: 描写]
  (1~2文の視覚描写 — アングル、構図、登場人物の表情)
  [Panel N: セリフ]
  (吹き出しの内容。内面独白は […] で区切る)
- 散文段落の代わりにパネルブロックを出力せよ。
- 最終パネルは必ず次話を引き寄せるクリフハンガーで終わる。
- 長い内面描写は禁止 — 場面転換はパネル分割で表現する。
`,
  zh: `
[WEBTOON 格式指令]
- 将场景分为4~6个画格。
- 每个画格使用以下格式:
  [Panel N: 描绘]
  (1~2句视觉描绘 — 角度、构图、人物表情)
  [Panel N: 对白]
  (气球内文字。内心独白用 [...] 分隔)
- 使用画格区块,而非散文段落。
- 最后一格必须以牵引下一回的悬念收尾。
- 禁止冗长的内心描绘 — 场景转换用画格切分表达。
`,
};

const DRAMA_PROMPTS: Record<PromptLang, string> = {
  ko: `
[DRAMA 시나리오 포맷 지시]
- 표준 스크린플레이 형식으로 출력한다.
- 씬 헤더: INT./EXT. 장소 - 시간 (예: INT. 카페 - 낮)
- 액션 라인: 3인칭 현재형으로 시각/청각 가능한 것만 기술한다.
- 대사: 캐릭터명(대문자) 바로 아래 줄, 대사 끝에 마침표.
- 내적 독백(V.O. 제외) 금지. 감정은 행동과 대사 서브텍스트로만 표현한다.
- 카메라 지시는 최소화(FADE IN: / CUT TO: 만 허용).
`,
  en: `
[DRAMA SCREENPLAY FORMAT DIRECTIVE]
- Output in standard screenplay format.
- Scene headings: INT./EXT. LOCATION - TIME (e.g., INT. CAFE - DAY)
- Action lines: 3rd person present tense, only what is visible/audible.
- Dialogue: CHARACTER NAME (uppercase) on its own line, dialogue below.
- No interior monologue (except V.O.). Convey emotion only via action and dialogue subtext.
- Minimize camera directions (only FADE IN: / CUT TO: allowed).
`,
  ja: `
[DRAMA 脚本フォーマット指示]
- 標準脚本形式で出力する。
- シーンヘッダ: INT./EXT. 場所 - 時間 (例: INT. カフェ - 昼)
- アクションライン: 三人称現在形で、視覚・聴覚可能なもののみ記述する。
- セリフ: キャラクター名(大文字)を独立した行に、その下にセリフ。
- 内面独白(V.O.除く)禁止。感情は行動とセリフのサブテキストでのみ表現。
- カメラ指示は最小限(FADE IN: / CUT TO: のみ許可)。
`,
  zh: `
[DRAMA 剧本格式指令]
- 采用标准剧本格式输出。
- 场景标题: INT./EXT. 地点 - 时间 (例: INT. 咖啡厅 - 日)
- 动作行: 第三人称现在时,仅描述可见可闻之物。
- 对白: 角色名(大写)独占一行,对白紧接其下。
- 禁止内心独白(V.O. 除外)。情感仅通过动作与对白潜台词传递。
- 镜头指令最小化(仅允许 FADE IN: / CUT TO:)。
`,
};

const GAME_PROMPTS: Record<PromptLang, string> = {
  ko: `
[GAME 시나리오 분기 포맷 지시]
- 내러티브는 분기 선택지 기반으로 구성한다.
- 장면 묘사 후 반드시 선택지를 제시한다:
  [A] 선택지 텍스트 — (결과 힌트: 간략)
  [B] 선택지 텍스트 — (결과 힌트: 간략)
- 상태 변화는 {flag:value} 형식으로 명시 (예: {trust_nora: +1}, {quest_arc1: started}).
- 각 분기는 후속 장면에 영향을 미쳐야 한다 — 장식용 선택지 금지.
- 대사/내레이션은 짧게, 선택지 주도권을 플레이어에게 넘긴다.
`,
  en: `
[GAME BRANCHING NARRATIVE FORMAT DIRECTIVE]
- Structure the narrative around branching choices.
- After scene description, present choices:
  [A] Choice text — (consequence hint: brief)
  [B] Choice text — (consequence hint: brief)
- State changes use {flag:value} format (e.g., {trust_nora: +1}, {quest_arc1: started}).
- Every branch MUST affect subsequent scenes — no cosmetic choices.
- Keep dialogue/narration concise; hand agency to the player via choices.
`,
  ja: `
[GAME 分岐ナラティブフォーマット指示]
- 物語は分岐選択肢を中心に構成する。
- シーン描写の後、必ず選択肢を提示する:
  [A] 選択肢テキスト — (結果ヒント: 簡潔に)
  [B] 選択肢テキスト — (結果ヒント: 簡潔に)
- 状態変化は {flag:value} 形式で明示 (例: {trust_nora: +1}, {quest_arc1: started})。
- 各分岐は後続シーンに影響を与えねばならない — 装飾だけの選択肢禁止。
- セリフ・ナレーションは簡潔に、選択肢の主導権をプレイヤーに渡す。
`,
  zh: `
[GAME 分支叙事格式指令]
- 叙事围绕分支选项构建。
- 场景描绘后必须呈现选项:
  [A] 选项文本 — (后果提示: 简略)
  [B] 选项文本 — (后果提示: 简略)
- 状态变化采用 {flag:value} 格式 (例: {trust_nora: +1}, {quest_arc1: started})。
- 每个分支必须影响后续场景 — 禁止装饰性选项。
- 对白与旁白从简,将主动权交给玩家。
`,
};

// ============================================================
// PART 3 — Public API
// ============================================================

const EMPTY_LANG_MAP: Record<PromptLang, string> = { ko: '', en: '', ja: '', zh: '' };

const PROMPT_TABLE: Record<GenreMode, Record<PromptLang, string>> = {
  novel: NOVEL_PROMPTS,
  webtoon: WEBTOON_PROMPTS,
  drama: DRAMA_PROMPTS,
  game: GAME_PROMPTS,
};

/**
 * 장르별 시스템 프롬프트 추가분 반환.
 * novel 모드는 빈 문자열(기존 산문 프롬프트를 그대로 사용).
 * 그 외 모드는 포맷 지시 블록을 반환.
 *
 * 호출부는 기존 systemPromptText 뒤에 그대로 이어붙이면 된다.
 *
 * @example
 *   const addendum = getGenreSystemPrompt(config.genreMode ?? 'novel', 'ko');
 *   const fullPrompt = systemPromptText + addendum;
 */
export function getGenreSystemPrompt(mode: GenreMode, lang: PromptLang): string {
  const byMode = PROMPT_TABLE[mode] ?? EMPTY_LANG_MAP;
  return byMode[lang] ?? byMode.ko ?? '';
}
