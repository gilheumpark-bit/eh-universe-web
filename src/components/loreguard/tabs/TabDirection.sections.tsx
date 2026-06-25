"use client";

import { useMemo, type ReactNode } from "react";
import {
  Check,
  Chevron,
  Edit,
  Film,
  Plus,
  Search,
  Sparkle,
  X,
} from "@/components/loreguard/icons";
import { DirectionShotEditor } from "./TabDirectionShotEditor";
import type {
  EpisodeSceneEntry,
  SceneProductionDirection,
} from "@/lib/studio-types";
import {
  PRODUCTION_DIRECTION_FIELDS,
  TABLE_HEADERS,
  TONE_OPTIONS,
  type DirectionAiSuggestion,
  type ProductionDirectionFieldKey,
  productionDirectionValue,
  sceneDesignSummary,
  toneColor,
} from "./TabDirection.shared";

const DIRECTION_GRADIENT_COUNT = 6;

function directionGradientClass(index: number): string {
  return `dr-grad-${index % DIRECTION_GRADIENT_COUNT}`;
}

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
  return (
    <section className="pcard dr-production-card" aria-label="연출 방식">
      <div className="pcard-h">
        <Film size={15} />
        연출 방식
        <span className="pill blue">씬시트와 분리 저장</span>
      </div>
      <div className="stat-foot dr-direction-note">
        장면의 목적이 아니라 화면·소리·움직임·문장 호흡을 정리합니다.
      </div>
      <div className="dr-production-grid">
        {PRODUCTION_DIRECTION_FIELDS.map((field) => (
          <label key={field.key} className="dr-production-field">
            <span className="dr-production-label">{field.label}</span>
            <textarea
              aria-label={field.label}
              value={productionDirectionValue(value, field.key)}
              placeholder={field.placeholder}
              className="dr-production-textarea"
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
        <div className="dr-top-actions">
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
        <span className="btn dr-static-chip">
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
        <label className="btn dr-tone-filter">
          <span className="dr-filter-label">톤 보기</span>
          <select
            aria-label="장면 톤 필터"
            value={toneFilter}
            onChange={(e) => setToneFilter(e.target.value)}
            className="dr-select"
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
          className="dr-ai-status"
        >
          {loadingLabel} ({episode}화 씬 {scenes.length}개 + 작품 톤/장르 컨텍스트)
        </div>
      )}
      {aiError && !aiLoading && (
        <div
          role="alert"
          className="dr-ai-alert"
        >
          <span>{suggestionResultTitle} 실패 — {aiError}</span>
          <button
            type="button"
            className="btn ghost dr-compact-btn"
            onClick={onDismissAi}
            aria-label="오류 닫기"
            title="닫기"
          >
            <X size={13} />
          </button>
        </div>
      )}
      {aiSuggestions.length > 0 && !aiLoading && (
        <div className="dr-suggestions">
          <div className="dr-suggestion-head">
            <span className="dr-suggestion-title">
              <Sparkle size={14} />
              {suggestionResultTitle} {aiSuggestions.length}건 — 채택 시 이 화의 씬으로 저장됩니다
            </span>
            <button
              type="button"
              className="btn ghost dr-compact-btn"
              onClick={onDismissAi}
              aria-label="노아 제안 모두 닫기"
              title="모두 닫기"
            >
              <X size={13} />
            </button>
          </div>
          {aiSuggestions.map((s, i) => (
            <div key={`${s.sceneName}-${i}`} className="dr-trow dr-trow-static">
              <div className="dr-shot">
                <div className={`dr-thumb ${directionGradientClass(i)}`} />
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
                  className="btn dr-adopt-btn"
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
          <div className="dr-empty">
            이 화에 등록된 씬이 없습니다. 상단 “씬 추가”로 첫 씬을 만들어 보세요.
          </div>
        )}

        {filtered.map((shot, idx) =>
          editingId === shot.sceneId ? (
            <DirectionShotEditor
              key={shot.sceneId}
              initial={shot}
              toneOptions={TONE_OPTIONS}
              thumbClassName={directionGradientClass(0)}
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
                <div className={`dr-thumb ${directionGradientClass(idx)}`} />
                <div>
                  <div className="dr-shot-id">{shot.sceneId}</div>
                  <div className="dr-shot-t">{shot.sceneName || "(제목 없음)"}</div>
                  <div className="dr-shot-loc">{shot.characters}</div>
                </div>
              </div>
              <span>
                {shot.tone ? <span className={"pill " + toneColor(shot.tone)}>{shot.tone}</span> : null}
              </span>
              <span className="dr-intent dr-intent-stack">
                <span>{shot.summary}</span>
                {sceneDesignSummary(shot) && (
                  <span className="stat-foot dr-design-summary">
                    {sceneDesignSummary(shot)}
                  </span>
                )}
              </span>
              <span className="dr-cut">{shot.keyDialogue}</span>
              <span className="dr-len">{shot.emotionPoint}</span>
              <span className="dr-row-actions">
                <span className="dr-len dr-len-fill">
                  {shot.nextScene}
                </span>
                <button
                  type="button"
                  className="btn ghost dr-icon-btn"
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
                  className="btn ghost dr-icon-btn"
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
            thumbClassName={directionGradientClass(0)}
            onConfirm={onConfirm}
            onCancel={() => setEditingId(null)}
          />
        )}

        {scenes.length > 0 && filtered.length === 0 && editingId === null && (
          <div className="dr-empty dr-empty-compact">
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
              <div className={`dr-frame-thumb ${directionGradientClass(idx)}`} />
              <div className="dr-frame-foot">{shot.sceneName || "—"}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

