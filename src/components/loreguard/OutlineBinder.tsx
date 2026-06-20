"use client";

/* ===========================================================
   OutlineBinder — 집필 좌측 바인더 트리 (read-only navigation)

   역할:
   - currentSession.config.episodeSceneSheets[] 를 회차(episode) → 씬(scene) 계층으로
     렌더한다. 회차 노드는 expand/collapse 가능하고, 접힘 상태는 localStorage
     'noa-lg-outline' 에 영속한다.
   - 항목 클릭 = 읽기 전용 내비게이션. window CustomEvent 'loreguard:navigate-scene'
     (detail { episode, sceneId? }) 를 dispatch 한다 — 편집은 하지 않는다(QB owner=TabWriting).
   - 현재 회차(currentEpisode) 는 aria-current="true" + 시각 하이라이트로 표시한다.

   데이터 정직성 (날조 금지):
   - episodeSceneSheets 가 없거나 비어 있으면 빈 상태 안내만 표시한다.
   - 특정 회차에 scenes 가 없으면 그 회차는 '씬 없음'으로 표시하고 회차 노드만 렌더한다
     (가짜 씬을 만들지 않는다).
   - 씬 sheet 에 없는 회차라도 currentEpisode 가 sheet 목록 밖이면, 사용자가 현재
     위치를 잃지 않도록 currentEpisode 단독 회차 노드를 합성해 표시한다(씬 0개).

   스타일: loreguard.css `.eh-app` 토큰(--ink-*, --line, --primary, --rail-bg 등)만 사용한다.
   다크 테마는 .eh-app[data-theme="dark"] 상속으로 자동 동작(자체 색 하드코딩 금지).

   contract: default export. props { config, currentEpisode } 는 모두 선택 —
   미지정 시 useStudio() 컨텍스트(currentSession.config / .config.episode)에서 읽는다.
   호출부(TabWriting, QB owner)는 <OutlineBinder /> 로 무-props 마운트하므로 컨텍스트
   폴백이 기본 경로다. 부수효과는 dispatch('loreguard:navigate-scene') + localStorage 뿐.
   =========================================================== */

import { useCallback, useMemo, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import type { AppLanguage, EpisodeSceneSheet, StoryConfig } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { ChevronR, Chevron, Scroll, Layers } from "@/components/loreguard/icons";

// ============================================================
// PART 1 — Props & 영속 (localStorage 'noa-lg-outline')
// ============================================================

export interface OutlineBinderProps {
  /** 현재 세션 config — episodeSceneSheets 출처. 미지정 시 useStudio() 컨텍스트에서 읽음. */
  config?: StoryConfig | null;
  /** 현재 작업 중인 회차 (하이라이트 + aria-current). 미지정 시 컨텍스트 config.episode. */
  currentEpisode?: number | null;
  /** 표시 언어 (L4). 미지정 시 컨텍스트 language, 그것도 없으면 KO. */
  language?: AppLanguage;
}

/** 접힌(collapsed) 회차 집합 영속 키 — 프로젝트 무관 UI 환경설정(setConfig 불필요). */
const COLLAPSE_KEY = "noa-lg-outline";

/** 접힌 회차 번호 배열 로드 (storage 불가/파싱 실패 = 빈 집합 — 기본 펼침). */
function readCollapsed(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(COLLAPSE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((n): n is number => typeof n === "number"));
  } catch {
    return new Set();
  }
}

/** 접힌 회차 집합 영속 (storage 불가 시 세션 내 상태만 유지 — 기능은 동작). */
function writeCollapsed(set: Set<number>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...set]));
  } catch {
    /* quota / private mode — 무시 (상태는 메모리에 유지) */
  }
}

// ============================================================
// PART 2 — 파생 (sheet 목록 → 정렬된 회차 노드)
// ============================================================

interface SceneRow {
  sceneId: string;
  sceneName: string;
  tone: string;
}

interface EpisodeNode {
  episode: number;
  title: string;
  scenes: SceneRow[];
  /** sheet 부재(=현재 회차 합성)인지 — 표시에는 영향 없으나 디버깅용. */
  synthetic: boolean;
}

/** sheet 1개 → 정렬된 SceneRow[] (sceneId 누락 행은 안정 인덱스 키로 보강). */
function toSceneRows(sheet: EpisodeSceneSheet): SceneRow[] {
  const scenes = sheet.scenes ?? [];
  return scenes.map((s, i) => ({
    sceneId: (s.sceneId && s.sceneId.trim()) || `${sheet.episode}-${i + 1}`,
    sceneName: (s.sceneName && s.sceneName.trim()) || "",
    tone: (s.tone && s.tone.trim()) || "",
  }));
}

/**
 * episodeSceneSheets → 회차 오름차순 EpisodeNode[].
 * currentEpisode 가 sheet 목록에 없으면(현재 위치 보존) 씬 0개 노드를 합성해 포함.
 */
function buildEpisodeNodes(
  sheets: readonly EpisodeSceneSheet[],
  currentEpisode: number | null | undefined,
  lang: AppLanguage,
): EpisodeNode[] {
  const epLabel = L4(lang, { ko: "회차", en: "Episode", ja: "話", zh: "话" });
  const byEpisode = new Map<number, EpisodeNode>();

  for (const sheet of sheets) {
    if (typeof sheet?.episode !== "number") continue;
    byEpisode.set(sheet.episode, {
      episode: sheet.episode,
      title: (sheet.title && sheet.title.trim()) || `${epLabel} ${sheet.episode}`,
      scenes: toSceneRows(sheet),
      synthetic: false,
    });
  }

  // 현재 회차가 sheet 에 없으면 합성 노드 추가 (사용자 위치 보존 — 가짜 씬 없음).
  if (typeof currentEpisode === "number" && !byEpisode.has(currentEpisode)) {
    byEpisode.set(currentEpisode, {
      episode: currentEpisode,
      title: `${epLabel} ${currentEpisode}`,
      scenes: [],
      synthetic: true,
    });
  }

  return [...byEpisode.values()].sort((a, b) => a.episode - b.episode);
}

// ============================================================
// PART 3 — Component
// ============================================================

/**
 * OutlineBinder — 집필 좌측 바인더(아웃라인) 트리.
 * 회차 → 씬 read-only 내비. 클릭 시 'loreguard:navigate-scene' dispatch.
 */
export default function OutlineBinder(props: OutlineBinderProps = {}) {
  // 컨텍스트 폴백 — props 미지정 시 useStudio() 에서 읽는다(무-props 호출부 = 기본 경로).
  const studio = useStudio();
  const config = props.config !== undefined ? props.config : studio.currentSession?.config ?? null;
  const currentEpisode =
    props.currentEpisode !== undefined ? props.currentEpisode : config?.episode ?? null;
  const language: AppLanguage = props.language ?? studio.language ?? "KO";

  const [collapsed, setCollapsed] = useState<Set<number>>(() => readCollapsed());

  // 라벨 (4-언어)
  const labels = useMemo(
    () => ({
      title: L4(language, { ko: "바인더", en: "Binder", ja: "バインダー", zh: "活页夹" }),
      epLabel: L4(language, { ko: "회차", en: "Ep.", ja: "話", zh: "话" }),
      noScenes: L4(language, { ko: "씬 없음", en: "No scenes", ja: "シーンなし", zh: "无场景" }),
      emptyTitle: L4(language, {
        ko: "씬시트가 아직 없습니다",
        en: "No scene sheets yet",
        ja: "シーンシートがまだありません",
        zh: "尚无场景表",
      }),
      emptyHint: L4(language, {
        ko: "회차별 씬시트를 만들면 여기에 바인더 트리로 표시됩니다.",
        en: "Create per-episode scene sheets to see them as a binder tree here.",
        ja: "話ごとのシーンシートを作成すると、ここにバインダーツリーとして表示されます。",
        zh: "为每话创建场景表后，将在此处以活页夹树显示。",
      }),
      expandAria: L4(language, { ko: "회차 펼치기", en: "Expand episode", ja: "話を展開", zh: "展开话" }),
      collapseAria: L4(language, { ko: "회차 접기", en: "Collapse episode", ja: "話を折りたたむ", zh: "折叠话" }),
      currentAria: L4(language, { ko: "현재 회차", en: "Current episode", ja: "現在の話", zh: "当前话" }),
    }),
    [language],
  );

  const episodeNodes = useMemo(
    () => buildEpisodeNodes(config?.episodeSceneSheets ?? [], currentEpisode ?? null, language),
    [config?.episodeSceneSheets, currentEpisode, language],
  );

  // 회차 펼침/접힘 토글 (+ 영속)
  const toggleEpisode = useCallback((episode: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(episode)) next.delete(episode);
      else next.add(episode);
      writeCollapsed(next);
      return next;
    });
  }, []);

  // 내비게이션 dispatch (읽기 전용 — 편집 X). 실패해도 트리 렌더는 유지.
  const navigate = useCallback((episode: number, sceneId?: string) => {
    try {
      window.dispatchEvent(
        new CustomEvent("loreguard:navigate-scene", {
          detail: sceneId !== undefined ? { episode, sceneId } : { episode },
        }),
      );
    } catch (err) {
      logger.warn("OutlineBinder", "navigate dispatch failed", err);
    }
  }, []);

  // 빈 상태 — 합성 노드조차 없을 때만(= sheet 0개 + currentEpisode null)
  if (episodeNodes.length === 0) {
    return (
      <nav className="lg-binder" aria-label={labels.title}>
        <div className="lg-binder-head">
          <Layers size={15} aria-hidden="true" />
          <span>{labels.title}</span>
        </div>
        <div className="lg-binder-empty" role="status">
          <p className="lg-binder-empty-t">{labels.emptyTitle}</p>
          <p className="lg-binder-empty-h">{labels.emptyHint}</p>
        </div>
      </nav>
    );
  }

  return (
    <nav className="lg-binder" aria-label={labels.title}>
      <div className="lg-binder-head">
        <Layers size={15} aria-hidden="true" />
        <span>{labels.title}</span>
      </div>
      <ul className="lg-binder-tree" role="tree" aria-label={labels.title}>
        {episodeNodes.map((node) => {
          const isCurrent = node.episode === (currentEpisode ?? null);
          const isOpen = !collapsed.has(node.episode);
          const hasScenes = node.scenes.length > 0;
          const epTreeLabel = `${labels.epLabel} ${node.episode} — ${node.title}`;
          return (
            <li
              key={node.episode}
              role="treeitem"
              aria-expanded={hasScenes ? isOpen : undefined}
              aria-selected={isCurrent}
              aria-current={isCurrent ? "true" : undefined}
            >
              {/* 회차 행 — 토글 버튼(expand) + 라벨 버튼(navigate to episode) */}
              <div className={"lg-binder-ep" + (isCurrent ? " on" : "")}>
                <button
                  type="button"
                  className="lg-binder-twist"
                  aria-label={isOpen ? labels.collapseAria : labels.expandAria}
                  aria-expanded={hasScenes ? isOpen : undefined}
                  disabled={!hasScenes}
                  onClick={() => hasScenes && toggleEpisode(node.episode)}
                >
                  {hasScenes ? (
                    isOpen ? <Chevron size={13} aria-hidden="true" /> : <ChevronR size={13} aria-hidden="true" />
                  ) : (
                    <span className="lg-binder-twist-dot" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  className="lg-binder-ep-label"
                  title={epTreeLabel}
                  onClick={() => navigate(node.episode)}
                >
                  <span className="lg-binder-ep-num">
                    {labels.epLabel} {node.episode}
                  </span>
                  <span className="lg-binder-ep-title">{node.title}</span>
                  {isCurrent && (
                    <span className="lg-binder-cur" aria-label={labels.currentAria}>
                      ●
                    </span>
                  )}
                </button>
              </div>

              {/* 씬 목록 (펼침 시) */}
              {hasScenes && isOpen && (
                <ul className="lg-binder-scenes" role="group" aria-label={epTreeLabel}>
                  {node.scenes.map((scene) => (
                    <li key={scene.sceneId} role="treeitem" aria-selected={false}>
                      <button
                        type="button"
                        className="lg-binder-scene"
                        title={scene.sceneName || scene.sceneId}
                        onClick={() => navigate(node.episode, scene.sceneId)}
                      >
                        <Scroll size={12} aria-hidden="true" />
                        <span className="lg-binder-scene-id">{scene.sceneId}</span>
                        <span className="lg-binder-scene-name">
                          {scene.sceneName || <em className="lg-binder-untitled">{labels.noScenes}</em>}
                        </span>
                        {scene.tone && <span className="lg-binder-tone">{scene.tone}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* 씬 없는 회차 — 정직 안내 (가짜 씬 없음) */}
              {!hasScenes && (
                <div className="lg-binder-noscenes" role="note">
                  {labels.noScenes}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
