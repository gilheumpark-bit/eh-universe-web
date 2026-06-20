import { checkAndExplainRejection } from "@/lib/ai/prism-rejection-detector";
import { normalizeToAgentLang } from "@/lib/ai/lang-normalize";

type DualResultLike = {
  faithful?: string | null;
  market?: string | null;
  faithfulError?: string | null;
  marketError?: string | null;
  durationMs: number;
  totalCalls: number;
};

export function dispatchDualPrismRejection(dualResult: DualResultLike, lang: string): void {
  const rejectionLang = normalizeToAgentLang(lang);
  const checkRejection = (text: string | null | undefined): void => {
    if (!text) return;
    const friendly = checkAndExplainRejection(text, undefined, rejectionLang);
    if (friendly && typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("noa:prism-rejection", {
          detail: { message: friendly },
        }));
      } catch {
        /* silent */
      }
    }
  };
  checkRejection(dualResult.faithful);
  checkRejection(dualResult.market);
}

export function buildDualCompletionLabel(lang: string, dualResult: DualResultLike): string {
  const dualSeconds = Math.round(dualResult.durationMs / 100) / 10;
  const dualHasFaithful = Boolean(dualResult.faithful);
  const dualHasMarket = Boolean(dualResult.market);

  if (dualHasFaithful && dualHasMarket) {
    switch (lang) {
      case "en": return `DUAL DONE — ${dualResult.totalCalls} calls / ${dualSeconds}s`;
      case "ja": return `DUAL 完了 — ${dualResult.totalCalls} 呼び出し / ${dualSeconds}s`;
      case "zh": return `DUAL 完成 — ${dualResult.totalCalls} 次调用 / ${dualSeconds}s`;
      default: return `두 안 완료 — ${dualResult.totalCalls}회 호출 / ${dualSeconds}s`;
    }
  }

  if (!dualHasFaithful && !dualHasMarket) {
    const faithfulError = (dualResult.faithfulError || "").slice(0, 60);
    const marketError = (dualResult.marketError || "").slice(0, 60);
    switch (lang) {
      case "en": return `DUAL FAILED — Faithful: ${faithfulError || "failed"} / Market: ${marketError || "failed"}`;
      case "ja": return `DUAL 両方失敗 — Faithful: ${faithfulError || "失敗"} / Market: ${marketError || "失敗"}`;
      case "zh": return `DUAL 两侧失败 — Faithful: ${faithfulError || "失败"} / Market: ${marketError || "失败"}`;
      default: return `두 안 모두 실패 — 보존안: ${faithfulError || "실패"} / 현지화안: ${marketError || "실패"}`;
    }
  }

  if (dualHasFaithful && !dualHasMarket) {
    const marketError = (dualResult.marketError || "").slice(0, 60);
    switch (lang) {
      case "en": return `Faithful only — Market failed: ${marketError || "unknown"}`;
      case "ja": return `Faithful のみ — Market 失敗: ${marketError || "不明"}`;
      case "zh": return `仅 Faithful — Market 失败: ${marketError || "未知"}`;
      default: return `보존안만 완료 — 현지화안 실패: ${marketError || "미상"}`;
    }
  }

  const faithfulError = (dualResult.faithfulError || "").slice(0, 60);
  switch (lang) {
    case "en": return `Market only — Faithful failed: ${faithfulError || "unknown"}`;
    case "ja": return `Market のみ — Faithful 失敗: ${faithfulError || "不明"}`;
    case "zh": return `仅 Market — Faithful 失败: ${faithfulError || "未知"}`;
    default: return `현지화안만 완료 — 보존안 실패: ${faithfulError || "미상"}`;
  }
}
