(function () {
  "use strict";

  const STORAGE_KEY = "eh-warp-gate-command-state";
  const CONSISTENCY_TARGET = 0.51;
  const CONSISTENCY_BAND_CENTER = 0.5;
  const CONSISTENCY_BAND_HALF_WIDTH = 0.2;
  const CONSISTENCY_BAND_MIN = CONSISTENCY_BAND_CENTER - CONSISTENCY_BAND_HALF_WIDTH;
  const CONSISTENCY_BAND_MAX = CONSISTENCY_BAND_CENTER + CONSISTENCY_BAND_HALF_WIDTH;

  const ERA_DEFS = [
    { id: "ships", name: "1시대", title: "함선의 시대", rangeRequirement: 0, hctgRequirement: 7.0 },
    { id: "gates", name: "2시대", title: "게이트의 시대", rangeRequirement: 160, hctgRequirement: 10.0 },
    { id: "stars", name: "3시대", title: "네트워크와 별의 시대", rangeRequirement: 1200, hctgRequirement: 16.0 },
    { id: "galaxy", name: "4시대", title: "은하 중심 도달", rangeRequirement: 3200, hctgRequirement: 20.0 },
  ];

  const SHIPS = [
    {
      id: "hope01",
      name: "Hope-01",
      tag: "튜토리얼 드론",
      crew: "0",
      hull: 0.44,
      quantum: 0.32,
      sensor: 0.58,
      rangeBias: 1.08,
      stressGuard: 0.16,
      description: "무인 튜토리얼 정찰기. Deep Core 회수가 이 기체의 존재 이유 전부다.",
    },
    {
      id: "warp_probe",
      name: "Warp Probe",
      tag: "소모성 정찰기",
      crew: "0",
      hull: 0.38,
      quantum: 0.48,
      sensor: 0.72,
      rangeBias: 1.22,
      stressGuard: 0.08,
      description: "위험 항로용 탐사 프로브. 높은 분기 판독값, 낮은 생존 여유.",
    },
    {
      id: "warpship_mk1",
      name: "Warpship Mk I",
      tag: "1인승 러너",
      crew: "1",
      hull: 0.62,
      quantum: 0.56,
      sensor: 0.48,
      rangeBias: 1.36,
      stressGuard: 0.24,
      description: "정식 워프 실드를 갖춘 소형 개인 함. 빠르고, 취약하고, 정밀하다.",
    },
    {
      id: "hpg_shuttle",
      name: "HPG Shuttle",
      tag: "4인승 수송기",
      crew: "4",
      hull: 0.68,
      quantum: 0.42,
      sensor: 0.44,
      rangeBias: 1.12,
      stressGuard: 0.28,
      description: "확립된 회랑 내 네트워크 주력 기체. 안정적인 중계 체인에 최적화.",
    },
    {
      id: "starship_hpg",
      name: "Starship HPG",
      tag: "심우주 탐사선",
      crew: "6",
      hull: 0.82,
      quantum: 0.61,
      sensor: 0.57,
      rangeBias: 1.7,
      stressGuard: 0.36,
      description: "최종 등급 착륙 가능 탐사선. 이동 비용이 높지만, 별에 도달하도록 설계되었다.",
    },
  ];

  const ZONES = [
    {
      id: "l2_calibration",
      name: "L2 Calibration Corridor",
      subtitle: "HPG 프로젝트 시작",
      distanceText: "150만 km",
      requiredSpan: 20,
      gateTierRequired: 1,
      risk: 0.12,
      minPhi: 0.41,
      minPsi: 0.43,
      reward: { energy: 40, materials: 24, hydrogen: 4, intel: 18 },
      x: 50,
      y: 20,
      description: "최초의 통제된 회랑. 챔버에게 안전한 워프가 어떤 것인지 가르치는 데 사용된다.",
    },
    {
      id: "jupiter_arc",
      name: "Jupiter Direct Warp",
      subtitle: "Gate I 및 Gate II 확장",
      distanceText: "5억 3천만 km",
      requiredSpan: 160,
      gateTierRequired: 2,
      risk: 0.22,
      minPhi: 0.46,
      minPsi: 0.48,
      reward: { energy: 50, materials: 36, hydrogen: 8, intel: 24 },
      x: 74,
      y: 36,
      description: "메인 링의 첫 번째 본격적인 시험. 여기서부터 중계기 간격이 중요해진다.",
    },
    {
      id: "seed_belt",
      name: "Seed Belt Relay Arc",
      subtitle: "자율 게이트 시드",
      distanceText: "토성 너머 네트워크 체인",
      requiredSpan: 460,
      gateTierRequired: 2,
      risk: 0.3,
      minPhi: 0.5,
      minPsi: 0.52,
      reward: { energy: 62, materials: 46, hydrogen: 12, intel: 28 },
      x: 80,
      y: 58,
      description: "중계기 밀집 항로. 게이트 시드가 앞선 경로를 연쇄적으로 개척하기 시작한다.",
    },
    {
      id: "proxima_corridor",
      name: "Proxima Corridor",
      subtitle: "골드 링 프론티어",
      distanceText: "4.24 광년",
      requiredSpan: 1200,
      gateTierRequired: 3,
      risk: 0.4,
      minPhi: 0.56,
      minPsi: 0.58,
      reward: { energy: 86, materials: 62, hydrogen: 18, intel: 42 },
      x: 50,
      y: 78,
      description: "게이트가 다리에서 문명의 척추로 변하는 지점.",
    },
    {
      id: "transparent_run",
      name: "Transparent Gate Run",
      subtitle: "n=20 챔버 도약",
      distanceText: "2,500 광년",
      requiredSpan: 2200,
      gateTierRequired: 4,
      risk: 0.54,
      minPhi: 0.62,
      minPsi: 0.65,
      reward: { energy: 110, materials: 88, hydrogen: 30, intel: 56 },
      x: 24,
      y: 60,
      description: "거의 투명에 가까운 챔버 잠금. 미세한 위상 편차가 치명적이 된다.",
    },
    {
      id: "galactic_center",
      name: "Galactic Center Reach",
      subtitle: "4세대 중계 승리",
      distanceText: "27,500 광년",
      requiredSpan: 3200,
      gateTierRequired: 5,
      risk: 0.7,
      minPhi: 0.68,
      minPsi: 0.72,
      reward: { energy: 150, materials: 110, hydrogen: 42, intel: 80 },
      x: 18,
      y: 30,
      description: "최종 항로. 여기서 한 번의 깨끗한 주행이 HPG의 전체 유산의 가치를 증명한다.",
    },
  ];

  const MAIN_GATE_LEVELS = [
    null,
    { level: 1, name: "Gate I", color: "#70cfff", baseSpan: 160, stability: 0.12, diameter: "50m", lore: "초기 행성간 워프를 위한 청백색 기본 링." },
    { level: 2, name: "Gate II", color: "#c9f1ff", baseSpan: 520, stability: 0.18, diameter: "80m", lore: "항성계 규모의 직접 항로를 고정할 수 있는 확장 회랑 링." },
    { level: 3, name: "Gate III", color: "#ffd87a", baseSpan: 1400, stability: 0.24, diameter: "150m", lore: "프록시마 회랑 시대를 위한 금색 프론티어 링." },
    { level: 4, name: "Gate IV", color: "#ffe6b8", baseSpan: 2600, stability: 0.3, diameter: "220m", lore: "심우주 항성 중계 점프를 위해 건조된 고투명도 챔버." },
    { level: 5, name: "Gate V", color: "#f6ffff", baseSpan: 3400, stability: 0.36, diameter: "300m", lore: "투명 은하급 게이트. 링 형태의 문명 규모 인프라." },
  ];

  const UPGRADE_DEFS = [
    { id: "hctg", name: "HCTG 방어 격자", maxLevel: 6, effect: "격자 밀도와 워프 내성을 높인다." },
    { id: "sondol", name: "S-Ondol 열 외피", maxLevel: 4, effect: "추가 전력 소모 없이 엔트로피를 방출한다." },
    { id: "dpad", name: "D-PAD 완충기", maxLevel: 4, effect: "충격을 흡수하고 실패 시 함선 스트레스를 줄인다." },
    { id: "qlaunch", name: "Q-Launch 이온 엔진", maxLevel: 4, effect: "양자 피크와 근거리 게이트 조작을 개선한다." },
    { id: "warp_shield", name: "워프 실드", maxLevel: 4, effect: "psi 급증 시 선체 안정성을 강화한다." },
    { id: "deep_core", name: "Deep Core 회수 장치", maxLevel: 3, effect: "DENY 이벤트를 완화하고 정보를 보존한다." },
    { id: "cweh", name: "CWEH 에너지 회수", maxLevel: 4, effect: "충격과 잔류 에너지를 챔버로 재순환한다." },
  ];

  const HCTG_SCALE = [7.0, 8.5, 10.0, 12.0, 14.0, 16.0, 20.0];

  const SITUATION_DEFS = [
    {
      id: "quiet_window",
      title: "고요한 창",
      tone: "support",
      summary: "태양 노이즈가 예측치 아래로 떨어졌다. 챔버에 모든 것이 실제보다 깨끗하게 들리는 드문 전환이 찾아왔다.",
      minCampaign: 1,
      maxCampaign: 10,
      modifiers: { phi: 0.018, entropy: -0.05, branchProbability: 0.04, eRms: -0.0018 },
    },
    {
      id: "solar_shear",
      title: "태양 전단면",
      tone: "danger",
      summary: "하전 입자 흐름이 링 스택을 긁어대고 있다. 텔레메트리가 완전히 따라잡기 전에 열과 진동이 먼저 도달할 것이다.",
      minCampaign: 1,
      maxCampaign: 10,
      modifiers: { phi: -0.024, entropy: 0.065, eRms: 0.0028, branchProbability: -0.034, holdScale: 0.12, simScale: 0.1 },
    },
    {
      id: "relay_echo",
      title: "중계 에코 정렬",
      tone: "support",
      summary: "중계 체인이 우연히 위상 공명에 들어섰다. 회랑이 평소보다 더 많은 자체 하중을 감당하고 있다.",
      minCampaign: 2,
      maxCampaign: 10,
      modifiers: { psi: 0.028, relayHarmony: 0.05, branchProbability: 0.025, consistencySignal: 0.03, holdScale: -0.08 },
    },
    {
      id: "crew_drift",
      title: "승무원 생체 드리프트",
      tone: "unstable",
      summary: "호흡 주기와 체온이 챔버를 깨끗한 라인에서 밀어내고 있다. 인간의 존재가 수치를 더 부드럽고 더 험악하게 만들고 있다.",
      minCampaign: 3,
      maxCampaign: 10,
      modifiers: { phi: -0.018, entropy: 0.03, eRms: 0.0012, branchProbability: -0.02, holdScale: 0.08 },
    },
    {
      id: "thermal_bloom",
      title: "열 폭발",
      tone: "danger",
      summary: "잔류 열이 챔버 외피에 달라붙고 있다. 추가 출력 1포인트마다 사령부가 인정하고 싶은 것보다 더 많은 구조적 비용이 든다.",
      minCampaign: 4,
      maxCampaign: 10,
      modifiers: { phi: -0.02, entropy: 0.075, eRms: 0.0018, holdScale: 0.14, simScale: 0.12 },
    },
    {
      id: "gravitic_lens",
      title: "중력 렌즈 포켓",
      tone: "support",
      summary: "국소 곡률이 저항 대신 도움을 주고 있다. 게이트가 열리려 하지만, 부주의한 조종에는 여전히 벌을 줄 것이다.",
      minCampaign: 5,
      maxCampaign: 10,
      modifiers: { psi: 0.036, branchProbability: 0.032, consistencySignal: 0.02, eRms: 0.001 },
    },
    {
      id: "audit_stack",
      title: "감사 스택 적체",
      tone: "unstable",
      summary: "SJC가 동일한 결정 트리에 추가 패스를 소비하고 있다. 고장난 것은 없지만, 기계가 당신을 신뢰하는 데 더 오래 걸리고 있다.",
      minCampaign: 6,
      maxCampaign: 10,
      modifiers: { holdScale: 0.24, simScale: 0.28, branchProbability: -0.018 },
    },
    {
      id: "seed_resonance",
      title: "시드 회랑 공명",
      tone: "support",
      summary: "자율 시드 항로가 메인 링과 공명하며 윙윙거리고 있다. 회랑이 갑자기 지도가 보여주는 것보다 더 잘 연결되었다.",
      minCampaign: 7,
      maxCampaign: 10,
      modifiers: { relayHarmony: 0.06, consistencySignal: 0.038, branchProbability: 0.03, entropy: -0.028 },
    },
    {
      id: "transparent_shear",
      title: "투명 전단",
      tone: "danger",
      summary: "거의 투명한 격자 층이 서로 미끄러지고 있다. 최종 챔버는 아름답게 보이지만 칼날처럼 행동한다.",
      minCampaign: 9,
      maxCampaign: 10,
      modifiers: { phi: -0.03, psi: -0.022, entropy: 0.05, eRms: 0.0026, branchProbability: -0.06, holdScale: 0.3, simScale: 0.22 },
    },
    {
      id: "star_sea_window",
      title: "별바다의 창",
      tone: "support",
      summary: "좁은 미래의 한 스택에서 회랑이 거의 완벽에 가깝게 정렬된다. 이것은 온 세대가 평생을 쫓는 종류의 창이다.",
      minCampaign: 9,
      maxCampaign: 10,
      modifiers: { phi: 0.022, psi: 0.03, branchProbability: 0.055, consistencySignal: 0.03, holdScale: 0.1 },
    },
  ];

  const CAMPAIGNS = [
    {
      id: "campaign_01",
      number: 1,
      title: "0.51 Boundary",
      yearLabel: "2095",
      generation: "1st Gen",
      lead: "Jaden / Robert Chen",
      sjcVersion: "v1",
      zoneId: "l2_calibration",
      holdSeconds: 3,
      simRange: [3400, 18200],
      objective: "Keep Hope-01 above the machine survival boundary and prove that phi 0.51 can hold under budget pressure.",
      summary: "The project starts with one number. If phi drops below 0.51, the ship is considered dead before it truly launches.",
      requirements: {
        minPhi: 0.51,
        minConsistency: 0.51,
        maxStress: 18,
        minGateCharge: 12,
      },
      documents: [
        {
          id: "doc_c1_notebook",
          title: "Notebook Vol.1",
          author: "Jaden",
          type: "Field Notes",
          tone: "paper",
          summary: "The first note where 0.51 stops being a guess and becomes doctrine.",
          quote: "\"If phi holds, the machine lives. If it slips, we are only documenting a prettier failure.\"",
          body: [
            "The first launch window is too small for heroics. Hope-01 must be stripped until every gram confesses its purpose.",
            "Do not chase elegant numbers. Chase the number that refuses to die.",
            "Observed threshold today: phi 0.51. Mark it. Build everything around it."
          ]
        },
        {
          id: "doc_c1_budget",
          title: "Redline Budget Mail",
          author: "Robert Chen",
          type: "Finance",
          tone: "dark",
          summary: "The account says the program should already be over.",
          quote: "\"Remaining discretionary reserve: 450,000,000. One misfire and there is no next machine.\"",
          body: [
            "Every kilogram removed from the hull buys another week of life for the project ledger.",
            "Engineering wants redundancy. Finance wants proof. SJC will decide which one survives."
          ]
        }
      ],
      relic: {
        id: "relic_jaden_notebook",
        title: "Jaden's Notebook Vol.1",
        author: "Jaden",
        type: "Inherited Relic",
        tone: "paper",
        effectText: "Consistency +0.010 when phase lock stays near the target band.",
        bonuses: { consistency: 0.01 },
        quote: "\"A civilization begins when one margin stops moving.\"",
        body: [
          "The notebook margin is full of strike-throughs until the number 0.51 appears without apology.",
          "Later generations keep opening this page before difficult evaluations."
        ]
      },
      rewards: { energy: 18, materials: 10, intel: 10, setYear: 2096 },
    },
    {
      id: "campaign_02",
      number: 2,
      title: "Module 107",
      yearLabel: "2096",
      generation: "1st Gen",
      lead: "Vasquez / SJC",
      sjcVersion: "v1-batch",
      zoneId: "l2_calibration",
      holdSeconds: 2.3,
      simRange: [18400, 56200],
      objective: "Endure the silent batch-telemetry crisis and prove the lattice can self-adapt around a single failing module.",
      summary: "The player cannot stop the storm. They can only trust that the 107th module remembers how to live.",
      requirements: {
        minPhi: 0.49,
        minConsistency: 0.5,
        maxEntropy: 0.5,
        minBranchProbability: 0.42,
      },
      documents: [
        {
          id: "doc_c2_vasquez",
          title: "A5 Redline Notes",
          author: "Vasquez",
          type: "Emergency Log",
          tone: "paper",
          summary: "Normal black pen entries give way to a red line around module 107.",
          quote: "\"Do not name this luck. The lattice chose to bend before it chose to break.\"",
          body: [
            "Telemetry arrived in six-hour batches. By then the human panic was already old.",
            "Module 107 climbed toward failure, then rolled its own phase and taught the rest of the hull to follow."
          ]
        },
        {
          id: "doc_c2_batch",
          title: "Delayed Packet 17",
          author: "SJC Batch Node",
          type: "Telemetry",
          tone: "dark",
          summary: "The packet that arrived after the worst minute had already passed.",
          quote: "\"Status: HOLD 2.3 s. Outcome: adaptive survival. Human intervention: none.\"",
          body: [
            "The log is cruel because it is calm.",
            "By the time it reached Earth, the machine had already saved itself."
          ]
        }
      ],
      relic: {
        id: "relic_vasquez_pen",
        title: "Vasquez Red Pen",
        author: "Vasquez",
        type: "Inherited Relic",
        tone: "paper",
        effectText: "Collision absorption +0.040 and the first DENY pays no structural penalty.",
        bonuses: { collisionAbsorption: 0.04 },
        quote: "\"Mark the fracture before it decides to become a story.\"",
        body: [
          "The red pen was only used when failure had to be seen in advance.",
          "Later engineers keep it near terminal glass during bad HOLD windows."
        ]
      },
      rewards: { materials: 14, intel: 16, setYear: 2098 },
    },
    {
      id: "campaign_03",
      number: 3,
      title: "The Cost of Crew",
      yearLabel: "2098",
      generation: "1.5 Gen",
      lead: "Yuki / Marcus",
      sjcVersion: "v2",
      zoneId: "l2_calibration",
      holdSeconds: 5,
      simRange: [56200, 148000],
      objective: "Prove a crewed frame can survive the same corridor without letting heat and heartbeat tear phi apart.",
      summary: "The machine was precise. Humans arrive, and precision starts paying a body tax.",
      requirements: {
        minPhi: 0.52,
        minConsistency: 0.505,
        maxEntropy: 0.44,
        minUpgrade_sondol: 1,
      },
      documents: [
        {
          id: "doc_c3_medical",
          title: "Medical Observation Ledger",
          author: "Yuki",
          type: "Medical",
          tone: "paper",
          summary: "Crew pulse enters the control model and phi visibly bows under it.",
          quote: "\"A single anxious lung can cost 0.002 of certainty.\"",
          body: [
            "The first human readings looked tiny until they entered the hull model.",
            "Thermal management is no longer comfort. It is structural mercy."
          ]
        },
        {
          id: "doc_c3_multitool",
          title: "Bench Tool Memo",
          author: "Marcus",
          type: "Engineering",
          tone: "dark",
          summary: "A maintenance memo about making crewed systems feel less fragile than they are.",
          quote: "\"Nothing here is delicate. It only behaves as if it knows we are.\"",
          body: [
            "Seal vibration couplers twice. Crew ears hear what sensors forgive.",
            "If the chamber runs warm, cool the people first and the ego second."
          ]
        }
      ],
      relic: {
        id: "relic_yuki_chart",
        title: "Yuki Observation Chart",
        author: "Yuki",
        type: "Inherited Relic",
        tone: "paper",
        effectText: "Thermal support +0.035 and stress reduction +0.020.",
        bonuses: { thermalSupport: 0.035, stressReduction: 0.02 },
        quote: "\"The crew is now part of the equation. Stop pretending otherwise.\"",
        body: [
          "Every later crew manifest still borrows Yuki's first patient annotations.",
          "She turned human discomfort into a parameter the machine could respect."
        ]
      },
      rewards: { energy: 22, materials: 12, intel: 18, setYear: 2103 },
    },
    {
      id: "campaign_04",
      number: 4,
      title: "Geometry of Trust",
      yearLabel: "2103",
      generation: "2nd Gen",
      lead: "Sophia / Hope-03 Crew",
      sjcVersion: "v3",
      zoneId: "l2_calibration",
      holdSeconds: 8,
      simRange: [148000, 284000],
      objective: "Keep a three-person crew socially synchronized enough that SJC stops flagging their stress geometry.",
      summary: "The hull now carries emotions disguised as timing noise.",
      requirements: {
        minPhi: 0.54,
        minConsistency: 0.52,
        maxStress: 26,
        minIntel: 24,
      },
      documents: [
        {
          id: "doc_c4_sync",
          title: "Crew Synchrony Triangle",
          author: "Sophia",
          type: "Crew Dynamics",
          tone: "paper",
          summary: "A triangular graph proving that loneliness can show up as structure loss.",
          quote: "\"If one corner drops, the triangle cuts phi before any wrench hears it.\"",
          body: [
            "The crew did not fail as individuals. They failed as an angle.",
            "Schedule, dialogue, and sleep timing now belong in systems control."
          ]
        },
        {
          id: "doc_c4_note",
          title: "Crew Vital Note",
          author: "SJC",
          type: "System Alert",
          tone: "dark",
          summary: "The yellow warning that taught command how intimate engineering had become.",
          quote: "\"Crew Vital: Note. Synchrony has fallen beneath tolerance.\"",
          body: [
            "No alarm sounded. The line simply appeared, and the whole control room understood the ship was listening."
          ]
        }
      ],
      relic: {
        id: "relic_sophia_triangle",
        title: "Sophia Synchrony Diagram",
        author: "Sophia",
        type: "Inherited Relic",
        tone: "paper",
        effectText: "Consistency +0.012 and branch probability +0.015.",
        bonuses: { consistency: 0.012, branchProbability: 0.015 },
        quote: "\"Crew harmony is just relay harmony wearing a heartbeat.\"",
        body: [
          "This diagram is pinned near every later crew schedule board.",
          "People stopped laughing at it after the first time it prevented a DENY."
        ]
      },
      rewards: { energy: 24, materials: 18, intel: 22, setYear: 2115 },
    },
    {
      id: "campaign_05",
      number: 5,
      title: "Ship to Gate",
      yearLabel: "2115",
      generation: "2nd Gen",
      lead: "Brian / Kim Mi-rae",
      sjcVersion: "v4",
      zoneId: "jupiter_arc",
      holdSeconds: 10,
      simRange: [284000, 421000],
      objective: "Stop thinking like shipwrights. Grow Gate I and win the first psi-led ALLOW.",
      summary: "The whiteboard word changes from Ship to Gate, and history follows the marker stroke.",
      requirements: {
        requiredGateLevel: 2,
        minPsi: 0.58,
        minMainGateCharge: 26,
        minSolar: 1,
        minHctg: 12.0,
      },
      documents: [
        {
          id: "doc_c5_whiteboard",
          title: "Blue Marker Whiteboard",
          author: "Brian",
          type: "Directive",
          tone: "paper",
          summary: "A single word replaces the old mission posture: Gate.",
          quote: "\"Do not build another brave ship. Build a place where bravery is cheaper.\"",
          body: [
            "The marker line is thick because nobody in the room was ready to disagree.",
            "For the first time, psi is treated as something to cultivate instead of survive."
          ]
        },
        {
          id: "doc_c5_glg",
          title: "GLG Growth Sheet",
          author: "Kim Mi-rae",
          type: "Growth Protocol",
          tone: "dark",
          summary: "Panel counts, chamber humidity, and the strange patience of growing a gate like a crop.",
          quote: "\"n=12 does not arrive faster because we shout at it.\"",
          body: [
            "The first gate panels are not assembled. They are raised.",
            "Every sheet on this page turns time into structure."
          ]
        }
      ],
      relic: {
        id: "relic_brian_marker",
        title: "Brian's Blue Marker",
        author: "Brian",
        type: "Inherited Relic",
        tone: "paper",
        effectText: "Base phi +0.005, psi +0.020, and relay harmony +0.018.",
        bonuses: { phi: 0.005, psi: 0.02, relayHarmony: 0.018 },
        quote: "\"A word on glass can move a century if the room believes it.\"",
        body: [
          "The cap is cracked. Nobody replaces it.",
          "Later campaign boards begin with the same blue before they earn the right to change color."
        ]
      },
      rewards: { energy: 42, materials: 28, intel: 26, setYear: 2128 },
    },
    {
      id: "campaign_06",
      number: 6,
      title: "The 0.097 Second Sentence",
      yearLabel: "2128",
      generation: "2.5 Gen",
      lead: "SJC-RPT-006",
      sjcVersion: "v4 crisis",
      zoneId: "seed_belt",
      holdSeconds: 9,
      simRange: [421000, 638000],
      objective: "Recover from the first true DENY by stabilizing a rescue path around a shattered relay node.",
      summary: "The word nobody had seen turns red and decides how expensive grief is allowed to be.",
      requirements: {
        requiredGateLevel: 2,
        minRelay: 4,
        minUpgrade_deep_core: 1,
        minEnergy: 180,
        minPhi: 0.5,
        minConsistency: 0.505,
      },
      documents: [
        {
          id: "doc_c6_report",
          title: "SJC-RPT-006",
          author: "Security Archive",
          type: "Classified Report",
          tone: "dark",
          summary: "The first red DENY report, stamped before anyone could bargain with it.",
          quote: "\"Return survival probability: 39.7%. Immediate corridor authorization denied.\"",
          body: [
            "The report is cold enough to feel insulting.",
            "It does not say the crew are doomed. It says command must pay more than it expected to save them."
          ]
        },
        {
          id: "doc_c6_salvage",
          title: "Emergency Relay Bypass",
          author: "Rescue Desk",
          type: "Rescue Plan",
          tone: "paper",
          summary: "A stripped-down path that exists only to buy one more chance.",
          quote: "\"If the main line is dead, teach the network to limp.\"",
          body: [
            "Relay #223 can be bypassed only if fuel, Deep Core telemetry, and command nerve all arrive together."
          ]
        }
      ],
      relic: {
        id: "relic_deep_core_capsule",
        title: "Deep Core Capsule",
        author: "Rescue Desk",
        type: "Inherited Relic",
        tone: "dark",
        effectText: "DENY penalties soften and branch probability +0.012.",
        bonuses: { denyMitigation: 0.18, branchProbability: 0.012 },
        quote: "\"Even when the ship is gone, the argument for trying again can survive.\"",
        body: [
          "The capsule is not glorious. It is the part that comes home after glory fails.",
          "Command starts trusting salvage data the way older generations trusted instinct."
        ]
      },
      rewards: { materials: 34, intel: 30, hydrogen: 8, setYear: 2133 },
    },
    {
      id: "campaign_07",
      number: 7,
      title: "Five Hundred Candles",
      yearLabel: "2133-2138",
      generation: "3rd Gen",
      lead: "Kim Mi-rae",
      sjcVersion: "v5 direct warp",
      zoneId: "jupiter_arc",
      holdSeconds: 18,
      simRange: [638000, 982000],
      objective: "Phase-lock hundreds of relays into a single direct warp architecture and survive the handover from Brian to Mi-rae.",
      summary: "The network becomes bright enough to feel like a ritual and dangerous enough to deserve one.",
      requirements: {
        requiredGateLevel: 3,
        minRelay: 6,
        minConsistency: 0.52,
        minEnergy: 240,
        minPsi: 0.6,
      },
      documents: [
        {
          id: "doc_c7_handover",
          title: "Marker Handover",
          author: "Brian / Kim Mi-rae",
          type: "Succession Record",
          tone: "paper",
          summary: "The blue marker is set down. A black marker takes its place.",
          quote: "\"The board is still yours. The handwriting no longer has to be.\"",
          body: [
            "The room notices the change more than the ceremony.",
            "What matters is not who writes next, but whether the relays listen."
          ]
        },
        {
          id: "doc_c7_direct",
          title: "Reverse Focus Notes",
          author: "Kim Mi-rae",
          type: "Control Theory",
          tone: "dark",
          summary: "How to teach a relay field to pour itself backward into one corridor.",
          quote: "\"Direct warp is only a crowd deciding to become a spear.\"",
          body: [
            "Five hundred relay lights do not feel like infrastructure. They feel like a vigil preparing to move."
          ]
        }
      ],
      relic: {
        id: "relic_mirae_marker",
        title: "Kim Mi-rae's Black Marker",
        author: "Kim Mi-rae",
        type: "Inherited Relic",
        tone: "paper",
        effectText: "Psi +0.018, consistency +0.008, and support cycles grow faster.",
        bonuses: { psi: 0.018, consistency: 0.008, growth: 0.12 },
        quote: "\"The second line on the board is where ambition starts sounding inevitable.\"",
        body: [
          "This marker marks not invention but command of scale.",
          "From here on, the room thinks in corridors instead of destinations."
        ]
      },
      rewards: { energy: 50, materials: 40, intel: 32, setYear: 2148 },
    },
    {
      id: "campaign_08",
      number: 8,
      title: "Seeds Make Seeds",
      yearLabel: "2148",
      generation: "3rd Gen",
      lead: "Lena",
      sjcVersion: "mini v5 autonomous",
      zoneId: "proxima_corridor",
      holdSeconds: 24,
      simRange: [982000, 1425000],
      objective: "Build an autonomous seed cascade that can keep transmitting farther than sunlight can support command directly.",
      summary: "The frontier stops waiting for orders and begins recursively building its own road.",
      requirements: {
        requiredGateLevel: 3,
        minSeed: 4,
        minHarvester: 2,
        minHctg: 16.0,
        minConsistency: 0.52,
      },
      documents: [
        {
          id: "doc_c8_seed_map",
          title: "Cascade Seed Map",
          author: "Lena",
          type: "Autonomy Map",
          tone: "paper",
          summary: "A map where each seed is allowed to become the parent of the next.",
          quote: "\"If command cannot reach them in time, the seeds must inherit intent.\"",
          body: [
            "The map glows in 72-hour intervals: transmit, receive, transmit again.",
            "Autonomy here is not rebellion. It is distance becoming process."
          ]
        },
        {
          id: "doc_c8_hydrogen",
          title: "Interstellar Scoop Memo",
          author: "Lena",
          type: "Resource Protocol",
          tone: "dark",
          summary: "A memo proving the network can feed itself off the thin medium between stars.",
          quote: "\"If starlight fades, hydrogen must become a habit.\"",
          body: [
            "Without scoop recovery, every seed is just a brave waste.",
            "With it, the corridor behaves like a migrating organism."
          ]
        }
      ],
      relic: {
        id: "relic_lena_marker",
        title: "Lena's Green Marker",
        author: "Lena",
        type: "Inherited Relic",
        tone: "paper",
        effectText: "Seed growth +0.18 and resource yield +0.10.",
        bonuses: { growth: 0.18, resourceYield: 0.1 },
        quote: "\"Draw the corridor in green if you want it to remember how to grow.\"",
        body: [
          "By Lena's era, the marker color itself signals what kind of future is being drafted."
        ]
      },
      rewards: { energy: 60, materials: 48, hydrogen: 16, intel: 40, setYear: 2150 },
    },
    {
      id: "campaign_09",
      number: 9,
      title: "Footprints on Two Worlds",
      yearLabel: "2150-2158",
      generation: "3rd Gen",
      lead: "Tomas / Mei",
      sjcVersion: "v5 corridor transit",
      zoneId: "transparent_run",
      holdSeconds: 40,
      simRange: [1425000, 1870000],
      objective: "Push Starship HPG through the long corridor and land people on worlds that remember them differently.",
      summary: "One world keeps a red mark. Another washes the mark away. Command learns both count.",
      requirements: {
        requiredGateLevel: 4,
        minBranchProbability: 0.6,
        minConsistency: 0.52,
        minIntel: 140,
        minHctg: 16.0,
      },
      documents: [
        {
          id: "doc_c9_sample",
          title: "Tau Ceti Water Sample",
          author: "Tomas",
          type: "Planetary Record",
          tone: "paper",
          summary: "A quiet sample log that makes the long HOLD worth it.",
          quote: "\"The sea erased our footprint, but not our arrival.\"",
          body: [
            "The crew expected geology. Instead the first useful record felt like gratitude."
          ]
        },
        {
          id: "doc_c9_adapt",
          title: "Human Adaptation Sheet",
          author: "Mei",
          type: "Biology",
          tone: "dark",
          summary: "An attempt to measure what corridor time does to a body that still intends to walk.",
          quote: "\"Forty seconds in HOLD was enough for everyone to meet their fear by name.\"",
          body: [
            "By this campaign, the hold timer itself becomes part of mission medicine."
          ]
        }
      ],
      relic: {
        id: "relic_mei_chart",
        title: "Mei Adaptation Chart",
        author: "Mei",
        type: "Inherited Relic",
        tone: "paper",
        effectText: "Stress reduction +0.030 and hull stability +0.015.",
        bonuses: { stressReduction: 0.03, phi: 0.015 },
        quote: "\"If the body can be taught the corridor, the corridor stops feeling like punishment.\"",
        body: [
          "The chart made long-duration HOLD windows survivable in later eras."
        ]
      },
      rewards: { energy: 72, materials: 56, intel: 60, setYear: 2168 },
    },
    {
      id: "campaign_10",
      number: 10,
      title: "Transparent Gate, Sea of Stars",
      yearLabel: "2168-2170",
      generation: "4th Gen",
      lead: "Yara",
      sjcVersion: "v6 transparent gate",
      zoneId: "galactic_center",
      holdSeconds: 60,
      simRange: [1870000, 2750000],
      objective: "Raise Gate V, align psi 523-class ambition with transparent lattice discipline, and send the final seeds toward the galactic center.",
      summary: "After decades of text, the screen finally earns the right to become light.",
      requirements: {
        requiredGateLevel: 5,
        minSeed: 11,
        minHctg: 20.0,
        minConsistency: 0.54,
        minPsi: 0.72,
        minBranchProbability: 0.68,
      },
      documents: [
        {
          id: "doc_c10_tablet",
          title: "Yara Navigation Tablet",
          author: "Yara",
          type: "Command Tablet",
          tone: "dark",
          summary: "A digital map aimed straight at the center, annotated with a single word: continue.",
          quote: "\"HPG was never the destination. It was permission to keep drawing outward.\"",
          body: [
            "The tablet contains all earlier routes as dim ghosts beneath the final line.",
            "No one in the room mistakes completion for ending."
          ]
        },
        {
          id: "doc_c10_window",
          title: "Sea of Stars Render Note",
          author: "Archive Engine",
          type: "Final Visualization",
          tone: "paper",
          summary: "The instruction that tells the terminal when it is finally allowed to show light instead of text.",
          quote: "\"When ALLOW arrives, fade the machine into the stars it spent seventy-five years earning.\"",
          body: [
            "The command was written long before the hardware could deserve it."
          ]
        }
      ],
      relic: {
        id: "relic_yara_tablet",
        title: "Yara's Continuation Tablet",
        author: "Yara",
        type: "Inherited Relic",
        tone: "dark",
        effectText: "Psi +0.022, branch probability +0.022, and resource growth +0.08.",
        bonuses: { psi: 0.022, branchProbability: 0.022, resourceYield: 0.08 },
        quote: "\"Continue.\"",
        body: [
          "The final relic is not a memory object. It is an instruction to the next century."
        ]
      },
      rewards: { energy: 100, materials: 80, intel: 100, setYear: 2170 },
    },
  ];

  const INITIAL_STATE = {
    year: 2095,
    selectedShipId: "hope01",
    selectedZoneId: "l2_calibration",
    resources: { energy: 180, materials: 150, hydrogen: 24, intel: 0 },
    structures: { mainGateLevel: 1, relay: 0, seed: 0, solar: 0, harvester: 0 },
    upgrades: { hctg: 0, sondol: 0, dpad: 0, qlaunch: 0, warp_shield: 0, deep_core: 0, cweh: 0 },
    controls: { phase: 51, curvature: 50, coolant: 55, relaySync: 44 },
    gateCharge: 10,
    shipStress: 6,
    focusPulse: false,
    simulation: {
      orbitalAngle: 12,
      flightPosition: [0, 0, 0],
      flightVelocity: [0.1, 0, 0],
      hullIntegrity: 0.94,
      coreTemperature: 318,
      crystalMass: 22,
      alloyMass: 16,
      latticeDensity: 7,
      seedProgress: 0.08,
    },
    campaignIndex: 0,
    campaignFlags: {
      campaign06CrisisTriggered: false,
      vasquezShieldUsed: false,
    },
    campaignAttempts: {},
    completedCampaignIds: [],
    unlockedRelicIds: [],
    selectedDocumentId: null,
    rescueIncident: null,
    finale: {
      unlocked: false,
      title: null,
      detail: null,
      yearUnlocked: null,
    },
    terminal: {
      mode: "IDLE",
      simCount: 0,
      holdTimeRemaining: 0,
      activeCampaignId: "campaign_01",
      lastVerdict: null,
      lines: [],
    },
    tutorial: {
      active: false,
      step: 0,
      completed: false,
    },
    currentSituation: null,
    completedZones: [],
    latestResolution: null,
    log: [],
  };

  let state = loadState();
  if (!state) {
    state = clone(INITIAL_STATE);
    pushLog("hold", "HPG 사령부 초기화 완료.", "Hope-01이 새로운 Gate I 챔버 안에서 대기 중입니다. 항로를 선택하고 중계 시대를 시작하십시오.");
  }
  state = normalizeState(state);

  const elements = {};
  let terminalIntervalId = null;
  let terminalResetTimeoutId = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function fixed(value, digits) {
    return Number(value).toFixed(digits);
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") {
      return clone(INITIAL_STATE);
    }
    const merged = clone(INITIAL_STATE);
    Object.assign(merged, raw);
    merged.resources = Object.assign({}, INITIAL_STATE.resources, raw.resources || {});
    merged.structures = Object.assign({}, INITIAL_STATE.structures, raw.structures || {});
    merged.upgrades = Object.assign({}, INITIAL_STATE.upgrades, raw.upgrades || {});
    merged.controls = Object.assign({}, INITIAL_STATE.controls, raw.controls || {});
    merged.simulation = Object.assign({}, INITIAL_STATE.simulation, raw.simulation || {});
    merged.terminal = Object.assign({}, INITIAL_STATE.terminal, raw.terminal || {});
    merged.campaignFlags = Object.assign({}, INITIAL_STATE.campaignFlags, raw.campaignFlags || {});
    merged.campaignAttempts = Object.assign({}, INITIAL_STATE.campaignAttempts, raw.campaignAttempts || {});
    merged.completedZones = Array.isArray(raw.completedZones) ? raw.completedZones.slice() : [];
    merged.completedCampaignIds = Array.isArray(raw.completedCampaignIds) ? raw.completedCampaignIds.slice() : [];
    merged.unlockedRelicIds = Array.isArray(raw.unlockedRelicIds) ? raw.unlockedRelicIds.slice() : [];
    merged.selectedDocumentId = typeof raw.selectedDocumentId === "string" ? raw.selectedDocumentId : null;
    merged.rescueIncident = raw.rescueIncident && typeof raw.rescueIncident === "object" ? Object.assign({}, raw.rescueIncident) : null;
    merged.finale = Object.assign({}, INITIAL_STATE.finale, raw.finale || {});
    merged.tutorial = Object.assign({}, INITIAL_STATE.tutorial, raw.tutorial || {});
    merged.currentSituation = raw.currentSituation && typeof raw.currentSituation === "object" ? Object.assign({}, raw.currentSituation) : null;
    merged.campaignIndex = clamp(Number(raw.campaignIndex || 0), 0, CAMPAIGNS.length - 1);
    merged.log = Array.isArray(raw.log) ? raw.log.slice(0, 18) : [];
    return merged;
  }

  function currentShip() {
    return SHIPS.find((ship) => ship.id === state.selectedShipId) || SHIPS[0];
  }

  function currentZone() {
    return ZONES.find((zone) => zone.id === state.selectedZoneId) || ZONES[0];
  }

  function currentGate() {
    return MAIN_GATE_LEVELS[state.structures.mainGateLevel];
  }

  function currentCampaign() {
    return CAMPAIGNS[state.campaignIndex] || CAMPAIGNS[CAMPAIGNS.length - 1];
  }

  function situationMetricLabel(key) {
    return {
      phi: "phi",
      psi: "psi",
      entropy: "엔트로피",
      eRms: "E_rms",
      branchProbability: "분기",
      relayHarmony: "중계",
      consistencySignal: "일관성",
      holdScale: "홀드",
      simScale: "시뮬 스택",
    }[key] || key;
  }

  function formatSituationEffect(key, value) {
    const label = situationMetricLabel(key);
    if (key === "holdScale" || key === "simScale") {
      const percent = Math.round(value * 100);
      const sign = percent >= 0 ? "+" : "";
      return `${label} ${sign}${percent}%`;
    }
    const sign = value >= 0 ? "+" : "";
    return `${label} ${sign}${fixed(value, 3)}`;
  }

  function situationDefinitionsForCampaign(campaign) {
    return SITUATION_DEFS.filter(function (definition) {
      const minCampaign = definition.minCampaign || 1;
      const maxCampaign = definition.maxCampaign || CAMPAIGNS.length;
      return campaign.number >= minCampaign && campaign.number <= maxCampaign;
    });
  }

  function buildSituationInstance(campaign, definition, reason) {
    const severity = clamp(0.88 + campaign.number * 0.03 + Math.random() * 0.18, 0.9, 1.42);
    const scaledModifiers = Object.keys(definition.modifiers || {}).reduce(function (accumulator, key) {
      accumulator[key] = Number(fixed(definition.modifiers[key] * severity, key === "holdScale" || key === "simScale" ? 3 : 4));
      return accumulator;
    }, {});
    const effectKeys = Object.keys(scaledModifiers).filter(function (key) {
      return Math.abs(scaledModifiers[key]) > 0;
    });
    return {
      campaignId: campaign.id,
      id: definition.id,
      title: definition.title,
      tone: definition.tone || "unstable",
      summary: definition.summary,
      modifiers: scaledModifiers,
      effectTexts: effectKeys.map(function (key) {
        return formatSituationEffect(key, scaledModifiers[key]);
      }),
      reason: reason || "stack-refresh",
      rolledAt: Date.now(),
      severity: Number(fixed(severity, 3)),
    };
  }

  function rollCampaignSituation(reason) {
    const campaign = currentCampaign();
    const pool = situationDefinitionsForCampaign(campaign);
    if (!pool.length) {
      state.currentSituation = null;
      return null;
    }
    const definition = pool[Math.floor(Math.random() * pool.length)];
    const situation = buildSituationInstance(campaign, definition, reason);
    state.currentSituation = situation;
    return situation;
  }

  function ensureCampaignSituation() {
    if (state.currentSituation && state.currentSituation.campaignId === currentCampaign().id) {
      return state.currentSituation;
    }
    return rollCampaignSituation("campaign-sync");
  }

  function activeSituation() {
    return state.currentSituation && state.currentSituation.campaignId === currentCampaign().id
      ? state.currentSituation
      : null;
  }

  function allRelics() {
    return CAMPAIGNS.map(function (campaign) {
      return Object.assign(
        {
          campaignId: campaign.id,
          campaignNumber: campaign.number,
          generation: campaign.generation,
        },
        campaign.relic
      );
    });
  }

  function unlockedRelics() {
    const relicIds = new Set(state.unlockedRelicIds);
    return allRelics().filter(function (relic) {
      return relicIds.has(relic.id);
    });
  }

  function computeLegacyBonuses() {
    return unlockedRelics().reduce(function (accumulator, relic) {
      const bonuses = relic.bonuses || {};
      Object.keys(bonuses).forEach(function (key) {
        accumulator[key] = (accumulator[key] || 0) + bonuses[key];
      });
      return accumulator;
    }, {});
  }

  function hasUnlockedRelic(relicId) {
    return state.unlockedRelicIds.includes(relicId);
  }

  function findZone(zoneId) {
    return ZONES.find(function (zone) {
      return zone.id === zoneId;
    }) || ZONES[0];
  }

  function findDocumentById(documentId) {
    if (!documentId) {
      return null;
    }
    const campaign = currentCampaign();
    const localDocument = campaign.documents.find(function (entry) {
      return entry.id === documentId;
    });
    if (localDocument) {
      return localDocument;
    }
    return unlockedRelics().find(function (entry) {
      return entry.id === documentId;
    }) || null;
  }

  function ensureSelectedDocument() {
    if (findDocumentById(state.selectedDocumentId)) {
      return;
    }
    const campaign = currentCampaign();
    state.selectedDocumentId = campaign.documents[0] ? campaign.documents[0].id : unlockedRelics()[0] ? unlockedRelics()[0].id : null;
  }

  function campaignAttemptCount(campaignId) {
    return state.campaignAttempts[campaignId] || 0;
  }

  function documentThemeClass(documentEntry) {
    if (!documentEntry) {
      return "";
    }
    const signature = `${documentEntry.title || ""} ${documentEntry.author || ""} ${documentEntry.type || ""}`.toLowerCase();
    if (signature.includes("brian") || signature.includes("whiteboard") || signature.includes("marker handover")) {
      return "theme-brian-whiteboard";
    }
    if (signature.includes("jaden") || signature.includes("notebook")) {
      return "theme-jaden-notebook";
    }
    if (signature.includes("sjc") || signature.includes("terminal") || signature.includes("report") || documentEntry.tone === "dark") {
      return "theme-sjc-terminal";
    }
    return "";
  }

  function activeRescueIncident() {
    return state.rescueIncident && state.rescueIncident.active ? state.rescueIncident : null;
  }

  function baseHctgValue() {
    return HCTG_SCALE[state.upgrades.hctg];
  }

  function hctgValue() {
    return Math.max(baseHctgValue(), state.simulation.latticeDensity || 7);
  }

  function vectorMagnitude(vector) {
    return Math.sqrt(vector.reduce(function (sum, component) {
      return sum + component * component;
    }, 0));
  }

  function networkSpan() {
    const gate = currentGate();
    return gate.baseSpan + state.structures.relay * 46 + state.structures.seed * 92 + state.structures.solar * 70 + state.structures.harvester * 80 + state.upgrades.cweh * 34;
  }

  function passiveIncome() {
    return { energy: 22 + state.structures.solar * 28 + state.upgrades.cweh * 6, hydrogen: state.structures.harvester * 3, materials: 8 + state.structures.seed * 2 };
  }

  function currentEraIndex() {
    const span = networkSpan();
    const lattice = hctgValue();
    let era = 0;
    for (let index = 0; index < ERA_DEFS.length; index += 1) {
      const def = ERA_DEFS[index];
      if (span >= def.rangeRequirement && lattice >= def.hctgRequirement) {
        era = index;
      }
    }
    return era;
  }

  function computeERms(relayHarmony, stressPenalty, thermalLoad, zoneRisk, legacyBonuses) {
    return clamp(
      0.0038
        + zoneRisk * 0.006
        + (1 - relayHarmony) * 0.0038
        + stressPenalty * 0.0046
        + thermalLoad * 0.0024
        - state.upgrades.dpad * 0.0012
        - (legacyBonuses.ermsReduction || 0),
      0.001,
      0.025
    );
  }

  function bandedConsistency(signal) {
    return clamp(CONSISTENCY_BAND_MIN + signal * (CONSISTENCY_BAND_HALF_WIDTH * 2), CONSISTENCY_BAND_MIN, CONSISTENCY_BAND_MAX);
  }

  function consistencyBandOverflow(value) {
    return Math.max(Math.abs(value - CONSISTENCY_BAND_CENTER) - CONSISTENCY_BAND_HALF_WIDTH, 0);
  }

  function consistencyBandAlignment(value) {
    return clamp(1 - consistencyBandOverflow(value) / Math.max(CONSISTENCY_BAND_HALF_WIDTH, 1e-6), 0, 1);
  }

  function computeMetrics() {
    const ship = currentShip();
    const zone = currentZone();
    const gate = currentGate();
    const legacyBonuses = computeLegacyBonuses();
    const situation = activeSituation();
    const situationModifiers = situation ? situation.modifiers || {} : {};
    const span = networkSpan();
    const simulation = state.simulation;
    const hctgRatio = (hctgValue() - 7.0) / 13.0;
    const hullIntegrity = clamp(simulation.hullIntegrity, 0.2, 1);
    const thermalLoad = clamp((simulation.coreTemperature - 280) / 120, 0, 1);
    const phaseInput = state.controls.phase / 100;
    const curvatureInput = state.controls.curvature / 100;
    const coolantInput = state.controls.coolant / 100;
    const relayInput = state.controls.relaySync / 100;
    const relayHarmony = clamp(0.14 + state.structures.relay * 0.025 + state.structures.seed * 0.045 + relayInput * 0.18 + (legacyBonuses.relayHarmony || 0) + (situationModifiers.relayHarmony || 0), 0, 0.95);
    const spanCoverage = clamp((span * ship.rangeBias) / zone.requiredSpan, 0, 1.8);
    const coveragePenalty = clamp(1 - spanCoverage, 0, 1);
    const gateChargeNormalized = state.gateCharge / 100;
    const focusBonus = state.focusPulse ? 0.08 : 0.0;
    const thermalSupport = state.upgrades.sondol * 0.032 + state.structures.solar * 0.015 + (legacyBonuses.thermalSupport || 0);
    const stressPenalty = clamp((state.shipStress / 100) + (situationModifiers.stress || 0) - (legacyBonuses.stressReduction || 0), 0, 0.72);
    const eRms = clamp(computeERms(relayHarmony, stressPenalty, thermalLoad, zone.risk, legacyBonuses) + (situationModifiers.eRms || 0), 0.001, 0.03);

    const entropy = clamp(
      0.26 + zone.risk * 0.4 + coveragePenalty * 0.24 + (1 - coolantInput) * 0.2 + thermalLoad * 0.12 - thermalSupport - state.upgrades.cweh * 0.018 - gateChargeNormalized * 0.08 + (situationModifiers.entropy || 0),
      0.06,
      0.98
    );

    const phi = clamp(
      0.24 + ship.hull * 0.36 + hctgRatio * 0.24 + gate.stability * 0.16 + state.upgrades.dpad * 0.034 + state.upgrades.warp_shield * 0.05 + (hullIntegrity - 0.7) * 0.24 + (legacyBonuses.phi || 0) + (situationModifiers.phi || 0) - zone.risk * 0.2 - stressPenalty * 0.22 - entropy * 0.14 - eRms * 1.3,
      0,
      1
    );

    const psi = clamp(
      0.18 + curvatureInput * 0.28 + phaseInput * 0.16 + relayHarmony * 0.18 + gate.stability * 0.22 + gateChargeNormalized * 0.12 + state.upgrades.qlaunch * 0.04 + focusBonus + (legacyBonuses.psi || 0) + (situationModifiers.psi || 0) - coveragePenalty * 0.16,
      0,
      1
    );

    const phaseLockError = Math.abs(phaseInput - CONSISTENCY_TARGET);
    const quantumPeak = clamp(0.36 + ship.quantum * 0.24 + state.upgrades.qlaunch * 0.06 + gateChargeNormalized * 0.08, 0, 1);
    const consistencySignal = clamp(0.18 * phi + 0.22 * psi + 0.18 * relayHarmony + 0.16 * quantumPeak + 0.14 * (1 - phaseLockError * 1.9) + 0.12 * (1 - entropy) + (legacyBonuses.consistency || 0) + (situationModifiers.consistencySignal || 0), 0, 1);
    const consistency = bandedConsistency(consistencySignal);
    const branchProbability = clamp(0.14 + phi * 0.2 + psi * 0.21 + ship.sensor * 0.17 + relayHarmony * 0.12 + quantumPeak * 0.1 + spanCoverage * 0.08 + hullIntegrity * 0.05 + (legacyBonuses.branchProbability || 0) + (situationModifiers.branchProbability || 0) - zone.risk * 0.18 - consistencyBandOverflow(consistency) * 1.2, 0.01, 0.99);

    let verdict = "DENY";
    let reason = "범위 또는 위상 조건이 운용 최소값 미만입니다.";
    if (span < zone.requiredSpan) {
      reason = "네트워크 범위가 이 항로를 물리적으로 지탱할 수 없습니다.";
    } else if (state.structures.mainGateLevel < zone.gateTierRequired) {
      reason = "메인 게이트 등급이 이 회랑에 충분하지 않습니다.";
    } else if (phi >= zone.minPhi && psi >= zone.minPsi && consistency >= CONSISTENCY_TARGET) {
      verdict = "ALLOW";
      reason = "챔버 잠금 달성. 회랑이 점프를 실행할 만큼 안정적입니다.";
    } else if (consistency >= CONSISTENCY_TARGET - 0.06 && phi >= zone.minPhi - 0.06 && psi >= zone.minPsi - 0.06) {
      verdict = "HOLD";
      reason = "챔버가 거의 안정적이지만 더 깨끗한 위상 잠금을 기다리고 있습니다.";
    }

    return { zone, ship, gate, span, phi, psi, entropy, consistency, branchProbability, quantumPeak, relayHarmony, spanCoverage, verdict, reason, hullIntegrity, thermalLoad, eRms, legacyBonuses, situation };
  }

  function computeGameplaySystems(metrics) {
    const simulation = state.simulation;
    const legacyBonuses = metrics.legacyBonuses || {};
    const thrustVector = [
      0.04 + state.upgrades.qlaunch * 0.012 + state.gateCharge * 0.0006 + (state.focusPulse ? 0.028 : 0),
      0.01 + state.structures.relay * 0.002 + metrics.relayHarmony * 0.012,
      0.004 + state.structures.seed * 0.003,
    ];
    const shipMass = 1.2 + metrics.ship.hull * 2.6 + state.structures.mainGateLevel * 0.4;
    const drag = clamp(0.01 + metrics.zone.risk * 0.05 - state.upgrades.cweh * 0.004, 0, 0.08);
    const acceleration = thrustVector.map(function (component) {
      return component / shipMass;
    });
    const baseVelocity = simulation.flightVelocity.map(function (component) {
      return component * (1 - drag);
    });
    const updatedVelocity = baseVelocity.map(function (component, index) {
      return component + acceleration[index] * 1.4;
    });
    const updatedPosition = simulation.flightPosition.map(function (component, index) {
      return component + baseVelocity[index] * 1.4 + 0.5 * acceleration[index] * 1.4 * 1.4;
    });
    const speed = vectorMagnitude(updatedVelocity);
    const kineticEnergy = 0.5 * shipMass * speed * speed;
    const driftRatio = speed / Math.max(vectorMagnitude(thrustVector), 1e-6);

    const overlapDistance = clamp(metrics.zone.risk * 0.8 + (1 - metrics.relayHarmony) * 0.55 - metrics.ship.stressGuard * 0.2, 0.04, 0.98);
    const relativeSpeed = speed * (0.8 + metrics.zone.risk * 0.9);
    const impactEnergy = 0.5 * shipMass * relativeSpeed * relativeSpeed * (1 + overlapDistance);
    const absorption = clamp(
      0.16
      + state.upgrades.dpad * 0.08
      + state.upgrades.warp_shield * 0.06
      + (hctgValue() - 7.0) / 26
      + metrics.gate.stability * 0.18
      + (legacyBonuses.collisionAbsorption || 0),
      0.1,
      0.96
    );
    const absorbedEnergy = impactEnergy * absorption;
    const residualEnergy = Math.max(impactEnergy - absorbedEnergy, 0);
    const hullDamage = clamp(residualEnergy / (45 + hctgValue() * 6), 0, simulation.hullIntegrity);
    const collisionHull = clamp(simulation.hullIntegrity - hullDamage, 0, 1);
    const collisionVerdict = collisionHull >= 0.75 ? "allow" : collisionHull >= 0.4 ? "hold" : "deny";

    const heatInput = 82 + state.gateCharge * 0.9 + state.structures.mainGateLevel * 10 + state.upgrades.qlaunch * 8 + (state.focusPulse ? 22 : 0);
    const ambientTemperature = 28 + metrics.zone.risk * 60;
    const sOndolEfficiency = clamp(0.48 + state.upgrades.sondol * 0.1 + (state.controls.coolant / 100) * 0.22, 0.32, 0.96);
    const radiatorArea = 18 + state.structures.solar * 3 + state.structures.mainGateLevel * 2;
    const generatedHeat = heatInput;
    const redistributedHeat = generatedHeat * sOndolEfficiency;
    const dissipationFactor = Math.sqrt(Math.max(simulation.coreTemperature - ambientTemperature, 0) + 1) * radiatorArea * (0.12 + 0.24 * sOndolEfficiency);
    const dissipatedHeat = Math.min(generatedHeat, dissipationFactor);
    const recoveredEnergy = dissipatedHeat * clamp(0.08 + state.upgrades.cweh * 0.07 + (legacyBonuses.energyRecovery || 0), 0, 0.95) * 0.18;
    const hullHeatCapacity = 42 + metrics.ship.hull * 36;
    const updatedTemperature = simulation.coreTemperature + (generatedHeat - dissipatedHeat) / hullHeatCapacity;
    const thermalMargin = 360 - updatedTemperature;
    const thermalStatus = updatedTemperature <= 295 ? "stable" : updatedTemperature <= 360 ? "warning" : "critical";

    const harvestedHydrogen = (0.8 + state.structures.harvester * 2.9) * (1 + state.upgrades.cweh * 0.06 + (legacyBonuses.resourceYield || 0));
    const harvestedSolarEnergy = (18 + state.structures.solar * 24) * (1 + state.structures.mainGateLevel * 0.14 + (legacyBonuses.resourceYield || 0));
    const resonanceCharge = harvestedSolarEnergy * (0.06 + state.structures.relay * 0.01);
    const glgGrowth = (0.45 + state.structures.seed * 0.65 + baseHctgValue() / 28) * (1 + state.upgrades.hctg * 0.05 + (legacyBonuses.growth || 0));
    const gateSeedProgress = clamp(simulation.seedProgress + resonanceCharge / 900 + glgGrowth / 80, 0, 1);
    const updatedCrystalMass = simulation.crystalMass + glgGrowth * 0.5;
    const updatedAlloyMass = simulation.alloyMass + harvestedHydrogen * 0.18;
    const latticeDensity = Math.max(baseHctgValue(), 7 + updatedCrystalMass * 0.022 + state.structures.mainGateLevel * 0.35);
    const resourceStatus = gateSeedProgress >= 0.95 && latticeDensity >= 12 ? "seed_ready" : gateSeedProgress >= 0.55 ? "network_growing" : "bootstrap";

    const orbitalRadius = 6871 + state.structures.mainGateLevel * 40 + state.structures.relay * 6;
    const gravitationalMu = 398600.4418;
    const orbitalSpeed = Math.sqrt(gravitationalMu / orbitalRadius);
    const escapeVelocity = Math.sqrt(2 * gravitationalMu / orbitalRadius);
    const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(orbitalRadius, 3) / gravitationalMu);
    const updatedAngleDeg = (simulation.orbitalAngle + ((orbitalSpeed / orbitalRadius) * (180 / Math.PI) * 90)) % 360;
    const updatedAngleRad = updatedAngleDeg * (Math.PI / 180);
    const positionXY = [
      orbitalRadius * Math.cos(updatedAngleRad),
      orbitalRadius * Math.sin(updatedAngleRad),
    ];
    const velocityXY = [
      -orbitalSpeed * Math.sin(updatedAngleRad),
      orbitalSpeed * Math.cos(updatedAngleRad),
    ];

    return {
      motion: {
        speed: speed,
        kineticEnergy: kineticEnergy,
        driftRatio: driftRatio,
        updatedPosition: updatedPosition,
        updatedVelocity: updatedVelocity,
      },
      collision: {
        impactEnergy: impactEnergy,
        residualEnergy: residualEnergy,
        hullDamage: hullDamage,
        updatedHull: collisionHull,
        verdict: collisionVerdict,
      },
      thermal: {
        generatedHeat: generatedHeat,
        redistributedHeat: redistributedHeat,
        dissipatedHeat: dissipatedHeat,
        recoveredEnergy: recoveredEnergy,
        updatedTemperature: updatedTemperature,
        thermalMargin: thermalMargin,
        status: thermalStatus,
      },
      resources: {
        harvestedHydrogen: harvestedHydrogen,
        harvestedSolarEnergy: harvestedSolarEnergy,
        resonanceCharge: resonanceCharge,
        glgGrowth: glgGrowth,
        gateSeedProgress: gateSeedProgress,
        updatedCrystalMass: updatedCrystalMass,
        updatedAlloyMass: updatedAlloyMass,
        latticeDensity: latticeDensity,
        status: resourceStatus,
      },
      orbital: {
        orbitalRadius: orbitalRadius,
        orbitalSpeed: orbitalSpeed,
        escapeVelocity: escapeVelocity,
        orbitalPeriod: orbitalPeriod,
        updatedAngleDeg: updatedAngleDeg,
        positionXY: positionXY,
        velocityXY: velocityXY,
        status: orbitalSpeed < escapeVelocity ? "bound" : "escape",
      },
    };
  }

  function actionCost(type) {
    const metrics = computeMetrics();
    const zone = metrics.zone;
    const ship = metrics.ship;
    if (type === "jump") {
      return {
        energy: Math.round(zone.requiredSpan * 0.06 + state.structures.mainGateLevel * 14 + ship.rangeBias * 18),
        materials: Math.round(zone.risk * 18 + ship.hull * 10),
        hydrogen: Math.round(zone.requiredSpan * 0.005 + state.structures.mainGateLevel * 2),
      };
    }
    return { energy: 0, materials: 0, hydrogen: 0 };
  }

  function canAfford(cost) {
    return state.resources.energy >= (cost.energy || 0) && state.resources.materials >= (cost.materials || 0) && state.resources.hydrogen >= (cost.hydrogen || 0);
  }

  function spend(cost) {
    state.resources.energy -= cost.energy || 0;
    state.resources.materials -= cost.materials || 0;
    state.resources.hydrogen -= cost.hydrogen || 0;
  }

  function gain(payload) {
    state.resources.energy += payload.energy || 0;
    state.resources.materials += payload.materials || 0;
    state.resources.hydrogen += payload.hydrogen || 0;
    state.resources.intel += payload.intel || 0;
  }

  function advanceYear(step) {
    state.year += step;
  }

  function pushLog(kind, title, detail) {
    state.log.unshift({ kind, title, detail, year: state.year });
    state.log = state.log.slice(0, 18);
  }

  function latestResolutionTemplate() {
    const metrics = computeMetrics();
    return {
      verdict: metrics.verdict,
      title: "챔버가 입력을 기다리고 있습니다.",
      detail: metrics.reason,
      zoneName: metrics.zone.name,
      shipName: metrics.ship.name,
      branchProbability: metrics.branchProbability,
      consistency: metrics.consistency,
      phi: metrics.phi,
      psi: metrics.psi,
      entropy: metrics.entropy,
      eRms: metrics.eRms,
      situationTitle: metrics.situation ? metrics.situation.title : null,
      situationSummary: metrics.situation ? metrics.situation.summary : null,
      situationEffects: metrics.situation ? metrics.situation.effectTexts : null,
    };
  }

  function safeSetResolution(payload) {
    state.latestResolution = payload;
  }

  function pushTerminalLine(line) {
    state.terminal.lines.unshift(line);
    state.terminal.lines = state.terminal.lines.slice(0, 18);
  }

  const TUTORIAL_SCENARIOS = [
    {
      phase: 50,
      verdict: "DENY",
      label: "단계 1 / 3",
      title: "phi 0.50 // 즉시 거부",
      detail: "0.01 부족이면 충분하다. 기계는 phi 0.50을 죽은 회랑으로 취급하고 슬퍼할 가치도 없이 발사를 폐기한다.",
      phi: 0.5,
      psi: 0.482,
      consistency: 0.498,
      eRms: 0.012,
      entropy: 0.344,
      branchProbability: 0.322,
      simCount: 12,
    },
    {
      phase: 52,
      verdict: "ALLOW",
      label: "단계 2 / 3",
      title: "phi 0.52 // 즉시 승인",
      detail: "작은 여유가 생존이 된다. 챔버는 phi 0.52를 보고 눈 하나 깜짝 않고 승인한다.",
      phi: 0.52,
      psi: 0.536,
      consistency: 0.526,
      eRms: 0.009,
      entropy: 0.298,
      branchProbability: 0.541,
      simCount: 28,
    },
    {
      phase: 51,
      verdict: "HOLD",
      label: "단계 3 / 3",
      title: "phi 0.51 // 기계가 망설인다",
      detail: "HOLD는 우유부단함이 아니다. 기계가 2.1초를 들여 당신이 충분한 미래에서 아직 살아있는지 확인하는 것이다.",
      phi: 0.51,
      psi: 0.511,
      consistency: 0.51,
      eRms: 0.01,
      entropy: 0.318,
      branchProbability: 0.472,
      simStart: 0,
      simEnd: 84,
      holdSeconds: 2.1,
    },
  ];

  function resetTerminalToIdle() {
    if (terminalResetTimeoutId) {
      clearTimeout(terminalResetTimeoutId);
      terminalResetTimeoutId = null;
    }
    state.terminal.mode = "IDLE";
    state.terminal.holdTimeRemaining = 0;
    state.tutorial.active = false;
    render();
  }

  function clearTerminalTimers() {
    if (terminalIntervalId) {
      clearInterval(terminalIntervalId);
      terminalIntervalId = null;
    }
    if (terminalResetTimeoutId) {
      clearTimeout(terminalResetTimeoutId);
      terminalResetTimeoutId = null;
    }
  }

  function _formatRequirementValue(value) {
    if (typeof value === "number") {
      if (value >= 1000) {
        return String(Math.round(value));
      }
      return fixed(value, value < 1 ? 3 : 1);
    }
    return String(value);
  }

  function buildCampaignChecks(campaign, metrics, _systems) {
    const requirements = campaign.requirements || {};
    const checks = [];
    const situation = activeSituation();

    function addCheck(label, current, target, met, hard) {
      checks.push({ label: label, current: current, target: target, met: met, hard: Boolean(hard) });
    }

    if (campaign.zoneId) {
      const targetZone = findZone(campaign.zoneId);
      addCheck("항로", metrics.zone.name, targetZone.name, metrics.zone.id === campaign.zoneId, true);
    }
    if (requirements.requiredGateLevel) {
      addCheck("메인 게이트", `Gate ${state.structures.mainGateLevel}`, `Gate ${requirements.requiredGateLevel}`, state.structures.mainGateLevel >= requirements.requiredGateLevel, true);
    }
    if (requirements.minPhi) {
      addCheck("phi", fixed(metrics.phi, 3), fixed(requirements.minPhi, 3), metrics.phi >= requirements.minPhi, false);
    }
    if (requirements.minPsi) {
      addCheck("psi", fixed(metrics.psi, 3), fixed(requirements.minPsi, 3), metrics.psi >= requirements.minPsi, false);
    }
    if (requirements.maxEntropy) {
      addCheck("엔트로피", fixed(metrics.entropy, 3), `<= ${fixed(requirements.maxEntropy, 3)}`, metrics.entropy <= requirements.maxEntropy, false);
    }
    if (requirements.minConsistency) {
      addCheck("일관성", fixed(metrics.consistency, 3), fixed(requirements.minConsistency, 3), metrics.consistency >= requirements.minConsistency, false);
    }
    if (requirements.minBranchProbability) {
      addCheck("분기", fixed(metrics.branchProbability, 3), fixed(requirements.minBranchProbability, 3), metrics.branchProbability >= requirements.minBranchProbability, false);
    }
    if (requirements.maxStress) {
      addCheck("스트레스", Math.round(state.shipStress), `<= ${requirements.maxStress}`, state.shipStress <= requirements.maxStress, false);
    }
    if (requirements.minGateCharge || requirements.minMainGateCharge) {
      const targetCharge = requirements.minMainGateCharge || requirements.minGateCharge;
      addCheck("게이트 충전", `${Math.round(state.gateCharge)}%`, `${targetCharge}%`, state.gateCharge >= targetCharge, false);
    }
    if (requirements.minEnergy) {
      addCheck("에너지", Math.round(state.resources.energy), requirements.minEnergy, state.resources.energy >= requirements.minEnergy, false);
    }
    if (requirements.minIntel) {
      addCheck("정보", Math.round(state.resources.intel), requirements.minIntel, state.resources.intel >= requirements.minIntel, false);
    }
    if (requirements.minRelay) {
      addCheck("중계 게이트", state.structures.relay, requirements.minRelay, state.structures.relay >= requirements.minRelay, false);
    }
    if (requirements.minSeed) {
      addCheck("게이트 시드", state.structures.seed, requirements.minSeed, state.structures.seed >= requirements.minSeed, false);
    }
    if (requirements.minSolar) {
      addCheck("태양 집광기", state.structures.solar, requirements.minSolar, state.structures.solar >= requirements.minSolar, false);
    }
    if (requirements.minHarvester) {
      addCheck("수소 수확기", state.structures.harvester, requirements.minHarvester, state.structures.harvester >= requirements.minHarvester, false);
    }
    if (requirements.minHctg) {
      addCheck("격자 밀도", `n=${fixed(hctgValue(), 1)}`, `n=${fixed(requirements.minHctg, 1)}`, hctgValue() >= requirements.minHctg, false);
    }
    if (requirements.minUpgrade_sondol) {
      addCheck("S-Ondol", `L${state.upgrades.sondol}`, `L${requirements.minUpgrade_sondol}`, state.upgrades.sondol >= requirements.minUpgrade_sondol, false);
    }
    if (requirements.minUpgrade_deep_core) {
      addCheck("Deep Core", `L${state.upgrades.deep_core}`, `L${requirements.minUpgrade_deep_core}`, state.upgrades.deep_core >= requirements.minUpgrade_deep_core, false);
    }
    if (campaign.id === "campaign_10" && situation) {
      if (situation.tone === "danger") {
        const targetBranch = (requirements.minBranchProbability || 0.68) + 0.12;
        addCheck("스택 분기 마진", fixed(metrics.branchProbability, 3), fixed(targetBranch, 3), metrics.branchProbability >= targetBranch, false);
        addCheck("스택 E_rms", fixed(metrics.eRms, 3), "<= 0.010", metrics.eRms <= 0.01, false);
      } else if (situation.tone === "unstable") {
        const targetBranch = (requirements.minBranchProbability || 0.68) + 0.06;
        addCheck("스택 분기 마진", fixed(metrics.branchProbability, 3), fixed(targetBranch, 3), metrics.branchProbability >= targetBranch, false);
      }
    }
    if (campaign.id === "campaign_06" && state.campaignFlags.campaign06CrisisTriggered) {
      const incident = state.rescueIncident;
      const resolved = !incident || !incident.active;
      const currentStatus = !incident
        ? "not triggered"
        : incident.active
          ? `${incident.remainingHours}h remaining`
          : incident.result === "rescued"
            ? "rescued"
            : "closed";
      addCheck("Relay #223", currentStatus, "resolved", resolved, true);
    }
    return checks;
  }

  function computeHoldProfile(campaignId, displaySeconds) {
    const attempts = campaignAttemptCount(campaignId);
    const isRetry = attempts > 0;
    const situation = activeSituation();
    const holdScale = situation ? situation.modifiers.holdScale || 0 : 0;
    const simScale = situation ? situation.modifiers.simScale || 0 : 0;
    const adjustedDisplaySeconds = Math.max(1.8, displaySeconds * (1 + holdScale * 0.45));
    let realSeconds = Math.max(2.2, adjustedDisplaySeconds * 0.9);
    if (displaySeconds >= 40) {
      realSeconds = 14;
    } else if (displaySeconds >= 18) {
      realSeconds = 10;
    } else if (displaySeconds >= 8) {
      realSeconds = 7;
    }
    realSeconds *= 1 + holdScale * 0.75;
    if (isRetry) {
      realSeconds = Math.max(1.2, Math.min(2.2, adjustedDisplaySeconds * 0.12));
    }
    return {
      isRetry: isRetry,
      displaySeconds: adjustedDisplaySeconds,
      realSeconds: realSeconds,
      simScale: Math.max(1, 1 + simScale),
    };
  }

  function evaluateCampaign(campaign, metrics, systems) {
    const checks = buildCampaignChecks(campaign, metrics, systems);
    const failedChecks = checks.filter(function (check) {
      return !check.met;
    });
    const hardFail = failedChecks.some(function (check) {
      return check.hard;
    });
    const nearMiss = failedChecks.length > 0 && failedChecks.length <= 2 && !hardFail;
    const forcedCrisis = campaign.id === "campaign_06" && !state.campaignFlags.campaign06CrisisTriggered;
    let finalVerdict = failedChecks.length === 0 ? "ALLOW" : nearMiss ? "HOLD" : "DENY";
    let summary = failedChecks.length === 0
      ? `${campaign.title}: 모든 게이트 조건 충족.`
      : failedChecks.map(function (check) {
          return `${check.label} ${check.target}`;
        }).join(" / ");
    if (forcedCrisis) {
      finalVerdict = "DENY";
      summary = "Relay #223이 평가 스택 중 파열되었다. 구조 경로가 이제 필수다.";
    }
    return {
      finalVerdict: finalVerdict,
      checks: checks,
      failedChecks: failedChecks,
      forcedCrisis: forcedCrisis,
      simStart: campaign.simRange[0],
      simEnd: campaign.simRange[1],
      holdSeconds: campaign.holdSeconds,
      summary: summary,
    };
  }

  function applyCampaignSuccess(campaign, _metrics, _systems) {
    const firstClear = !state.completedCampaignIds.includes(campaign.id);
    if (firstClear) {
      state.completedCampaignIds.push(campaign.id);
    }
    if (campaign.rewards && firstClear) {
      gain({
        energy: campaign.rewards.energy || 0,
        materials: campaign.rewards.materials || 0,
        hydrogen: campaign.rewards.hydrogen || 0,
        intel: campaign.rewards.intel || 0,
      });
      if (campaign.rewards.setYear) {
        state.year = Math.max(state.year, campaign.rewards.setYear);
      }
    }
    if (campaign.relic && !state.unlockedRelicIds.includes(campaign.relic.id)) {
      state.unlockedRelicIds.push(campaign.relic.id);
      pushLog("allow", "세대 유물 계승.", `${campaign.relic.title}이(가) 아카이브에 등록되었다. ${campaign.relic.effectText}`);
    }
    if (campaign.zoneId && !state.completedZones.includes(campaign.zoneId)) {
      state.completedZones.push(campaign.zoneId);
    }
    if (campaign.id === "campaign_06" && state.rescueIncident && state.rescueIncident.active) {
      state.rescueIncident.active = false;
      state.rescueIncident.result = "rescued";
    }
    if (campaign.id === "campaign_10" && !state.finale.unlocked) {
      state.finale = {
        unlocked: true,
        title: "별의 바다",
        detail: "터미널이 마침내 아카이브를 빛으로 변하게 허락했다. Gate V가 유지되고, 시드 연쇄가 생존하며, 은하의 중심이 되돌아본다.",
        yearUnlocked: state.year,
      };
      pushLog("allow", "별의 바다 해금.", "최종 사령부 뷰가 터미널 너머로 열렸다. 텍스트가 75년 동안 벌어온 빛에게 자리를 내주었다.");
    }
    if (state.campaignIndex < CAMPAIGNS.length - 1) {
      state.campaignIndex += 1;
      state.selectedZoneId = currentCampaign().zoneId;
      state.selectedDocumentId = null;
    }
  }

  function consumeVasquezShield(contextLabel) {
    if (!hasUnlockedRelic("relic_vasquez_pen") || state.campaignFlags.vasquezShieldUsed) {
      return false;
    }
    state.campaignFlags.vasquezShieldUsed = true;
    pushLog("allow", "Vasquez 사전 보강 작동.", `${contextLabel}은(는) 파열이 되었어야 했지만, 빨간 펜 보강이 비용 없이 DENY 하나를 흡수했다.`);
    return true;
  }

  function createLifeSupportIncident(campaign) {
    state.rescueIncident = {
      active: true,
      kind: "life_support",
      campaignId: campaign.id,
      title: "생명 유지 카운트다운",
      relayNode: "탐사대 차단점",
      remainingHours: 48,
      attempts: 0,
      droneCost: { energy: 52, materials: 16, hydrogen: 8 },
      result: "pending",
      crewLabel: "활성 네트워크 너머 단절된 회랑에서 48시간의 생명 유지가 남아있다.",
    };
    pushLog("deny", "승무원 고립 사건 발생.", "후기 시대의 DENY는 더 이상 돈만 태우지 않는다. 이미 죽어가는 회랑 뒤에 사람을 가둔다.");
  }

  function applyCampaignSetback(campaign, verdict) {
    if (verdict !== "DENY") {
      state.shipStress = clamp(state.shipStress + 4, 0, 100);
      return "SJC가 정체했지만 항로를 파괴하지는 않았다. 사령부 스트레스가 상승했고 다시 시도해야 한다.";
    }
    if (consumeVasquezShield(campaign.title)) {
      return "Vasquez의 빨간 펜이 첫 번째 파열을 막았다. 판정은 유지되지만, 챔버가 한 번 구조적 손실을 면했다.";
    }
    const mitigation = computeLegacyBonuses().denyMitigation || 0;
    const eraIndex = currentEraIndex();
    if (eraIndex === 0) {
      const deficit = Math.round((26 + campaign.number * 3) * (1 - mitigation));
      state.resources.energy = Math.max(0, state.resources.energy - Math.round(22 * (1 - mitigation)));
      state.resources.materials = Math.max(0, state.resources.materials - Math.round(10 * (1 - mitigation)));
      state.shipStress = clamp(state.shipStress + 8, 0, 100);
      pushLog("deny", "예산 비상 발령.", `${deficit} 크레딧이 개수와 파괴된 신뢰에 증발했다. 함선 시대에서 DENY는 재무부가 프로젝트에 다음 일출의 자격이 있는지 결정하는 것과 같다.`);
      return `${deficit} 크레딧이 긴급 재건에 소진되었다. 초기 프로그램은 살아남았지만, 더 가난해져야만 했다.`;
    }
    if (eraIndex === 1) {
      const lostRelays = Math.min(Math.max(1, Math.ceil(state.structures.relay / 4)), 3);
      state.structures.relay = Math.max(0, state.structures.relay - lostRelays);
      state.resources.materials = Math.max(0, state.resources.materials - Math.round(24 * (1 - mitigation)));
      state.resources.energy = Math.max(0, state.resources.energy - Math.round(18 * (1 - mitigation)));
      state.shipStress = clamp(state.shipStress + 10, 0, 100);
      pushLog("deny", "중계 체인 정지.", `노드가 연쇄적으로 붕괴하여 ${lostRelays}개 중계 라인이 꺼졌다. 게이트 시대에서 DENY는 인프라가 한꺼번에 실패하는 소리다.`);
      return `${lostRelays}개 중계 노드가 체인 정지로 소실되었다. 항로는 아직 살아있지만, 회랑이 더 짧아지고 더 험악해졌다.`;
    }
    state.resources.energy = Math.max(0, state.resources.energy - Math.round(18 * (1 - mitigation)));
    state.resources.materials = Math.max(0, state.resources.materials - Math.round(12 * (1 - mitigation)));
    state.shipStress = clamp(state.shipStress + 12, 0, 100);
    if (!activeRescueIncident() && campaign.id !== "campaign_06") {
      createLifeSupportIncident(campaign);
    }
    return activeRescueIncident()
      ? "고립된 팀이 이제 생명 유지가 붕괴되기 전에 구조 드론과 임시 회랑에 의존하고 있다."
      : "챔버가 사령부의 자신감과 미래 항로 계획에 상처를 줄 만큼 심하게 실패했다.";
  }

  function createCampaignSixIncident() {
    state.campaignFlags.campaign06CrisisTriggered = true;
    state.rescueIncident = {
      active: true,
      kind: "relay_rescue",
      campaignId: "campaign_06",
      title: "Relay #223 구조 데스크",
      relayNode: "Relay #223",
      remainingHours: 48,
      attempts: 0,
      droneCost: { energy: 44, materials: 18, hydrogen: 6 },
      result: "pending",
      crewLabel: "4명의 고립된 승무원이 파손된 중계 라인 너머에 남아있다.",
    };
    state.selectedDocumentId = "doc_c6_salvage";
    pushTerminalLine("> 구조 데스크 개방. Relay #223에 긴급 우회 회랑이 필요합니다.");
    pushLog("deny", "Relay #223 파열.", "DENY가 사건이 되었다. 구조 드론을 발송하고 죽은 중계기를 우회할 48시간이 남았다.");
  }

  function dispatchRescueDrones() {
    const incident = activeRescueIncident();
    if (!incident) {
      return;
    }
    if (!canAfford(incident.droneCost)) {
      pushLog("deny", "구조 출격 차단.", "에너지, 자재, 또는 수소 비축이 파손된 회랑에 드론을 투입하기에 너무 부족하다.");
      render();
      return;
    }
    spend(incident.droneCost);
    const metrics = computeMetrics();
    incident.attempts += 1;
    incident.remainingHours = Math.max(0, incident.remainingHours - (12 + state.upgrades.dpad * 2));
    const phaseAlignment = consistencyBandAlignment(metrics.consistency);
    const rescueScore = clamp(
      0.24
        + state.upgrades.deep_core * 0.08
        + state.upgrades.dpad * 0.05
        + state.upgrades.sondol * 0.03
        + state.structures.relay * 0.015
        + state.structures.seed * 0.01
        + metrics.branchProbability * 0.12
        + metrics.phi * 0.08
        + phaseAlignment * 0.15,
      0,
      1
    );

    if (rescueScore >= 0.62 || (incident.remainingHours <= 12 && rescueScore >= 0.56)) {
      incident.active = false;
      incident.result = "rescued";
      gain({ intel: 24, materials: 10 });
      state.shipStress = clamp(state.shipStress - 8, 0, 100);
      pushLog("allow", incident.kind === "life_support" ? "생명 유지 회랑 복구." : "구조 회랑 개방.", incident.kind === "life_support" ? `드론이 최종 타이머가 만료되기 전에 고립된 탐사대에 도달했다. 아카이브 신뢰도가 ${fixed(rescueScore, 3)}으로 상승했다.` : `드론이 ${incident.relayNode}에 도달하여 텔레메트리와 생존자를 추출했다. 아카이브 신뢰도가 ${fixed(rescueScore, 3)}으로 상승했다.`);
      safeSetResolution({
        verdict: "HOLD",
        title: incident.kind === "life_support" ? "생명 유지 복구." : "구조 성공.",
        detail: incident.kind === "life_support" ? "고립된 팀이 임시 라인에 복귀했다. 사령부는 방 안의 유령이 줄어든 상태에서 평가를 재개할 수 있다." : `${incident.relayNode}이(가) 더 이상 항로를 출혈시키지 않는다. 생존자가 귀환 중이며 캠페인 평가를 재개할 수 있다.`,
        zoneName: currentZone().name,
        shipName: currentShip().name,
        branchProbability: metrics.branchProbability,
        consistency: metrics.consistency,
        phi: metrics.phi,
        psi: metrics.psi,
        entropy: metrics.entropy,
        eRms: metrics.eRms,
      });
      render();
      return;
    }

    if (incident.remainingHours > 0) {
      pushLog("hold", incident.kind === "life_support" ? "구조 호위대 아직 이동 중." : "구조 출격 미완료.", `${incident.relayNode}이(가) 여전히 불안정하다. 사령부가 회랑을 포기해야 하기까지 ${incident.remainingHours}시간 남았다.`);
      safeSetResolution({
        verdict: "HOLD",
        title: incident.kind === "life_support" ? "승무원 아직 고립 중." : "구조 아직 진행 중.",
        detail: `${incident.relayNode}이(가) 첫 번째 드론 파동을 막아냈다. phi, E_rms, 일관성을 안정화한 후 창이 닫히기 전에 다시 시도하라.`,
        zoneName: currentZone().name,
        shipName: currentShip().name,
        branchProbability: metrics.branchProbability,
        consistency: metrics.consistency,
        phi: metrics.phi,
        psi: metrics.psi,
        entropy: metrics.entropy,
        eRms: metrics.eRms,
      });
      render();
      return;
    }

    incident.active = false;
    incident.result = "lost";
    state.resources.materials = Math.max(0, state.resources.materials - 16);
    state.resources.intel = Math.max(0, state.resources.intel - 10);
    state.shipStress = clamp(state.shipStress + 9, 0, 100);
    state.structures.relay = Math.max(0, state.structures.relay - 1);
    pushLog("deny", incident.kind === "life_support" ? "생명 유지 창 소실." : "구조 창 소실.", `드론이 항로를 유지하기 전에 ${incident.relayNode}이(가) 어둠에 빠졌다. 나머지를 살리기 위해 중계 라인 하나를 포기했다.`);
    safeSetResolution({
      verdict: "DENY",
      title: incident.kind === "life_support" ? "고립이 영구적이 되었다." : "구조 창이 만료되었다.",
      detail: incident.kind === "life_support" ? "회랑 너머의 팀에게 제시간에 도달할 수 없었다. 아카이브는 항로를 기록하지만, 그들의 귀환은 기록하지 않는다." : `${incident.relayNode}이(가) 사라졌다. 사령부는 네트워크의 한 라인을 희생하여 생존했고, 아카이브는 그렇게 기억할 것이다.`,
      zoneName: currentZone().name,
      shipName: currentShip().name,
      branchProbability: metrics.branchProbability,
      consistency: metrics.consistency,
      phi: metrics.phi,
      psi: metrics.psi,
      entropy: metrics.entropy,
      eRms: metrics.eRms,
    });
    render();
  }

  function tutorialButtonLabel() {
    if (state.tutorial.completed) {
      return "0.51 튜토리얼 재실행";
    }
    if (state.tutorial.step > 0) {
      return `튜토리얼 ${Math.min(state.tutorial.step + 1, 3)} / 3`;
    }
    return "0.51 튜토리얼 실행";
  }

  function runPhiTutorial() {
    if (state.terminal.mode === "EVALUATE" || state.terminal.mode === "HOLD") {
      return;
    }
    const nextIndex = state.tutorial.completed ? 0 : clamp(state.tutorial.step, 0, TUTORIAL_SCENARIOS.length - 1);
    const scenario = TUTORIAL_SCENARIOS[nextIndex];
    clearTerminalTimers();
    state.tutorial.active = true;
    state.tutorial.step = nextIndex + 1;
    state.controls.phase = scenario.phase;
    state.terminal.activeCampaignId = "tutorial_051";
    state.terminal.simCount = scenario.simStart || scenario.simCount || 0;
    state.terminal.holdTimeRemaining = scenario.holdSeconds || 0;
    pushTerminalLine(`> ${scenario.label} :: ${scenario.title}`);
    pushTerminalLine(`> phi ${fixed(scenario.phi, 3)} // E_rms ${fixed(scenario.eRms, 3)} // consistency ${fixed(scenario.consistency, 3)}`);

    if (scenario.verdict !== "HOLD") {
      state.terminal.mode = scenario.verdict;
      state.terminal.lastVerdict = scenario.verdict;
      safeSetResolution({
        verdict: scenario.verdict,
        title: scenario.title,
        detail: scenario.detail,
        zoneName: currentZone().name,
        shipName: currentShip().name,
        branchProbability: scenario.branchProbability,
        consistency: scenario.consistency,
        phi: scenario.phi,
        psi: scenario.psi,
        entropy: scenario.entropy,
        eRms: scenario.eRms,
      });
      if (scenario.verdict === "DENY") {
        pushLog("deny", "0.51 튜토리얼 // DENY", "phi 0.50은 즉시 실패했다. 기계는 그렇게 작은 마진과 타협하지 않는다.");
      } else {
        pushLog("allow", "0.51 튜토리얼 // ALLOW", "phi 0.52는 즉시 통과했다. 기계는 용기보다 여유를 좋아한다.");
      }
      render();
      terminalResetTimeoutId = setTimeout(function () {
        state.tutorial.active = false;
        resetTerminalToIdle();
      }, 1000);
      return;
    }

    state.terminal.mode = "HOLD";
    safeSetResolution({
      verdict: "HOLD",
      title: scenario.title,
      detail: scenario.detail,
      zoneName: currentZone().name,
      shipName: currentShip().name,
      branchProbability: scenario.branchProbability,
      consistency: scenario.consistency,
      phi: scenario.phi,
      psi: scenario.psi,
      entropy: scenario.entropy,
      eRms: scenario.eRms,
    });
    render();

    let tickIndex = 0;
    const totalTicks = 7;
    terminalIntervalId = setInterval(function () {
      tickIndex += 1;
      const progress = tickIndex / totalTicks;
      state.terminal.simCount = Math.round((scenario.simStart || 0) + ((scenario.simEnd || 84) - (scenario.simStart || 0)) * progress);
      state.terminal.holdTimeRemaining = Math.max(scenario.holdSeconds - scenario.holdSeconds * progress, 0);
      if (tickIndex === 3) {
        pushTerminalLine("> HOLD는 기계가 충분한 미래에 당신이 아직 존재하는지 확인하기 위해 시간을 버는 것이다.");
      }
      render();
      if (tickIndex >= totalTicks) {
        clearInterval(terminalIntervalId);
        terminalIntervalId = null;
        state.terminal.mode = "ALLOW";
        state.terminal.lastVerdict = "ALLOW";
        state.tutorial.active = false;
        state.tutorial.completed = true;
        pushTerminalLine("> [ALLOW] 84개 시나리오가 2.1초 망설임 창을 생존했다.");
        pushLog("allow", "0.51 튜토리얼 완료.", "0.01이 죽음, 삶, 그리고 망설임을 결정했다. 터미널은 HOLD가 실제로 무엇을 의미하는지 보여주었다.");
        safeSetResolution({
          verdict: "ALLOW",
          title: "HOLD가 생존이 되었다.",
          detail: "HOLD는 망설임이 아니다. 기계가 2.1초를 들여 당신이 충분한 미래에서 살아 있는지 시뮬레이션하는 것이다.",
          zoneName: currentZone().name,
          shipName: currentShip().name,
          branchProbability: 0.514,
          consistency: 0.51,
          phi: 0.51,
          psi: 0.511,
          entropy: scenario.entropy,
          eRms: scenario.eRms,
        });
        render();
        terminalResetTimeoutId = setTimeout(resetTerminalToIdle, 1400);
      }
    }, 300);
  }

  function finalizeCampaignEvaluation(campaign, evaluation, metrics, systems) {
    const situation = activeSituation();
    state.terminal.mode = evaluation.finalVerdict;
    state.terminal.lastVerdict = evaluation.finalVerdict;
    state.terminal.simCount = evaluation.simEnd;
    state.terminal.holdTimeRemaining = 0;
    pushTerminalLine(`> [${evaluation.finalVerdict}] ${evaluation.summary}`);

    if (evaluation.finalVerdict === "ALLOW") {
      applyCampaignSuccess(campaign, metrics, systems);
      pushLog("allow", `캠페인 ${campaign.number} 클리어.`, `${campaign.title}이(가) 아카이브에 등록되었다. ${campaign.summary}`);
      safeSetResolution({
        verdict: "ALLOW",
        title: `${campaign.title} cleared.`,
        detail: campaign.summary,
        zoneName: metrics.zone.name,
        shipName: metrics.ship.name,
        branchProbability: metrics.branchProbability,
        consistency: metrics.consistency,
        phi: metrics.phi,
        psi: metrics.psi,
        entropy: metrics.entropy,
        eRms: metrics.eRms,
        situationTitle: situation ? situation.title : null,
        situationSummary: situation ? situation.summary : null,
        situationEffects: situation ? situation.effectTexts : null,
      });
    } else {
      const setbackDetail = applyCampaignSetback(campaign, evaluation.finalVerdict);
      if (campaign.id === "campaign_06" && (evaluation.forcedCrisis || !activeRescueIncident()) && !state.completedCampaignIds.includes(campaign.id)) {
        createCampaignSixIncident();
      }
      const unresolvedDetail = setbackDetail ? `${evaluation.summary} ${setbackDetail}` : evaluation.summary;
      pushLog(evaluation.finalVerdict === "HOLD" ? "hold" : "deny", `캠페인 ${campaign.number} 미해결.`, unresolvedDetail);
      safeSetResolution({
        verdict: evaluation.finalVerdict,
        title: `${campaign.title} ${evaluation.finalVerdict.toLowerCase()}.`,
        detail: unresolvedDetail,
        zoneName: metrics.zone.name,
        shipName: metrics.ship.name,
        branchProbability: metrics.branchProbability,
        consistency: metrics.consistency,
        phi: metrics.phi,
        psi: metrics.psi,
        entropy: metrics.entropy,
        eRms: metrics.eRms,
        situationTitle: situation ? situation.title : null,
        situationSummary: situation ? situation.summary : null,
        situationEffects: situation ? situation.effectTexts : null,
      });
    }

    rollCampaignSituation(evaluation.finalVerdict === "ALLOW" ? "campaign-advance" : "retry-stack");
    render();
    terminalResetTimeoutId = setTimeout(resetTerminalToIdle, 1400);
  }

  function startCampaignEvaluation() {
    if (state.terminal.mode === "EVALUATE" || state.terminal.mode === "HOLD") {
      return;
    }
    const campaign = currentCampaign();
    const situation = ensureCampaignSituation();
    const metrics = computeMetrics();
    const systems = computeGameplaySystems(metrics);
    const evaluation = evaluateCampaign(campaign, metrics, systems);
    const holdProfile = computeHoldProfile(campaign.id, campaign.holdSeconds);
    state.campaignAttempts[campaign.id] = campaignAttemptCount(campaign.id) + 1;
    clearTerminalTimers();
    state.terminal.activeCampaignId = campaign.id;
    state.terminal.mode = "EVALUATE";
    state.terminal.simCount = evaluation.simStart;
    state.terminal.holdTimeRemaining = holdProfile.displaySeconds;
    pushTerminalLine(`> 평가 중 ${campaign.title} :: ${campaign.sjcVersion}`);
    pushTerminalLine(`> 목표 :: ${campaign.objective}`);
    if (situation) {
      pushTerminalLine(`> 상황 :: ${situation.title} // ${situation.effectTexts.slice(0, 3).join(" / ")}`);
    }
    if (holdProfile.isRetry) {
      pushTerminalLine("> 재시도 빨리감기 활성화. SJC가 반복 분기를 압축하고 있습니다.");
    }
    render();

    setTimeout(function () {
      state.terminal.mode = "HOLD";
      const totalTicks = Math.max(3, Math.ceil(holdProfile.displaySeconds));
      const realTickMs = Math.max(80, Math.min(420, Math.floor((holdProfile.realSeconds * 1000) / totalTicks)));
      const simEnd = Math.round(evaluation.simEnd * holdProfile.simScale);
      let tickIndex = 0;
      terminalIntervalId = setInterval(function () {
        tickIndex += 1;
        const progress = tickIndex / totalTicks;
        state.terminal.simCount = Math.round(
          evaluation.simStart + (simEnd - evaluation.simStart) * progress
        );
        state.terminal.holdTimeRemaining = Math.max(holdProfile.displaySeconds - progress * holdProfile.displaySeconds, 0);
        if (tickIndex % Math.max(Math.floor(totalTicks / 4), 1) === 0) {
          pushTerminalLine(`> [HOLD] ${fixed(state.terminal.holdTimeRemaining, 1)} s // sim ${state.terminal.simCount.toLocaleString()}`);
        }
        render();
        if (tickIndex >= totalTicks) {
          clearInterval(terminalIntervalId);
          terminalIntervalId = null;
          finalizeCampaignEvaluation(campaign, evaluation, metrics, systems);
        }
      }, realTickMs);
    }, 250);
  }

  function skipHoldSequence() {
    if (state.terminal.mode !== "HOLD") {
      return;
    }
    clearTerminalTimers();
    const campaign = currentCampaign();
    const metrics = computeMetrics();
    const systems = computeGameplaySystems(metrics);
    const evaluation = evaluateCampaign(campaign, metrics, systems);
    finalizeCampaignEvaluation(campaign, evaluation, metrics, systems);
  }

  function upgradeCost(definition) {
    const level = state.upgrades[definition.id];
    return {
      energy: 18 + level * 16 + (definition.id === "hctg" ? 10 : 0),
      materials: 20 + level * 18 + (definition.id === "hctg" ? 16 : 0),
      hydrogen: definition.id === "qlaunch" || definition.id === "cweh" ? 3 + level : 0,
    };
  }

  function structureCost(kind) {
    if (kind === "mainGate") {
      const nextLevel = state.structures.mainGateLevel + 1;
      return { energy: 56 + nextLevel * 28, materials: 70 + nextLevel * 34, hydrogen: 10 + nextLevel * 3 };
    }
    if (kind === "relay") {
      return { energy: 18 + state.structures.relay * 4, materials: 24 + state.structures.relay * 6, hydrogen: 0 };
    }
    if (kind === "seed") {
      return { energy: 34 + state.structures.seed * 6, materials: 38 + state.structures.seed * 8, hydrogen: 6 };
    }
    if (kind === "solar") {
      return { energy: 10, materials: 30 + state.structures.solar * 10, hydrogen: 0 };
    }
    if (kind === "harvester") {
      return { energy: 16, materials: 24 + state.structures.harvester * 9, hydrogen: 0 };
    }
    return { energy: 0, materials: 0, hydrogen: 0 };
  }

  function writeNumberText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      return normalizeState(JSON.parse(raw));
    } catch (_error) {
      return null;
    }
  }

  function saveState() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function resetState() {
    clearTerminalTimers();
    state = clone(INITIAL_STATE);
    pushLog("hold", "Command archive reset.", "The chamber is back to Gate I. Humanity will have to grow the relay network again.");
    safeSetResolution(null);
    state.selectedZoneId = currentCampaign().zoneId;
    state.selectedDocumentId = null;
    saveState();
    render();
  }

  function accessibleZone(zone) {
    return networkSpan() >= zone.requiredSpan * 0.82 || state.completedZones.includes(zone.id);
  }

  function completedZone(zoneId) {
    return state.completedZones.includes(zoneId);
  }

  function currentEraLabel() {
    return ERA_DEFS[currentEraIndex()].title;
  }

  function updateSliderValues() {
    writeNumberText("phase-value", String(state.controls.phase));
    writeNumberText("curvature-value", String(state.controls.curvature));
    writeNumberText("coolant-value", String(state.controls.coolant));
    writeNumberText("relay-value", String(state.controls.relaySync));
  }

  function renderStats(metrics) {
    writeNumberText("stat-year", String(state.year));
    writeNumberText("stat-era", currentEraLabel());
    writeNumberText("stat-energy", String(Math.round(state.resources.energy)));
    writeNumberText("stat-materials", String(Math.round(state.resources.materials)));
    writeNumberText("stat-hydrogen", String(Math.round(state.resources.hydrogen)));
    writeNumberText("stat-intel", String(Math.round(state.resources.intel)));
    writeNumberText("stat-span", `${Math.round(metrics.span)}`);
    writeNumberText("stat-stress", `${Math.round(state.shipStress)}`);
  }

  function renderShips() {
    elements.shipList.innerHTML = SHIPS.map((ship) => {
      const selected = ship.id === state.selectedShipId ? "selected" : "";
      return `
        <article class="ship-card ${selected}">
          <div class="card-head">
            <div>
              <h3>${ship.name}</h3>
              <div class="muted-copy">${ship.description}</div>
            </div>
            <div class="card-tag">${ship.tag}</div>
          </div>
          <div class="card-metrics">
            <div class="mini-metric"><span>승무원</span><strong>${ship.crew}</strong></div>
            <div class="mini-metric"><span>선체</span><strong>${fixed(ship.hull, 2)}</strong></div>
            <div class="mini-metric"><span>양자</span><strong>${fixed(ship.quantum, 2)}</strong></div>
            <div class="mini-metric"><span>사거리</span><strong>${fixed(ship.rangeBias, 2)}x</strong></div>
          </div>
          <div class="card-actions">
            <span class="muted-copy">센서 ${fixed(ship.sensor, 2)} // 스트레스 방어 ${fixed(ship.stressGuard, 2)}</span>
            <button class="card-button" data-action="select-ship" data-ship="${ship.id}">배치</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderStructures() {
    const gate = currentGate();
    const cards = [
      {
        title: `${gate.name} // 메인 게이트`,
        copy: `${gate.diameter} 챔버. ${gate.lore}`,
        stats: `기본 범위 ${gate.baseSpan} // 안정성 ${fixed(gate.stability, 2)}`,
        action: "upgrade-main-gate",
        disabled: state.structures.mainGateLevel >= 5,
        cost: structureCost("mainGate"),
      },
      {
        title: `중계 게이트 x${state.structures.relay}`,
        copy: "긴 회랑에서 함선이 찢어지는 것을 막아주는 단거리 디딤돌.",
        stats: "각 중계기는 범위 +46을 추가한다.",
        action: "build-relay",
        disabled: false,
        cost: structureCost("relay"),
      },
      {
        title: `게이트 시드 x${state.structures.seed}`,
        copy: "앞서 도약하여 다음 회랑 노드를 성장시키는 자율 시드 링.",
        stats: "각 시드는 범위 +92와 추가 패시브 자재를 제공한다.",
        action: "launch-seed",
        disabled: state.structures.mainGateLevel < 2,
        cost: structureCost("seed"),
      },
      {
        title: `태양 집광기 x${state.structures.solar}`,
        copy: "증폭된 태양광을 로컬 게이트 스택에 쏟아붓는 반사경 군집.",
        stats: "주요 행동마다 패시브 에너지 획득.",
        action: "build-solar",
        disabled: state.structures.solar >= 4,
        cost: structureCost("solar"),
      },
      {
        title: `수소 수확기 x${state.structures.harvester}`,
        copy: "미량 수소를 사용 가능한 연료로 긁어모으는 심우주 깔때기.",
        stats: "패시브 수소 획득 및 회랑 지구력 증가.",
        action: "build-harvester",
        disabled: state.structures.harvester >= 4,
        cost: structureCost("harvester"),
      },
    ];

    elements.structureList.innerHTML = cards.map((card) => {
      const disabled = card.disabled ? "disabled" : "";
      const cost = `E ${card.cost.energy} / M ${card.cost.materials} / H ${card.cost.hydrogen}`;
      return `
        <article class="structure-card">
          <div class="card-head">
            <div>
              <h4>${card.title}</h4>
              <div class="card-copy">${card.copy}</div>
            </div>
          </div>
          <div class="structure-footer">
            <span class="muted-copy">${card.stats}<br>${cost}</span>
            <button class="card-button" data-action="${card.action}" ${disabled}>실행</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderUpgrades() {
    elements.upgradeList.innerHTML = UPGRADE_DEFS.map((definition) => {
      const currentLevel = state.upgrades[definition.id];
      const cost = upgradeCost(definition);
      const disabled = currentLevel >= definition.maxLevel ? "disabled" : "";
      const special = definition.id === "hctg" ? `n=${fixed(hctgValue(), 1)}` : `L${currentLevel}/${definition.maxLevel}`;
      return `
        <article class="upgrade-card">
          <div class="card-head">
            <div>
              <h4>${definition.name}</h4>
              <div class="card-copy">${definition.effect}</div>
            </div>
            <div class="card-tag">${special}</div>
          </div>
          <div class="upgrade-footer">
            <span class="muted-copy">E ${cost.energy} / M ${cost.materials} / H ${cost.hydrogen}</span>
            <button class="card-button" data-action="upgrade" data-upgrade="${definition.id}" ${disabled}>업그레이드</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderZoneMap(metrics) {
    elements.zoneMap.innerHTML = ZONES.map((zone) => {
      const selected = zone.id === state.selectedZoneId ? "selected" : "";
      const completed = completedZone(zone.id) ? "completed" : "";
      const locked = accessibleZone(zone) ? "" : "locked";
      return `
        <button class="zone-node ${selected} ${completed} ${locked}" data-action="select-zone" data-zone="${zone.id}" style="left:${zone.x}%; top:${zone.y}%">
          <strong>${zone.name}</strong>
          <span>${zone.distanceText}</span>
        </button>
      `;
    }).join("");

    const zone = metrics.zone;
    const accessState = state.structures.mainGateLevel < zone.gateTierRequired ? "메인 게이트 등급 부족" : metrics.span < zone.requiredSpan ? "네트워크 범위 부족" : "항로 물리적 접근 가능";
    elements.selectedZonePill.textContent = `${zone.name} // ${zone.distanceText}`;
    elements.zoneDetail.innerHTML = `
      <article class="zone-info-card">
        <h3>${zone.name}</h3>
        <p>${zone.description}</p>
        <div class="zone-grid">
          <div class="zone-stat"><span>부제</span><strong>${zone.subtitle}</strong></div>
          <div class="zone-stat"><span>거리</span><strong>${zone.distanceText}</strong></div>
          <div class="zone-stat"><span>필요 범위</span><strong>${zone.requiredSpan}</strong></div>
          <div class="zone-stat"><span>게이트 등급</span><strong>${zone.gateTierRequired}</strong></div>
          <div class="zone-stat"><span>최소 phi</span><strong>${fixed(zone.minPhi, 2)}</strong></div>
          <div class="zone-stat"><span>최소 psi</span><strong>${fixed(zone.minPsi, 2)}</strong></div>
          <div class="zone-stat"><span>위험도</span><strong>${Math.round(zone.risk * 100)}%</strong></div>
          <div class="zone-stat"><span>상태</span><strong>${accessState}</strong></div>
        </div>
      </article>
      <article class="zone-info-card">
        <h3>항로 보상</h3>
        <p>회랑은 에너지, 제조 자재, 수소 비축, 탐사 정보를 보상한다.</p>
        <div class="zone-grid">
          <div class="zone-stat"><span>에너지</span><strong>+${zone.reward.energy}</strong></div>
          <div class="zone-stat"><span>자재</span><strong>+${zone.reward.materials}</strong></div>
          <div class="zone-stat"><span>수소</span><strong>+${zone.reward.hydrogen}</strong></div>
          <div class="zone-stat"><span>정보</span><strong>+${zone.reward.intel}</strong></div>
        </div>
      </article>
    `;
  }

  function metricRow(label, value) {
    return `<div class="metric-table-row"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function renderCostString(cost) {
    return `E ${cost.energy} / M ${cost.materials} / H ${cost.hydrogen}`;
  }

  function renderGateChamber(metrics) {
    const gate = metrics.gate;
    elements.gateRing.style.setProperty("--charge", String(Math.round(state.gateCharge)));
    elements.gateRing.style.setProperty("--ring-glow", gate.color);
    elements.gateRing.style.boxShadow = `inset 0 0 34px rgba(255,255,255,0.05), 0 0 42px ${gate.color}66`;
    writeNumberText("gate-tier-label", gate.name);
    writeNumberText("gate-charge-label", `${Math.round(state.gateCharge)}%`);
    writeNumberText("gate-range-label", `범위 ${Math.round(metrics.span)} // ${gate.diameter}`);
    writeNumberText("focus-state", state.focusPulse ? "charged" : "offline");
    writeNumberText("main-gate-readout", gate.name);
    writeNumberText("relay-readout", String(state.structures.relay));
    writeNumberText("seed-readout", String(state.structures.seed));

    writeNumberText("metric-phi-label", fixed(metrics.phi, 3));
    writeNumberText("metric-psi-label", fixed(metrics.psi, 3));
    writeNumberText("metric-entropy-label", fixed(metrics.entropy, 3));
    writeNumberText("metric-consistency-label", `${fixed(metrics.consistency, 3)} // band 0.300-0.700`);
    writeNumberText("metric-branch-label", fixed(metrics.branchProbability, 3));

    document.getElementById("metric-phi-fill").style.width = `${metrics.phi * 100}%`;
    document.getElementById("metric-psi-fill").style.width = `${metrics.psi * 100}%`;
    document.getElementById("metric-entropy-fill").style.width = `${metrics.entropy * 100}%`;
    document.getElementById("metric-consistency-fill").style.width = `${metrics.consistency * 100}%`;
    document.getElementById("metric-branch-fill").style.width = `${metrics.branchProbability * 100}%`;

    elements.metricTable.innerHTML = [
      metricRow("Ship", metrics.ship.name),
      metricRow("HCTG lattice", `n=${fixed(hctgValue(), 1)}`),
      metricRow("Hull integrity", `${Math.round(metrics.hullIntegrity * 100)}%`),
      metricRow("Core temp", `${Math.round(state.simulation.coreTemperature)} K`),
      metricRow("Quantum peak", fixed(metrics.quantumPeak, 3)),
      metricRow("Relay harmony", fixed(metrics.relayHarmony, 3)),
      metricRow("Span coverage", `${Math.round(metrics.spanCoverage * 100)}%`),
      metricRow("Jump cost", renderCostString(actionCost("jump"))),
      metricRow("Reason", metrics.reason),
    ].join("");

    const verdictClass = metrics.verdict.toLowerCase();
    elements.verdictPill.className = `pill verdict-pill ${verdictClass}`;
    elements.verdictPill.textContent = `SJC // ${metrics.verdict}`;
  }

  function systemStat(label, value) {
    return `<div class="system-card-stat"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function renderFieldSystems(metrics, systems) {
    elements.systemsPill.textContent = `Systems // hull ${Math.round(metrics.hullIntegrity * 100)}% // temp ${Math.round(systems.thermal.updatedTemperature)}K`;
    elements.systemsGrid.innerHTML = [
      `
        <article class="system-card">
          <div class="system-card-header">
            <div>
              <strong>Motion</strong>
              <span>Q-Launch vector preview</span>
            </div>
            <div class="status-chip">vector</div>
          </div>
          <div class="system-card-grid">
            ${systemStat("Speed", `${fixed(systems.motion.speed, 3)} c.u.`)}
            ${systemStat("Kinetic", fixed(systems.motion.kineticEnergy, 3))}
            ${systemStat("Drift ratio", fixed(systems.motion.driftRatio, 3))}
            ${systemStat("Position", `${fixed(systems.motion.updatedPosition[0], 2)}, ${fixed(systems.motion.updatedPosition[1], 2)}`)}
          </div>
          <div class="system-card-copy">A sortie step previews where the active hull will drift if you push the current chamber settings into open space.</div>
        </article>
      `,
      `
        <article class="system-card ${systems.collision.verdict}">
          <div class="system-card-header">
            <div>
              <strong>Collision</strong>
              <span>D-PAD + warp shield envelope</span>
            </div>
            <div class="status-chip ${systems.collision.verdict}">${systems.collision.verdict}</div>
          </div>
          <div class="system-card-grid">
            ${systemStat("Impact", fixed(systems.collision.impactEnergy, 3))}
            ${systemStat("Residual", fixed(systems.collision.residualEnergy, 3))}
            ${systemStat("Hull damage", fixed(systems.collision.hullDamage, 3))}
            ${systemStat("Hull left", `${Math.round(systems.collision.updatedHull * 100)}%`)}
          </div>
          <div class="system-card-copy">Higher relay harmony and HCTG density soak impact spikes before they become a DENY-class hull event.</div>
        </article>
      `,
      `
        <article class="system-card ${systems.thermal.status}">
          <div class="system-card-header">
            <div>
              <strong>Thermal</strong>
              <span>S-Ondol and CWEH loop</span>
            </div>
            <div class="status-chip ${systems.thermal.status}">${systems.thermal.status}</div>
          </div>
          <div class="system-card-grid">
            ${systemStat("Core temp", `${Math.round(systems.thermal.updatedTemperature)} K`)}
            ${systemStat("Margin", `${Math.round(systems.thermal.thermalMargin)} K`)}
            ${systemStat("Recovered", `+${fixed(systems.thermal.recoveredEnergy, 2)} E`)}
            ${systemStat("Bleed", fixed(systems.thermal.dissipatedHeat, 2))}
          </div>
          <div class="system-card-copy">A thermal pulse uses upgraded skin and wake recycling to turn gate stress into survivable heat and bonus energy.</div>
        </article>
      `,
      `
        <article class="system-card ${systems.resources.status}">
          <div class="system-card-header">
            <div>
              <strong>Resources</strong>
              <span>Solar, hydrogen, GLG growth</span>
            </div>
            <div class="status-chip ${systems.resources.status}">${systems.resources.status.replace("_", " ")}</div>
          </div>
          <div class="system-card-grid">
            ${systemStat("Hydrogen", `+${fixed(systems.resources.harvestedHydrogen, 2)}`)}
            ${systemStat("Solar", `+${fixed(systems.resources.harvestedSolarEnergy, 1)} E`)}
            ${systemStat("Lattice", `n=${fixed(systems.resources.latticeDensity, 2)}`)}
            ${systemStat("Seed prog.", `${Math.round(systems.resources.gateSeedProgress * 100)}%`)}
          </div>
          <div class="system-card-copy">Support cycles grow crystal mass, push lattice density upward, and quietly prepare the next autonomous gate seed batch.</div>
        </article>
      `,
      `
        <article class="system-card ${systems.orbital.status}">
          <div class="system-card-header">
            <div>
              <strong>Orbital</strong>
              <span>Relay dock propagation</span>
            </div>
            <div class="status-chip ${systems.orbital.status}">${systems.orbital.status}</div>
          </div>
          <div class="system-card-grid">
            ${systemStat("Orbit speed", `${fixed(systems.orbital.orbitalSpeed, 2)} km/s`)}
            ${systemStat("Angle", `${fixed(systems.orbital.updatedAngleDeg, 1)} deg`)}
            ${systemStat("Period", `${Math.round(systems.orbital.orbitalPeriod)} s`)}
            ${systemStat("Dock XY", `${Math.round(systems.orbital.positionXY[0])}, ${Math.round(systems.orbital.positionXY[1])}`)}
          </div>
          <div class="system-card-copy">Orbit stepping advances the current relay dock around its host body so route timing and intel sweeps feel alive.</div>
        </article>
      `,
    ].join("");
  }

  function renderCampaignLayer(metrics, systems) {
    const campaign = currentCampaign();
    const situation = ensureCampaignSituation();
    const evaluation = evaluateCampaign(campaign, metrics, systems);
    ensureSelectedDocument();
    const selectedDocument = findDocumentById(state.selectedDocumentId) || campaign.documents[0] || unlockedRelics()[0] || null;
    const tutorialAvailable = campaign.id === "campaign_01";
    const tutorialMarkup = tutorialAvailable
      ? `
        <div class="tutorial-callout ${state.tutorial.completed ? "complete" : ""}">
          <strong>0.51 Onboarding</strong>
          <p>Run the three-step phi tutorial to feel how 0.01 separates DENY, ALLOW, and HOLD. It also shows why E_rms and consistency are tracked separately.</p>
        </div>
      `
      : "";
    const situationMarkup = situation
      ? `
        <div class="situation-card ${situation.tone || "unstable"}">
          <div class="situation-head">
            <strong>Situation Variable // ${situation.title}</strong>
            <span>${situation.reason === "campaign-advance" ? "new campaign stack" : "active stack"}</span>
          </div>
          <p>${situation.summary}</p>
          <div class="situation-tags">
            ${situation.effectTexts.map(function (effect) {
              return `<span class="situation-tag">${effect}</span>`;
            }).join("")}
          </div>
        </div>
      `
      : "";

    elements.campaignProgressPill.textContent = `Campaign ${campaign.number} / ${CAMPAIGNS.length} // ${campaign.yearLabel}`;
    elements.campaignBrief.innerHTML = `
      <div class="brief-headline">
        <div>
          <div class="panel-kicker">${campaign.generation} // ${campaign.sjcVersion}</div>
          <h3>${campaign.title}</h3>
        </div>
        <div class="pill">${campaign.lead}</div>
        </div>
        <div class="brief-copy">${campaign.summary}</div>
        ${tutorialMarkup}
        ${situationMarkup}
        <div class="brief-meta">
          <div class="brief-meta-card"><span>Objective</span><strong>${campaign.objective}</strong></div>
          <div class="brief-meta-card"><span>Linked Route</span><strong>${findZone(campaign.zoneId).name}</strong></div>
          <div class="brief-meta-card"><span>Expected HOLD</span><strong>${campaign.holdSeconds} s</strong></div>
          <div class="brief-meta-card"><span>E_rms</span><strong>${fixed(metrics.eRms, 3)}</strong></div>
        </div>
      <div class="objective-list">
        ${evaluation.checks.map(function (check) {
          return `
            <article class="objective-item ${check.met ? "met" : "miss"}">
              <span>${check.label}</span>
              <strong>${check.current} / ${check.target}</strong>
            </article>
          `;
        }).join("")}
      </div>
    `;

    elements.terminalStatusPill.className = `pill verdict-pill ${state.terminal.mode.toLowerCase() === "idle" || state.terminal.mode.toLowerCase() === "evaluate" ? "hold" : state.terminal.mode.toLowerCase()}`;
    elements.terminalStatusPill.textContent = state.terminal.mode;
    const tutorialButton = document.getElementById("btn-tutorial");
    tutorialButton.hidden = !tutorialAvailable;
    tutorialButton.disabled = state.terminal.mode === "EVALUATE" || state.terminal.mode === "HOLD";
    tutorialButton.textContent = tutorialButtonLabel();
    document.getElementById("btn-evaluate").disabled = state.terminal.mode === "EVALUATE" || state.terminal.mode === "HOLD";
    document.getElementById("btn-skip-hold").disabled = state.terminal.mode !== "HOLD";
    elements.terminalCampaignName.textContent = campaign.title;
    elements.terminalSimCount.textContent = Number(state.terminal.simCount || 0).toLocaleString();
    elements.terminalHoldTime.textContent = `${fixed(state.terminal.holdTimeRemaining || 0, 1)} s`;

    if (!state.terminal.lines.length) {
      pushTerminalLine(`> Awaiting evaluation for ${campaign.title}.`);
      pushTerminalLine(`> Lead ${campaign.lead} // target route ${findZone(campaign.zoneId).name}`);
    }
    elements.terminalScreen.className = `terminal-screen ${state.terminal.mode.toLowerCase()} ${tutorialAvailable ? "tutorial-eligible" : ""}`;
    elements.terminalScreen.textContent = state.terminal.lines.join("\n");

    elements.archiveList.innerHTML = campaign.documents.map(function (documentEntry) {
      const documentTheme = documentThemeClass(documentEntry);
      return `
        <article class="archive-item ${documentTheme} ${state.selectedDocumentId === documentEntry.id ? "selected" : ""}" data-document="${documentEntry.id}">
          <span>${documentEntry.type}</span>
          <strong>${documentEntry.title}</strong>
          <span>${documentEntry.author}</span>
        </article>
      `;
    }).join("");

    elements.legacyList.innerHTML = unlockedRelics().length
      ? unlockedRelics().map(function (relic) {
          const relicTheme = documentThemeClass(relic);
          return `
            <article class="legacy-item ${relicTheme} ${state.selectedDocumentId === relic.id ? "selected" : ""}" data-document="${relic.id}">
              <span>${relic.generation}</span>
              <strong>${relic.title}</strong>
              <span>${relic.effectText}</span>
            </article>
          `;
        }).join("")
      : `<article class="legacy-item"><span>No relay inheritance yet</span><strong>Complete campaigns to inherit relics.</strong></article>`;

    if (!selectedDocument) {
      elements.documentViewer.innerHTML = `<div class="document-frame dark"><h4>Archive Empty</h4><div class="document-body"><p>Complete the first campaign to start filling the classified stack.</p></div></div>`;
      return;
    }
    const documentTheme = documentThemeClass(selectedDocument);
    elements.documentViewer.innerHTML = `
      <div class="document-frame ${selectedDocument.tone === "dark" ? "dark" : ""} ${documentTheme}">
        <h4>${selectedDocument.title}</h4>
        <div class="document-meta">
          <span>${selectedDocument.author}</span>
          <span>${selectedDocument.type}</span>
          ${selectedDocument.effectText ? `<span>${selectedDocument.effectText}</span>` : ""}
        </div>
        <div class="document-body">
          <p>${selectedDocument.summary}</p>
          ${selectedDocument.quote ? `<div class="document-quote">${selectedDocument.quote}</div>` : ""}
          ${(selectedDocument.body || []).map(function (paragraph) {
            return `<p>${paragraph}</p>`;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderEraTrack() {
    const current = currentEraIndex();
    elements.eraTrack.innerHTML = ERA_DEFS.map((era, index) => {
      const className = index < current ? "complete" : index === current ? "active" : "";
      return `
        <article class="era-node ${className}">
          <strong>${era.name}</strong>
          <span>${era.title}</span>
          <span>Span ${era.rangeRequirement}+ // HCTG ${fixed(era.hctgRequirement, 1)}+</span>
        </article>
      `;
    }).join("");
  }

  function renderMissionLog() {
    elements.missionLog.innerHTML = state.log.map((entry) => `
      <article class="log-entry ${entry.kind}">
        <strong>${entry.year} // ${entry.title}</strong>
        <span>${entry.detail}</span>
      </article>
    `).join("");
  }

  function renderResolution() {
    const payload = state.latestResolution || latestResolutionTemplate();
    const verdictClass = payload.verdict.toLowerCase();
    const liveMetrics = computeMetrics();
    const liveSituation = activeSituation();
    const phiValue = Number.isFinite(payload.phi) ? payload.phi : liveMetrics.phi;
    const psiValue = Number.isFinite(payload.psi) ? payload.psi : liveMetrics.psi;
    const entropyValue = Number.isFinite(payload.entropy) ? payload.entropy : liveMetrics.entropy;
    const consistencyValue = Number.isFinite(payload.consistency) ? payload.consistency : liveMetrics.consistency;
    const branchValue = Number.isFinite(payload.branchProbability) ? payload.branchProbability : liveMetrics.branchProbability;
    const eRmsValue = Number.isFinite(payload.eRms) ? payload.eRms : liveMetrics.eRms;
    const situationTitle = payload.situationTitle || (liveSituation ? liveSituation.title : null);
    const situationSummary = payload.situationSummary || (liveSituation ? liveSituation.summary : null);
    const situationEffects = payload.situationEffects || (liveSituation ? liveSituation.effectTexts : null);
    const incident = state.rescueIncident;
    const situationMarkup = situationTitle
      ? `
        <div class="resolution-event situation-event">
          <div class="resolution-event-head">
            <strong>Situation // ${situationTitle}</strong>
            <span>stack modifiers</span>
          </div>
          <p>${situationSummary || "No active stack modifier summary."}</p>
          ${situationEffects && situationEffects.length
            ? `<div class="situation-tags">${situationEffects.map(function (effect) {
                return `<span class="situation-tag">${effect}</span>`;
              }).join("")}</div>`
            : `<div class="resolution-inline-note">No explicit modifiers registered on this stack.</div>`}
        </div>
      `
      : "";
    const rescueMarkup = incident
      ? `
        <div class="resolution-event ${incident.active ? "incident danger" : "incident"}">
          <div class="resolution-event-head">
            <strong>${incident.title || `${incident.relayNode} Rescue Desk`}</strong>
            <span>${incident.active ? `${incident.remainingHours}h remaining` : incident.result === "rescued" ? "Recovered" : "Closed"}</span>
          </div>
          <p>${incident.crewLabel}</p>
          <div class="resolution-mini-grid">
            <div><span>Attempts</span><strong>${incident.attempts}</strong></div>
            <div><span>Cost</span><strong>E${incident.droneCost.energy} / M${incident.droneCost.materials} / H${incident.droneCost.hydrogen}</strong></div>
          </div>
          ${incident.active ? `
            <div class="resolution-actions">
              <button class="small-button danger" data-action="dispatch-rescue">Dispatch Rescue Drones</button>
            </div>
          ` : `
            <div class="resolution-inline-note">${incident.result === "rescued" ? "The bypass corridor held long enough to bring survivors and telemetry home." : "The bypass failed, but the remaining network was kept alive."}</div>
          `}
        </div>
      `
      : "";
    const finaleMarkup = state.finale.unlocked
      ? `
        <div class="sea-of-stars-card">
          <div class="sea-of-stars-copy">
            <span>Final Archive</span>
            <strong>${state.finale.title || "Sea of Stars"}</strong>
            <p>${state.finale.detail || "The last gate stayed open long enough for the archive to become light."}</p>
          </div>
          <div class="sea-of-stars-metrics">
            <div><span>Unlocked</span><strong>${state.finale.yearUnlocked || state.year}</strong></div>
            <div><span>Campaigns</span><strong>${state.completedCampaignIds.length}/${CAMPAIGNS.length}</strong></div>
            <div><span>Relay Legacy</span><strong>${state.unlockedRelicIds.length} relics</strong></div>
          </div>
        </div>
      `
      : "";
    elements.resolutionCard.innerHTML = `
      <div class="resolution-banner ${verdictClass}">
        <strong>${payload.verdict}</strong>
        <p>${payload.detail}</p>
      </div>
      <div class="resolution-grid">
        <div class="resolution-stat"><span>Zone</span><strong>${payload.zoneName}</strong></div>
        <div class="resolution-stat"><span>Ship</span><strong>${payload.shipName}</strong></div>
        <div class="resolution-stat"><span>phi</span><strong>${fixed(phiValue, 3)}</strong></div>
        <div class="resolution-stat"><span>psi</span><strong>${fixed(psiValue, 3)}</strong></div>
        <div class="resolution-stat"><span>E_rms</span><strong>${fixed(eRmsValue, 3)}</strong></div>
        <div class="resolution-stat"><span>Entropy</span><strong>${fixed(entropyValue, 3)}</strong></div>
        <div class="resolution-stat"><span>Consistency</span><strong>${fixed(consistencyValue, 3)}</strong></div>
        <div class="resolution-stat"><span>Branch Prob.</span><strong>${fixed(branchValue, 3)}</strong></div>
        <div class="resolution-stat"><span>Headline</span><strong>${payload.title}</strong></div>
      </div>
      ${situationMarkup}
      ${rescueMarkup}
      ${finaleMarkup}
    `;
  }

  function render() {
    ensureCampaignSituation();
    const metrics = computeMetrics();
    const systems = computeGameplaySystems(metrics);
    ensureSelectedDocument();
    updateSliderValues();
    renderStats(metrics);
    renderShips();
    renderStructures();
    renderUpgrades();
    renderCampaignLayer(metrics, systems);
    renderZoneMap(metrics);
    renderGateChamber(metrics);
    renderFieldSystems(metrics, systems);
    renderEraTrack();
    renderMissionLog();
    renderResolution();
    saveState();
  }

  function calibrateChamber() {
    const zone = currentZone();
    const ship = currentShip();
    state.controls.phase = clamp(Math.round(51 + (zone.minPhi - 0.5) * 70 + state.upgrades.warp_shield * 2 - zone.risk * 8), 36, 78);
    state.controls.curvature = clamp(Math.round(50 + (zone.minPsi - 0.5) * 90 + state.structures.mainGateLevel * 5 + ship.rangeBias * 4), 38, 88);
    state.controls.coolant = clamp(Math.round(58 + state.upgrades.sondol * 7 + state.upgrades.cweh * 3 - zone.risk * 10), 32, 94);
    state.controls.relaySync = clamp(Math.round(42 + state.structures.relay * 4 + state.structures.seed * 6 + state.upgrades.qlaunch * 2), 20, 96);
    state.gateCharge = clamp(state.gateCharge + 6, 0, 100);
    advanceYear(1);
    pushLog("hold", "Chamber recalibrated.", `Gate control has been nudged toward ${zone.name}. Consistency is aiming for the 0.5 +/- 0.2 lock band.`);
    const metrics = computeMetrics();
    safeSetResolution({
      verdict: "HOLD",
      title: "Calibration cycle complete.",
      detail: "The ring geometry shifted closer to a valid lock, but the chamber still wants a clean jump check.",
      zoneName: zone.name,
      shipName: ship.name,
      branchProbability: metrics.branchProbability,
      consistency: metrics.consistency,
      phi: metrics.phi,
      psi: metrics.psi,
      entropy: metrics.entropy,
    });
    render();
  }

  function chargeGate() {
    gain(passiveIncome());
    const chargeCost = { energy: 18, materials: 4, hydrogen: 1 };
    if (!canAfford(chargeCost)) {
      pushLog("deny", "Charge failed.", "The chamber is starved of energy or hydrogen. Build support infrastructure first.");
      render();
      return;
    }
    spend(chargeCost);
    state.gateCharge = clamp(state.gateCharge + 18 + state.structures.solar * 3 + state.upgrades.cweh * 2, 0, 100);
    advanceYear(1);
    pushLog("hold", "Gate charge increased.", `Chamber rose to ${Math.round(state.gateCharge)}%. Solar concentrators and CWEH scavenging fed the stack.`);
    render();
  }

  function reverseFocus() {
    if (state.structures.relay < 3) {
      pushLog("deny", "Reverse focus denied.", "At least three relay gates must already be humming in the network.");
      render();
      return;
    }
    const focusCost = { energy: 28, materials: 0, hydrogen: 4 };
    if (!canAfford(focusCost)) {
      pushLog("deny", "Reverse focus denied.", "The network cannot fold its own resonance without spare fuel.");
      render();
      return;
    }
    spend(focusCost);
    state.focusPulse = true;
    state.gateCharge = clamp(state.gateCharge + 12, 0, 100);
    advanceYear(1);
    pushLog("hold", "Network resonance inverted.", "Relay gates are now dumping stored wake energy back into the main chamber for one high-risk run.");
    render();
  }

  function commitJump() {
    const metrics = computeMetrics();
    const cost = actionCost("jump");
    if (!canAfford(cost)) {
      pushLog("deny", "Jump scrubbed.", "Fuel and fabrication stock are not enough to commit the corridor.");
      safeSetResolution({
        verdict: "DENY",
        title: "Insufficient resources.",
        detail: "The command deck canceled the jump before the ring could tear itself apart.",
        zoneName: metrics.zone.name,
        shipName: metrics.ship.name,
        branchProbability: metrics.branchProbability,
        consistency: metrics.consistency,
        phi: metrics.phi,
        psi: metrics.psi,
        entropy: metrics.entropy,
      });
      render();
      return;
    }

    spend(cost);
    gain(passiveIncome());

    if (metrics.verdict === "ALLOW") {
      gain(metrics.zone.reward);
      state.gateCharge = 0;
      state.shipStress = clamp(state.shipStress + metrics.zone.risk * 12 - metrics.ship.stressGuard * 18 - state.upgrades.dpad * 4, 0, 100);
      if (!state.completedZones.includes(metrics.zone.id)) {
        state.completedZones.push(metrics.zone.id);
      }
      state.focusPulse = false;
      advanceYear(metrics.zone.requiredSpan >= 1200 ? 8 : metrics.zone.requiredSpan >= 400 ? 4 : 2);
      const branchHeadline = metrics.branchProbability >= 0.78 ? "Clean corridor." : metrics.branchProbability >= 0.58 ? "Stable but noisy arrival." : "Side-branch turbulence captured extra intel.";
      const detail = `${metrics.ship.name} crossed ${metrics.zone.name}. Consistency held at ${fixed(metrics.consistency, 3)}, branch probability ${fixed(metrics.branchProbability, 3)}. ${branchHeadline}`;
      pushLog("allow", "SJC [ALLOW] corridor opened.", detail);
      safeSetResolution({
        verdict: "ALLOW",
        title: branchHeadline,
        detail,
        zoneName: metrics.zone.name,
        shipName: metrics.ship.name,
        branchProbability: metrics.branchProbability,
        consistency: metrics.consistency,
        phi: metrics.phi,
        psi: metrics.psi,
        entropy: metrics.entropy,
      });
      render();
      return;
    }

    if (metrics.verdict === "HOLD") {
      state.gateCharge = clamp(state.gateCharge + 12, 0, 100);
      state.shipStress = clamp(state.shipStress + 8 - state.upgrades.dpad * 2, 0, 100);
      state.focusPulse = false;
      advanceYear(1);
      const detail = `The chamber stalled in HOLD. phi ${fixed(metrics.phi, 3)} / psi ${fixed(metrics.psi, 3)} / consistency ${fixed(metrics.consistency, 3)}. The ring can try again after one more correction pass.`;
      pushLog("hold", "SJC [HOLD] chamber stalled.", detail);
      safeSetResolution({
        verdict: "HOLD",
        title: "Gate pressure plateau.",
        detail,
        zoneName: metrics.zone.name,
        shipName: metrics.ship.name,
        branchProbability: metrics.branchProbability,
        consistency: metrics.consistency,
        phi: metrics.phi,
        psi: metrics.psi,
        entropy: metrics.entropy,
      });
      render();
      return;
    }

    const deepCoreBuffer = state.upgrades.deep_core * 0.18;
    const savedIntel = Math.round(metrics.zone.reward.intel * deepCoreBuffer);
    state.resources.intel += savedIntel;
    state.shipStress = clamp(state.shipStress + 18 - state.upgrades.dpad * 2 - state.upgrades.deep_core * 3, 0, 100);
    state.gateCharge = 0;
    state.focusPulse = false;
    advanceYear(1);
    const detail = `SJC returned DENY. The corridor collapsed before the ship could commit. ${savedIntel > 0 ? `Deep Core preserved ${savedIntel} intel.` : "No Deep Core salvage was available."}`;
    pushLog("deny", "SJC [DENY] jump rejected.", detail);
    safeSetResolution({
      verdict: "DENY",
      title: savedIntel > 0 ? "Deep Core salvage secured." : "Chamber collapsed.",
      detail,
      zoneName: metrics.zone.name,
      shipName: metrics.ship.name,
      branchProbability: metrics.branchProbability,
      consistency: metrics.consistency,
      phi: metrics.phi,
      psi: metrics.psi,
      entropy: metrics.entropy,
    });
    render();
  }

  function upgradeTechnology(upgradeId) {
    const definition = UPGRADE_DEFS.find((item) => item.id === upgradeId);
    if (!definition || state.upgrades[upgradeId] >= definition.maxLevel) {
      return;
    }
    const cost = upgradeCost(definition);
    if (!canAfford(cost)) {
      pushLog("deny", `${definition.name} blocked.`, "Not enough stockpile to grow or install this technology tier.");
      render();
      return;
    }
    spend(cost);
    state.upgrades[upgradeId] += 1;
    advanceYear(upgradeId === "hctg" ? 4 : 2);
    pushLog("allow", `${definition.name} upgraded.`, upgradeId === "hctg" ? `Lattice density reached n=${fixed(hctgValue(), 1)}. The whole chamber feels more certain now.` : `${definition.name} advanced to level ${state.upgrades[upgradeId]}. ${definition.effect}`);
    render();
  }

  function buildStructure(action) {
    const mapping = {
      "upgrade-main-gate": "mainGate",
      "build-relay": "relay",
      "launch-seed": "seed",
      "build-solar": "solar",
      "build-harvester": "harvester",
    };
    const kind = mapping[action];
    if (!kind) {
      return;
    }
    if (kind === "mainGate" && state.structures.mainGateLevel >= 5) {
      return;
    }
    if (kind === "solar" && state.structures.solar >= 4) {
      return;
    }
    if (kind === "harvester" && state.structures.harvester >= 4) {
      return;
    }
    if (kind === "seed" && state.structures.mainGateLevel < 2) {
      pushLog("deny", "Gate seed unavailable.", "Gate II is the first tier with enough stability to throw autonomous seed rings.");
      render();
      return;
    }
    const cost = structureCost(kind);
    if (!canAfford(cost)) {
      pushLog("deny", "Construction blocked.", "Resource reserves are not high enough for that infrastructure order.");
      render();
      return;
    }
    spend(cost);

    if (kind === "mainGate") {
      state.structures.mainGateLevel += 1;
      advanceYear(6);
      pushLog("allow", `${currentGate().name} commissioned.`, `${currentGate().diameter} chamber online. ${currentGate().lore}`);
    } else if (kind === "relay") {
      state.structures.relay += 1;
      advanceYear(1);
      pushLog("allow", "Relay Gate deployed.", "The corridor grew longer and less lonely.");
    } else if (kind === "seed") {
      state.structures.seed += 1;
      advanceYear(2);
      pushLog("allow", "Gate seed launched.", "Autonomous seeding has begun carving the next route segment.");
    } else if (kind === "solar") {
      state.structures.solar += 1;
      advanceYear(1);
      pushLog("allow", "Solar concentrator added.", "The gate array now drinks harder from nearby starlight.");
    } else if (kind === "harvester") {
      state.structures.harvester += 1;
      advanceYear(1);
      pushLog("allow", "Hydrogen harvester deployed.", "Deep-space fuel recovery is slowly becoming self-sustaining.");
    }

    render();
  }

  function runSortie() {
    const metrics = computeMetrics();
    const systems = computeGameplaySystems(metrics);
    const sortieCost = {
      energy: 10 + state.structures.mainGateLevel * 4,
      materials: 0,
      hydrogen: 1 + Math.round(metrics.zone.risk * 4),
    };
    if (!canAfford(sortieCost)) {
      pushLog("deny", "Sortie blocked.", "The active hull does not have enough energy or hydrogen for a safe field test.");
      render();
      return;
    }
    spend(sortieCost);
    state.simulation.flightPosition = systems.motion.updatedPosition.map(function (value) {
      return Number(fixed(value, 4));
    });
    state.simulation.flightVelocity = systems.motion.updatedVelocity.map(function (value) {
      return Number(fixed(value, 4));
    });
    state.simulation.hullIntegrity = clamp(systems.collision.updatedHull, 0, 1);
    state.shipStress = clamp(
      state.shipStress + systems.collision.hullDamage * 48 - metrics.ship.stressGuard * 10,
      0,
      100
    );
    const intelGain = Math.max(1, Math.round(metrics.ship.sensor * 10 + metrics.branchProbability * 7));
    state.resources.intel += intelGain;
    if (systems.collision.verdict === "deny") {
      state.resources.materials = Math.max(0, state.resources.materials - 6);
    }
    advanceYear(1);
    pushLog(
      systems.collision.verdict === "deny" ? "deny" : systems.collision.verdict === "hold" ? "hold" : "allow",
      "Field sortie executed.",
      `${metrics.ship.name} pushed a live vector through ${metrics.zone.name}. Speed ${fixed(systems.motion.speed, 3)}, hull ${Math.round(state.simulation.hullIntegrity * 100)}%, intel +${intelGain}.`
    );
    render();
  }

  function pulseThermals() {
    const metrics = computeMetrics();
    const systems = computeGameplaySystems(metrics);
    const coolingLift = 12 + state.upgrades.sondol * 4 + state.upgrades.cweh * 3 + state.controls.coolant * 0.08;
    state.simulation.coreTemperature = Math.max(268, systems.thermal.updatedTemperature - coolingLift);
    const recoveredEnergy = Math.max(1, Math.round(systems.thermal.recoveredEnergy));
    state.resources.energy += recoveredEnergy;
    state.gateCharge = clamp(state.gateCharge + recoveredEnergy * 0.4, 0, 100);
    state.shipStress = clamp(state.shipStress - (4 + state.upgrades.sondol * 2), 0, 100);
    advanceYear(1);
    pushLog(
      systems.thermal.status === "critical" ? "deny" : "hold",
      "Thermal pulse completed.",
      `Core temperature settled near ${Math.round(state.simulation.coreTemperature)}K. CWEH recovered +${recoveredEnergy} energy and stress eased to ${Math.round(state.shipStress)}.`
    );
    render();
  }

  function runSupportCycle() {
    const metrics = computeMetrics();
    const systems = computeGameplaySystems(metrics);
    const energyGain = Math.max(1, Math.round(systems.resources.harvestedSolarEnergy * 0.34));
    const materialGain = Math.max(1, Math.round(systems.resources.glgGrowth * 1.3));
    const hydrogenGain = Math.max(1, Math.round(systems.resources.harvestedHydrogen));
    gain({ energy: energyGain, materials: materialGain, hydrogen: hydrogenGain });
    state.simulation.crystalMass = Number(fixed(systems.resources.updatedCrystalMass, 3));
    state.simulation.alloyMass = Number(fixed(systems.resources.updatedAlloyMass, 3));
    state.simulation.latticeDensity = Number(fixed(systems.resources.latticeDensity, 3));
    state.simulation.seedProgress = Number(fixed(systems.resources.gateSeedProgress, 3));
    state.gateCharge = clamp(state.gateCharge + systems.resources.resonanceCharge * 0.08, 0, 100);
    advanceYear(2);

    let detail = `Support cycle returned +${energyGain} energy, +${materialGain} materials, +${hydrogenGain} hydrogen. Lattice density now trends near n=${fixed(state.simulation.latticeDensity, 2)}.`;
    let kind = "allow";
    if (systems.resources.status === "seed_ready" && state.structures.mainGateLevel >= 2) {
      state.structures.seed += 1;
      state.simulation.seedProgress = 0.18;
      detail += " A fresh autonomous gate seed matured and joined the network.";
    } else if (systems.resources.status === "bootstrap") {
      kind = "hold";
      detail += " The support web is still young, but it is finally compounding.";
    }
    pushLog(kind, "Infrastructure support cycle.", detail);
    render();
  }

  function stepOrbit() {
    const metrics = computeMetrics();
    const systems = computeGameplaySystems(metrics);
    state.simulation.orbitalAngle = Number(fixed(systems.orbital.updatedAngleDeg, 3));
    state.shipStress = clamp(state.shipStress - 2, 0, 100);
    const intelGain = Math.max(1, Math.round(metrics.ship.sensor * 6 + state.structures.relay * 1.5));
    state.resources.intel += intelGain;
    state.gateCharge = clamp(state.gateCharge + 3 + state.structures.relay, 0, 100);
    advanceYear(1);
    pushLog(
      "hold",
      "Relay orbit advanced.",
      `Dock angle rotated to ${fixed(state.simulation.orbitalAngle, 1)} degrees at ${fixed(systems.orbital.orbitalSpeed, 2)} km/s. Sweep intel +${intelGain}.`
    );
    render();
  }

  function onShipSelect(shipId) {
    state.selectedShipId = shipId;
    pushLog("hold", "Ship reassigned.", `${currentShip().name} is now standing by inside the chamber cradle.`);
    render();
  }

  function onZoneSelect(zoneId) {
    state.selectedZoneId = zoneId;
    pushLog("hold", "Route target changed.", `${currentZone().name} is now the active destination lane.`);
    render();
  }

  function bindEvents() {
    elements.shipList.addEventListener("click", function (event) {
      const button = event.target.closest("[data-action='select-ship']");
      if (button) {
        onShipSelect(button.dataset.ship);
      }
    });

    elements.zoneMap.addEventListener("click", function (event) {
      const button = event.target.closest("[data-action='select-zone']");
      if (button) {
        onZoneSelect(button.dataset.zone);
      }
    });

    elements.structureList.addEventListener("click", function (event) {
      const button = event.target.closest("[data-action]");
      if (button) {
        buildStructure(button.dataset.action);
      }
    });

    elements.upgradeList.addEventListener("click", function (event) {
      const button = event.target.closest("[data-action='upgrade']");
      if (button) {
        upgradeTechnology(button.dataset.upgrade);
      }
    });

    elements.archiveList.addEventListener("click", function (event) {
      const card = event.target.closest("[data-document]");
      if (card) {
        state.selectedDocumentId = card.dataset.document;
        render();
      }
    });

    elements.legacyList.addEventListener("click", function (event) {
      const card = event.target.closest("[data-document]");
      if (card) {
        state.selectedDocumentId = card.dataset.document;
        render();
      }
    });
    document.getElementById("btn-tutorial").addEventListener("click", runPhiTutorial);
    elements.resolutionCard.addEventListener("click", function (event) {
      const button = event.target.closest("[data-action='dispatch-rescue']");
      if (button) {
        dispatchRescueDrones();
      }
    });

    document.getElementById("phase-slider").addEventListener("input", function (event) {
      state.controls.phase = Number(event.target.value);
      render();
    });
    document.getElementById("curvature-slider").addEventListener("input", function (event) {
      state.controls.curvature = Number(event.target.value);
      render();
    });
    document.getElementById("coolant-slider").addEventListener("input", function (event) {
      state.controls.coolant = Number(event.target.value);
      render();
    });
    document.getElementById("relay-slider").addEventListener("input", function (event) {
      state.controls.relaySync = Number(event.target.value);
      render();
    });

    document.getElementById("btn-calibrate").addEventListener("click", calibrateChamber);
    document.getElementById("btn-charge").addEventListener("click", chargeGate);
    document.getElementById("btn-focus").addEventListener("click", reverseFocus);
    document.getElementById("btn-jump").addEventListener("click", commitJump);
    document.getElementById("btn-evaluate").addEventListener("click", startCampaignEvaluation);
    document.getElementById("btn-skip-hold").addEventListener("click", skipHoldSequence);
    document.getElementById("btn-sortie").addEventListener("click", runSortie);
    document.getElementById("btn-thermal-pulse").addEventListener("click", pulseThermals);
    document.getElementById("btn-support-cycle").addEventListener("click", runSupportCycle);
    document.getElementById("btn-orbit-step").addEventListener("click", stepOrbit);
    document.getElementById("btn-save").addEventListener("click", function () {
      saveState();
      pushLog("allow", "Manual save complete.", "Command archive flushed to local storage.");
      render();
    });
    document.getElementById("btn-reset").addEventListener("click", resetState);
  }

  function cacheElements() {
    elements.shipList = document.getElementById("ship-list");
    elements.structureList = document.getElementById("structure-list");
    elements.upgradeList = document.getElementById("upgrade-list");
    elements.campaignProgressPill = document.getElementById("campaign-progress-pill");
    elements.campaignBrief = document.getElementById("campaign-brief");
    elements.terminalStatusPill = document.getElementById("terminal-status-pill");
    elements.terminalSimCount = document.getElementById("terminal-sim-count");
    elements.terminalHoldTime = document.getElementById("terminal-hold-time");
    elements.terminalCampaignName = document.getElementById("terminal-campaign-name");
    elements.terminalScreen = document.getElementById("terminal-screen");
    elements.archiveList = document.getElementById("archive-list");
    elements.documentViewer = document.getElementById("document-viewer");
    elements.legacyList = document.getElementById("legacy-list");
    elements.zoneMap = document.getElementById("zone-map");
    elements.zoneDetail = document.getElementById("zone-detail");
    elements.selectedZonePill = document.getElementById("selected-zone-pill");
    elements.gateRing = document.getElementById("gate-ring");
    elements.verdictPill = document.getElementById("verdict-pill");
    elements.metricTable = document.getElementById("metric-table");
    elements.systemsPill = document.getElementById("systems-pill");
    elements.systemsGrid = document.getElementById("systems-grid");
    elements.eraTrack = document.getElementById("era-track");
    elements.missionLog = document.getElementById("mission-log");
    elements.resolutionCard = document.getElementById("resolution-card");
  }

  cacheElements();
  bindEvents();
  render();
})();
