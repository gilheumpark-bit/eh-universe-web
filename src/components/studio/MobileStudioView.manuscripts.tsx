"use client";

import { useEffect, useState } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { L4 } from "@/lib/i18n";
import type { AppLanguage, EpisodeManuscript } from "@/lib/studio-types";

interface StudioProjectSession {
  id: string;
  title?: string;
  config?: { title?: string; manuscripts?: EpisodeManuscript[] };
}

interface StudioProjectShape {
  id: string;
  name?: string;
  sessions?: StudioProjectSession[];
}

type ManuscriptGroup = {
  projectName: string;
  sessionTitle: string;
  manuscripts: EpisodeManuscript[];
};

function loadStudioManuscripts(): ManuscriptGroup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("noa_projects");
    if (!raw) return [];
    const projects = JSON.parse(raw) as StudioProjectShape[];
    const out: ManuscriptGroup[] = [];
    for (const project of projects) {
      for (const session of project.sessions ?? []) {
        const manuscripts = session.config?.manuscripts;
        if (Array.isArray(manuscripts) && manuscripts.length > 0) {
          out.push({
            projectName: project.name || "Untitled",
            sessionTitle: session.config?.title || session.title || "Untitled session",
            manuscripts: [...manuscripts].sort((a, b) => a.episode - b.episode),
          });
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function ManuscriptsPanel({ language }: { language: AppLanguage }) {
  const [groups, setGroups] = useState<ManuscriptGroup[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGroups(loadStudioManuscripts());
  }, []);

  const hasAny = groups.some((group) => group.manuscripts.length > 0);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-text-secondary">
        <FileText className="w-4 h-4 text-accent-green" />
        <h2 className="text-sm font-bold">
          {L4(language, { ko: "내 원고", en: "My Manuscripts", ja: "原稿一覧", zh: "我的稿件" })}
        </h2>
      </div>
      <p className="text-xs text-text-tertiary">
        {L4(language, {
          ko: "데스크톱에서 쓴 원고를 모바일에서 읽기 전용으로 확인할 수 있습니다. 편집은 데스크톱에서.",
          en: "View desktop manuscripts here (read-only). Editing requires desktop.",
          ja: "デスクトップで書いた原稿を読み取り専用で確認できます。編集はデスクトップで。",
          zh: "可在此只读查看桌面端稿件。编辑请在桌面端进行。",
        })}
      </p>

      {!hasAny && (
        <p className="text-xs text-text-quaternary text-center py-8">
          {L4(language, {
            ko: "저장된 원고가 없습니다. 데스크톱에서 집필을 시작해보세요.",
            en: "No manuscripts yet. Start writing on desktop.",
            ja: "まだ原稿がありません。デスクトップで執筆を始めましょう。",
            zh: "暂无稿件。请在桌面端开始写作。",
          })}
        </p>
      )}

      {groups.map((group, groupIndex) => (
        <div key={`${group.projectName}-${group.sessionTitle}-${groupIndex}`} className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
          <div className="px-3 py-2 bg-bg-tertiary/40 border-b border-border">
            <p className="text-[11px] text-text-tertiary font-mono uppercase truncate">{group.projectName}</p>
            <p className="text-[13px] font-bold text-text-primary truncate">{group.sessionTitle}</p>
          </div>
          <div className="divide-y divide-border/50">
            {group.manuscripts.map((manuscript) => {
              const id = `${groupIndex}-${manuscript.episode}`;
              const isOpen = openId === id;
              const preview = (manuscript.content ?? "").slice(0, 800);
              const contentLength = manuscript.content?.length ?? 0;
              return (
                <div key={id}>
                  <button
                    onClick={() => setOpenId(isOpen ? null : id)}
                    className="w-full flex items-center justify-between px-3 py-3 min-h-[44px] active:bg-bg-tertiary/50 transition-colors"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] text-accent-amber font-mono shrink-0">
                        EP.{String(manuscript.episode).padStart(2, "0")}
                      </span>
                      <span className="text-[13px] text-text-primary truncate">
                        {manuscript.title || L4(language, { ko: "제목 없음", en: "Untitled", ja: "無題", zh: "无标题" })}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-text-tertiary">
                        {(manuscript.charCount ?? contentLength).toLocaleString()}
                      </span>
                      <ChevronRight className={`w-4 h-4 text-text-tertiary transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 pt-1 bg-bg-primary">
                      <p className="text-[13px] text-text-secondary whitespace-pre-wrap leading-relaxed">
                        {preview}
                        {contentLength > 800 && "..."}
                      </p>
                      {contentLength > 800 && (
                        <p className="mt-2 text-[11px] text-text-tertiary">
                          {L4(language, {
                            ko: "이후 내용은 데스크톱에서 확인해 주세요.",
                            en: "See full content on desktop.",
                            ja: "続きはデスクトップで確認してください。",
                            zh: "完整内容请在桌面端查看。",
                          })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
