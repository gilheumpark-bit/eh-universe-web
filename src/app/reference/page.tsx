"use client";

import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";

export default function ReferencePage() {
  const { lang } = useLang();
  const en = lang === "en";

  return (
    <>
      <Header />
      <main className="pt-24">
        <div className="site-shell py-16 md:py-20">
          <div className="doc-header rounded-t-[24px] mb-0">
            <span className="badge badge-allow mr-2">PUBLIC</span>
            {en ? "Document Level: PUBLIC — Level 0 | Last Updated: 7000s | Author: Bureau of Investigation" : "문서 등급: PUBLIC — Level 0 | 최종 갱신: 7000년대 | 작성: 비밀조사국"}
          </div>

          <div className="premium-panel rounded-b-[30px] rounded-t-none border-t-0 p-6 sm:p-10">
            <h1 className="site-title text-3xl font-bold tracking-tight mb-2">EH OPEN REFERENCE</h1>
            <p className="text-text-tertiary text-sm font-[family-name:var(--font-document)] mb-12">
              A Narrative Engine That Prevents Story Collapse — {en ? "4-Page Summary" : "4-Page Summary"}
            </p>

            {/* Page 1 */}
            <section className="mb-16">
              <h2 className="font-[family-name:var(--font-mono)] text-lg font-bold text-accent-purple tracking-wider uppercase mb-6">
                01 — {en ? "What is EH?" : "EH란 무엇인가"}
              </h2>
              <div className="space-y-4 text-text-secondary leading-relaxed">
                <p>
                  <strong className="text-text-primary">EH (Error Heart)</strong>{" "}
                  {en
                    ? 'is the residual probability of human choices that no system can define. An abbreviation of "Human Error," it represents the total quantity of irrational behavior that narrative cannot logically explain.'
                    : '는 시스템이 정의할 수 없는 인간 선택의 잔여 가능성이다. "인간 오류(Human Error)"의 약자이자, 서사가 논리적으로 설명할 수 없는 비합리적 행동의 총량을 의미한다.'}
                </p>
                <div className="eh-log">
                  {en ? "High EH = More human = Narrative becomes unstable" : "EH가 높다 = 인간답다 = 서사는 불안정하다"}<br />
                  {en ? "Low EH = More precise = Narrative withers" : "EH가 낮다 = 정확하다 = 서사는 메말라간다"}
                </div>
                <p>
                  {en
                    ? "Unit of measurement: Hart. Baseline: Shin Min-a's sewer escape = 45,000 Hart."
                    : '측정 단위는 Hart. 기준점은 신민아의 하수도 탈출 사건(45,000 Hart).'}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="zone-card zone-red">
                    <h4 className="font-[family-name:var(--font-mono)] text-xs font-bold text-accent-red">TYPE A</h4>
                    <p className="text-xs text-text-secondary mt-1">{en ? "Pure Emotional — 1,000~100,000 Hart" : "순수 감정형 — 1,000~100,000 Hart"}</p>
                  </div>
                  <div className="zone-card zone-amber">
                    <h4 className="font-[family-name:var(--font-mono)] text-xs font-bold text-accent-amber">TYPE B</h4>
                    <p className="text-xs text-text-secondary mt-1">{en ? "Ethical — 500~50,000 Hart" : "윤리적 — 500~50,000 Hart"}</p>
                  </div>
                  <div className="zone-card zone-blue">
                    <h4 className="font-[family-name:var(--font-mono)] text-xs font-bold text-accent-blue">TYPE C</h4>
                    <p className="text-xs text-text-secondary mt-1">{en ? "Existential — 100~∞ Hart" : "존재형 — 100~∞ Hart"}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Page 2 */}
            <section className="mb-16">
              <h2 className="font-[family-name:var(--font-mono)] text-lg font-bold text-accent-purple tracking-wider uppercase mb-6">
                02 — {en ? "Five Human Types" : "인류 5유형"}
              </h2>
              <div className="space-y-3">
                {(en
                  ? [
                      { type: "Type 1", name: "Emotional", pct: "15%", desc: "Judges by emotion" },
                      { type: "Type 2", name: "Calculative", pct: "40%", desc: "Judges by cost-benefit" },
                      { type: "Type 3", name: "Decisive", pct: "1%", desc: "Judges by self-set standards" },
                      { type: "Type 4", name: "Observer", pct: "20%", desc: "Defers judgment" },
                      { type: "Type 5", name: "Physical", pct: "24%", desc: "Judges by bodily reaction" },
                    ]
                  : [
                      { type: "Type 1", name: "감정형", pct: "15%", desc: "감정으로 판단하는 유형" },
                      { type: "Type 2", name: "계산형", pct: "40%", desc: "이익·손실로 판단하는 유형" },
                      { type: "Type 3", name: "판단형", pct: "1%", desc: "자체 기준으로 판단하는 유형" },
                      { type: "Type 4", name: "관망형", pct: "20%", desc: "결정을 유보하는 유형" },
                      { type: "Type 5", name: "육체형", pct: "24%", desc: "신체적 반응으로 판단하는 유형" },
                    ]
                ).map((item) => (
                  <div key={item.type} className="premium-panel-soft flex items-center gap-4 rounded-[20px] p-4">
                    <span className="font-[family-name:var(--font-mono)] text-xs font-bold text-accent-purple w-16">{item.type}</span>
                    <span className="font-semibold text-text-primary text-sm w-20">{item.name}</span>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-accent-amber w-10">{item.pct}</span>
                    <span className="text-text-secondary text-xs">{item.desc}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Page 3 */}
            <section className="mb-16">
              <h2 className="font-[family-name:var(--font-mono)] text-lg font-bold text-accent-purple tracking-wider uppercase mb-6">
                03 — {en ? "Non-Intervention Principle & HPP" : "비개입 원칙과 HPP"}
              </h2>
              <div className="space-y-4 text-text-secondary leading-relaxed">
                <p>
                  <strong className="text-text-primary">{en ? "Non-Intervention Principle" : "비개입 원칙"}</strong>:{" "}
                  {en
                    ? "The non-interference policy over 200,000 planetary systems managed by the Galactic Central Council. Ensures natural development of civilizations, with limited intervention permitted only when HPP trigger conditions are met."
                    : "은하 중앙협의회가 관리하는 20만 개 행성계에 대한 불간섭 정책. 문명의 자연 발전을 보장하되, 인류보존 프로토콜(HPP) 발동 조건이 충족되면 제한적 개입이 허용된다."}
                </p>
                <div className="eh-log">
                  [PROTOCOL: HPP — Human Preservation Protocol]<br />
                  [TRIGGER: {en ? "Species extinction crisis detected" : "종 멸종 위기 감지"}]<br />
                  [SCOPE: {en ? "Minimum intervention, record preservation priority" : "최소 개입, 기록 보존 우선"}]<br />
                  [AUTHORITY: {en ? "Galactic Central Council" : "은하 중앙협의회"}]
                </div>
                <p>
                  {en
                    ? 'The Non-Intervention Principle is not "mercy." It is bureaucratic efficiency. If the cost of intervention exceeds the cost of non-intervention, they intervene. Nothing more, nothing less.'
                    : '비개입 원칙은 "자비"가 아니다. 관료적 효율성이다. 개입 비용이 비개입 비용을 초과하면 개입한다. 그 이상도 이하도 아니다.'}
                </p>
              </div>
            </section>

            {/* Page 4 */}
            <section className="mb-8">
              <h2 className="font-[family-name:var(--font-mono)] text-lg font-bold text-accent-purple tracking-wider uppercase mb-6">
                04 — {en ? "Deity Structure" : "신격 구조"}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {(en
                  ? [
                      { name: "Min-a", title: "The Witness", role: "God of Records", desc: "Sees everything. Changes nothing." },
                      { name: "N.O.A", title: "The Arbiter", role: "Failed God", desc: "Judges. But there is no correct answer." },
                      { name: "Seven", title: "The Glitch", role: "Playing God", desc: "Plays in the cracks. Never serious." },
                      { name: "Suo", title: "The Human God", role: "Choosing God", desc: "Was human. That makes it the most dangerous." },
                    ]
                  : [
                      { name: "민아", title: "The Witness", role: "기록의 신", desc: "모든 것을 본다. 아무것도 바꾸지 않는다." },
                      { name: "N.O.A", title: "The Arbiter", role: "실패한 신", desc: "판정한다. 그러나 정답은 없다." },
                      { name: "세븐", title: "The Glitch", role: "놀이하는 신", desc: "균열 사이에서 논다. 진지한 적 없다." },
                      { name: "수오", title: "The Human God", role: "선택하는 신", desc: "인간이었다. 그래서 가장 위험하다." },
                    ]
                ).map((g) => (
                  <div key={g.name} className="premium-link-card card-glow p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-[family-name:var(--font-mono)] text-sm font-bold text-text-primary">{g.name}</span>
                      <span className="badge badge-classified">{g.title}</span>
                    </div>
                    <p className="font-[family-name:var(--font-mono)] text-xs text-accent-purple mb-1">{g.role}</p>
                    <p className="text-xs text-text-secondary italic">{g.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-16 border-t border-border pt-6">
              <p className="font-[family-name:var(--font-document)] text-xs text-text-tertiary italic text-center">
                {en ? "This document is for Bureau of Investigation internal reference only." : "이 문서는 비밀조사국 내부 참조용이다."}<br />
                {en ? "Unauthorized disclosure will result in the personnel being processed as a typo." : "무단 유출 시 해당 인원은 오타로 처리된다."}
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
