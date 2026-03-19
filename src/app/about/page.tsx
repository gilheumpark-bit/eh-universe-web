import Header from "@/components/Header";

export const metadata = {
  title: "About — EH Universe",
  description: "EH Universe 프로젝트 소개 및 라이선스 정보.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="pt-14">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="doc-header rounded-t mb-0">
            <span className="badge badge-allow mr-2">ALLOW</span>
            문서 등급: PUBLIC — Level 0
          </div>

          <div className="border border-t-0 border-border rounded-b bg-bg-secondary p-8 sm:p-12">
            <h1 className="font-[family-name:var(--font-mono)] text-3xl font-bold tracking-tight mb-8">
              ABOUT
            </h1>

            <section className="mb-10">
              <h2 className="font-[family-name:var(--font-mono)] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                프로젝트
              </h2>
              <p className="text-text-secondary leading-relaxed mb-4">
                EH Universe는 6,600만 년의 검증된 SF 우주 + 오픈소스 서사 엔진을 제공하는 프로젝트입니다. 설정집, 룰북, 세계관 위키를 통해 창작자들이 서사 붕괴 없이 이야기를 만들 수 있도록 돕습니다.
              </p>
              <p className="font-[family-name:var(--font-document)] text-sm text-text-tertiary italic">
                &ldquo;이것을 사용하거나, 거짓말을 하거나. 셋째는 없다.&rdquo;
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-[family-name:var(--font-mono)] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                EH Rulebook v1.0
              </h2>
              <p className="text-text-secondary leading-relaxed">
                서사 엔진의 공식 규칙서입니다. 세계관 내 서사 일관성을 유지하기 위한 프레임워크로, 모든 창작물이 이 룰북에 기반하여 검증됩니다.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-[family-name:var(--font-mono)] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                라이선스
              </h2>
              <div className="space-y-3 text-text-secondary text-sm">
                <div className="flex items-center gap-3">
                  <span className="badge badge-allow">LICENSE</span>
                  <span>CC-BY-NC-4.0 (Creative Commons Attribution-NonCommercial 4.0)</span>
                </div>
                <p>
                  비상업적 목적의 사용, 공유, 변형이 자유롭습니다. 상업적 활용은 별도 협의가 필요합니다.
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="font-[family-name:var(--font-mono)] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                링크
              </h2>
              <div className="space-y-2">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-text-secondary hover:text-accent-purple transition-colors text-sm"
                >
                  <span className="font-[family-name:var(--font-mono)]">→</span>
                  GitHub Repository
                </a>
              </div>
            </section>

            <section>
              <h2 className="font-[family-name:var(--font-mono)] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                연락처
              </h2>
              <p className="text-text-secondary text-sm">
                프로젝트 관련 문의 및 상업적 협의는 GitHub Issues를 통해 연락해주세요.
              </p>
            </section>

            <div className="mt-12 border-t border-border pt-6">
              <p className="font-[family-name:var(--font-document)] text-xs text-text-tertiary italic text-center">
                &ldquo;삭제된 인원의 기록은 오타로 처리된다.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
