"use client";

import { startTransition } from "react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { Lang } from "@/lib/LangContext";
import {
  normalizeChapter,
  normalizeProjectSnapshots,
  toProjectMeta,
} from "@/lib/project-normalize";
import {
  type TranslatorBackgroundMode,
  normalizeTranslatorBackgroundMode,
} from "@/lib/translator-constants";
import type {
  ChapterEntry,
  DomainPreset,
  HistoryEntry,
  ProjectSnapshot,
  TranslationMode,
} from "@/types/translator";
import { statusLabel } from "./translator-status-labels";

type ConfirmFn = (message: string, title?: string) => Promise<boolean>;
type AlertFn = (message: string, title?: string) => Promise<void>;

type DownloadFormat = "txt" | "md" | "json" | "html" | "csv";

type UseTranslatorWorkspaceFilesArgs = {
  alert: AlertFn;
  confirm: ConfirmFn;
  lang: Lang;
  langKo: boolean;
  projectName: string;
  setProjectName: Dispatch<SetStateAction<string>>;
  projectList: ProjectSnapshot[];
  setProjectList: Dispatch<SetStateAction<ProjectSnapshot[]>>;
  chapters: ChapterEntry[];
  setChapters: Dispatch<SetStateAction<ChapterEntry[]>>;
  activeChapterIndex: number | null;
  setActiveChapterIndex: Dispatch<SetStateAction<number | null>>;
  referenceIds: string[];
  setReferenceIds: Dispatch<SetStateAction<string[]>>;
  source: string;
  setSource: Dispatch<SetStateAction<string>>;
  result: string;
  setResult: Dispatch<SetStateAction<string>>;
  from: string;
  setFrom: Dispatch<SetStateAction<string>>;
  to: string;
  setTo: Dispatch<SetStateAction<string>>;
  provider: string;
  setProvider: Dispatch<SetStateAction<string>>;
  history: HistoryEntry[];
  setHistory: Dispatch<SetStateAction<HistoryEntry[]>>;
  worldContext: string;
  setWorldContext: Dispatch<SetStateAction<string>>;
  characterProfiles: string;
  setCharacterProfiles: Dispatch<SetStateAction<string>>;
  storySummary: string;
  setStorySummary: Dispatch<SetStateAction<string>>;
  backgroundMode: TranslatorBackgroundMode;
  setBackgroundMode: Dispatch<SetStateAction<TranslatorBackgroundMode>>;
  isZenMode: boolean;
  setIsZenMode: Dispatch<SetStateAction<boolean>>;
  isCatMode: boolean;
  setIsCatMode: Dispatch<SetStateAction<boolean>>;
  translationMode: TranslationMode;
  setTranslationMode: Dispatch<SetStateAction<TranslationMode>>;
  glossaryText: string;
  setGlossaryText: Dispatch<SetStateAction<string>>;
  glossary: Record<string, string>;
  setGlossary: Dispatch<SetStateAction<Record<string, string>>>;
  domainPreset: DomainPreset;
  setDomainPreset: Dispatch<SetStateAction<DomainPreset>>;
  preserveDialogueLayout: boolean;
  setPreserveDialogueLayout: Dispatch<SetStateAction<boolean>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setStatusMsg: Dispatch<SetStateAction<string>>;
  setLastSavedAt: Dispatch<SetStateAction<number | null>>;
  setShowExportOptions: Dispatch<SetStateAction<boolean>>;
};

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeGlossaryRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const next: Record<string, string> = {};
  for (const [key, target] of Object.entries(value as Record<string, unknown>)) {
    if (typeof key === "string" && typeof target === "string" && key.trim()) next[key.trim()] = target;
  }
  return next;
}

export function useTranslatorWorkspaceFiles({
  alert,
  confirm,
  lang,
  langKo,
  projectName,
  setProjectName,
  projectList,
  setProjectList,
  chapters,
  setChapters,
  activeChapterIndex,
  setActiveChapterIndex,
  referenceIds,
  setReferenceIds,
  source,
  setSource,
  result,
  setResult,
  from,
  setFrom,
  to,
  setTo,
  provider,
  setProvider,
  history,
  setHistory,
  worldContext,
  setWorldContext,
  characterProfiles,
  setCharacterProfiles,
  storySummary,
  setStorySummary,
  backgroundMode,
  setBackgroundMode,
  isZenMode,
  setIsZenMode,
  isCatMode,
  setIsCatMode,
  translationMode,
  setTranslationMode,
  glossaryText,
  setGlossaryText,
  glossary,
  setGlossary,
  domainPreset,
  setDomainPreset,
  preserveDialogueLayout,
  setPreserveDialogueLayout,
  setLoading,
  setStatusMsg,
  setLastSavedAt,
  setShowExportOptions,
}: UseTranslatorWorkspaceFilesArgs) {
  const exportData = async () => {
    const ok = await confirm(
      langKo
        ? "현재 번역 작업실의 핵심 데이터만 JSON 파일로 내려받을까요?\n연결 키와 참조 작품 원문은 포함되지 않습니다."
        : "Export only the core translation workspace data as JSON?\nConnection keys and referenced source text are not included.",
      "데이터 추출",
    );
    if (!ok) return;
    const content = JSON.stringify({
      projectName,
      chapters,
      projectLibrary: toProjectMeta(projectList),
      activeChapterIndex,
      referenceIds,
      source,
      result,
      from,
      to,
      provider,
      history,
      worldContext,
      characterProfiles,
      storySummary,
      backgroundMode,
      isZenMode,
      isCatMode,
      translationMode,
      glossaryText,
      glossary,
      domainPreset,
      preserveDialogueLayout,
    }, null, 2);
    downloadTextFile(`eh-translator-${new Date().toISOString().slice(0, 10)}.json`, content, "application/json");
    setLastSavedAt(Date.now());
    setStatusMsg(langKo ? "작업실 백업 내보내기 완료" : "Workspace backup exported");
    window.dispatchEvent(new CustomEvent("noa:toast", {
      detail: {
        message: langKo ? "작업실 백업 파일을 내려받았습니다" : "Workspace backup downloaded",
        variant: "success",
      },
    }));
  };

  const importData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const input = event.target;
    if (!file) return;

    void (async () => {
      const proceed = await confirm(
        langKo
          ? "번역 작업실 파일을 불러올까요?\n현재 작업 중인 번역 데이터가 바뀝니다. 먼저 내보내기로 백업해 두는 것을 권합니다."
          : "Import a translation workspace file?\nCurrent translation data will change. Export a backup first if needed.",
        langKo ? "작업실 불러오기" : "Import workspace",
      );
      if (!proceed) {
        input.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => {
        void (async () => {
          await alert("파일을 읽을 수 없습니다. 다시 시도해 주세요.");
          input.value = "";
        })();
      };
      reader.onload = () => {
        void (async () => {
          try {
            const parsed = JSON.parse(String(reader.result)) as Record<string, unknown>;
            startTransition(() => {
              if (parsed.projectName !== undefined) setProjectName(parsed.projectName as string);
              if (parsed.chapters !== undefined && Array.isArray(parsed.chapters)) {
                setChapters(
                  parsed.chapters.map((chapter: unknown, index: number) =>
                    normalizeChapter(chapter, `Part ${index + 1}`),
                  ),
                );
              }
              if (parsed.projectList !== undefined) setProjectList(normalizeProjectSnapshots(parsed.projectList));
              if (parsed.projectLibrary !== undefined) setProjectList(normalizeProjectSnapshots(parsed.projectLibrary));
              if (parsed.activeChapterIndex !== undefined) setActiveChapterIndex(parsed.activeChapterIndex as number);
              if (parsed.source !== undefined) setSource(parsed.source as string);
              if (parsed.result !== undefined) setResult(parsed.result as string);
              if (parsed.from !== undefined) setFrom(parsed.from as string);
              if (parsed.to !== undefined) setTo(parsed.to as string);
              if (parsed.provider !== undefined) setProvider(parsed.provider as string);
              if (parsed.history !== undefined) setHistory(parsed.history as HistoryEntry[]);
              if (parsed.worldContext !== undefined) setWorldContext(parsed.worldContext as string);
              if (parsed.characterProfiles !== undefined) setCharacterProfiles(parsed.characterProfiles as string);
              if (parsed.storySummary !== undefined) setStorySummary(parsed.storySummary as string);
              if (parsed.referenceIds !== undefined) {
                setReferenceIds(Array.isArray(parsed.referenceIds) ? (parsed.referenceIds as string[]) : []);
              }
              if (parsed.backgroundMode !== undefined) {
                setBackgroundMode(normalizeTranslatorBackgroundMode(parsed.backgroundMode));
              }
              if (parsed.isZenMode !== undefined) setIsZenMode(parsed.isZenMode as boolean);
              if (parsed.isCatMode !== undefined) setIsCatMode(parsed.isCatMode as boolean);
              if (parsed.translationMode !== undefined) setTranslationMode(parsed.translationMode as TranslationMode);
              setGlossaryText(typeof parsed.glossaryText === "string" ? parsed.glossaryText : "");
              setGlossary(normalizeGlossaryRecord(parsed.glossary));
              if (parsed.domainPreset !== undefined) setDomainPreset(parsed.domainPreset as DomainPreset);
              if (parsed.preserveDialogueLayout !== undefined) {
                setPreserveDialogueLayout(parsed.preserveDialogueLayout as boolean);
              }
            });
          } catch {
            await alert("JSON 파일 형식이 올바르지 않습니다.");
          } finally {
            input.value = "";
          }
        })();
      };
      reader.readAsText(file);
    })();
  };

  const importDocument = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    const proceed = await confirm(`${files.length}개의 문서를 현재 프로젝트 회차 목록에 추가하시겠습니까?`, "문서 가져오기");
    if (!proceed) {
      event.target.value = "";
      return;
    }

    setLoading(true);
    setStatusMsg(statusLabel(lang, "importing-files"));
    try {
      const newChapters: ChapterEntry[] = [];

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("source", "eh-translator");
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || `${file.name} 파싱 실패`);

        const parsedChapters = Array.isArray(data.chapters) ? data.chapters : [];
        if (!parsedChapters.length) {
          throw new Error(`${file.name}에서 가져올 본문을 찾지 못했습니다.`);
        }

        const useBareFileName =
          parsedChapters.length === 1 &&
          typeof parsedChapters[0]?.title === "string" &&
          /^split part \d+$/i.test(parsedChapters[0].title.trim());

        for (const chapter of parsedChapters) {
          const chapterTitle =
            typeof chapter?.title === "string" && chapter.title.trim()
              ? chapter.title.trim()
              : "Imported Part";

          newChapters.push({
            name: useBareFileName ? file.name : `${file.name} - ${chapterTitle}`,
            content: typeof chapter?.content === "string" ? chapter.content : "",
            result: "",
            isDone: false,
            stageProgress: 0,
            storyNote: "",
          });
        }
      }

      if (newChapters.length) {
        const nextIndex = Math.min(chapters.length, 29);
        startTransition(() => {
          setChapters((previous) => [...previous, ...newChapters].slice(0, 30));
          setActiveChapterIndex(nextIndex);
          setSource(newChapters[0].content || "");
          setResult("");
        });
      }
    } catch (error) {
      await alert(error instanceof Error ? error.message : "문서 가져오기 실패");
    } finally {
      setLoading(false);
      setStatusMsg("");
      event.target.value = "";
    }
  };

  const downloadAllResults = (format: DownloadFormat = "md") => {
    if (!chapters.length) {
      window.dispatchEvent(new CustomEvent("noa:toast", {
        detail: {
          message: langKo ? "내보낼 회차가 없습니다" : "No chapters to export",
          variant: "error",
        },
      }));
      return;
    }

    let content = "";
    let mimeType = "text/plain";

    if (format === "md") {
      content = chapters.map((chapter: Partial<ChapterEntry>) => `# ${chapter.name}\n\n${chapter.result || "(미번역)"}`).join("\n\n---\n\n");
      mimeType = "text/markdown";
    } else if (format === "txt") {
      content = chapters.map((chapter: Partial<ChapterEntry>) => `[ ${chapter.name} ]\n\n${chapter.result || "(미번역)"}`).join("\n\n====================\n\n");
      mimeType = "text/plain";
    } else if (format === "json") {
      content = JSON.stringify(chapters.map((chapter: Partial<ChapterEntry>) => ({ title: chapter.name, content: chapter.result || "" })), null, 2);
      mimeType = "application/json";
    } else if (format === "html") {
      content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Translation Results</title></head><body style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif;">` +
        chapters.map((chapter: Partial<ChapterEntry>) => `<h2>${chapter.name}</h2><p>${(chapter.result || "").replace(/\\n/g, "<br>")}</p>`).join("<hr>") +
        "</body></html>";
      mimeType = "text/html";
    } else if (format === "csv") {
      content = '\\uFEFF"Chapter","Content"\\n' + chapters.map((chapter: Partial<ChapterEntry>) => `"${chapter.name?.replace(/"/g, '""')}","${(chapter.result || "").replace(/"/g, '""')}"`).join("\\n");
      mimeType = "text/csv";
    }

    downloadTextFile(`eh-translator-results-${new Date().toISOString().slice(0, 10)}.${format}`, content, mimeType);
    setShowExportOptions(false);
    setLastSavedAt(Date.now());
    setStatusMsg(langKo ? `${format.toUpperCase()} 내보내기 완료` : `${format.toUpperCase()} export complete`);
    window.dispatchEvent(new CustomEvent("noa:toast", {
      detail: {
        message: langKo ? `${format.toUpperCase()} 파일을 내려받았습니다` : `${format.toUpperCase()} file downloaded`,
        variant: "success",
      },
    }));
  };

  return { exportData, importData, importDocument, downloadAllResults };
}
