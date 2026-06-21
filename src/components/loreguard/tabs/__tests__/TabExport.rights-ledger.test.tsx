import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import TabExport from "@/components/loreguard/tabs/TabExport";
import { useStudio } from "@/app/studio/StudioContext";
import { getLatestProcessCertificate, recordCreativeEvent } from "@/lib/creative-process";

jest.mock("@/app/studio/StudioContext", () => ({
  useStudio: jest.fn(),
}));

jest.mock("@/hooks/useStudioExport", () => ({
  useStudioExport: () => ({
    exportProjectManuscripts: jest.fn(),
    handleExportEPUB: jest.fn(),
    handleExportDOCX: jest.fn(),
    exportAllJSON: jest.fn(),
  }),
}));

jest.mock("@/components/loreguard/IdeResizablePanel", () => ({
  __esModule: true,
  default: ({ children, ariaLabel }: { children: React.ReactNode; ariaLabel?: string }) => (
    <aside aria-label={ariaLabel}>{children}</aside>
  ),
}));

jest.mock("@/lib/browser/web-share", () => ({
  canShare: () => false,
  canShareFiles: () => false,
  shareManuscript: jest.fn(),
  shareText: jest.fn(),
}));

jest.mock("@/lib/creative/work-receipt-journal", () => ({
  loadJournal: () => [],
}));

jest.mock("@/lib/creative-process", () => ({
  buildWorkReceiptCoverageAudit: () => ({
    status: "review",
    coveredCount: 0,
    expectedCount: 4,
    summaryKo: "과정기록 보강 필요",
    items: [],
  }),
  computeSha256Hex: jest.fn(async (value: string) => `hash-${value.length}`),
  getLatestProcessCertificate: jest.fn(async () => ({
    id: "cert-rights-ledger",
    projectId: "project-rights-ledger",
    manuscriptHash: "a".repeat(64),
    generatedAt: "2026-06-14T12:00:00.000Z",
    generatedBy: "loreguard@certificate-service",
    reportVersion: "1.1.0",
    visibility: "publisher",
    includedSections: [],
    summaryStats: { totalEvents: 1, humanEvents: 1, aiEvents: 0, externalSourceCount: 0, includedEpisodeCount: 1 },
    timelineHash: "b".repeat(64),
    sourceSummaryHash: "c".repeat(64),
    limitationTextVersion: "test",
    verificationUrl: "https://example.test/api/cp/verify/cert-rights-ledger",
    sealNumber: "LG-2606-0001-ABCD",
  })),
  listCreativeEvents: jest.fn(async () => []),
  listSources: jest.fn(async () => []),
  recordCreativeEvent: jest.fn(async () => undefined),
}));

const mockedUseStudio = useStudio as jest.Mock;
const mockedRecordCreativeEvent = recordCreativeEvent as jest.Mock;
const mockedGetLatestProcessCertificate = getLatestProcessCertificate as jest.Mock;

function makeConfig() {
  return {
    genre: "FANTASY",
    povCharacter: "",
    setting: "왕국과 길드가 충돌하는 세계",
    primaryEmotion: "긴장",
    episode: 1,
    title: "권리 원장 테스트",
    totalEpisodes: 60,
    synopsis: "작가가 직접 승인한 출고 테스트 시놉시스",
    guardrails: { min: 5500, max: 7000 },
    characters: [
      {
        id: "char-1",
        name: "유나",
        role: "주인공",
        personality: "신중함",
        goal: "길드의 비밀을 밝힌다",
        flaw: "불신",
        appearance: "은색 머리",
        backstory: "",
        arc: "",
        relationships: [],
      },
    ],
    items: [],
    platform: "WEB",
    publishPlatform: "MUNPIA",
    genreMode: "novel",
    projectTargetLanguage: "KO",
    targetMarket: "KR",
    releasePurpose: "serial",
    rightsStatus: "needs_review",
    rightsNote: "초기 권리 메모",
    importFileReports: [
      {
        id: "import-report-world-md",
        fileName: "world.md",
        status: "success",
        detail: "세계관 후보 2건 생성",
        candidateCount: 2,
        importedAt: "2026-06-14T12:01:00.000Z",
      },
    ],
    corePremise: "길드는 왕국보다 오래된 기록을 숨긴다",
    manuscripts: [
      {
        episode: 1,
        title: "첫 번째 기록",
        content: "AI-TEST-INPUT 원고 본문입니다. 출고 검수와 권리 원장 테스트를 위한 저장 원고입니다.",
        charCount: 47,
        lastUpdate: 1781407000000,
      },
    ],
  };
}

function renderTabExport(configOverride: Partial<ReturnType<typeof makeConfig>> = {}) {
  const config = {
    ...makeConfig(),
    ...configOverride,
  };
  const setConfig = jest.fn();
  const session = {
    id: "session-rights-ledger",
    title: "권리 원장 테스트",
    messages: [],
    config,
    lastUpdate: 1781407000000,
  };
  const project = {
    id: "project-rights-ledger",
    name: "권리 원장 테스트",
    description: "",
    genre: "FANTASY",
    createdAt: 1781407000000,
    lastUpdate: 1781407000000,
    sessions: [session],
  };

  mockedUseStudio.mockReturnValue({
    currentSession: session,
    currentSessionId: session.id,
    currentProjectId: project.id,
    projects: [project],
    sessions: [session],
    setCurrentProjectId: jest.fn(),
    setCurrentSessionId: jest.fn(),
    setConfig,
    createNewSession: jest.fn(),
    language: "KO",
    isKO: true,
    writingMode: "edit",
    editDraft: "",
  });

  render(<TabExport />);
  return { config, setConfig };
}

describe("TabExport rights ledger", () => {
  beforeEach(() => {
    mockedUseStudio.mockReset();
    mockedRecordCreativeEvent.mockClear();
    mockedGetLatestProcessCertificate.mockClear();
  });

  it("권리 원장 항목을 편집해 프로젝트 설정과 과정기록에 남긴다", async () => {
    const { config, setConfig } = renderTabExport();

    await waitFor(() => {
    expect(screen.getByRole("tab", { name: /개요/ })).toHaveAttribute("aria-selected", "true");
    });
    expect(screen.getByRole("tab", { name: /자산화/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /점검/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /제출 묶음/ })).toBeInTheDocument();
    const premiumRightsPackage = screen.getByLabelText("상위 권리 패키지 요약");
    expect(within(premiumRightsPackage).getByText("상위 권리 패키지")).toBeInTheDocument();
    expect(within(premiumRightsPackage).getByText("결제 명분")).toBeInTheDocument();
    expect(within(premiumRightsPackage).getByText("작품이 뜨기 전 기준본을 만들고, 뜬 뒤 제안 조건을 비교하는 묶음")).toBeInTheDocument();
    expect(within(premiumRightsPackage).getByLabelText("상위 권리 패키지 산출물")).toBeInTheDocument();
    expect(within(premiumRightsPackage).getByText("확인서")).toBeInTheDocument();
    expect(within(premiumRightsPackage).getByText("저작권 등록 준비")).toBeInTheDocument();
    expect(within(premiumRightsPackage).getByText("코어 저작권 패키지")).toBeInTheDocument();
    expect(within(premiumRightsPackage).getByText("작가 등록 정보")).toBeInTheDocument();
    expect(within(premiumRightsPackage).getByRole("button", { name: "권리/IP 채우기" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /자산화/ }));
    expect(screen.getByRole("tab", { name: /자산화/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("자산화 패키지")).toBeInTheDocument();
    expect(screen.getByText("문체·설정·권리/IP·출고")).toBeInTheDocument();
    expect(screen.getByLabelText("자산화 통합 카테고리")).toBeInTheDocument();
    expect(screen.getByText("원고 품질")).toBeInTheDocument();
    expect(screen.getByText("설정 흐름")).toBeInTheDocument();
    expect(screen.getByText("출고")).toBeInTheDocument();
    expect(screen.getByText("차감 미리보기")).toBeInTheDocument();
    expect(screen.getByText("완결 과정기록 · 상위 권한 검토 후 발급")).toBeInTheDocument();
    expect(screen.getByText("연재 플랫폼 · 목표 회차 · 핵심 전제 · 주요 인물 · 권리/IP 메모")).toBeInTheDocument();
    expect(screen.getByText("동시 연재 작품 간 설정 혼입 · 플랫폼 선공개 권리 제한 · 회차별 문체 급변 · 상표·실존 인물 언급")).toBeInTheDocument();
    expect(screen.getByText("프로젝트 격리")).toBeInTheDocument();
    expect(screen.getByText("프로젝트 project-rights-ledger 기준으로 원장 키를 분리합니다.")).toBeInTheDocument();
    expect(screen.getByText("제시 자료 묶음")).toBeInTheDocument();
    fireEvent.click(screen.getByText("IP 바이블 13섹션"));
    const ipBibleSections = screen.getByLabelText("IP 바이블 13섹션");
    expect(within(ipBibleSections).getByText("클로드1 자산화 양식을 출고 기준으로 묶었습니다. 채움 항목만 제안 자료에 들어가고, 보강 항목은 작가 확인 후 편입합니다.")).toBeInTheDocument();
    expect(within(ipBibleSections).getByLabelText("IP 바이블 진입 자료")).toBeInTheDocument();
    expect(within(ipBibleSections).getByLabelText("IP 바이블 스토리 자료")).toBeInTheDocument();
    expect(within(ipBibleSections).getByLabelText("IP 바이블 설정 자료")).toBeInTheDocument();
    expect(within(ipBibleSections).getByLabelText("IP 바이블 제작·사업 자료")).toBeInTheDocument();
    expect(within(ipBibleSections).getByText("원시트")).toBeInTheDocument();
    expect(within(ipBibleSections).getByText("작품 개요")).toBeInTheDocument();
    expect(within(ipBibleSections).getByText("시놉시스")).toBeInTheDocument();
    expect(within(ipBibleSections).getByText("세계관")).toBeInTheDocument();
    expect(within(ipBibleSections).getByText("비주얼 가이드")).toBeInTheDocument();
    expect(within(ipBibleSections).getByText("시장 포지셔닝")).toBeInTheDocument();
    expect(within(ipBibleSections).getByText("IP 확장 가능성")).toBeInTheDocument();
    expect(within(ipBibleSections).getAllByText(/채움|필수 보강|권장 보강|대기/).length).toBeGreaterThanOrEqual(13);
    expect(screen.getAllByText(/공개용 카드·제출용 문서/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("공개용 카드와 제출용 문서 차이")).toBeInTheDocument();
    const authorIdentityCard = screen.getByLabelText("작가 등록 정보");
    expect(within(authorIdentityCard).getByLabelText("작가 표시명")).toBeInTheDocument();
    expect(within(authorIdentityCard).getByLabelText("작가 실명")).toBeInTheDocument();
    expect(within(authorIdentityCard).getByText("필명/실명 입력 필요")).toBeInTheDocument();
    fireEvent.change(within(authorIdentityCard).getByLabelText("작가 표시명"), {
      target: { value: "HGGPT" },
    });
    fireEvent.change(within(authorIdentityCard).getByLabelText("작가 실명"), {
      target: { value: "박길흠" },
    });
    expect(setConfig).toHaveBeenCalledWith(expect.any(Function));
    const authorDisplayUpdater = setConfig.mock.calls[0][0] as (prev: Record<string, unknown>) => Record<string, unknown>;
    expect(authorDisplayUpdater(config as unknown as Record<string, unknown>)).toEqual(
      expect.objectContaining({ authorDisplayName: "HGGPT" }),
    );
    const authorLegalUpdater = setConfig.mock.calls[1][0] as (prev: Record<string, unknown>) => Record<string, unknown>;
    expect(authorLegalUpdater(config as unknown as Record<string, unknown>)).toEqual(
      expect.objectContaining({ authorLegalName: "박길흠" }),
    );
    setConfig.mockClear();
    expect(screen.getByText("공개용 카드")).toBeInTheDocument();
    expect(screen.getByText("독자·외부 열람자")).toBeInTheDocument();
    expect(screen.getByText("공개하지 않음")).toBeInTheDocument();
    expect(screen.getByText("본문 원고 · 최종 원고 기록본 · 창작 과정 확인서 · 출처 자료")).toBeInTheDocument();
    expect(screen.getByText("제출용 문서")).toBeInTheDocument();
    expect(screen.getAllByText("심사·출판·플랫폼 담당자").length).toBeGreaterThan(0);
    expect(screen.getByText("제출에 포함")).toBeInTheDocument();
    expect(screen.getByText("제출용 정리 원고 · 창작 과정 확인서 · 디지털 서명 · 국가별 양식 패키지")).toBeInTheDocument();
    expect(screen.getByText("제출 문서")).toBeInTheDocument();
    expect(screen.getByLabelText("출고 목적과 산출물")).toBeInTheDocument();
    fireEvent.click(screen.getByText("패키지 조건 보기"));
    expect(screen.getByText("패키지 조건 미리보기")).toBeInTheDocument();
    expect(screen.getByText(/현재 화면은 발급 전 검토용입니다/)).toBeInTheDocument();
    expect(screen.getByText("검토만 진행")).toBeInTheDocument();
    const releaseProductLine = screen.getByLabelText("출고 패키지 구성");
    expect(within(releaseProductLine).getByText("과정기록 카드")).toBeInTheDocument();
    expect(within(releaseProductLine).getByText("C2PA 회차 패키지")).toBeInTheDocument();
    expect(within(releaseProductLine).getByText("완결 과정기록")).toBeInTheDocument();
    expect(within(releaseProductLine).getByText("완결 출고 패키지 Pro")).toBeInTheDocument();
    expect(within(releaseProductLine).getByText("Publisher 제출 패키지")).toBeInTheDocument();
    expect(within(releaseProductLine).getAllByText("크레딧 조건").length).toBeGreaterThan(0);
    expect(within(releaseProductLine).getAllByText(/금액 비공개/).length).toBeGreaterThan(0);
    expect(within(releaseProductLine).getAllByText(/발급 전 작가 승인 필요/).length).toBeGreaterThan(0);
    expect(within(releaseProductLine).getByText(/조직 승인과 프로젝트 권한 확인 필요/)).toBeInTheDocument();
    const releaseCreditGate = screen.getByLabelText("출고 권한 상태");
    expect(within(releaseCreditGate).getByText("권한 상태")).toBeInTheDocument();
    expect(within(releaseCreditGate).getByText(/포함 크레딧 사용 가능|상위 권한 검토|사전 안내 후 크레딧 반영|조직 권한 협의/)).toBeInTheDocument();
    expect(within(releaseCreditGate).getByText("크레딧 조건")).toBeInTheDocument();
    expect(within(releaseCreditGate).getByText(/필요 \d+개 · 보유/)).toBeInTheDocument();
    expect(within(releaseCreditGate).getByText("버튼 조건")).toBeInTheDocument();
    expect(within(releaseCreditGate).getByText(/발급 전 검토 가능|상위 권한 확인 필요|사전 안내 후 크레딧 반영|조직 원장 협의/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /제출 묶음/ }));
    const submissionPackageTool = screen.getByLabelText("제출 묶음 생성 도구");
    const submissionPackageDetail = submissionPackageTool.closest("details");
    expect(submissionPackageDetail).toBeInTheDocument();
    expect(submissionPackageDetail).toHaveAttribute("open");
    expect(within(submissionPackageDetail as HTMLElement).getByText("검토용 미리보기와 ZIP 다운로드를 준비합니다.")).toBeInTheDocument();
    const submissionCtaStatus = within(submissionPackageDetail as HTMLElement).getByLabelText("제출 묶음 CTA 상태");
    expect(within(submissionCtaStatus).getByText(/상위 권한 검토용 미리보기|출고 묶음 미리보기|출고 묶음 검토 생성|조직 제출 묶음 검토 생성/)).toBeInTheDocument();
    expect(within(submissionCtaStatus).getByText(/실제 차감은 실행하지 않습니다/)).toBeInTheDocument();
    expect(within(submissionPackageDetail as HTMLElement).getByLabelText("제출 묶음 생성 도구")).toBeInTheDocument();
    expect(await within(submissionPackageDetail as HTMLElement).findByLabelText("제출 묶음 생성 전 조건")).toHaveTextContent(/상위 권한 검토|사전 안내 후 크레딧 반영|포함 크레딧 사용 가능|조직 권한 협의/);
    expect(await within(submissionPackageDetail as HTMLElement).findByRole("button", {
      name: /상위 권한 검토용 미리보기|출고 묶음 미리보기|출고 묶음 검토 생성|조직 제출 묶음 검토 생성/,
    })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /자산화/ }));
    const overseasSummary = screen.getByLabelText("해외 출고 검수 요약");
    expect(overseasSummary).toBeInTheDocument();
    expect(within(overseasSummary).getByText("해외 출고 검수")).toBeInTheDocument();
    expect(within(overseasSummary).getByText("0/5개 채움")).toBeInTheDocument();
    expect(within(overseasSummary).getByText("원문 보존안")).toBeInTheDocument();
    expect(within(overseasSummary).getByText("시장판")).toBeInTheDocument();
    expect(within(overseasSummary).getByText("역번역 한국어 요약")).toBeInTheDocument();
    expect(within(overseasSummary).getByText("문화 리스크 한국어 요약")).toBeInTheDocument();
    expect(within(overseasSummary).getByText("현지화 결정 로그")).toBeInTheDocument();
    const jurisdictionPackProgress = screen.getByLabelText("국가·언어권 Pack 진행");
    expect(within(jurisdictionPackProgress).getByText("국가·언어권 Pack")).toBeInTheDocument();
    expect(within(jurisdictionPackProgress).getByText(/한국어\/한국 출고 팩 · 필수 \d+\/\d+/)).toBeInTheDocument();
    expect(within(jurisdictionPackProgress).getByText("보강 양식")).toBeInTheDocument();
    expect(within(jurisdictionPackProgress).getByText(/과정기록 양식/)).toBeInTheDocument();
    expect(within(jurisdictionPackProgress).getByText("확인 출처")).toBeInTheDocument();
    expect(within(jurisdictionPackProgress).getByText("2건 · 기준일 2026-06-15")).toBeInTheDocument();
    expect(await screen.findByText("LG-2606-0001-ABCD")).toBeInTheDocument();
    expect(screen.getByText("https://example.test/verify/cert-rights-ledger")).toBeInTheDocument();
    expect(screen.queryByText("https://example.test/api/cp/verify/cert-rights-ledger")).not.toBeInTheDocument();

    const quickDetail = screen.getByLabelText("상세 양식 빠른 보기");
    expect(within(quickDetail).getByText("대상 언어를 직접 읽지 못해도 원문 보존안·시장판·역번역 요약·문화 리스크를 분리해 검토합니다.")).toBeInTheDocument();
    expect(within(quickDetail).getByRole("button", { name: "문서 내려받기" })).toBeInTheDocument();
    const previewWindowWrite = jest.fn();
    const previewWindowOpen = jest.fn();
    const previewWindowClose = jest.fn();
    const previewWindowFocus = jest.fn();
    const windowOpenSpy = jest.spyOn(window, "open").mockReturnValue({
      document: {
        close: previewWindowClose,
        open: previewWindowOpen,
        write: previewWindowWrite,
      },
      focus: previewWindowFocus,
      opener: {},
    } as unknown as Window);
    fireEvent.click(within(quickDetail).getByRole("button", { name: "양식 크게 보기" }));
    expect(windowOpenSpy).toHaveBeenCalled();
    expect(previewWindowWrite).toHaveBeenCalledWith(expect.stringContaining("한국어/한국 출고 팩 · 출고 양식 미리보기"));
    expect(previewWindowWrite).toHaveBeenCalledWith(expect.stringContaining("인공지능 발전과 신뢰 기반 조성 등에 관한 기본법"));
    expect(previewWindowWrite).toHaveBeenCalledWith(expect.stringContaining("권리/IP 자산화 양식"));
    expect(previewWindowWrite).toHaveBeenCalledWith(expect.stringContaining("@page"));
    expect(previewWindowWrite).toHaveBeenCalledWith(expect.stringContaining("@media print"));
    expect(previewWindowWrite).toHaveBeenCalledWith(expect.stringContaining("break-inside: avoid"));
    expect(previewWindowWrite).toHaveBeenCalledWith(expect.stringContaining("PDF 또는 인쇄본으로 보관"));
    expect(previewWindowClose).toHaveBeenCalled();
    expect(previewWindowFocus).toHaveBeenCalled();
    windowOpenSpy.mockRestore();
    expect(await screen.findByText("국가별 양식 미리보기를 새 창으로 열었습니다.")).toBeInTheDocument();
    expect(within(quickDetail).getByLabelText("상세 양식 확인 출처")).toBeInTheDocument();
    expect(within(quickDetail).getByText("인공지능 발전과 신뢰 기반 조성 등에 관한 기본법")).toBeInTheDocument();
    expect(within(quickDetail).getByText("인공지능 발전과 신뢰 기반 조성 등에 관한 기본법 시행령")).toBeInTheDocument();
    expect(within(quickDetail).getAllByText("기준일 2026-06-15").length).toBeGreaterThanOrEqual(2);
    expect(within(quickDetail).getAllByText("출처 열기").length).toBeGreaterThanOrEqual(2);
    expect(within(quickDetail).getByLabelText("상세 양식 해외 출고 검수")).toBeInTheDocument();
    expect(within(quickDetail).getByLabelText("상세 양식 국가별 양식")).toBeInTheDocument();
    expect(within(quickDetail).getByText("원문 보존안")).toBeInTheDocument();
    expect(within(quickDetail).getByText("시장판")).toBeInTheDocument();
    expect(within(quickDetail).getByText("역번역 한국어 요약")).toBeInTheDocument();
    expect(within(quickDetail).getByText("문화 리스크 한국어 요약")).toBeInTheDocument();
    expect(within(quickDetail).getByText("현지화 결정 로그")).toBeInTheDocument();
    expect(within(quickDetail).getAllByText("보강 · 필수").length).toBeGreaterThanOrEqual(5);
    expect(within(quickDetail).getByText("프로젝트 접수")).toBeInTheDocument();
    expect(within(quickDetail).getByText("과정기록 양식")).toBeInTheDocument();
    expect(within(quickDetail).getByText("권리/IP 자산화 양식")).toBeInTheDocument();
    const coreCopyrightPackage = screen.getByLabelText("코어 저작권 등록 준비 패키지");
    expect(within(coreCopyrightPackage).getByText("코어 저작권 패키지")).toBeInTheDocument();
    expect(within(coreCopyrightPackage).getByText("세계관 등록 문서")).toBeInTheDocument();
    expect(within(coreCopyrightPackage).getByText("캐릭터 등록 문서")).toBeInTheDocument();
    expect(within(coreCopyrightPackage).getByText("메인 시나리오 등록 문서")).toBeInTheDocument();
    expect(within(coreCopyrightPackage).getAllByText("Canon Matrix").length).toBeGreaterThan(0);
    fireEvent.click(within(coreCopyrightPackage).getByText("기준본 산출물"));
    expect(within(coreCopyrightPackage).getByLabelText("코어 저작권 기준본 산출물")).toBeInTheDocument();
    expect(within(coreCopyrightPackage).getByLabelText("코어 저작권 권리 체크리스트")).toBeInTheDocument();
    expect(within(coreCopyrightPackage).getByRole("button", { name: "코어 패키지 내려받기" })).toBeInTheDocument();
    const rightsProposalAdvisor = screen.getByLabelText("권리 제안 어드바이저");
    expect(within(rightsProposalAdvisor).getByText("권리 제안 어드바이저")).toBeInTheDocument();
    expect(within(rightsProposalAdvisor).getByLabelText("제안서 또는 미팅 메모")).toBeInTheDocument();
    fireEvent.change(within(rightsProposalAdvisor).getByLabelText("제안서 또는 미팅 메모"), {
      target: { value: "웹툰화와 영상화 권리를 전 세계 독점 7년으로 제안받았고 수익 배분은 순수익 기준입니다." },
    });
    expect(within(rightsProposalAdvisor).getByText(/확인 \d+개 · 주의 \d+개 · 질문 \d+개/)).toBeInTheDocument();
    expect(within(rightsProposalAdvisor).getByLabelText("권리 제안 조건 축 분석")).toBeInTheDocument();
    fireEvent.click(within(rightsProposalAdvisor).getByText("회신 초안"));
    expect(within(rightsProposalAdvisor).getByLabelText("권리 제안 회신 초안")).toBeInTheDocument();
    expect(within(rightsProposalAdvisor).getByRole("button", { name: "어드바이저 결과 내려받기" })).toBeInTheDocument();
    const copyrightPrep = screen.getByLabelText("저작권 등록 준비 3안");
    expect(within(copyrightPrep).getByText("저작권 등록 준비")).toBeInTheDocument();
    expect(within(copyrightPrep).getAllByText("A안 서사 중심").length).toBeGreaterThan(0);
    expect(within(copyrightPrep).getAllByText("B안 캐릭터 중심").length).toBeGreaterThan(0);
    expect(within(copyrightPrep).getAllByText("C안 추상적 주제 중심").length).toBeGreaterThan(0);
    expect(within(copyrightPrep).getAllByText("최종 제출용 혼합안").length).toBeGreaterThan(0);
    fireEvent.click(within(copyrightPrep).getByText("정정 입력란용 문안"));
    expect(within(copyrightPrep).getByLabelText("저작권 등록 정정 입력란 문안")).toBeInTheDocument();
    expect(within(copyrightPrep).getByLabelText("등록 전 보완 방지 검사")).toBeInTheDocument();
    expect(within(copyrightPrep).getByRole("button", { name: "등록 준비 3안 내려받기" })).toBeInTheDocument();
    expect(screen.getByText(/필수 보강 \d+건/)).toBeInTheDocument();
    expect(screen.getAllByText("보강: 독점 여부 · 기간 · 상태").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/보강:/).length).toBeGreaterThan(0);

    const editButtons = screen.getAllByRole("button", { name: "수정" });
    fireEvent.click(editButtons[0]);

    fireEvent.change(screen.getByLabelText("권리 원장 상태"), {
      target: { value: "작가 확인 완료" },
    });
    fireEvent.change(screen.getByLabelText("권리 원장 독점 여부"), {
      target: { value: "비독점 제안 가능" },
    });
    fireEvent.change(screen.getByLabelText("권리 원장 기간"), {
      target: { value: "2026-06-14부터 2년" },
    });
    fireEvent.change(screen.getByLabelText("권리 원장 지역"), {
      target: { value: "한국·일본" },
    });
    fireEvent.change(screen.getByLabelText("권리 원장 매체"), {
      target: { value: "웹소설·웹툰" },
    });
    fireEvent.change(screen.getByLabelText("권리 원장 근거 파일"), {
      target: { value: "rights-note.md" },
    });
    fireEvent.change(screen.getByLabelText("권리 원장 메모"), {
      target: { value: "AI-TEST-INPUT 권리 원장 수정 메모" },
    });

    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(setConfig).toHaveBeenCalledWith(expect.any(Function));
    const updater = setConfig.mock.calls[0][0] as (prev: Record<string, unknown>) => Record<string, unknown>;
    const nextConfig = updater(config as unknown as Record<string, unknown>);

    expect(nextConfig.rightsLedger).toEqual([
      expect.objectContaining({
        id: "manuscriptText",
        categoryKo: "원고 본문",
        exclusivityKo: "비독점 제안 가능",
        termKo: "2026-06-14부터 2년",
        regionKo: "한국·일본",
        mediaKo: "웹소설·웹툰",
        evidenceFileKo: "rights-note.md",
        statusKo: "작가 확인 완료",
        noteKo: "AI-TEST-INPUT 권리 원장 수정 메모",
        updatedBy: "작가",
      }),
    ]);
    expect(screen.getByText("원고 본문 원장 항목을 저장했습니다.")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedRecordCreativeEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "project-rights-ledger",
          targetType: "metadata",
          targetId: "rights-ledger:manuscriptText",
          eventType: "edit",
          actorType: "human",
          originType: "HUMAN_REVISION",
          stage: "publish",
          note: "권리 원장 수정: 원고 본문",
        }),
      );
    });
  }, 15000);

  it("조직 운영자 경로에서는 프로젝트별 제출 경계를 표시한다", async () => {
    renderTabExport({
      rightsStatus: "external_materials",
      rightsNote: "외부자료 제공 계약 검토 중",
      totalEpisodes: 12,
    });

    await waitFor(() => {
      expect(screen.getByText("조직 운영자")).toBeInTheDocument();
    });
    const groupSubmissionStatus = screen.getByLabelText("조직 워크스페이스 제출 상태");
    expect(within(groupSubmissionStatus).getByText("조직 제출 상태")).toBeInTheDocument();
    expect(within(groupSubmissionStatus).getByText("프로젝트 경계")).toBeInTheDocument();
    expect(within(groupSubmissionStatus).getByText("project-rights-ledger")).toBeInTheDocument();
    expect(within(groupSubmissionStatus).getByText("공유 필드")).toBeInTheDocument();
    expect(within(groupSubmissionStatus).getByText(/\d+개 제출 필드/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /자산화/ }));
    expect(screen.getAllByText("조직 제출 경계").length).toBeGreaterThan(0);
    expect(screen.getAllByText("프로젝트별 원장 분리 준비").length).toBeGreaterThan(0);

    const quickDetail = screen.getByLabelText("상세 양식 빠른 보기");
    expect(within(quickDetail).getByLabelText("상세 양식 조직 제출 경계")).toBeInTheDocument();
    expect(
      within(quickDetail).getByText(
        /group-release:publisher-workspace-preview:project-rights-ledger:external-submission:(no-certificate|cert-rights-ledger)/,
      ),
    ).toBeInTheDocument();
  });

  it("게임·비주얼노벨 기획자 경로를 자산화 패키지 안에서 추천한다", async () => {
    renderTabExport({
      genreMode: "game",
      releasePurpose: "serial",
      totalEpisodes: 12,
      rightsStatus: "author_owned",
    });

    await waitFor(() => {
      expect(screen.getByText("게임·비주얼노벨 기획자")).toBeInTheDocument();
    });

    expect(screen.getByText("코어 루프, 캐릭터 로스터, 성장·경제 구조, 아이템 권리표.")).toBeInTheDocument();
    expect(screen.getByText("세계관 규칙 · 반복 행동 · 성장/해금 구조 · 캐릭터 로스터 · 아이템·스킬 권리")).toBeInTheDocument();
    expect(screen.getByText("플레이 규칙과 원작 설정 충돌 · 캐릭터·아이템 명칭 상표 위험 · 스킬·시스템 UI의 기존 게임 유사성 · 음성·OST·DLC·굿즈 권리 분리")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /자산화/ }));
    expect(screen.getAllByText("게임·애니").length).toBeGreaterThan(0);
    expect(screen.getByText("매체별 권리팩")).toBeInTheDocument();
    expect(screen.getByLabelText("자산화 통합 카테고리")).toBeInTheDocument();
  });
});
