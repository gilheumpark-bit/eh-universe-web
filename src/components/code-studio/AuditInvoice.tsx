import React, { useState } from "react";
import { ScrollText, ChevronDown, CheckCircle2, ShieldAlert, Cpu } from "lucide-react";
import type { IntentConstraints } from "@/lib/code-studio/ai/intent-parser";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

interface Props {
  invoice: IntentConstraints;
}

export function AuditInvoice({ invoice }: Props) {
  const { lang } = useLang();
  const [expanded, setExpanded] = useState(false);

  if (!invoice || !invoice.matrixLog || invoice.matrixLog.length === 0) return null;

  return (
    <div className="mt-4 mb-2 rounded-2xl border border-border/40 bg-bg-primary/50 overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-bg-secondary/60 transition-colors group"
      >
        <div className="flex items-center gap-2 text-text-secondary">
          <ScrollText size={14} className="text-accent-blue" />
          <span className="text-[11px] font-bold tracking-tight">
            {L4(lang, { ko: 'NOA-AGI 실행 명세서 (Audit Invoice)', en: 'NOA-AGI Execution Audit Invoice', ja: 'NOA-AGI 実行監査書', zh: 'NOA-AGI 执行审计书' })}
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-accent-green ml-1" />
        </div>
        <ChevronDown
          size={14}
          className={`text-text-tertiary transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-border/30 bg-bg-secondary/30 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="space-y-4">
            {/* Matrix Extraction */}
            <div>
              <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-widest flex items-center gap-1.5 mb-2">
                <Cpu size={12} />
                {L4(lang, { ko: '[1] 의도 파싱 매트릭스', en: '[1] Intent Parsing Matrix', ja: '[1] 意図解析マトリクス', zh: '[1] 意图解析矩阵' })}
              </span>
              <ul className="space-y-1">
                {invoice.matrixLog.map((log, i) => (
                  <li key={i} className="text-[12px] text-text-secondary font-mono flex items-start gap-2">
                    <span className="text-accent-blue mt-0.5">-&gt;</span>
                    <span>{log}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Physical Constraints Injection */}
            {invoice.systemOverride.length > 0 && (
              <div className="pt-2 border-t border-border/20">
                <span className="text-[10px] uppercase font-bold text-text-tertiary tracking-widest flex items-center gap-1.5 mb-2">
                  <ShieldAlert size={12} className="text-accent-amber" />
                  {L4(lang, { ko: '[2] 시스템 규제 주입', en: '[2] System Constraints Injection', ja: '[2] システム制約注入', zh: '[2] 系统约束注入' })}
                </span>
                <div className="bg-bg-primary/80 rounded-lg p-2.5 border border-border/30">
                  <ul className="space-y-1.5">
                    {invoice.systemOverride.map((constraint, i) => (
                      <li key={i} className="text-[11px] text-text-secondary font-mono flex items-start gap-2 leading-relaxed">
                        <CheckCircle2 size={12} className="text-accent-green shrink-0 mt-0.5" />
                        <span className="break-all">{constraint.replace('- ', '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
