"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { checkBlockedJson } from "@/lib/noa/block-notice";
import { checkPaywallJson } from "@/lib/noa/paywall-notice";

type RequestTranslationOptions = {
  stream?: boolean;
  onDelta?: (text: string) => void;
};

type UseTranslatorRequestTranslationArgs = {
  getIdToken: () => Promise<string | null>;
  setLastApproxTokens: Dispatch<SetStateAction<number | null>>;
};

async function readStreamText(res: Response, onDelta: (text: string) => void): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return await res.text();
  const decoder = new TextDecoder();
  let accumulatedText = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulatedText += decoder.decode(value, { stream: true });
    onDelta(accumulatedText);
  }
  return accumulatedText;
}

export function useTranslatorRequestTranslation({
  getIdToken,
  setLastApproxTokens,
}: UseTranslatorRequestTranslationArgs) {
  return useCallback(
    async (
      payload: Record<string, unknown>,
      options?: RequestTranslationOptions,
    ): Promise<string> => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      try {
        const token = await getIdToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      } catch {
        /* optional auth */
      }

      const res = await fetch("/api/translate", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const approx = res.headers.get("x-approx-prompt-tokens");
      if (approx) setLastApproxTokens(parseInt(approx, 10));

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        if (contentType.includes("application/json")) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          const paywallMsg = checkPaywallJson(data);
          throw new Error(paywallMsg || data.error || "요청 처리 중 오류가 발생했습니다.");
        }

        throw new Error((await res.text()) || "요청 처리 중 오류가 발생했습니다.");
      }

      if (contentType.includes("application/json")) {
        const data = (await res.json()) as { result?: string };
        const blockedMsg = checkBlockedJson(data, "translator-studio");
        if (blockedMsg) throw new Error(blockedMsg);
        return data.result || "";
      }

      if (options?.stream && options?.onDelta) {
        return readStreamText(res, options.onDelta);
      }

      return res.text();
    },
    [getIdToken, setLastApproxTokens],
  );
}
