"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
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
            <div className="site-kicker">{L4(lang, { ko: "로그인 필요", en: "Authentication Required", ja: "ログイン 필요", zh: "登录 필요" })}</div>
            <h1 className="site-title mt-3 text-3xl font-semibold">
              {L4(lang, { ko: "행성을 만들려면 먼저 로그인하세요.", en: "Sign in before creating your planet.", ja: "惑星을 만들려면 먼저 ログイン하세요.", zh: "星球을 만들려면 먼저 登录하세요." })}
            </h1>
            <p className="site-lede mx-auto mt-4 max-w-2xl text-sm md:text-base">
              {L4(lang, { ko: "회원은 행성 생성, 첫 로그 작성, 댓글과 반응을 사용할 수 있습니다.", en: "Members can create planets, publish first logs, and interact with the network.", ja: "メンバー은 惑星を作成, 첫 ログ 作成, コメント과 リアクション을 사용할 수 있습니다.", zh: "成员은 创建星球, 첫 日志 撰写, 评论과 反应을 사용할 수 있습니다." })}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <button type="button" onClick={() => void signInWithGoogle()} className="premium-button">
                {L4(lang, { ko: "Google 로그인", en: "Sign In with Google", ja: "Googleログイン", zh: "Google登录" })}
              </button>
              <a href="/network" className="text-sm text-text-tertiary hover:text-text-primary transition-colors">
                ← {L4(lang, { ko: "네트워크로 돌아가기", en: "Back to Network", ja: "ネットワーク로 戻る", zh: "网络로 返回" })}
              </a>
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
          <div className="site-kicker">{L4(lang, { ko: "진행 안내", en: "Flow Notes", ja: "진행 案内", zh: "진행 提示" })}</div>
          <div className="mt-4 space-y-4 text-sm leading-7 text-text-secondary">
            <p>
              {L4(lang, { ko: "1차 MVP는 행성 등록과 첫 관측 로그를 한 번에 생성합니다. 행성과 로그가 동시에 생겨야 첫 진입 경험이 끊기지 않습니다.", en: "The MVP creates the planet and its first log together so the first-use flow never breaks.", ja: "1차 MVP는 惑星 登録과 첫 観測 ログ를 한 번에 生成합니다. 惑星과 ログ가 동시에 생겨야 첫 진입 경험이 끊기지 않습니다.", zh: "1차 MVP는 星球 提交과 첫 观测 日志를 한 번에 生成합니다. 星球과 日志가 동시에 생겨야 첫 진입 경험이 끊기지 않습니다." })}
            </p>
            <p>
              {L4(lang, { ko: "대표 태그와 핵심 규칙은 카드와 상세 페이지 위젯에 바로 반영됩니다.", en: "Representative tags and core rules immediately show up on the cards and detail widgets.", ja: "대표 タグ와 핵심 규칙은 카드와 상세 ページ 위젯에 바로 반영됩니다.", zh: "대표 标签와 핵심 규칙은 카드와 상세 页面 위젯에 바로 반영됩니다." })}
            </p>
            <p>
              {L4(lang, { ko: "추가 로그는 생성 완료 후 행성 상세 또는 로그 작성 화면에서 이어서 남길 수 있습니다.", en: "After creation, continue with more logs from the planet detail page or the standalone log composer.", ja: "追加 ログ는 生成完了 후 惑星 상세 또는 ログ 作成 화면에서 이어서 남길 수 있습니다.", zh: "添加 日志는 生成完成 후 星球 상세 또는 日志 撰写 화면에서 이어서 남길 수 있습니다." })}
            </p>
          </div>
        </aside>
        </div>
      </div>
    </main>
  );
}

// IDENTITY_SEAL: PART-1 | role=wizard entry page | inputs=auth state and language | outputs=planet creation screen
