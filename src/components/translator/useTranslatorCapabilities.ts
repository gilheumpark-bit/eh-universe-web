"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { setServerDgxCache, type ProviderId } from "@/lib/ai-providers";
import { logger } from "@/lib/logger";

type UseTranslatorCapabilitiesArgs = {
  setAiCapabilitiesLoaded: Dispatch<SetStateAction<boolean>>;
  setHostedNoa: Dispatch<SetStateAction<boolean>>;
  setHostedProviders: Dispatch<SetStateAction<Partial<Record<ProviderId, boolean>>>>;
};

export function useTranslatorCapabilities({
  setAiCapabilitiesLoaded,
  setHostedNoa,
  setHostedProviders,
}: UseTranslatorCapabilitiesArgs) {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/ai-capabilities", { cache: "no-store" });
        const data = (await response.json()) as { hosted?: Partial<Record<ProviderId, boolean>>; hasDgx?: boolean };
        if (!cancelled) {
          const hosted = data.hosted ?? {};
          setHostedProviders(hosted);
          setHostedNoa(Boolean(Object.values(hosted).some(Boolean)));
          if (data.hasDgx) setServerDgxCache(true);
          setAiCapabilitiesLoaded(true);
        }
      } catch (error) {
        logger.warn("TranslatorStudioApp", "ai-capabilities fetch failed", error);
        if (!cancelled) setAiCapabilitiesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setAiCapabilitiesLoaded, setHostedNoa, setHostedProviders]);
}
