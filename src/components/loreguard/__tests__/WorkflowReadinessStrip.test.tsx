import { fireEvent, render, screen } from "@testing-library/react";
import WorkflowReadinessStrip from "@/components/loreguard/WorkflowReadinessStrip";
import { Genre, PlatformType, PublishPlatform, type StoryConfig } from "@/lib/studio-types";

function makeConfig(): StoryConfig {
  return {
    genre: Genre.FANTASY,
    povCharacter: "유나",
    setting: "왕국 기록 체계",
    primaryEmotion: "긴장",
    episode: 1,
    title: "권리 원장의 밤",
    totalEpisodes: 80,
    synopsis: "유나는 기록 독점 체계를 뒤집는다.",
    guardrails: { min: 5500, max: 7000 },
    platform: PlatformType.WEB,
    publishPlatform: PublishPlatform.MUNPIA,
    rightsStatus: "author_owned",
    rightsNote: "웹툰화와 영상화 권리를 분리한다",
    corePremise: "승천 의식은 기록 독점 장치다",
  } as StoryConfig;
}

describe("WorkflowReadinessStrip", () => {
  it("10단계 상태 점을 키보드/클릭 가능한 탭 이동 버튼으로 제공한다", () => {
    const onStageSelect = jest.fn();
    render(
      <WorkflowReadinessStrip
        activeTab="project"
        config={makeConfig()}
        projectName="권리 원장의 밤"
        language="KO"
        onStageSelect={onStageSelect}
      />,
    );

    const stageButtons = screen.getAllByRole("button", { name: /^\d+\./ });
    expect(stageButtons).toHaveLength(10);

    fireEvent.click(screen.getByRole("button", { name: /7\. 집필/ }));
    expect(onStageSelect).toHaveBeenCalledWith("writing");

    fireEvent.click(screen.getByRole("button", { name: "세계관 생성" }));
    expect(onStageSelect).toHaveBeenCalledWith("world");
  });
});
