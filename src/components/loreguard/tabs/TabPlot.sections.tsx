"use client";

import { Branch, ChevronL, Flag, Layers, Map, Plus, Settings, Wand } from "@/components/loreguard/icons";
import type { BeatSuggestion } from "./TabPlot.shared";

interface PlotEmptyStateProps {
  createNewSession: () => unknown;
  openQuickStart: () => unknown;
}

export function PlotEmptyState({ createNewSession, openQuickStart }: PlotEmptyStateProps) {
  return (
    <div className="pl-grid">
      <section className="pl-center" style={{ gridColumn: "1 / -1" }}>
        <div className="pl-top">
          <div>
            <div className="pl-title">
              <Branch size={19} style={{ color: "var(--primary)" }} />
              메인 시나리오 모드
            </div>
            <div className="pl-sub">아직 작업할 프로젝트가 없습니다. 새 프로젝트를 시작하세요.</div>
          </div>
        </div>
        <div className="pl-board" style={{ display: "flex", gap: 12 }}>
          <button type="button" className="btn" onClick={() => createNewSession()}>
            <Plus size={15} />
            새 프로젝트 시작
          </button>
          <button type="button" className="btn ghost" onClick={() => openQuickStart()}>
            <Wand size={15} />
            퀵스타트
          </button>
        </div>
        <div className="pl-board" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {[
            ["전환점", "도입, 상승, 위기, 결말의 굵은 사건을 잡습니다."],
            ["갈등 축", "인물 욕망과 세계 규칙이 충돌하는 지점을 표시합니다."],
            ["회수 장치", "복선, 약속, 미해결 정보를 출고 전까지 추적합니다."],
          ].map(([title, body]) => (
            <article key={title} className="pl-card" style={{ minHeight: 0 }}>
              <div className="pl-card-title">{title}</div>
              <div className="pl-card-desc">{body}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

interface PlotRailProps {
  railOpen: boolean;
  isRailSheet: boolean;
  projectName: string;
  currentEpisode: number;
  beatCount: number;
  aiBusy: boolean;
  aiError: string | null;
  aiSuggestions: BeatSuggestion[];
  aiFromCache: boolean;
  toggleRail: () => void;
  closeRailIfSheet: () => void;
  openSettings: () => void;
  addBeat: () => void;
  suggestBeats: () => void;
  adoptSuggestion: (suggestion: BeatSuggestion) => void;
  ignoreSuggestion: (suggestion: BeatSuggestion) => void;
}

export function PlotRail({
  railOpen,
  isRailSheet,
  projectName,
  currentEpisode,
  beatCount,
  aiBusy,
  aiError,
  aiSuggestions,
  aiFromCache,
  toggleRail,
  closeRailIfSheet,
  openSettings,
  addBeat,
  suggestBeats,
  adoptSuggestion,
  ignoreSuggestion,
}: PlotRailProps) {
  const collapsedSummary = [
    { label: "회차", value: `${currentEpisode}화`, tone: "blue" },
    { label: "비트", value: String(beatCount), tone: beatCount > 0 ? "green" : "amber" },
    {
      label: "제안",
      value: aiBusy ? "중" : String(aiSuggestions.length),
      tone: aiBusy ? "blue" : aiSuggestions.length > 0 ? "green" : "gray",
    },
  ];

  if (!railOpen) {
    return (
      <aside id="lg-plot-rail" className="pl-rail collapsed" aria-label="메인 시나리오 개요 레일 (접힘)">
        <button
          type="button"
          className="wd-panel-toggle"
          aria-label="메인 시나리오 개요 레일 펼치기"
          title="메인 시나리오 개요 레일 펼치기"
          onClick={toggleRail}
        >
          <Map size={17} aria-hidden="true" />
        </button>
        <span className="wd-vlabel">메인 시나리오</span>
        <span
          className="wd-collapsed-summary"
          aria-label={collapsedSummary.map((item) => `${item.label} ${item.value}`).join(", ")}
        >
          {collapsedSummary.map((item) => (
            <span key={`${item.label}:${item.value}`} className={`wd-mini-chip ${item.tone}`}>
              <small>{item.label}</small>
              <b>{item.value}</b>
            </span>
          ))}
        </span>
      </aside>
    );
  }

  return (
    <aside
      id="lg-plot-rail"
      className="pl-rail"
      aria-label="메인 시나리오 개요 레일"
      role={isRailSheet ? "dialog" : undefined}
      aria-modal={isRailSheet ? true : undefined}
    >
      <div className="pl-rail-head">
        <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <Map size={17} />
          메인 시나리오 개요
        </span>
        <button
          type="button"
          className="wd-panel-toggle"
          aria-label="메인 시나리오 개요 레일 접기"
          title="메인 시나리오 개요 레일 접기"
          onClick={toggleRail}
        >
          <ChevronL size={17} aria-hidden="true" />
        </button>
      </div>
      <div className="pl-proj">
        <div className="pl-proj-k">프로젝트</div>
        <div className="pl-proj-v">{projectName}</div>
        <button
          type="button"
          className="btn"
          style={{ width: "100%", justifyContent: "center", marginTop: "10px" }}
          onClick={() => {
            openSettings();
            closeRailIfSheet();
          }}
        >
          <Settings size={14} />
          설정
        </button>
      </div>
      <div className="pl-stat purple">
        <span className="pl-stat-ic">
          <Flag size={16} />
        </span>
        <div>
          <div className="pl-stat-k">현재 화</div>
          <div className="pl-stat-v">{currentEpisode}화</div>
        </div>
      </div>
      <div className="pl-stat blue">
        <span className="pl-stat-ic">
          <Layers size={16} />
        </span>
        <div>
          <div className="pl-stat-k">비트 수</div>
          <div className="pl-stat-v">{beatCount}개</div>
        </div>
      </div>
      <button
        type="button"
        className="btn ghost"
        style={{ width: "100%", justifyContent: "center" }}
        onClick={() => {
          addBeat();
          closeRailIfSheet();
        }}
      >
        <Plus size={15} />
        비트 추가
      </button>

      <button
        type="button"
        className="btn"
        style={{ width: "100%", justifyContent: "center" }}
        onClick={suggestBeats}
        disabled={aiBusy}
        aria-busy={aiBusy}
      >
        <Wand size={15} />
        {aiBusy ? "제안 준비 중…" : "노아 비트 제안"}
      </button>

      {aiError && (
        <div className="pl-citem" role="alert">
          <div className="pl-citem-q" style={{ color: "var(--c-amber)" }}>
            {aiError}
          </div>
        </div>
      )}

      {aiSuggestions.length > 0 && (
        <>
          <div className="pl-proj-k" style={{ marginTop: 2 }}>
            노아 제안 ({aiSuggestions.length})
            {aiFromCache && (
              <span style={{ opacity: 0.6, marginLeft: 4 }} title="로컬 캐시에서 즉시 불러옴 (24시간 보관)">
                · 캐시
              </span>
            )}
          </div>
          {aiSuggestions.map((suggestion, index) => (
            <div key={`${index}-${suggestion.title}`} className="pl-citem">
              <div className="pl-citem-top">
                <span className="pl-citem-t">{suggestion.title}</span>
              </div>
              {suggestion.summary && <div className="pl-citem-q">{suggestion.summary}</div>}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1, justifyContent: "center", fontSize: 12, padding: "5px 10px" }}
                  onClick={() => {
                    adoptSuggestion(suggestion);
                    closeRailIfSheet();
                  }}
                >
                  채택
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ flex: 1, justifyContent: "center", fontSize: 12, padding: "5px 10px" }}
                  onClick={() => {
                    ignoreSuggestion(suggestion);
                    closeRailIfSheet();
                  }}
                >
                  무시
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </aside>
  );
}
