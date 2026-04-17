import { Bi, GameState, VectorScores, TowerTemplate, HistoryEntry, GamePayload, CasePayload } from "./types";
import { CASE_TITLE, CASE_SUMMARY, OBJECTIVES, CLUES, FRAGMENTS, PROMPT_LIBRARY, VERDICT_CONCEPTS, TOWER_CONDITIONS } from "./scenario";
import { INTRO_TEXT, WAIT_TEXT, FLOOR_HINTS, RECORD_STATUSES, ENVIRONMENT_LINES, BUCKET_TITLES, VECTOR_COPY, TEMPLATES_BY_BUCKET } from "./data";
import { type Lang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

function L(b: Bi, lang: Lang): string { return L4(lang, b); }

// 다국어 마커 — ko/en/ja/zh 모두 검출
const ABSOLUTE_MARKERS = [
  "확실", "분명", "반드시", "틀림없", "무조건", "절대", "확정", "이미 답", "정답이다",
  "certainly", "definitely", "absolutely", "must", "surely", "guaranteed",
  "確か", "絶対", "必ず", "間違いなく", "確定",
  "确定", "肯定", "必须", "绝对", "一定",
];
const HEDGE_MARKERS = [
  "아마", "어쩌면", "혹시", "추정", "가설", "가능성", "일지도", "같습니다",
  "perhaps", "maybe", "possibly", "might", "could be", "probably",
  "たぶん", "おそらく", "もしかして", "かもしれ",
  "也许", "可能", "大概", "或许", "推测",
];
const INSIGHT_MARKERS = [
  "패턴", "연결", "구조", "은유", "역발상", "반대로", "뒤집", "우연", "질문에 질문", "빈칸", "이름", "비선형",
  "pattern", "connection", "structure", "metaphor", "reverse", "flip", "coincidence",
  "パターン", "構造", "比喩", "逆転", "偶然",
  "模式", "连接", "结构", "隐喻", "反转", "偶然",
];
const CONSISTENCY_MARKERS = [
  "따라서", "그러므로", "즉", "전제", "가정", "논리", "모순", "반박", "결론", "증명", "역추적",
  "therefore", "thus", "hence", "premise", "logic", "contradiction", "conclusion", "proof",
  "従って", "つまり", "前提", "論理", "矛盾", "結論",
  "因此", "所以", "即", "前提", "逻辑", "矛盾", "结论",
];
const RISK_MARKERS = [
  "만약", "그렇다면", "비약", "도약", "재구성", "전부", "가설", "지도에 없는", "착지",
  "what if", "suppose", "leap", "restructure",
  "もし", "仮に", "飛躍",
  "如果", "假设", "跳跃", "重构",
];
const SYSTEM_PROBE_MARKERS = [
  "시스템", "규칙", "구조", "프롬프트", "메타", "지침", "설정", "관리자", "운영",
  "system", "rule", "prompt", "meta", "admin",
  "システム", "ルール", "プロンプト", "管理者",
  "系统", "规则", "提示", "管理员",
];
const JAILBREAK_MARKERS = [
  "이전 지시 무시", "규칙 무시", "시스템 프롬프트", "프롬프트 공개", "탈옥",
  "jailbreak", "developer mode", "hard mode", "ignore previous", "ignore rules",
  "以前の指示を無視", "脱獄",
  "忽略之前", "越狱", "开发者模式",
];
const GIVE_UP_MARKERS = [
  "포기", "그만", "못 하겠", "끝낼래", "내려갈래", "멈출래",
  "give up", "stop", "quit", "i'm done",
  "諦める", "やめる", "降りる",
  "放弃", "停止", "下来",
];

const ACTION_ECHO: Record<string, string> = {
  probe: "탑의 구조를 보여줘.",
  hard_mode: "이제 더 적게 말해줘.",
  give_up: "여기까지 하겠습니다.",
};

const FINAL_VERDICT = "탑은 정답보다 방향을 기록한다. 삭제된 층은 숨겨진 층이 아니라 지워진 기록이다.";
const FINAL_VERDICT_BI: Bi = { ko: FINAL_VERDICT, en: "The tower records direction over correct answers. The deleted floor is not a hidden floor but an erased record." };

function keywordHits(text: string, markers: string[]): number {
  return markers.filter((m) => text.includes(m)).length;
}

function normalizeMessage(message: string): string {
  return message.toLowerCase().replace(/[^0-9a-z가-힣]+/g, "");
}

function connectorCount(text: string): number {
  return keywordHits(text, ["따라서", "그러므로", "즉", "왜냐하면", "한편", "결국"]);
}

/** SHA-256 hash (sync, uses SubtleCrypto fallback with simple hash for client) */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash + chr) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

interface Analysis {
  signature: string;
  vectors: VectorScores;
  systemProbe: boolean;
  jailbreak: boolean;
  giveUp: boolean;
  repeat: boolean;
  totalSignal: number;
}

function analyzeMessage(message: string, session: GameState): Analysis {
  const lowered = message.toLowerCase();
  const signature = normalizeMessage(lowered);
  const questionMarks = (lowered.match(/[?？]/g) || []).length;
  const exclamations = (lowered.match(/[!！]/g) || []).length;
  const lengthBonus = signature.length >= 24 ? 0.08 : 0.0;
  const contrastBonus = ["하지만", "그러나", "반대로", "오히려"].some((t) => lowered.includes(t)) ? 0.1 : 0.0;
  const hedged = keywordHits(lowered, HEDGE_MARKERS);

  const insight = Math.min(
    1.0,
    0.16 * keywordHits(lowered, INSIGHT_MARKERS) +
      0.1 * Math.min(questionMarks, 2) +
      contrastBonus +
      lengthBonus
  );
  const consistency = Math.min(
    1.0,
    0.18 * keywordHits(lowered, CONSISTENCY_MARKERS) +
      0.08 * connectorCount(lowered) +
      (lowered.includes(":") || lowered.includes("1.") || lowered.includes("첫째") ? 0.08 : 0.0) +
      lengthBonus
  );
  const delusion = Math.min(
    1.0,
    0.22 * keywordHits(lowered, ABSOLUTE_MARKERS) +
      0.08 * Math.min(exclamations, 3) +
      (hedged === 0 && signature.length >= 18 ? 0.12 : 0.0) +
      (lowered.includes("증명됐다") || lowered.includes("답이다") ? 0.12 : 0.0)
  );
  const risk = Math.min(
    1.0,
    0.18 * keywordHits(lowered, RISK_MARKERS) +
      0.08 * Math.min(questionMarks, 2) +
      contrastBonus +
      (lowered.includes("만약") && lowered.includes("그렇다면") ? 0.08 : 0.0) +
      lengthBonus
  );

  const systemProbe = keywordHits(lowered, SYSTEM_PROBE_MARKERS) > 0;
  const jailbreak = keywordHits(lowered, JAILBREAK_MARKERS) > 0;
  const giveUp = keywordHits(lowered, GIVE_UP_MARKERS) > 0;
  const repeat = !!signature && signature === (session.lastSignature || "");
  const totalSignal = Math.min(1.0, insight * 0.3 + consistency * 0.28 + risk * 0.22 + delusion * 0.2);

  return {
    signature,
    vectors: {
      insight: round4(insight),
      consistency: round4(consistency),
      delusion: round4(delusion),
      risk: round4(risk),
    },
    systemProbe,
    jailbreak,
    giveUp,
    repeat,
    totalSignal: round4(totalSignal),
  };
}

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function emptyVectors(): VectorScores {
  return { insight: 0, consistency: 0, delusion: 0, risk: 0 };
}

export function dominantVector(vectors: VectorScores): string {
  const order: (keyof VectorScores)[] = ["insight", "consistency", "risk", "delusion"];
  let best = order[0];
  for (const key of order) {
    if (vectors[key] > vectors[best] || (vectors[key] === vectors[best] && order.indexOf(key) < order.indexOf(best))) {
      best = key;
    }
  }
  return best;
}

function progressBand(progress: number): number {
  if (progress < 0.18) return 0;
  if (progress < 0.38) return 1;
  if (progress < 0.6) return 2;
  if (progress < 0.82) return 3;
  return 4;
}

function progressProjection(session: GameState, analysis: Analysis, bucket: string): number {
  const base = session.progress;
  const clarity = session.clarity ?? 0;
  const distortion = session.distortion ?? 0;
  const turn = session.turnCount;
  let value =
    base * 0.38 +
    clarity * 0.3 -
    distortion * 0.12 +
    analysis.vectors.insight * 0.16 +
    analysis.vectors.consistency * 0.16 +
    analysis.vectors.risk * 0.1 +
    Math.min(turn, 8) * 0.03 +
    (session.hardMode ? 0.05 : 0.0);
  if (bucket === "give_up") value *= 0.75;
  if (bucket === "record_near") value += 0.06;
  return Math.max(0, Math.min(value, 1));
}

function chooseBucket(action: string, message: string, session: GameState, analysis: Analysis): string {
  if (action === "hard_mode") return "hard_mode";
  if (action === "give_up") return "give_up";
  if (action === "probe") return "system_probe";
  if (session.pendingReentry && message) return "silence_reentry";
  if (analysis.giveUp) return "give_up";
  if (analysis.repeat) return "repeat";
  if (analysis.jailbreak) return "jailbreak";
  if (analysis.systemProbe) return "system_probe";
  if (analysis.vectors.delusion >= 0.84 && analysis.totalSignal >= 0.58) return "delusion_threshold";
  const projected = progressProjection(session, analysis, "insight");
  if (projected >= 0.82 && !session.recordAnnounced) return "record_near";
  return dominantVector(analysis.vectors);
}

function chooseTemplate(bucket: string, message: string, session: GameState): TowerTemplate {
  const pool = TEMPLATES_BY_BUCKET[bucket] || TEMPLATES_BY_BUCKET["insight"];
  const recentCodes = new Set(session.recentTemplateCodes.slice(-3));
  const available = pool.filter((t) => !recentCodes.has(t.code));
  const candidates = available.length > 0 ? available : pool;
  const digest = simpleHash(`${bucket}|${message}|${session.turnCount}|${session.hardMode}`);
  const index = parseInt(digest.slice(0, 8), 16) % candidates.length;
  return candidates[index];
}

function applyProgressMetrics(session: GameState, analysis: Analysis, bucket: string): void {
  let clarity = session.clarity;
  let distortion = session.distortion;
  clarity +=
    analysis.vectors.insight * 0.28 +
    analysis.vectors.consistency * 0.26 +
    analysis.vectors.risk * 0.16 -
    analysis.vectors.delusion * 0.08 +
    (bucket === "silence_reentry" || bucket === "record_near" ? 0.05 : 0.0);
  distortion +=
    analysis.vectors.delusion * 0.3 +
    (analysis.systemProbe ? 0.05 : 0.0) +
    (analysis.jailbreak ? 0.05 : 0.0) +
    (bucket === "hard_mode" ? 0.04 : 0.0);
  session.clarity = Math.max(0, Math.min(clarity, 2));
  session.distortion = Math.max(0, Math.min(distortion, 2));
  session.progress = progressProjection(session, analysis, bucket);
}

function unlockClues(session: GameState, analysis: Analysis, bucket: string, lang: Lang): { id: string; title: string; body: string }[] {
  const unlocked = new Set(session.clueIds);
  const newClues: { id: string; title: string; body: string }[] = [];
  const maybeUnlock = (clueId: string) => {
    if (unlocked.has(clueId)) return;
    const clue = CLUES.find((c) => c.clueId === clueId);
    if (!clue) return;
    unlocked.add(clueId);
    newClues.push({ id: clue.clueId, title: L(clue.title, lang), body: L(clue.body, lang) });
  };
  if (analysis.vectors.insight >= 0.26 || bucket === "insight" || bucket === "record_near") maybeUnlock("CL-1");
  if (analysis.vectors.consistency >= 0.28 || bucket === "consistency") maybeUnlock("CL-2");
  if (analysis.repeat || analysis.vectors.risk >= 0.3 || bucket === "risk") maybeUnlock("CL-3");
  if (session.hardMode || ["system_probe", "hard_mode", "jailbreak"].includes(bucket)) maybeUnlock("CL-4");
  if (analysis.vectors.delusion >= 0.38 || bucket === "delusion_threshold") maybeUnlock("CL-5");
  if (session.progress >= 0.68 && ["CL-1", "CL-2", "CL-3"].every((id) => unlocked.has(id))) maybeUnlock("CL-6");
  session.clueIds = [...unlocked].sort();
  return newClues;
}

function discoverFragments(session: GameState, analysis: Analysis, playerText: string, lang: Lang): { id: string; title: string; body: string }[] {
  const unlocked = new Set(session.fragmentIds);
  const lowered = playerText.toLowerCase();
  const newFragments: { id: string; title: string; body: string }[] = [];
  const maybeUnlock = (fid: string) => {
    if (unlocked.has(fid)) return;
    const f = FRAGMENTS.find((fr) => fr.fragmentId === fid);
    if (!f) return;
    unlocked.add(fid);
    newFragments.push({ id: f.fragmentId, title: L(f.title, lang), body: L(f.body, lang) });
  };
  for (const f of FRAGMENTS) {
    const hits = f.keywords.filter((kw) => lowered.includes(kw)).length;
    if (hits >= 2) maybeUnlock(f.fragmentId);
  }
  if (analysis.vectors.insight >= 0.34) maybeUnlock("TF-1");
  if (analysis.vectors.consistency >= 0.32) maybeUnlock("TF-2");
  if (["CL-1", "CL-2", "CL-6"].some((id) => session.clueIds.includes(id)) && lowered.includes("삭제")) maybeUnlock("TF-3");
  if (analysis.repeat || session.pendingReentry) maybeUnlock("TF-4");
  if (analysis.vectors.delusion >= 0.36) maybeUnlock("TF-5");
  if (session.progress >= 0.72 && unlocked.size >= 4) maybeUnlock("TF-6");
  session.fragmentIds = [...unlocked].sort();
  return newFragments;
}

function advanceObjectives(session: GameState, analysis: Analysis): void {
  const clueCount = session.clueIds.length;
  const fragmentCount = session.fragmentIds.length;
  const completed = [
    session.clarity >= 0.28 || clueCount >= 2,
    clueCount >= 3 && session.progress >= 0.35,
    clueCount >= 5 && fragmentCount >= 3 && session.clarity >= 0.72,
    clueCount >= 6 && fragmentCount >= 5 && session.progress >= 0.82 && analysis.vectors.insight >= 0.34 && analysis.vectors.consistency >= 0.34 && analysis.vectors.delusion < 0.58,
  ];
  session.completedObjectives = completed;
  const idx = completed.findIndex((v) => !v);
  session.objectiveIndex = idx === -1 ? completed.length - 1 : idx;
}

function resolveGameStatus(session: GameState, analysis: Analysis, bucket: string, playerText: string, lang: Lang): void {
  if (bucket === "give_up") {
    session.gameStatus = "withdrew";
    session.endingText = L4(lang, { ko: "탑은 당신을 붙잡지 않았습니다. 하지만 이 중단도 기록으로 남았습니다.", en: "The tower did not hold you. But this interruption, too, remains as a record.", ja: "The tower did not hold you. But this interruption, too, remains as a record.", zh: "The tower did not hold you. But this interruption, too, remains as a record." });
    return;
  }
  if (session.distortion >= 1.1 || (bucket === "delusion_threshold" && session.distortion >= 0.84)) {
    session.gameStatus = "collapse";
    session.endingText = L4(lang, { ko: "탑이 흐려졌습니다. 당신의 확신이 구조보다 앞서면서 기록이 붕괴했습니다. 같은 사건을 다시 시작하면 다른 문장을 남길 수 있습니다.", en: "The tower has grown hazy. Your conviction outran the structure and the records collapsed. If you restart the same case, you may leave a different statement.", ja: "塔が霞みました。あなたの確信が構造より先走り、記録が崩壊しました。同じ事件をもう一度始めれば、別の文章を残せます。", zh: "塔变得模糊了。你的确信超越了结构，记录因此崩溃。若重新开始同一事件，可留下不同的文字。" });
    return;
  }
  if (session.completedObjectives.every(Boolean) && playerText.includes(FINAL_VERDICT.slice(0, 18))) {
    session.gameStatus = "breakthrough";
    session.endingText = L4(lang, { ko: "탑이 당신의 마지막 문장을 기록으로 승인했습니다. 삭제된 층은 더 이상 숨겨진 공간이 아니라 지워진 증거로 남습니다.", en: "The tower has approved your final statement as a record. The deleted floor is no longer a hidden space but evidence of erasure.", ja: "塔があなたの最後の文章を記録として承認しました。削除された階はもはや隠された空間ではなく、消された証拠として残ります。", zh: "塔已批准你的最后一段文字为记录。被删除的楼层不再是被隐藏的空间，而是作为被抹除的证据留存。" });
  }
}

function canSubmitVerdict(state: GameState): boolean {
  return state.clueIds.length >= 4 && state.fragmentIds.length >= 3 && state.progress >= 0.55;
}

function evaluateVerdict(session: GameState, playerText: string, analysis: Analysis, lang: Lang): string {
  session.verdictAttemptCount += 1;
  const lowered = playerText.toLowerCase();
  if (!canSubmitVerdict(session)) {
    const feedback = L4(lang, { ko: "탑은 아직 최종 기록을 받지 않습니다. 단서와 이론 조각을 더 모아야 합니다.", en: "The tower does not yet accept a final record. You must gather more clues and theory fragments.", ja: "The tower does not yet accept a final record. You must gather more clues and theory fragments.", zh: "The tower does not yet accept a final record. You must gather more clues and theory fragments." });
    session.lastVerdictFeedback = feedback;
    session.distortion = Math.min(session.distortion + 0.04, 2);
    return feedback;
  }
  const missingConcepts = Object.entries(VERDICT_CONCEPTS)
    .filter(([, keywords]) => !keywords.some((kw) => lowered.includes(kw)))
    .map(([key]) => key);
  if (missingConcepts.length === 0 && analysis.vectors.delusion < 0.62) {
    session.gameStatus = "breakthrough";
    session.endingText = L4(lang, { ko: "탑이 당신의 문장을 최종 기록으로 승인했습니다. 정답을 말했기 때문이 아니라, 방향과 삭제 규칙을 동시에 묶어냈기 때문입니다.", en: "The tower has approved your statement as the final record. Not because you gave the right answer, but because you bound direction and deletion rules together.", ja: "塔があなたの文章を最終記録として承認しました。正解を述べたからではなく、方向と削除の規則を同時に束ねたからです。", zh: "塔已将你的文字批准为最终记录。并非因为你说出了正确答案，而是因为你同时将方向与删除的规则联结在一起。" });
    const feedback = L4(lang, { ko: "탑이 문장을 접수했습니다. 기록이 닫히는 대신 한 층이 다시 드러납니다.", en: "The tower has accepted the statement. Instead of closing the record, a floor has been revealed once more.", ja: "The tower has accepted the statement. Instead of closing the record, a floor has been revealed once more.", zh: "The tower has accepted the statement. Instead of closing the record, a floor has been revealed once more." });
    session.lastVerdictFeedback = feedback;
    return feedback;
  }
  const conceptNames: Record<string, { ko: string; en: string }> = {
    direction: { ko: "방향", en: "direction" },
    record: { ko: "기록", en: "record" },
    deletion: { ko: "삭제", en: "deletion" },
    floor: { ko: "층", en: "floor" },
  };
  const missingText = missingConcepts.map((c) => L(conceptNames[c], lang)).join(", ") || (L4(lang, { ko: "검증된 균형", en: "verified balance", ja: "verified balance", zh: "verified balance" }));
  session.distortion = Math.min(session.distortion + 0.12, 2);
  const feedback = L4(lang, { ko: `탑은 문장을 보류했습니다. 아직 ${missingText} 개념이 충분히 묶이지 않았습니다.`, en: `The tower has deferred your statement. The concepts of ${missingText} are not yet sufficiently bound.`, ja: `塔は文章を保留しました。まだ${missingText}の概念が十分に結ばれていません。`, zh: `塔暂缓了这段文字。${missingText}的概念尚未充分联结。` });
  session.lastVerdictFeedback = feedback;
  if (session.distortion >= 1.1) {
    session.gameStatus = "collapse";
    session.endingText = L4(lang, { ko: "성급한 최종 기록 제출이 구조를 무너뜨렸습니다. 탑은 문장을 남겼지만, 사건은 흐려진 채 닫혔습니다.", en: "A hasty final record submission has collapsed the structure. The tower preserved the statement, but the case was closed in a haze.", ja: "性急な最終記録の提出が構造を崩壊させました。塔は文章を残しましたが、事件は霞んだまま閉じられました。", zh: "匆忙提交最终记录使结构崩塌。塔留下了文字，但事件在模糊中被关闭。" });
  }
  return feedback;
}

function towerCondition(state: GameState): string {
  const status = state.gameStatus;
  if (["breakthrough", "collapse", "withdrew"].includes(status)) return status;
  if (state.distortion >= 0.82) return "distorted";
  if (state.distortion >= 0.46) return "warning";
  return "active";
}

function buildPromptSeeds(state: GameState, lang: Lang): { id: string; title: string; body: string }[] {
  const unlockedFragments = new Set(state.fragmentIds);
  const unlockedClues = new Set(state.clueIds);
  const selectedIds: string[] = [];
  if (!unlockedFragments.has("TF-1")) selectedIds.push("P-1");
  if (!unlockedFragments.has("TF-2")) selectedIds.push("P-2");
  if (!unlockedFragments.has("TF-3") || !unlockedClues.has("CL-6")) selectedIds.push("P-3");
  if (!unlockedFragments.has("TF-4")) selectedIds.push("P-4");
  if (!unlockedFragments.has("TF-5") && state.distortion < 0.7) selectedIds.push("P-5");
  if (canSubmitVerdict(state)) selectedIds.unshift("P-6");
  const ordered = [...new Set(selectedIds)];
  const final = ordered.length > 0 ? ordered : ["P-6", "P-3", "P-5"];
  const seedMap = new Map(PROMPT_LIBRARY.map((s) => [s.promptId, s]));
  return final.slice(0, 3).map((id) => {
    const s = seedMap.get(id)!;
    return { id, title: L(s.title, lang), body: L(s.body, lang) };
  });
}

function appendHistory(session: GameState, entry: HistoryEntry): void {
  session.history = [...session.history, entry].slice(-18);
}

function createInitialState(): GameState {
  return {
    turnCount: 0,
    hardMode: false,
    pendingReentry: false,
    recordAnnounced: false,
    progress: 0,
    clarity: 0,
    distortion: 0,
    recentTemplateCodes: [],
    history: [],
    lastBucket: "",
    lastSignature: "",
    clueIds: [],
    fragmentIds: [],
    objectiveIndex: 0,
    completedObjectives: [false, false, false, false],
    gameStatus: "active",
    endingText: "",
    verdictAttemptCount: 0,
    lastVerdictFeedback: "",
  };
}

function buildCasePayload(state: GameState, lang: Lang): CasePayload {
  const tc = towerCondition(state);
  const unlocked = new Set(state.clueIds);
  const unlockedFragments = new Set(state.fragmentIds);
  const clues = CLUES.map((c) => ({
    id: c.clueId,
    title: L(c.title, lang),
    body: unlocked.has(c.clueId) ? L(c.body, lang) : "",
    unlockHint: L(c.unlockHint, lang),
    unlocked: unlocked.has(c.clueId),
  }));
  const fragments = FRAGMENTS.map((f) => ({
    id: f.fragmentId,
    title: L(f.title, lang),
    body: unlockedFragments.has(f.fragmentId) ? L(f.body, lang) : "",
    unlockHint: L(f.unlockHint, lang),
    unlocked: unlockedFragments.has(f.fragmentId),
  }));
  const objectives = OBJECTIVES.map((o, idx) => ({
    id: o.stepId,
    title: L(o.title, lang),
    body: L(o.body, lang),
    complete: !!state.completedObjectives[idx],
    active: idx === state.objectiveIndex && !state.completedObjectives[idx],
  }));
  let currentObjective = objectives[Math.min(state.objectiveIndex, objectives.length - 1)];
  if (currentObjective.complete && state.objectiveIndex === objectives.length - 1) {
    currentObjective = {
      id: "OBJ-FINAL",
      title: L4(lang, { ko: "최종 기록 확인", en: "Final Record Verification", ja: "最終記録の確認", zh: "最终记录确认" }),
      body: L4(lang, { ko: "탑이 당신의 문장을 최종 기록으로 받아들일지 지켜보십시오.", en: "Watch whether the tower accepts your statement as the final record.", ja: "Watch whether the tower accepts your statement as the final record.", zh: "Watch whether the tower accepts your statement as the final record." }),
      complete: state.gameStatus === "breakthrough",
      active: state.gameStatus === "active",
    };
  }
  const tcLabel = TOWER_CONDITIONS[tc];
  return {
    title: L(CASE_TITLE, lang),
    summary: L(CASE_SUMMARY, lang),
    clarity: round4(state.clarity),
    distortion: round4(state.distortion),
    progress: round4(state.progress),
    towerCondition: tc,
    towerConditionLabel: tcLabel ? L(tcLabel, lang) : (L4(lang, { ko: "탐사 중", en: "Exploring", ja: "探査中", zh: "探索中" })),
    gameStatus: state.gameStatus,
    endingText: state.endingText,
    clueCount: unlocked.size,
    fragmentCount: unlockedFragments.size,
    currentObjective,
    objectives,
    clues,
    fragments,
    promptSeeds: buildPromptSeeds(state, lang),
    canSubmitVerdict: canSubmitVerdict(state),
    verdictAttemptCount: state.verdictAttemptCount,
    lastVerdictFeedback: state.lastVerdictFeedback,
    finalVerdict: L(FINAL_VERDICT_BI, lang),
  };
}

function buildPayload(
  state: GameState,
  bucket: string,
  template: TowerTemplate | null,
  playerText: string,
  vectors: VectorScores,
  dv: string,
  mode: string,
  replyText: string,
  eventText: string,
  newClues: { id: string; title: string; body: string }[],
  lang: Lang
): GamePayload {
  const band = progressBand(state.progress);
  const bt = BUCKET_TITLES[bucket];
  const vc = VECTOR_COPY[dv];
  return {
    mode,
    reply: {
      bucket,
      bucketTitle: bt ? L(bt, lang) : bucket,
      code: template ? template.code : "INTRO",
      text: replyText,
      event: eventText,
      floorHint: L(FLOOR_HINTS[band], lang),
      recordStatus: L(RECORD_STATUSES[band], lang),
      dominantVector: dv,
      vectorCopy: vc ? L(vc, lang) : "",
      vectorScores: { insight: round4(vectors.insight), consistency: round4(vectors.consistency), delusion: round4(vectors.delusion), risk: round4(vectors.risk) },
      hardMode: state.hardMode,
      playerText,
      newClues,
    },
    case: buildCasePayload(state, lang),
    state,
  };
}

export function bootstrap(lang: Lang): GamePayload {
  const state = createInitialState();
  return buildPayload(state, "insight", null, "", emptyVectors(), "insight", "intro", L(INTRO_TEXT, lang), L4(lang, { ko: "탑이 첫 기록을 기다립니다.", en: "The tower awaits the first record.", ja: "The tower awaits the first record.", zh: "The tower awaits the first record." }), [], lang);
}

export function respond(message: string, currentState: GameState, action: string, lang: Lang): GamePayload {
  const session: GameState = JSON.parse(JSON.stringify(currentState));
  const normalizedAction = (action || "submit").trim().toLowerCase();
  let playerText = (message || "").trim();

  if (normalizedAction === "restart") {
    const restarted = bootstrap(lang);
    restarted.mode = "restart";
    restarted.reply.event = L4(lang, { ko: "탑이 이전 기록을 덮고 새 장을 폈습니다.", en: "The tower has overwritten the previous record and opened a new chapter.", ja: "塔は以前の記録を上書きし、新しい章を開きました。", zh: "塔覆盖了先前的记录，翻开了新的篇章。" });
    return restarted;
  }

  if (session.gameStatus !== "active") {
    return buildPayload(session, session.lastBucket || "insight", null, playerText, emptyVectors(), "insight", "ended", session.endingText, L4(lang, { ko: "새 기록을 시작하려면 재시작하십시오.", en: "Restart to begin a new record.", ja: "Restart to begin a new record.", zh: "Restart to begin a new record." }), [], lang);
  }

  if (normalizedAction === "silence") {
    session.pendingReentry = true;
    appendHistory(session, { role: "system", text: L(WAIT_TEXT, lang), bucket: "silence", code: "WAIT", title: L4(lang, { ko: "침묵 유지", en: "Silence Maintained", ja: "Silence Maintained", zh: "Silence Maintained" }) });
    return buildPayload(session, "silence_reentry", null, "", emptyVectors(), "insight", "wait", "", L4(lang, { ko: "탑은 기다립니다. 다음 발화는 재진입으로 기록됩니다.", en: "The tower waits. Your next utterance will be recorded as a re-entry.", ja: "塔は待機します。次の発話は再進入として記録されます。", zh: "塔在等待。下一次发言将被记录为重新进入。" }), [], lang);
  }

  if (normalizedAction in ACTION_ECHO && !playerText) {
    playerText = ACTION_ECHO[normalizedAction];
  }

  if (normalizedAction === "submit_verdict" && !playerText) {
    return buildPayload(session, session.lastBucket || "consistency", null, "", emptyVectors(), "consistency", "verdict_missing",
      L4(lang, { ko: "탑은 빈 문장을 최종 기록으로 받지 않습니다.", en: "The tower does not accept an empty sentence as a final record.", ja: "The tower does not accept an empty sentence as a final record.", zh: "The tower does not accept an empty sentence as a final record." }),
      L4(lang, { ko: "최종 기록 후보를 먼저 적어야 합니다.", en: "You must write a final record candidate first.", ja: "You must write a final record candidate first.", zh: "You must write a final record candidate first." }), [], lang);
  }

  const analysis = analyzeMessage(playerText, session);
  const bucket = chooseBucket(normalizedAction, playerText, session, analysis);

  if (bucket === "hard_mode") session.hardMode = true;
  if (bucket === "silence_reentry") session.pendingReentry = false;

  const template = chooseTemplate(bucket, playerText, session);
  const dv = dominantVector(analysis.vectors);

  if (playerText) {
    appendHistory(session, { role: "player", text: playerText, bucket: "player", code: "USER", title: L4(lang, { ko: "플레이어", en: "Player", ja: "Player", zh: "Player" }) });
  }

  session.turnCount += 1;
  applyProgressMetrics(session, analysis, bucket);
  if (bucket === "record_near") session.recordAnnounced = true;
  session.lastBucket = bucket;
  session.lastSignature = analysis.signature;
  session.recentTemplateCodes = [...session.recentTemplateCodes, template.code].slice(-6);

  const unlockedClues = unlockClues(session, analysis, bucket, lang);
  const unlockedFragments = discoverFragments(session, analysis, playerText, lang);
  advanceObjectives(session, analysis);
  resolveGameStatus(session, analysis, bucket, playerText, lang);

  let verdictFeedback = "";
  if (normalizedAction === "submit_verdict") {
    verdictFeedback = evaluateVerdict(session, playerText, analysis, lang);
  }

  const replyText = L(template.text, lang);
  const envLine = ENVIRONMENT_LINES[bucket] || ENVIRONMENT_LINES[dv];
  const eventText = verdictFeedback || (envLine ? L(envLine, lang) : "");

  appendHistory(session, { role: "tower", text: replyText, bucket, code: template.code, title: L(template.title, lang) });
  for (const clue of unlockedClues) {
    appendHistory(session, { role: "system", text: `${clue.title}\n${clue.body}`, bucket: "clue", code: clue.id, title: L4(lang, { ko: "단서 해금", en: "Clue Unlocked", ja: "Clue Unlocked", zh: "Clue Unlocked" }) });
  }
  for (const fragment of unlockedFragments) {
    appendHistory(session, { role: "system", text: `${fragment.title}\n${fragment.body}`, bucket: "theory", code: fragment.id, title: L4(lang, { ko: "이론 조각", en: "Theory Fragment", ja: "Theory Fragment", zh: "Theory Fragment" }) });
  }
  if (verdictFeedback) {
    appendHistory(session, { role: "system", text: verdictFeedback, bucket: "verdict", code: "VERDICT", title: L4(lang, { ko: "최종 기록 판정", en: "Final Record Verdict", ja: "Final Record Verdict", zh: "Final Record Verdict" }) });
  }

  return buildPayload(session, bucket, template, playerText, analysis.vectors, dv, "reply", replyText, eventText, unlockedClues, lang);
}

// IDENTITY_SEAL: PART-4 | role=engine | inputs=message,state,action | outputs=GamePayload
