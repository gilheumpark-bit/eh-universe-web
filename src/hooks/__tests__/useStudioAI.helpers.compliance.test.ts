import { Genre, type StoryConfig } from "@/lib/studio-types";
import { buildComplianceGatePatch } from "../useStudioAI.helpers";

function baseConfig(overrides: Partial<StoryConfig> = {}): StoryConfig {
  return {
    genre: Genre.SYSTEM_HUNTER,
    povCharacter: "",
    setting: "",
    primaryEmotion: "",
    episode: 1,
    title: "테스트 작품",
    totalEpisodes: 12,
    guardrails: { min: 5500, max: 7000 },
    characters: [],
    platform: "webnovel",
    ...overrides,
  } as StoryConfig;
}

describe("buildComplianceGatePatch", () => {
  it("본문 안 작업 메타와 낮은 기준선 점수를 품질 게이트 사유로 올린다", () => {
    const patch = buildComplianceGatePatch(
      baseConfig(),
      "[컨텍스트]\n다음 화에 밝힐 내용을 여기에 쓴다.",
      "KO",
    );

    expect(patch.shouldRetry).toBe(true);
    expect(patch.failReasons.join(" / ")).toContain("compliance_below");
    expect(patch.failReasons.join(" / ")).toContain("compliance_review");
    expect(patch.retryHint).toContain("기준선 보정 지시");
    expect(patch.report.checks.some((check) => check.id === "forbidden-disclosure")).toBe(true);
  });

  it("충분한 기준선과 본문이 맞물리면 추가 재시도 사유를 만들지 않는다", () => {
    const patch = buildComplianceGatePatch(
      baseConfig({
        corePremise: "도시 한복판에 탑이 솟아오른 세계",
        powerStructure: "협회가 각성자를 관리한다",
        currentConflict: "주인공은 협회 기록 조작을 추적한다",
        synopsis: "강민우가 첫 균열의 진실을 파헤친다",
        characters: [{
          id: "char-1",
          name: "강민우",
          role: "주인공",
          traits: "침착함",
          appearance: "검은 코트",
          dna: 80,
          speechStyle: "짧게 끊어 말함",
        }],
        items: [{
          id: "black-blade",
          name: "흑검",
          category: "weapon",
          rarity: "rare",
          description: "균열을 자르는 검",
          effect: "방어막 절단",
          obtainedFrom: "첫 균열",
          owner: "강민우",
        }],
        sceneDirection: {
          activeCharacters: ["강민우"],
          activeItems: ["black-blade"],
          hooks: [{ position: "opening", hookType: "mystery", desc: "기록 누락" }],
          emotionTargets: [{ emotion: "긴장", intensity: 70 }],
          writerNotes: "흑검의 소유권을 흔들지 않는다",
        },
        episodeSceneSheets: [{
          episode: 1,
          title: "누락된 기록",
          arc: "첫 균열 조사",
          scenes: [{
            sceneId: "1-1",
            sceneName: "보관실",
            characters: "강민우",
            tone: "긴장",
            summary: "강민우가 흑검으로 봉인을 연다",
            purpose: "첫 균열의 기록 누락을 발견한다",
            conflict: "협회 보관실의 봉인이 조사를 막는다",
            publicInfo: "협회가 균열 기록을 관리한다",
            hiddenInfo: "첫 균열 기록 일부가 사라졌다",
            emotionCurve: "의심에서 긴장으로 상승",
            rewardBeat: "흑검이 봉인을 자를 수 있음을 확인",
            hookPoint: "기록이 비어 있다는 사실",
            keyDialogue: "기록이 비어 있다.",
            emotionPoint: "의심",
            nextScene: "추적",
          }],
          directionSnapshot: {
            productionDirection: {
              miseEnScene: "잠긴 보관실과 낮은 조도",
              camera: "흑검을 잡은 손에서 기록함으로 이동",
              lighting: "차갑고 낮은 청색광",
              sound: "봉인이 갈라지는 금속성 잔향",
              action: "강민우가 흑검으로 봉인을 가른다",
              proseRhythm: "짧은 문장으로 긴장을 올린다",
            },
          },
          lastUpdate: 1,
        }],
      }),
      "강민우는 흑검을 뽑아 보관실 봉인을 갈랐다.",
      "KO",
    );

    expect(patch.shouldRetry).toBe(false);
    expect(patch.failReasons).toEqual([]);
  });
});
