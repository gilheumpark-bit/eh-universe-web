"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Lang } from "@/lib/LangContext";
import { normalizeChapter } from "@/lib/project-normalize";
import type { ChapterEntry } from "@/types/translator";
import { statusLabel } from "./translator-status-labels";

type AlertFn = (message: string, title?: string) => Promise<void>;

type UseTranslatorUrlImportArgs = {
  alert: AlertFn;
  lang: Lang;
  urlInput: string;
  getIdToken: () => Promise<string | null>;
  chapters: ChapterEntry[];
  activeChapterIndex: number | null;
  patchActiveChapter: (patch: Record<string, unknown>) => void;
  setChapters: Dispatch<SetStateAction<ChapterEntry[]>>;
  setSource: Dispatch<SetStateAction<string>>;
  setResult: Dispatch<SetStateAction<string>>;
  setShowUrlImport: Dispatch<SetStateAction<boolean>>;
  setUrlInput: Dispatch<SetStateAction<string>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setStatusMsg: Dispatch<SetStateAction<string>>;
  openChapter: (index: number | null, overrideChapters?: ChapterEntry[]) => void;
};

export function useTranslatorUrlImport({
  alert,
  lang,
  urlInput,
  getIdToken,
  chapters,
  activeChapterIndex,
  patchActiveChapter,
  setChapters,
  setSource,
  setResult,
  setShowUrlImport,
  setUrlInput,
  setLoading,
  setStatusMsg,
  openChapter,
}: UseTranslatorUrlImportArgs) {
  return async () => {
    if (!urlInput.trim()) return;
    setLoading(true);
    setStatusMsg(statusLabel(lang, "fetching-url"));
    try {
      const headers: Record<string, string> = {};
      const token = await getIdToken().catch(() => null);
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`/api/fetch-url?url=${encodeURIComponent(urlInput)}`, { headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "URL 읽기 오류");
      }
      if (data.text) {
        const parsedUrl = new URL(urlInput);
        const rawSlug = decodeURIComponent(parsedUrl.pathname.split("/").filter(Boolean).pop() || parsedUrl.hostname);
        const chapterName = rawSlug
          .replace(/[-_]+/g, " ")
          .replace(/\s+/g, " ")
          .trim() || `Web Episode ${chapters.length + 1}`;
        const importedChapter = normalizeChapter({
          name: chapterName,
          content: data.text,
          result: "",
          isDone: false,
          stageProgress: 0,
          storyNote: "",
        }, chapterName);

        if (activeChapterIndex !== null && chapters[activeChapterIndex] && !chapters[activeChapterIndex].content.trim()) {
          patchActiveChapter({
            name: importedChapter.name,
            content: importedChapter.content,
            result: "",
            isDone: false,
            stageProgress: 0,
          });
          setSource(importedChapter.content);
          setResult("");
        } else {
          // [fix] line 86: at the 30-chapter cap the imported chapter was sliced
          // off and newIndex pointed at an existing chapter, so the import was
          // silently dropped while the dialog closed as if it succeeded. Surface
          // an error instead of acting as success.
          if (chapters.length >= 30) {
            await alert("챕터 수가 최대 30개에 도달하여 가져오지 못했습니다.");
            return;
          }
          const newIndex = chapters.length;
          const nextChapters = [...chapters, importedChapter];
          setChapters((previous) => [...previous, importedChapter]);
          openChapter(newIndex, nextChapters);
        }

        setShowUrlImport(false);
        setUrlInput("");
      } else {
        await alert("내용을 가져오지 못했습니다.");
      }
    } catch (error) {
      await alert(error instanceof Error ? error.message : "URL 읽기 오류");
    } finally {
      setLoading(false);
      setStatusMsg("");
    }
  };
}
