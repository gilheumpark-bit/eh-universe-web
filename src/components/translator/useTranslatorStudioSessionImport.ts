"use client";

import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { logger } from "@/lib/logger";
import { buildProjectTranslationContext, type TranslationProjectContext } from "@/lib/translation/project-bridge";
import { getOrCreateGraph, type EpisodeMemoryGraph } from "@/lib/translation/episode-memory";
import { loadProjects } from "@/lib/project-migration";
import type { StoryConfig } from "@/lib/studio-types";

type UseTranslatorStudioSessionImportArgs = {
  setSource: Dispatch<SetStateAction<string>>;
  setProjectContext: Dispatch<SetStateAction<TranslationProjectContext | null>>;
  memoryGraphRef: MutableRefObject<EpisodeMemoryGraph | null>;
  setWorldContext: Dispatch<SetStateAction<string>>;
  setCharacterProfiles: Dispatch<SetStateAction<string>>;
  setGlossary: Dispatch<SetStateAction<Record<string, string>>>;
  setProjectName: Dispatch<SetStateAction<string>>;
};

export function useTranslatorStudioSessionImport({
  setSource,
  setProjectContext,
  memoryGraphRef,
  setWorldContext,
  setCharacterProfiles,
  setGlossary,
  setProjectName,
}: UseTranslatorStudioSessionImportArgs) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromSessionId = params.get("from");
    if (!fromSessionId) return;

    try {
      const projects = loadProjects();
      if (projects.length === 0) return;
      let matchedSession: { id: string; config?: Partial<StoryConfig> } | null = null;
      let matchedProject: { id?: string; name?: string } | null = null;
      for (const project of projects) {
        const session = project.sessions?.find((candidate) => candidate.id === fromSessionId);
        if (session) {
          matchedSession = session;
          matchedProject = project;
          break;
        }
      }
      if (!matchedSession?.config) return;

      const sessionConfig = matchedSession.config as {
        manuscripts?: Array<{ episode: number; content: string; title?: string }>;
      };
      const matchedManuscripts = sessionConfig.manuscripts;

      if (Array.isArray(matchedManuscripts) && matchedManuscripts.length > 0) {
        const sortedManuscripts = [...matchedManuscripts].sort((left, right) => left.episode - right.episode);
        const firstManuscript = sortedManuscripts[0];
        if (firstManuscript?.content) setSource(firstManuscript.content);
      }

      const projectContext = buildProjectTranslationContext(
        {
          id: matchedProject?.id || fromSessionId,
          title: matchedProject?.name,
          config: matchedSession.config,
        },
        { sourceLang: "KO" },
      );

      if (projectContext) {
        setProjectContext(projectContext);
        memoryGraphRef.current = projectContext.projectId ? getOrCreateGraph(projectContext.projectId) : null;

        if (projectContext.worldBible) setWorldContext(projectContext.worldBible);

        if (projectContext.characters.length > 0) {
          const profileText = projectContext.characters
            .map((character) => {
              const register = character.register;
              const lines = [`## ${character.name}`];
              if (character.aliases.length > 0) lines.push(`- 별칭: ${character.aliases.join(", ")}`);
              if (register?.role) lines.push(`- 역할: ${register.role}`);
              if (register?.age) lines.push(`- 연령: ${register.age}`);
              if (register?.tone) lines.push(`- 말투: ${register.tone}`);
              if (register?.speechHint) lines.push(`- 말투 예시: ${register.speechHint}`);
              return lines.join("\n");
            })
            .join("\n\n");
          setCharacterProfiles(profileText);
        }

        if (projectContext.glossary.length > 0) {
          const glossaryRecord: Record<string, string> = {};
          for (const glossaryEntry of projectContext.glossary) {
            glossaryRecord[glossaryEntry.source] = glossaryEntry.target || glossaryEntry.source;
          }
          if (Object.keys(glossaryRecord).length > 0) setGlossary(glossaryRecord);
        }

        if (projectContext.projectTitle) {
          setProjectName((previous) => previous || projectContext.projectTitle);
        }
      }

      window.history.replaceState({}, "", window.location.pathname);
    } catch (error) {
      logger.warn("TranslatorStudioApp", "failed to import studio session via project-bridge", error);
    }
  }, [
    memoryGraphRef,
    setCharacterProfiles,
    setGlossary,
    setProjectContext,
    setProjectName,
    setSource,
    setWorldContext,
  ]);
}
