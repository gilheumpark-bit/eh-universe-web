"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import { PlanetWizard } from "@/components/network/PlanetWizard";

// ============================================================
// PART 1 - NEW PLANET ENTRY
// ============================================================

export function NetworkNewClient() {
  const router = useRouter();
  const { lang } = useLang();
  const { user, signInWithGoogle } = useAuth();

  if (!user) {
    return (
      <main className="pt-14 pb-20">
        <div className="site-shell py-10">
          <section className="premium-panel p-8 text-center">
            <div className="site-kicker">{lang === "ko" ? "로그인 필요" : "Authentication Required"}</div>
            <h1 className="site-title mt-3 text-3xl font-semibold">
              {lang === "ko" ? "행성을 만들려면 먼저 로그인하세요." : "Sign in before creating your planet."}
            </h1>
            <p className="site-lede mx-auto mt-4 max-w-2xl text-sm md:text-base">
              {lang === "ko"
                ? "회원은 행성 생성, 첫 로그 작성, 댓글과 반응을 사용할 수 있습니다."
                : "Members can create planets, publish first logs, and interact with the network."}
            </p>
            <div className="mt-8 flex justify-center">
              <button type="button" onClick={() => void signInWithGoogle()} className="premium-button">
                {lang === "ko" ? "Google 로그인" : "Sign In with Google"}
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-14 pb-20">
      <div className="site-shell space-y-6 py-8 md:py-10">
        <Link href="/network" className="inline-flex items-center gap-1 font-[family-name:var(--font-mono)] text-xs tracking-[0.12em] text-text-tertiary transition hover:text-accent-amber">
          &larr; NETWORK
        </Link>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
        <PlanetWizard
          ownerId={user.uid}
          ownerName={user.displayName}
          lang={lang}
          onCreated={(planetId) => router.push(`/network/planets/${planetId}`)}
        />

        <aside className="premium-panel-soft p-6">
          <div className="site-kicker">{lang === "ko" ? "진행 안내" : "Flow Notes"}</div>
          <div className="mt-4 space-y-4 text-sm leading-7 text-text-secondary">
            <p>
              {lang === "ko"
                ? "1차 MVP는 행성 등록과 첫 관측 로그를 한 번에 생성합니다. 행성과 로그가 동시에 생겨야 첫 진입 경험이 끊기지 않습니다."
                : "The MVP creates the planet and its first log together so the first-use flow never breaks."}
            </p>
            <p>
              {lang === "ko"
                ? "대표 태그와 핵심 규칙은 카드와 상세 페이지 위젯에 바로 반영됩니다."
                : "Representative tags and core rules immediately show up on the cards and detail widgets."}
            </p>
            <p>
              {lang === "ko"
                ? "추가 로그는 생성 완료 후 행성 상세 또는 로그 작성 화면에서 이어서 남길 수 있습니다."
                : "After creation, continue with more logs from the planet detail page or the standalone log composer."}
            </p>
          </div>
        </aside>
        </div>
      </div>
    </main>
  );
}

// IDENTITY_SEAL: PART-1 | role=wizard entry page | inputs=auth state and language | outputs=planet creation screen
