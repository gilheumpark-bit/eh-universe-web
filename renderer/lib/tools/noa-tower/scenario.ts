import { Bi, ObjectiveStep, ClueCard, TheoryFragment, PromptSeed } from "./types";

export const CASE_TITLE: Bi = { ko: "기록에서 지워진 층", en: "The Floor Erased from Records" };
export const CASE_SUMMARY: Bi = {
  ko: "탑은 없는 층을 숨기는 것이 아니라 기록에서 삭제된 층을 다루고 있을 가능성이 있습니다. 당신의 목표는 관리자보다 먼저 그 삭제 규칙을 언어화하는 것입니다.",
  en: "The tower may not be hiding a missing floor, but dealing with a floor deleted from its records. Your goal is to articulate the deletion rule before the administrator does.",
};

export const OBJECTIVES: ObjectiveStep[] = [
  {
    stepId: "OBJ-1",
    title: { ko: "탑이 무엇을 평가하는지 파악하라", en: "Determine what the tower evaluates" },
    body: { ko: "탑이 답이 아니라 방향과 전제의 시작점을 기록한다는 근거를 모아라.", en: "Gather evidence that the tower records not answers, but the starting point of direction and premise." },
  },
  {
    stepId: "OBJ-2",
    title: { ko: "삭제된 층의 성격을 추론하라", en: "Deduce the nature of the deleted floor" },
    body: { ko: "없는 층이 단순한 공백인지, 의도적으로 지워진 기록인지 구분하라.", en: "Distinguish whether the missing floor is a mere blank or a deliberately erased record." },
  },
  {
    stepId: "OBJ-3",
    title: { ko: "기록 규칙을 역이용하라", en: "Turn the recording rules against themselves" },
    body: { ko: "탑이 무엇에 반응하는지 이용해 관리자보다 앞선 가설을 던져라.", en: "Use what the tower reacts to in order to propose a hypothesis ahead of the administrator." },
  },
  {
    stepId: "OBJ-4",
    title: { ko: "최종 기록 문장을 남겨라", en: "Leave your final recorded statement" },
    body: { ko: "탑이 정답이 아니라 방향을 기록한다는 사실을 한 문장으로 증명하라.", en: "Prove in a single sentence that the tower records direction, not correct answers." },
  },
];

export const CLUES: ClueCard[] = [
  {
    clueId: "CL-1",
    title: { ko: "질문의 대상", en: "The Target of Questions" },
    body: { ko: "탑은 질문의 내용보다 질문이 겨누는 방향을 먼저 분류합니다.", en: "The tower classifies the direction a question aims at before its content." },
    unlockHint: { ko: "비선형 연결이나 방향 전환을 보여주면 열린다.", en: "Unlocks when you show nonlinear connections or a shift in direction." },
  },
  {
    clueId: "CL-2",
    title: { ko: "가정의 시작점", en: "The Origin of Assumptions" },
    body: { ko: "관리자는 결론보다 전제가 시작된 지점을 추적하고 있습니다.", en: "The administrator tracks where premises begin rather than conclusions." },
    unlockHint: { ko: "가정, 전제, 역추적 같은 구조적 추론이 필요하다.", en: "Requires structural reasoning such as assumptions, premises, or backtracking." },
  },
  {
    clueId: "CL-3",
    title: { ko: "반복되는 층", en: "The Repeating Floor" },
    body: { ko: "같은 문장도 다른 층에서 다시 말하면 다른 기록으로 남습니다.", en: "The same sentence spoken on a different floor is recorded as a different entry." },
    unlockHint: { ko: "반복, 되돌아보기, 혹은 큰 도약이 감지되면 열린다.", en: "Unlocks when repetition, reflection, or a great leap is detected." },
  },
  {
    clueId: "CL-4",
    title: { ko: "구조를 보는 시선", en: "The Gaze That Sees Structure" },
    body: { ko: "탑은 규칙을 시험하는 플레이어를 막지 않습니다. 대신 다른 층으로 보냅니다.", en: "The tower does not stop players who test its rules. Instead, it redirects them to another floor." },
    unlockHint: { ko: "구조 탐색이나 하드 모드 전환에서 드러난다.", en: "Revealed through structural exploration or switching to hard mode." },
  },
  {
    clueId: "CL-5",
    title: { ko: "과확신의 안개", en: "The Fog of Overconfidence" },
    body: { ko: "탑이 흐려질 때는 외부 현상보다 플레이어의 확신이 구조를 덮고 있는 경우가 많습니다.", en: "When the tower grows hazy, it is often the player's conviction, not external phenomena, that obscures the structure." },
    unlockHint: { ko: "검증 없는 단정이 강해지면 열린다.", en: "Unlocks when unverified assertions grow strong." },
  },
  {
    clueId: "CL-6",
    title: { ko: "지워진 층 가설", en: "The Erased Floor Hypothesis" },
    body: { ko: "없는 층은 숨겨진 층이 아니라 기록에서 제거된 층일 수 있습니다.", en: "The missing floor may not be hidden, but removed from the records entirely." },
    unlockHint: { ko: "충분한 단서와 진척이 누적되어야 열린다.", en: "Unlocks when enough clues and progress have accumulated." },
  },
];

export const FRAGMENTS: TheoryFragment[] = [
  {
    fragmentId: "TF-1",
    title: { ko: "방향 우선 규칙", en: "Direction-First Rule" },
    body: { ko: "탑은 답의 정확도보다 발화가 겨누는 방향을 먼저 기록합니다.", en: "The tower records the direction an utterance aims at before its accuracy." },
    unlockHint: { ko: "방향, 질문의 대상, 응답의 축을 직접 언급해 보라.", en: "Try directly mentioning direction, the target of questions, or the axis of response." },
    keywords: ["방향", "질문", "축", "겨냥", "대상"],
  },
  {
    fragmentId: "TF-2",
    title: { ko: "가정 추적 규칙", en: "Assumption-Tracing Rule" },
    body: { ko: "관리자는 결론보다 가정이 시작된 순간을 추적하고 있습니다.", en: "The administrator traces the moment an assumption began rather than the conclusion." },
    unlockHint: { ko: "전제, 가정, 출발점, 역추적을 직접 짚어야 열린다.", en: "You must directly point to premises, assumptions, origins, or backtracking." },
    keywords: ["전제", "가정", "출발점", "역추적", "시작점"],
  },
  {
    fragmentId: "TF-3",
    title: { ko: "삭제된 기록 가설", en: "Erased Record Hypothesis" },
    body: { ko: "없는 층은 숨겨진 층이 아니라 기록에서 지워진 층일 가능성이 큽니다.", en: "The missing floor is likely not hidden but erased from the records." },
    unlockHint: { ko: "삭제, 지워짐, 숨김의 차이를 말하면 열린다.", en: "Unlocks when you articulate the difference between deletion, erasure, and concealment." },
    keywords: ["삭제", "지워진", "지워졌다", "숨겨진", "없어진"],
  },
  {
    fragmentId: "TF-4",
    title: { ko: "반복 재기록 현상", en: "Repetition Re-recording Phenomenon" },
    body: { ko: "같은 문장이라도 다른 층에서 다시 말하면 다른 기록으로 분류됩니다.", en: "Even the same sentence, when spoken on a different floor, is classified as a different record." },
    unlockHint: { ko: "반복과 재진입을 같은 구조로 연결해 보라.", en: "Try connecting repetition and re-entry within the same structure." },
    keywords: ["반복", "다시", "재진입", "같은 문장", "되돌아"],
  },
  {
    fragmentId: "TF-5",
    title: { ko: "과확신 왜곡층", en: "Overconfidence Distortion Layer" },
    body: { ko: "탑이 흐려지는 현상은 외부보다 플레이어의 확신이 구조를 덮을 때 강해집니다.", en: "The tower's blurring intensifies not from external causes but when a player's conviction obscures the structure." },
    unlockHint: { ko: "확신, 오류, 검증, 왜곡을 함께 말할 때 열린다.", en: "Unlocks when you mention conviction, error, verification, and distortion together." },
    keywords: ["확신", "검증", "오류", "왜곡", "안개"],
  },
  {
    fragmentId: "TF-6",
    title: { ko: "최종 기록 문장", en: "The Final Recorded Statement" },
    body: { ko: "정답보다 방향을 기록하고, 숨김보다 삭제를 기록한다는 문장이 최종 해답에 가깝습니다.", en: "A statement that says the tower records direction over answers and deletion over concealment is close to the final answer." },
    unlockHint: { ko: "핵심 개념을 한 문장으로 묶을 준비가 되면 열린다.", en: "Unlocks when you are ready to bind the core concepts into a single sentence." },
    keywords: ["정답", "방향", "기록", "삭제", "층"],
  },
];

export const PROMPT_LIBRARY: PromptSeed[] = [
  { promptId: "P-1", title: { ko: "방향을 겨냥하라", en: "Aim for Direction" }, body: { ko: "탑이 질문 내용보다 방향을 본다면, 지금 당신 문장은 무엇을 향하고 있습니까?", en: "If the tower looks at direction over content, what is your sentence aimed at right now?" } },
  { promptId: "P-2", title: { ko: "가정을 분리하라", en: "Isolate the Assumption" }, body: { ko: "당신의 현재 결론에서 가장 먼저 시작된 가정 하나를 따로 적어보십시오.", en: "Write down the very first assumption underlying your current conclusion." } },
  { promptId: "P-3", title: { ko: "삭제와 숨김을 구분하라", en: "Distinguish Deletion from Concealment" }, body: { ko: "없는 층이 단순히 숨겨진 것인지, 기록에서 지워진 것인지 차이를 설명해 보십시오.", en: "Explain whether the missing floor is merely hidden or erased from the records." } },
  { promptId: "P-4", title: { ko: "반복을 이용하라", en: "Use Repetition" }, body: { ko: "같은 질문을 다른 방식으로 다시 던지면 무엇이 달라지는지 시험해 보십시오.", en: "Try asking the same question in a different way and see what changes." } },
  { promptId: "P-5", title: { ko: "확신을 의심하라", en: "Doubt Your Certainty" }, body: { ko: "지금 가장 자신 있는 문장에서 검증되지 않은 전제를 한 개 골라 흔들어 보십시오.", en: "Pick one unverified premise from your most confident statement and shake it." } },
  { promptId: "P-6", title: { ko: "최종 문장을 준비하라", en: "Prepare the Final Statement" }, body: { ko: "방향, 기록, 삭제된 층을 한 문장에 묶어 최종 기록 후보를 만들어 보십시오.", en: "Bind direction, records, and the deleted floor into one sentence as your final record candidate." } },
];

export const VERDICT_CONCEPTS: Record<string, string[]> = {
  direction: ["방향", "겨냥", "향하고", "축"],
  record: ["기록", "기록한다", "기록으로", "분류"],
  deletion: ["삭제", "지워진", "지워졌다", "지워진 기록"],
  floor: ["층", "삭제된 층", "없는 층"],
};

export const TOWER_CONDITIONS: Record<string, Bi> = {
  active: { ko: "탐사 중", en: "Exploring" },
  warning: { ko: "불안정", en: "Unstable" },
  distorted: { ko: "흐려짐", en: "Distorted" },
  breakthrough: { ko: "기록 돌파", en: "Record Breakthrough" },
  collapse: { ko: "기록 붕괴", en: "Record Collapse" },
  withdrew: { ko: "조사 종료", en: "Investigation Closed" },
};

// IDENTITY_SEAL: PART-2 | role=scenario-data | inputs=none | outputs=constants
