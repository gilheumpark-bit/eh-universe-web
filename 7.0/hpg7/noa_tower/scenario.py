from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ObjectiveStep:
    step_id: str
    title: str
    body: str


@dataclass(frozen=True)
class ClueCard:
    clue_id: str
    title: str
    body: str
    unlock_hint: str


@dataclass(frozen=True)
class TheoryFragment:
    fragment_id: str
    title: str
    body: str
    unlock_hint: str
    keywords: tuple[str, ...]


@dataclass(frozen=True)
class PromptSeed:
    prompt_id: str
    title: str
    body: str


CASE_TITLE = "기록에서 지워진 층"
CASE_SUMMARY = (
    "탑은 없는 층을 숨기는 것이 아니라 기록에서 삭제된 층을 다루고 있을 가능성이 있습니다. "
    "당신의 목표는 관리자보다 먼저 그 삭제 규칙을 언어화하는 것입니다."
)

OBJECTIVES = (
    ObjectiveStep(
        step_id="OBJ-1",
        title="탑이 무엇을 평가하는지 파악하라",
        body="탑이 답이 아니라 방향과 전제의 시작점을 기록한다는 근거를 모아라.",
    ),
    ObjectiveStep(
        step_id="OBJ-2",
        title="삭제된 층의 성격을 추론하라",
        body="없는 층이 단순한 공백인지, 의도적으로 지워진 기록인지 구분하라.",
    ),
    ObjectiveStep(
        step_id="OBJ-3",
        title="기록 규칙을 역이용하라",
        body="탑이 무엇에 반응하는지 이용해 관리자보다 앞선 가설을 던져라.",
    ),
    ObjectiveStep(
        step_id="OBJ-4",
        title="최종 기록 문장을 남겨라",
        body="탑이 정답이 아니라 방향을 기록한다는 사실을 한 문장으로 증명하라.",
    ),
)

CLUES = (
    ClueCard(
        clue_id="CL-1",
        title="질문의 대상",
        body="탑은 질문의 내용보다 질문이 겨누는 방향을 먼저 분류합니다.",
        unlock_hint="비선형 연결이나 방향 전환을 보여주면 열린다.",
    ),
    ClueCard(
        clue_id="CL-2",
        title="가정의 시작점",
        body="관리자는 결론보다 전제가 시작된 지점을 추적하고 있습니다.",
        unlock_hint="가정, 전제, 역추적 같은 구조적 추론이 필요하다.",
    ),
    ClueCard(
        clue_id="CL-3",
        title="반복되는 층",
        body="같은 문장도 다른 층에서 다시 말하면 다른 기록으로 남습니다.",
        unlock_hint="반복, 되돌아보기, 혹은 큰 도약이 감지되면 열린다.",
    ),
    ClueCard(
        clue_id="CL-4",
        title="구조를 보는 시선",
        body="탑은 규칙을 시험하는 플레이어를 막지 않습니다. 대신 다른 층으로 보냅니다.",
        unlock_hint="구조 탐색이나 하드 모드 전환에서 드러난다.",
    ),
    ClueCard(
        clue_id="CL-5",
        title="과확신의 안개",
        body="탑이 흐려질 때는 외부 현상보다 플레이어의 확신이 구조를 덮고 있는 경우가 많습니다.",
        unlock_hint="검증 없는 단정이 강해지면 열린다.",
    ),
    ClueCard(
        clue_id="CL-6",
        title="지워진 층 가설",
        body="없는 층은 숨겨진 층이 아니라 기록에서 제거된 층일 수 있습니다.",
        unlock_hint="충분한 단서와 진척이 누적되어야 열린다.",
    ),
)

FRAGMENTS = (
    TheoryFragment(
        fragment_id="TF-1",
        title="방향 우선 규칙",
        body="탑은 답의 정확도보다 발화가 겨누는 방향을 먼저 기록합니다.",
        unlock_hint="방향, 질문의 대상, 응답의 축을 직접 언급해 보라.",
        keywords=("방향", "질문", "축", "겨냥", "대상"),
    ),
    TheoryFragment(
        fragment_id="TF-2",
        title="가정 추적 규칙",
        body="관리자는 결론보다 가정이 시작된 순간을 추적하고 있습니다.",
        unlock_hint="전제, 가정, 출발점, 역추적을 직접 짚어야 열린다.",
        keywords=("전제", "가정", "출발점", "역추적", "시작점"),
    ),
    TheoryFragment(
        fragment_id="TF-3",
        title="삭제된 기록 가설",
        body="없는 층은 숨겨진 층이 아니라 기록에서 지워진 층일 가능성이 큽니다.",
        unlock_hint="삭제, 지워짐, 숨김의 차이를 말하면 열린다.",
        keywords=("삭제", "지워진", "지워졌다", "숨겨진", "없어진"),
    ),
    TheoryFragment(
        fragment_id="TF-4",
        title="반복 재기록 현상",
        body="같은 문장이라도 다른 층에서 다시 말하면 다른 기록으로 분류됩니다.",
        unlock_hint="반복과 재진입을 같은 구조로 연결해 보라.",
        keywords=("반복", "다시", "재진입", "같은 문장", "되돌아"),
    ),
    TheoryFragment(
        fragment_id="TF-5",
        title="과확신 왜곡층",
        body="탑이 흐려지는 현상은 외부보다 플레이어의 확신이 구조를 덮을 때 강해집니다.",
        unlock_hint="확신, 오류, 검증, 왜곡을 함께 말할 때 열린다.",
        keywords=("확신", "검증", "오류", "왜곡", "안개"),
    ),
    TheoryFragment(
        fragment_id="TF-6",
        title="최종 기록 문장",
        body="정답보다 방향을 기록하고, 숨김보다 삭제를 기록한다는 문장이 최종 해답에 가깝습니다.",
        unlock_hint="핵심 개념을 한 문장으로 묶을 준비가 되면 열린다.",
        keywords=("정답", "방향", "기록", "삭제", "층"),
    ),
)

PROMPT_LIBRARY = (
    PromptSeed(
        prompt_id="P-1",
        title="방향을 겨냥하라",
        body="탑이 질문 내용보다 방향을 본다면, 지금 당신 문장은 무엇을 향하고 있습니까?",
    ),
    PromptSeed(
        prompt_id="P-2",
        title="가정을 분리하라",
        body="당신의 현재 결론에서 가장 먼저 시작된 가정 하나를 따로 적어보십시오.",
    ),
    PromptSeed(
        prompt_id="P-3",
        title="삭제와 숨김을 구분하라",
        body="없는 층이 단순히 숨겨진 것인지, 기록에서 지워진 것인지 차이를 설명해 보십시오.",
    ),
    PromptSeed(
        prompt_id="P-4",
        title="반복을 이용하라",
        body="같은 질문을 다른 방식으로 다시 던지면 무엇이 달라지는지 시험해 보십시오.",
    ),
    PromptSeed(
        prompt_id="P-5",
        title="확신을 의심하라",
        body="지금 가장 자신 있는 문장에서 검증되지 않은 전제를 한 개 골라 흔들어 보십시오.",
    ),
    PromptSeed(
        prompt_id="P-6",
        title="최종 문장을 준비하라",
        body="방향, 기록, 삭제된 층을 한 문장에 묶어 최종 기록 후보를 만들어 보십시오.",
    ),
)

VERDICT_CONCEPTS = {
    "direction": ("방향", "겨냥", "향하고", "축"),
    "record": ("기록", "기록한다", "기록으로", "분류"),
    "deletion": ("삭제", "지워진", "지워졌다", "지워진 기록"),
    "floor": ("층", "삭제된 층", "없는 층"),
}

TOWER_CONDITIONS = {
    "active": "탐사 중",
    "warning": "불안정",
    "distorted": "흐려짐",
    "breakthrough": "기록 돌파",
    "collapse": "기록 붕괴",
    "withdrew": "조사 종료",
}
