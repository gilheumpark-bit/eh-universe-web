"use client";

import Header from "@/components/Header";
import { useLang, L2A } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { useState, useEffect } from "react";

const sections = {
  ko: [
    { id: "overview", title: "1. 개요", content: `EH Rulebook은 EH Universe 세계관 내에서 서사 일관성을 유지하기 위한 공식 프레임워크이다. 이 규칙서는 "서사 붕괴(Story Collapse)"를 방지하는 것을 최우선 목적으로 한다.\n\n서사 붕괴란, 세계관 내 설정·규칙·인과관계가 모순되어 이야기의 신뢰성이 파괴되는 현상을 말한다.` },
    { id: "core-principles", title: "2. 핵심 원칙", content: `2.1 관료주의 호러 (Bureaucratic Horror)\n시스템은 잔혹하지 않다. 효율적이다. 공포는 의도가 아니라 절차에서 발생한다.\n\n2.2 비인격적 폭력 (Depersonalized Violence)\n폭력은 개인의 의지가 아닌 시스템의 산물이다. 가해자는 없고, 절차만 있다.\n\n2.3 아날로그 vs 디지털 (Analog vs Digital)\n인간성은 비효율에서 증명된다. 디지털화된 사회에서 아날로그적 행동이 EH를 생성한다.\n\n2.4 기록 vs 삭제 (Record vs Deletion)\n존재의 증명은 기록이다. 삭제된 기록의 주인은 "오타"로 처리된다.` },
    { id: "eh-system", title: "3. EH 시스템", content: `3.1 정의\nEH(Error Heart)는 시스템이 정의할 수 없는 선택의 잔여 가능성이다.\n\n3.2 측정\n단위: Hart\n기준점: 신민아 하수도 탈출 = 45,000 Hart\n\n3.3 분류\n- Type A (순수 감정형): 1,000~100,000 Hart\n- Type B (윤리적): 500~50,000 Hart\n- Type C (존재형): 100~∞ Hart` },
    { id: "sjc", title: "4. SJC 판정 체계", content: `SJC(Structural Judgment Core)는 서사 내 모든 판정의 최종 기준이다.\n\nALLOW: 조건 충족. 서사 속행.\nHOLD: 조건 이탈 감지. 서사 일시 정지, 복원 시도.\nDENY: 복원 불가. 기록 보존 후 서사 종료.\n\nSJC는 예측하지 않는다. 판정할 뿐이다.\nSJC는 감정이 없다. 기준만 있다.` },
    { id: "non-intervention", title: "5. 비개입 원칙", content: `은하 중앙협의회의 핵심 정책. 20만 개 행성계에 대한 불간섭 원칙.\n\n예외: HPP(인류보존 프로토콜) 발동 시 제한적 개입 허용.\n\n비개입은 "자비"가 아니다.\n관료적 효율성이다.\n개입 비용이 비개입 비용을 초과하면 개입한다.\n그 이상도 이하도 아니다.` },
    { id: "human-types", title: "6. 인류 5유형", content: `EH 시스템에 의해 분류된 인류의 5가지 유형:\n\nType 1 — 감정형 (15%): 감정으로 판단\nType 2 — 계산형 (40%): 이익·손실로 판단\nType 3 — 판단형 (1%): 자체 기준으로 판단\nType 4 — 관망형 (20%): 결정을 유보\nType 5 — 육체형 (24%): 신체적 반응으로 판단\n\n이 분류는 고정이 아니다. 상황에 따라 유형 간 전환이 발생한다.` },
    { id: "narrative-rules", title: "7. 서사 규칙", content: `7.1 인과관계 보존\n모든 사건은 선행 조건을 가져야 한다. "갑자기"는 허용되지 않는다.\n\n7.2 EH 보존 법칙\n서사 내 총 EH 양은 보존된다. 한쪽에서 EH가 소모되면 다른 곳에서 생성된다.\n\n7.3 기록 우선 원칙\n사건이 발생하면 반드시 기록된다. 기록되지 않은 사건은 존재하지 않는 것으로 간주한다.\n\n7.4 시스템 일관성\n시스템의 규칙은 예외 없이 적용된다. "특별한 경우"는 존재하지 않는다.` },
    { id: "timeline", title: "8. 타임라인 기준", content: `1945: 기원 — 나치 유산 세탁, Project Ascendancy 태동\n2025: 전환점 — 신민아 폭로, EH 실험 청문회\n2050-2092: 전쟁기 — 제1차/제2차 전쟁\n2095-2170: HPG — 인류재배치 프로젝트\n2170-3000: 대팽창 — 다행성 문명\n3000-6451: 수오 — 은하 중앙협의회 체제\n6451: LAST KEY — 최종 정산\n7000+: 현재 — 네카 전쟁 시대` },
  ],
  en: [
    { id: "overview", title: "1. Overview", content: `EH Rulebook is the official framework for maintaining narrative consistency within the EH Universe. Its primary purpose is preventing "Story Collapse."\n\nStory Collapse is the phenomenon where settings, rules, and cause-effect relationships within the world become contradictory, destroying the story's credibility.` },
    { id: "core-principles", title: "2. Core Principles", content: `2.1 Bureaucratic Horror\nThe system is not cruel. It is efficient. Horror arises not from intent, but from procedure.\n\n2.2 Depersonalized Violence\nViolence is a product of the system, not individual will. There are no perpetrators — only procedures.\n\n2.3 Analog vs Digital\nHumanity is proven through inefficiency. In a digitized society, analog behavior generates EH.\n\n2.4 Record vs Deletion\nExistence is proven by records. The owner of a deleted record is processed as a "typo."` },
    { id: "eh-system", title: "3. EH System", content: `3.1 Definition\nEH (Error Heart) is the residual probability of choices that no system can define.\n\n3.2 Measurement\nUnit: Hart\nBaseline: Shin Min-a sewer escape = 45,000 Hart\n\n3.3 Classification\n- Type A (Pure Emotional): 1,000~100,000 Hart\n- Type B (Ethical): 500~50,000 Hart\n- Type C (Existential): 100~∞ Hart` },
    { id: "sjc", title: "4. SJC Judgment System", content: `SJC (Structural Judgment Core) is the final criterion for all judgments within the narrative.\n\nALLOW: Conditions met. Narrative continues.\nHOLD: Condition deviation detected. Narrative paused, restoration attempted.\nDENY: Restoration impossible. Record preserved, narrative terminated.\n\nSJC does not predict. It only judges.\nSJC has no emotions. Only criteria.` },
    { id: "non-intervention", title: "5. Non-Intervention Principle", content: `Core policy of the Galactic Central Council. Non-interference across 200,000 planetary systems.\n\nException: Limited intervention permitted upon HPP (Human Preservation Protocol) activation.\n\nNon-intervention is not "mercy."\nIt is bureaucratic efficiency.\nIf the cost of intervention exceeds the cost of non-intervention, they intervene.\nNothing more, nothing less.` },
    { id: "human-types", title: "6. Five Human Types", content: `Five types of humanity classified by the EH system:\n\nType 1 — Emotional (15%): Judges by emotion\nType 2 — Calculative (40%): Judges by cost-benefit\nType 3 — Decisive (1%): Judges by self-set standards\nType 4 — Observer (20%): Defers judgment\nType 5 — Physical (24%): Judges by bodily reaction\n\nThis classification is not fixed. Transitions between types occur depending on circumstances.` },
    { id: "narrative-rules", title: "7. Narrative Rules", content: `7.1 Causality Preservation\nAll events must have preconditions. "Suddenly" is not permitted.\n\n7.2 EH Conservation Law\nTotal EH within a narrative is conserved. When EH is consumed in one place, it is generated elsewhere.\n\n7.3 Record Priority Principle\nWhen an event occurs, it must be recorded. Unrecorded events are considered nonexistent.\n\n7.4 System Consistency\nSystem rules apply without exception. "Special cases" do not exist.` },
    { id: "timeline", title: "8. Timeline Reference", content: `1945: Origin — Nazi legacy laundering, Project Ascendancy conceived\n2025: Turning Point — Shin Min-a exposé, EH experiment hearings\n2050-2092: War Era — First/Second Wars\n2095-2170: HPG — Humanity Placement to Galaxy\n2170-3000: Great Expansion — Multi-planetary civilization\n3000-6451: Suo — Galactic Central Council era\n6451: LAST KEY — Final settlement\n7000+: Present — Neka War era` },
  ],
};

export default function RulebookPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; jp?: string; cn?: string }) => L4(lang, v);
  const secs = L2A(sections, lang);
  const [activeId, setActiveId] = useState(secs[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    secs.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [secs]);

  return (
    <>
      <Header />
      <main className="pt-24">
        <div className="site-shell py-16 md:py-20">
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-56 shrink-0">
              <div className="premium-panel-soft rounded-xl p-4 lg:sticky lg:top-24">
                <h2 className="font-[--font-mono] text-xs font-bold text-text-tertiary tracking-[0.2em] uppercase mb-4">
                  {T({ ko: "목차", en: "Contents", jp: "目次", cn: "目录" })}
                </h2>
                <nav className="space-y-1" role="navigation" aria-label={T({ ko: "목차", en: "Table of contents", jp: "目次", cn: "目录" })}>
                  {secs.map((s) => (
                    <a key={s.id} href={`#${s.id}`} aria-label={s.title} aria-current={activeId === s.id ? "location" : undefined} className={`block py-1.5 px-3 rounded text-xs transition-colors font-[--font-mono] ${
                      activeId === s.id
                        ? "text-accent-amber bg-accent-amber/10 font-bold"
                        : "text-text-secondary hover:text-text-primary hover:bg-white/4"
                    }`}>
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              <div className="doc-header rounded-t-xl mb-0">
                <span className="badge badge-classified mr-2">RESTRICTED</span>
                {T({ ko: "문서 등급: RESTRICTED — Level 3 | 버전: 1.0 | 작성: 비밀조사국", en: "Document Level: RESTRICTED — Level 3 | Version: 1.0 | Author: Bureau of Investigation" })}
              </div>
              <div className="premium-panel rounded-b-[30px] rounded-t-none border-t-0 p-8 sm:p-12">
                <h1 className="site-title text-3xl font-bold tracking-tight mb-2">EH RULEBOOK v1.0</h1>
                <p className="text-text-tertiary text-sm font-[--font-document] mb-12">A Narrative Engine That Prevents Story Collapse</p>

                {secs.map((s) => (
                  <section key={s.id} id={s.id} className="mb-12 scroll-mt-24">
                    <h2 className="font-[--font-mono] text-lg font-bold text-accent-purple tracking-wider uppercase mb-4 pb-2 border-b border-border">{s.title}</h2>
                    <div className="whitespace-pre-line text-text-secondary leading-relaxed text-sm">{s.content}</div>
                  </section>
                ))}

                <div className="mt-16 border-t border-border pt-6">
                  <p className="font-[--font-document] text-xs text-text-tertiary italic text-center">
                    {T({ ko: "이 문서는 비밀조사국 내부 참조용이다.", en: "This document is for Bureau of Investigation internal reference only." })}<br />
                    {T({ ko: "무단 유출 시 해당 인원은 오타로 처리된다.", en: "Unauthorized disclosure will result in the personnel being processed as a typo." })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
