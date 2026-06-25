"use client";

import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { logger } from "@/lib/logger";
import type { Lang } from "@/lib/LangContext";
import type { GlossaryManager } from "@/lib/translation/glossary-manager";
import type { TermDriftWarning } from "@/lib/translation/episode-memory";
import type { TranslationProjectContext } from "@/lib/translation/project-bridge";
import { driftWarningLabel } from "./translator-status-labels";

type UseTranslatorGlossaryEffectsArgs = {
  driftWarnings: TermDriftWarning[];
  glossary: Record<string, string>;
  glossaryManagerRef: MutableRefObject<GlossaryManager>;
  lang: Lang;
  projectContext: TranslationProjectContext | null;
  setGlossary: Dispatch<SetStateAction<Record<string, string>>>;
  setGlossaryText: Dispatch<SetStateAction<string>>;
  setGlossaryVersion: Dispatch<SetStateAction<number>>;
  setStatusMsg: Dispatch<SetStateAction<string>>;
};

export function useTranslatorGlossaryEffects({
  driftWarnings,
  glossary,
  glossaryManagerRef,
  lang,
  projectContext,
  setGlossary,
  setGlossaryText,
  setGlossaryVersion,
  setStatusMsg,
}: UseTranslatorGlossaryEffectsArgs) {
  useEffect(() => {
    const manager = glossaryManagerRef.current;
    const current = manager.toRecord();
    const keys = new Set([...Object.keys(current), ...Object.keys(glossary)]);
    let differs = false;
    for (const key of keys) {
      if (current[key] !== glossary[key]) {
        differs = true;
        break;
      }
    }
    if (differs) {
      manager.setAll(glossary);
    }
  }, [glossary, glossaryManagerRef]);

  useEffect(() => {
    if (driftWarnings.length === 0) return;
    const warningTimer = window.setTimeout(() => {
      setStatusMsg(driftWarningLabel(lang, driftWarnings.length));
    }, 80);
    return () => window.clearTimeout(warningTimer);
  }, [driftWarnings, lang, setStatusMsg]);

  useEffect(() => {
    if (!projectContext) return;
    logger.info(
      "TranslatorStudioApp",
      `[Pipeline] projectContext loaded: chars=${projectContext.characters.length}, glossary=${projectContext.glossary.length}, episodes=${projectContext.recentEpisodes.length}`,
    );
  }, [projectContext]);

  useEffect(() => {
    const manager = glossaryManagerRef.current;
    const unsubscribe = manager.onChange((version) => {
      setGlossaryVersion(version);
      setGlossary(manager.toRecord());
      const injection = manager.getPromptInjection();
      if (injection) {
        setGlossaryText(injection);
      }
    });
    return unsubscribe;
  }, [glossaryManagerRef, setGlossary, setGlossaryText, setGlossaryVersion]);
}
