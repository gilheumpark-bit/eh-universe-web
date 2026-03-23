import { AppLanguage } from "./studio-types";

export const RULEBOOK_DATA: Record<AppLanguage, any> = {
  KO: {
    title: "EH Rulebook v1.0",
    subtitle: "A Narrative Engine That Prevents Story Collapse",
    whatIsEH: {
      title: "What is EH?",
      p1: "EH는 세계관을 만들어주는 책이 아니다.",
      p2: "EH는 당신의 이야기가 거짓말을 하는 순간을 기록한다."
    },
    coreDefinition: {
      title: "핵심 정의",
      quote: "EH = Human Error",
      p1: "인간이 비합리적 선택을 할 수 있는 잔여 가능성의 총량.",
      li1: "EH가 높다 = 인간답다 = 서사는 불안정하다",
      li2: "EH가 낮다 = 정확하다 = 서사는 메말라간다"
    },
    whoShouldRead: {
      title: "이것을 읽어야 하는 사람",
      recommended: {
        title: "✅ 추천",
        items: [
          "자신의 세계관을 이미 가진 창작자",
          "설정의 일관성이 중요한 사람",
          "\"왜?\"라는 질문을 마다하지 않는 기획자",
          "대가 구조가 필요한 작품을 쓰는 사람"
        ]
      },
      notRecommended: {
        title: "❌ 비추천",
        items: [
          "가벼운 이야기를 빠르게 쓰고 싶은 사람",
          "세계관 없이 캐릭터부터 시작하는 사람",
          "설명을 거부하는 설정을 선호하는 사람",
          "무한 치트를 원하는 사람"
        ]
      }
    },
    quickStart: {
      title: "Quick Start: 핵심 원칙 3가지",
      nonIntervention: {
        title: "1. 비개입 원칙 (Non-Intervention Protocol)",
        p1: "상위 존재는 직접 개입하지 않는다.",
        p2: "<strong>허용:</strong> 관찰, 유도, 조건 설계<br/><strong>금지:</strong> 대가 없는 구원, 설명 없는 부활, 감정적 개입"
      },
      equivalence: {
        title: "2. 등가 법칙 (The Law of Equivalence)",
        p1: "모든 결과에는 반드시 상응하는 상실이 따른다.",
        listTitle: "<strong>대가의 종류:</strong>",
        items: [
          "감각 손실",
          "기억 손실",
          "관계 붕괴",
          "시간 감소",
          "EH 수치 하락"
        ]
      },
      explainability: {
        title: "3. 설명 가능성 원칙 (Principle of Explainability)",
        p1: "모든 현상은 설명 가능해야 한다.",
        p2: "<strong>금지어:</strong> 기적 / 운명 / 그냥 / 원래 그런 설정 / 갑자기"
      }
    },
    coreSentences: {
      title: "룰북의 핵심 문장 3개",
      q1: "\"EH 시스템은 캐릭터를 강하게 만들기 위한 장치가 아니다. 캐릭터를 '인간으로 남게 하기 위한 제한'이다.\"",
      q2: "\"이 테스트를 통과한 이야기는 재미있지 않을 수도 있다. 그러나 가짜는 아니다.\"",
      q3: "\"EH 엔진은 독자를 울리지 않는다. 다만, 독자가 주인공의 다음 선택을 두려워하게 만든다.\""
    },
    howToUse: {
      title: "사용 방법",
      step1: {
        title: "Step 1: 세계 설계 검증",
        p1: "다음 4가지를 명확히 정의하라.",
        items: [
          "<strong>통치 구조:</strong> 누가 규칙을 정하는가?",
          "<strong>물리 법칙:</strong> 법칙의 한계는 무엇인가?",
          "<strong>생명 구조:</strong> 죽음이란 무엇인가?",
          "<strong>갈등 구조:</strong> 누가 누구와 싸우는가?"
        ],
        p2: "하나라도 없으면 세계 설계부터 시작하라."
      },
      step2: {
        title: "Step 2: EH 감소 트리거 정의",
        p1: "당신의 세계에서 인간성이 감소하는 순간을 정의하라.",
        items: [
          "타인의 생사를 도구로 선택했을 때",
          "설명 가능한 초월 능력을 사용했을 때",
          "\"선의임을 알면서도\" 세계에 개입했을 때",
          "감정을 제거함으로써 효율을 택했을 때"
        ]
      },
      step3: {
        title: "Step 3: 검증 테스트 실행",
        p1: "Author Compliance Test 14개 문항으로 당신의 서사를 검증하라."
      }
    },
    keyConcepts: {
      title: "주요 개념",
      worldStability: {
        title: "세계 안정도 (World Stability)",
        p1: "세계가 자신을 설명할 수 있는 잔여 내구도. 임계치 도달 시 System Crash 발생."
      },
      ehTiers: {
        title: "EH 감소 등급",
        items: [
          "<strong>1등급 (-0.1 ~ -0.5):</strong> 감각 손실 (일상의 기쁨 소멸)",
          "<strong>2등급 (-0.5 ~ -2.0):</strong> 정서 손실 (타인 수단화)",
          "<strong>3등급 (-2.0 ~ -10.0):</strong> 기억 손실 (자기 정체성 붕괴)",
          "<strong>4등급 (&30):</strong> 구조 손실 (주인공 자리 상실)"
        ]
      },
      logFormat: {
        title: "로그 기록 (Standard Log Format)",
        p1: "서사는 감정이 아니라 데이터 구조로 기록된다."
      }
    },
    example: {
      title: "실제 사용 예시",
      scenario: {
        title: "샘플 시나리오: \"희생된 동료의 부활\"",
        p1: "<strong>서사적 표현:</strong> A는 절규하며 B의 영혼을 붙잡았다. 마침내 눈을 뜬 B를 보며 A는 미소 지었지만, B의 눈에는 아무런 감정도 남아있지 않았다.",
        p2: "<strong>EH 엔진 로그:</strong>",
        items: [
          "[EVENT_ID: 20251230-01]",
          "유형: 개입 이벤트",
          "개체: A (EH: 74.20) → A (EH: 61.70)",
          "행위: 비개입 프로토콜 위반",
          "물리적 대가: 우측 팔 신경망 영구 손실",
          "정서적 대가: 'B와의 행복한 기억' 말소",
          "EH 변화: -12.50"
        ]
      }
    }
  },
  EN: {
    title: "EH Rulebook v1.0",
    subtitle: "A Narrative Engine That Prevents Story Collapse",
    whatIsEH: {
      title: "What is EH?",
      p1: "EH is not a book for building worldviews.",
      p2: "EH records the moment your story tells a lie."
    },
    coreDefinition: {
      title: "Core Definition",
      quote: "EH = Human Error",
      p1: "The total remaining probability of humans making irrational choices.",
      li1: "High EH = Human-like = Narrative is unstable",
      li2: "Low EH = Accurate = Narrative becomes dry"
    },
    whoShouldRead: {
      title: "Who Should Read This",
      recommended: {
        title: "✅ Recommended",
        items: [
          "Creators who already have their own world.",
          "Those who value consistency in settings.",
          "Planners who do not shy away from asking \"Why?\"",
          "Those writing works requiring a cost structure."
        ]
      },
      notRecommended: {
        title: "❌ Not Recommended",
        items: [
          "Those who want to write light stories quickly.",
          "Those who start with characters without a world.",
          "Those who prefer settings that defy explanation.",
          "Those who want infinite cheats."
        ]
      }
    },
    quickStart: {
      title: "Quick Start: 3 Core Principles",
      nonIntervention: {
        title: "1. Non-Intervention Protocol",
        p1: "Higher beings do not intervene directly.",
        p2: "<strong>Allowed:</strong> Observation, guidance, conditional design.<br/><strong>Forbidden:</strong> Salvation without cost, revival without explanation, emotional intervention."
      },
      equivalence: {
        title: "2. The Law of Equivalence",
        p1: "Every result must be accompanied by an equivalent loss.",
        listTitle: "<strong>Types of Cost:</strong>",
        items: [
          "Loss of senses",
          "Memory loss",
          "Relationship collapse",
          "Time reduction",
          "Decrease in EH value"
        ]
      },
      explainability: {
        title: "3. Principle of Explainability",
        p1: "All phenomena must be explainable.",
        p2: "<strong>Forbidden Words:</strong> Miracle / Fate / Just because / That's the setting / Suddenly"
      }
    },
    coreSentences: {
      title: "3 Core Sentences of the Rulebook",
      q1: "\"The EH system is not a device to make characters stronger. It is a 'limitation to keep characters human'.\"",
      q2: "\"A story that passes this test may not be fun. But it will not be fake.\"",
      q3: "\"The EH engine does not make readers cry. However, it makes the reader fear the protagonist's next choice.\""
    },
    howToUse: {
      title: "How to Use",
      step1: {
        title: "Step 1: World Design Verification",
        p1: "Clearly define the following four elements.",
        items: [
          "<strong>Governance Structure:</strong> Who sets the rules?",
          "<strong>Physical Laws:</strong> What are the limits of the laws?",
          "<strong>Life Structure:</strong> What is death?",
          "<strong>Conflict Structure:</strong> Who fights whom?"
        ],
        p2: "If even one is missing, start with world design."
      },
      step2: {
        title: "Step 2: Define EH Reduction Triggers",
        p1: "Define the moments when humanity diminishes in your world.",
        items: [
          "When choosing another's life or death as a tool.",
          "When using explainable transcendent abilities.",
          "When intervening in the world 'knowing it is for good'.",
          "When choosing efficiency by removing emotions."
        ]
      },
      step3: {
        title: "Step 3: Run Verification Test",
        p1: "Verify your narrative with the 14-item Author Compliance Test."
      }
    },
    keyConcepts: {
      title: "Key Concepts",
      worldStability: {
        title: "World Stability",
        p1: "The remaining durability for the world to explain itself. A System Crash occurs when the threshold is reached."
      },
      ehTiers: {
        title: "EH Reduction Tiers",
        items: [
          "<strong>Tier 1 (-0.1 ~ -0.5):</strong> Sensory Loss (Disappearance of daily joy)",
          "<strong>Tier 2 (-0.5 ~ -2.0):</strong> Emotional Loss (Objectification of others)",
          "<strong>Tier 3 (-2.0 ~ -10.0):</strong> Memory Loss (Collapse of self-identity)",
          "<strong>Tier 4 (&30):</strong> Structural Loss (Loss of the protagonist's position)"
        ]
      },
      logFormat: {
        title: "Standard Log Format",
        p1: "Narrative is recorded as data structures, not emotions."
      }
    },
    example: {
      title: "Actual Usage Example",
      scenario: {
        title: "Sample Scenario: \"Resurrection of a Sacrificed Comrade\"",
        p1: "<strong>Narrative Expression:</strong> A screamed, clutching B's soul. When B finally opened their eyes, A smiled, but B's eyes were devoid of any emotion.",
        p2: "<strong>EH Engine Log:</strong>",
        items: [
          "[EVENT_ID: 20251230-01]",
          "Type: Intervention Event",
          "Entity: A (EH: 74.20) → A (EH: 61.70)",
          "Action: Violation of Non-Intervention Protocol",
          "Physical Cost: Permanent nerve damage to the right arm",
          "Emotional Cost: Erasure of 'happy memories with B'",
          "EH Change: -12.50"
        ]
      }
    }
  },
  JP: {
    title: "EH Rulebook v1.0",
    subtitle: "物語の崩壊を防ぐナラティブエンジン",
    whatIsEH: {
      title: "EHとは何か？",
      p1: "EHは世界観を作るための본ではない。",
      p2: "EHはあなたの物語が嘘をつく瞬間を記録する。"
    },
    coreDefinition: {
      title: "核心定義",
      quote: "EH = Human Error",
      p1: "人間が非合理的な選択をする可能性의 잔존총량。",
      li1: "EHが高い = 人間らしい = 物語は不安定になる",
      li2: "EHが低い = 正確 = 物語は枯れていく"
    },
    whoShouldRead: {
      title: "これを読むべき人",
      recommended: {
        title: "✅ 推奨",
        items: [
          "独自の世界観を持つクリエイ터",
          "設定の一貫性が重要な人",
          "「なぜ？」という問いを厭わない企画者",
          "代価構造が必要な作品を書く人"
        ]
      },
      notRecommended: {
        title: "❌ 非推奨",
        items: [
          "軽い物語を素早く書きたい人",
          "世界観なしにキャラクターから始める人",
          "説明を拒否する設定を好む人",
          "無限チートを望む人"
        ]
      }
    },
    quickStart: {
      title: "クイックスタート：3つの核心原則",
      nonIntervention: {
        title: "1. 不介入原則（Non-Intervention Protocol）",
        p1: "上位存在は直接介入しない。",
        p2: "<strong>許可：</strong>観察、誘導、条件設計<br/><strong>禁止：</strong>対価なき救済、説明なき復活、感情的介入"
      },
      equivalence: {
        title: "2. 等価構造（The Law of Equivalence）",
        p1: "すべての結果には必ず相応の喪失が伴う。",
        listTitle: "<strong>対価の種類：</strong>",
        items: [
          "感覚喪失",
          "記憶喪失",
          "関係崩壊",
          "時間減少",
          "EH数値の低下"
        ]
      },
      explainability: {
        title: "3. 説明可能性原則（Principle of Explainability）",
        p1: "すべての現象は説明可能でなければならない。",
        p2: "<strong>禁止語：</strong>奇跡 / 運命 / なんとなく / 元々そういう設定 / 突然"
      }
    },
    coreSentences: {
      title: "ルールブックの核心文3つ",
      q1: "「EH시스템은 캐릭터를 강하게 만들기 위한 장치가 아니다. 캐릭터를 '인간으로 남게 하기 위한 제한'이다.」",
      q2: "「이 테스트를 통과한 이야기는 재미있지 않을 수도 있다. 그러나 가짜는 아니다.」",
      q3: "「EH엔진은 독자를 울리지 않는다. 다만, 독자가 주인공의 다음 선택을 두려워하게 만든다.」"
    },
    howToUse: {
      title: "使用方法",
      step1: {
        title: "ステップ1：世界設計の検証",
        p1: "以下の4つを明確に定義せよ。",
        items: [
          "<strong>統治構造：</strong>誰がルールを定めるか？",
          "<strong>物理法則：</strong>法則の限界は何か？",
          "<strong>生命構造：</strong>死とは何か？",
          "<strong>対립 구조:</strong> 누구가 누구와 싸우는가?"
        ],
        p2: "一つでも欠けていれば、世界設計からやり直せ。"
      },
      step2: {
        title: "ステップ2：EH減少トリガーの定義",
        p1: "あなたの世界で人間性が減少する瞬間を定義せよ。",
        items: [
          "他者の生死を道具として選択したとき",
          "説明可能な超越能力を使用したとき",
          "「선의임을 알면서도」 세계에 개입했을 때",
          "感情を除去することで効率を選択したとき"
        ]
      },
      step3: {
        title: "ステップ3：検証テスト의 실행",
        p1: "Author Compliance Test 14項目であなたの物語を検証せよ。"
      }
    },
    keyConcepts: {
      title: "主要概念",
      worldStability: {
        title: "世界安定度（World Stability）",
        p1: "世界が自らを説明できる残存耐久度。臨界値到達時にSystem Crashが発生する。"
      },
      ehTiers: {
        title: "EH減少等級",
        items: [
          "<strong>1等級（-0.1～-0.5）：</strong>感覚喪失（日常の喜びの消滅）",
          "<strong>2等級（-0.5～-2.0）：</strong>情緒喪失（他者の手段化）",
          "<strong>3等級（-2.0～-10.0）：</strong>記憶喪실（자기 동일성의 붕괴）",
          "<strong>4等級（&30）：</strong>構造喪失（主人公の座の喪失）"
        ]
      },
      logFormat: {
        title: "ログ記録（Standard Log Format）",
        p1: "物語は感情ではなくデータ構造として記録される。"
      }
    },
    example: {
      title: "実際の使用例",
      scenario: {
        title: "サンプルシナリオ：「犠牲になった仲間の復活」",
        p1: "<strong>叙事的表現：</strong>Aは絶叫し、Bの魂を掴んだ。ついに目を開けたBを見てAは微笑んだが、Bの目にはいかなる感情も残っていなかった。",
        p2: "<strong>EHエンジンログ：</strong>",
        items: [
          "[EVENT_ID: 20251230-01]",
          "種別：介入イベント",
          "個体：A（EH: 74.20）→ A（EH: 61.70）",
          "行為：不介入プロトコル違反",
          "物理的対価：右腕神経網の永久喪失",
          "精神的対価：'B과의 행복한 기억'의抹消",
          "EH変化：-12.50"
        ]
      }
    }
  },
  CN: {
    title: "EH Rulebook v1.0",
    subtitle: "防止故事崩溃的叙事引擎",
    whatIsEH: {
      title: "什么是EH？",
      p1: "EH不是一本用来构建世界观的书。",
      p2: "EH记录你的故事说谎的那一刻。"
    },
    coreDefinition: {
      title: "核心定义",
      quote: "EH = Human Error",
      p1: "人类做出非理性选择的剩余可能性总量。",
      li1: "EH高 = 人性化 = 叙事不稳定",
      li2: "EH低 = 精确 = 叙事变得枯燥"
    },
    whoShouldRead: {
      title: "谁应该读这本书",
      recommended: {
        title: "✅ 推荐",
        items: [
          "已有自己世界观的创作者",
          "重视设定一致性的人",
          "不畏惧提出「为什么？」的策划者",
          "需要代价结构的作品创作者"
        ]
      },
      notRecommended: {
        title: "❌ 不推荐",
        items: [
          "想快速写轻松故事的人",
          "没有世界观就从角色开始的人",
          "喜欢无需解释的设定的人",
          "想要无限外挂的人"
        ]
      }
    },
    quickStart: {
      title: "快速入门：3个核心原则",
      nonIntervention: {
        title: "1. 不干预原则（Non-Intervention Protocol）",
        p1: "上位存在不直接干预。",
        p2: "<strong>允许：</strong>观察、引导、条件设计<br/><strong>禁止：</strong>无代价的救赎、无解释的复活、情感干预"
      },
      equivalence: {
        title: "2. 等价结构（The Law of Equivalence）",
        p1: "所有结果必须伴随相应的失去。",
        listTitle: "<strong>代价类型：</strong>",
        items: [
          "感官丧失",
          "记忆丧失",
          "关系崩溃",
          "时间减少",
          "EH数值下降"
        ]
      },
      explainability: {
        title: "3. 可解释性原则（Principle of Explainability）",
        p1: "所有现象必须可以解释。",
        p2: "<strong>禁止词：</strong>奇迹 / 命运 / 就是这样 / 本来就是这个设定 / 突然"
      }
    },
    coreSentences: {
      title: "规则手册的3个核心语句",
      q1: "「EH系统不是让角色变强的装置。它是'让角色保持人性的限制'。」",
      q2: "「通过这个测试的故事可能不有趣。但它不会是假的。」",
      q3: "「EH引擎不会让读者哭泣。但它会让读者恐惧主角的下一个选择。」"
    },
    howToUse: {
      title: "使用方法",
      step1: {
        title: "步骤1：世界设计验证",
        p1: "明确定义以下4项。",
        items: [
          "<strong>统治结构：</strong>谁制定规则？",
          "<strong>物理法则：</strong>法则的极限是什么？",
          "<strong>生命结构：</strong>死亡是什么？",
          "<strong>冲突结构：</strong>谁与谁战斗？"
        ],
        p2: "如果缺少任何一项，从世界设计重新开始。"
      },
      step2: {
        title: "步骤2：定义EH减少触发器",
        p1: "定义你的世界中人性减少的时刻。",
        items: [
          "将他人的生死作为工具来选择时",
          "使用可解释的超越能力时",
          "「明知是善意」仍干预世界时",
          "通过消除情感来选择效率时"
        ]
      },
      step3: {
        title: "步骤3：运行验证测试",
        p1: "用Author Compliance Test 14个问题验证你的叙事。"
      }
    },
    keyConcepts: {
      title: "主要概念",
      worldStability: {
        title: "世界稳定度（World Stability）",
        p1: "世界能够解释自身的剩余耐久度。达到临界值时发生System Crash。"
      },
      ehTiers: {
        title: "EH减少等级",
        items: [
          "<strong>1级（-0.1～-0.5）：</strong>感官丧失（日常快乐的消失）",
          "<strong>2级（-0.5～-2.0）：</strong>情感丧失（将他人工具化）",
          "<strong>3级（-2.0～-10.0）：</strong>记忆丧失（自我认同崩溃）",
          "<strong>4级（&30）：</strong>结构丧失（失去主角地位）"
        ]
      },
      logFormat: {
        title: "日志记录（Standard Log Format）",
        p1: "叙事以数据结构而非情感来记录。"
      }
    },
    example: {
      title: "实际使用示例",
      scenario: {
        title: "示例场景：「牺牲同伴的复活」",
        p1: "<strong>叙事表达：</strong>A嘶声呐喊，抓住了B的灵魂。终于睁开眼睛의 B面前，A露出了微笑，但B의眼中没有留下任何情感。",
        p2: "<strong>EH引擎日志：</strong>",
        items: [
          "[EVENT_ID: 20251230-01]",
          "类型：干预事件",
          "个体：A（EH: 74.20）→ A（EH: 61.70）",
          "行为：违反不干预协议",
          "物理代价：右臂神经网络永久丧失",
          "精神代价：'与B的幸福记忆'被抹除",
          "EH变化：-12.50"
        ]
      }
    }
  }
};
