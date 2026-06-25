"use client";

// ============================================================
// SealCard — 발급 성공 후 봉인번호 + QR 표시 카드
// ============================================================
// CpJournalPanel.tsx 의 issueStatus === 'success' 블록에서 사용.
// QR은 dynamic import(qr-renderer) 로 지연 로드 — SSR 없음.

import { useEffect, useState } from "react";
import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";

interface SealCardProps {
  sealNumber: string;
  verificationUrl: string;
  language: AppLanguage;
}

export function SealCard({ sealNumber, verificationUrl, language }: SealCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const isKO = language === "KO";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { generateQRDataUrl } = await import("@/lib/creative-process/qr-renderer");
        const url = await generateQRDataUrl(sealNumber);
        if (!cancelled) setQrDataUrl(url);
      } catch {
        // QR 생성 실패 시 무시 — 봉인번호 텍스트로 대체
      }
    })();
    return () => { cancelled = true; };
  }, [sealNumber]);

  return (
    <div className="mt-3 flex gap-4 items-start p-4 rounded-xl bg-bg-secondary border border-accent-amber/30">
      {/* QR 영역 */}
      <div className="shrink-0">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={L4(language, { ko: "봉인 QR", en: "Seal QR", ja: "封印QR", zh: "封印二维码" })}
            width={80}
            height={80}
            className="rounded-lg"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-bg-tertiary animate-pulse" />
        )}
      </div>

      {/* 텍스트 영역 */}
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-[10px] font-bold font-mono text-accent-amber uppercase tracking-wider">
          {L4(language, { ko: "봉인번호", en: "Seal Number", ja: "封印番号", zh: "封印编号" })}
        </span>
        <span className="text-sm font-mono font-bold text-text-primary break-all leading-tight">
          {sealNumber}
        </span>
        <a
          href={verificationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-accent-blue underline break-all mt-1 hover:opacity-80"
        >
          {isKO ? "검증 페이지 열기 →" : "Open verification →"}
        </a>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: SealCard | role=seal-number+QR 표시 | inputs=sealNumber,verificationUrl,language | outputs=UI
