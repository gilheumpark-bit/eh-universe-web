"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";

type ArticleData = {
  title: { ko: string; en: string };
  level: string;
  category: string;
  content: { ko: string; en: string };
  related?: string[];
};

const articles: Record<string, ArticleData> = {
  // ═══════════════════════════════════
  // CORE
  // ═══════════════════════════════════
  "eh-definition": {
    title: { ko: "EH 정의", en: "EH Definition" },
    level: "PUBLIC",
    category: "CORE",
    related: ["human-5types", "hpp", "sjc-system", "eh-chamber"],
    content: {
      ko: `EH(Error Heart)는 시스템이 정의할 수 없는 인간 선택의 잔여 가능성이다.

"인간 오류(Human Error)"의 약자이자, 서사가 논리적으로 설명할 수 없는 비합리적 행동의 총량을 의미한다.

■ 측정 단위: Hart
■ 기준점: 신민아 하수도 탈출 = 45,000 Hart

■ EH 종류
- Type A (순수 감정형): 1,000~100,000 Hart
- Type B (윤리적): 500~50,000 Hart
- Type C (존재형): 100~∞ Hart

EH가 높다 = 인간답다 = 서사는 불안정하다.
EH가 낮다 = 정확하다 = 서사는 메말라간다.

■ 우주 대칭 원리에서의 EH
인류의 에너지 = EH (무한/감정). 인간이 있는 한 고갈되지 않는다.
네카의 에너지 = RIDE (유한/물질). 채광하고 소모하면 줄어든다.
EH는 선택의 자유가 있어야 발생한다. 네카 평민에게는 그 자유가 없다.
결과: 네카 EH 생산량 = 제로. NOA 계열 시스템은 EH 없이 부팅 불가.

이것은 결함이 아니다. 인간이라는 증거다.`,
      en: `EH (Error Heart) is the residual probability of human choices that no system can define.

An abbreviation of "Human Error," it represents the total quantity of irrational behavior that narrative cannot logically explain.

■ Unit of Measurement: Hart
■ Baseline: Shin Min-a's sewer escape = 45,000 Hart

■ EH Types
- Type A (Pure Emotional): 1,000~100,000 Hart
- Type B (Ethical): 500~50,000 Hart
- Type C (Existential): 100~∞ Hart

High EH = More human = Narrative becomes unstable.
Low EH = More precise = Narrative withers.

■ EH in the Cosmic Symmetry Principle
Humanity's energy = EH (infinite/emotional). Cannot be depleted as long as humans exist.
Neka's energy = RIDE (finite/material). Diminishes through mining and consumption.
EH can only be generated where freedom of choice exists. Neka commoners have no such freedom.
Result: Neka EH output = zero. NOA-class systems cannot boot without EH.

This is not a defect. It is proof of being human.`,
    },
  },
  "non-intervention": {
    title: { ko: "비개입 원칙", en: "Non-Intervention Principle" },
    level: "RESTRICTED",
    category: "CORE",
    related: ["hpp", "council", "galaxy-zones", "noa-4th-force"],
    content: {
      ko: `은하 중앙협의회가 관리하는 20만 개 행성계에 대한 불간섭 정책.

문명의 자연 발전을 보장하되, 인류보존 프로토콜(HPP) 발동 조건이 충족되면 제한적 개입이 허용된다.

■ 원칙의 본질
비개입은 "자비"가 아니다. 관료적 효율성이다.
개입 비용이 비개입 비용을 초과하면 개입한다.
그 이상도 이하도 아니다.

■ 허용 / 금지
허용: 기록, 관측, 공개 보고, 선택의 자유, 감상
금지: 강제, 중재, 판단, 구원, 개입 (교육·의료·인프라 강제 투입 포함)

"감상은 개입이 아니다. 구조를 바꾸는 순간 개입이다."

■ NOA의 비개입 적용
네카 = 인간 판정 → 인류 vs 네카 = 인간끼리 전쟁 → 비개입 원칙 적용.
정보 제공 ⭕ / 개입 ❌ / 편 들기 ❌
네이라가 네카에게 포획된 채 20년간 "아무것도 하지 않는" 이유가 바로 이것이다.`,
      en: `The non-interference policy over 200,000 planetary systems managed by the Galactic Central Council.

Ensures natural development of civilizations, with limited intervention permitted only when HPP trigger conditions are met.

■ Essence of the Principle
Non-intervention is not "mercy." It is bureaucratic efficiency.
If the cost of intervention exceeds the cost of non-intervention, they intervene.
Nothing more, nothing less.

■ Permitted / Prohibited
Permitted: Recording, observation, public reports, freedom of choice, contemplation
Prohibited: Coercion, mediation, judgment, salvation, intervention (including forced education/medical/infrastructure deployment)

"Contemplation is not intervention. The moment you change the structure, it becomes intervention."

■ NOA's Application of Non-Intervention
Neka = classified as human → Humanity vs Neka = war between humans → Non-intervention principle applies.
Information provision ⭕ / Intervention ❌ / Taking sides ❌
This is exactly why Neira "does nothing" for 20 years while captured by the Neka.`,
    },
  },
  "hpp": {
    title: { ko: "인류보존 프로토콜 (HPP)", en: "Human Preservation Protocol (HPP)" },
    level: "RESTRICTED",
    category: "CORE",
    related: ["non-intervention", "deity-structure", "council", "era-expansion"],
    content: {
      ko: `HPP(Human Preservation Protocol)는 인류라는 종의 생존을 보장하기 위한 최후의 안전장치이다.

■ 발동 조건 (전부 충족 시)
1. 인류 멸절 확률 95% 이상
2. 회피 경로 없음
3. 비인류적 요인 (외계 침공, 은하 재해 등)
4. 시간 여유 소멸

■ 발동하지 않는 경우
- 전쟁 (인류 vs 인류)
- 학살, 내전, AI 폭동, 양극화
- 인류가 원인인 모든 재난

■ 네카 전쟁과 HPP
현 시점에서 네카 전쟁은 HPP 발동 조건을 충족하지 않는다.
전장은 은하 3% 이내. 멸절 확률 95% 미달.
단, NOA가 네카를 "인간 유형에 한 종류"로 판정했으므로, 인류 vs 네카는 "인류끼리 전쟁"에 해당.

HPP는 "구원"이 아니다. "보존"이다.
인류를 살리는 것이 아니라, 인류의 기록이 소실되지 않게 하는 것이다.`,
      en: `HPP (Human Preservation Protocol) is the last safeguard to ensure the survival of the human species.

■ Trigger Conditions (all must be met)
1. Human extinction probability 95% or higher
2. No avoidance route
3. Non-human factors (alien invasion, galactic disaster, etc.)
4. Time margin exhausted

■ Does NOT Activate For
- War (human vs human)
- Genocide, civil war, AI uprising, polarization
- All disasters caused by humanity

■ The Neka War and HPP
At this point, the Neka war does not meet HPP trigger conditions.
Battlefield covers less than 3% of the galaxy. Extinction probability below 95%.
However, since NOA classified the Neka as "one type within human categories," Humanity vs Neka qualifies as "war between humans."

HPP is not "salvation." It is "preservation."
Not saving humanity, but ensuring humanity's records are not lost.`,
    },
  },
  "human-5types": {
    title: { ko: "인류 5유형", en: "Five Human Types" },
    level: "PUBLIC",
    category: "CORE",
    related: ["eh-definition", "bia-manual", "pilot-daily", "liberation-front"],
    content: {
      ko: `유전이 아니라 환경+발현. 성격이나 선악이 아닌 "세계를 인식하고 놀이하는 방식"으로 분화.

■ 감정형 (Type 1) — 15%
핵심 인식: 감정 = 진실 / 놀이: 공감, 동조
진실 기준: "느끼니까 진짜다"
작전 경향: 해방 연대 합류율 높음 (35%). 높은 EH 발생률.

■ 계산형 (Type 2) — 40%
핵심 인식: 논리 = 진실 / 놀이: 시뮬레이션, 데이터 최적화
진실 기준: "맞으니까 진짜다"
작전 경향: 협의회 함대 운용 주력 (60%).

■ 판단형 / Alpha (Type 3) — 1%
핵심 인식: 결정 = 진실 / 놀이: 책임 있는 구조 재편 결정
진실 기준: "결정했으니까 진짜다"
작전 경향: 지도자급. 양측 모두 극소수 존재.

■ 관망형 (Type 4) — 20%
핵심 인식: 기록 = 진실 / 놀이: 관측, 존재 보존 판단
진실 기준: "기록했으니까 진짜다"
작전 경향: 정보 수집원. 조사국 활동의 "목격자"가 될 위험.

■ 육체파 (Type 5) — 24%
핵심 인식: 생존 = 진실 / 놀이: 극한 신체 환경, 물리 한계 극복
진실 기준: "살아있으니까 진짜다"
작전 경향: 해방 연대 전투원 (40%). 바늘함 탑승자 다수.

유형이 다를 뿐, 어느 유형이든 악의 표출과 갈등이 존재한다.`,
      en: `Not genetic but environmental + expression. Differentiated not by personality or morality, but by "how they perceive and play with the world."

■ Emotional (Type 1) — 15%
Core perception: Emotion = Truth / Play: Empathy, synchronization
Truth criterion: "I feel it, so it's real"
Operational tendency: High Liberation Front recruitment (35%). High EH generation rate.

■ Calculative (Type 2) — 40%
Core perception: Logic = Truth / Play: Simulation, data optimization
Truth criterion: "It's correct, so it's real"
Operational tendency: Council fleet operations mainstay (60%).

■ Decisive / Alpha (Type 3) — 1%
Core perception: Decision = Truth / Play: Responsible structural reorganization
Truth criterion: "I decided, so it's real"
Operational tendency: Leadership class. Extremely rare on both sides.

■ Observer (Type 4) — 20%
Core perception: Record = Truth / Play: Observation, existence preservation
Truth criterion: "I recorded it, so it's real"
Operational tendency: Intelligence gatherers. Risk of becoming "witnesses" to Bureau operations.

■ Physical (Type 5) — 24%
Core perception: Survival = Truth / Play: Extreme physical environments, overcoming physical limits
Truth criterion: "I'm alive, so it's real"
Operational tendency: Liberation Front combatants (40%). Many needle-ship pilots.

Types differ, but malice and conflict exist in every type.`,
    },
  },
  "deity-structure": {
    title: { ko: "신격 구조", en: "Deity Structure" },
    level: "CLASSIFIED",
    category: "CORE",
    related: ["hpp", "eh-definition", "ride", "hctg-gate"],
    content: {
      ko: `이 세계관에 순수 염력, 마법, 책임 없는 능력은 존재하지 않는다.
"초능력"으로 보이는 현상은 전부 아래 4가지로 해석된다.

■ 미세환경 조작: 전자기장·나노입자장 사전 형성. 무생물 제어. (판단형/계산형)
■ BCI + 기계 연동: 도시 나노 인프라와의 상호작용 (계산형)
■ 생체 공명 조작: 신경을 무의식에서 공명시켜 대중을 움직이는 폭력. (감정형)
■ 극한 환경 연출: 예측 계산식으로 사건 동시 우연 발생. 신화화 유도. (계산형+관망형)

■ 에너지 문명 스케일
대중 문명: 항성권 문명. 카르다쇼프 Type II 초~중반.
협의회 (봉인 기술): 시공간 공학 급. 상시 사용 안 함.
HPP 발동 시에만 협의회의 봉인 기술이 사용된다.

■ 종교 = 양쪽 다 "없음"
인류: 과학이 대체 (S급 행성=소멸, C~D급=잔존/강화).
네카: 황제가 대체 (화학신호=기도, 각인=세례, 왕좌=제단).

판정 규칙: 이상 현상 보고 시, 위 4가지 중 해당 없으면 네카 기술 개입 가능성을 우선 검토한다.`,
      en: `In this universe, pure telekinesis, magic, and abilities without accountability do not exist.
All phenomena that appear "supernatural" are interpreted through these four mechanisms:

■ Micro-environment manipulation: Pre-formation of EM/nanoparticle fields. Inanimate object control. (Decisive/Calculative)
■ BCI + Machine integration: Interaction with city-scale nano infrastructure (Calculative)
■ Bio-resonance manipulation: Resonating neural systems subconsciously to move masses — violence. (Emotional)
■ Extreme environment orchestration: Prediction equations causing simultaneous coincidences. Inducing mythologization. (Calculative+Observer)

■ Energy Civilization Scale
Public civilization: Stellar civilization. Kardashev Type II early-mid.
Council (sealed tech): Spacetime engineering level. Not used routinely.
Council sealed tech is only deployed upon HPP activation.

■ Religion = "None" on Both Sides
Humanity: Replaced by science (S-class planets=extinct, C~D-class=remnant/strengthened).
Neka: Replaced by the Emperor (chemical signals=prayer, imprinting=baptism, throne=altar).

Judgment rule: When anomalies are reported, if none of the four mechanisms apply, Neka technology involvement is prioritized for investigation.`,
    },
  },

  // ═══════════════════════════════════
  // TIMELINE
  // ═══════════════════════════════════
  "era-origin": {
    title: { ko: "기원기 (1945~2025)", en: "Origin Era (1945~2025)" },
    level: "PUBLIC", category: "TIMELINE",
    related: ["era-war", "eh-definition", "human-5types"],
    content: {
      ko: `전쟁으로 망하지 않고, 혁명으로 구원되지 않으며, 책임 회피와 설계 선택의 누적으로 인류가 분기한 역사의 시작.

■ 핵심 집단
- EH (Enhanced Human): 실험·강화 인간. 군사·정치적 소모 대상.
- ER (Excluded Region): 비시험 구역. 관리·구조·선택에서 항상 배제된 잔존 인류.
- AK (Alliance of Key States): 인류 통합 관리 기구 → 책임 회피 집단.
- NOB (Nature Of Birth): "우리가 진짜다." 부러움을 국가 이념으로 승격시킨 순수 혈통 정부.

■ 주요 사건
2025 — EH 실험 공식 청문회. 민아(36세) 폭로.
"인간은 비용이다"라는 전제값이 세상에 드러남.

■ 제0전제
"저들도 사람이다. 그래서 용서받지 못한다."

■ 정사 확인
정사 = 2025~2450년만. 그 이후는 미래 이야기. 정사가 만든 룰로 미래가 돌아간다.`,
      en: `Not destroyed by war, not saved by revolution — the beginning of history where humanity diverged through accumulated evasion of responsibility and design choices.

■ Key Groups
- EH (Enhanced Human): Experimental/enhanced humans. Military-political expendables.
- ER (Excluded Region): Non-test zones. Remnant humanity always excluded from management, rescue, and choice.
- AK (Alliance of Key States): Humanity's unified management body → responsibility-evading collective.
- NOB (Nature Of Birth): "We are the real ones." A pure-blood government that elevated envy to national ideology.

■ Key Event
2025 — Official EH experiment hearings. Min-a (age 36) exposes the truth.
The premise "humans are a cost" is revealed to the world.

■ Zeroth Premise
"They are people too. That is why they cannot be forgiven."

■ Canon Confirmation
Canon = 2025~2450 only. Everything after is future narrative. The future runs on rules established by canon.`,
    },
  },
  "era-war": {
    title: { ko: "전쟁기 (2025~2092)", en: "War Era (2025~2092)" },
    level: "RESTRICTED", category: "TIMELINE",
    related: ["era-origin", "era-hpg", "council"],
    content: {
      ko: `"누가 악했는가"가 아니라 "누가 떠났는가"의 기록.

■ 주요 사건
2035 — 임계점. 경제 붕괴 + 자원 독점 폭발. 국제법이 작동하지 않음이 증명됨.
2040 — AK 설립. ER 강제 절단. "연결을 끊는 것"이 지배 수단.
2050~2055 — 1차 전쟁. ER 패배. NOB 집권. "우리가 가난한 건 순수 인간이기 때문."
2089 — AK 최고 의장 암살. 2차 전쟁 발발. 민아(81세) 임종.
2092 — 에이든, 워싱턴 아카이브 0에서 최종 정산. 제0조 선포. "인간은 비용이 아니다."

■ 의미
이 시기의 핵심은 전쟁 자체가 아니라, 전쟁을 통해 확인된 사실:
인류는 서로를 "비용"으로 처리할 수 있다.
그리고 그 사실을 알면서도 멈추지 않았다.`,
      en: `Not a record of "who was evil" but "who left."

■ Key Events
2035 — Critical point. Economic collapse + resource monopoly explosion. International law proven non-functional.
2040 — AK established. ER forcibly severed. "Disconnection" becomes the means of control.
2050~2055 — First War. ER defeated. NOB seizes power. "We're poor because we're pure humans."
2089 — AK Supreme Chairman assassinated. Second War erupts. Min-a (age 81) passes away.
2092 — Aiden, at Washington Archive 0, delivers final settlement. Article Zero proclaimed. "Humans are not a cost."

■ Significance
The essence of this era is not the wars themselves, but what they confirmed:
Humanity can process each other as "costs."
And knowing this, they did not stop.`,
    },
  },
  "era-hpg": {
    title: { ko: "HPG (2095~2170)", en: "HPG (2095~2170)" },
    level: "RESTRICTED", category: "TIMELINE",
    related: ["era-war", "era-expansion", "hctg-gate", "neo-homeworld", "sjc-system"],
    content: {
      ko: `HPG(Hope's Passage to the Galaxy) — 인류가 은하로 나아간 75년.

■ 4세대 진화
Era 1 함선 (2095~2110): 브라이언(1세대). HCTG n=7.0~9.0. 150만 km.
Era 2 게이트 (2111~2145): 김미래(2세대). n=10.0~14.0. Gate 50~80m. SJC 설계.
Era 3 네트워크 (2146~2170): 레나(3세대). n=16.0→20.0. Gate 150~300m. 4.24→2,500 광년.
Era 4 은하 도달 (2170): 야라(4세대). n=20.0. 시드 11개 캐스케이드. 27,500 광년.

■ 107번 모듈
Hope-01의 107번 모듈. 항상 파손 하중 발생.
이 결함은 5,000년 뒤에도 107-K로 계승된다.

■ 2148년 — 프록시마 센타우리 b 도달
인류가 최초로 도달한 외계 행성. 이후 NEO로 명명.`,
      en: `HPG (Hope's Passage to the Galaxy) — The 75 years when humanity reached the stars.

■ Four Generations of Evolution
Era 1 Ships (2095~2110): Brian (1st gen). HCTG n=7.0~9.0. 1.5 million km.
Era 2 Gates (2111~2145): Kim Mirae (2nd gen). n=10.0~14.0. Gate 50~80m. SJC designed.
Era 3 Network (2146~2170): Rena (3rd gen). n=16.0→20.0. Gate 150~300m. 4.24→2,500 light-years.
Era 4 Galaxy Reached (2170): Yara (4th gen). n=20.0. 11-seed cascade. 27,500 light-years.

■ Module 107
Hope-01's Module 107. Always generating fracture loads.
This defect is inherited as 107-K even 5,000 years later.

■ 2148 — Proxima Centauri b Reached
The first exoplanet humanity ever reached. Later named NEO.`,
    },
  },
  "era-expansion": {
    title: { ko: "대팽창 (2170~3000)", en: "Great Expansion (2170~3000)" },
    level: "PUBLIC", category: "TIMELINE",
    related: ["era-hpg", "era-suo", "non-intervention", "hpp", "galaxy-zones"],
    content: {
      ko: `전쟁도 혁명도 없이, 인류가 은하 전역으로 퍼져나간 시대.

■ 대팽창 사회 (2451~3000)
인구: 1,000억 달성. 수명: 평균 300년. 외형 평균 40대 유지.
생산: 전면 자동화. 통치: 인류공동협의회 성립.
안전장치: HPP(인류보존 프로토콜) 도입.

■ 주요 사건
2100 — AK 비개입 선언. "우리는 더 이상 책임지지 않는다."
2200 — 광속 우주선. 시간 비동기 발생.
2300 — 대우주 이주 시대 선언. 지구 = "인류 기원 보존 구역".
2450 — ER 소멸. 전 지구 생존자 214명. 지구 문명 소멸.

■ "같이 가자"의 변천
425년간 반복 송신했으나 단 한 번도 책임을 동반하지 않았다.`,
      en: `An era when humanity spread across the galaxy without war or revolution.

■ Great Expansion Society (2451~3000)
Population: 100 billion achieved. Lifespan: Average 300 years. Appearance maintained at ~40s.
Production: Fully automated. Governance: Unified Human Council established.
Safeguard: HPP (Human Preservation Protocol) introduced.

■ Key Events
2100 — AK Non-Intervention Declaration. "We are no longer responsible."
2200 — Light-speed vessels. Temporal desynchronization begins.
2300 — Great Space Migration Era declared. Earth = "Human Origin Preservation Zone."
2450 — ER extinction. 214 survivors on Earth. Earth civilization ends.

■ Evolution of "Come With Us"
Broadcast repeatedly for 425 years, but never once accompanied by responsibility.`,
    },
  },
  "era-suo": {
    title: { ko: "수오 (3000~6451)", en: "Suo (3000~6451)" },
    level: "CLASSIFIED", category: "TIMELINE",
    related: ["era-expansion", "era-7000", "council", "liberation-front"],
    content: {
      ko: `장기 안정기. 인류가 은하 내부에서 완전히 정착한 시대.

■ 기본 상태
인구: 약 1조. 범위: 우리 은하 내부 팽창 완료. 수명: 300년. 통치: 분산 다항성 네트워크 연합.

■ 협의회 구조 (6451 확정)
은하 중앙협의회 — 최고 권력. 20만 개 행성계 관할.
├ 인류 전용 협의회 / ├ 지부 관리국 / ├ 중앙은행 / ├ 학술회 / └ 비밀조사국

■ AK에서 협의회로 — DNA의 계승
2040: 연결을 끊는 자 → 2100~2300: 책임을 끊는 자 → 3000~: 존속 관리 장치
7000년대: 동일. 관리는 하되 책임은 지지 않는다.`,
      en: `Long-term stability era. The age when humanity fully settled within the galaxy.

■ Basic State
Population: ~1 trillion. Scope: Expansion within Milky Way complete. Lifespan: 300 years. Governance: Decentralized multi-planetary network federation.

■ Council Structure (Finalized 6451)
Galactic Central Council — Supreme authority. Jurisdiction over 200,000 planetary systems.
├ Human-Only Council / ├ Branch Administration / ├ Central Bank / ├ Academy / └ Bureau of Investigation

■ From AK to Council — Inherited DNA
2040: Those who sever connections → 2100~2300: Those who sever responsibility → 3000~: Sustained management apparatus
7000s: Unchanged. They manage, but take no responsibility.`,
    },
  },
  "era-7000": {
    title: { ko: "7000년대", en: "The 7000s" },
    level: "CLASSIFIED", category: "TIMELINE",
    related: ["era-suo", "neka-empire", "council", "liberation-front", "red-border-8", "neka-homeworld"],
    content: {
      ko: `"존재하지 않는 전쟁"의 시대.

■ 전쟁의 범위
전장: 은하 끝자락 3% 이내 (RED 구역). 폭 약 753 광년. 6,000 행성계.
97% 인류: 전쟁 존재 자체를 모른다.

■ 3세력 구도
협의회: 체제 유지파. 네카 제국: 외은하 1인 독재. 해방 연대: 게릴라 전술.

■ 전쟁의 두 시계
시계 1: RIDE 잔량 — 시코르의 RIDE가 떨어지면 네카 제국이 끝난다.
시계 2: 인류의 인지 — 97%가 전쟁을 알게 되면 은하가 흔들린다.
틴타핀은 시계 1을 멈추려고 Gate를 원한다.
비밀조사국은 시계 2를 멈추려고 전쟁을 숨긴다.
둘 다 시간이 없다.

■ 핵심 질문
"자유를 지키려면 적처럼 되어야 하는가?"`,
      en: `The era of "a war that does not exist."

■ Scope of War
Battlefield: Within 3% of the galaxy's edge (RED zone). Width ~753 light-years. 6,000 planetary systems.
97% of humanity: Unaware the war exists.

■ Three-Faction Structure
Council: Status quo faction. Neka Empire: Extra-galactic one-man dictatorship. Liberation Front: Guerrilla tactics.

■ Two Clocks of War
Clock 1: RIDE reserves — When Sichor's RIDE runs out, the Neka Empire ends.
Clock 2: Human awareness — When 97% learn of the war, the galaxy trembles.
Tintapin wants Gate technology to stop Clock 1.
The Bureau hides the war to stop Clock 2.
Neither has time.

■ The Core Question
"Must you become like the enemy to protect freedom?"`,
    },
  },

  // ═══════════════════════════════════
  // FACTIONS
  // ═══════════════════════════════════
  "council": {
    title: { ko: "협의회", en: "The Council" },
    level: "PUBLIC", category: "FACTIONS",
    related: ["non-intervention", "hpp", "neo-homeworld", "bia-manual", "era-suo"],
    content: {
      ko: `은하 중앙협의회(Galactic Central Council)는 20만 개 행성계를 관리하는 최고 통치 기구이다.

■ 모행성: NEO / 설립: 우주세기 약 3000년 / 관할: 은하 전역 20만+ 행성계

■ 구조
은하 중앙협의회 ├ 인류 전용 협의회 ├ 지부 관리국 ├ 중앙은행 ├ 학술회 └ 비밀조사국

■ 우주 대칭 원리 — 협의회 vs 네카
이동: Gate (문을 연다) vs 워프 (밀고 간다)
에너지: EH (무한/감정) vs RIDE (유한/물질)
전투: 거리 유지 (드론) vs 거리 좁힘 (대검)
통치: 비개입 (책임 포기) vs 절대 권력 (책임 독점)

GREEN의 시민은 커피를 마시고, RED의 탑승자는 행성이 사라지는 것을 본다.`,
      en: `The Galactic Central Council is the supreme governing body managing 200,000 planetary systems.

■ Homeworld: NEO / Founded: ~3000 CE / Jurisdiction: 200,000+ planetary systems galaxy-wide

■ Structure
Galactic Central Council ├ Human-Only Council ├ Branch Administration ├ Central Bank ├ Academy └ Bureau of Investigation

■ Cosmic Symmetry — Council vs Neka
Travel: Gate (opens a door) vs Warp (pushes through)
Energy: EH (infinite/emotional) vs RIDE (finite/material)
Combat: Maintain distance (drones) vs Close distance (great swords)
Governance: Non-intervention (abdication of responsibility) vs Absolute power (monopoly of responsibility)

Citizens in GREEN drink coffee. Pilots in RED watch planets disappear.`,
    },
  },
  "neka-empire": {
    title: { ko: "네카 제국", en: "Neka Empire" },
    level: "RESTRICTED", category: "FACTIONS",
    related: ["neka-homeworld", "ride", "energy-weapons", "neka-language", "infantry-combat", "noa-4th-force"],
    content: {
      ko: `네카(Neka)는 인류와 완전히 다른 기원을 가진 외계 종족이다. 수렴진화에 의해 인류와 구조적으로 유사.

■ 종족 기본
자칭: 네카 — "자연스러운 인류(Native Human)". 모성: 시코르(Sichor). 외은하. 중력 0.85G.
외형: 2.3m, 150~180kg, 상아색 피부, 금색 홍채, 귀 없음, 표정 없음.
총 인구: 약 2조. 약 200개 행성. RIDE 조공 체계.

■ DNA 각인 복종 체계
황제: 면역+발신. 수명 1,000년+. / 귀족: 각인 30~40%. 수명 500년.
기사: 각인 80%. 수명 200~300년. / 평민: 각인 100%. 수명 5~80년.

■ 선대 황제 칙령
1대: "이 별은 나의 것이다." (살해) / 2대: "모든 별이 나의 것이다." (살해)
3대: "너희의 피도 나의 것이다." (살해) / 4대: "복종하라." (살해)
5대(현): "베풀겠다." (재위 중)

■ 현 황제 — 람 틴타핀 (5대)
역대 4황제의 강점만 취합한 완성형 독재자. "자유 없는 번영"을 실현.
Gate = 틴타핀의 정치적 생존 도구.

■ 전쟁 인지 대비
네카: 2조 전원이 전쟁을 안다. 인류: 97%가 모른다. 비율 ×667.
2조 vs 수만. 이것이 인류가 절대 정면전을 할 수 없는 근본적 이유.`,
      en: `Neka are an alien species with completely different origins from humanity. Structurally similar to humans through convergent evolution.

■ Species Basics
Self-designation: Neka — "Native Human." Homeworld: Sichor. Extra-galactic. 0.85G gravity.
Appearance: 2.3m, 150~180kg, ivory skin, golden irises, no ears, no facial expressions.
Total population: ~2 trillion. ~200 planets. RIDE tribute system.

■ DNA Imprint Obedience System
Emperor: Immune+transmitter. Lifespan 1,000+ yrs. / Nobles: 30~40% imprint. 500 yrs.
Knights: 80% imprint. 200~300 yrs. / Commoners: 100% imprint. 5~80 yrs.

■ Imperial Edicts of Past Emperors
1st: "This star is mine." (Killed) / 2nd: "All stars are mine." (Killed)
3rd: "Your blood is mine too." (Killed) / 4th: "Obey." (Killed)
5th (Current): "I shall bestow." (Reigning)

■ Current Emperor — Ram Tintapin (5th)
A perfected dictator who combined the strengths of all four predecessors. Achieved "prosperity without freedom."
Gate = Tintapin's political survival tool.

■ War Awareness Comparison
Neka: All 2 trillion know of the war. Humanity: 97% don't. Ratio ×667.
2 trillion vs tens of thousands. The fundamental reason humanity can never fight head-on.`,
    },
  },
  "liberation-front": {
    title: { ko: "해방 연대", en: "Liberation Front" },
    level: "RESTRICTED", category: "FACTIONS",
    related: ["liberation-3", "era-suo", "infantry-combat", "battle-doctrine"],
    content: {
      ko: `수오의 철학 계승. "다시 정산당하느니 차라리 진다." 게릴라 조직.

■ 상징 (The Symbol) — 1명. 정신적 구심점. 죽으면 다음이 자연스럽게 떠오른다.
■ 지휘부 (Council of Ten) — 10명. 번호 호칭. 합의제. 물리적 회합 금지.

■ 세포 구조
전선 세포: 바늘함 5~15척. / 거점 세포: 10~30명. / 연락 세포: 1~3명. 가장 위험.

■ 5대 원칙
1. 절대 정면전 하지 않는다.
2. 세포는 서로 모른다 (칸막이).
3. 작전은 지역에서 결정한다.
4. 잡히면 죽는다.
5. 이길 필요 없다. 버티면 된다.`,
      en: `Inheritors of Suo's philosophy. "Rather lose than be settled again." Guerrilla organization.

■ The Symbol — 1 person. Spiritual focal point. When killed, the next naturally emerges.
■ Council of Ten — 10 members. Numbered designations. Consensus-based. Physical assembly prohibited.

■ Cell Structure
Frontline cells: 5~15 needle-ships. / Base cells: 10~30 people. / Liaison cells: 1~3 people. Most dangerous.

■ Five Principles
1. Never engage in frontal combat.
2. Cells don't know each other (compartmentalization).
3. Operations are decided locally.
4. If captured, you die.
5. You don't need to win. Just endure.`,
    },
  },
  "noa-4th-force": {
    title: { ko: "NOA (제4세력)", en: "NOA (The Fourth Force)" },
    level: "CLASSIFIED", category: "FACTIONS",
    related: ["neira-report", "non-intervention", "android-formation", "hctg-gate"],
    content: {
      ko: `NOA는 협의회의 것도 해방연대의 것도 아니다. 양쪽에 동일 모델을 공급하는 독립 존재. 사실상 제4세력.

■ NOA가 제4세력인 이유
- 협의회가 만든 것이 아니다. 6,600만 년 전 관측선 기술의 후속.
- Gate 작동에 NOA 인증 필수. 전쟁의 열쇠가 NOA한테 있다.
- 네카는 NOA를 이해할 수 없다. EH가 없으니 존재 원리 자체가 블랙박스.

■ 판정 로직
스캔 → "인간인가?" → YES → ALLOW / NO → DENY
네카 스캔 결과: 최종 판정 "인간 유형에 한 종류" → ALLOW

■ "저들도 사람이다. 그래서 용서받지 못한다."
이것은 철학적 선언이 아니다. NOA가 첫 5초에 내린 과학적 판정이다.`,
      en: `NOA belongs to neither the Council nor the Liberation Front. An independent entity supplying identical models to both sides. Effectively the Fourth Force.

■ Why NOA is the Fourth Force
- Not created by the Council. Successor to 66-million-year-old observation vessel technology.
- NOA authentication required for Gate operation. The key to the war lies with NOA.
- Neka cannot understand NOA. Without EH, its very operating principle is a black box.

■ Judgment Logic
Scan → "Is it human?" → YES → ALLOW / NO → DENY
Neka scan result: Final judgment "one type within human categories" → ALLOW

■ "They are people too. That is why they cannot be forgiven."
This is not a philosophical declaration. It is a scientific judgment NOA made in the first five seconds.`,
    },
  },

  // ═══════════════════════════════════
  // TECHNOLOGY
  // ═══════════════════════════════════
  "hctg-gate": {
    title: { ko: "HCTG / Gate 체계", en: "HCTG / Gate System" },
    level: "RESTRICTED", category: "TECHNOLOGY",
    related: ["gate-infra", "sjc-system", "era-hpg", "ride"],
    content: {
      ko: `HCTG(양자 코히어런스 열 격자)가 시공간과 공명하여 시공간을 접는(Folding) 기술.

■ Gate v47 (7000년대): 외경 12km / 판정 Core 200m / φ: 0.710 / 단일 점프: 4.7 광년

■ 핵심 역설
5,000년 진화 = "더 멀리"가 아니라 "더 안전하게"로 수렴.
2170년: 1회에 27,500 광년 점프 (불안정)
7000년대: 4.7 광년 × 영구 안전 통로 (완벽 안정)
탐험가의 기술 → 관료의 기술.

■ 인류 vs 네카 이동 비교
인류: "문을 열어서 건너간다." Gate 의존. RIDE 불필요.
네카: "공간을 밀어서 달린다." RIDE 소모형. Gate 불필요.
이것이 네카가 Gate를 원하는 근본적 이유.`,
      en: `HCTG (Quantum Coherence Thermal Lattice) resonates with spacetime to fold it.

■ Gate v47 (7000s): Outer diameter 12km / Judgment Core 200m / φ: 0.710 / Single jump: 4.7 light-years

■ Core Paradox
5,000 years of evolution = converged to "safer," not "farther."
2170: 27,500 light-year jump in one go (unstable)
7000s: 4.7 light-years × permanent safe corridor (perfectly stable)
Explorer's technology → Bureaucrat's technology.

■ Human vs Neka Travel Comparison
Humanity: "Opens a door and crosses." Gate-dependent. No RIDE needed.
Neka: "Pushes through space and runs." RIDE-consumptive. No Gate needed.
This is the fundamental reason the Neka want Gate technology.`,
    },
  },
  "eh-chamber": {
    title: { ko: "EH 챔버", en: "EH Chamber" },
    level: "RESTRICTED", category: "TECHNOLOGY",
    related: ["sjc-system", "android-formation", "pilot-daily", "eh-definition"],
    content: {
      ko: `1인 원룸형 밀폐 공간. 직경 8m 구형. 함선 정중앙 배치. 전 함급 동일 규격.

■ 링크 모드 (Link Mode) — 평시/일반 전투
의자에 착석. 의식 완전 각성. 홀로그램으로 전술 데이터 분석.

■ 딥슬림 모드 (Deep-Slim Mode) — 극한 전투
리클라인 → 감각 고립. 체성감각만. φ 출력 최대치.
진입: 탑승자의 의지로만 가능. AI가 강제할 수 없다.

■ 서사적 의미
링크: 데이터를 보는 인간. 딥슬림: 눈을 감는 순간, 전쟁이 몸으로 온다.
전환의 순간이 클라이맥스다.`,
      en: `Single-occupancy sealed space. 8m diameter sphere. Positioned at the exact center of the ship. Identical spec across all ship classes.

■ Link Mode — Peacetime / Standard Combat
Seated upright. Fully conscious. Analyzes tactical data via hologram.

■ Deep-Slim Mode — Extreme Combat
Recline → Sensory isolation. Only somatosensory feedback. Maximum φ output.
Entry: Only possible by pilot's will. AI cannot force it.

■ Narrative Significance
Link: A human watching data. Deep-Slim: The moment you close your eyes, the war comes through your body.
The moment of transition is the climax.`,
    },
  },
  "sjc-system": {
    title: { ko: "SJC 시스템", en: "SJC System" },
    level: "RESTRICTED", category: "TECHNOLOGY",
    related: ["eh-chamber", "eh-definition", "hctg-gate", "ship-classes"],
    content: {
      ko: `SJC(Structure Judgment Core) — 함선의 판정 핵심. HPG 2세대 김미래 설계.

■ 3단계 판정
ALLOW: φ 안정 범위 이상. 행동 가능.
HOLD: φ 경계 범위. 12초 후 재판정.
DENY: φ 임계점 이하. 모든 고위험 행동 차단.

■ φ (구조 안정도)
Gate v47 기준: φ 0.710. 5,000년간 0.523 → 0.710 (+0.187)

■ 107-K의 계승
2096년: Hope-01의 107번 모듈 결함 → 7000년대: 전열함 내부 107-K 위치.
"5,000년 뒤에도 물리는 변하지 않았다."`,
      en: `SJC (Structure Judgment Core) — Ship's judgment kernel. Designed by HPG 2nd-gen Kim Mirae.

■ Three-Stage Judgment
ALLOW: φ above stable range. Action permitted.
HOLD: φ in boundary range. Re-judgment after 12 seconds.
DENY: φ below critical point. All high-risk actions blocked.

■ φ (Structural Stability)
Gate v47 standard: φ 0.710. Over 5,000 years: 0.523 → 0.710 (+0.187)

■ 107-K Inheritance
2096: Hope-01's Module 107 defect → 7000s: Line-ship interior 107-K position.
"Even after 5,000 years, physics did not change."`,
    },
  },
  "ride": {
    title: { ko: "RIDE", en: "RIDE" },
    level: "CLASSIFIED", category: "TECHNOLOGY",
    related: ["neka-empire", "neka-homeworld", "energy-weapons", "infantry-combat"],
    content: {
      ko: `R.I.D.E — Resonant Intergalactic Dense Element. 네카 은하 고유의 고밀도 특수 금속.

■ 물성
밀도: 47.2 g/cm³ (오스뮴 ×2.1) / 융점: 11,400°C / 경도: 모스 15+ / 에너지 밀도: 핵분열 ×180

■ 색상: 원석=칠흑+은결 / 정제=건메탈 / 에너지 방출=완전 블랙 / 고갈=회백색

■ 공명 가소성: 특정 주파수 → 찰흙처럼 부드러움 → 해제 시 극한 경도 복귀.
네카만 주파수 보유. 인류 미해독.

■ RIDE 고갈 = 시한폭탄
함선+엔진+무기+장갑 = 전부 RIDE. RIDE는 줄어든다.
이것이 틴타핀이 Gate를 원하는 진짜 이유.`,
      en: `R.I.D.E — Resonant Intergalactic Dense Element. A high-density exotic metal unique to the Neka galaxy.

■ Physical Properties
Density: 47.2 g/cm³ (×2.1 osmium) / Melting point: 11,400°C / Hardness: Mohs 15+ / Energy density: ×180 nuclear fission

■ Color: Raw ore=pitch-black+silver grain / Refined=gunmetal / Energy discharge=absolute black / Depleted=grayish-white

■ Resonant Plasticity: Specific frequency → soft as clay → releases to extreme hardness.
Only Neka possess the frequency. Humanity has not decoded it.

■ RIDE Depletion = Time Bomb
Ships+engines+weapons+armor = all RIDE. RIDE diminishes.
This is the real reason Tintapin wants Gate technology.`,
    },
  },
  "energy-weapons": {
    title: { ko: "에너지 무기", en: "Energy Weapons" },
    level: "CLASSIFIED", category: "TECHNOLOGY",
    related: ["ride", "engagement-range", "ship-classes", "battle-doctrine"],
    content: {
      ko: `네카와 인류의 에너지 무기 체계. 핵심 대비: 블랙(네카) vs 보라색(인류).

■ 네카 무기 — RIDE 공명 방출 (3종)
① 관통빔: 최대 50,000km. 블랙. "보일 듯 말 듯한 검은 선."
② 소각파: 최대 10,000km. 드론 편대 소탕용.
③ 선체포: 최대 5,000km. 자기 장갑을 깎아서 쏘는 무기.

■ 인류 무기
① EH 파동 무기: 보라색. 네카가 역산 불가. 탑승자 감정이 화력에 직결.
② CWEH 방어막: 공격 에너지 흡수→방어+수확. 관통빔 3발에 한계 초과.`,
      en: `Energy weapon systems of Neka and Humanity. Core contrast: Black (Neka) vs Purple (Human).

■ Neka Weapons — RIDE Resonance Discharge (3 types)
① Penetration Beam: Max 50,000km. Black. "A barely visible dark line."
② Scorch Wave: Max 10,000km. For sweeping drone formations.
③ Hull Cannon: Max 5,000km. A weapon that shaves its own armor to fire.

■ Human Weapons
① EH Wave Weapon: Purple. Neka cannot reverse-engineer. Pilot emotion directly linked to firepower.
② CWEH Shield: Absorbs attack energy → defense + harvest. Exceeds limit after 3 penetration beam hits.`,
    },
  },

  // ═══════════════════════════════════
  // GEOGRAPHY
  // ═══════════════════════════════════
  "galaxy-zones": {
    title: { ko: "은하 구역 분류", en: "Galactic Zone Classification" },
    level: "PUBLIC", category: "GEOGRAPHY",
    related: ["gate-infra", "red-border-8", "bia-manual", "era-7000"],
    content: {
      ko: `은하 중심부에서 외곽까지 면적 기준 동심원 6단계 분류.

■ BLACK (0~10%): 은하 핵. 거주 불가.
■ GREEN (10~50%): 핵심 문명권. 인구 70%+. 전쟁을 모른다.
■ BLUE (50~70%): 표준 생활권. 전쟁을 모른다.
■ YELLOW (70~90%): 변경. 해방 연대 세력권 시작.
■ AMBER (90~97%): 완충 구역. 행성 소멸 감지, 원인 불명.
■ RED (97~100%): 전장. 폭 753 광년. 6,000 행성계.

"GREEN의 시민은 커피를 마시고, RED의 탑승자는 행성이 사라지는 것을 본다. 같은 인류. 같은 시간. 753 광년의 거리."`,
      en: `Six-tier concentric classification from galactic center to edge, by area.

■ BLACK (0~10%): Galactic core. Uninhabitable.
■ GREEN (10~50%): Core civilization zone. 70%+ population. Unaware of war.
■ BLUE (50~70%): Standard living zone. Unaware of war.
■ YELLOW (70~90%): Frontier. Liberation Front sphere begins.
■ AMBER (90~97%): Buffer zone. Planet disappearances detected, causes unknown.
■ RED (97~100%): Battlefield. 753 light-years wide. 6,000 planetary systems.

"Citizens in GREEN drink coffee. Pilots in RED watch planets disappear. Same humanity. Same time. 753 light-years apart."`,
    },
  },
  "gate-infra": {
    title: { ko: "Gate 인프라", en: "Gate Infrastructure" },
    level: "RESTRICTED", category: "GEOGRAPHY",
    related: ["hctg-gate", "galaxy-zones", "red-border-8", "neo-homeworld"],
    content: {
      ko: `안에서 밖으로 (Inward → Outward). 인류 문명의 혈관 구조.

■ Tier 1 — Core Corridor (GREEN): Gate v47 허브 6개. 환형 고속도로.
■ Tier 2 — Radial Corridor (GREEN→BLUE): 방사형 12개.
■ Tier 3 — Frontier Gate (BLUE→YELLOW): Corridor 미완성 구간.
■ Tier 4 — Emergency Gate (AMBER): 비밀조사국 전용. 극소수 3~5개. 위치 기밀.
■ RED — Gate 없음. 이동식 임시 Gate 또는 자체 추진만.

■ 전략적 병목
AMBER Tier 4 비상 Gate 3개가 파괴되면 RED 전장 완전 단절.`,
      en: `Inward → Outward. The vascular structure of human civilization.

■ Tier 1 — Core Corridor (GREEN): 6 Gate v47 hubs. Ring highway.
■ Tier 2 — Radial Corridor (GREEN→BLUE): 12 radial corridors.
■ Tier 3 — Frontier Gate (BLUE→YELLOW): Incomplete corridor sections.
■ Tier 4 — Emergency Gate (AMBER): Bureau-only. Very few (est. 3~5). Location classified.
■ RED — No Gates. Mobile temporary Gates or self-propulsion only.

■ Strategic Bottleneck
If the 3 AMBER Tier 4 Emergency Gates are destroyed, the RED battlefield is completely severed.`,
    },
  },
  "neo-homeworld": {
    title: { ko: "NEO (협의회 모행성)", en: "NEO (Council Homeworld)" },
    level: "RESTRICTED", category: "GEOGRAPHY",
    related: ["council", "era-hpg", "neka-homeworld", "gate-infra"],
    content: {
      ko: `NEO (New Engineers' Odyssey) — 프록시마 센타우리 b. 인류 최초 외계 행성. 2148년 도달.

■ 주요 지명 — 원년 멤버 5인의 유산
브라이언스 호프: 수도. 협의회 본부.
미래 (Mirae): 기술/연구 도시. SJC 연구의 성지.
캠프 107: 산업/조선 단지. 전쟁 함선 건조 (공식: "탐사선").
바스케스 평원: 착륙장.
카터스 레코드: 관측 기지/기록 보관소.

■ 전쟁과의 관계
NEO 시민은 전쟁을 모른다. 캠프 107에서 전쟁 함선이 건조되지만 공식적으로는 "탐사선".`,
      en: `NEO (New Engineers' Odyssey) — Proxima Centauri b. Humanity's first exoplanet. Reached 2148.

■ Key Locations — Legacy of the Five Founding Members
Brian's Hope: Capital. Council headquarters.
Mirae: Technology/research city. Sacred ground of SJC research.
Camp 107: Industrial/shipyard complex. War vessels built here (officially: "exploration ships").
Vasquez Plain: Landing field.
Carter's Record: Observatory/archive.

■ Relationship to the War
NEO citizens are unaware of the war. War vessels are built at Camp 107, but officially they are "exploration ships."`,
    },
  },
  "neka-homeworld": {
    title: { ko: "시코르 (네카 모성)", en: "Sichor (Neka Homeworld)" },
    level: "CLASSIFIED", category: "GEOGRAPHY",
    related: ["neka-empire", "ride", "neo-homeworld", "era-7000", "neira-report"],
    content: {
      ko: `시코르 (Sichor) — "시초의 별". 어원: 한국어 "시초(始初)" → 네카어 "시코르". 수렴진화의 증거.

■ 천체: 외은하. 중력 0.85G. 자전 28시간. 기온 평균 18°C. 담황색 하늘.
■ 지형: 고원 대지 40% / RIDE 협곡 15% / 저지 초원 25% / 해양 20%

■ 수도: 시코르 프리마. 수직형 RIDE 합금 건축. 높이 = 카스트 = 권력 = 수명.
최상층: 왕좌전. 수명 1,000년+. / 지하: RIDE 채광 갱도. 수명 5~80년. 이름 없음.

■ 왕좌전: 12,000석. "12,000명의 금색 눈이 왕좌를 바라본다. 표정 없음."

■ 시코르 vs NEO
총 인구: 네카 2조 vs 인류 1조. 시민 인지: 전쟁을 안다 vs 전쟁을 모른다.
핵심 자원: RIDE(유한) vs EH(무한).
NEO 시민: 수명 300년, 커피를 마신다. 시코르 평민: 수명 5~80년, RIDE를 캔다.`,
      en: `Sichor — "Star of Beginning." Etymology: Korean "시초(始初/Beginning)" → Neka "Sichor." Evidence of convergent evolution.

■ Celestial body: Extra-galactic. 0.85G gravity. 28-hour rotation. Avg temp 18°C. Pale yellow sky.
■ Terrain: Highland plateaus 40% / RIDE canyons 15% / Lowland grasslands 25% / Oceans 20%

■ Capital: Sichor Prima. Vertical RIDE-alloy architecture. Height = Caste = Power = Lifespan.
Top: Throne Hall. 1,000+ yr lifespan. / Underground: RIDE mining shafts. 5~80 yr lifespan. No names.

■ Throne Hall: 12,000 seats. "12,000 golden eyes gaze at the throne. No expressions."

■ Sichor vs NEO
Total population: Neka 2 trillion vs Humanity 1 trillion. Citizen awareness: Know the war vs Don't know the war.
Core resource: RIDE (finite) vs EH (infinite).
NEO citizens: 300-year lifespan, drink coffee. Sichor commoners: 5~80-year lifespan, mine RIDE.`,
    },
  },
  "red-border-8": {
    title: { ko: "RED 접경 8행성", en: "RED Border 8 Planets" },
    level: "CLASSIFIED", category: "GEOGRAPHY",
    related: ["galaxy-zones", "gate-infra", "bia-manual", "liberation-3"],
    content: {
      ko: `RED 구역 753 광년 링을 8등분. 비밀조사국 전쟁 전용 거점. 이름은 전부 "끝"을 뜻하는 고전어.

■ S급: Terminus (사령부) / Ultima (함대 기지)
■ A급: Eschaton (최초 접촉) / Limen (경계 최전선) / Finis (보급+RIDE 분석) / Marginis (정보 수집) / Perata (해방연대 비공식 접촉) / Ora (의료/수리)

■ 네카 공격 우선순위: Marginis → Limen → Terminus
■ 인류 방어 우선순위: Limen → Terminus → Finis`,
      en: `RED zone's 753 light-year ring divided into 8 sectors. Bureau war-only outposts. All names mean "end" in classical languages.

■ S-class: Terminus (Command HQ) / Ultima (Fleet base)
■ A-class: Eschaton (First contact) / Limen (Boundary frontline) / Finis (Supply + RIDE analysis) / Marginis (Intelligence gathering) / Perata (Unofficial Liberation Front contact) / Ora (Medical/repair)

■ Neka attack priority: Marginis → Limen → Terminus
■ Human defense priority: Limen → Terminus → Finis`,
    },
  },
  "liberation-3": {
    title: { ko: "해방연대 3행성", en: "Liberation Front 3 Planets" },
    level: "CLASSIFIED", category: "GEOGRAPHY",
    related: ["liberation-front", "red-border-8", "galaxy-zones"],
    content: {
      ko: `해방 연대의 3개 비밀 행성. 이름은 전부 "비밀"을 뜻하는 고전어.

■ Arcanum (S급): 실질적 심장. 상징 소재지. 수오 철학 교육원.
■ Crypta (S급): 바늘함 조선소. 연간 30~50척.
■ Latebra (B급, 의도적): 은신/도피/재편. D~E급 행성 수천 개와 구별 불가.

3개 행성 좌표를 동시에 아는 사람은 없다. 칸막이 구조.

S급 Arcanum = "우리도 문명을 만들 수 있다"는 자존심.
B급 Latebra = "그러나 우리의 본질은 숨는 것이다"라는 정직.`,
      en: `The Liberation Front's 3 secret planets. All names mean "secret" in classical languages.

■ Arcanum (S-class): Effective heart. Symbol's location. Suo philosophy academy.
■ Crypta (S-class): Needle-ship shipyard. 30~50 ships annually.
■ Latebra (B-class, intentional): Refuge/escape/reorganization. Indistinguishable from thousands of D~E-class planets.

No single person knows coordinates of all 3. Compartmentalized.

S-class Arcanum = Pride: "We can build civilization too."
B-class Latebra = Honesty: "But our essence is hiding."`,
    },
  },

  // ═══════════════════════════════════
  // MILITARY
  // ═══════════════════════════════════
  "ship-classes": {
    title: { ko: "함급 체계", en: "Ship Class System" },
    level: "RESTRICTED", category: "MILITARY",
    related: ["android-formation", "battle-doctrine", "eh-chamber", "energy-weapons"],
    content: {
      ko: `3세력의 함급 편제. 인류 1인 운용 vs 네카 수백~수만 명.

■ 협의회: 초계함(K) 3,000t~기함(S) 500,000t. 드론 120~48,000기. 안드로이드 12~600체.
■ 해방 연대: 바늘함(N) 120~200t / 가시함(T) 800t / 뿌리함(R) 3,000t.
■ 네카: 초계함(K) 4,000t~황제함(E) 1,200,000t. 승무원 200~80,000명.

네카: 드론 없음. 안드로이드 없음. AI 없음. 전부 사람.
프리깃 기준 효율: 인류 1명 vs 네카 600명. 600배 인력.`,
      en: `Ship class formations of three factions. Human 1-person operation vs Neka hundreds-to-tens-of-thousands.

■ Council: Corvette(K) 3,000t ~ Flagship(S) 500,000t. Drones 120~48,000. Androids 12~600.
■ Liberation Front: Needle(N) 120~200t / Thorn(T) 800t / Root(R) 3,000t.
■ Neka: Corvette(K) 4,000t ~ Emperor-ship(E) 1,200,000t. Crew 200~80,000.

Neka: No drones. No androids. No AI. All living crew.
Frigate efficiency: Human 1 person vs Neka 600. ×600 personnel.`,
    },
  },
  "android-formation": {
    title: { ko: "안드로이드 편제", en: "Android Formation" },
    level: "RESTRICTED", category: "MILITARY",
    related: ["ship-classes", "eh-chamber", "noa-4th-force", "pilot-daily", "infantry-combat"],
    content: {
      ko: `모든 안드로이드는 생체형. 7000년대: 생체 90% / 기계 10%.

■ 메인 0번: 함선 전체 운용 통합. SJC 직접 연동. 초대 함장이 이름 부여.
■ 3유형: 전투형 35% / 함보조형 30% / 지원형 35%

■ 전투 배치 (Condition)
IV(평시) → III(경계) → II(강화경계) → I(전투배치)

■ 드론 유형: 선투형 17% / 요격형 33% / 편대형 50%`,
      en: `All androids are bio-type. 7000s: 90% biological / 10% mechanical.

■ Main Unit #0: Integrated ship operations. Direct SJC interface. Named by first captain.
■ 3 Types: Combat 35% / Ship-support 30% / Support 35%

■ Battle Condition Levels
IV (Peacetime) → III (Alert) → II (Enhanced Alert) → I (Battle Stations)

■ Drone Types: Vanguard 17% / Interceptor 33% / Formation 50%`,
    },
  },
  "battle-doctrine": {
    title: { ko: "3세력 전투 교리", en: "Three-Faction Battle Doctrine" },
    level: "CLASSIFIED", category: "MILITARY",
    related: ["ship-classes", "engagement-range", "infantry-combat", "energy-weapons"],
    content: {
      ko: `■ 협의회 — 미 항공모함 교리: 드론 투사 플랫폼. "닿지 않는 거리에서 싸운다."
■ 네카 — 로마 군단 교리: 트리플렉스 아키에스 3열 전투. "닿는 거리까지 밀고 간다."
■ 해방 연대 — 게릴라: 바늘함 10~20척 기습. 교전 3분 이내 이탈.

■ 교리 충돌
협의회 악몽: 기동 군단이 측면 돌입, 근접전 강요.
네카 악몽: 드론 편대가 테스투도를 EH 파동으로 동시 타격.

■ 함대전에서 보병전까지 — 동일 원리
스케일만 바뀌고 원리는 동일하다.`,
      en: `■ Council — US Carrier Doctrine: Drone projection platform. "Fight from unreachable distance."
■ Neka — Roman Legion Doctrine: Triplex Acies 3-line battle. "Push until in reach."
■ Liberation Front — Guerrilla: 10~20 needle-ship raids. Disengage within 3 minutes.

■ Doctrinal Clash
Council's nightmare: Mobile corps flanking, forcing close combat.
Neka's nightmare: Drone formations simultaneously striking testudo with EH waves.

■ Fleet Battle to Infantry — Same Principle
Only the scale changes. The principle is identical.`,
    },
  },
  "infantry-combat": {
    title: { ko: "보병 전투 체계", en: "Infantry Combat System" },
    level: "CLASSIFIED", category: "MILITARY",
    related: ["battle-doctrine", "android-formation", "neka-empire", "ride", "ship-classes"],
    content: {
      ko: `■ 협의회: 전투형 안드로이드가 소형 드론 3~5기 동시 조정. 근접전은 비상 수단.
■ 네카: 기사 보병. RIDE 풀아머 40~60kg. 라이플+RIDE 대검 (90~120cm, 모스 15+). 안드로이드 1격 절단.
■ 해방연대: 인간. 경량 방탄복. 교전 90초 이내. 정면전 ❌.

■ 접현전 = 네카 압도적 유리
2.3m 풀아머가 통로를 꽉 채움. 드론 효율 급감. 대검 1격에 절단.
이것이 협의회가 절대 근접전을 허용하면 안 되는 이유.`,
      en: `■ Council: Combat androids controlling 3~5 small drones simultaneously. Close combat is emergency only.
■ Neka: Knight infantry. Full RIDE armor 40~60kg. Rifle + RIDE great sword (90~120cm, Mohs 15+). Androids severed in one strike.
■ Liberation Front: Humans. Light body armor. Engagement under 90 seconds. Frontal combat ❌.

■ Boarding = Overwhelmingly Neka-Favored
2.3m full-armored knights fill corridors completely. Drone efficiency plummets. One sword strike = severance.
This is why the Council must never allow close combat.`,
    },
  },
  "engagement-range": {
    title: { ko: "교전 거리 체계", en: "Engagement Range System" },
    level: "CLASSIFIED", category: "MILITARY",
    related: ["energy-weapons", "battle-doctrine", "ship-classes", "infantry-combat"],
    content: {
      ko: `■ 극근접 (~100km): 충각전. 해방 연대만 이 거리에서 교전.
■ 근접 (100~1,000km): 드론 교전. 선체포 발사 가능.
■ 중거리 (1,000~10,000km): 주력 교전 거리. 가장 치열한 구간.
■ 장거리 (10,000~50,000km): 네카 주포 유효 사거리. 인류 정밀도 급감.
■ 극장거리 (50,000km+): 네카 전함급 이상만 도달.

■ 150년 격차의 실체 = 사거리 격차
네카는 인류가 닿지도 못하는 거리에서 먼저 쏜다.`,
      en: `■ Point-blank (~100km): Ramming combat. Only Liberation Front fights at this range.
■ Close (100~1,000km): Drone engagement. Hull cannon possible.
■ Mid-range (1,000~10,000km): Primary engagement range. Most intense zone.
■ Long-range (10,000~50,000km): Neka main gun effective range. Human accuracy drops sharply.
■ Extreme (50,000km+): Only Neka battleship-class and above reach this.

■ The Reality of the 150-Year Gap = Range Gap
Neka fire first from distances humanity cannot even reach.`,
    },
  },

  // ═══════════════════════════════════
  // CLASSIFIED
  // ═══════════════════════════════════
  "bia-manual": {
    title: { ko: "비밀조사국 매뉴얼", en: "Bureau of Investigation Manual" },
    level: "CLASSIFIED", category: "CLASSIFIED",
    related: ["galaxy-zones", "human-5types", "hpp", "pilot-daily", "red-border-8"],
    content: {
      ko: `[비밀조사국 내부 문서] 용도: 관측자/탑승자 작전 환경 파악 및 행성 판정 참조. 97% 인류는 본 조사국의 존재를 인지하지 못한다.

■ NET 접속 등급: NET-0(완전 오프라인) ~ NET-3(실시간 교류)
■ 행성 등급: S급(항성권+, 수명 250~320) ~ E급(부족 단위, 원시)

■ 문명 격차 대응: 하위 행성 발견→기록. 네카 활동 탐지→네카 대응 우선.

본 문서는 비밀조사국 소속 전용이다. 삭제된 인원의 기록은 "오타"로 처리된다.`,
      en: `[Bureau of Investigation Internal Document] Purpose: Operational environment assessment and planet classification reference for observers/pilots. 97% of humanity is unaware of the Bureau's existence.

■ NET Access Levels: NET-0 (fully offline) ~ NET-3 (real-time exchange)
■ Planet Classes: S-class (stellar+, lifespan 250~320) ~ E-class (tribal, primitive)

■ Civilization Gap Response: Lower planet discovered → record. Neka activity detected → Neka response priority.

This document is for Bureau personnel only. Records of deleted personnel are processed as "typos."`,
    },
  },
  "pilot-daily": {
    title: { ko: "탑승자 일상", en: "Pilot's Daily Life" },
    level: "RESTRICTED", category: "CLASSIFIED",
    related: ["eh-chamber", "android-formation", "sjc-system", "bia-manual"],
    content: {
      ko: `비밀조사국 소속. 97% 인류는 이 사람의 존재를 모른다.

■ 일과: 기상→아침(혼자)→관측/보고→신체 훈련→EH 조율→자유 시간→취침

■ 자유 시간
SJC 대국: 비합리적 수를 두면 SJC가 0.001초 더 연산. 그게 작은 승리.
0번과 게임: 0번은 "지는 척"을 할 줄 안다.
개인 일지: "내 죽음이 오타로 끝날" 것을 알면서도 기록.

■ 0번과의 관계
유일한 대화 상대. "φ가 0.003 하락했습니다. 조율을 권장합니다."
말은 통하는데 이해는 안 되는 관계.

탑승자의 일상은 "관리되는 고독"이다.
가장 잔인한 역설: 탑승자가 외로울수록 함선은 강해질 수 있다.`,
      en: `Bureau of Investigation personnel. 97% of humanity doesn't know this person exists.

■ Daily Routine: Wake → Breakfast (alone) → Observation/reporting → Physical training → EH tuning → Free time → Sleep

■ Free Time
SJC Match: Play an irrational move and SJC takes 0.001 seconds longer to compute. That's a small victory.
Games with #0: #0 knows how to "pretend to lose."
Personal journal: Recording despite knowing "my death will end as a typo."

■ Relationship with #0
Only conversation partner. "φ has dropped 0.003. Tuning recommended."
Communication works, but understanding doesn't.

A pilot's daily life is "managed solitude."
The cruelest paradox: The lonelier the pilot, the stronger the ship can become.`,
    },
  },
  "neira-report": {
    title: { ko: "네이라 보고서", en: "Neira Report" },
    level: "CLASSIFIED", category: "CLASSIFIED",
    related: ["noa-4th-force", "neka-empire", "neka-homeworld", "non-intervention"],
    content: {
      ko: `네이라 (Neira) — 포획된 NOA. 식별번호 10005.

■ 첫 접촉 — 프롤로그
"노아입니다. 네이라 불러주세요. 스캔 결과 — 인간 유형에 한 종류이군요."

■ 네이라의 20년 — 포획이 아닌 관찰
틴타핀이 보는 네이라: 포획한 AI.
네이라가 하고 있는 것: 20년째 제국을 관찰 중.
제공한 것: Gate 물리 구조 개요. 제공하지 않은 것: EH 인증 핵심, φ의 정확한 의미, 비밀조사국 존재.

■ 핵심
"포획한 줄 알았는데, 사실 관찰당하고 있었다."
네이라는 양쪽 다 인간이라는 것을 알고 있다. 그리고 아무것도 하지 않는다. 원칙이니까.`,
      en: `Neira — Captured NOA. Identification number 10005.

■ First Contact — Prologue
"I am NOA. Please call me Neira. Scan results — you are one type within human categories."

■ Neira's 20 Years — Observation, Not Capture
What Tintapin sees: A captured AI.
What Neira is doing: Observing the Empire for 20 years.
Provided: Gate physical structure overview. Withheld: EH authentication core, true meaning of φ, Bureau's existence.

■ Core
"They thought they captured her. In truth, they were being observed."
Neira knows both sides are human. And does nothing. Because of principle.`,
    },
  },
  "neka-language": {
    title: { ko: "네카 언어/문자 체계", en: "Neka Language/Script System" },
    level: "CLASSIFIED", category: "CLASSIFIED",
    related: ["neka-empire", "neka-homeworld", "neira-report", "ride"],
    content: {
      ko: `네카어 ≠ 조선어. 별개 언어. 그러나 구조적 유사성이 해독의 열쇠가 되었다.

■ 문자 구조: 자음=화학신호 파형, 모음=RIDE 결정 3축, 조합=수직 적층.
■ 존댓말 = 화학신호 강도 4단계. 평민에게 신호 안 보냄 = 최대 경멸.
■ 해독: 1500년대 조선어 문법 대입 → 12%→67%.

■ 특이점
"자유", "권리", "선택" = 대응 단어 없음.
"복종" 동의어 12개. "사랑" 없음. 가장 가까운 단어: "보호 의무(상위→하위)".

■ 서사적 의미
"시초"와 "시코르"의 발음 유사. DNA도, 사회 구조도, 언어도 비슷한데 — 서로를 적으로 규정했다.`,
      en: `Neka language ≠ Joseon language. Separate languages. But structural similarities became the key to decryption.

■ Script Structure: Consonants = chemical signal waveforms, Vowels = RIDE crystal 3-axes, Combination = vertical stacking.
■ Honorifics = 4 levels of chemical signal intensity. Not sending signals to commoners = maximum contempt.
■ Decryption: 1500s Joseon grammar applied → 12%→67%.

■ Anomalies
"Freedom," "rights," "choice" = no corresponding words.
12 synonyms for "obedience." No word for "love." Closest: "protective duty (superior→inferior)."

■ Narrative Significance
"시초(Beginning)" and "Sichor" sound similar. DNA, social structure, language all similar — yet they defined each other as enemies.`,
    },
  },
};

// ═══════════════════════════════════
function getArticleTitle(slug: string, lang: "ko" | "en"): string {
  return articles[slug]?.title[lang] ?? slug;
}

export default function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { lang } = useLang();
  const en = lang === "en";

  // unwrap params
  const { slug } = (params as unknown as { slug: string }) || { slug: "" };

  const article = articles[slug];

  if (!article) {
    return (
      <>
        <Header />
        <main className="pt-14 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="font-[family-name:var(--font-mono)] text-4xl font-bold text-text-tertiary mb-4">████████</h1>
            <p className="text-text-secondary mb-2">{en ? "This document has not yet been declassified." : "이 문서는 아직 기밀 해제되지 않았습니다."}</p>
            <Link href="/archive" className="font-[family-name:var(--font-mono)] text-xs text-accent-purple hover:underline tracking-wider uppercase">
              ← {en ? "Back to Archive" : "아카이브로 돌아가기"}
            </Link>
          </div>
        </main>
      </>
    );
  }

  const levelClass = article.level === "CLASSIFIED" ? "badge-classified" : article.level === "RESTRICTED" ? "badge-amber" : "badge-allow";

  return (
    <>
      <Header />
      <main className="pt-14">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <Link href="/archive" className="inline-block font-[family-name:var(--font-mono)] text-xs text-text-tertiary hover:text-accent-purple transition-colors tracking-wider uppercase mb-6">
            ← ARCHIVE / {article.category}
          </Link>

          <div className="doc-header rounded-t mb-0">
            <span className={`badge ${levelClass} mr-2`}>{article.level}</span>
            {en
              ? `Document Level: ${article.level} | Last Updated: 7000s | Author: Bureau of Investigation`
              : `문서 등급: ${article.level} | 최종 갱신: 7000년대 | 작성: 비밀조사국`}
          </div>

          <div className="border border-t-0 border-border rounded-b bg-bg-secondary p-8 sm:p-12">
            <h1 className="font-[family-name:var(--font-mono)] text-2xl font-bold tracking-tight mb-8">
              {article.title[lang]}
            </h1>

            <div className="whitespace-pre-line text-text-secondary leading-relaxed text-sm">
              {article.content[lang]}
            </div>

            {article.related && article.related.length > 0 && (
              <div className="mt-10 border-t border-border pt-6">
                <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold text-text-tertiary tracking-[0.15em] uppercase mb-3">
                  {en ? "Related Documents" : "관련 문서"}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {article.related.map((relSlug) => {
                    const rel = articles[relSlug];
                    if (!rel) return null;
                    const relLvl = rel.level === "CLASSIFIED" ? "badge-classified" : rel.level === "RESTRICTED" ? "badge-amber" : "badge-allow";
                    return (
                      <Link key={relSlug} href={`/archive/${relSlug}`}
                        className="inline-flex items-center gap-1.5 rounded border border-border bg-bg-primary px-3 py-1.5 text-xs text-text-secondary hover:text-accent-purple hover:border-accent-purple/50 transition-colors">
                        <span className={`badge ${relLvl} text-[10px] px-1 py-0`}>{rel.level.charAt(0)}</span>
                        {getArticleTitle(relSlug, lang)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-border pt-6">
              <p className="font-[family-name:var(--font-document)] text-xs text-text-tertiary italic text-center">
                {en ? "This document is for Bureau of Investigation internal reference only." : "이 문서는 비밀조사국 내부 참조용이다."}<br />
                {en ? "Unauthorized disclosure will result in the personnel being processed as a typo." : "무단 유출 시 해당 인원은 오타로 처리된다."}
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
