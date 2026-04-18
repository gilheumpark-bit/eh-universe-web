// ============================================================
// Dynamic Open Graph Image — Next.js 16 Metadata File Convention
// Edge runtime: 콜드 스타트 단축, 소셜 플랫폼 크롤러 대응.
// 1200x630 (Twitter/Facebook/LinkedIn 공통 권장 비율)
// ============================================================
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Loreguard — 한국 웹소설의 해외 진출 OS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
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
            Loreguard · 로어가드
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
          소설가를 위한 AI IDE
        </div>

        <div
          style={{
            fontSize: 22,
            color: "#9ca3af",
            textAlign: "center",
            display: "flex",
          }}
        >
          집필 · 검수 · 번역 · 출간을 하나의 워크스페이스에서
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
          한국 웹소설의 해외 진출 OS
        </div>
      </div>
    ),
    { ...size },
  );
}
