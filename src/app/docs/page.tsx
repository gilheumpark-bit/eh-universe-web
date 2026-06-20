"use client";

import Header from "@/components/Header";
import { useLang, L2A } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { useEffect, useState } from "react";

// ============================================================
// PART 1 — Section data
// ============================================================

type DocsSection = {
  id: string;
  title: string;
  content: string;
};

const sectionsKo: DocsSection[] = [
  {
    id: "current-baseline",
    title: "0. 현재 제품 기준",
    content: `기준일: 2026-06-15
Loreguard는 창작 전문 IDE입니다.
첫 화면은 프로젝트 생성이며, 작업 흐름은 10단계로 고정됩니다.

프로젝트 생성 > 세계관 생성 > 캐릭터·아이템 > 메인 시나리오 > 씬시트 > 연출 > 집필 > 퇴고 > 번역·현지화 > 출고

공개 화면에서는 노아, 노아 인터뷰, 노아 제안, 과정기록, 출고 패키지, 권리/IP 점검이라는 용어를 씁니다.
리딤 코드는 아직 준비 중이며, 현재 앱에서 바로 적용되는 기능으로 안내하지 않습니다.`,
  },
  {
    id: "project-start",
    title: "1. 프로젝트 생성",
    content: `작품을 만들기 전에 제목, 장르, 목표 플랫폼, 출고 형태, 권리 메모를 먼저 잡습니다.
중앙은 질문형 기준 잡기, 오른쪽은 실제 저장될 작품 정보입니다.

필수 입력:
- 작품 제목
- 장르와 독자층
- 목표 플랫폼 또는 출고처
- 회차/분량 기준
- 권리/IP 메모

저장:
- 브라우저 로컬 저장
- 프로젝트 목록에서 다시 열기
- 외부/클라우드 동기화는 환경 설정에서 명시 선택`,
  },
  {
    id: "world",
    title: "2. 세계관 생성",
    content: `세계관 탭은 단순 문답 화면이 아니라, 노아가 질문하고 사용자가 채택한 값만 캔버스에 쌓는 구조입니다.

관리 항목:
- 핵심 전제
- 시대/장소/권력 구조
- 금기와 규칙
- 사건 발생 조건
- 플랫폼별 분량/연재 조건

사용자가 불러온 자료는 실제 내용을 읽고 세계관, 캐릭터, 아이템, 시나리오, 씬, 권리 메모, 미분류 후보로 나눕니다.
자동 반영하지 않고, 채택 전까지 후보 상태로 유지합니다.`,
  },
  {
    id: "characters",
    title: "3. 캐릭터·아이템",
    content: `캐릭터와 아이템은 세계관과 분리된 목록이 아니라, 사건을 움직이는 작업 자산입니다.

관리 항목:
- 인물 기본 정보
- 욕망, 결핍, 갈등
- 말투와 관계 변화
- 주요 아이템, 능력, 제한 조건
- 웹툰/드라마/게임 확장용 자산 메모

각 항목은 과정기록과 연결되어 누가 어떤 설정을 승인했는지 남겨야 합니다.`,
  },
  {
    id: "plot",
    title: "4. 메인 시나리오",
    content: `메인 시나리오는 작품 전체의 방향을 잡는 기준입니다.

관리 항목:
- 로그라인
- 3막/기승전결/장르형 구조
- 주인공의 목표와 결말 잠금
- 핵심 반전과 복선
- 회차별 큰 사건 배열

노아 제안은 후보로 표시되며, 사용자가 채택하거나 보류해야 작품 계획에 반영됩니다.`,
  },
  {
    id: "scene-sheet",
    title: "5. 씬시트",
    content: `씬시트는 한 화 또는 한 장면의 실행 설계표입니다.

관리 항목:
- 장면 목적
- 등장 인물
- 장소와 시간
- 갈등/정보 공개/감정 변화
- 시작점과 종료점
- 다음 장면으로 넘기는 훅

집필 탭은 이 씬시트와 세계관·캐릭터·연출 설정을 함께 읽고 어긋나는 부분을 알려줍니다.`,
  },
  {
    id: "direction",
    title: "6. 연출",
    content: `연출 탭은 씬시트와 다릅니다.
씬시트가 무엇을 쓸지라면, 연출은 어떻게 보이게 할지입니다.

관리 항목:
- 장면 톤
- 컷 전환
- 대사 큐
- 감정 포인트
- 긴장 곡선
- 매체 확장용 콘티 메모

연출 제안은 산문 본문이 아니라 shot 또는 콘티 후보로만 다룹니다.`,
  },
  {
    id: "writing",
    title: "7. 집필",
    content: `집필 탭은 원고 편집과 검토가 중심입니다.

편의 기능:
- 글꼴, 글자 크기, 줄간격, 문단 간격
- 찾기/바꾸기
- 선택 영역 우클릭 수정
- 오타 후보와 상표/실명 위험 후보
- 버전 비교
- 세계관·캐릭터·씬시트·연출 흐름 점검

노아 제안은 바로 덮어쓰지 않고 후보 > 작가 승인 > 적용 > 과정기록 순서로 남깁니다.`,
  },
  {
    id: "revision",
    title: "8. 퇴고",
    content: `퇴고는 원고를 다시 쓰는 버튼이 아니라, 문제를 발견하고 수정 결정을 남기는 단계입니다.

점검 항목:
- 반복과 장황함
- 인과 단절
- 캐릭터 보이스 이탈
- 페이싱 문제
- 설정 충돌
- 상표/실명/IP 위험

자동 수정은 기본값이 아닙니다. 후보를 보여주고 사용자가 승인해야 적용됩니다.`,
  },
  {
    id: "translation",
    title: "9. 번역·현지화",
    content: `번역의 전제는 사용자가 대상 언어를 모를 수 있다는 점입니다.
따라서 사용자가 외국어 문장 품질을 직접 판정하도록 만들지 않습니다.

제공해야 할 근거:
- 한국어로 읽히는 위험 설명
- 역번역 또는 의미 비교
- 추천/보류/비추천 상태
- 인물 말투와 세계관 고유명사 보존 여부
- 현지 플랫폼 문법과 금기 위험

언어 전환은 KO, EN, JP, CN을 기본으로 제공하며, 추가 언어는 별도 검증 후 확장합니다.`,
  },
  {
    id: "export",
    title: "10. 출고",
    content: `출고는 원고 파일 하나가 아니라 제출 가능한 패키지입니다.

출고 패키지:
- 원고
- 설정집
- 씬시트
- 번역본
- 과정기록
- 권리/IP 요약
- 수정 이력
- 확인서 보조 문서

확인서와 공개용 표시는 법적 효력을 대신하는 문서가 아니라, 과정기록과 제출 참고 자료로 다룹니다.`,
  },
  {
    id: "noa-operations",
    title: "11. 노아 운영",
    content: `노아는 앱의 작업 조력자 이름입니다.
운영 방식은 사용자가 상황에 맞게 고릅니다.

운영 모드:
- Hosted: 앱이 준비한 기본 경로
- 연결 키: 사용자가 가진 작업 계정을 연결하는 경로
- Local: 사용자의 로컬 작업 환경과 연결하는 경로
- Offline: 외부 연결 없이 편집, 저장, 출고 준비

키는 로컬 저장소에서 암호화 저장을 우선합니다.
삭제된 검색 호환 경로는 현재 비활성 상태이며, 활성 기능으로 안내하지 않습니다.`,
  },
  {
    id: "redeem",
    title: "12. 리딤·결제 상태",
    content: `현재 결제 적용 흐름은 준비 중입니다.
리딤 코드 입력과 /api/redeem 라우트는 아직 없습니다.

현재 안내:
- 구독 결제: 준비 중
- 확인서/출고 크레딧 단건 결제: 준비 중
- 리딤 코드 입력: 준비 중
- 리딤으로 확인서/출고 크레딧을 적용하는 흐름: 설계 대기
- 그룹/퍼블리셔 좌석: 설계 대기

단건 구매와 리딤은 다른 경로입니다.
리딤은 향후 이용권 적용 원장, 중복 제출 방지, 적용 영수증, 취소/회수 정책과 함께 구현해야 합니다.`,
  },
  {
    id: "environment",
    title: "13. 환경 설정",
    content: `환경 설정은 노아 운영, 저장·백업, 창작 작업환경, 과정기록·권리/IP, 출고·번역, 진단으로 나눕니다.

필수 조건:
- 검색 가능
- 모바일 sheet 대응
- 접힘/펼침과 폭 조절
- 현재 저장 위치와 동기화 상태 표시
- 기본 운영/연결 키/Local/Offline 차이 설명

사용자가 제공한 모든 자료는 실제로 읽고 분석하는 것을 전제로 합니다.`,
  },
];

const sectionsEn: DocsSection[] = [
  {
    id: "current-baseline",
    title: "0. Current Product Standard",
    content: `Standard date: 2026-06-15
Loreguard is a professional creative IDE.
The first screen is project creation, and the workflow is fixed to ten stages.

Project creation > World creation > Character and item > Main scenario > Scene sheet > Direction > Writing > Revision > Translation and localization > Export

Public product wording uses Noa, Noa interview, Noa suggestion, process record, export package, and rights/IP review.
Redeem codes are not active yet and must not be described as immediately available.`,
  },
  {
    id: "project-start",
    title: "1. Project Creation",
    content: `Before writing, set the title, genre, target platform, release format, and rights notes.
The center column is the Noa interview. The right board shows the work information that will actually be saved.

Required inputs:
- Title
- Genre and audience
- Target platform or release channel
- Episode and length target
- Rights/IP notes

Saving:
- Local browser save
- Reopen from project list
- External/cloud sync should be an explicit environment choice`,
  },
  {
    id: "world",
    title: "2. World Creation",
    content: `The world tab is not a plain chat screen.
Noa asks, the author chooses, and only accepted values enter the canvas.

Managed items:
- Core premise
- Era, place, and power structure
- Rules and taboos
- Event conditions
- Platform length and serialization assumptions

Imported material must be read and classified into world, character, item, scenario, scene, rights notes, and uncategorized candidates.`,
  },
  {
    id: "characters",
    title: "3. Character And Item",
    content: `Characters and items are story assets that move events.

Managed items:
- Character basics
- Desire, lack, and conflict
- Speech and relationship changes
- Items, powers, and constraints
- Adaptation notes for webtoon, drama, or game packages

Each accepted item should connect to process records.`,
  },
  {
    id: "plot",
    title: "4. Main Scenario",
    content: `The main scenario is the steering layer of the work.

Managed items:
- Logline
- Three-act, four-part, or genre structure
- Protagonist goal and ending lock
- Core twist and foreshadowing
- Episode-level event order

Noa suggestions remain candidates until the author accepts or holds them.`,
  },
  {
    id: "scene-sheet",
    title: "5. Scene Sheet",
    content: `The scene sheet is the execution plan for an episode or scene.

Managed items:
- Scene purpose
- Present characters
- Place and time
- Conflict, information release, and emotional change
- Opening and closing state
- Hook into the next scene

The writing tab should check against world, character, scene sheet, and direction settings.`,
  },
  {
    id: "direction",
    title: "6. Direction",
    content: `Direction is different from the scene sheet.
The scene sheet decides what happens. Direction decides how it should feel and be staged.

Managed items:
- Scene tone
- Shot or cut flow
- Dialogue cue
- Emotional point
- Tension curve
- Adaptation storyboard notes

Direction suggestions are shot candidates, not prose manuscript.`,
  },
  {
    id: "writing",
    title: "7. Writing",
    content: `The writing tab centers on manuscript editing and review.

Expected tools:
- Font, size, line height, paragraph spacing
- Find and replace
- Context menu edits for selected text
- Typo, trademark, and real-name risk candidates
- Version comparison
- Flow checks against world, character, scene sheet, and direction settings

Noa suggestions follow candidate > author approval > apply > process record.`,
  },
  {
    id: "revision",
    title: "8. Revision",
    content: `Revision finds issues and records the author's correction decisions.

Review points:
- Repetition and verbosity
- Causality gaps
- Character voice drift
- Pacing problems
- Setting conflicts
- Trademark, real-name, and IP risk

Automatic editing is not the default. Candidates must be approved by the author.`,
  },
  {
    id: "translation",
    title: "9. Translation And Localization",
    content: `The translation premise is that the author may not understand the target language.
The UI should not force the author to judge foreign-language sentence quality directly.

Evidence to show:
- Risk explanation in the author's language
- Back-translation or meaning comparison
- Recommended, hold, or not recommended state
- Character voice and term preservation
- Target platform convention and taboo risk

KO, EN, JP, and CN are the default language switch options. Additional languages need separate verification.`,
  },
  {
    id: "export",
    title: "10. Export",
    content: `Export is a package, not a single manuscript file.

Export package:
- Manuscript
- World bible
- Scene sheet
- Translation
- Process record
- Rights/IP summary
- Revision history
- Confirmation support document

Certificates and public marks are process records and submission support materials, not legal substitutes.`,
  },
  {
    id: "noa-operations",
    title: "11. Noa Operations",
    content: `Noa is the product-facing work assistant.
Operation mode is selected by context.

Modes:
- Hosted: app-managed path
- Connection key: user-supplied work account
- Local: the user's local work environment
- Offline: edit, save, and prepare export without model calls

Keys are stored locally with encryption where available.
Removed search compatibility routes are disabled and should not be presented as active features.`,
  },
  {
    id: "redeem",
    title: "12. Redeem And Billing Status",
    content: `Billing flows are being prepared.
Redeem-code input and /api/redeem do not exist yet.

Current wording:
- Subscription billing: pending
- One-off certificate/export-credit billing: pending
- Redeem-code input: pending
- Certificate/export-credit redeem flow: pending design
- Group/publisher seats: pending design

One-off purchase and redeem are separate paths.
Redeem should later be implemented with an entitlement ledger, idempotency, receipt, and revocation policy.`,
  },
  {
    id: "environment",
    title: "13. Environment Settings",
    content: `Environment settings are grouped into Noa operations, storage/backup, creative workspace, process records and rights/IP, export/translation, and diagnostics.

Required behavior:
- Searchable settings
- Mobile sheet layout
- Collapse, expand, and resize support
- Current save and sync status
- Clear Hosted/Connection key/Local/Offline differences

All user-provided materials are expected to be actually read and analyzed before being used.`,
  },
];

// ============================================================
// PART 2 — Component
// ============================================================

const sectionMap = { ko: sectionsKo, en: sectionsEn };
const flowPreviewKo = [
  "프로젝트", "세계관", "캐릭터", "시나리오", "씬시트", "연출", "집필", "퇴고", "번역", "출고",
];
const flowPreviewEn = [
  "Project", "World", "Character", "Scenario", "Scene", "Direction", "Writing", "Revision", "Translation", "Export",
];
const proofPreview = [
  {
    ko: ["과정기록", "작가 결정과 노아 제안을 분리해 남깁니다."],
    en: ["Process record", "Separates author decisions from Noa suggestions."],
  },
  {
    ko: ["권리/IP", "외부 자료, 공동기획, 매체 확장 메모를 정리합니다."],
    en: ["Rights/IP", "Organizes sources, co-planning, and media expansion notes."],
  },
  {
    ko: ["출고 패키지", "공모전, 플랫폼, 출판사 제출 자료를 묶습니다."],
    en: ["Release package", "Bundles materials for contests, platforms, and publishers."],
  },
];

export default function DocsPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);
  const sections = L2A(sectionMap, lang);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const activeSectionId = sections.some((section) => section.id === activeId)
    ? activeId
    : (sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <>
      <Header />
      <main className="pt-24">
        <div className="site-shell py-16 md:py-20">
          <div className="flex flex-col gap-8 lg:flex-row">
            <aside className="shrink-0 lg:w-64">
              <div className="premium-panel-soft motion-rise rounded-xl p-4 lg:sticky lg:top-24">
                <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-text-tertiary">
                  {T({ ko: "목차", en: "Contents", ja: "目次", zh: "目录" })}
                </h2>
                <nav className="space-y-1" role="navigation" aria-label={T({ ko: "목차", en: "Table of contents", ja: "目次", zh: "目录" })}>
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      aria-label={section.title}
                      aria-current={activeSectionId === section.id ? "location" : undefined}
                      className={`flex min-h-11 items-center rounded px-3 py-2 font-mono text-xs transition-colors ${
                        activeSectionId === section.id
                          ? "bg-accent-amber/10 font-bold text-accent-amber"
                          : "text-text-secondary hover:bg-white/4 hover:text-text-primary"
                      }`}
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              <div className="doc-header motion-rise motion-rise-delay-1 mb-0 rounded-t-xl">
                <span className="badge badge-classified mr-2">PUBLIC</span>
                {T({
                  ko: "문서 등급: PUBLIC | 버전: 2026.06.15 | Loreguard 사용자 매뉴얼",
                  en: "Document Level: PUBLIC | Version: 2026.06.15 | Loreguard User Manual",
                })}
              </div>
              <div className="premium-panel motion-rise motion-rise-delay-2 rounded-b-3xl rounded-t-none border-t-0 p-8 sm:p-12">
                <h1 className="site-title mb-2 text-3xl font-bold tracking-tight">
                  LOREGUARD MANUAL
                </h1>
                <p className="mb-12 font-serif text-sm text-text-tertiary">
                  {T({
                    ko: "창작 전문 IDE · 10단계 작업 흐름 · 노아 운영 기준",
                    en: "Creative IDE · Ten-stage workflow · Noa operations standard",
                  })}
                </p>

                <section className="mb-12 rounded-2xl border border-border bg-bg-secondary/25 p-4 sm:p-5" aria-label={T({ ko: "10단계 흐름 요약", en: "Ten-stage flow summary" })}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent-blue">
                        {T({ ko: "제품 흐름", en: "Product flow" })}
                      </p>
                      <h2 className="mt-1 font-serif text-xl font-semibold text-text-primary">
                        {T({ ko: "작업은 10단계, 남는 것은 제출 가능한 증거입니다.", en: "Ten stages of work, with evidence ready for submission." })}
                      </h2>
                    </div>
                    <span className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-3 py-1 text-xs font-semibold text-accent-amber">
                      {T({ ko: "창작자 주도", en: "Author-led" })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {(lang === "en" ? flowPreviewEn : flowPreviewKo).map((label, index) => (
                      <div key={label} className="rounded-xl border border-border bg-bg-primary/50 p-3">
                        <div className="font-mono text-[10px] font-bold text-text-tertiary">{String(index + 1).padStart(2, "0")}</div>
                        <div className="mt-1 text-sm font-semibold text-text-primary">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {proofPreview.map((item) => {
                      const pair = lang === "en" ? item.en : item.ko;
                      return (
                        <article key={pair[0]} className="rounded-xl border border-border bg-bg-primary/40 p-4">
                          <h3 className="text-sm font-semibold text-text-primary">{pair[0]}</h3>
                          <p className="mt-2 text-xs leading-relaxed text-text-secondary">{pair[1]}</p>
                        </article>
                      );
                    })}
                  </div>
                </section>

                {sections.map((section) => (
                  <section key={section.id} id={section.id} className="mb-12 scroll-mt-24">
                    <h2 className="mb-4 border-b border-border pb-2 font-mono text-lg font-bold uppercase tracking-wider text-accent-purple">
                      {section.title}
                    </h2>
                    <div className="whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                      {section.content}
                    </div>
                  </section>
                ))}

                <div className="mt-16 border-t border-border pt-6">
                  <p className="text-center font-serif text-xs italic text-text-tertiary">
                    {T({
                      ko: "Loreguard 문서는 실제 코드와 출시 표면을 기준으로 갱신됩니다.",
                      en: "Loreguard documentation follows the current code and shipped product surface.",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// IDENTITY_SEAL: DocsPage | role=public-user-manual | inputs=lang | outputs=current-docs-page
