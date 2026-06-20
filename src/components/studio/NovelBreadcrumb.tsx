"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, FolderOpen, FileText, Film } from "lucide-react";
import type { Project, ChatSession, AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";

export type NovelBreadcrumbTarget = "project" | "episode" | "scene";

export interface NovelBreadcrumbProps {
  project: Project | null;
  currentSession: ChatSession | null;
  /** Editor cursor's current scene (1-based, matches SceneSheet scene IDs). */
  currentSceneIndex?: number;
  /** Editor cursor's current paragraph (optional). Shown as a tail segment. */
  currentParagraphIndex?: number;
  language: AppLanguage;
  onNavigate: (target: NovelBreadcrumbTarget) => void;
  className?: string;
  /** Hide in Zen / focus mode. Parent can toggle. */
  hidden?: boolean;
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=NovelBreadcrumbProps

// ============================================================
// PART 2 — Responsive hook (narrow viewport detection)
// ============================================================

/** Collapse middle segments when viewport < 640px. */
function useIsNarrow(breakpoint = 640): boolean {
  const [narrow, setNarrow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setNarrow(window.innerWidth < breakpoint);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return narrow;
}

// IDENTITY_SEAL: PART-2 | role=ResponsiveHook | inputs=breakpoint | outputs=boolean

// ============================================================
// PART 3 — Label builders (4-language L4)
// ============================================================

interface SegmentLabels {
  project: string;
  episode: string;
  scene: string;
  paragraph: string;
  untitledProject: string;
  untitledEpisode: string;
}

function buildLabels(language: AppLanguage): SegmentLabels {
  return {
    project: L4(language, { ko: "프로젝트", en: "Project", ja: "プロジェクト", zh: "项目" }),
    episode: L4(language, { ko: "에피소드", en: "Episode", ja: "エピソード", zh: "章节" }),
    scene: L4(language, { ko: "씬", en: "Scene", ja: "シーン", zh: "场景" }),
    paragraph: L4(language, { ko: "단락", en: "Paragraph", ja: "段落", zh: "段落" }),
    untitledProject: L4(language, {
      ko: "(제목 없음)",
      en: "(Untitled)",
      ja: "(無題)",
      zh: "(未命名)",
    }),
    untitledEpisode: L4(language, {
      ko: "(에피소드 없음)",
      en: "(No Episode)",
      ja: "(エピソードなし)",
      zh: "(无章节)",
    }),
  };
}

// IDENTITY_SEAL: PART-3 | role=LabelBuilder | inputs=AppLanguage | outputs=SegmentLabels

// ============================================================
// PART 4 — Segment builder (derive breadcrumb nodes from props)
// ============================================================

interface BreadcrumbSegment {
  key: string;
  target: NovelBreadcrumbTarget | null; // null → non-clickable tail (paragraph)
  label: string;
  title: string; // tooltip (full text)
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: "primary" | "secondary" | "tertiary";
}

function buildSegments(
  project: Project | null,
  currentSession: ChatSession | null,
  currentSceneIndex: number | undefined,
  currentParagraphIndex: number | undefined,
  labels: SegmentLabels,
  language: AppLanguage,
): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [];

  // 1) Project segment
  if (project) {
    const rawName = project.name?.trim() || labels.untitledProject;
    segments.push({
      key: "project",
      target: "project",
      label: rawName,
      title: `${labels.project}: ${rawName}`,
      Icon: FolderOpen,
      tone: "secondary",
    });
  }

  // 2) Episode segment — only when session + episode number resolvable
  const episodeNum = currentSession?.config?.episode;
  const episodeTitle = currentSession?.title?.trim() || labels.untitledEpisode;
  if (currentSession && typeof episodeNum === "number") {
    const epPrefix = L4(language, { ko: "EP", en: "EP", ja: "EP", zh: "EP" });
    const label = `${epPrefix}.${episodeNum} ${episodeTitle}`;
    segments.push({
      key: "episode",
      target: "episode",
      label,
      title: `${labels.episode} ${episodeNum}: ${episodeTitle}`,
      Icon: FileText,
      tone: "secondary",
    });
  } else if (currentSession) {
    segments.push({
      key: "episode",
      target: "episode",
      label: episodeTitle,
      title: `${labels.episode}: ${episodeTitle}`,
      Icon: FileText,
      tone: "secondary",
    });
  }

  // 3) Scene segment — only when cursor is within a known scene
  if (typeof currentSceneIndex === "number" && currentSceneIndex > 0) {
    const sceneLabel = `${labels.scene} ${currentSceneIndex}`;
    segments.push({
      key: "scene",
      target: "scene",
      label: sceneLabel,
      title: sceneLabel,
      Icon: Film,
      tone: "primary",
    });
  }

  // 4) Paragraph tail — non-clickable, only when scene present AND index > 0
  if (
    typeof currentParagraphIndex === "number" &&
    currentParagraphIndex > 0 &&
    typeof currentSceneIndex === "number"
  ) {
    const paraLabel = `${labels.paragraph} ${currentParagraphIndex}`;
    segments.push({
      key: "paragraph",
      target: null,
      label: paraLabel,
      title: paraLabel,
      Icon: Film,
      tone: "tertiary",
    });
  }

  // Mark the last segment as "current" (caller uses index === last)
  return segments;
}

// IDENTITY_SEAL: PART-4 | role=SegmentBuilder | inputs=Project/Session/Indexes | outputs=BreadcrumbSegment[]

// ============================================================
// PART 5 — NovelBreadcrumb Component
// ============================================================

export function NovelBreadcrumb({
  project,
  currentSession,
  currentSceneIndex,
  currentParagraphIndex,
  language,
  onNavigate,
  className,
  hidden,
}: NovelBreadcrumbProps) {
  const isNarrow = useIsNarrow(640);
  const labels = buildLabels(language);
  const segments = buildSegments(
    project,
    currentSession,
    currentSceneIndex,
    currentParagraphIndex,
    labels,
    language,
  );

  const handleClick = useCallback(
    (target: NovelBreadcrumbTarget | null) => {
      if (!target) return;
      onNavigate(target);
    },
    [onNavigate],
  );

  // Hidden or no segments → render nothing
  if (hidden || segments.length === 0) return null;

  // Narrow viewport: collapse middle → show first + ellipsis + last (if 3+)
  const displaySegments: (BreadcrumbSegment | { key: string; ellipsis: true })[] =
    isNarrow && segments.length >= 3
      ? [segments[0], { key: "ellipsis", ellipsis: true }, segments[segments.length - 1]]
      : segments;

  return (
    <nav
      aria-label={L4(language, {
        ko: "경로 탐색",
        en: "Breadcrumb",
        ja: "パンくずリスト",
        zh: "面包屑导航",
      })}
      role="navigation"
      className={[
        "flex items-center gap-0.5 px-3 py-1.5 h-9",
        "bg-bg-primary border-b border-border",
        "text-xs text-text-secondary",
        "overflow-x-auto flex-shrink-0",
        className ?? "",
      ].join(" ")}
    >
      {displaySegments.map((seg, i) => {
        // Ellipsis placeholder (narrow-mode only)
        if ("ellipsis" in seg) {
          return (
            <span key={seg.key} className="flex items-center gap-0.5 flex-shrink-0">
              <ChevronRight size={12} className="text-text-tertiary opacity-60" />
              <span
                className="px-1 text-text-tertiary"
                aria-label={L4(language, {
                  ko: "생략됨",
                  en: "Collapsed",
                  ja: "省略",
                  zh: "已折叠",
                })}
              >
                {"\u2026"}
              </span>
            </span>
          );
        }

        const isLast = i === displaySegments.length - 1;
        const isClickable = Boolean(seg.target) && !isLast;
        const Icon = seg.Icon;

        const toneClass =
          seg.tone === "tertiary"
            ? "text-text-tertiary"
            : isLast
              ? "text-text-primary font-semibold"
              : "text-text-secondary";

        return (
          <span key={seg.key} className="flex items-center gap-0.5 flex-shrink-0">
            {i > 0 && (
              <ChevronRight
                size={12}
                className="text-text-tertiary opacity-60 mx-0.5"
                aria-hidden="true"
              />
            )}
            {isClickable ? (
              <button
                type="button"
                onClick={() => handleClick(seg.target)}
                title={seg.title}
                className={[
                  "flex items-center gap-1 px-1.5 py-1 rounded-md",
                  "min-h-[32px] md:min-h-0",
                  "transition-colors duration-150",
                  "hover:text-accent-blue hover:underline",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue",
                  toneClass,
                ].join(" ")}
              >
                <Icon size={12} className="shrink-0" />
                <span className="max-w-[180px] truncate">{seg.label}</span>
              </button>
            ) : (
              <span
                title={seg.title}
                aria-current={isLast ? "page" : undefined}
                className={[
                  "flex items-center gap-1 px-1.5 py-1",
                  toneClass,
                ].join(" ")}
              >
                <Icon size={12} className="shrink-0" />
                <span className="max-w-[180px] truncate">{seg.label}</span>
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// IDENTITY_SEAL: PART-5 | role=NovelBreadcrumb | inputs=NovelBreadcrumbProps | outputs=JSX

export default NovelBreadcrumb;
