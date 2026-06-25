"use client";

/* ===========================================================
   RecoveryMounts — [G2-recovery 2026-06-11] 새 6탭 셸 복구 패리티 mount 래퍼.

   기존 컴포넌트 재사용: MultiTabBanner(M1.3)를 새 셸(.eh-app) 위에
   fixed 오버레이로 호스팅한다. 새 셸 루트(.eh-app)는 height:100% flex라
   일반 플로우 삽입 시 레이아웃이 밀리므로 오버레이 방식 채택.
   z-index 60 = .eh-header(50) 위 · 설정 슬라이드오버(70/71)·전역 모달(400) 아래.

   [중복 acquire 금지 — 핵심 제약]
   tab-sync(leader-election) 데이터는 반드시 props 로 주입받는다.
   acquireLeaderController() 는 호출마다 새 컨트롤러를 생성하므로
   (refcount 싱글톤 아님 — leader-election.ts PART 7), 이 컴포넌트에서
   useMultiTab 을 재호출하면 동일 탭이 자기 자신의 lock 에 밀려
   follower 로 오인되는 동시성 버그가 생긴다. StudioShell 이 이미 실행 중인
   단일 useStudioMounts().multiTab 인스턴스를 그대로 전달받는다.

   RecoveryDialog 는 여기서 mount 하지 않는다 — StudioMountProviders 가
   이미 Provider+Dialog 를 새 셸 트리(children 분기)에 mount 하고 있으므로
   재 mount 는 중복 (트리거 결선은 StudioMountProviders.bootRecoveryResult).

   [C] 빈 상태(배너 null)에서 오버레이가 클릭을 가로채지 않도록
       wrapper pointer-events:none + inner auto. a11y/i18n 은 재사용
       컴포넌트(MultiTabBanner role=status·L4 4언어)가 자체 보유.
   =========================================================== */

import React from "react";
import MultiTabBanner from "@/components/studio/MultiTabBanner";
import type { UseMultiTabResult } from "@/hooks/useMultiTab";
import type { AppLanguage } from "@/lib/studio-types";

export interface RecoveryMountsProps {
  /** StudioShell 의 단일 useMultiTab 인스턴스 (재호출 금지 — 위 주석 참조). */
  multiTab: UseMultiTabResult;
  /** 배너 라벨 언어 (L4 — ko/en/ja/zh · AppLanguage 양쪽 허용). */
  language: AppLanguage | string;
}

export default function RecoveryMounts({ multiTab, language }: RecoveryMountsProps) {
  const conflictCount = multiTab.conflicts.length;

  if (conflictCount <= 0) {
    return <div data-testid="loreguard-recovery-mounts" hidden />;
  }

  return (
    <div
      className="lg-recovery-mounts"
      data-testid="loreguard-recovery-mounts"
    >
      {/* 배너 표시 시 반투명 토큰(bg-accent-* 10%)이 헤더 위에 합성되지 않도록 솔리드 백드롭.
          배너가 null(단일 탭 leader·충돌 0)이면 inner 높이 0 → 시각·클릭 영향 없음. */}
      <div
        className="lg-recovery-card"
      >
        <MultiTabBanner
          isLeader={true}
          followerCount={0}
          conflictCount={conflictCount}
          language={language}
        />
      </div>
    </div>
  );
}
