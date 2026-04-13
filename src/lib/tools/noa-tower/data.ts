import { Bi, TowerTemplate } from "./types";

export const INTRO_TEXT: Bi = { ko: "탑은 아직 당신을 분류하지 않았습니다.\n첫 진술을 남기십시오.", en: "The tower has not yet classified you.\nLeave your first statement." };
export const WAIT_TEXT: Bi = { ko: "탑은 기다립니다.", en: "The tower waits." };

export const FLOOR_HINTS: Bi[] = [
  { ko: "입구의 먼지가 아직 가라앉지 않았습니다.", en: "The dust at the entrance has not yet settled." },
  { ko: "복도 끝의 공기가 당신을 세기 시작했습니다.", en: "The air at the end of the corridor has begun counting you." },
  { ko: "중층의 숨이 한 번씩 어깨를 스칩니다.", en: "The breath of the middle floors brushes your shoulder now and then." },
  { ko: "탑의 기억이 손끝 가까이 내려와 있습니다.", en: "The tower's memory has descended close to your fingertips." },
  { ko: "기억의 가장자리가 당신을 먼저 바라봅니다.", en: "The edge of memory looks at you first." },
];

export const RECORD_STATUSES: Bi[] = [
  { ko: "탑은 아직 기록을 아끼고 있습니다.", en: "The tower still withholds its records." },
  { ko: "탑이 당신의 경로를 조용히 베껴 쓰고 있습니다.", en: "The tower quietly copies your path." },
  { ko: "탑의 기억이 당신의 문장을 분류하기 시작했습니다.", en: "The tower's memory has begun classifying your sentences." },
  { ko: "기록의 안쪽이 당신의 발화를 되받아칩니다.", en: "The inner records echo your utterances back." },
  { ko: "탑의 오래된 기억과 당신의 기록이 거의 맞닿았습니다.", en: "The tower's ancient memory and your records have nearly touched." },
];

export const ENVIRONMENT_LINES: Record<string, Bi> = {
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

export const BUCKET_TITLES: Record<string, Bi> = {
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

export const VECTOR_COPY: Record<string, Bi> = {
  insight: { ko: "탑이 알아봤다는 신호를 줍니다.", en: "The tower signals that it has recognized you." },
  consistency: { ko: "논리를 칭찬하되 부족함을 남깁니다.", en: "It praises the logic but leaves something wanting." },
  delusion: { ko: "위험 신호를 보내되 추방하지 않습니다.", en: "It sends a danger signal but does not expel you." },
  risk: { ko: "도약을 인정하되 착지를 요구합니다.", en: "It acknowledges the leap but demands a landing." },
};

export const TEMPLATES: TowerTemplate[] = [
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

export function groupTemplates(templates: TowerTemplate[]): Record<string, TowerTemplate[]> {
  const grouped: Record<string, TowerTemplate[]> = {};
  for (const t of templates) {
    if (!grouped[t.bucket]) grouped[t.bucket] = [];
    grouped[t.bucket].push(t);
  }
  return grouped;
}

export const TEMPLATES_BY_BUCKET = groupTemplates(TEMPLATES);

// IDENTITY_SEAL: PART-3 | role=template-data | inputs=none | outputs=TEMPLATES_BY_BUCKET
