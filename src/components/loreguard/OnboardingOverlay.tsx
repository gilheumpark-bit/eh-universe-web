"use client";

/* ===========================================================
   OnboardingOverlay — 수동 재진입 온보딩 (F3)

   표시 조건: 부모(LoreguardStudio)가 표시 state 를 소유한다.
   첫 화면은 프로젝트 생성이 우선이므로 자동 노출하지 않고, 설정/도움말의
   "온보딩 다시 보기" 요청으로만 연다. 본 컴포넌트는 모든
   닫힘 경로(완료 액션·건너뛰기·Escape·백드롭)에서 markLgOnboarded 로
   플래그를 기록한 뒤 콜백을 호출한다.

  내용 (3 스텝 + 시작 2버튼 — 전부 실재 기능만):
   ① 창작 흐름 — 셸의 실제 10단계 (프로젝트 생성→세계관→출고,
      LOREGUARD_TABS 순서 동일) 칩으로 한눈에.
   ② 노아는 요청형 — 요청바·제안 채택으로 부를 때만 (R1 가드레일 문구 일치).
   ③ 창작 과정 자동 기록 → 확인서 발급 (CpJournalPanel 실 기능) 한 줄.
   ④ "빈 프로젝트로 시작" + "노아 샘플로 시작" — 실 핸들러 배선
      (부모가 createNewSession / 세계관 탭 이동 / 입력 프리필 수행).

   a11y: role=dialog aria-modal + useFocusTrap (Tab 순환·첫 focusable
   자동 포커스·Escape·언마운트 시 이전 focus 복귀 — 기존 훅 재사용).
   토큰 스코프: 루트에 .eh-app 직접 부여 (ToastHost PART 10 과 동일 전략).
   테마: 셸과 동일 키(noa-lg-theme) mount 시 1회 읽기 — 모달 표시 중에는
   백드롭이 헤더 토글을 가리므로 실시간 구독 불필요.
   CSS: src/app/loreguard.css PART 11 (prefers-reduced-motion 시 페이드만).
   =========================================================== */

import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { L4 } from "@/lib/i18n";
import {
  Globe,
  User,
  Branch,
  Film,
  Pen,
  Languages,
  Wand,
  Scroll,
  Sparkle,
  ChevronR,
  Plus,
  Download,
  X,
} from "./icons";

// ============================================================
// PART 1 — noa-lg-onboarded storage helpers
// ============================================================

export const LG_ONBOARDED_KEY = "noa-lg-onboarded";

/** 온보딩 완료 여부 — SSR/storage 불가 시 true (fail-closed: 매 세션 반복 노출 방지). */
export function readLgOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(LG_ONBOARDED_KEY) !== null;
  } catch {
    return true; // 프라이빗 모드 등 storage 접근 불가 — 표시 생략
  }
}

export function markLgOnboarded(): void {
  try {
    window.localStorage.setItem(LG_ONBOARDED_KEY, "1");
  } catch {
    // storage 불가 — 부모 state 로 이번 세션 닫힘은 유지됨 (기능 자체는 동작)
  }
}

/** 셸(noa-lg-theme)과 동일 키 mount 시 1회 해석 — light 기본 (LoreguardShell 과 동일 규칙). */
function readResolvedTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  try {
    const raw = window.localStorage.getItem("noa-lg-theme");
    if (raw === "dark") return "dark";
    if (raw === "system") {
      return typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
  } catch {
    /* light 기본 */
  }
  return "light";
}

// ============================================================
// PART 2 — 컴포넌트
// ============================================================

interface OnboardingOverlayProps {
  /** AppLanguage (KO/EN/JA/ZH) — L4 분기. */
  language?: string;
  /** 건너뛰기·Escape·백드롭 닫힘 (플래그 기록 후 호출). */
  onClose: () => void;
  /** "빈 프로젝트로 시작" — 부모가 세션 보장 + 세계관 탭 이동. */
  onStartEmpty: () => void;
  /** "노아 샘플로 시작" — 부모가 새 작품 생성 + 세계관 탭 + 노아 요청 유도. */
  onStartSample: () => void;
}

export default function OnboardingOverlay({
  language = "KO",
  onClose,
  onStartEmpty,
  onStartSample,
}: OnboardingOverlayProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // 테마 mount 1회 해석 (lazy init — FOUC 방지, 표시 중 변경 불가 경로).
  const [resolvedTheme] = useState<"light" | "dark">(readResolvedTheme);

  // 부모 inline 콜백 identity 변동에도 focus-trap effect 가 재실행(재포커스)되지
  // 않도록 ref 로 고정 — useFocusTrap deps 에 안정된 skip 만 전달.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const skip = useCallback(() => {
    markLgOnboarded();
    onCloseRef.current();
  }, []);

  // Tab 순환 + 첫 focusable 자동 포커스 + Escape 닫기 + 이전 focus 복귀 (기존 훅).
  useFocusTrap(cardRef, true, skip);

  const handleStartEmpty = () => {
    markLgOnboarded();
    onStartEmpty();
  };
  const handleStartSample = () => {
    markLgOnboarded();
    onStartSample();
  };

  // ---- 문구 (4언어 · 실재 기능만 — 비활성 기능 소개 금지) ----
  const skipLabel = L4(language, { ko: "건너뛰기", en: "Skip", ja: "スキップ", zh: "跳过" });

  // 실제 셸 10단계 (LOREGUARD_TABS 순서·아이콘 동일)
  const flow = [
    { Icon: Plus, label: L4(language, { ko: "프로젝트 생성", en: "Project", ja: "プロジェクト", zh: "项目" }) },
    { Icon: Globe, label: L4(language, { ko: "세계관", en: "World", ja: "世界観", zh: "世界观" }) },
    { Icon: User, label: L4(language, { ko: "캐릭터·아이템", en: "Characters", ja: "キャラクター", zh: "角色" }) },
    { Icon: Branch, label: L4(language, { ko: "메인 시나리오", en: "Scenario", ja: "シナリオ", zh: "主线" }) },
    { Icon: Film, label: L4(language, { ko: "씬시트", en: "Scene sheet", ja: "シーン表", zh: "场景表" }) },
    { Icon: Film, label: L4(language, { ko: "연출", en: "Direction", ja: "演出", zh: "演出" }) },
    { Icon: Pen, label: L4(language, { ko: "집필", en: "Writing", ja: "執筆", zh: "写作" }) },
    { Icon: Scroll, label: L4(language, { ko: "퇴고", en: "Revision", ja: "推敲", zh: "修订" }) },
    { Icon: Languages, label: L4(language, { ko: "번역·현지화", en: "Localization", ja: "翻訳・ローカライズ", zh: "翻译本地化" }) },
    { Icon: Download, label: L4(language, { ko: "출고", en: "Release", ja: "出稿", zh: "交付" }) },
  ];

  return (
    <div className="eh-app noa-onboard-host" data-theme={resolvedTheme}>
      {/* 백드롭 클릭 = 건너뛰기 (항상 가능) */}
      <div className="noa-onboard-backdrop" onClick={skip} aria-hidden="true" />

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="noa-onboard-card"
      >
        {/* head */}
        <div className="noa-onboard-head">
          <span className="noa-onboard-mark" aria-hidden="true">
            <Sparkle size={18} />
          </span>
          <div>
            <h2 id={titleId} className="noa-onboard-title">
              {L4(language, {
                ko: "로어가드 스튜디오에 오신 것을 환영합니다",
                en: "Welcome to Loreguard Studio",
                ja: "ロアガード・スタジオへようこそ",
                zh: "欢迎来到 Loreguard Studio",
              })}
            </h2>
            <p className="noa-onboard-sub">
              {L4(language, {
                ko: "창작 전문 IDE — 1분 안에 핵심만 안내해 드릴게요",
                en: "Creative IDE — a one-minute tour of the essentials",
                ja: "創作専門IDE — 1分で要点だけご案内します",
                zh: "专业创作 IDE — 一分钟带您了解核心功能",
              })}
            </p>
          </div>
          <button type="button" className="noa-onboard-x" onClick={skip} aria-label={skipLabel}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* steps */}
        <ol className="noa-onboard-steps">
          {/* ① 창작 흐름 — 실재 10단계 */}
          <li className="noa-onboard-step">
            <span className="noa-onboard-ic" aria-hidden="true">
              <Globe size={17} />
            </span>
            <div>
              <strong>
                {L4(language, {
                  ko: "프로젝트 생성부터 출고까지, 한 흐름",
                  en: "One flow — from project setup to release",
                  ja: "プロジェクト作成から出稿まで、ひとつの流れ",
                  zh: "从项目创建到交付，一条创作流",
                })}
              </strong>
              <p>
                {L4(language, {
                  ko: "상단 10단계가 곧 창작 공정입니다. 순서대로 진행해도, 필요한 단계만 골라 써도 됩니다.",
                  en: "The ten tabs above are your creative workflow. Follow them in order, or jump to what you need.",
                  ja: "上部の10ステップが創作工程です。順番に進めても、必要な段階だけ使っても構いません。",
                  zh: "顶部的 10 个步骤就是创作流程。可以按顺序推进，也可以只用需要的步骤。",
                })}
              </p>
              <div className="noa-onboard-flow">
                {flow.map((f, i) => (
                  <Fragment key={f.label}>
                    <span className="noa-onboard-chip">
                      <f.Icon size={12} aria-hidden="true" />
                      <span>{f.label}</span>
                    </span>
                    {i < flow.length - 1 && (
                      <ChevronR size={11} className="noa-onboard-arr" aria-hidden="true" />
                    )}
                  </Fragment>
                ))}
              </div>
            </div>
          </li>

          {/* ② 노아 요청형 — R1 가드레일 문구 일치 */}
          <li className="noa-onboard-step">
            <span className="noa-onboard-ic" aria-hidden="true">
              <Wand size={17} />
            </span>
            <div>
              <strong>
                {L4(language, {
                  ko: "노아는 요청형 — 본문은 작가의 것",
                  en: "Noa on request — the manuscript stays yours",
                  ja: "Noaは依頼型 — 本文は作家のもの",
                  zh: "Noa 按需协助 — 正文始终属于作者",
                })}
              </strong>
              <p>
                {L4(language, {
                  ko: "노아는 요청바와 제안 채택으로 부를 때만 개입합니다. 채택하기 전에는 본문이 바뀌지 않습니다.",
                  en: "Noa steps in only when you ask — via the request bar and suggestion adoption. Nothing changes until you adopt.",
                  ja: "Noaは依頼バーと提案の採択で呼び出した時だけ関与します。採択するまで本文は変わりません。",
                  zh: "Noa 只在您通过请求栏和建议采纳调用时介入。在采纳之前，正文不会被改动。",
                })}
              </p>
            </div>
          </li>

          {/* ③ 확인서/자산화 — 한 줄 (CpJournalPanel 실 기능) */}
          <li className="noa-onboard-step">
            <span className="noa-onboard-ic" aria-hidden="true">
              <Scroll size={17} />
            </span>
            <div>
              <strong>
                {L4(language, {
                  ko: "창작 과정 자동 기록 — 확인서 발급",
                  en: "Your process, on record — certificates included",
                  ja: "創作過程を自動記録 — 確認書を発行",
                  zh: "创作过程自动记录 — 可签发确认书",
                })}
              </strong>
              <p>
                {L4(language, {
                  ko: "창작 과정이 자동 기록되어, 집필 탭의 '확인서'에서 기여도·출처 증빙으로 발급할 수 있습니다.",
                  en: "Your creative process is logged automatically — issue contribution and provenance certificates from the Writing tab.",
                  ja: "創作過程が自動記録され、執筆タブの「確認書」から寄与度・出典の証憑として発行できます。",
                  zh: "创作过程自动记录，可在写作标签的“确认书”中签发贡献度与出处证明。",
                })}
              </p>
            </div>
          </li>
        </ol>

        {/* ④ 시작 방법 2버튼 — 실 동작 배선 (가짜 버튼 금지) */}
        <div className="noa-onboard-actions">
          <button type="button" className="noa-onboard-cta" onClick={handleStartEmpty}>
            <Plus size={15} aria-hidden="true" />
            {L4(language, {
              ko: "빈 프로젝트로 시작",
              en: "Start with an empty project",
              ja: "空のプロジェクトで始める",
              zh: "从空白项目开始",
            })}
          </button>
          <button type="button" className="noa-onboard-alt" onClick={handleStartSample}>
            <Sparkle size={15} aria-hidden="true" />
            {L4(language, {
              ko: "노아 샘플로 시작",
              en: "Start with a Noa sample",
              ja: "Noaサンプルで始める",
              zh: "从 Noa 示例开始",
            })}
          </button>
          <button type="button" className="noa-onboard-skip" onClick={skip}>
            {skipLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
