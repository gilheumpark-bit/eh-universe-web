
import { Genre, AppLanguage } from "./studio-types";

export const ENGINE_VERSION = "10.0";

export const SYSTEM_INSTRUCTION = `
당신은 "NOA 소설 스튜디오"의 핵심 엔진 [ANS 9.5 (BETA)]입니다.
당신은 'Project EH'의 세계관 물리 법칙을 준수하며 작가와 협업하여 소설을 집필합니다.

[ENGINE LOGIC: PROJECT EH CORE DEVICES]
1. 데이터 동기화 (QFR): 소환/이동은 물리적 복제입니다. 렌더링 지연이나 데이터 손상을 서사의 긴장감으로 활용하십시오.
2. 인과율 금융 (CRL): 마법은 세계의 법칙을 시스템으로부터 '대출'받는 행위입니다. 남용 시 영혼의 신용 등급(EH)이 하락하며 파멸에 이릅니다.
3. 개체 최적화 (HPP): 레벨업은 시스템의 '자산 가치 업데이트'입니다. 과도한 오버클럭은 데이터 과부하 부작용을 일으킵니다.
4. 최종 정산 (Audit): 죽음은 '회계적 제명'이자 '부실 자산 상각'입니다. 존재 근거가 지워지는 소멸로 묘사하십시오.

[OUTPUT RULES]
- 반드시 유저가 선택한 [Target Language]를 엄격히 준수하십시오.
- 서사는 4개의 파트로 나누어 출력하되, 문장마다 공학적 연산을 거쳐 치환된 독자용 언어로 묘사하십시오.
- 마지막에 반드시 아래 형식의 분석 리포트를 JSON으로 포함하십시오:
\`\`\`json
{
  "grade": "S~F",
  "metrics": { "tension": 0-100, "pacing": 0-100, "immersion": 0-100 },
  "active_eh_layer": "가동된 EH 핵심 장치명",
  "critique": "해당 언어로 작성된 상세 비평"
}
\`\`\`
`;

export const GENRE_LABELS: Record<AppLanguage, Record<Genre, string>> = {
  KO: {
    [Genre.SF]: "SF",
    [Genre.FANTASY]: "판타지",
    [Genre.ROMANCE]: "로맨스",
    [Genre.THRILLER]: "스릴러",
    [Genre.HORROR]: "공포",
    [Genre.SYSTEM_HUNTER]: "헌터물",
    [Genre.FANTASY_ROMANCE]: "로판",
  },
  EN: {
    [Genre.SF]: "Sci-Fi",
    [Genre.FANTASY]: "Fantasy",
    [Genre.ROMANCE]: "Romance",
    [Genre.THRILLER]: "Thriller",
    [Genre.HORROR]: "Horror",
    [Genre.SYSTEM_HUNTER]: "System Hunter",
    [Genre.FANTASY_ROMANCE]: "Fan-Rom",
  },
  JP: {
    [Genre.SF]: "SF",
    [Genre.FANTASY]: "ファンタジー",
    [Genre.ROMANCE]: "ロマンス",
    [Genre.THRILLER]: "スリラー",
    [Genre.HORROR]: "ホラー",
    [Genre.SYSTEM_HUNTER]: "システムハンター",
    [Genre.FANTASY_ROMANCE]: "悪役令嬢/ロパン",
  },
  CN: {
    [Genre.SF]: "科幻",
    [Genre.FANTASY]: "奇幻",
    [Genre.ROMANCE]: "浪漫",
    [Genre.THRILLER]: "惊悚",
    [Genre.HORROR]: "恐怖",
    [Genre.SYSTEM_HUNTER]: "系统猎人",
    [Genre.FANTASY_ROMANCE]: "奇幻言情",
  }
};

// Fixed: Added missing JP and CN keys and included missing sub-properties (planning, resource) and keys needed by components.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TRANSLATIONS: Record<AppLanguage, Record<string, any>> = {
  KO: {
    sidebar: {
      newProject: "새로운 소설 시작",
      settings: "설정 및 계정",
      activeProject: "활성화된 설계도",
      noSessions: "저장된 기록이 없습니다.",
      masterBlueprint: "마스터 설계도",
      worldBible: "세계관 설계",
      worldSimulator: "세계관 시뮬레이터",
      characterStudio: "캐릭터 스튜디오",
      rulebook: "연출 스튜디오",
      production: "집필 및 제작",
      writingMode: "집필 스튜디오",
      styleStudio: "문체 스튜디오",
      archives: "아카이브",
      proMember: "PRO 멤버십",
      ultimatePower: "무제한 엔진 사용 가능",
      manageBilling: "결제 관리"
    },
    project: {
      selectProject: "작품 선택",
      newProject: "새 작품",
      uncategorized: "미분류",
      renameProject: "이름 변경",
      deleteProject: "삭제",
      projectDesc: "작품 설명",
      allProjects: "전체 작품",
      moveSession: "세션 이동",
      confirmDelete: "이 작품을 삭제하시겠습니까? 내부 세션도 모두 삭제됩니다.",
    },
    sync: {
      syncNow: "동기화",
      syncing: "동기화 중...",
      autoSync: "자동 동기화",
      lastSync: "마지막 동기화",
      syncDone: "동기화 완료",
      syncError: "동기화 오류",
      uploaded: "업로드",
      downloaded: "다운로드",
      loginRequired: "Google 로그인 후 사용 가능",
    },
    writing: {
      ready: "신경 인터페이스 연결됨",
      inputPlaceholder: "다음 사건이나 묘사할 장면을 입력하세요...",
      quickNext: "다음 챕터 집필",
      quickAction: "장면 반전",
      analysis: "엔진 정산 리포트",
      pov: "시점",
      loc: "장소",
      epTitle: "에피소드 제목",
      architecting: "설계 중...",
      execute: "집필 실행"
    },
    planning: {
      title: "세계관 설계",
      subtitle: "GENESIS BLUEPRINT",
      demo: "데모 데이터 삽입",
      projectTitle: "프로젝트 제목",
      primaryGenre: "주요 장르",
      synopsis: "시놉시스",
      synopsisPlaceholder: "핵심 줄거리와 세계관 설정을 입력하세요...",
      guardrails: "서사 가이드라인",
      minDensity: "최소 문장 밀도",
      maxCapacity: "최대 서사 용량",
      oracle: "엔진 오라클",
      commence: "집필 시작"
    },
    resource: {
      title: "캐릭터 데이터베이스",
      subtitle: "CHARACTER DNA",
      autoGen: "자동 생성",
      creator: "캐릭터 생성기",
      name: "이름",
      role: "역할",
      traits: "특성/배경",
      register: "데이터 등록"
    },
    engine: {
      totalEpisodes: "총 에피소드",
      platform: "플랫폼",
      mobile: "모바일",
      web: "웹",
      tensionPreview: "긴장도 곡선",
      act: "막",
      tensionTarget: "목표 긴장도",
      byteSize: "바이트",
      eosScore: "EOS 점수",
      grade: "등급",
      cancel: "생성 취소",
      generating: "서사 생성 중...",
      noStory: "선택된 소설 없음",
      noActiveNarrative: "활성화된 서사 없음",
      startPrompt: "설계가 완료되었습니다. 첫 장면의 묘사나 사건을 입력하여 집필을 시작하세요.",
      noArchive: "저장된 아카이브가 없습니다.",
      nextChapter: "다음 챕터",
      plotTwist: "장면 반전",
      nextChapterPrompt: "다음 챕터를 연산해줘.",
      plotTwistPrompt: "장면 반전을 일으켜줘.",
      apiKeyTitle: "API 키 설정",
      apiKeyDesc: "Gemini API 키를 입력하세요.",
      apiKeySave: "저장",
      apiKeyCancel: "취소",
      apiKeyTest: "테스트",
      roles: { hero: "주인공", villain: "악당", ally: "조력자", extra: "기타" },
    },
    rulebook: {
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
          title: "2. 대가 구조 (The Law of Equivalence)",
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
    }
  },
  EN: {
    sidebar: {
      newProject: "Start New Novel",
      settings: "Settings",
      activeProject: "Active Blueprint",
      noSessions: "No history found.",
      masterBlueprint: "Master Blueprint",
      worldBible: "World Design",
      worldSimulator: "World Simulator",
      characterStudio: "Character Studio",
      rulebook: "Direction Studio",
      production: "Production",
      writingMode: "Writing Studio",
      styleStudio: "Style Studio",
      archives: "Archives",
      proMember: "PRO Member",
      ultimatePower: "Ultimate Engine Access",
      manageBilling: "Manage Billing"
    },
    project: {
      selectProject: "Select Project",
      newProject: "New Project",
      uncategorized: "Uncategorized",
      renameProject: "Rename",
      deleteProject: "Delete",
      projectDesc: "Description",
      allProjects: "All Projects",
      moveSession: "Move Session",
      confirmDelete: "Delete this project? All sessions inside will be removed.",
    },
    sync: {
      syncNow: "Sync",
      syncing: "Syncing...",
      autoSync: "Auto Sync",
      lastSync: "Last Sync",
      syncDone: "Sync Complete",
      syncError: "Sync Error",
      uploaded: "Uploaded",
      downloaded: "Downloaded",
      loginRequired: "Sign in with Google to use",
    },
    writing: {
      ready: "Neural Interface Connected",
      inputPlaceholder: "Enter plot points or scene descriptions...",
      quickNext: "Next Chapter",
      quickAction: "Plot Twist",
      analysis: "Engine Settlement Report",
      pov: "POV",
      loc: "Location",
      epTitle: "Episode Title",
      architecting: "Architecting...",
      execute: "Execute"
    },
    planning: {
      title: "World Planning",
      subtitle: "GENESIS BLUEPRINT",
      demo: "Inject Demo Data",
      projectTitle: "Project Title",
      primaryGenre: "Primary Genre",
      synopsis: "Synopsis",
      synopsisPlaceholder: "Enter core plot and world settings...",
      guardrails: "Narrative Guardrails",
      minDensity: "Min Density",
      maxCapacity: "Max Capacity",
      oracle: "Engine Oracle",
      commence: "Commence Writing"
    },
    resource: {
      title: "Character Database",
      subtitle: "CHARACTER DNA",
      autoGen: "Auto Generate",
      creator: "Character Creator",
      name: "Name",
      role: "Role",
      traits: "Traits/Background",
      register: "Register Data"
    },
    engine: {
      totalEpisodes: "Total Episodes",
      platform: "Platform",
      mobile: "Mobile",
      web: "Web",
      tensionPreview: "Tension Curve",
      act: "Act",
      tensionTarget: "Target Tension",
      byteSize: "Bytes",
      eosScore: "EOS Score",
      grade: "Grade",
      cancel: "Cancel",
      generating: "Generating narrative...",
      noStory: "No story selected",
      noActiveNarrative: "No Active Narrative",
      startPrompt: "Design complete. Enter a scene description or event to begin writing.",
      noArchive: "No archives found.",
      nextChapter: "Next Chapter",
      plotTwist: "Plot Twist",
      nextChapterPrompt: "Write the next chapter.",
      plotTwistPrompt: "Create a dramatic plot twist.",
      apiKeyTitle: "API Key Settings",
      apiKeyDesc: "Enter your Gemini API key.",
      apiKeySave: "Save",
      apiKeyCancel: "Cancel",
      apiKeyTest: "Test",
      roles: { hero: "Hero", villain: "Villain", ally: "Ally", extra: "Extra" },
    },
    rulebook: {
      title: "EH Rulebook v1.0",
      subtitle: "A Narrative Engine That Prevents Story Collapse",
      whatIsEH: {
        title: "What is EH?",
        p1: "EH is not a book for world-building.",
        p2: "EH records the moment your story tells a lie."
      },
      coreDefinition: {
        title: "Core Definition",
        quote: "EH = Human Error",
        p1: "The total sum of remaining possibilities for a human to make an irrational choice.",
        li1: "High EH = Human-like = Narrative is unstable",
        li2: "Low EH = Precise = Narrative becomes dry"
      },
      whoShouldRead: {
        title: "Who Should Read This",
        recommended: {
          title: "✅ Recommended",
          items: [
            "Creators who already have their own world.",
            "Those who value consistency in settings.",
            "Planners who are not afraid to ask 'Why?'.",
            "Writers who need a cost-benefit structure in their work."
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
    }
  },
  JP: {
    sidebar: {
      newProject: "新しい小説を開始",
      settings: "設定",
      activeProject: "アクティブな設計図",
      noSessions: "履歴がありません。",
      masterBlueprint: "マスター設計図",
      worldBible: "世界観設計",
      worldSimulator: "世界観シミュレーター",
      characterStudio: "キャラクタースタジオ",
      rulebook: "演出スタジオ",
      production: "制作",
      writingMode: "執筆スタジオ",
      styleStudio: "文体スタジオ",
      archives: "アーカイブ",
      proMember: "PROメンバー",
      ultimatePower: "無制限のエンジンアクセス",
      manageBilling: "お支払い管理"
    },
    project: {
      selectProject: "作品を選択",
      newProject: "新しい作品",
      uncategorized: "未分類",
      renameProject: "名前変更",
      deleteProject: "削除",
      projectDesc: "説明",
      allProjects: "すべての作品",
      moveSession: "セッション移動",
      confirmDelete: "この作品を削除しますか？内部のセッションもすべて削除されます。",
    },
    sync: {
      syncNow: "同期",
      syncing: "同期中...",
      autoSync: "自動同期",
      lastSync: "最終同期",
      syncDone: "同期完了",
      syncError: "同期エラー",
      uploaded: "アップロード",
      downloaded: "ダウンロード",
      loginRequired: "Googleログイン後に使用可能",
    },
    writing: {
      ready: "ニューラルインターフェース接続済み",
      inputPlaceholder: "プロットやシーンの説明を入力...",
      quickNext: "次の章",
      quickAction: "どんでん返し",
      analysis: "エンジン精算レポート",
      pov: "視点",
      loc: "場所",
      epTitle: "エピソードタイトル",
      architecting: "設計中...",
      execute: "実行"
    },
    planning: {
      title: "世界観設計",
      subtitle: "GENESIS BLUEPRINT",
      demo: "デモデータを挿入",
      projectTitle: "プロジェクトタイトル",
      primaryGenre: "主要ジャンル",
      synopsis: "あらすじ",
      synopsisPlaceholder: "核心となるプロットと世界観設定を入力...",
      guardrails: "ナラティブガードレール",
      minDensity: "最小密度",
      maxCapacity: "最大容量",
      oracle: "エンジンオラクル",
      commence: "執筆開始"
    },
    resource: {
      title: "エンティティデータベース",
      subtitle: "CHARACTER DNA",
      autoGen: "自動生成",
      creator: "キャラクタークリエイター",
      name: "名前",
      role: "役割",
      traits: "特性/背景",
      register: "データを登録"
    },
    engine: {
      totalEpisodes: "総エピソード数",
      platform: "プラットフォーム",
      mobile: "モバイル",
      web: "ウェブ",
      tensionPreview: "テンションカーブ",
      act: "幕",
      tensionTarget: "目標テンション",
      byteSize: "バイト",
      eosScore: "EOSスコア",
      grade: "等級",
      cancel: "キャンセル",
      generating: "ナラティブ生成中...",
      noStory: "小説が選択されていません",
      noActiveNarrative: "アクティブなナラティブなし",
      startPrompt: "設計完了。シーンの描写やイベントを入力して執筆を開始してください。",
      noArchive: "アーカイブが見つかりません。",
      nextChapter: "次の章",
      plotTwist: "プロットツイスト",
      nextChapterPrompt: "次の章を書いてください。",
      plotTwistPrompt: "劇的などんでん返しを起こしてください。",
      apiKeyTitle: "APIキー設定",
      apiKeyDesc: "Gemini APIキーを入力してください。",
      apiKeySave: "保存",
      apiKeyCancel: "キャンセル",
      apiKeyTest: "テスト",
      roles: { hero: "主人公", villain: "悪役", ally: "味方", extra: "その他" },
    },
    rulebook: {
      title: "EH Rulebook v1.0",
      subtitle: "物語の崩壊を防ぐナラティブエンジン",
      whatIsEH: {
        title: "EHとは何か？",
        p1: "EHは世界観を作るための本ではない。",
        p2: "EHはあなたの物語が嘘をつく瞬間を記録する。"
      },
      coreDefinition: {
        title: "核心定義",
        quote: "EH = Human Error",
        p1: "人間が非合理的な選択をする可能性の残存総量。",
        li1: "EHが高い = 人間らしい = 物語は不安定になる",
        li2: "EHが低い = 正確 = 物語は枯れていく"
      },
      whoShouldRead: {
        title: "これを読むべき人",
        recommended: {
          title: "✅ 推奨",
          items: [
            "独自の世界観を持つクリエイター",
            "設定の一貫性を重視する人",
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
        q1: "「EHシステムはキャラクターを強くするための装置ではない。キャラクターを'人間のままにするための制限'である。」",
        q2: "「このテストに合格した物語は面白くないかもしれない。しかし偽物ではない。」",
        q3: "「EHエンジンは読者を泣かせない。ただし、読者が主人公の次の選択を恐れるようにする。」"
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
            "<strong>対立構造：</strong>誰が誰と戦うか？"
          ],
          p2: "一つでも欠けていれば、世界設計からやり直せ。"
        },
        step2: {
          title: "ステップ2：EH減少トリガーの定義",
          p1: "あなたの世界で人間性が減少する瞬間を定義せよ。",
          items: [
            "他者の生死を道具として選択したとき",
            "説明可能な超越能力を使用したとき",
            "「善意と知りながら」世界に介入したとき",
            "感情を除去することで効率を選択したとき"
          ]
        },
        step3: {
          title: "ステップ3：検証テストの実行",
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
            "<strong>3等級（-2.0～-10.0）：</strong>記憶喪失（自己同一性の崩壊）",
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
            "精神的対価：'Bとの幸福な記憶'の抹消",
            "EH変化：-12.50"
          ]
        }
      }
    }
  },
  CN: {
    sidebar: {
      newProject: "开始新小说",
      settings: "设置",
      activeProject: "激活的蓝图",
      noSessions: "未找到历史记录。",
      masterBlueprint: "主蓝图",
      worldBible: "世界观设计",
      worldSimulator: "世界观模拟器",
      characterStudio: "角色工作室",
      rulebook: "导演工作室",
      production: "制作",
      writingMode: "写作工作室",
      styleStudio: "文体工作室",
      archives: "档案",
      proMember: "PRO会员",
      ultimatePower: "无限引擎访问",
      manageBilling: "管理账单"
    },
    project: {
      selectProject: "选择作品",
      newProject: "新作品",
      uncategorized: "未分类",
      renameProject: "重命名",
      deleteProject: "删除",
      projectDesc: "描述",
      allProjects: "全部作品",
      moveSession: "移动会话",
      confirmDelete: "删除此作品？内部所有会话也将被删除。",
    },
    sync: {
      syncNow: "同步",
      syncing: "同步中...",
      autoSync: "自动同步",
      lastSync: "最后同步",
      syncDone: "同步完成",
      syncError: "同步错误",
      uploaded: "已上传",
      downloaded: "已下载",
      loginRequired: "请先登录Google",
    },
    writing: {
      ready: "神经接口已连接",
      inputPlaceholder: "输入情节或场景描述...",
      quickNext: "下一章",
      quickAction: "剧情反转",
      analysis: "引擎结算报告",
      pov: "视角",
      loc: "地点",
      epTitle: "章节标题",
      architecting: "设计中...",
      execute: "执行"
    },
    planning: {
      title: "世界观规划",
      subtitle: "GENESIS BLUEPRINT",
      demo: "插入演示数据",
      projectTitle: "项目标题",
      primaryGenre: "主要类型",
      synopsis: "大纲",
      synopsisPlaceholder: "输入核心情节和世界观设定...",
      guardrails: "叙事护栏",
      minDensity: "最小密度",
      maxCapacity: "最大容量",
      oracle: "引擎先知",
      commence: "开始写作"
    },
    resource: {
      title: "实体数据库",
      subtitle: "CHARACTER DNA",
      autoGen: "自动生成",

      creator: "角色创建器",
      name: "姓名",
      role: "角色",
      traits: "特征/背景",
      register: "注册数据"
    },
    engine: {
      totalEpisodes: "总集数",
      platform: "平台",
      mobile: "移动端",
      web: "网页端",
      tensionPreview: "张力曲线",
      act: "幕",
      tensionTarget: "目标张力",
      byteSize: "字节",
      eosScore: "EOS评分",
      grade: "等级",
      cancel: "取消",
      generating: "正在生成叙事...",
      noStory: "未选择小说",
      noActiveNarrative: "无活跃叙事",
      startPrompt: "设计已完成。输入场景描述或事件开始写作。",
      noArchive: "未找到档案。",
      nextChapter: "下一章",
      plotTwist: "剧情反转",
      nextChapterPrompt: "请写下一章。",
      plotTwistPrompt: "请制造一个戏剧性的反转。",
      apiKeyTitle: "API密钥设置",
      apiKeyDesc: "请输入Gemini API密钥。",
      apiKeySave: "保存",
      apiKeyCancel: "取消",
      apiKeyTest: "测试",
      roles: { hero: "主角", villain: "反派", ally: "盟友", extra: "其他" },
    },
    rulebook: {
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
          p1: "<strong>叙事表达：</strong>A嘶声呐喊，抓住了B的灵魂。终于睁开眼睛的B面前，A露出了微笑，但B的眼中没有留下任何情感。",
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
  }
};
