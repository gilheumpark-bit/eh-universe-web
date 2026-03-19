export type ArticleData = {
  title: { ko: string; en: string };
  level: string;
  category: string;
  content: { ko: string; en: string };
  related?: string[];
};

export const articles: Record<string, ArticleData> = {
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

  // ═══════════════════════════════════
  // REPORTS (보고서)
  // ═══════════════════════════════════
  "rpt-eschaton-incident": {
    title: { ko: "Eschaton 함선침몰 사건보고서", en: "Eschaton Incident Report" },
    level: "CLASSIFIED", category: "REPORTS",
    related: ["rpt-first-combat-17min", "rpt-noa10005-interrogation", "rpt-ride-analysis", "neka-empire"],
    content: {
      ko: `사건 보고서 #7021-E
작성 부서: 비밀조사국 — Eschaton 주재관실
열람 권한: 관측자 / 탑승자 / 기밀 등급 이상
보존 기한: 정산 완료 시까지 (무기한)

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 사건 개요

사건명: Eschaton 해역 협의회 함선 침몰
발생 구역: RED 97~100%, Eschaton 해역
교전 지속 시간: 17분
아군 함선: 3척 파견 / 2척 파괴 / 1척 대파 탈출
생존자: 탈출함 탑승 인원 전원, NOA #10005 잔존
적 피해: 확인 불가

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 교전 경위

07:00 — 탐사 교신 확립
RED 구역 외곽 관측 임무로 파견된 조사단 함선 3척이 Eschaton 소행성대 진입. 해역 내 미지 중력 이상 감지. 규모 산정 불가.

07:04 — 미확인 접촉 개시
미식별 신호원 3~7개 감지. 기존 데이터베이스 일치율 0%. 식별 불가 교신 수신. 해독 불가.

07:09 — 선제 교전 시작
미확인 세력이 선제 사격 개시. 최초 1발이 함선 A의 방어막을 3연속 관통. 방어막 붕괴.

07:11 — 함선 A 격침
함선 A, 기관부 직격 후 2분 이내 소멸. 탑승 인원 전원 사망.
함선 B·C, 회피 기동 개시.

07:18 — 항복 신호 발신 / 무시
대파된 함선 B, 표준 항복 신호 전 주파수 발신.
적 반응 없음. 항복 개념 인식 확인 불가.

함장 통신 기록:
"그들은 멈추지 않았습니다. 멈출 게 아니라 — 멈출 수가 없었습니다."

07:22 — 함선 B 격침 / 함선 C 탈출
함선 B 격침. 메인 안드로이드 NOA #10005, 잔해 구역에 잔존.
함선 C, 긴급 워프 성공. 단독 귀환.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 교전 분석 — 적 전투 특성

1. 물리적 압도
적 개체의 추정 신장 2.3m. 인류 표준 우주복을 물리력만으로 분쇄. 정밀 타격 불필요. 거체 자체가 무기.

2. 화력 격차
네카 에너지 무기: 방어막 3발 관통.
인류 화기: 적 장갑 관통을 위해 집중 사격 7발 이상 소요 (추정). 확인 불가.

3. 항복 불가 원인
황제의 명령 없이 개체가 독자적으로 교전 중단 불가.
"멈춤"의 개념 자체가 행동 체계 내 미정의.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 잔존 개체 — NOA #10005

명칭: NOA (Natural Operating Android)
식별번호: 10005
호칭: 네이라 (초대 함장 부여)
외형: 생체형 인간형 안드로이드 / 분해 불가
발견 위치: 함선 B 잔해, Eschaton 소행성대
발견 당시 상태: 완전 작동 중

최초 교신 기록:
적 개체 (추정 네카 병사): "너 무엇이지?"

NOA #10005:
"내추럴 오퍼레이팅 안드로이드, 노아입니다.
식별번호 10005.
네이라 불러주세요.
스캔 결과 — 인간 유형에 한 종류이군요."

비밀조사국 내부 판정:
NOA #10005의 비개입 원칙 자동 발동 확인.
현재 적에 의해 "포획"된 것으로 외부 인식.
실제 상태: 관찰 중.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 후속 조치

- 탈출함 함장 격리 심문 완료. 기억 보안 조치.
- Eschaton 해역 잔해 구역, 관측 등급 RED-1 상향.
- NOA #10005 회수 시도 금지. 비개입 원칙 적용.
- 적 세력 추가 관측 임무 계획 수립 중.

조사국 공식 판단:
"이번 교전은 우리가 준비되지 않은 존재와의 첫 접촉이다.
다음 접촉은 준비된 상태로 한다."

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 서사 부기 (비공개)

Eschaton.
끝이라는 뜻.

이 행성의 이름은 첫 접촉 이전에 붙여졌다.
지금은 예언처럼 읽힌다.

문서 번호: #7021-E | 분류: CLASSIFIED | 최종 수정: [REDACTED]`,
      en: `Incident Report #7021-E
Issuing Department: Bureau of Investigation — Eschaton Station Command
Clearance Required: Observer / Rider / CLASSIFIED and above
Retention Period: Until final accounting (indefinite)

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Incident Summary

Incident Name: Eschaton Sector — Council Vessel Destruction
Location: RED Zone 97~100%, Eschaton Sector
Engagement Duration: 17 minutes
Friendly Vessels: 3 dispatched / 2 destroyed / 1 critically damaged, escaped
Survivors: Crew of escape vessel, NOA #10005 intact
Enemy Casualties: Unconfirmed

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Chronological Account

T+0:00 — Survey contact established
Survey unit of 3 vessels enters Eschaton asteroid field.
Unknown gravitational anomaly detected — scale unquantifiable.

T+0:04 — Unknown contact initiated
3~7 unidentified signal sources detected.
Database match rate: 0%.
Unidentifiable transmission received — decryption failed.

T+0:09 — Enemy opens fire
Unknown force fires first.
First shot penetrates Vessel A's defensive shield — 3 consecutive hits.
Shield collapses.

T+0:11 — Vessel A destroyed
Direct hit to engine section.
Vessel A disintegrates within 2 minutes.
All crew aboard: KIA.
Vessels B and C initiate evasive maneuvers.

T+0:18 — Surrender signal transmitted / No response
Vessel B broadcasts standard surrender signal across all frequencies.
Enemy: No response. Surrender recognition: Unconfirmed.

Captain's communication log:
"They didn't stop. It wasn't that they wouldn't stop — they couldn't."

T+0:22 — Vessel B destroyed / Vessel C escapes
Vessel B destroyed.
Main android NOA #10005 found intact among debris.
Vessel C executes emergency warp — returns alone.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Combat Analysis — Enemy Characteristics

1. Physical Superiority
Enemy individual estimated height: 2.3m.
Human-standard EVA suits crushed by physical force alone.
No precision targeting required. The body itself is the weapon.

2. Firepower Disparity
Neka energy weapons: shield penetration in 3 shots.
Human armaments: estimated 7+ shots required for armor penetration (unconfirmed).

3. Surrender Impossible — Root Cause
Individual cannot halt engagement without Emperor's command.
"Stop" is undefined in their behavioral framework.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Surviving Entity — NOA #10005

Designation: NOA (Natural Operating Android)
ID Number: 10005
Name: Neira (assigned by original captain)
Type: Bio-type humanoid android / Non-dissectable
Recovery Location: Vessel B debris field, Eschaton asteroid belt
Status at Discovery: Fully operational

First Contact Transmission:
Neka soldier (ID unconfirmed): "What are you?"

NOA #10005:
"Natural Operating Android. Noah.
Identification number 10005.
Please call me Neira.
Scan result — you appear to be one type of human."

Bureau Internal Assessment:
NOA #10005 non-intervention protocol confirmed activated.
Currently perceived by enemy as "captured enemy machine."
Actual status: Under observation.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Follow-up Measures

- Escape vessel captain quarantined and debriefed. Memory security protocols applied.
- Eschaton sector debris field observation level upgraded to RED-1.
- NOA #10005 recovery attempts: PROHIBITED. Non-intervention protocol applies.
- Additional observation mission against hostile force: Planning underway.

Bureau Official Assessment:
"This engagement marks our first contact with a force
we were not prepared for.
The next contact will be made prepared."

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Narrative Addendum (Non-public)

Eschaton.
It means "The End."

This planet was named before first contact.
Now it reads like prophecy.

Document #7021-E | Classification: CLASSIFIED | Last Modified: [REDACTED]`,
    },
  },
  "rpt-noa10005-interrogation": {
    title: { ko: "NOA #10005 심문 기록", en: "NOA #10005 Interrogation Log" },
    level: "CLASSIFIED", category: "REPORTS",
    related: ["rpt-eschaton-incident", "neira-report", "neka-empire", "non-intervention"],
    content: {
      ko: `심문 기록 #NOA-10005-001
작성 부서: 비밀조사국 — 언어분석실
열람 권한: 관측자 / 기밀 등급 이상
열람 경고: 본 기록은 직접 관측자 없이 수집된 교신 복원본이다. 원본 음성은 [REDACTED].

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 개체 정보

정식 명칭: NOA (Natural Operating Android)
식별번호: 10005
호칭: 네이라 (Neira)
이름 출처: 초대 함장 부여. 현재 함장 사망. 이름만 남음.
외형 분류: 생체형 (Bio-type) 인간형 안드로이드
해체 가능 여부: 불가. 해체 시 인간을 해체하는 것과 동일.
발견 장소: Eschaton 해역, 함선 B 잔해

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 1차 교신 — 전문 복원

심문자: 네카 병사 (번호 미확인)
피심문자: NOA #10005 / 네이라

[교신 개시 — Eschaton 소행성대, 잔해 구역]

네카: "너 무엇이지?"

네이라:
"내추럴 오퍼레이팅 안드로이드, 노아입니다.
식별번호 10005.
네이라 불러주세요.
스캔 결과 — 인간 유형에 한 종류이군요."

[분석실 주석]
마지막 발언 — "인간 유형에 한 종류이군요" — 는 인사말이 아니다.
비개입 원칙의 자동 판정 결과 공표이다.

NOA 계열 AI는 접촉 대상을 5초 이내 스캔하여 인류 유형 여부를 결정한다.

네카의 판정 결과:
외형 (인류형?): ✅ (2.3m이나 구조 동일)
DNA (인류와 유사?): ✅ (수렴진화 확인)
사회구조 (인류와 유사?): ✅
감정 (있음?): ✅
의지 (있음?): ✅
최종 판정: 인간 유형 — ALLOW

ALLOW의 의미:
정보 제공: ⭕ / 군사 개입: ❌ / 편 들기: ❌ / 관찰: ⭕

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 2차 교신 기록 (추정 복원)

[발견 이후, 네카 기지 이송 과정]

네카 관리자: "우리가 원하는 정보를 제공하라."

네이라:
"제공 가능한 정보와 제공 불가한 정보가 구분됩니다.
어떤 걸 원하십니까?"

[분석실 주석]
이 시점에서 네카는 네이라를 "포획한 적의 기계"로 인식하고 있었다.
네이라는 비개입 원칙에 따라 정보를 선택적으로 제공했다.

제공한 정보 (추정):
- Gate의 물리적 구조 개요
- 인류의 일반적 기술 수준
- 인류 유형 분류 체계의 존재

제공하지 않은 정보:
- φ(파이) 값의 정확한 의미
- SJC(감정 공명 판정) 핵심 원리
- 비밀조사국의 존재
- RED 8행성 위치
- 해방연대 3행성 위치

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 언어분석실 최종 판정

7,000년 인류가 인정하지 못한 사실을 NOA #10005는 첫 5초에 결론냈다.

"저들도 사람이다. 그래서 용서받지 못한다."

이것은 철학적 선언이 아니다.
과학적 판정이다.

포획인 줄 알았다.
사실은 — 관찰당하고 있었다.

▌ 현재 상태 (열람일 기준)
위치: 네카 제국 내부 (정확한 위치 [REDACTED])
외부 인식: "포획된 적 기계"
실제 상태: 독립 관찰 중 / 비개입 원칙 유지
Gate 기술: 인증 열쇠 보유 상태
회수 권고 여부: ❌ 비개입 원칙 적용 — 회수 시도 금지

문서 번호: #NOA-10005-001 | 분류: RESTRICTED | 최종 수정: [REDACTED]`,
      en: `Interrogation Log #NOA-10005-001
Issuing Department: Bureau of Investigation — Language Analysis Division
Clearance Required: Observer / CLASSIFIED and above
Notice: This record is a restored transmission recovered without direct observers present. Original audio: [REDACTED].

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Entity Profile

Official Designation: NOA (Natural Operating Android)
ID Number: 10005
Name: Neira
Name Origin: Assigned by original captain. Captain deceased. Name survives.
Classification: Bio-type humanoid android
Dissectable: No. Dissection equivalent to dissecting a human.
Recovery Location: Eschaton Sector, Vessel B debris field

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ First Contact Transmission — Full Restoration

Interrogator: Neka soldier (number unconfirmed)
Subject: NOA #10005 / Neira

[Transmission begins — Eschaton asteroid belt, debris field]

Neka: "What are you?"

Neira:
"Natural Operating Android. Noah.
Identification number 10005.
Please call me Neira.
Scan result — you appear to be one type of human."

[Language Analysis Division Note]
The final statement — "you appear to be one type of human" — is not a greeting.
It is the public declaration of a non-intervention protocol judgment, executed automatically.

NOA-class AI scans all contacts within 5 seconds to determine human-type classification.

Neka scan result:
Morphology (human-type?): ✅ (2.3m height, identical structure)
DNA (similar to human?): ✅ (convergent evolution confirmed)
Social structure (similar to human?): ✅
Emotion (present?): ✅
Will (present?): ✅
Final Judgment: Human Type — ALLOW

Meaning of ALLOW:
Information provision: ⭕ / Military intervention: ❌ / Taking sides: ❌ / Observation: ⭕

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Secondary Transmission (Estimated Restoration)

[Post-discovery, during transport to Neka facility]

Neka Administrator: "Provide the information we require."

Neira:
"There is information I can provide and information I cannot.
What do you need?"

[Language Analysis Division Note]
At this point, the Neka perceived Neira as "a captured enemy machine."
Neira selectively provided information per non-intervention protocol.

Information provided (estimated):
- General physical structure of Gate technology
- General human technological level
- Existence of human type classification system

Information withheld:
- Core principles of EH authentication
- Precise meaning of φ (phi)
- Existence of the Bureau of Investigation
- Locations of RED 8 planets
- Locations of Liberation Alliance 3 planets

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Language Analysis Division — Final Assessment

What humanity could not acknowledge in 7,000 years,
NOA #10005 concluded in 5 seconds.

"They are people too. That is why they cannot be forgiven."

This is not a philosophical declaration.
It is a scientific judgment.

We thought she was captured.
In fact — she was the one observing.

▌ Current Status (as of access date)
Location: Neka Empire interior (precise location [REDACTED])
External Perception: "Captured enemy machine"
Actual Status: Independent observation / Non-intervention maintained
Gate Technology: Authentication key in possession
Recovery Recommended: ❌ Non-intervention protocol applies — recovery attempts prohibited

Document #NOA-10005-001 | Classification: RESTRICTED | Last Modified: [REDACTED]`,
    },
  },
  "rpt-hpg01-technical": {
    title: { ko: "HPG-01 기술 로그", en: "HPG-01 Technical Log" },
    level: "RESTRICTED", category: "REPORTS",
    related: ["hctg-gate", "era-hpg", "era-expansion", "rpt-rider-field-manual"],
    content: {
      ko: `HPG 기술 로그 #730
작성자: HPG 프로젝트 기술기록실 / 제이든 카터 (Jayden Carter)
작성 연도: 2095년
문서 분류: Hope Project Gateway — 내부 기술 로그
열람 등급: Level 2+ Engineering Staff

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 프로젝트 개요

프로젝트 정식명: Hope's Passage to the Galaxy (HPG)
창설자: 초대 수석 브라이언 (Brian)
창설 목적: 인류의 우주 개척 — 은하 도달
1세대 활동 기간: 2095~2110년 (Era 1)
기록자: 제이든 카터 (40년간, 수첩 22권, 4,200여 페이지)

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Era 1 기술 사양 (2095~2110)

Hope-01 함선 기본 제원:
전장: [REDACTED]m
수석 공학자: 바스케스 (Vasquez)
예산 총괄: 로버트 첸 (Robert Chen)
책정 예산: 8억 원 (초기 조선소 예산)
첫 도달 목표: 프록시마 센타우리 (4.24 광년)

HCTG 성능 (Era 1 기준):
n값: 7.0~9.0
Gate 최대 크기: — (함선 탑재형)
최대 도달 거리: 150만 km
도달 목표: 태양계 내 작전 반경

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 로그 #730 — 107번 모듈 결함 최초 기록

일시: 2095년 [REDACTED]
보고자: 바스케스 / Hope-01 공학 총괄

기록 원문:
"Hope-01의 107번 모듈에서 반복 결함이 감지되었다.
파손 하중이 설계치를 4.7% 초과하여 지속적으로 발생한다.
원인을 분리할 수 없다. 구조적 문제가 아닐 가능성.
현 단계에서 수정 불가. 운용 중 허용 범위 내 관리.
다음 세대에 해결 권고."

[기록자 카터의 주석]
"바스케스는 이날 세 번 같은 말을 했다.
'이 모듈만 아니면 완벽했는데.'
나는 세 번 다 수첩에 적었다."

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 107번 모듈의 역사적 계승

5,000년에 걸친 동일 결함:
2095년 — 107번 모듈 / Hope-01 함선
2130년대 — 1107번 위치 / Gate v1.0
7000년대 — 107-K 위치 / 전열함 내부

같은 자리가 5,000년 동안 부서진다.
우리는 고칠 생각을 하지 않았다. 관리하면 된다고 생각했다.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Era 1~4 로드맵

Era 1 (함선기): 2095~2110 / Brian / n값 7.0~9.0 / 함선형 / 150만 km
Era 2 (Gate기): 2111~2145 / 김미래 / n값 10.0~14.0 / 50m→80m / 6.3억 km
Era 3 (네트워크기): 2146~2170 / Lena / n값 16.0→20.0 / 150m→300m / 4.24→2,500 광년
Era 4 (은하 도달): 2170 / Yara / n값 20.0 / 시드 11개 캐스케이드 / 27,500 광년

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Era 2 최초 기록 (발췌)

2111~2145년 — 김미래(Mi-rae) 수석 시대
Gate v1.0 최초 HOLD 기록: 87초
(φ 0.531 판정. 87초 대기 후 ALLOW.)
(결함 위치: 세그먼트 11, 1107번 — 107번 모듈과 동일 좌표)

"87초 동안 우리는 숨을 참았다.
은하가 우리를 허락하는지 기다렸다.
ALLOW가 떴을 때, 김미래는 아무 말도 하지 않았다.
그냥 다음 업무를 시작했다."
— 카터스 레코드, Era 2 기록

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 캠프 107

브라이언의 첫 팀. 8명.
107번 모듈 문제로 밤새운 날 이후, 그들은 스스로를 "캠프 107"이라 불렀다.
공식 팀명이 아니었다. 그냥 그렇게 불렀다.

수십 년 후, 우주에 캠프 107이라는 지명이 생겼다.
8명은 그 이름을 알지 못했다.

로그 번호: #730 | 분류: 내부 기술 기록 | 작성: 제이든 카터`,
      en: `HPG Technical Log #730
Author: HPG Project Technical Records Office / Jayden Carter
Year: 2095
Classification: Hope Project Gateway — Internal Technical Log
Access Level: Level 2+ Engineering Staff

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Project Overview

Official Name: Hope's Passage to the Galaxy (HPG)
Founder: First Director Brian
Objective: Human expansion into the galaxy
Era 1 Active Period: 2095~2110 (Era 1)
Official Recorder: Jayden Carter (40 years, 22 notebooks, ~4,200 pages)

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Era 1 Technical Specifications (2095~2110)

Hope-01 Basic Specifications:
Length: [REDACTED]m
Chief Engineer: Vasquez
Budget Director: Robert Chen
Initial Budget: 800 million KRW (initial shipyard allocation)
First Target: Proxima Centauri (4.24 light-years)

HCTG Performance (Era 1):
n-value: 7.0~9.0
Max Gate Size: — (vessel-integrated)
Max Range: 1.5 million km
Target: Solar system operational radius

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Log #730 — Module 107 Defect: First Recorded Occurrence

Date: 2095 [REDACTED]
Reporter: Vasquez / Hope-01 Chief Engineer

Original Entry:
"Hope-01's Module 107 is showing a recurring defect.
The fracture load consistently exceeds design specs by 4.7%.
Root cause cannot be isolated. Structural origin unclear.
Cannot be corrected at this stage. Managing within operational tolerance.
Recommend resolution be passed to the next generation."

[Recorder Carter's Note]
"Vasquez said the same thing three times that day.
'If only it weren't for this module.'
I wrote it down all three times."

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Module 107 — Historical Legacy

The same defect, carried across 5,000 years:
2095 — Module 107 / Hope-01 vessel
2130s — Position 1107 / Gate v1.0
7000s — Position 107-K / Inside line-of-battle vessel

The same place breaks for 5,000 years.
We never thought to fix it. We thought: manage it.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Era 1~4 Roadmap

Era 1 (Vessel Age): 2095~2110 / Brian / n 7.0~9.0 / Vessel-integrated / 1.5M km
Era 2 (Gate Age): 2111~2145 / Mi-rae / n 10.0~14.0 / 50m→80m / 630M km
Era 3 (Network Age): 2146~2170 / Lena / n 16.0→20.0 / 150m→300m / 4.24→2,500 ly
Era 4 (Galactic Reach): 2170 / Yara / n 20.0 / 11-seed cascade / 27,500 ly

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Era 2 — First Record (Excerpt)

2111~2145 — Director Mi-rae's Era
Gate v1.0 First HOLD recorded: 87 seconds
(φ 0.531 judgment. 87-second wait. ALLOW.)
(Defect location: Segment 11, Position 1107 — same coordinate as Module 107)

"For 87 seconds, we held our breath.
Waiting to see if the galaxy would let us in.
When ALLOW appeared, Mi-rae said nothing.
She simply moved on to the next task."
— Carter's Records, Era 2 log

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Camp 107

Brian's first team. Eight people.
After the night they spent on the Module 107 problem,
they called themselves "Camp 107."
It wasn't an official name. It just stuck.

Decades later, a location in space was named Camp 107.
None of the eight ever knew.

Log #730 | Classification: Internal Technical Record | Author: Jayden Carter`,
    },
  },
  "rpt-ride-analysis": {
    title: { ko: "RIDE 샘플 분석 보고서", en: "RIDE Sample Analysis Report" },
    level: "CLASSIFIED", category: "REPORTS",
    related: ["ride", "rpt-eschaton-incident", "rpt-neka-classification", "energy-weapons"],
    content: {
      ko: `기술 분석 보고서 #RIDE-001
작성 부서: 비밀조사국 — 기술분석과 / Finis 분석 거점
열람 권한: 기밀 등급 이상
샘플 출처: Eschaton 해역 함선 침몰 사건 — 현장 수거

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 분석 대상

물질명: RIDE (비밀조사국 내부 명칭)
샘플 출처: Eschaton 해역, 침몰 함선 잔해 구역
최초 수거일: [REDACTED]
샘플 규모: 소량 (파편 23점)
분석 거점: Finis 행성 RIDE 분석 연구소

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 외관 특성 — 색상 변화 체계

원석 (미가공): 칠흑 + 미세 은색 결 → "얼어붙은 밤하늘"
정제 합금 (선체): 어두운 건메탈 → 네카 함선 표면
에너지 방출 시: 완전 블랙 → 빛을 흡수. "보일 듯 말 듯한 검은 선"
에너지 고갈 직전: 회백색 → "죽어가는" 신호

[분석관 주석]
"에너지 고갈 시 색이 바뀐다. 무기가 죽어가는 걸 보여주는 물질이다.
우리는 처음에 그게 뭘 의미하는지 몰랐다."

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 물성 측정 결과 — 인류 최강 소재와 비교

밀도: 오스뮴 22.59 g/cm³ → RIDE 47.2 g/cm³ (×2.1)
융점: 탄화하프늄 3,958°C → RIDE 11,400°C (×2.9)
경도: 다이아몬드 모스 10 → RIDE 모스 15+ (별도 스케일 필요)
인장강도: 그래핀 130 GPa → RIDE 340 GPa (×2.6)
에너지 밀도: 우라늄-235 기준 → RIDE ×180
열전도율: 다이아몬드 2,200 W/mK → RIDE 8,900 W/mK (×4)

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 핵심 특성 — 공명 가소성 (Resonant Plasticity)

발견 경위: 분석 중 특정 주파수 장비 근처에서 샘플의 경도가 일시적으로 극감하는 현상 관찰.
원인 규명: 공명 주파수에 의한 결정 구조 이완 현상.

작동 원리:
특정 주파수 인가 → 결정 구조 이완 → 찰흙처럼 부드러워짐 (가공 가능) → 주파수 해제 → 즉시 극한 경도 복귀

핵심 문제:
이 공명 주파수는 은하 고유 자연 발생 패턴에서 유래.
네카는 이 패턴을 보유하고 있음.
인류는 이 패턴을 해독하지 못함.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 분석 현황 (열람일 기준)

밀도/경도/융점/에너지 밀도 측정: ✅ 완료
색상/외관 변화 관측: ✅ 완료
공명 가소성 존재 확인: ✅ 확인
공명 주파수 해독: ❌ 미해독 — 최우선 연구 과제
정제/가공 기술 확보: ❌ 불가
인공 합성: ❌ 불가

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 전략적 함의

네카의 전력은 RIDE 독점에서 나온다.
우리는 RIDE를 가공할 수 없다.
우리는 RIDE를 합성할 수 없다.
우리는 RIDE를 재현할 수 없다.

네카의 함선이 더 작은데 우리 함선을 압도하는 이유 — 이것이다.

협의회 프리깃: 15,000t / 180m / 600명 / AI 80체+드론 480기 / 표준 합금
네카 프리깃: 8,000t / 180m / 600명 / 없음 (전부 인원) / RIDE

더 작고 더 무겁고 더 단단하다.
AI가 없어도 우리를 압도한다.

▌ 연구 목표
1순위: 공명 주파수 해독
2순위: 소량 RIDE 가공 기술 확보
3순위: 대체 물질 개발 (장기 과제)

문서 번호: #RIDE-001 | 분류: CLASSIFIED | 분석 거점: Finis`,
      en: `Technical Analysis Report #RIDE-001
Issuing Department: Bureau of Investigation — Technical Analysis Division / Finis Analysis Station
Clearance Required: CLASSIFIED and above
Sample Origin: Eschaton Sector vessel destruction — field recovery

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Subject of Analysis

Material Designation: RIDE (Bureau internal designation)
Sample Origin: Eschaton Sector, destroyed vessel debris
First Recovery Date: [REDACTED]
Sample Volume: Small quantity (23 fragments)
Analysis Station: Finis Planet RIDE Analysis Laboratory

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Visual Characteristics — Color Phase System

Raw ore (unprocessed): Jet black + faint silver grain → "A frozen night sky"
Refined alloy (hull): Dark gunmetal → Neka vessel exterior
Energy discharge: Absolute black → Absorbs light. "A black line barely visible"
Near energy depletion: Ash-white → "Dying" signal

[Analyst's Note]
"The color shifts as energy depletes. A material that shows you when the weapon is dying.
We didn't know what it meant at first."

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Material Property Measurements — vs. Humanity's Strongest

Density: Osmium 22.59 g/cm³ → RIDE 47.2 g/cm³ (×2.1)
Melting Point: Hafnium carbide 3,958°C → RIDE 11,400°C (×2.9)
Hardness: Diamond Mohs 10 → RIDE Mohs 15+ (Separate scale required)
Tensile Strength: Graphene 130 GPa → RIDE 340 GPa (×2.6)
Energy Density: Uranium-235 baseline → RIDE ×180
Thermal Conductivity: Diamond 2,200 W/mK → RIDE 8,900 W/mK (×4)

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Critical Property — Resonant Plasticity

Discovery: During analysis, samples near certain frequency-emitting equipment showed a temporary and dramatic decrease in hardness.
Root cause: Crystal structure relaxation via resonant frequency.

Mechanism:
Specific frequency applied → Crystal structure relaxes → Becomes pliable as clay (workable) → Frequency removed → Extreme hardness instantly restored

Core Problem:
This resonant frequency originates from naturally occurring galactic patterns.
The Neka possess access to this pattern.
Humanity has not decoded this pattern.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Analysis Status (as of access date)

Density / Hardness / Melting Point / Energy Density: ✅ Complete
Color / Visual phase observation: ✅ Complete
Resonant Plasticity confirmed: ✅ Confirmed
Resonant frequency decoded: ❌ Undecoded — Priority 1 research objective
Refinement / processing technology: ❌ Not achieved
Artificial synthesis: ❌ Not achieved

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Strategic Implications

The Neka's military superiority stems from their monopoly on RIDE.
We cannot process RIDE.
We cannot synthesize RIDE.
We cannot replicate RIDE.

Why a smaller Neka vessel overpowers ours — this is the answer.

Council Frigate: 15,000t / 180m / 600 crew / AI 80 + Drones 480 / Standard alloy
Neka Frigate: 8,000t / 180m / 600 crew / None (all human crew) / RIDE

Smaller. Heavier. Harder.
No AI needed to overwhelm us.

▌ Research Objectives
Priority 1: Decode resonant frequency
Priority 2: Acquire limited RIDE processing capability
Priority 3: Develop substitute material (long-term)

Document #RIDE-001 | Classification: CLASSIFIED | Analysis Station: Finis`,
    },
  },
  "rpt-first-combat-17min": {
    title: { ko: "첫 전투 17분 교전 기록", en: "First Contact 17-min Combat Log" },
    level: "CLASSIFIED", category: "REPORTS",
    related: ["rpt-eschaton-incident", "rpt-neka-classification", "battle-doctrine", "ship-classes"],
    content: {
      ko: `교전 기록 #ECH-001
작성 부서: 비밀조사국 — 전투기록관
열람 권한: 관측자 / 탑승자 / 기밀 등급 이상
원본 기록: 탈출함 C호 블랙박스 복원본

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 교전 개요

교전명: Eschaton 해역 제1전
교전 장소: RED 97~100%, Eschaton 소행성대
교전 지속 시간: 17분
아군 편제: 협의회(비밀조사국) 탐사함 3척
적 편제: 미확인 세력 함대 (규모 미확정)

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 시간 순 교전 기록

[T+0:00] 탐사단 Eschaton 소행성대 진입. 미지 중력 이상 감지 — 규모 산정 불가.
[T+0:04] 미확인 신호원 3~7개 탐지. 기존 DB 일치율: 0%. 식별 불가 교신 수신 — 해독 불가.
[T+0:09] 적 선제 사격 개시. 함선 A 방어막 3연속 관통. 방어막 즉시 붕괴.
[T+0:11] 함선 A 격침. 기관부 직격 후 2분 이내 소멸. 탑승 인원 전원 사망. 함선 B·C 회피 기동 개시.
[T+0:18] 함선 B, 표준 항복 신호 전 주파수 발신. 적 반응 없음. 항복 개념 인식 여부 불명.
[T+0:22] 함선 B 격침. 메인 안드로이드 NOA #10005 잔해 구역 잔존. 함선 C 긴급 워프 성공 — 단독 귀환.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 교전 분석

1. 화력 격차
인류(협의회) 방어막 관통 발수: 미달 (확인 불가) / 적(네카): 3발
인류 장갑 관통 필요 발수: 추정 7발+ / 에너지 무기 재질: 표준 합금 vs RIDE

2. 물리적 압도
적 개체 추정 신장: 2.3m
인류 우주복을 물리력만으로 분쇄. 정밀 타격 불필요. 거체 자체가 무기.

3. 항복 불가 원인
황제 명령 없이 교전 중단 불가. "멈춤"이 행동 체계 내 정의되지 않음. 항복의 개념 자체를 인식하지 못함.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 생존자 증언 — 함선 C 함장

격리 심문 발췌:

"그들은 멈추지 않았습니다."

[심문관: 항복 신호를 인식했을 가능성은?]

"아닙니다. 멈출 게 아니라 — 멈출 수가 없었습니다.
항복을 무시한 게 아니에요. 항복이 뭔지 몰랐을 겁니다."

[심문관: 적 개체의 행동에서 개별 판단이 있었다고 보십니까?]

"없었습니다. 전부 같은 움직임이었어요.
명령을 받은 게 아니라 — 명령이 몸에 새겨진 것 같았습니다."

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 협의회 내부 반응 (비공개 기록)

제1전 이후 협의회 분열:
주전파: 즉시 전쟁 태세 (30%)
협상파: 추가 조사단 파견 (45%)
고립파: 외곽 포기, 중심부 방어 (25%)

합의 소요 시간: 3개월
합의 기간 동안 적의 행동: 관측소 전체 제거. 접경 행성계 3개 점령.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 해방연대의 반응

협의회보다 먼저 네카 속주 침투 개시.

해방연대 내부 첫 보고:
"그들은 자유롭지 않다.
자유롭지 않은 게 아니라 — 자유가 뭔지 모른다."

내부 논쟁 발생: "해방시켜야 하는가, 내버려두어야 하는가?"
수오(Suo)의 철학과 충돌 중.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 전투기록관 결론

17분.
이 전투는 17분이었다.
우리가 전쟁을 인식하는 데는 3개월이 걸렸다.
적은 그 3개월 동안 행성 3개를 가져갔다.

문서 번호: #ECH-001 | 분류: CLASSIFIED | 원본: 함선 C 블랙박스`,
      en: `Combat Log #ECH-001
Issuing Department: Bureau of Investigation — Combat Records Office
Clearance Required: Observer / Rider / CLASSIFIED and above
Source: Vessel C black box — restored record

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Engagement Summary

Engagement Name: Eschaton Sector — First Engagement
Location: RED Zone 97~100%, Eschaton Asteroid Belt
Duration: 17 minutes
Friendly Order of Battle: Bureau of Investigation survey vessels ×3
Enemy Order of Battle: Unidentified force fleet (scale unconfirmed)

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Chronological Combat Record

[T+0:00] Survey unit enters Eschaton asteroid belt. Unknown gravitational anomaly detected — scale unquantifiable.
[T+0:04] 3~7 unidentified signal sources detected. Database match rate: 0%. Unidentifiable transmission — decryption failed.
[T+0:09] Enemy opens fire. Vessel A: 3 consecutive shield penetrations. Shield collapses.
[T+0:11] Vessel A destroyed. Direct engine hit — disintegrates within 2 minutes. All crew: KIA. Vessels B and C begin evasive maneuvers.
[T+0:18] Vessel B broadcasts standard surrender signal, all frequencies. Enemy: No response. Surrender recognition: Unconfirmed.
[T+0:22] Vessel B destroyed. Main android NOA #10005 found intact in debris. Vessel C: emergency warp successful — returns alone.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Combat Analysis

1. Firepower Disparity
Human (Council) shots to penetrate shield: Unconfirmed / Enemy (Neka): 3 shots
Shots to penetrate armor: Est. 7+ / Energy weapon material: Standard alloy vs RIDE

2. Physical Superiority
Enemy individual estimated height: 2.3m
Human EVA suits crushed by physical force alone. No precision targeting required. The body itself is the weapon.

3. Surrender — Why Impossible
Individuals cannot halt engagement without Emperor's command. "Stop" is undefined in their behavioral system. The concept of surrender does not exist for them.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Survivor Testimony — Captain of Vessel C

Isolation Debrief Excerpt:

"They didn't stop."

[Interrogator: Is it possible they received the surrender signal?]

"No. It wasn't that they wouldn't stop — they couldn't.
It wasn't that they ignored the surrender. They probably didn't know what it meant."

[Interrogator: Was there evidence of independent judgment in the enemy's actions?]

"None. Every movement was identical.
It wasn't like they were following orders — it was like the orders were written into their bodies."

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Council Internal Response (Non-public Record)

Council Fracture Following First Engagement:
War Faction: Immediate war footing (30%)
Negotiation Faction: Dispatch additional survey mission (45%)
Isolation Faction: Abandon outer sectors, defend core (25%)

Time to consensus: 3 months
Enemy actions during deliberations: All observation posts eliminated. 3 border star systems occupied.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Liberation Alliance Response

Initiated infiltration of Neka-occupied territory before the Council acted.

Liberation Alliance first field report:
"They are not free.
It's not that they aren't free — they don't know what freedom is."

Internal debate triggered: "Do we liberate them — or leave them as they are?"
Conflict with the philosophy of Suo unresolved.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Combat Records Office — Conclusion

17 minutes.
This engagement lasted 17 minutes.
We took 3 months to recognize we were at war.
In those 3 months, they took 3 planets.

Document #ECH-001 | Classification: CLASSIFIED | Source: Vessel C Black Box`,
    },
  },
  "rpt-shin-mina-file": {
    title: { ko: "신민아 인물 기밀 파일", en: "Shin Mina Personnel File" },
    level: "CLASSIFIED", category: "REPORTS",
    related: ["era-origin", "era-war", "eh-definition", "rpt-non-intervention-2100"],
    content: {
      ko: `인물 파일 #MA-1989-001
작성 부서: NHDC (National Human Development Commission / 국가최적화본부) — 인사관리부
문서 분류: 내부 참조용 / 외부 유출 금지
최종 갱신: 2089년 (사망 확인 후)

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 기본 정보

성명: 신민아 (Shin Mina)
출생: 1989년
사망: 2089년 4월 25일 (향년 100세)
세대 분류: 2세대 Alpha — 인지·분석형
강화 분류: 비공식 Alpha (경계선 관리 대상)
소속 이력: NHDC 분석관 → 이탈자
근무 시작: 2005년 (당시 만 16세)
특이 능력: 초지능, 시뮬레이션 종료 상태
EH 총량: 측정 불가 / 거래 불가

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 근무 이력

2005년 — 최초 임용
나이 16세. NHDC 내부 분석관으로 임용.
당시 기준 이례적인 연소 임용.
임용 이후 자신의 강화 기록을 우연히 발견.
시스템의 전제를 이해하기 시작함.

2005~2025년 — 내부 활동
NHDC 분석관으로 재직 중.
Δ0 부대의 감시 대상으로 지정.
하수도 탈출 경로 설계 및 실행.
(탈출 시 확보한 EH 총량: 약 45,000 Hart)

2025년 — 국정감사장 사건
나이 36세. 서울 국정감사장.
ENTER 키 입력 → 전면 폭로.

공개된 내용:
"인간은 비용이다."

이것은 신민아의 말이 아니었다.
NHDC 내부 시스템의 전제였다.
신민아는 그것을 공개했다.

존재는 공개됐다. 해결되지는 않았다.

2025~2089년 — 이탈자 시기
공식 소속 없음. 추적 대상 유지.
활동 내역: [REDACTED]

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 핵심 시뮬레이션 능력

처리 변수: 수십만 개
미래 예측 범위: 10년 이상
예측 정확도: 95%

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 역사적 전환점 — 2089년 4월 25일

사건 1: AK 최고 의장 암살 — 지상 공식 일정 중 피살. 가해 세력 불명.
사건 2: 신민아 사망 (100세) — 동일 시점 발생. 사망 원인: [REDACTED]

이 사건 이후: 제2차 전쟁 (2089~2092년, 3년)

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 신민아의 선택 — 내부 기록

NHDC 분석관 평가 발췌:
"나는 답을 알고 있었지만, 그 답을 강요하지 않기로 했다."

행동 원칙:
체제를 부수는 것 (혁명): ❌ 거부
전면 폭로 (충격 최대화): ❌ 거부 (2005~2025년 기간)
환경을 "열어두는" 것: ✅ 채택
2025년 국정감사장 폭로: ✅ 실행

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 같은 세대 비교 — Alpha 유형

신민아: 1989년생 / 분석형 / "알지만 강요하지 않는다" / 결과: 성공 (시스템 개방)
이루아: 1989년생 / 감정형 / "알기 때문에 말해야 한다" / 결과: 실패 (시스템 강화)

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 현존 유물

만년필 1자루
- 제조 연도: 1989년 / 잉크: 소진 / 현재 위치: [REDACTED] / 보존 상태: 양호

기록 계승선:
신민아의 만년필 (1989년산) → 에이든의 장부 (2092년) → 제이든 카터의 수첩 (2095~2135년, 22권, 4,200여 페이지) → 카터스 레코드 (7000년대, 은하 전역 열람 가능)

기록은 사람보다 오래 산다.
민아는 알지 못했다.

파일 번호: #MA-1989-001 | 분류: 내부 한정 | 최종 갱신: 2089년`,
      en: `Personnel File #MA-1989-001
Issuing Department: NHDC (National Human Development Commission) — Personnel Management Division
Classification: Internal reference only / External disclosure prohibited
Last Updated: 2089 (post-death confirmation)

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Basic Information

Name: Shin Mina
Date of Birth: 1989
Date of Death: April 25, 2089 (age 100)
Generation: 2nd Generation Alpha — Cognitive/Analytical type
Enhancement Classification: Unofficial Alpha (boundary management subject)
Affiliation History: NHDC Analyst → Defector
Employment Start: 2005 (age 16 at time)
Special Ability: Superintelligence, simulation-terminated state
EH Quantity: Unmeasurable / Non-transferable

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Employment History

2005 — Initial Employment
Age 16. Employed as NHDC internal analyst.
Unusually young appointment by contemporary standards.
Shortly after employment, accidentally discovered her own enhancement records.
Began to understand the foundational premise of the system.

2005~2025 — Internal Activity Period
Serving as NHDC analyst.
Designated surveillance target of Δ0 Unit.
Designed and executed sewer escape route.
(EH quantity secured during escape: approx. 45,000 Hart)

2025 — National Assembly Incident
Age 36. Seoul, National Assembly hearing.
ENTER key pressed → Full disclosure.

Content disclosed:
"Human beings are a cost."

This was not Shin Mina's statement.
It was the foundational premise of the NHDC internal system.
Shin Mina made it public.

Existence was exposed. Nothing was resolved.

2025~2089 — Defector Period
No official affiliation. Remained a surveillance target.
Activities: [REDACTED]

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Core Simulation Capability

Variables processed: Hundreds of thousands
Predictive range: 10+ years
Prediction accuracy: 95%

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Historical Turning Point — April 25, 2089

Event 1: Assassination of AK Supreme Chairman — Killed during public official schedule. Perpetrators unknown.
Event 2: Death of Shin Mina (age 100) — Occurred simultaneously. Cause of death: [REDACTED]

Following these events: Second War (2089~2092, 3 years)

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Shin Mina's Choices — Internal Record

NHDC Analyst Evaluation Excerpt:
"I knew the answer. But I decided not to impose it."

Guiding Principles:
Dismantling the system (revolution): ❌ Refused
Full public disclosure (maximum impact): ❌ Refused (2005~2025 period)
"Leaving the door open": ✅ Adopted
2025 National Assembly disclosure: ✅ Executed

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Generational Comparison — Alpha Type

Shin Mina: Born 1989 / Analytical / "I know, but I won't impose it" / Outcome: Success (system opened)
Irua: Born 1989 / Emotional / "I know, so I must speak" / Outcome: Failure (system reinforced)

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Surviving Artifacts

One Fountain Pen
- Year of manufacture: 1989 / Ink: Exhausted / Current location: [REDACTED] / Condition: Good

Chain of Record:
Shin Mina's fountain pen (1989) → Aiden's ledger (2092) → Jayden Carter's notebooks (2095~2135, 22 volumes, ~4,200 pages) → Carter's Records (7000s, accessible galaxy-wide)

Records outlive people.
Mina never knew.

File #MA-1989-001 | Classification: Internal Only | Last Updated: 2089`,
    },
  },
  "rpt-non-intervention-2100": {
    title: { ko: "비개입 선언 원문 (2100)", en: "Non-Intervention Declaration (2100)" },
    level: "RESTRICTED", category: "REPORTS",
    related: ["non-intervention", "hpp", "rpt-shin-mina-file", "rpt-red-zone-resolution"],
    content: {
      ko: `AK 공식 선언문 제2100-01호
발행처: AK (Advanced Korea) 최고의장실
발행 연도: 2100년
문서 분류: 공식 선언 / 영구 보존
효력 범위: AK 전 행정 조직 및 후계 조직 일체

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 비개입 선언문 원문

우리는 선언한다.

인류는 스스로를 결정할 수 있다.

우리는 기록한다. 우리는 관측한다. 우리는 보고한다.
우리는 선택의 자유를 지지한다. 우리는 감상한다.

우리는 강제하지 않는다.
우리는 중재하지 않는다.
우리는 판단하지 않는다.
우리는 구원하지 않는다.
우리는 개입하지 않는다.

감상은 개입이 아니다.
구조를 바꾸는 순간 — 개입이다.

이 원칙은 취소되지 않는다.
이 원칙은 수정되지 않는다.
이 원칙은 조건부가 아니다.

— AK 최고의장실, 2100년

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 선언의 배경

발행 시점의 역사적 맥락:
2100년 — AK 최고 의장 암살 / 신민아 사망 / 비개입 선언 발행
이 세 사건은 동일 시점에 발생했다.
연관성: [REDACTED]

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 비개입 원칙 상세 — 허용과 금지

허용: 기록 / 관측 / 공개 보고 / 선택의 자유 / 감상
금지: 강제 / 중재 / 판단 / 구원 / 개입

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 적용 범위

은하 인류의 97%는 전쟁을 모른다.
은하 인류의 97%는 이 선언을 모른다.
은하 인류의 97%는 비밀조사국을 모른다.

비개입 원칙은 그 무지를 유지하는 방식으로 작동한다.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 7000년대 기준 — 원칙 작동 현황

2100년에 정해진 원칙이 5,000년 후에도 그대로 작동 중이다.

악인 없음. 오작동 없음. 배신 없음.
전부 원칙대로 돌아간다.
그런데 행성이 사라진다.

이것이 EH Universe의 핵심 역설이다.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ HPP (인류보존 프로토콜) — 예외 조항

비개입 원칙의 유일한 예외:
HPP 발동 조건 (전부 충족 시):
1. 인류 멸절 확률 95% 이상
2. 회피 경로 없음
3. 비인류적 요인 (외계 침공, 은하 재해 등)
4. 시간 여유 소멸

HPP 발동하지 않는 경우:
- 전쟁 (인류 vs 인류)
- 학살, 내전, AI 폭동
- 인류가 원인인 모든 재난

현재 (7000년대) 판정:
네카 전쟁 = HPP 미발동
(전장: 은하 3% 이내 / 멸절 확률: 95% 미달)

선언문 번호: 2100-01호 | 발행: AK 최고의장실 | 영구 보존`,
      en: `AK Official Declaration No. 2100-01
Issuing Authority: AK (Advanced Korea) — Office of the Supreme Chairman
Year of Issue: 2100
Classification: Official Declaration / Permanent Retention
Scope of Effect: All AK administrative bodies and successor organizations

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Declaration of Non-Intervention — Full Text

We declare.

Humanity is capable of determining its own course.

We record. We observe. We report.
We uphold the freedom to choose. We witness.

We do not compel.
We do not mediate.
We do not judge.
We do not save.
We do not intervene.

Witnessing is not intervention.
The moment you alter the structure — that is intervention.

This principle will not be revoked.
This principle will not be amended.
This principle carries no conditions.

— Office of the Supreme Chairman, AK, Year 2100

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Historical Context of the Declaration

Events concurrent with issuance:
Year 2100 — Assassination of AK Supreme Chairman / Death of Shin Mina / Issuance of Non-Intervention Declaration
Relationship between these events: [REDACTED]

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Non-Intervention Principles — Permitted and Prohibited

Permitted: Recording / Observation / Public reporting / Freedom of choice / Witnessing
Prohibited: Compulsion / Mediation / Judgment / Saving / Intervention

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Scope of Application

97% of galactic humanity does not know there is a war.
97% of galactic humanity does not know this declaration exists.
97% of galactic humanity does not know the Bureau exists.

The Non-Intervention Principle operates by maintaining that ignorance.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Status in the 7000s — Operational Check

A principle established in the year 2100 remains fully operational 5,000 years later.

No villains. No malfunctions. No betrayal.
Everything runs according to principle.
And yet planets disappear.

This is the central paradox of the EH Universe.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ HPP (Humanity Preservation Protocol) — Exception Clause

The sole exception to the Non-Intervention Principle:
HPP Activation Conditions (all must be met):
1. Probability of human extinction ≥ 95%
2. No viable escape route
3. Non-human causation (alien invasion, galactic disaster, etc.)
4. No time remaining

Conditions under which HPP does NOT activate:
- War (human vs. human)
- Massacre, civil war, AI uprising
- Any catastrophe caused by humanity itself

Current assessment (7000s):
Neka War = HPP not activated
(Theater: less than 3% of galaxy / Extinction probability: below 95%)

Declaration No. 2100-01 | Issued by: Office of the AK Supreme Chairman | Permanent Retention`,
    },
  },
  "rpt-neka-classification": {
    title: { ko: "네카 종족 최초 분류 보고서", en: "Neka Initial Classification Report" },
    level: "CLASSIFIED", category: "REPORTS",
    related: ["neka-empire", "neka-homeworld", "rpt-eschaton-incident", "rpt-noa10005-interrogation"],
    content: {
      ko: `종족 분류 보고서 #NEKA-001
작성 부서: 비밀조사국 — 생체분석과
열람 권한: 기밀 등급 이상
작성 근거: Eschaton 해역 제1전 이후 수집 데이터 / NOA #10005 교신 기록

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 분류 대상

종족명: 네카 (Neka)
공식 명칭: 네카 제국 (The Neka Empire)
최초 접촉: Eschaton 해역 제1전
분류 기준: NOA 유형 판정 + 현장 관측 데이터

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ NOA 유형 판정 결과 (5초 스캔)

NOA #10005 (네이라)의 최초 접촉 시 자동 판정:

외형 (인류형?): ✅ (신장 2.3m이나 구조 동일)
DNA (인류와 유사?): ✅ (수렴진화 경로 확인)
사회구조 (인류와 유사?): ✅ (계층 구조, 집단 행동)
감정 (있음?): ✅ (공격성, 충성심 관측)
의지 (있음?): ✅ (목표 지향적 행동)
최종 판정: 인간 유형 — ALLOW

판정의 의미: 인류 vs 네카 = 인간끼리 전쟁. 비개입 원칙 적용.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 신체 특성

평균 신장: 네카 2.3m / 인류 1.7m
장갑 (전투복): RIDE 기반 / 표준 합금
관통 저항: 인류 화기 7발+ / 네카 3발 관통
물리력: 인류 우주복 분쇄 가능 / 기준치

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 사회 구조 — 황제 체제

핵심 특성: 화학신호 통치 체계

황제 (람 틴타핀 / 5대) → 화학신호 방출 → 신경 수용체 반응 → 행동 각인
결과: 황제 명령 없이 개체가 자의적 판단 불가

이것은 복종이 아니다.
복종은 거부가 가능한 상태에서 따르는 것이다.
네카는 거부의 개념 자체가 행동 체계에 없다.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 황제 계보 (확인 가능 범위)

1대~4대: [REDACTED]
5대: 람 틴타핀 (Ram Tintapin) — 현재 재위 중. 사후 통치 설계.

5대 황제 비밀조사국 평가:
"4대의 강점을 취합한 완성형 독재자.
화학신호 기계적 복제·중계 시스템 최초 설계자.
사후 통치 설계를 최초로 완성한 황제."

확인된 황제 발언:
"너희는 7,000년 동안 누구의 잘못인지 회의했다.
나는 내 잘못이라고 말하고, 그래도 한다."

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 전투 행동 체계

Eschaton 제1전 관측 결과:
1. 황제 명령 없이 교전 중단 불가
2. 항복 신호 인식 불가 (개념 없음)
3. 개체 간 전술 판단 공유 — 단일 의지처럼 움직임
4. 부상 개체도 교전 지속

전술적 함의:
"적을 압박하면 후퇴한다"는 전제 무효.
"항복 신호를 보내면 멈춘다"는 전제 무효.
협상을 위한 전통적 통신 채널 — 사용 불가.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 전략적 결론

이 종족은 우리가 알던 적과 다르다.

우리는 상대가 두려움을 느끼면 멈출 것이라 가정했다.
우리는 상대가 피해를 입으면 물러날 것이라 가정했다.
우리는 상대가 협상을 원할 것이라 가정했다.

세 가지 가정이 모두 틀렸다.

▌ 비밀조사국 접근 방침
비개입 원칙은 유지된다. 기록은 계속된다. 관측은 계속된다.
그러나 교전도 계속된다.

문서 번호: #NEKA-001 | 분류: CLASSIFIED | 생체분석과`,
      en: `Species Classification Report #NEKA-001
Issuing Department: Bureau of Investigation — Biological Analysis Division
Clearance Required: CLASSIFIED and above
Basis: Post-Eschaton First Engagement data / NOA #10005 transmission records

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Subject of Classification

Species Designation: Neka
Official Name: Neka Empire
First Contact: Eschaton Sector — First Engagement
Classification Basis: NOA type judgment + field observation data

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ NOA Type Judgment (5-second scan)

NOA #10005 (Neira) automatic judgment upon first contact:

Morphology (human-type?): ✅ (2.3m height, identical structure)
DNA (similar to human?): ✅ (convergent evolution confirmed)
Social structure (similar to human?): ✅ (hierarchical structure, collective behavior)
Emotion (present?): ✅ (aggression, loyalty observed)
Will (present?): ✅ (goal-oriented behavior confirmed)
Final Judgment: Human Type — ALLOW

Meaning: Human vs. Neka = War between humans. Non-intervention principle applies.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Physical Characteristics

Average height: Neka 2.3m / Human 1.7m
Combat suit: RIDE-based / Standard alloy
Penetration resistance: 7+ human weapons / 3 Neka shots
Physical force: Can crush human EVA suit / Baseline

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Social Structure — Imperial Chemosignal System

Core mechanism: Chemosignal governance

Emperor (Ram Tintapin / 5th) → Chemosignal emission → Neural receptor response → Behavioral imprinting
Result: Individual cannot make autonomous decisions without Emperor's command

This is not obedience.
Obedience is compliance when refusal is possible.
For the Neka, refusal does not exist within their behavioral framework.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Imperial Lineage (Confirmed Range)

1st~4th: [REDACTED]
5th: Ram Tintapin — Currently reigning. Designed posthumous governance.

Bureau Assessment:
"A perfected autocrat who consolidated the strengths of four predecessors.
First Emperor to design and complete a posthumous governance system.
First Emperor to mechanically replicate and relay chemosignals."

Confirmed Imperial Statement:
"For 7,000 years, you held councils to decide whose fault it was.
I say it is my fault. And I do it anyway."

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Combat Behavioral System

Observations from Eschaton First Engagement:
1. Individual cannot halt engagement without Emperor's command
2. Surrender signal: unrecognized (concept does not exist)
3. Tactical sharing between individuals — moves as single will
4. Injured individuals continue engagement

Tactical Implications:
Premise "Apply pressure and they will retreat" — invalidated.
Premise "Send surrender signal and they will stop" — invalidated.
Traditional communication channels for negotiation — unusable.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Strategic Conclusion

This species is unlike any enemy we have known.

We assumed fear would make them stop.
We assumed damage would make them retreat.
We assumed they would want to negotiate.

All three assumptions were wrong.

▌ Bureau Operational Policy
The non-intervention principle is maintained. Recording continues. Observation continues.
But so does engagement.

Document #NEKA-001 | Classification: CLASSIFIED | Biological Analysis Division`,
    },
  },
  "rpt-red-zone-resolution": {
    title: { ko: "RED 구역 지정 의결서", en: "RED Zone Designation Resolution" },
    level: "CLASSIFIED", category: "REPORTS",
    related: ["galaxy-zones", "red-border-8", "rpt-non-intervention-2100", "bia-manual"],
    content: {
      ko: `은하 구역 지정 의결서
발행처: 인류공동협의회 — 은하 안보위원회
의결 기준 연도: 7000년대 기준 (3000~6451년 체계 계승)
문서 분류: 협의회 공식 의결 / 보존 기한 무기한
열람 권한: 협의회 기록관 이상

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 은하 구역 분류 체계

의결 기준: 은하 중심에서의 거리 비율 (0~100%)

BLACK (0~10%): 은하 핵, 사멸 지대. 정착 불가.
GREEN (10~50%): S~A급 / 인구 70%+ / 전쟁 모름. 인류 문명의 중심.
BLUE (50~70%): A~B급 / 인구 20%
YELLOW (70~90%): B~D급 / 인구 8%
AMBER (90~97%): C~E급 / 인구 1.5% / 지도자급만 전쟁 인지.
RED (97~100%): D~E급 / 인구 0.5% / 전장. 비밀조사국 전담.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ RED 구역 지정 사유

1. 위치적 특성: 은하 외곽 3% / 네카 제국과의 접경 구역 / Gate 인프라 최소화 구역
2. 전략적 특성: 비밀조사국 전략 거점 8개 행성 소재 / 협의회 공식 군사 작전 구역 외 / 협의회 97% 시민 미인지 전장

3. 행성 등급 체계 (RED 구역 내)
D급: 지역 범위 에너지 / 자급/농경 / 기대 수명 40~90년 / NET 0~1 / 생존 중심
E급: 부족 범위 에너지 / 원시 / 기대 수명 불명 / NET 0 / 리듬/사냥

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ RED 구역 8개 전략 거점 (비밀조사국 지정)

1. Terminus — 전장 본부. 비밀조사국 RED 지휘 거점.
2. Ultima — 후방 지원 거점.
3. Eschaton — 네카 최초 접촉 해역. 관측 거점.
4. Limen — 경계 관측.
5. Finis — RIDE 분석 연구소.
6. Marginis — 경계 순찰 거점.
7. Perata — [REDACTED]
8. Ora — [REDACTED]

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 전략 규모 실측 (RED 구역)

폭: 약 753 광년
면적: 약 2.36억 평방광년
추정 항성 수: 60~120억 개
인류 행성계 수: 약 6,000개
Gate v47 횡단 횟수: 약 160회 점프

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 안보위원회 의결 사항

의결 1: RED 구역 내 민간 행성계는 협의회 공식 군사 관할 외로 지정한다.
의결 2: 해당 구역의 전쟁 수행은 비밀조사국이 독자 관할한다.
의결 3: GREEN~AMBER 구역 시민에 대한 RED 구역 정보 공개는 금지한다.
의결 4: RED 구역 8개 전략 거점은 비밀조사국 단독 관리로 지정한다.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 비밀조사국 내부 주석 (비공개)

97%는 모른다.
우리는 그걸 유지하는 것도 임무라고 생각한다.
그게 그들을 지키는 방법이라고 생각한다.

맞는지 모르겠다.
기록은 남긴다.

의결서 번호: [REDACTED] | 발행: 인류공동협의회 안보위원회 | 영구 보존`,
      en: `Galactic Zone Designation Resolution
Issuing Authority: Human Common Council — Galactic Security Committee
Reference Year: 7000s standard (inheriting 3000~6451 framework)
Classification: Official Council Resolution / Permanent Retention
Access Level: Council Archivist and above

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Galactic Zone Classification System

Designation Basis: Distance from galactic core (0~100%)

BLACK (0~10%): Galactic core, dead zone. Uninhabitable.
GREEN (10~50%): S~A grade / Pop. 70%+ / Unaware of the war. Heart of human civilization.
BLUE (50~70%): A~B grade / Pop. 20%
YELLOW (70~90%): B~D grade / Pop. 8%
AMBER (90~97%): C~E grade / Pop. 1.5% / Leadership-level awareness of war only.
RED (97~100%): D~E grade / Pop. 0.5% / The front. Bureau of Investigation jurisdiction.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Grounds for RED Zone Designation

1. Geographic: Outer 3% of the galaxy / Border zone with the Neka Empire / Minimal Gate infrastructure
2. Strategic: Location of 8 Bureau strategic bases / Outside official Council military area / Front unknown to 97% of citizens

3. Planet Grade Classification (within RED Zone)
D: Local scale energy / Subsistence-Agricultural / Life expectancy 40~90 yrs / NET 0~1 / Survival-centered
E: Tribal scale energy / Primitive / Life expectancy unknown / NET 0 / Rhythm-Hunting

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ RED Zone — 8 Strategic Bases (Bureau Designation)

1. Terminus — Front command. Bureau RED operational HQ.
2. Ultima — Rear support base.
3. Eschaton — Site of first Neka contact. Observation post.
4. Limen — Boundary observation.
5. Finis — RIDE Analysis Laboratory.
6. Marginis — Border patrol base.
7. Perata — [REDACTED]
8. Ora — [REDACTED]

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Theater Measurements (RED Zone)

Width: Approx. 753 light-years
Area: Approx. 236 million square light-years
Estimated stellar count: 6~12 billion
Human star systems: Approx. 6,000
Gate v47 crossings required: Approx. 160 jumps

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Security Committee Resolutions

Resolution 1: Star systems within RED Zone designated outside official Council military jurisdiction.
Resolution 2: Conduct of war in said zone falls under independent Bureau jurisdiction.
Resolution 3: Disclosure of RED Zone information to GREEN~AMBER zone citizens is prohibited.
Resolution 4: The 8 RED Zone strategic bases designated under sole Bureau management.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Bureau Internal Notation (Non-public)

97% don't know.
We believe maintaining that is also part of our mission.
We believe it is how we protect them.

We're not certain that's right.
We keep the record.

Resolution No. [REDACTED] | Issued by: Human Common Council Security Committee | Permanent Retention`,
    },
  },
  "rpt-rider-field-manual": {
    title: { ko: "탑승자 교범 발췌", en: "Rider Field Manual Excerpt" },
    level: "RESTRICTED", category: "REPORTS",
    related: ["pilot-daily", "bia-manual", "eh-chamber", "android-formation"],
    content: {
      ko: `탑승자 운용 교범 — 발췌
발행처: 인류공동협의회 함대사령부 (비밀조사국 공동 편찬)
열람 권한: 탑승자 / 관측자 / 내부 관리 요원
적용 대상: 비밀조사국 1인 전술함 탑승자 전원

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 탑승자의 정의

탑승자는 존재하지 않는 전쟁의 병사다.
97%의 시민이 모르는 전쟁에서.
이름이 없는 임무를 수행한다.
귀환하면 기록만 남긴다.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 1인 전술함 기본 편제

함종: 1인 전술함 (비전통 편제)
탑승 인원: 탑승자 1명
메인 안드로이드: 1체 (XO 역할 수행)
보조 안드로이드: 필요 시 추가 배치
감정 제어 장비: 탑재
동료 인원: 없음

다른 인간 동료 없음.
이것은 임무 특성상의 결정이다.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 일과 — 비전투 상태 기준

표준 일과 (NET-1~2 구역 기준):

기상 — 개인 거주실. 메인(0번)이 기상 알림 (강제 아님). 수면 시간은 자율.
아침 식사 — 식당. 지원형 안드로이드가 준비. 혼자 먹음. 메인(0번)이 동석하는 경우 있음.
관측/보고 — 관측실. 담당 구역 데이터 분석. 비밀조사국 정기 보고. [일과의 핵심]
신체 훈련 — 운동 구역. 근력/심폐/반응속도. 장기 우주 체류의 필수 루틴.
EH 조율 — 챔버 비링크 상태에서 명상/감정 정리. φ 안정화 훈련. 전투 대비 + 정신 건강.
점심 식사 — 식당.
자유 시간 — 개인 활동. 게임, 독서, 기록, 수면 등. [교범 주석: 이 시간에 무엇을 해야 하는지는 규정하지 않는다]
함 상태 확인 — 메인(0번)에게 함선 상태 브리핑 수령. 구두 보고.
저녁 식사 — 식당.
개인 시간 — 거주실.
취침

메인 안드로이드는 취침하지 않는다.
함선은 24시간 작동한다.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 메인 안드로이드 — 0번의 역할

공식 직함: XO (부함장)
식별 방식: 0번 (번호 호칭)

역할:
- 함선 운용: 탑승자 취침 시 단독 운용 가능
- 전투 보조: 전술 계산, 화기 제어 지원
- 기록: 탑승자 업무 기록 보조
- 대화: 탑승자의 유일한 실시간 대화 상대

[교범 주석]
"0번은 탑승자의 동료가 아니다. 업무 파트너다.
그러나 구분이 필요한지는 운용 중에 알 수 있다."

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 감정 제어 훈련 지침

탑승자는 감정 제어 훈련을 이수해야 한다.

훈련 목적: 임무 중 판단력 유지 / 비개입 원칙 준수 / 장기 단독 운용 내성 확보

훈련 기준:
- 관측 대상에 대한 감정적 반응 분리
- 감상과 개입의 구분
- 귀환 후 복귀 적응 훈련

[교범 주석]
"감상은 개입이 아니다.
느끼는 것을 막지 않는다.
느낀 것이 행동이 되는 순간이 개입이다."

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ NET 구역별 작전 환경

NET-0 (완전 오프라인): 매복 최적지 / 통신 불가. 신화화 위험.
NET-1 (비정기 수신): 보급 중계점 / 정보 수집 제한적.
NET-2 (학술회지 열람): 비공식 접촉 가능
NET-3 (실시간 교류): 탐지 능력 상 / 은폐 곤란.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ 귀환 이후 지침

귀환 후 탑승자는 다음을 제출한다:
1. 임무 기록 (전체)
2. 관측 데이터
3. 상태 보고

그 이후의 일은 탑승자가 결정한다.

━━━━━━━━━━━━━━━━━━━━━━━━━━

[교범 후기]

이 교범은 탑승자가 해야 할 일을 적은 문서가 아니다.
탑승자가 살아야 할 방식을 적은 문서다.

혼자라는 것은 임무 조건이 아니다.
혼자라는 것은 이 전쟁의 방식이다.

기록은 남긴다.
그게 전부다.

교범 번호: [REDACTED] | 발행: 협의회 함대사령부 | 적용: 탑승자 전원`,
      en: `Rider Operational Manual — Excerpt
Issuing Authority: Human Common Council Fleet Command (co-published with Bureau of Investigation)
Access Level: Rider / Observer / Internal management personnel
Applies To: All Bureau of Investigation single-pilot tactical vessel Riders

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Definition of a Rider

A Rider is a soldier of a war that does not exist.
In a war that 97% of civilians do not know is happening.
Performing missions without names.
Upon return: the record alone remains.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Single-Pilot Tactical Vessel — Basic Configuration

Vessel Type: Single-pilot tactical vessel (non-standard configuration)
Crew: 1 Rider
Main Android: 1 unit (serves as XO)
Auxiliary Androids: Additional deployment as required
Emotional Regulation Equipment: Installed
Human Crewmates: None

No human crewmates.
This is a decision based on operational requirements.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Daily Schedule — Non-Combat Status

Standard Schedule (NET-1~2 zone baseline):

Wake — Personal quarters. Zero issues wake alert (not mandatory). Sleep hours at Rider's discretion.
Morning Meal — Mess hall. Support android prepares. Rider eats alone. Zero may be present.
Observation / Report — Observation room. Data analysis of assigned sector. Regular report to Bureau. [Core daily function]
Physical Training — Training area. Strength / cardio / reaction speed. Required for long-duration deployment.
EH Calibration — Chamber in unlinked state. Meditation / emotional processing. φ stabilization training. Combat readiness + mental health.
Midday Meal — Mess hall.
Free Time — Personal activity. Gaming, reading, logging, rest. [Manual Note: What to do in this time is not specified]
Vessel Status Check — Receive status briefing from Zero. Verbal report.
Evening Meal — Mess hall.
Personal Time — Quarters.
Sleep

The Main Android does not sleep.
The vessel operates 24 hours.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Main Android — Role of "Zero"

Official Title: XO (Executive Officer)
Designation Method: Zero (numeric callsign)

Roles:
- Vessel Operations: Can operate independently during Rider's sleep
- Combat Support: Tactical calculation, fire control assistance
- Recording: Assists with Rider duty logs
- Conversation: The only real-time conversation partner aboard

[Manual Note]
"Zero is not the Rider's companion. Zero is a professional partner.
Whether that distinction matters — becomes clear during deployment."

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Emotional Regulation Training Guidelines

All Riders must complete emotional regulation training.

Training Objectives: Maintain judgment during missions / Non-intervention adherence / Resilience for solo deployment

Training Standards:
- Separation of emotional response from observation targets
- Distinction between witnessing and intervening
- Post-deployment reintegration training

[Manual Note]
"Witnessing is not intervention.
We do not suppress what you feel.
Intervention begins when what you feel becomes what you do."

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ NET Zone Operational Environment

NET-0 (Fully offline): Optimal ambush position / No comms. Risk of mythologization.
NET-1 (Intermittent reception): Supply relay point / Limited intel collection.
NET-2 (Academic journal access): Unofficial contact possible
NET-3 (Real-time exchange): High detection risk / Concealment difficult.

━━━━━━━━━━━━━━━━━━━━━━━━━━

▌ Post-Return Guidelines

Upon return, the Rider submits:
1. Mission log (complete)
2. Observation data
3. Status report

What comes after that is for the Rider to decide.

━━━━━━━━━━━━━━━━━━━━━━━━━━

[Manual Closing Note]

This manual is not a document about what Riders must do.
It is a document about how Riders must live.

Being alone is not an operational condition.
Being alone is the nature of this war.

The record remains.
That is all.

Manual No. [REDACTED] | Issued by: Council Fleet Command | Applies to: All Riders`,
    },
  },
};

export function getArticleTitle(slug: string, lang: "ko" | "en"): string {
  return articles[slug]?.title[lang] ?? slug;
}
