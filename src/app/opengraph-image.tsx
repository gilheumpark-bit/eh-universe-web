// ============================================================
// Dynamic Open Graph Image — Next.js 16 Metadata File Convention
// Edge runtime: 콜드 스타트 단축, 소셜 플랫폼 크롤러 대응.
// 1200x630 (Twitter/Facebook/LinkedIn 공통 권장 비율)
// [2026-04-24] ?l= 쿼리로 4언어 variant 지원 (SEO·국외 공유 미리보기 현지화)
// ============================================================
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Loreguard — AI IDE for Novelists";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ============================================================
// PART 1 — Per-language copy
// ============================================================

type Lang = "ko" | "en" | "ja" | "zh";

const TAGLINES: Record<Lang, { main: string; sub: string; footer: string; brand: string }> = {
  ko: {
    main: "소설가를 위한 AI IDE",
    sub: "집필 · 검수 · 번역 · 출간을 하나의 워크스페이스에서",
    footer: "집필 · 품질 · 번역 · 출간 · 망가지지 않는 인프라",
    brand: "Loreguard · 로어가드",
  },
  en: {
    main: "AI IDE for Novelists",
    sub: "Write · Review · Translate · Publish — one workspace",
    footer: "Writing · Quality · Translation · Publishing · Resilient Infra",
    brand: "Loreguard by EH Universe",
  },
  ja: {
    main: "小説家のための AI IDE",
    sub: "執筆・検証・翻訳・出版をひとつのワークスペースで",
    footer: "執筆 · 品質 · 翻訳 · 出版 · 壊れないインフラ",
    brand: "Loreguard · ロアガード",
  },
  zh: {
    main: "为小说家打造的 AI IDE",
    sub: "创作、审校、翻译、出版 — 一体化工作室",
    footer: "创作 · 质量 · 翻译 · 出版 · 可靠基础设施",
    brand: "Loreguard · 洛尔加德",
  },
};

function normalizeLang(raw: string | string[] | undefined): Lang {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "en" || v === "ja" || v === "zh") return v;
  return "ko";
}

// ============================================================
// PART 2 — Image renderer
// ============================================================

export default async function OpengraphImage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = props.searchParams ? await props.searchParams : {};
  const lang = normalizeLang(params.l);
  const copy = TAGLINES[lang];

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #17162a 50%, #1a1a2e 100%)",
          color: "#ffffff",
          padding: 80,
          position: "relative",
        }}
      >
        {/* Amber accent — EH brand */}
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 80,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              border: "1px solid rgba(202, 161, 92, 0.32)",
              background: "rgba(202, 161, 92, 0.10)",
              color: "#caa15c",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            EH
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: "#9ca3af",
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            {copy.brand}
          </div>
        </div>

        {/* Main wordmark */}
        <div
          style={{
            fontSize: 128,
            fontWeight: 700,
            letterSpacing: -4,
            marginBottom: 16,
            background: "linear-gradient(180deg, #ffffff 0%, #caa15c 100%)",
            backgroundClip: "text",
            color: "transparent",
            display: "flex",
          }}
        >
          LOREGUARD
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            color: "#e5e7eb",
            textAlign: "center",
            marginBottom: 20,
            fontWeight: 500,
            display: "flex",
          }}
        >
          {copy.main}
        </div>

        <div
          style={{
            fontSize: 22,
            color: "#9ca3af",
            textAlign: "center",
            display: "flex",
          }}
        >
          {copy.sub}
        </div>

        {/* Footer strip */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            fontSize: 18,
            color: "#6b7280",
            letterSpacing: 3,
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          {copy.footer}
        </div>
      </div>
    ),
    { ...size },
  );
}
