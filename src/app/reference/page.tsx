import Header from "@/components/Header";

export const metadata = {
  title: "EH Open Reference — EH Universe",
  description: "EH Universe 4페이지 요약. 여기서 시작하세요.",
};

export default function ReferencePage() {
  return (
    <>
      <Header />
      <main className="pt-14">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="doc-header rounded-t mb-0">
            <span className="badge badge-allow mr-2">ALLOW</span>
            문서 등급: PUBLIC — Level 0 &nbsp;|&nbsp; 최종 갱신: 7000년대
            &nbsp;|&nbsp; 작성: 비밀조사국
          </div>

          <div className="border border-t-0 border-border rounded-b bg-bg-secondary p-8 sm:p-12">
            <h1 className="font-[family-name:var(--font-mono)] text-3xl font-bold tracking-tight mb-2">
              EH OPEN REFERENCE
            </h1>
            <p className="text-text-tertiary text-sm font-[family-name:var(--font-document)] mb-12">
              A Narrative Engine That Prevents Story Collapse — 4-Page Summary
            </p>

            {/* Page 1 */}
            <section className="mb-16">
              <h2 className="font-[family-name:var(--font-mono)] text-lg font-bold text-accent-purple tracking-wider uppercase mb-6">
                01 — EH란 무엇인가
              </h2>
              <div className="space-y-4 text-text-secondary leading-relaxed">
                <p>
                  <strong className="text-text-primary">EH (Error Heart)</strong>
                  는 시스템이 정의할 수 없는 인간 선택의 잔여 가능성이다. &quot;인간 오류(Human Error)&quot;의 약자이자, 서사가 논리적으로 설명할 수 없는 비합리적 행동의 총량을 의미한다.
                </p>
                <div className="eh-log">
                  EH가 높다 = 인간답다 = 서사는 불안정하다
                  <br />
                  EH가 낮다 = 정확하다 = 서사는 메말라간다
                </div>
                <p>
                  측정 단위는 <strong className="text-text-primary">Hart</strong>. 기준점은 신민아의 하수도 탈출 사건(45,000 Hart).
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="zone-card zone-red">
                    <h4 className="font-[family-name:var(--font-mono)] text-xs font-bold text-accent-red">TYPE A</h4>
                    <p className="text-xs text-text-secondary mt-1">순수 감정형 — 1,000~100,000 Hart</p>
                  </div>
                  <div className="zone-card zone-amber">
                    <h4 className="font-[family-name:var(--font-mono)] text-xs font-bold text-accent-amber">TYPE B</h4>
                    <p className="text-xs text-text-secondary mt-1">윤리적 — 500~50,000 Hart</p>
                  </div>
                  <div className="zone-card zone-blue">
                    <h4 className="font-[family-name:var(--font-mono)] text-xs font-bold text-accent-blue">TYPE C</h4>
                    <p className="text-xs text-text-secondary mt-1">존재형 — 100~∞ Hart</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Page 2 */}
            <section className="mb-16">
              <h2 className="font-[family-name:var(--font-mono)] text-lg font-bold text-accent-purple tracking-wider uppercase mb-6">
                02 — 인류 5유형
              </h2>
              <div className="space-y-3">
                {[
                  { type: "Type 1", name: "감정형", pct: "15%", desc: "감정으로 판단하는 유형" },
                  { type: "Type 2", name: "계산형", pct: "40%", desc: "이익·손실로 판단하는 유형" },
                  { type: "Type 3", name: "판단형", pct: "1%", desc: "자체 기준으로 판단하는 유형" },
                  { type: "Type 4", name: "관망형", pct: "20%", desc: "결정을 유보하는 유형" },
                  { type: "Type 5", name: "육체형", pct: "24%", desc: "신체적 반응으로 판단하는 유형" },
                ].map((item) => (
                  <div
                    key={item.type}
                    className="flex items-center gap-4 rounded border border-border bg-bg-primary p-4"
                  >
                    <span className="font-[family-name:var(--font-mono)] text-xs font-bold text-accent-purple w-16">
                      {item.type}
                    </span>
                    <span className="font-semibold text-text-primary text-sm w-16">
                      {item.name}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-accent-amber w-10">
                      {item.pct}
                    </span>
                    <span className="text-text-secondary text-xs">
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Page 3 */}
            <section className="mb-16">
              <h2 className="font-[family-name:var(--font-mono)] text-lg font-bold text-accent-purple tracking-wider uppercase mb-6">
                03 — 비개입 원칙과 HPP
              </h2>
              <div className="space-y-4 text-text-secondary leading-relaxed">
                <p>
                  <strong className="text-text-primary">비개입 원칙</strong>: 은하 중앙협의회가 관리하는 20만 개 행성계에 대한 불간섭 정책. 문명의 자연 발전을 보장하되, 인류보존 프로토콜(HPP) 발동 조건이 충족되면 제한적 개입이 허용된다.
                </p>
                <div className="eh-log">
                  [PROTOCOL: HPP — Human Preservation Protocol]
                  <br />
                  [TRIGGER: 종 멸종 위기 감지]
                  <br />
                  [SCOPE: 최소 개입, 기록 보존 우선]
                  <br />
                  [AUTHORITY: 은하 중앙협의회]
                </div>
                <p>
                  비개입 원칙은 &quot;자비&quot;가 아니다. 관료적 효율성이다. 개입 비용이 비개입 비용을 초과하면 개입한다. 그 이상도 이하도 아니다.
                </p>
              </div>
            </section>

            {/* Page 4 */}
            <section className="mb-8">
              <h2 className="font-[family-name:var(--font-mono)] text-lg font-bold text-accent-purple tracking-wider uppercase mb-6">
                04 — 신격 구조
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { name: "민아", title: "The Witness", role: "기록의 신", desc: "모든 것을 본다. 아무것도 바꾸지 않는다." },
                  { name: "N.O.A", title: "The Arbiter", role: "실패한 신", desc: "판정한다. 그러나 정답은 없다." },
                  { name: "세븐", title: "The Glitch", role: "놀이하는 신", desc: "균열 사이에서 논다. 진지한 적 없다." },
                  { name: "수오", title: "The Human God", role: "선택하는 신", desc: "인간이었다. 그래서 가장 위험하다." },
                ].map((g) => (
                  <div key={g.name} className="card-glow rounded border border-border bg-bg-primary p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-[family-name:var(--font-mono)] text-sm font-bold text-text-primary">
                        {g.name}
                      </span>
                      <span className="badge badge-classified">{g.title}</span>
                    </div>
                    <p className="font-[family-name:var(--font-mono)] text-xs text-accent-purple mb-1">
                      {g.role}
                    </p>
                    <p className="text-xs text-text-secondary italic">
                      {g.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Footer note */}
            <div className="mt-16 border-t border-border pt-6">
              <p className="font-[family-name:var(--font-document)] text-xs text-text-tertiary italic text-center">
                이 문서는 비밀조사국 내부 참조용이다.
                <br />
                무단 유출 시 해당 인원은 오타로 처리된다.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
