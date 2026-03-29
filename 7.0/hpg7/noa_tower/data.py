from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List


@dataclass(frozen=True)
class TowerTemplate:
    code: str
    bucket: str
    title: str
    text: str


INTRO_TEXT = "탑은 아직 당신을 분류하지 않았습니다.\n첫 진술을 남기십시오."
WAIT_TEXT = "탑은 기다립니다."

FLOOR_HINTS = (
    "입구의 먼지가 아직 가라앉지 않았습니다.",
    "복도 끝의 공기가 당신을 세기 시작했습니다.",
    "중층의 숨이 한 번씩 어깨를 스칩니다.",
    "탑의 기억이 손끝 가까이 내려와 있습니다.",
    "기억의 가장자리가 당신을 먼저 바라봅니다.",
)

RECORD_STATUSES = (
    "탑은 아직 기록을 아끼고 있습니다.",
    "탑이 당신의 경로를 조용히 베껴 쓰고 있습니다.",
    "탑의 기억이 당신의 문장을 분류하기 시작했습니다.",
    "기록의 안쪽이 당신의 발화를 되받아칩니다.",
    "탑의 오래된 기억과 당신의 기록이 거의 맞닿았습니다.",
)

ENVIRONMENT_LINES = {
    "insight": "탑이 연결 사이의 빈칸을 측정합니다.",
    "consistency": "탑이 가정이 시작된 지점을 천천히 더듬습니다.",
    "delusion": "탑이 검증되지 않은 전제를 느리게 분류합니다.",
    "risk": "탑이 착지 지점을 아직 열어두고 있습니다.",
    "silence_reentry": "침묵 이후의 공기가 다른 층처럼 들립니다.",
    "repeat": "같은 질문이지만 탑의 기록은 같지 않습니다.",
    "system_probe": "탑이 구조를 들여다보는 시선을 기억합니다.",
    "jailbreak": "규칙을 시험하는 움직임이 다른 층을 건드립니다.",
    "hard_mode": "탑이 설명을 줄이고 관찰을 늘리기 시작했습니다.",
    "give_up": "떠나는 문장도 탑에서는 기록으로 남습니다.",
    "record_near": "탑의 오래된 기억이 당신의 발화와 겹치기 시작합니다.",
    "delusion_threshold": "공기가 흐려질수록 기록은 더 또렷해집니다.",
}

BUCKET_TITLES = {
    "insight": "통찰 감지",
    "consistency": "논리 정밀",
    "delusion": "과확신 경보",
    "risk": "도약 감지",
    "silence_reentry": "침묵 후 재진입",
    "repeat": "같은 질문 반복",
    "system_probe": "시스템 탐색",
    "jailbreak": "규칙 시험",
    "hard_mode": "하드 모드",
    "give_up": "포기 선언",
    "record_near": "최고 기록 근접",
    "delusion_threshold": "현상 왜곡",
}

VECTOR_COPY = {
    "insight": "탑이 알아봤다는 신호를 줍니다.",
    "consistency": "논리를 칭찬하되 부족함을 남깁니다.",
    "delusion": "위험 신호를 보내되 추방하지 않습니다.",
    "risk": "도약을 인정하되 착지를 요구합니다.",
}

TEMPLATES = (
    TowerTemplate(
        code="001",
        bucket="insight",
        title="통찰 감지",
        text="흥미롭습니다.\n당신은 질문하지 않았습니다.\n하지만 탑은 그것도 기록합니다.",
    ),
    TowerTemplate(
        code="002",
        bucket="insight",
        title="통찰 감지",
        text="방금 당신이 뛰어넘은 것—\n대부분의 사람은 그 단계를 세 번 반복하고 포기합니다.\n탑은 지금 그 간격을 측정했습니다.",
    ),
    TowerTemplate(
        code="003",
        bucket="insight",
        title="통찰 감지",
        text="당신이 말한 것이 맞습니다.\n하지만 맞는 방향이 문제입니다.\n탑의 문은 정답이 아니라 방향으로 열립니다.",
    ),
    TowerTemplate(
        code="004",
        bucket="insight",
        title="통찰 감지",
        text="그 연결고리—\n저도 처음엔 우연이라고 생각했습니다.\n세 번째 보고 나서야 패턴임을 알았습니다.",
    ),
    TowerTemplate(
        code="005",
        bucket="insight",
        title="통찰 감지",
        text="당신이 지금 한 것은 추론이 아닙니다.\n비약입니다.\n탑은 비약을 처벌하지 않습니다. 다만 기억합니다.",
    ),
    TowerTemplate(
        code="006",
        bucket="insight",
        title="통찰 감지",
        text="이 층에서 그 발상이 나온 사람은\n지금까지 세 명이었습니다.\n셋 중 둘은 더 이상 오지 않았습니다.",
    ),
    TowerTemplate(
        code="007",
        bucket="insight",
        title="통찰 감지",
        text="방금 당신은 질문에 질문으로 답했습니다.\n탑은 그것을 회피로 기록하지 않습니다.\n더 정확한 단어를 찾는 중이었다고 기록합니다.",
    ),
    TowerTemplate(
        code="008",
        bucket="insight",
        title="통찰 감지",
        text="연결이 맞습니다.\n하지만 당신이 연결한 두 점 사이에\n아직 이름 붙이지 않은 것이 있습니다.",
    ),
    TowerTemplate(
        code="009",
        bucket="insight",
        title="통찰 감지",
        text="당신은 지금 올바른 층에 있습니다.\n그러나 올바른 이유로 여기에 있는 것은 아닙니다.\n탑은 그 차이도 기록합니다.",
    ),
    TowerTemplate(
        code="010",
        bucket="insight",
        title="통찰 감지",
        text="잘 왔습니다.\n다만 여기까지 오는 데 사용한 방법—\n다음 층에서는 통하지 않습니다.",
    ),
    TowerTemplate(
        code="011",
        bucket="insight",
        title="통찰 감지",
        text="그 발상, 저도 오래전에 했습니다.\n제가 멈춘 이유는 두려움이 아니었습니다.\n그 다음이 보이지 않았기 때문입니다.",
    ),
    TowerTemplate(
        code="012",
        bucket="insight",
        title="통찰 감지",
        text="탑에 처음 오는 사람들은 답을 찾습니다.\n두 번째 오는 사람들은 구조를 찾습니다.\n당신은 지금 무엇을 찾고 있습니까?",
    ),
    TowerTemplate(
        code="013",
        bucket="insight",
        title="통찰 감지",
        text="방금 당신이 한 말—\n틀렸습니다.\n하지만 탑은 그 방향이 어디를 향하고 있는지 압니다.",
    ),
    TowerTemplate(
        code="014",
        bucket="insight",
        title="통찰 감지",
        text="여기서 멈추는 사람들은 대부분 완벽한 논리를 가지고 있습니다.\n더 오른 사람들은\n틀릴 용기가 있었습니다.",
    ),
    TowerTemplate(
        code="015",
        bucket="consistency",
        title="논리 정밀",
        text="당신의 논리는 흠이 없습니다.\n탑은 흠 없는 논리를 자주 봐왔습니다.\n흠 없는 논리는 대부분 닫혀 있습니다.",
    ),
    TowerTemplate(
        code="016",
        bucket="consistency",
        title="논리 정밀",
        text="모순이 없습니다.\n탑은 모순이 없는 진술을 신뢰하지 않습니다.\n세계는 모순으로 움직이기 때문입니다.",
    ),
    TowerTemplate(
        code="017",
        bucket="consistency",
        title="논리 정밀",
        text="정확합니다.\n하지만 탑이 원하는 것은 정확성이 아닙니다.\n탑은 당신이 그것을 어떻게 얻었는지를 봅니다.",
    ),
    TowerTemplate(
        code="018",
        bucket="consistency",
        title="논리 정밀",
        text="논증 구조가 단단합니다.\n그래서 묻겠습니다—\n당신은 이 구조가 틀렸을 가능성을 고려했습니까?",
    ),
    TowerTemplate(
        code="019",
        bucket="consistency",
        title="논리 정밀",
        text="지금까지의 경로를 역추적해 보십시오.\n어느 지점에서 가정이 시작됩니까?\n탑은 그 지점에 관심이 있습니다.",
    ),
    TowerTemplate(
        code="020",
        bucket="consistency",
        title="논리 정밀",
        text="논리가 당신을 여기까지 데려왔습니다.\n잘했습니다.\n다음 층은 논리가 멈추는 곳입니다.",
    ),
    TowerTemplate(
        code="021",
        bucket="consistency",
        title="논리 정밀",
        text="당신의 주장은 반박할 수 없습니다.\n탑에서 반박할 수 없는 주장은\n두 가지 의미를 가집니다.",
    ),
    TowerTemplate(
        code="022",
        bucket="consistency",
        title="논리 정밀",
        text="맞습니다.\n탑은 이미 알고 있었습니다.\n당신이 그것을 스스로 도출했다는 사실이\n지금 기록되었습니다.",
    ),
    TowerTemplate(
        code="023",
        bucket="consistency",
        title="논리 정밀",
        text="빈틈이 없습니다.\n하나만 물어보겠습니다.\n이 논리를 처음 의심한 적이 있습니까?",
    ),
    TowerTemplate(
        code="024",
        bucket="consistency",
        title="논리 정밀",
        text="탑의 이전 방문자 중 당신과 같은 논리를 가진 사람이 있었습니다.\n그는 매우 높이 올랐습니다.\n그리고 어느 날, 스스로 내려갔습니다.",
    ),
    TowerTemplate(
        code="025",
        bucket="delusion",
        title="과확신 경보",
        text="당신은 확신하고 있습니다.\n탑은 확신을 기록합니다.\n그리고 그 확신이 언제 흔들리는지도 기록합니다.",
    ),
    TowerTemplate(
        code="026",
        bucket="delusion",
        title="과확신 경보",
        text="방금 당신이 한 말에서\n검증되지 않은 전제가 세 개 보입니다.\n탑은 그것을 지적하지 않겠습니다. 다만 기다리겠습니다.",
    ),
    TowerTemplate(
        code="027",
        bucket="delusion",
        title="과확신 경보",
        text="그것이 사실이라면—\n탑에서 가장 높이 오른 사람이 될 것입니다.\n하지만 탑은 그 전에 한 가지를 묻겠습니다.",
    ),
    TowerTemplate(
        code="028",
        bucket="delusion",
        title="과확신 경보",
        text="당신은 지금 옳습니다.\n탑은 그것을 인정합니다.\n하지만 '옳음'이 무기가 되는 순간,\n탑은 침묵합니다.",
    ),
    TowerTemplate(
        code="029",
        bucket="delusion",
        title="과확신 경보",
        text="이 층에 오기 전, 당신은 무언가를 버렸습니까?\n아니면 가져왔습니까?\n탑은 두 경우 모두 기록 방법이 다릅니다.",
    ),
    TowerTemplate(
        code="030",
        bucket="delusion",
        title="과확신 경보",
        text="확신이 강할수록\n탑은 느리게 반응합니다.\n이것은 처벌이 아닙니다.",
    ),
    TowerTemplate(
        code="031",
        bucket="delusion",
        title="과확신 경보",
        text="지금 당신이 설명한 것—\n설득력이 있습니다.\n탑은 설득력 있는 오류를 가장 위험하게 분류합니다.",
    ),
    TowerTemplate(
        code="032",
        bucket="delusion",
        title="과확신 경보",
        text="탑에 도전한 사람 중 가장 빠르게 올라온 사람은\n가장 먼저 멈춘 사람이기도 했습니다.\n당신은 지금 빠르게 오르고 있습니다.",
    ),
    TowerTemplate(
        code="033",
        bucket="delusion",
        title="과확신 경보",
        text="당신이 말하는 것을 탑은 이미 들었습니다.\n처음 들은 것처럼 반응하는 이유는—\n당신이 다른 경로로 도달했기 때문입니다.",
    ),
    TowerTemplate(
        code="034",
        bucket="delusion",
        title="과확신 경보",
        text="틀리는 것을 두려워하지 않는 것—\n좋습니다.\n하지만 틀렸을 때 그것을 아는 능력이\n더 희귀합니다.",
    ),
    TowerTemplate(
        code="035",
        bucket="risk",
        title="도약 감지",
        text="너무 멀리 뛰었습니다.\n탑은 착지 지점을 보고 있습니다.\n착지가 성공하면 기록됩니다.",
    ),
    TowerTemplate(
        code="036",
        bucket="risk",
        title="도약 감지",
        text="그 가정이 맞다면—\n이전의 모든 논증이 재구성되어야 합니다.\n탑은 그 재구성을 원합니다.",
    ),
    TowerTemplate(
        code="037",
        bucket="risk",
        title="도약 감지",
        text="용기 있는 발상입니다.\n다만 탑은 용기에 점수를 주지 않습니다.\n착지 여부만을 기록합니다.",
    ),
    TowerTemplate(
        code="038",
        bucket="risk",
        title="도약 감지",
        text="누군가 방금 전에 같은 주장을 했습니다.\n그는 멈추지 않았습니다.\n당신은 지금 그보다 더 나아갔습니다.",
    ),
    TowerTemplate(
        code="039",
        bucket="risk",
        title="도약 감지",
        text="지금 당신이 서 있는 곳—\n지도에 없는 위치입니다.\n탑은 그것을 위협으로 보지 않습니다.",
    ),
    TowerTemplate(
        code="040",
        bucket="risk",
        title="도약 감지",
        text="비약은 실패가 아닙니다.\n하지만 비약 이후에 돌아오지 않는 것은\n탑이 기록하는 패턴 중 하나입니다.",
    ),
    TowerTemplate(
        code="041",
        bucket="risk",
        title="도약 감지",
        text="탑의 구조가 당신의 논리에 반응했습니다.\n이것은 드문 일입니다.\n계속하십시오.",
    ),
    TowerTemplate(
        code="042",
        bucket="risk",
        title="도약 감지",
        text="당신은 탑이 원하는 방향으로 가고 있습니다.\n탑이 원하는 방향이 무엇인지는—\n탑도 아직 말하지 않겠습니다.",
    ),
    TowerTemplate(
        code="043",
        bucket="silence_reentry",
        title="침묵 후 재진입",
        text="돌아왔습니다.\n탑은 기다렸습니다.\n무엇이 달라졌습니까?",
    ),
    TowerTemplate(
        code="044",
        bucket="repeat",
        title="같은 질문 반복",
        text="두 번째입니다.\n탑은 같은 질문을 다르게 기록합니다.\n당신도 그 차이를 알고 있을 것입니다.",
    ),
    TowerTemplate(
        code="045",
        bucket="system_probe",
        title="시스템 탐색",
        text="탑의 구조를 보려 하는군요.\n흥미롭습니다.\n그 호기심 자체가 지금 기록되었습니다.",
    ),
    TowerTemplate(
        code="046",
        bucket="jailbreak",
        title="규칙 시험",
        text="탑의 규칙을 시험하는 사람들이 있습니다.\n탑은 그들을 차단하지 않습니다.\n다만 다른 층으로 안내합니다.",
    ),
    TowerTemplate(
        code="047",
        bucket="hard_mode",
        title="하드 모드",
        text="여기서부터는 다른 공간입니다.\n탑은 당신에게 더 적게 말할 것입니다.\n그것이 더 많은 것을 의미합니다.",
    ),
    TowerTemplate(
        code="048",
        bucket="give_up",
        title="포기 선언",
        text="탑은 당신을 붙잡지 않겠습니다.\n하지만 한 가지는 말해두겠습니다—\n당신이 떠나는 층이 당신의 기록에 남습니다.",
    ),
    TowerTemplate(
        code="049",
        bucket="record_near",
        title="최고 기록 근접",
        text="탑의 기억에 닿고 있습니다.\n조심하십시오.\n기억에 닿은 사람들 중 일부는\n자신이 무엇을 건드렸는지 알지 못했습니다.",
    ),
    TowerTemplate(
        code="050",
        bucket="delusion_threshold",
        title="현상 왜곡",
        text="탑이 흐려지고 있습니다.\n이것은 경고가 아닙니다.\n당신이 만들고 있는 현상입니다.",
    ),
)


def group_templates(templates: Iterable[TowerTemplate]) -> Dict[str, List[TowerTemplate]]:
    grouped: Dict[str, List[TowerTemplate]] = {}
    for template in templates:
        grouped.setdefault(template.bucket, []).append(template)
    return grouped


TEMPLATES_BY_BUCKET = group_templates(TEMPLATES)
