"use client";

import { useMemo, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  Check,
  Chevron,
  ChevronL,
  Edit,
  Film,
  Flag,
  Layers,
  Plus,
  Search,
  Sparkle,
  X,
} from "@/components/loreguard/icons";
import { DirectionShotEditor } from "./TabDirectionShotEditor";
import type { UseLongArcVerifierResult } from "@/hooks/useLongArcVerifier";
import type {
  AppLanguage,
  EpisodeManuscript,
  EpisodeSceneEntry,
  SceneProductionDirection,
} from "@/lib/studio-types";
import {
  PRODUCTION_DIRECTION_FIELDS,
  SCENE_DESIGN_FIELDS,
  TABLE_HEADERS,
  TONE_OPTIONS,
  type DirectionAiSuggestion,
  type ProductionDirectionFieldKey,
  grad,
  productionDirectionValue,
  sceneDesignSummary,
  sceneDesignValue,
  toneColor,
} from "./TabDirection.shared";

const LongArcReportPanel = dynamic(
  () =>
    import("@/components/studio/long-arc/LongArcReportPanel").then(
      (m) => m.LongArcReportPanel,
    ),
  { ssr: false },
);
// ============================================================
// PART 2 — 좌측 내비 (실제 에피소드 씬시트 선택)
// ============================================================
// IDENTITY_SEAL: PART-2 | role=episode-nav | inputs=sheets,episode | outputs=onPick

// ============================================================
// PART 3 — 샷(씬) 편집 행 (인라인 폼 — 추가/수정)
// ============================================================
// IDENTITY_SEAL: PART-3 | role=shot-editor | inputs=draft | outputs=EpisodeSceneEntry

interface ProductionDirectionCardProps {
  value: SceneProductionDirection | undefined;
  onChange: (key: ProductionDirectionFieldKey, value: string) => void;
}

export function ProductionDirectionCard({ value, onChange }: ProductionDirectionCardProps) {
  const fieldStyle = {
    width: "100%",
    minHeight: "68px",
    border: "1px solid var(--line)",
    background: "var(--card-2)",
    borderRadius: "8px",
    padding: "8px 10px",
    color: "var(--ink-1)",
    fontSize: "12px",
    lineHeight: 1.45,
    resize: "vertical" as const,
    fontFamily: "inherit",
  };

  return (
    <section className="pcard" aria-label="연출 방식">
      <div className="pcard-h">
        <Film size={15} />
        연출 방식
        <span className="pill blue">씬시트와 분리 저장</span>
      </div>
      <div className="stat-foot" style={{ marginBottom: "10px" }}>
        장면의 목적이 아니라 화면·소리·움직임·문장 호흡을 정리합니다.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
        {PRODUCTION_DIRECTION_FIELDS.map((field) => (
          <label key={field.key} style={{ display: "grid", gap: "5px" }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--ink-2)" }}>{field.label}</span>
            <textarea
              aria-label={field.label}
              value={productionDirectionValue(value, field.key)}
              placeholder={field.placeholder}
              style={fieldStyle}
              onChange={(event) => onChange(field.key, event.target.value)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// PART 4 — 센터 (필터 + 샷 테이블 + 프레임 스트립)
// ============================================================
// IDENTITY_SEAL: PART-4 | role=center | inputs=scenes,filters | outputs=CRUD callbacks

interface CenterProps {
  episode: number;
  episodeTitle: string;
  scenes: EpisodeSceneEntry[];
  sel: string;
  onSelect: (id: string) => void;
  query: string;
  setQuery: (q: string) => void;
  toneFilter: string;
  setToneFilter: (t: string) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  onAddNew: () => void;
  onConfirm: (entry: EpisodeSceneEntry) => void;
  onDelete: (id: string) => void;
  blankEntry: () => EpisodeSceneEntry;
  // 노아 연출 제안 (PART 1.5)
  aiLoading: boolean;
  aiError: string | null;
  aiSuggestions: DirectionAiSuggestion[];
  onAiSuggest: () => void;
  onAdoptSuggestion: (s: DirectionAiSuggestion) => void;
  onDismissAi: () => void;
  directionModelCard?: ReactNode;
  importCandidateCards?: ReactNode;
  isSceneSurface: boolean;
}

export function DirectionCenter({
  episode,
  episodeTitle,
  scenes,
  sel,
  onSelect,
  query,
  setQuery,
  toneFilter,
  setToneFilter,
  editingId,
  setEditingId,
  onAddNew,
  onConfirm,
  onDelete,
  blankEntry,
  aiLoading,
  aiError,
  aiSuggestions,
  onAiSuggest,
  onAdoptSuggestion,
  onDismissAi,
  directionModelCard,
  importCandidateCards,
  isSceneSurface,
}: CenterProps) {
  // 실제 클라이언트 필터 — 검색(씬명/요약/대사/등장인물) + 톤.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scenes.filter((s) => {
      if (toneFilter && s.tone !== toneFilter) return false;
      if (!q) return true;
      return (
        s.sceneId.toLowerCase().includes(q) ||
        s.sceneName.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.keyDialogue.toLowerCase().includes(q) ||
        s.characters.toLowerCase().includes(q) ||
        sceneDesignSummary(s).toLowerCase().includes(q)
      );
    });
  }, [scenes, query, toneFilter]);

  const toneFilterOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const scene of scenes) {
      if (!scene.tone) continue;
      counts.set(scene.tone, (counts.get(scene.tone) ?? 0) + 1);
    }
    const extraTones = Array.from(counts.keys()).filter((tone) => !TONE_OPTIONS.includes(tone));
    return [...TONE_OPTIONS, ...extraTones].map((tone) => ({
      tone,
      count: counts.get(tone) ?? 0,
    }));
  }, [scenes]);
  const surfaceTitle = isSceneSurface ? "씬시트 모드" : "연출 모드";
  const surfaceSubtitle = isSceneSurface ? `${episode}화 씬 설계표` : `${episode}화 씬 연출 시트`;
  const suggestTitle = isSceneSurface ? "현재 화 흐름 기반 씬 제안" : "현재 화 씬 + 작품 톤/장르 기반 연출 샷 제안";
  const suggestLabel = isSceneSurface ? "노아 씬 제안" : "노아 연출 제안";
  const loadingLabel = isSceneSurface ? "노아 씬 제안 준비 중…" : "노아 연출 제안 준비 중…";
  const suggestionResultTitle = isSceneSurface ? "노아 씬 제안" : "노아 연출 제안";

  return (
    <section className="dr-center">
      <div className="dr-top">
        <div>
          <div className="dr-title">
            {surfaceTitle}<span className="dr-sub">{surfaceSubtitle}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn"
            type="button"
            onClick={onAiSuggest}
            disabled={aiLoading}
            aria-busy={aiLoading}
            title={suggestTitle}
          >
            <Sparkle size={15} />
            {aiLoading ? loadingLabel : suggestLabel}
          </button>
          <button className="btn" type="button" onClick={onAddNew}>
            <Plus size={15} />씬 추가
          </button>
        </div>
      </div>

      <div className="dr-filters">
        <span className="btn" style={{ cursor: "default" }}>
          에피소드 : {episode}화{episodeTitle ? ` · ${episodeTitle}` : ""}
        </span>
        <div className="dr-search">
          <Search size={15} />
          <input
            placeholder="씬, 내용, 의도 검색…"
            aria-label="씬 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="btn dr-tone-filter" style={{ cursor: "pointer" }}>
          <span className="dr-filter-label">톤 보기</span>
          <select
            aria-label="장면 톤 필터"
            value={toneFilter}
            onChange={(e) => setToneFilter(e.target.value)}
            style={{ border: 0, background: "transparent", color: "inherit", font: "inherit", outline: "none" }}
          >
            <option value="">모든 톤</option>
            {toneFilterOptions.map(({ tone, count }) => (
              <option key={tone} value={tone}>
                {`${tone} (${count})`}
              </option>
            ))}
          </select>
          <Chevron size={14} />
        </label>
      </div>

      {directionModelCard}
      {importCandidateCards}

      {/* ---- 노아 제안 결과 (PART 1.5 — 실 로딩/에러/채택) ---- */}
      {aiLoading && (
        <div
          role="status"
          aria-live="polite"
          style={{ padding: "8px 12px", fontSize: "12.5px", color: "var(--ink-3)" }}
        >
          {loadingLabel} ({episode}화 씬 {scenes.length}개 + 작품 톤/장르 컨텍스트)
        </div>
      )}
      {aiError && !aiLoading && (
        <div
          role="alert"
          style={{
            margin: "0 0 10px",
            padding: "9px 12px",
            border: "1px solid var(--c-red)",
            borderRadius: "8px",
            color: "var(--c-red)",
            fontSize: "12.5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <span>{suggestionResultTitle} 실패 — {aiError}</span>
          <button
            type="button"
            className="btn ghost"
            style={{ padding: "3px 6px" }}
            onClick={onDismissAi}
            aria-label="오류 닫기"
            title="닫기"
          >
            <X size={13} />
          </button>
        </div>
      )}
      {aiSuggestions.length > 0 && !aiLoading && (
        <div style={{ margin: "0 0 12px", border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              borderBottom: "1px solid var(--line)",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--ink-2)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Sparkle size={14} />
              {suggestionResultTitle} {aiSuggestions.length}건 — 채택 시 이 화의 씬으로 저장됩니다
            </span>
            <button
              type="button"
              className="btn ghost"
              style={{ padding: "3px 6px" }}
              onClick={onDismissAi}
              aria-label="노아 제안 모두 닫기"
              title="모두 닫기"
            >
              <X size={13} />
            </button>
          </div>
          {aiSuggestions.map((s, i) => (
            <div key={`${s.sceneName}-${i}`} className="dr-trow" style={{ cursor: "default" }}>
              <div className="dr-shot">
                <div className="dr-thumb" style={{ background: grad(i) }} />
                <div>
                  <div className="dr-shot-t">{s.sceneName}</div>
                  <div className="dr-shot-loc">노아 제안</div>
                </div>
              </div>
              <span>
                <span className={"pill " + toneColor(s.tone)}>{s.tone}</span>
              </span>
              <span className="dr-intent">{s.summary}</span>
              <span className="dr-cut">{s.keyDialogue}</span>
              <span className="dr-len">{s.emotionPoint}</span>
              <span>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: "5px 10px" }}
                  onClick={() => onAdoptSuggestion(s)}
                  aria-label={`${s.sceneName} 채택`}
                >
                  <Check size={13} />채택
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="dr-tablewrap">
        <div className="dr-trow dr-thead">
          {TABLE_HEADERS.map((header) => (
            <span key={header}>{header}</span>
          ))}
        </div>

        {scenes.length === 0 && editingId === null && (
          <div style={{ padding: "40px 18px", textAlign: "center", color: "var(--ink-3)", fontSize: "13px" }}>
            이 화에 등록된 씬이 없습니다. 상단 “씬 추가”로 첫 씬을 만들어 보세요.
          </div>
        )}

        {filtered.map((shot, idx) =>
          editingId === shot.sceneId ? (
            <DirectionShotEditor
              key={shot.sceneId}
              initial={shot}
              toneOptions={TONE_OPTIONS}
              thumbBackground={grad(0)}
              onConfirm={onConfirm}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div
              key={shot.sceneId}
              className={"dr-trow" + (sel === shot.sceneId ? " sel" : "")}
              onClick={() => onSelect(shot.sceneId)}
            >
              <div className="dr-shot">
                <div className="dr-thumb" style={{ background: grad(idx) }} />
                <div>
                  <div className="dr-shot-id">{shot.sceneId}</div>
                  <div className="dr-shot-t">{shot.sceneName || "(제목 없음)"}</div>
                  <div className="dr-shot-loc">{shot.characters}</div>
                </div>
              </div>
              <span>
                {shot.tone ? <span className={"pill " + toneColor(shot.tone)}>{shot.tone}</span> : null}
              </span>
              <span className="dr-intent" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <span>{shot.summary}</span>
                {sceneDesignSummary(shot) && (
                  <span className="stat-foot" style={{ fontSize: "11px", lineHeight: 1.45 }}>
                    {sceneDesignSummary(shot)}
                  </span>
                )}
              </span>
              <span className="dr-cut">{shot.keyDialogue}</span>
              <span className="dr-len">{shot.emotionPoint}</span>
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="dr-len" style={{ flex: 1 }}>
                  {shot.nextScene}
                </span>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: "4px 6px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(shot.sceneId);
                  }}
                  aria-label={`${shot.sceneId} 편집`}
                  title="편집"
                >
                  <Edit size={13} />
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: "4px 6px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(shot.sceneId);
                  }}
                  aria-label={`${shot.sceneId} 삭제`}
                  title="삭제"
                >
                  <X size={13} />
                </button>
              </span>
            </div>
          ),
        )}

        {editingId === "__new__" && (
          <DirectionShotEditor
            initial={blankEntry()}
            toneOptions={TONE_OPTIONS}
            thumbBackground={grad(0)}
            onConfirm={onConfirm}
            onCancel={() => setEditingId(null)}
          />
        )}

        {scenes.length > 0 && filtered.length === 0 && editingId === null && (
          <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--ink-3)", fontSize: "12.5px" }}>
            검색·필터 조건에 맞는 씬이 없습니다.
          </div>
        )}
      </div>

      <div className="dr-strip">
        <div className="dr-frames">
          {filtered.map((shot, idx) => (
            <div
              key={shot.sceneId}
              className={"dr-frame" + (sel === shot.sceneId ? " sel" : "")}
              onClick={() => onSelect(shot.sceneId)}
            >
              <div className="dr-frame-id">{shot.sceneId}</div>
              <div className="dr-frame-thumb" style={{ background: grad(idx) }} />
              <div className="dr-frame-foot">{shot.sceneName || "—"}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PART 5 — 우측 검수 패널 (실제 씬시트 집계만)
// ============================================================
// IDENTITY_SEAL: PART-5 | role=review-panel | inputs=scenes,sel | outputs=JSX

interface PanelProps {
  episode: number;
  episodeTitle: string;
  scenes: EpisodeSceneEntry[];
  selected: EpisodeSceneEntry | undefined;
  panelTitle: string;
  panelAriaLabel: string;
  open: boolean;
  isSheet: boolean;
  onToggle: () => void;
  /** [Z1c-mid-ports] 장편 아크 점검 — 루트 단일 인스턴스 주입 (패널 내 훅 재호출 금지) */
  longArc: UseLongArcVerifierResult;
  episodes: EpisodeManuscript[];
  language: AppLanguage;
  isKO: boolean;
}

export function DirectionPanel({
  episode,
  episodeTitle,
  scenes,
  selected,
  panelTitle,
  panelAriaLabel,
  open,
  isSheet,
  onToggle,
  longArc,
  episodes,
  language,
  isKO,
}: PanelProps) {
  // 톤 분포 — 실제 씬 데이터 집계 (날조 EMO % 아님).
  const toneCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of scenes) {
      if (!s.tone) continue;
      m.set(s.tone, (m.get(s.tone) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [scenes]);
  const collapsedSummary = [
    { label: "씬", value: String(scenes.length), tone: scenes.length > 0 ? "green" : "amber" },
    { label: "톤", value: String(toneCounts.length), tone: toneCounts.length > 0 ? "blue" : "gray" },
    { label: "선택", value: selected?.sceneId ? "ON" : "대기", tone: selected?.sceneId ? "green" : "amber" },
  ];

  if (!open) {
    return (
      <aside id="lg-direction-panel" className="dr-panel collapsed" aria-label={`${panelTitle} (접힘)`}>
        <button
          type="button"
          className="wd-panel-toggle"
          aria-label={`${panelTitle} 펼치기`}
          title={`${panelTitle} 펼치기`}
          onClick={onToggle}
        >
          <Film size={17} aria-hidden="true" />
        </button>
        <span className="wd-vlabel">보조 패널</span>
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
      id="lg-direction-panel"
      className="dr-panel"
      aria-label={panelAriaLabel}
      role={isSheet ? "dialog" : undefined}
      aria-modal={isSheet ? true : undefined}
    >
      <div className="tpanel-head">
        <span>{panelTitle}</span>
        <button
          type="button"
          className="wd-panel-toggle"
          aria-label={`${panelTitle} 접기`}
          title={`${panelTitle} 접기`}
          onClick={onToggle}
        >
          <ChevronL size={17} aria-hidden="true" />
        </button>
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <Film size={15} />
          씬시트 상태
        </div>
        <div className="stat-row">
          <span>현재 에피소드</span>
          <b>
            {episode}화{episodeTitle ? ` · ${episodeTitle}` : ""}
          </b>
        </div>
        <div className="stat-row">
          <span>등록된 씬</span>
          <b>{scenes.length}개</b>
        </div>
      </div>

      {toneCounts.length > 0 && (
        <div className="pcard">
          <div className="pcard-h">
            <Layers size={15} />
            장면 톤 분포
          </div>
          <div className="dr-emo">
            {toneCounts.map(([tone, n]) => (
              <span key={tone} className={"pill " + toneColor(tone)}>
                {tone} {n}
              </span>
            ))}
          </div>
          <div className="dr-emobar">
            {toneCounts.map(([tone, n]) => {
              const c = toneColor(tone);
              return (
                <span key={tone} style={{ flex: n, background: c === "gray" ? "var(--ink-3)" : "var(--c-" + c + ")" }} />
              );
            })}
          </div>
        </div>
      )}

      {/* [Z1c-mid-ports] 장편 아크 점검 — 기존 5축 long-arc-verifier 재사용 (수동 실행·판단용).
          데이터 부족(저장 원고 0) 시 정직 빈 상태 — 버튼 미노출 (가짜 실행 금지). */}
      <div className="pcard">
        <div className="pcard-h">
          <Flag size={15} />
          {isKO ? "장편 아크 점검" : "Long-arc check"}
          <span className="pill gray">{isKO ? "검토 참고" : "review aid"}</span>
        </div>
        {episodes.length === 0 ? (
          <div className="stat-foot">
            {isKO
              ? "저장된 회차 원고가 없습니다 — 집필 탭에서 원고를 저장하면 시놉시스·캐릭터·룰·떡밥·텐션을 함께 점검할 수 있습니다."
              : "No saved episode manuscripts — save drafts in the Writing tab to review synopsis, character, rules, foreshadowing, and tension together."}
          </div>
        ) : (
          <>
            <button
              type="button"
              className="btn"
              style={{ width: "100%", justifyContent: "center" }}
              disabled={longArc.loading}
              onClick={longArc.refresh}
              aria-label={
                isKO
                  ? "장편 아크 점검 실행 — 결과는 검토 카드로 표시"
                  : "Run the long-arc check — results shown as a review card"
              }
            >
              <Flag size={14} />
              {longArc.loading
                ? isKO ? "점검 중…" : "Checking…"
                : longArc.report
                  ? isKO ? "다시 점검" : "Re-run check"
                  : isKO
                    ? `장편 아크 점검 (${episodes.length}화)`
                    : `Run long-arc check (${episodes.length} eps)`}
            </button>
            {longArc.error && (
              <div className="stat-foot" role="alert" style={{ color: "var(--c-amber)", marginTop: 6 }}>
                {isKO ? "점검 실패: " : "Check failed: "}
                {longArc.error}
              </div>
            )}
            {(longArc.report || longArc.loading) && (
              <div style={{ marginTop: 8 }}>
                <LongArcReportPanel
                  report={longArc.report}
                  loading={longArc.loading}
                  language={language}
                  episodes={episodes}
                  onRefresh={longArc.refresh}
                />
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <div className="pcard">
          <div className="pcard-h">
            <Check size={15} />
            선택 씬
          </div>
          <div className="stat-row">
            <span>씬 #</span>
            <b>{selected.sceneId}</b>
          </div>
          <div className="stat-foot" style={{ marginTop: "8px" }}>
            {selected.sceneName || "(제목 없음)"}
          </div>
          {selected.emotionPoint && (
            <div className="stat-foot" style={{ marginTop: "6px" }}>
              감정 포인트 · {selected.emotionPoint}
            </div>
          )}
          <div className="stat-foot" style={{ marginTop: "10px", display: "grid", gap: "6px" }}>
            <b style={{ color: "var(--ink-1)", fontSize: "12px" }}>씬 8영역</b>
            {SCENE_DESIGN_FIELDS.map(({ key, label }) => {
              const value = sceneDesignValue(selected, key);
              return (
                <div key={key} className="stat-row" style={{ gap: "10px" }}>
                  <span>{label}</span>
                  <b style={{ textAlign: "right", overflowWrap: "anywhere" }}>{value || "미작성"}</b>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}


