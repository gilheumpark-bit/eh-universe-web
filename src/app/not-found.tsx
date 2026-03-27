"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";

export default function NotFound() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; jp?: string; cn?: string }) =>
    lang === "ko" ? v.ko : lang === "jp" && v.jp ? v.jp : lang === "cn" && v.cn ? v.cn : v.en;

  return (
    <>
      <Header />
      <main className="pt-14 flex-1 flex items-center justify-center">
        <div className="text-center px-4 py-20">
          <p
            className="font-[family-name:var(--font-mono)] text-6xl font-bold tracking-tighter mb-4"
            style={{ color: "var(--color-accent-purple)" }}
          >
            404
          </p>
          <p className="font-[family-name:var(--font-mono)] text-sm text-text-tertiary tracking-wider uppercase mb-2">
            {T({ ko: "신호 유실", en: "SIGNAL LOST", jp: "信号消失", cn: "信号丢失" })}
          </p>
          <p className="text-text-secondary text-sm mb-8 max-w-md mx-auto">
            {T({
              ko: "요청된 좌표가 알려진 은하에 존재하지 않습니다. 해당 페이지는 오타로 처리되었을 수 있습니다.",
              en: "The requested coordinates do not exist in the known galaxy. The page may have been processed as a typo.",
              jp: "リクエストされた座標は既知の銀河に存在しません。このページはタイプミスとして処理された可能性があります。",
              cn: "请求的坐标在已知银河系中不存在。该页面可能已被作为笔误处理。",
            })}
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/"
              aria-label={T({ ko: "홈으로 돌아가기", en: "Return to home page", jp: "ホームに戻る", cn: "返回首页" })}
              className="inline-block font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase px-6 py-3 border border-border rounded hover:border-accent-purple hover:text-accent-purple transition-colors"
            >
              {T({ ko: "기지로 귀환", en: "RETURN TO BASE", jp: "基地へ帰還", cn: "返回基地" })}
            </Link>
            <Link
              href="/studio"
              aria-label={T({ ko: "스튜디오로 이동", en: "Go to studio", jp: "スタジオへ", cn: "前往工作室" })}
              className="inline-block font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase px-6 py-3 border border-border rounded hover:border-accent-purple hover:text-accent-purple transition-colors"
            >
              {T({ ko: "스튜디오", en: "STUDIO", jp: "スタジオ", cn: "工作室" })}
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
