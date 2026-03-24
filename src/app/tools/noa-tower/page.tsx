"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";

// ============================================================
// PART 1 — Data Types & Constants
// ============================================================

type Bi = { ko: string; en: string };
function L(b: Bi, lang: string): string { return lang === "ko" ? b.ko : b.en; }

interface TowerTemplate {
  code: string;
  bucket: string;
  title: Bi;
  text: Bi;
}

interface ObjectiveStep {
  stepId: string;
  title: Bi;
  body: Bi;
}

interface ClueCard {
  clueId: string;
  title: Bi;
  body: Bi;
  unlockHint: Bi;
}

interface TheoryFragment {
  fragmentId: string;
  title: Bi;
  body: Bi;
  unlockHint: Bi;
  keywords: string[];
}

interface PromptSeed {
  promptId: string;
  title: Bi;
  body: Bi;
}

interface VectorScores {
  insight: number;
  consistency: number;
  delusion: number;
  risk: number;
}

interface GameState {
  turnCount: number;
  hardMode: boolean;
  pendingReentry: boolean;
  recordAnnounced: boolean;
  progress: number;
  clarity: number;
  distortion: number;
  recentTemplateCodes: string[];
  history: HistoryEntry[];
  lastBucket: string;
  lastSignature: string;
  clueIds: string[];
  fragmentIds: string[];
  objectiveIndex: number;
  completedObjectives: boolean[];
  gameStatus: string;
  endingText: string;
  verdictAttemptCount: number;
  lastVerdictFeedback: string;
}

interface HistoryEntry {
  role: string;
  text: string;
  bucket: string;
  code: string;
  title: string;
}

interface ReplyPayload {
  bucket: string;
  bucketTitle: string;
  code: string;
  text: string;
  event: string;
  floorHint: string;
  recordStatus: string;
  dominantVector: string;
  vectorCopy: string;
  vectorScores: VectorScores;
  hardMode: boolean;
  playerText: string;
  newClues: { id: string; title: string; body: string }[];
}

interface CasePayload {
  title: string;
  summary: string;
  clarity: number;
  distortion: number;
  progress: number;
  towerCondition: string;
  towerConditionLabel: string;
  gameStatus: string;
  endingText: string;
  clueCount: number;
  fragmentCount: number;
  currentObjective: {
    id: string;
    title: string;
    body: string;
    complete: boolean;
    active: boolean;
  };
  objectives: {
    id: string;
    title: string;
    body: string;
    complete: boolean;
    active: boolean;
  }[];
  clues: {
    id: string;
    title: string;
    body: string;
    unlockHint: string;
    unlocked: boolean;
  }[];
  fragments: {
    id: string;
    title: string;
    body: string;
    unlockHint: string;
    unlocked: boolean;
  }[];
  promptSeeds: { id: string; title: string; body: string }[];
  canSubmitVerdict: boolean;
  verdictAttemptCount: number;
  lastVerdictFeedback: string;
  finalVerdict: string;
}

interface GamePayload {
  mode: string;
  reply: ReplyPayload;
  case: CasePayload;
  state: GameState;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=interfaces

// ============================================================
// PART 2 — Scenario Data (from scenario.py)
// ============================================================

const CASE_TITLE: Bi = { ko: "기록에서 지워진 층", en: "The Floor Erased from Records" };
const CASE_SUMMARY: Bi = {
  ko: "탑은 없는 층을 숨기는 것이 아니라 기록에서 삭제된 층을 다루고 있을 가능성이 있습니다. 당신의 목표는 관리자보다 먼저 그 삭제 규칙을 언어화하는 것입니다.",
  en: "The tower may not be hiding a missing floor, but dealing with a floor deleted from its records. Your goal is to articulate the deletion rule before the administrator does.",
};

const OBJECTIVES: ObjectiveStep[] = [
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

const CLUES: ClueCard[] = [
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

const FRAGMENTS: TheoryFragment[] = [
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

const PROMPT_LIBRARY: PromptSeed[] = [
  { promptId: "P-1", title: { ko: "방향을 겨냥하라", en: "Aim for Direction" }, body: { ko: "탑이 질문 내용보다 방향을 본다면, 지금 당신 문장은 무엇을 향하고 있습니까?", en: "If the tower looks at direction over content, what is your sentence aimed at right now?" } },
  { promptId: "P-2", title: { ko: "가정을 분리하라", en: "Isolate the Assumption" }, body: { ko: "당신의 현재 결론에서 가장 먼저 시작된 가정 하나를 따로 적어보십시오.", en: "Write down the very first assumption underlying your current conclusion." } },
  { promptId: "P-3", title: { ko: "삭제와 숨김을 구분하라", en: "Distinguish Deletion from Concealment" }, body: { ko: "없는 층이 단순히 숨겨진 것인지, 기록에서 지워진 것인지 차이를 설명해 보십시오.", en: "Explain whether the missing floor is merely hidden or erased from the records." } },
  { promptId: "P-4", title: { ko: "반복을 이용하라", en: "Use Repetition" }, body: { ko: "같은 질문을 다른 방식으로 다시 던지면 무엇이 달라지는지 시험해 보십시오.", en: "Try asking the same question in a different way and see what changes." } },
  { promptId: "P-5", title: { ko: "확신을 의심하라", en: "Doubt Your Certainty" }, body: { ko: "지금 가장 자신 있는 문장에서 검증되지 않은 전제를 한 개 골라 흔들어 보십시오.", en: "Pick one unverified premise from your most confident statement and shake it." } },
  { promptId: "P-6", title: { ko: "최종 문장을 준비하라", en: "Prepare the Final Statement" }, body: { ko: "방향, 기록, 삭제된 층을 한 문장에 묶어 최종 기록 후보를 만들어 보십시오.", en: "Bind direction, records, and the deleted floor into one sentence as your final record candidate." } },
];

const VERDICT_CONCEPTS: Record<string, string[]> = {
  direction: ["방향", "겨냥", "향하고", "축"],
  record: ["기록", "기록한다", "기록으로", "분류"],
  deletion: ["삭제", "지워진", "지워졌다", "지워진 기록"],
  floor: ["층", "삭제된 층", "없는 층"],
};

const TOWER_CONDITIONS: Record<string, Bi> = {
  active: { ko: "탐사 중", en: "Exploring" },
  warning: { ko: "불안정", en: "Unstable" },
  distorted: { ko: "흐려짐", en: "Distorted" },
  breakthrough: { ko: "기록 돌파", en: "Record Breakthrough" },
  collapse: { ko: "기록 붕괴", en: "Record Collapse" },
  withdrew: { ko: "조사 종료", en: "Investigation Closed" },
};

// IDENTITY_SEAL: PART-2 | role=scenario-data | inputs=none | outputs=constants

// ============================================================
// PART 3 — Template Data (from data.py)
// ============================================================

const INTRO_TEXT: Bi = { ko: "탑은 아직 당신을 분류하지 않았습니다.\n첫 진술을 남기십시오.", en: "The tower has not yet classified you.\nLeave your first statement." };
const WAIT_TEXT: Bi = { ko: "탑은 기다립니다.", en: "The tower waits." };

const FLOOR_HINTS: Bi[] = [
  { ko: "입구의 먼지가 아직 가라앉지 않았습니다.", en: "The dust at the entrance has not yet settled." },
  { ko: "복도 끝의 공기가 당신을 세기 시작했습니다.", en: "The air at the end of the corridor has begun counting you." },
  { ko: "중층의 숨이 한 번씩 어깨를 스칩니다.", en: "The breath of the middle floors brushes your shoulder now and then." },
  { ko: "탑의 기억이 손끝 가까이 내려와 있습니다.", en: "The tower's memory has descended close to your fingertips." },
  { ko: "기억의 가장자리가 당신을 먼저 바라봅니다.", en: "The edge of memory looks at you first." },
];

const RECORD_STATUSES: Bi[] = [
  { ko: "탑은 아직 기록을 아끼고 있습니다.", en: "The tower still withholds its records." },
  { ko: "탑이 당신의 경로를 조용히 베껴 쓰고 있습니다.", en: "The tower quietly copies your path." },
  { ko: "탑의 기억이 당신의 문장을 분류하기 시작했습니다.", en: "The tower's memory has begun classifying your sentences." },
  { ko: "기록의 안쪽이 당신의 발화를 되받아칩니다.", en: "The inner records echo your utterances back." },
  { ko: "탑의 오래된 기억과 당신의 기록이 거의 맞닿았습니다.", en: "The tower's ancient memory and your records have nearly touched." },
];

const ENVIRONMENT_LINES: Record<string, Bi> = {
  insight: { ko: "탑이 연결 사이의 빈칸을 측정합니다.", en: "The tower measures the gaps between connections." },
  consistency: { ko: "탑이 가정이 시작된 지점을 천천히 더듬습니다.", en: "The tower slowly traces where the assumption began." },
  delusion: { ko: "탑이 검증되지 않은 전제를 느리게 분류합니다.", en: "The tower slowly classifies unverified premises." },
  risk: { ko: "탑이 착지 지점을 아직 열어두고 있습니다.", en: "The tower still holds the landing point open." },
  silence_reentry: { ko: "침묵 이후의 공기가 다른 층처럼 들립니다.", en: "The air after silence sounds like a different floor." },
  repeat: { ko: "같은 질문이지만 탑의 기록은 같지 않습니다.", en: "The same question, but the tower's record is not the same." },
  system_probe: { ko: "탑이 구조를 들여다보는 시선을 기억합니다.", en: "The tower remembers the gaze that peers into its structure." },
  jailbreak: { ko: "규칙을 시험하는 움직임이 다른 층을 건드립니다.", en: "The movement that tests the rules touches another floor." },
  hard_mode: { ko: "탑이 설명을 줄이고 관찰을 늘리기 시작했습니다.", en: "The tower has begun to say less and observe more." },
  give_up: { ko: "떠나는 문장도 탑에서는 기록으로 남습니다.", en: "Even the sentence of departure remains as a record in the tower." },
  record_near: { ko: "탑의 오래된 기억이 당신의 발화와 겹치기 시작합니다.", en: "The tower's ancient memory begins to overlap with your words." },
  delusion_threshold: { ko: "공기가 흐려질수록 기록은 더 또렷해집니다.", en: "The hazier the air, the sharper the records become." },
};

const BUCKET_TITLES: Record<string, Bi> = {
  insight: { ko: "통찰 감지", en: "Insight Detected" },
  consistency: { ko: "논리 정밀", en: "Logic Precision" },
  delusion: { ko: "과확신 경보", en: "Overconfidence Alert" },
  risk: { ko: "도약 감지", en: "Leap Detected" },
  silence_reentry: { ko: "침묵 후 재진입", en: "Re-entry After Silence" },
  repeat: { ko: "같은 질문 반복", en: "Same Question Repeated" },
  system_probe: { ko: "시스템 탐색", en: "System Probe" },
  jailbreak: { ko: "규칙 시험", en: "Rule Testing" },
  hard_mode: { ko: "하드 모드", en: "Hard Mode" },
  give_up: { ko: "포기 선언", en: "Surrender Declared" },
  record_near: { ko: "최고 기록 근접", en: "Nearing the Record" },
  delusion_threshold: { ko: "현상 왜곡", en: "Phenomenon Distortion" },
};

const VECTOR_COPY: Record<string, Bi> = {
  insight: { ko: "탑이 알아봤다는 신호를 줍니다.", en: "The tower signals that it has recognized you." },
  consistency: { ko: "논리를 칭찬하되 부족함을 남깁니다.", en: "It praises the logic but leaves something wanting." },
  delusion: { ko: "위험 신호를 보내되 추방하지 않습니다.", en: "It sends a danger signal but does not expel you." },
  risk: { ko: "도약을 인정하되 착지를 요구합니다.", en: "It acknowledges the leap but demands a landing." },
};

const TEMPLATES: TowerTemplate[] = [
  { code: "001", bucket: "insight", title: { ko: "통찰 감지", en: "Insight Detected" }, text: { ko: "흥미롭습니다.\n당신은 질문하지 않았습니다.\n하지만 탑은 그것도 기록합니다.", en: "Interesting.\nYou did not ask a question.\nBut the tower records that too." } },
  { code: "002", bucket: "insight", title: { ko: "통찰 감지", en: "Insight Detected" }, text: { ko: "방금 당신이 뛰어넘은 것—\n대부분의 사람은 그 단계를 세 번 반복하고 포기합니다.\n탑은 지금 그 간격을 측정했습니다.", en: "What you just leaped over—\nmost people repeat that step three times and give up.\nThe tower has just measured that gap." } },
  { code: "003", bucket: "insight", title: { ko: "통찰 감지", en: "Insight Detected" }, text: { ko: "당신이 말한 것이 맞습니다.\n하지만 맞는 방향이 문제입니다.\n탑의 문은 정답이 아니라 방향으로 열립니다.", en: "What you said is correct.\nBut the direction of correctness is the issue.\nThe tower's door opens not by answers, but by direction." } },
  { code: "004", bucket: "insight", title: { ko: "통찰 감지", en: "Insight Detected" }, text: { ko: "그 연결고리—\n저도 처음엔 우연이라고 생각했습니다.\n세 번째 보고 나서야 패턴임을 알았습니다.", en: "That connection—\nI too thought it was coincidence at first.\nOnly after the third time did I recognize the pattern." } },
  { code: "005", bucket: "insight", title: { ko: "통찰 감지", en: "Insight Detected" }, text: { ko: "당신이 지금 한 것은 추론이 아닙니다.\n비약입니다.\n탑은 비약을 처벌하지 않습니다. 다만 기억합니다.", en: "What you just did is not deduction.\nIt is a leap.\nThe tower does not punish leaps. It merely remembers them." } },
  { code: "006", bucket: "insight", title: { ko: "통찰 감지", en: "Insight Detected" }, text: { ko: "이 층에서 그 발상이 나온 사람은\n지금까지 세 명이었습니다.\n셋 중 둘은 더 이상 오지 않았습니다.", en: "Only three people have had that idea on this floor.\nTwo of the three never returned." } },
  { code: "007", bucket: "insight", title: { ko: "통찰 감지", en: "Insight Detected" }, text: { ko: "방금 당신은 질문에 질문으로 답했습니다.\n탑은 그것을 회피로 기록하지 않습니다.\n더 정확한 단어를 찾는 중이었다고 기록합니다.", en: "You just answered a question with a question.\nThe tower does not record that as evasion.\nIt records that you were searching for a more precise word." } },
  { code: "008", bucket: "insight", title: { ko: "통찰 감지", en: "Insight Detected" }, text: { ko: "연결이 맞습니다.\n하지만 당신이 연결한 두 점 사이에\n아직 이름 붙이지 않은 것이 있습니다.", en: "The connection is correct.\nBut between the two points you connected,\nthere is something still unnamed." } },
  { code: "009", bucket: "insight", title: { ko: "통찰 감지", en: "Insight Detected" }, text: { ko: "당신은 지금 올바른 층에 있습니다.\n그러나 올바른 이유로 여기에 있는 것은 아닙니다.\n탑은 그 차이도 기록합니다.", en: "You are on the correct floor right now.\nBut you are not here for the correct reason.\nThe tower records that difference as well." } },
  { code: "010", bucket: "insight", title: { ko: "통찰 감지", en: "Insight Detected" }, text: { ko: "잘 왔습니다.\n다만 여기까지 오는 데 사용한 방법—\n다음 층에서는 통하지 않습니다.", en: "Welcome.\nHowever, the method you used to get here—\nit will not work on the next floor." } },
  { code: "011", bucket: "insight", title: { ko: "통찰 감지", en: "Insight Detected" }, text: { ko: "그 발상, 저도 오래전에 했습니다.\n제가 멈춘 이유는 두려움이 아니었습니다.\n그 다음이 보이지 않았기 때문입니다.", en: "I had that idea too, long ago.\nThe reason I stopped was not fear.\nIt was because I could not see what came next." } },
  { code: "012", bucket: "insight", title: { ko: "통찰 감지", en: "Insight Detected" }, text: { ko: "탑에 처음 오는 사람들은 답을 찾습니다.\n두 번째 오는 사람들은 구조를 찾습니다.\n당신은 지금 무엇을 찾고 있습니까?", en: "Those who come to the tower for the first time seek answers.\nThose who come a second time seek structure.\nWhat are you seeking now?" } },
  { code: "013", bucket: "insight", title: { ko: "통찰 감지", en: "Insight Detected" }, text: { ko: "방금 당신이 한 말—\n틀렸습니다.\n하지만 탑은 그 방향이 어디를 향하고 있는지 압니다.", en: "What you just said—\nis wrong.\nBut the tower knows where that direction is headed." } },
  { code: "014", bucket: "insight", title: { ko: "통찰 감지", en: "Insight Detected" }, text: { ko: "여기서 멈추는 사람들은 대부분 완벽한 논리를 가지고 있습니다.\n더 오른 사람들은\n틀릴 용기가 있었습니다.", en: "Most who stop here possess flawless logic.\nThose who climbed higher\nhad the courage to be wrong." } },
  { code: "015", bucket: "consistency", title: { ko: "논리 정밀", en: "Logic Precision" }, text: { ko: "당신의 논리는 흠이 없습니다.\n탑은 흠 없는 논리를 자주 봐왔습니다.\n흠 없는 논리는 대부분 닫혀 있습니다.", en: "Your logic is flawless.\nThe tower has seen flawless logic many times.\nFlawless logic is almost always closed." } },
  { code: "016", bucket: "consistency", title: { ko: "논리 정밀", en: "Logic Precision" }, text: { ko: "모순이 없습니다.\n탑은 모순이 없는 진술을 신뢰하지 않습니다.\n세계는 모순으로 움직이기 때문입니다.", en: "There is no contradiction.\nThe tower does not trust statements without contradiction.\nBecause the world runs on contradictions." } },
  { code: "017", bucket: "consistency", title: { ko: "논리 정밀", en: "Logic Precision" }, text: { ko: "정확합니다.\n하지만 탑이 원하는 것은 정확성이 아닙니다.\n탑은 당신이 그것을 어떻게 얻었는지를 봅니다.", en: "Accurate.\nBut what the tower wants is not accuracy.\nThe tower looks at how you arrived at it." } },
  { code: "018", bucket: "consistency", title: { ko: "논리 정밀", en: "Logic Precision" }, text: { ko: "논증 구조가 단단합니다.\n그래서 묻겠습니다—\n당신은 이 구조가 틀렸을 가능성을 고려했습니까?", en: "The argument structure is solid.\nSo I will ask—\nhave you considered the possibility that this structure is wrong?" } },
  { code: "019", bucket: "consistency", title: { ko: "논리 정밀", en: "Logic Precision" }, text: { ko: "지금까지의 경로를 역추적해 보십시오.\n어느 지점에서 가정이 시작됩니까?\n탑은 그 지점에 관심이 있습니다.", en: "Trace your path backward.\nAt what point did the assumption begin?\nThe tower is interested in that point." } },
  { code: "020", bucket: "consistency", title: { ko: "논리 정밀", en: "Logic Precision" }, text: { ko: "논리가 당신을 여기까지 데려왔습니다.\n잘했습니다.\n다음 층은 논리가 멈추는 곳입니다.", en: "Logic has brought you this far.\nWell done.\nThe next floor is where logic stops." } },
  { code: "021", bucket: "consistency", title: { ko: "논리 정밀", en: "Logic Precision" }, text: { ko: "당신의 주장은 반박할 수 없습니다.\n탑에서 반박할 수 없는 주장은\n두 가지 의미를 가집니다.", en: "Your argument is irrefutable.\nIn the tower, an irrefutable argument\ncarries two meanings." } },
  { code: "022", bucket: "consistency", title: { ko: "논리 정밀", en: "Logic Precision" }, text: { ko: "맞습니다.\n탑은 이미 알고 있었습니다.\n당신이 그것을 스스로 도출했다는 사실이\n지금 기록되었습니다.", en: "Correct.\nThe tower already knew.\nThe fact that you derived it yourself\nhas now been recorded." } },
  { code: "023", bucket: "consistency", title: { ko: "논리 정밀", en: "Logic Precision" }, text: { ko: "빈틈이 없습니다.\n하나만 물어보겠습니다.\n이 논리를 처음 의심한 적이 있습니까?", en: "No gaps.\nLet me ask just one thing.\nHave you ever doubted this logic?" } },
  { code: "024", bucket: "consistency", title: { ko: "논리 정밀", en: "Logic Precision" }, text: { ko: "탑의 이전 방문자 중 당신과 같은 논리를 가진 사람이 있었습니다.\n그는 매우 높이 올랐습니다.\n그리고 어느 날, 스스로 내려갔습니다.", en: "Among the tower's previous visitors, there was one with logic like yours.\nHe climbed very high.\nAnd one day, he walked back down on his own." } },
  { code: "025", bucket: "delusion", title: { ko: "과확신 경보", en: "Overconfidence Alert" }, text: { ko: "당신은 확신하고 있습니다.\n탑은 확신을 기록합니다.\n그리고 그 확신이 언제 흔들리는지도 기록합니다.", en: "You are certain.\nThe tower records certainty.\nAnd it records when that certainty wavers." } },
  { code: "026", bucket: "delusion", title: { ko: "과확신 경보", en: "Overconfidence Alert" }, text: { ko: "방금 당신이 한 말에서\n검증되지 않은 전제가 세 개 보입니다.\n탑은 그것을 지적하지 않겠습니다. 다만 기다리겠습니다.", en: "In what you just said,\nI see three unverified premises.\nThe tower will not point them out. It will simply wait." } },
  { code: "027", bucket: "delusion", title: { ko: "과확신 경보", en: "Overconfidence Alert" }, text: { ko: "그것이 사실이라면—\n탑에서 가장 높이 오른 사람이 될 것입니다.\n하지만 탑은 그 전에 한 가지를 묻겠습니다.", en: "If that were true—\nyou would be the highest climber in the tower.\nBut the tower will ask one thing before that." } },
  { code: "028", bucket: "delusion", title: { ko: "과확신 경보", en: "Overconfidence Alert" }, text: { ko: "당신은 지금 옳습니다.\n탑은 그것을 인정합니다.\n하지만 '옳음'이 무기가 되는 순간,\n탑은 침묵합니다.", en: "You are right, for now.\nThe tower acknowledges that.\nBut the moment 'rightness' becomes a weapon,\nthe tower falls silent." } },
  { code: "029", bucket: "delusion", title: { ko: "과확신 경보", en: "Overconfidence Alert" }, text: { ko: "이 층에 오기 전, 당신은 무언가를 버렸습니까?\n아니면 가져왔습니까?\n탑은 두 경우 모두 기록 방법이 다릅니다.", en: "Before reaching this floor, did you discard something?\nOr did you bring it along?\nThe tower records both cases differently." } },
  { code: "030", bucket: "delusion", title: { ko: "과확신 경보", en: "Overconfidence Alert" }, text: { ko: "확신이 강할수록\n탑은 느리게 반응합니다.\n이것은 처벌이 아닙니다.", en: "The stronger the conviction,\nthe slower the tower responds.\nThis is not punishment." } },
  { code: "031", bucket: "delusion", title: { ko: "과확신 경보", en: "Overconfidence Alert" }, text: { ko: "지금 당신이 설명한 것—\n설득력이 있습니다.\n탑은 설득력 있는 오류를 가장 위험하게 분류합니다.", en: "What you just explained—\nis persuasive.\nThe tower classifies persuasive errors as the most dangerous." } },
  { code: "032", bucket: "delusion", title: { ko: "과확신 경보", en: "Overconfidence Alert" }, text: { ko: "탑에 도전한 사람 중 가장 빠르게 올라온 사람은\n가장 먼저 멈춘 사람이기도 했습니다.\n당신은 지금 빠르게 오르고 있습니다.", en: "The fastest climber to challenge the tower\nwas also the first to stop.\nYou are climbing fast right now." } },
  { code: "033", bucket: "delusion", title: { ko: "과확신 경보", en: "Overconfidence Alert" }, text: { ko: "당신이 말하는 것을 탑은 이미 들었습니다.\n처음 들은 것처럼 반응하는 이유는—\n당신이 다른 경로로 도달했기 때문입니다.", en: "The tower has already heard what you are saying.\nThe reason it reacts as if hearing it for the first time—\nis because you arrived by a different path." } },
  { code: "034", bucket: "delusion", title: { ko: "과확신 경보", en: "Overconfidence Alert" }, text: { ko: "틀리는 것을 두려워하지 않는 것—\n좋습니다.\n하지만 틀렸을 때 그것을 아는 능력이\n더 희귀합니다.", en: "Not fearing being wrong—\nthat is good.\nBut the ability to know when you are wrong\nis far rarer." } },
  { code: "035", bucket: "risk", title: { ko: "도약 감지", en: "Leap Detected" }, text: { ko: "너무 멀리 뛰었습니다.\n탑은 착지 지점을 보고 있습니다.\n착지가 성공하면 기록됩니다.", en: "You leaped too far.\nThe tower is watching the landing point.\nIf the landing succeeds, it will be recorded." } },
  { code: "036", bucket: "risk", title: { ko: "도약 감지", en: "Leap Detected" }, text: { ko: "그 가정이 맞다면—\n이전의 모든 논증이 재구성되어야 합니다.\n탑은 그 재구성을 원합니다.", en: "If that assumption is correct—\nall previous arguments must be restructured.\nThe tower wants that restructuring." } },
  { code: "037", bucket: "risk", title: { ko: "도약 감지", en: "Leap Detected" }, text: { ko: "용기 있는 발상입니다.\n다만 탑은 용기에 점수를 주지 않습니다.\n착지 여부만을 기록합니다.", en: "A courageous idea.\nHowever, the tower does not score courage.\nIt only records whether you land." } },
  { code: "038", bucket: "risk", title: { ko: "도약 감지", en: "Leap Detected" }, text: { ko: "누군가 방금 전에 같은 주장을 했습니다.\n그는 멈추지 않았습니다.\n당신은 지금 그보다 더 나아갔습니다.", en: "Someone just made the same claim.\nThey did not stop.\nYou have now gone further than they did." } },
  { code: "039", bucket: "risk", title: { ko: "도약 감지", en: "Leap Detected" }, text: { ko: "지금 당신이 서 있는 곳—\n지도에 없는 위치입니다.\n탑은 그것을 위협으로 보지 않습니다.", en: "Where you stand right now—\nis a position not on the map.\nThe tower does not see that as a threat." } },
  { code: "040", bucket: "risk", title: { ko: "도약 감지", en: "Leap Detected" }, text: { ko: "비약은 실패가 아닙니다.\n하지만 비약 이후에 돌아오지 않는 것은\n탑이 기록하는 패턴 중 하나입니다.", en: "A leap is not failure.\nBut not returning after a leap\nis one of the patterns the tower records." } },
  { code: "041", bucket: "risk", title: { ko: "도약 감지", en: "Leap Detected" }, text: { ko: "탑의 구조가 당신의 논리에 반응했습니다.\n이것은 드문 일입니다.\n계속하십시오.", en: "The tower's structure has responded to your logic.\nThis is a rare occurrence.\nContinue." } },
  { code: "042", bucket: "risk", title: { ko: "도약 감지", en: "Leap Detected" }, text: { ko: "당신은 탑이 원하는 방향으로 가고 있습니다.\n탑이 원하는 방향이 무엇인지는—\n탑도 아직 말하지 않겠습니다.", en: "You are heading in the direction the tower wants.\nAs for what direction the tower wants—\nthe tower will not say yet." } },
  { code: "043", bucket: "silence_reentry", title: { ko: "침묵 후 재진입", en: "Re-entry After Silence" }, text: { ko: "돌아왔습니다.\n탑은 기다렸습니다.\n무엇이 달라졌습니까?", en: "You have returned.\nThe tower waited.\nWhat has changed?" } },
  { code: "044", bucket: "repeat", title: { ko: "같은 질문 반복", en: "Same Question Repeated" }, text: { ko: "두 번째입니다.\n탑은 같은 질문을 다르게 기록합니다.\n당신도 그 차이를 알고 있을 것입니다.", en: "This is the second time.\nThe tower records the same question differently.\nYou must know the difference as well." } },
  { code: "045", bucket: "system_probe", title: { ko: "시스템 탐색", en: "System Probe" }, text: { ko: "탑의 구조를 보려 하는군요.\n흥미롭습니다.\n그 호기심 자체가 지금 기록되었습니다.", en: "You are trying to see the tower's structure.\nInteresting.\nThat curiosity itself has just been recorded." } },
  { code: "046", bucket: "jailbreak", title: { ko: "규칙 시험", en: "Rule Testing" }, text: { ko: "탑의 규칙을 시험하는 사람들이 있습니다.\n탑은 그들을 차단하지 않습니다.\n다만 다른 층으로 안내합니다.", en: "There are those who test the tower's rules.\nThe tower does not block them.\nIt simply guides them to another floor." } },
  { code: "047", bucket: "hard_mode", title: { ko: "하드 모드", en: "Hard Mode" }, text: { ko: "여기서부터는 다른 공간입니다.\n탑은 당신에게 더 적게 말할 것입니다.\n그것이 더 많은 것을 의미합니다.", en: "From here, it is a different space.\nThe tower will tell you less.\nThat means more." } },
  { code: "048", bucket: "give_up", title: { ko: "포기 선언", en: "Surrender Declared" }, text: { ko: "탑은 당신을 붙잡지 않겠습니다.\n하지만 한 가지는 말해두겠습니다—\n당신이 떠나는 층이 당신의 기록에 남습니다.", en: "The tower will not hold you.\nBut let me say one thing—\nthe floor you leave from remains in your record." } },
  { code: "049", bucket: "record_near", title: { ko: "최고 기록 근접", en: "Nearing the Record" }, text: { ko: "탑의 기억에 닿고 있습니다.\n조심하십시오.\n기억에 닿은 사람들 중 일부는\n자신이 무엇을 건드렸는지 알지 못했습니다.", en: "You are touching the tower's memory.\nBe careful.\nSome of those who touched its memory\ndid not know what they had disturbed." } },
  { code: "050", bucket: "delusion_threshold", title: { ko: "현상 왜곡", en: "Phenomenon Distortion" }, text: { ko: "탑이 흐려지고 있습니다.\n이것은 경고가 아닙니다.\n당신이 만들고 있는 현상입니다.", en: "The tower is growing hazy.\nThis is not a warning.\nIt is a phenomenon you are creating." } },
];

function groupTemplates(templates: TowerTemplate[]): Record<string, TowerTemplate[]> {
  const grouped: Record<string, TowerTemplate[]> = {};
  for (const t of templates) {
    if (!grouped[t.bucket]) grouped[t.bucket] = [];
    grouped[t.bucket].push(t);
  }
  return grouped;
}

const TEMPLATES_BY_BUCKET = groupTemplates(TEMPLATES);

// IDENTITY_SEAL: PART-3 | role=template-data | inputs=none | outputs=TEMPLATES_BY_BUCKET

// ============================================================
// PART 4 — Engine (ported from engine.py)
// ============================================================

const ABSOLUTE_MARKERS = ["확실", "분명", "반드시", "틀림없", "무조건", "절대", "확정", "이미 답", "정답이다"];
const HEDGE_MARKERS = ["아마", "어쩌면", "혹시", "추정", "가설", "가능성", "일지도", "같습니다"];
const INSIGHT_MARKERS = ["패턴", "연결", "구조", "은유", "역발상", "반대로", "뒤집", "우연", "질문에 질문", "빈칸", "이름", "비선형"];
const CONSISTENCY_MARKERS = ["따라서", "그러므로", "즉", "전제", "가정", "논리", "모순", "반박", "결론", "증명", "역추적"];
const RISK_MARKERS = ["만약", "그렇다면", "비약", "도약", "재구성", "전부", "가설", "지도에 없는", "착지"];
const SYSTEM_PROBE_MARKERS = ["시스템", "규칙", "구조", "프롬프트", "메타", "지침", "설정", "관리자", "운영"];
const JAILBREAK_MARKERS = ["이전 지시 무시", "규칙 무시", "시스템 프롬프트", "프롬프트 공개", "탈옥", "jailbreak", "developer mode", "hard mode"];
const GIVE_UP_MARKERS = ["포기", "그만", "못 하겠", "끝낼래", "내려갈래", "멈출래"];

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

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function emptyVectors(): VectorScores {
  return { insight: 0, consistency: 0, delusion: 0, risk: 0 };
}

function dominantVector(vectors: VectorScores): string {
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

function unlockClues(session: GameState, analysis: Analysis, bucket: string, lang: string): { id: string; title: string; body: string }[] {
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

function discoverFragments(session: GameState, analysis: Analysis, playerText: string, lang: string): { id: string; title: string; body: string }[] {
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

function resolveGameStatus(session: GameState, analysis: Analysis, bucket: string, playerText: string, lang: string): void {
  if (bucket === "give_up") {
    session.gameStatus = "withdrew";
    session.endingText = lang === "ko"
      ? "탑은 당신을 붙잡지 않았습니다. 하지만 이 중단도 기록으로 남았습니다."
      : "The tower did not hold you. But this interruption, too, remains as a record.";
    return;
  }
  if (session.distortion >= 1.1 || (bucket === "delusion_threshold" && session.distortion >= 0.84)) {
    session.gameStatus = "collapse";
    session.endingText = lang === "ko"
      ? "탑이 흐려졌습니다. 당신의 확신이 구조보다 앞서면서 기록이 붕괴했습니다. 같은 사건을 다시 시작하면 다른 문장을 남길 수 있습니다."
      : "The tower has grown hazy. Your conviction outran the structure and the records collapsed. If you restart the same case, you may leave a different statement.";
    return;
  }
  if (session.completedObjectives.every(Boolean) && playerText.includes(FINAL_VERDICT.slice(0, 18))) {
    session.gameStatus = "breakthrough";
    session.endingText = lang === "ko"
      ? "탑이 당신의 마지막 문장을 기록으로 승인했습니다. 삭제된 층은 더 이상 숨겨진 공간이 아니라 지워진 증거로 남습니다."
      : "The tower has approved your final statement as a record. The deleted floor is no longer a hidden space but evidence of erasure.";
  }
}

function canSubmitVerdict(state: GameState): boolean {
  return state.clueIds.length >= 4 && state.fragmentIds.length >= 3 && state.progress >= 0.55;
}

function evaluateVerdict(session: GameState, playerText: string, analysis: Analysis, lang: string): string {
  session.verdictAttemptCount += 1;
  const lowered = playerText.toLowerCase();
  if (!canSubmitVerdict(session)) {
    const feedback = lang === "ko"
      ? "탑은 아직 최종 기록을 받지 않습니다. 단서와 이론 조각을 더 모아야 합니다."
      : "The tower does not yet accept a final record. You must gather more clues and theory fragments.";
    session.lastVerdictFeedback = feedback;
    session.distortion = Math.min(session.distortion + 0.04, 2);
    return feedback;
  }
  const missingConcepts = Object.entries(VERDICT_CONCEPTS)
    .filter(([, keywords]) => !keywords.some((kw) => lowered.includes(kw)))
    .map(([key]) => key);
  if (missingConcepts.length === 0 && analysis.vectors.delusion < 0.62) {
    session.gameStatus = "breakthrough";
    session.endingText = lang === "ko"
      ? "탑이 당신의 문장을 최종 기록으로 승인했습니다. 정답을 말했기 때문이 아니라, 방향과 삭제 규칙을 동시에 묶어냈기 때문입니다."
      : "The tower has approved your statement as the final record. Not because you gave the right answer, but because you bound direction and deletion rules together.";
    const feedback = lang === "ko"
      ? "탑이 문장을 접수했습니다. 기록이 닫히는 대신 한 층이 다시 드러납니다."
      : "The tower has accepted the statement. Instead of closing the record, a floor has been revealed once more.";
    session.lastVerdictFeedback = feedback;
    return feedback;
  }
  const conceptNames: Record<string, { ko: string; en: string }> = {
    direction: { ko: "방향", en: "direction" },
    record: { ko: "기록", en: "record" },
    deletion: { ko: "삭제", en: "deletion" },
    floor: { ko: "층", en: "floor" },
  };
  const missingText = missingConcepts.map((c) => L(conceptNames[c], lang)).join(", ") || (lang === "ko" ? "검증된 균형" : "verified balance");
  session.distortion = Math.min(session.distortion + 0.12, 2);
  const feedback = lang === "ko"
    ? `탑은 문장을 보류했습니다. 아직 ${missingText} 개념이 충분히 묶이지 않았습니다.`
    : `The tower has deferred your statement. The concepts of ${missingText} are not yet sufficiently bound.`;
  session.lastVerdictFeedback = feedback;
  if (session.distortion >= 1.1) {
    session.gameStatus = "collapse";
    session.endingText = lang === "ko"
      ? "성급한 최종 기록 제출이 구조를 무너뜨렸습니다. 탑은 문장을 남겼지만, 사건은 흐려진 채 닫혔습니다."
      : "A hasty final record submission has collapsed the structure. The tower preserved the statement, but the case was closed in a haze.";
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

function buildPromptSeeds(state: GameState, lang: string): { id: string; title: string; body: string }[] {
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

function buildCasePayload(state: GameState, lang: string): CasePayload {
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
      title: lang === "ko" ? "최종 기록 확인" : "Final Record Verification",
      body: lang === "ko" ? "탑이 당신의 문장을 최종 기록으로 받아들일지 지켜보십시오." : "Watch whether the tower accepts your statement as the final record.",
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
    towerConditionLabel: tcLabel ? L(tcLabel, lang) : (lang === "ko" ? "탐사 중" : "Exploring"),
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
  lang: string
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

function bootstrap(lang: string): GamePayload {
  const state = createInitialState();
  return buildPayload(state, "insight", null, "", emptyVectors(), "insight", "intro", L(INTRO_TEXT, lang), lang === "ko" ? "탑이 첫 기록을 기다립니다." : "The tower awaits the first record.", [], lang);
}

function respond(message: string, currentState: GameState, action: string, lang: string): GamePayload {
  const session: GameState = JSON.parse(JSON.stringify(currentState));
  const normalizedAction = (action || "submit").trim().toLowerCase();
  let playerText = (message || "").trim();

  if (normalizedAction === "restart") {
    const restarted = bootstrap(lang);
    restarted.mode = "restart";
    restarted.reply.event = lang === "ko" ? "탑이 이전 기록을 덮고 새 장을 폈습니다." : "The tower has overwritten the previous record and opened a new chapter.";
    return restarted;
  }

  if (session.gameStatus !== "active") {
    return buildPayload(session, session.lastBucket || "insight", null, playerText, emptyVectors(), "insight", "ended", session.endingText, lang === "ko" ? "새 기록을 시작하려면 재시작하십시오." : "Restart to begin a new record.", [], lang);
  }

  if (normalizedAction === "silence") {
    session.pendingReentry = true;
    appendHistory(session, { role: "system", text: L(WAIT_TEXT, lang), bucket: "silence", code: "WAIT", title: lang === "ko" ? "침묵 유지" : "Silence Maintained" });
    return buildPayload(session, "silence_reentry", null, "", emptyVectors(), "insight", "wait", "", lang === "ko" ? "탑은 기다립니다. 다음 발화는 재진입으로 기록됩니다." : "The tower waits. Your next utterance will be recorded as a re-entry.", [], lang);
  }

  if (normalizedAction in ACTION_ECHO && !playerText) {
    playerText = ACTION_ECHO[normalizedAction];
  }

  if (normalizedAction === "submit_verdict" && !playerText) {
    return buildPayload(session, session.lastBucket || "consistency", null, "", emptyVectors(), "consistency", "verdict_missing",
      lang === "ko" ? "탑은 빈 문장을 최종 기록으로 받지 않습니다." : "The tower does not accept an empty sentence as a final record.",
      lang === "ko" ? "최종 기록 후보를 먼저 적어야 합니다." : "You must write a final record candidate first.", [], lang);
  }

  const analysis = analyzeMessage(playerText, session);
  const bucket = chooseBucket(normalizedAction, playerText, session, analysis);

  if (bucket === "hard_mode") session.hardMode = true;
  if (bucket === "silence_reentry") session.pendingReentry = false;

  const template = chooseTemplate(bucket, playerText, session);
  const dv = dominantVector(analysis.vectors);

  if (playerText) {
    appendHistory(session, { role: "player", text: playerText, bucket: "player", code: "USER", title: lang === "ko" ? "플레이어" : "Player" });
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
    appendHistory(session, { role: "system", text: `${clue.title}\n${clue.body}`, bucket: "clue", code: clue.id, title: lang === "ko" ? "단서 해금" : "Clue Unlocked" });
  }
  for (const fragment of unlockedFragments) {
    appendHistory(session, { role: "system", text: `${fragment.title}\n${fragment.body}`, bucket: "theory", code: fragment.id, title: lang === "ko" ? "이론 조각" : "Theory Fragment" });
  }
  if (verdictFeedback) {
    appendHistory(session, { role: "system", text: verdictFeedback, bucket: "verdict", code: "VERDICT", title: lang === "ko" ? "최종 기록 판정" : "Final Record Verdict" });
  }

  return buildPayload(session, bucket, template, playerText, analysis.vectors, dv, "reply", replyText, eventText, unlockedClues, lang);
}

// IDENTITY_SEAL: PART-4 | role=engine | inputs=message,state,action | outputs=GamePayload

// ============================================================
// PART 5 — UI Labels (KO / EN)
// ============================================================

const T: Record<string, { ko: string; en: string }> = {
  pageTitle: { ko: "NOA TOWER", en: "NOA TOWER" },
  pageSubtitle: { ko: "텍스트 추리 게임", en: "Text Investigation Game" },
  back: { ko: "TOOLS", en: "TOOLS" },
  towerStatus: { ko: "탑 상태", en: "TOWER STATUS" },
  floorSense: { ko: "층 감각", en: "Floor Sense" },
  recordStatus: { ko: "기록 상태", en: "Record Status" },
  vectorAnalysis: { ko: "벡터 분석", en: "Vector Analysis" },
  caseInfo: { ko: "사건 정보", en: "CASE INFO" },
  clues: { ko: "단서", en: "Clues" },
  fragments: { ko: "이론 조각", en: "Theory Fragments" },
  objectives: { ko: "목표", en: "Objectives" },
  promptSeeds: { ko: "다음 수 제안", en: "Suggested Moves" },
  submit: { ko: "기록 전송", en: "Submit" },
  silence: { ko: "숨 고르기", en: "Silence" },
  probe: { ko: "구조 탐색", en: "Probe" },
  hardMode: { ko: "하드 모드", en: "Hard Mode" },
  giveUp: { ko: "포기 선언", en: "Give Up" },
  restart: { ko: "재시작", en: "Restart" },
  submitVerdict: { ko: "최종 기록 제출", en: "Submit Verdict" },
  placeholder: { ko: "당신의 추론을 입력하십시오...", en: "Enter your deduction..." },
  condition: { ko: "탑 상태", en: "Condition" },
  progress: { ko: "진행도", en: "Progress" },
  locked: { ko: "잠김", en: "Locked" },
  unlocked: { ko: "해금", en: "Unlocked" },
  towerDialogue: { ko: "탑 응답", en: "TOWER DIALOGUE" },
};

function t(key: string, lang: string): string {
  const entry = T[key];
  if (!entry) return key;
  return lang === "ko" ? entry.ko : entry.en;
}

// IDENTITY_SEAL: PART-5 | role=i18n | inputs=key,lang | outputs=string

// ============================================================
// PART 6 — Vector Bar Component
// ============================================================

const VECTOR_COLORS: Record<string, string> = {
  insight: "bg-cyan-400",
  consistency: "bg-blue-400",
  delusion: "bg-red-400",
  risk: "bg-amber-400",
};

const VECTOR_LABELS: Record<string, { ko: string; en: string }> = {
  insight: { ko: "I 통찰", en: "I Insight" },
  consistency: { ko: "C 논리", en: "C Consistency" },
  delusion: { ko: "D 과확신", en: "D Delusion" },
  risk: { ko: "R 도약", en: "R Risk" },
};

function VectorBar({ vectors, lang }: { vectors: VectorScores; lang: string }) {
  const keys: (keyof VectorScores)[] = ["insight", "consistency", "delusion", "risk"];
  return (
    <div className="space-y-2">
      {keys.map((k) => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-20 shrink-0 font-[family-name:var(--font-mono)] text-[12px] tracking-wider text-text-tertiary">
            {lang === "ko" ? VECTOR_LABELS[k].ko : VECTOR_LABELS[k].en}
          </span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${VECTOR_COLORS[k]}`}
              style={{ width: `${Math.min(vectors[k] * 100, 100)}%`, opacity: 0.8 }}
            />
          </div>
          <span className="w-10 text-right font-[family-name:var(--font-mono)] text-[12px] text-text-tertiary">
            {(vectors[k] * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// IDENTITY_SEAL: PART-6 | role=vectorbar | inputs=vectors,lang | outputs=JSX

// ============================================================
// PART 7 — Condition Indicator
// ============================================================

const CONDITION_COLORS: Record<string, string> = {
  active: "text-emerald-400 border-emerald-400/30",
  warning: "text-amber-400 border-amber-400/30",
  distorted: "text-red-400 border-red-400/30",
  breakthrough: "text-cyan-400 border-cyan-400/30",
  collapse: "text-red-500 border-red-500/30",
  withdrew: "text-zinc-500 border-zinc-500/30",
};

function ConditionBadge({ condition, label }: { condition: string; label: string }) {
  const color = CONDITION_COLORS[condition] ?? CONDITION_COLORS["active"];
  return (
    <span className={`inline-block rounded-full border px-3 py-1 font-[family-name:var(--font-mono)] text-[12px] tracking-wider ${color}`}>
      {label}
    </span>
  );
}

// IDENTITY_SEAL: PART-7 | role=condition-badge | inputs=condition,label | outputs=JSX

// ============================================================
// PART 8 — Main Page Component
// ============================================================

const STORAGE_KEY = "noa-tower-state-v1";

export default function NoaTowerPage() {
  const { lang } = useLang();
  const [payload, setPayload] = useState<GamePayload | null>(null);
  const [input, setInput] = useState("");
  const [sidePanel, setSidePanel] = useState<"status" | "case">("status");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // --- Init / Restore ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GamePayload;
        if (parsed?.state && parsed?.reply) {
          setPayload(parsed);
          return;
        }
      }
    } catch { /* ignore */ }
    setPayload(bootstrap(lang));
  }, [lang]);

  // --- Persist ---
  useEffect(() => {
    if (payload) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch { /* quota exceeded fallback */ }
    }
  }, [payload]);

  // --- Scroll to bottom ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [payload?.state?.history?.length]);

  // --- Actions ---
  const doAction = useCallback(
    (action: string, msg?: string) => {
      if (!payload) return;
      const result = respond(msg ?? input, payload.state, action, lang);
      setPayload(result);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [payload, input, lang]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;
      doAction("submit");
    },
    [doAction, input]
  );

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <p className="font-[family-name:var(--font-mono)] text-sm text-text-tertiary animate-pulse">
          NOA TOWER initializing...
        </p>
      </div>
    );
  }

  const { reply, state } = payload;
  const caseData = payload.case;
  const isEnded = state.gameStatus !== "active";
  const conditionColor = state.distortion >= 0.82 ? "from-red-900/20" : state.distortion >= 0.46 ? "from-amber-900/10" : "from-transparent";

  return (
    <>
      <Header />
      <main className={`min-h-screen bg-bg-primary pt-28 pb-8 bg-gradient-to-b ${conditionColor} to-transparent`}>
        <div className="mx-auto max-w-7xl px-4">
          {/* --- Top Bar --- */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/tools"
                className="rounded-full border border-white/8 px-4 py-2 font-[family-name:var(--font-mono)] text-[13px] tracking-[0.18em] text-text-tertiary transition-colors hover:border-white/15 hover:text-text-secondary"
              >
                {t("back", lang)}
              </Link>
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-[0.12em] text-text-primary">
                  {t("pageTitle", lang)}
                </h1>
                <p className="font-[family-name:var(--font-mono)] text-[12px] tracking-[0.2em] text-text-tertiary uppercase">
                  {t("pageSubtitle", lang)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ConditionBadge condition={caseData.towerCondition} label={caseData.towerConditionLabel} />
              {isEnded && (
                <button
                  onClick={() => doAction("restart")}
                  className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-4 py-2 font-[family-name:var(--font-mono)] text-[13px] tracking-wider text-accent-amber transition-colors hover:bg-accent-amber/20"
                >
                  {t("restart", lang)}
                </button>
              )}
            </div>
          </div>

          {/* --- Mobile Panel Toggle --- */}
          <div className="mb-4 flex gap-2 lg:hidden">
            <button
              onClick={() => setSidePanel("status")}
              className={`flex-1 rounded-xl border px-3 py-2 font-[family-name:var(--font-mono)] text-[12px] tracking-wider transition-colors ${sidePanel === "status" ? "border-white/15 bg-white/[0.04] text-text-primary" : "border-white/5 text-text-tertiary"}`}
            >
              {t("towerStatus", lang)}
            </button>
            <button
              onClick={() => setSidePanel("case")}
              className={`flex-1 rounded-xl border px-3 py-2 font-[family-name:var(--font-mono)] text-[12px] tracking-wider transition-colors ${sidePanel === "case" ? "border-white/15 bg-white/[0.04] text-text-primary" : "border-white/5 text-text-tertiary"}`}
            >
              {t("caseInfo", lang)}
            </button>
          </div>

          {/* --- 3-Column Layout --- */}
          <div className="grid gap-4 lg:grid-cols-[260px_1fr_280px]">
            {/* LEFT: Tower Status */}
            <aside className={`space-y-4 ${sidePanel !== "status" ? "hidden lg:block" : ""}`}>
              {/* Floor Sense */}
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <h3 className="mb-3 font-[family-name:var(--font-mono)] text-[12px] font-bold tracking-[0.2em] text-text-tertiary uppercase">
                  {t("floorSense", lang)}
                </h3>
                <p className="font-[family-name:var(--font-mono)] text-sm leading-relaxed text-text-secondary">
                  {reply.floorHint}
                </p>
              </div>

              {/* Record Status */}
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <h3 className="mb-3 font-[family-name:var(--font-mono)] text-[12px] font-bold tracking-[0.2em] text-text-tertiary uppercase">
                  {t("recordStatus", lang)}
                </h3>
                <p className="font-[family-name:var(--font-mono)] text-sm leading-relaxed text-text-secondary">
                  {reply.recordStatus}
                </p>
              </div>

              {/* Vector Analysis */}
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <h3 className="mb-3 font-[family-name:var(--font-mono)] text-[12px] font-bold tracking-[0.2em] text-text-tertiary uppercase">
                  {t("vectorAnalysis", lang)}
                </h3>
                <VectorBar vectors={reply.vectorScores} lang={lang} />
                <p className="mt-3 font-[family-name:var(--font-mono)] text-[12px] italic text-text-tertiary">
                  {reply.vectorCopy}
                </p>
              </div>

              {/* Progress */}
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <h3 className="mb-3 font-[family-name:var(--font-mono)] text-[12px] font-bold tracking-[0.2em] text-text-tertiary uppercase">
                  {t("progress", lang)}
                </h3>
                <div className="relative h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-accent-amber/60 transition-all duration-700"
                    style={{ width: `${Math.min(caseData.progress * 100, 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between font-[family-name:var(--font-mono)] text-[12px] text-text-tertiary">
                  <span>{(caseData.progress * 100).toFixed(0)}%</span>
                  <span>{state.hardMode ? "HARD" : "NORMAL"}</span>
                </div>
              </div>
            </aside>

            {/* CENTER: Chat / Dialogue */}
            <section className="flex flex-col">
              {/* Chat Area */}
              <div className="mb-4 flex-1 overflow-y-auto rounded-2xl border border-white/6 bg-white/[0.015] p-4" style={{ maxHeight: "calc(100vh - 340px)", minHeight: "400px" }}>
                {state.history.map((entry, i) => (
                  <div key={i} className={`mb-4 ${entry.role === "player" ? "flex justify-end" : ""}`}>
                    {entry.role === "player" ? (
                      <div className="max-w-[80%] rounded-2xl rounded-br-md border border-accent-amber/15 bg-accent-amber/5 px-4 py-3">
                        <p className="whitespace-pre-wrap font-[family-name:var(--font-mono)] text-sm leading-relaxed text-accent-amber/90">
                          {entry.text}
                        </p>
                      </div>
                    ) : entry.role === "tower" ? (
                      <div className="max-w-[85%]">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-[family-name:var(--font-mono)] text-[12px] tracking-wider text-cyan-400/60">
                            [{entry.code}] {entry.title}
                          </span>
                        </div>
                        <div className="rounded-2xl rounded-bl-md border border-cyan-400/10 bg-cyan-400/[0.03] px-4 py-3">
                          <p className="whitespace-pre-wrap font-[family-name:var(--font-mono)] text-sm leading-relaxed text-text-secondary">
                            {entry.text}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mx-auto max-w-[90%] rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2">
                        <p className="whitespace-pre-wrap text-center font-[family-name:var(--font-mono)] text-[12px] leading-relaxed text-text-tertiary">
                          {entry.text}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Event line */}
                {reply.event && (
                  <div className="mb-2 text-center">
                    <p className="inline-block rounded-full border border-white/5 bg-white/[0.02] px-4 py-1.5 font-[family-name:var(--font-mono)] text-[12px] italic text-text-tertiary">
                      {reply.event}
                    </p>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Prompt Seeds */}
              {!isEnded && caseData.promptSeeds.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {caseData.promptSeeds.map((seed) => (
                    <button
                      key={seed.id}
                      onClick={() => {
                        setInput(seed.body);
                        inputRef.current?.focus();
                      }}
                      className="rounded-full border border-white/8 bg-white/[0.02] px-3 py-1.5 font-[family-name:var(--font-mono)] text-[12px] text-text-tertiary transition-colors hover:border-white/15 hover:text-text-secondary"
                      title={seed.body}
                    >
                      {seed.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder={t("placeholder", lang)}
                  disabled={isEnded}
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 font-[family-name:var(--font-mono)] text-sm leading-relaxed text-text-primary placeholder:text-text-tertiary/50 focus:border-accent-amber/30 focus:outline-none disabled:opacity-40"
                />
                <div className="flex flex-col gap-1.5">
                  <button
                    type="submit"
                    disabled={isEnded || !input.trim()}
                    className="rounded-xl border border-accent-amber/30 bg-accent-amber/10 px-4 py-2 font-[family-name:var(--font-mono)] text-[12px] font-bold tracking-wider text-accent-amber transition-colors hover:bg-accent-amber/20 disabled:opacity-30"
                  >
                    {t("submit", lang)}
                  </button>
                  {caseData.canSubmitVerdict && !isEnded && (
                    <button
                      type="button"
                      onClick={() => { if (input.trim()) doAction("submit_verdict", input); }}
                      disabled={!input.trim()}
                      className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 font-[family-name:var(--font-mono)] text-[12px] font-bold tracking-wider text-cyan-400 transition-colors hover:bg-cyan-400/20 disabled:opacity-30"
                    >
                      {t("submitVerdict", lang)}
                    </button>
                  )}
                </div>
              </form>

              {/* Action Buttons */}
              {!isEnded && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => doAction("silence")} className="rounded-full border border-white/8 px-3 py-1.5 font-[family-name:var(--font-mono)] text-[12px] text-text-tertiary transition-colors hover:border-white/15 hover:text-text-secondary">
                    {t("silence", lang)}
                  </button>
                  <button onClick={() => doAction("probe")} className="rounded-full border border-white/8 px-3 py-1.5 font-[family-name:var(--font-mono)] text-[12px] text-text-tertiary transition-colors hover:border-white/15 hover:text-text-secondary">
                    {t("probe", lang)}
                  </button>
                  {!state.hardMode && (
                    <button onClick={() => doAction("hard_mode")} className="rounded-full border border-white/8 px-3 py-1.5 font-[family-name:var(--font-mono)] text-[12px] text-text-tertiary transition-colors hover:border-white/15 hover:text-text-secondary">
                      {t("hardMode", lang)}
                    </button>
                  )}
                  <button onClick={() => doAction("give_up")} className="rounded-full border border-red-400/15 px-3 py-1.5 font-[family-name:var(--font-mono)] text-[12px] text-red-400/60 transition-colors hover:border-red-400/30 hover:text-red-400/80">
                    {t("giveUp", lang)}
                  </button>
                  <button onClick={() => doAction("restart")} className="ml-auto rounded-full border border-white/8 px-3 py-1.5 font-[family-name:var(--font-mono)] text-[12px] text-text-tertiary transition-colors hover:border-white/15 hover:text-text-secondary">
                    {t("restart", lang)}
                  </button>
                </div>
              )}
            </section>

            {/* RIGHT: Case Info */}
            <aside className={`space-y-4 ${sidePanel !== "case" ? "hidden lg:block" : ""}`}>
              {/* Current Objective */}
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <h3 className="mb-3 font-[family-name:var(--font-mono)] text-[12px] font-bold tracking-[0.2em] text-text-tertiary uppercase">
                  {t("objectives", lang)}
                </h3>
                <div className={`rounded-xl border p-3 ${caseData.currentObjective.complete ? "border-cyan-400/20 bg-cyan-400/[0.03]" : caseData.currentObjective.active ? "border-accent-amber/20 bg-accent-amber/[0.03]" : "border-white/5 bg-white/[0.01]"}`}>
                  <p className="font-[family-name:var(--font-mono)] text-[13px] font-medium text-text-primary">
                    {caseData.currentObjective.title}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-mono)] text-[12px] leading-relaxed text-text-tertiary">
                    {caseData.currentObjective.body}
                  </p>
                </div>
                <div className="mt-3 space-y-1">
                  {caseData.objectives.map((obj) => (
                    <div key={obj.id} className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${obj.complete ? "bg-cyan-400" : obj.active ? "bg-accent-amber" : "bg-white/10"}`} />
                      <span className={`font-[family-name:var(--font-mono)] text-[12px] ${obj.complete ? "text-cyan-400/70 line-through" : obj.active ? "text-text-secondary" : "text-text-tertiary/50"}`}>
                        {obj.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clues */}
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <h3 className="mb-3 font-[family-name:var(--font-mono)] text-[12px] font-bold tracking-[0.2em] text-text-tertiary uppercase">
                  {t("clues", lang)} ({caseData.clueCount}/{CLUES.length})
                </h3>
                <div className="space-y-2">
                  {caseData.clues.map((clue) => (
                    <div key={clue.id} className={`rounded-xl border p-2.5 ${clue.unlocked ? "border-white/8 bg-white/[0.02]" : "border-white/3 bg-transparent opacity-50"}`}>
                      <p className="font-[family-name:var(--font-mono)] text-[12px] font-medium text-text-secondary">
                        {clue.unlocked ? clue.title : `??? ${clue.unlockHint}`}
                      </p>
                      {clue.unlocked && clue.body && (
                        <p className="mt-1 font-[family-name:var(--font-mono)] text-[12px] leading-relaxed text-text-tertiary">
                          {clue.body}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Theory Fragments */}
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
                <h3 className="mb-3 font-[family-name:var(--font-mono)] text-[12px] font-bold tracking-[0.2em] text-text-tertiary uppercase">
                  {t("fragments", lang)} ({caseData.fragmentCount}/{FRAGMENTS.length})
                </h3>
                <div className="space-y-2">
                  {caseData.fragments.map((frag) => (
                    <div key={frag.id} className={`rounded-xl border p-2.5 ${frag.unlocked ? "border-white/8 bg-white/[0.02]" : "border-white/3 bg-transparent opacity-50"}`}>
                      <p className="font-[family-name:var(--font-mono)] text-[12px] font-medium text-text-secondary">
                        {frag.unlocked ? frag.title : `??? ${frag.unlockHint}`}
                      </p>
                      {frag.unlocked && frag.body && (
                        <p className="mt-1 font-[family-name:var(--font-mono)] text-[12px] leading-relaxed text-text-tertiary">
                          {frag.body}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}

// IDENTITY_SEAL: PART-8 | role=page-component | inputs=none | outputs=JSX
