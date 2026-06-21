import type { Metadata } from "next";
import Link from "next/link";
import { getNovelStudioHref } from "@/lib/studio-entry-links";

export const metadata: Metadata = {
  title: "문제 제보 | Loreguard",
  description: "Loreguard 사용 중 발견한 문제를 제보하는 안내 페이지입니다.",
};

const GITHUB_ISSUE_URL = "https://github.com/gilheumpark-bit/eh-universe-web/issues/new";

export default function BugReportPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-6 py-16 text-text-primary">
      <section className="mx-auto flex max-w-2xl flex-col items-start gap-8">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-secondary">
            Loreguard Support
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            문제 제보
          </h1>
          <p className="max-w-xl text-sm leading-7 text-text-secondary">
            화면 오류, 저장/내보내기 문제, 번역·현지화 흐름의 이상 동작을 발견하면
            테스트용 설명과 재현 절차를 함께 남겨 주세요. 원고 전문이나 비공개 설정집은
            공개 이슈에 올리지 않는 편이 안전합니다.
          </p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2">
          <a
            href={GITHUB_ISSUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-text-primary px-4 text-sm font-semibold text-bg-primary shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2"
          >
            GitHub Issues 열기
          </a>
          <Link
            href={getNovelStudioHref("manage")}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-bg-secondary px-4 text-sm font-semibold text-text-primary transition hover:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2"
          >
            스튜디오로 돌아가기
          </Link>
        </div>

        <div className="w-full rounded-lg border border-border bg-bg-secondary p-5 text-sm leading-7 text-text-secondary">
          <h2 className="mb-2 text-base font-semibold text-text-primary">제보에 포함하면 좋은 것</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>문제가 난 주소와 탭 이름</li>
            <li>누른 버튼이나 입력한 테스트 문구</li>
            <li>새로고침 후에도 반복되는지 여부</li>
            <li>가능하면 화면 캡처와 브라우저 콘솔 메시지</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
