"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useLang, L2 } from "@/lib/LangContext";

/* ─── ZONE DATA ─── */
const ZONES = [
  { id: "BLACK", range: "0~10%", grade: "\u2014", net: "\u2014", gate: "\u2014",
    color: "#222233",
    ko: "은하 핵. 초대질량 블랙홀 + 항성 과밀. 방사선 사멸 지대. 거주 불가.",
    en: "Galactic core. Supermassive black hole + stellar overdensity. Radiation dead zone. No habitation." },
  { id: "GREEN", range: "10~50%", grade: "S~A", net: "3", gate: "Tier 1",
    color: "#2a7a44",
    ko: "핵심 문명권. 인구 70%+. 협의회 본부, 중앙은행, 비밀조사국 본부. 전쟁을 모른다.",
    en: "Core civilization. 70%+ population. Council HQ, Central Bank, Bureau HQ. Unaware of the war." },
  { id: "BLUE", range: "50~70%", grade: "A~B", net: "2~3", gate: "Tier 2",
    color: "#2980b9",
    ko: "표준 생활권. 일반 경제 활동. 학술회 교류 활발. 전쟁을 모른다.",
    en: "Standard living zone. Active economy and academic exchange. Unaware of the war." },
  { id: "YELLOW", range: "70~90%", grade: "B~D", net: "1~2", gate: "Tier 3",
    color: "#c8a020",
    ko: "변경. Gate 희소. 자치 행성 다수. 해방연대 세력권 시작. 전쟁을 모른다.",
    en: "Frontier. Sparse Gates. Self-governing planets. Liberation Alliance begins. Unaware of the war." },
  { id: "AMBER", range: "90~97%", grade: "C~E", net: "0~1", gate: "Tier 4",
    color: "#cc6622",
    ko: "완충 구역. 행성 소멸 감지되나 원인 불명. 지도자만 인지. 조사국 전초기지.",
    en: "Buffer zone. Planet disappearances detected \u2014 cause unknown. Only leaders aware. Bureau outposts." },
  { id: "RED", range: "97~100%", grade: "D~E", net: "0", gate: "\u2014",
    color: "#cc2222",
    ko: "전장. 6,000 행성계. 폭 약 753광년. 비밀조사국 단독 작전 구역. 네카 함대 활동.",
    en: "Warzone. 6,000 systems. Width ~753 ly. Bureau sole jurisdiction. Neka fleet activity." },
];

interface TierData {
  tier: string; zone: string; name: { ko: string; en: string }; color: string;
  desc: { ko: string; en: string };
  specs: { val: string; label: { ko: string; en: string } }[];
}

const TIERS: TierData[] = [
  { tier: "TIER 1", zone: "GREEN", name: { ko: "CORE CORRIDOR \u2014 \ud5c8\ube0c Gate v47", en: "CORE CORRIDOR \u2014 Hub Gate v47" }, color: "#4488cc",
    desc: {
      ko: "Gate v47 \ud5c8\ube0c 6\uac1c + \ud5c8\ube0c \uac04 Spacetime Corridor(\uc601\uad6c \ud1b5\ub85c) \uc5f0\uacb0.\n\ud658\ud615 \uace0\uc18d\ub3c4\ub85c. \uc778\ub958 \ubb3c\ub958/\ud1b5\uc2e0/\uacbd\uc81c\uc758 \ub300\ub3d9\ub9e5. \ud30c\uad34 \uc2dc \uc740\ud558 \uacbd\uc81c \ubd95\uad34.",
      en: "6 Gate v47 hubs connected by permanent Spacetime Corridors (ring highway).\nGalaxy's aorta \u2014 logistics, communications, economy. Destruction = galactic economic collapse.",
    },
    specs: [
      { val: "12km", label: { ko: "\uc678\uacbd", en: "DIAMETER" } },
      { val: "48,000", label: { ko: "\ubaa8\ub4c8", en: "MODULES" } },
      { val: "\u03c6 0.710", label: { ko: "\uc548\uc815\ub3c4", en: "STABILITY" } },
      { val: "12s", label: { ko: "HOLD", en: "HOLD TIME" } },
      { val: "4.7 ly", label: { ko: "1\ud68c \uc810\ud504", en: "PER JUMP" } },
      { val: "6", label: { ko: "\ud5c8\ube0c \uc218", en: "HUBS" } },
    ],
  },
  { tier: "TIER 2", zone: "GREEN → BLUE", name: { ko: "RADIAL CORRIDOR GATE \u2014 \ubc29\uc0ac\ud615 \uc911\uacc4", en: "RADIAL CORRIDOR GATE" }, color: "#2980b9",
    desc: {
      ko: "\ud5c8\ube0c\uc5d0\uc11c \ubc14\uae65\uc73c\ub85c \ubc29\uc0ac\ud615 Corridor 12\uac1c. BLUE \uad6c\uc5ed \uc911\uacc4 Gate \uc5f0\uacb0.\nDirect Warp \uc2e4\uc6a9 \uad6c\uac04. 4.7\uad11\ub144 \uc810\ud504 \ubc18\ubcf5. \ud45c\uc900 \ud56d\ud589 \ub8e8\ud2b8.",
      en: "12 radial corridors extending from hubs outward. Standard transit route.\nDirect Warp practical zone. 4.7 ly jumps. Freight/passenger main arteries.",
    },
    specs: [
      { val: "~6km", label: { ko: "\uc678\uacbd", en: "DIAMETER" } },
      { val: "20,000", label: { ko: "\ubaa8\ub4c8", en: "MODULES" } },
      { val: "\u03c6 0.705", label: { ko: "\uc548\uc815\ub3c4", en: "STABILITY" } },
      { val: "15s", label: { ko: "HOLD", en: "HOLD TIME" } },
      { val: "12", label: { ko: "\ub178\uc120", en: "CORRIDORS" } },
    ],
  },
  { tier: "TIER 3", zone: "BLUE → YELLOW", name: { ko: "FRONTIER GATE \u2014 \uc804\ucd08", en: "FRONTIER GATE" }, color: "#d4a017",
    desc: {
      ko: "\ubc29\uc0ac\ud615 Corridor \ub05d\uc5d0\uc11c \ubcc0\uacbd\uc73c\ub85c \uc5f0\uc7a5. Gate \uac04\uaca9 \ub113\uc5b4\uc9d0.\nCorridor \ubbf8\uc644\uc131 \uad6c\uac04. Multi-hop \ud544\uc694. \ud56d\ud589 \uc2dc\uac04 \uae09\uc99d.\n\ud574\ubc29\uc5f0\ub300\uac00 \uc774 \uad6c\uac04\uc758 Gate\ub97c \ube44\uacf5\uc2dd \uc0ac\uc6a9\ud558\ub294 \uacbd\uc6b0 \uc788\uc74c.",
      en: "Extensions beyond radial corridors. Widening intervals.\nIncomplete corridors. Multi-hop required. Transit time increases sharply.\nLiberation Alliance occasionally uses these gates unofficially.",
    },
    specs: [
      { val: "~2km", label: { ko: "\uc678\uacbd", en: "DIAMETER" } },
      { val: "1,500~3,000", label: { ko: "\ubaa8\ub4c8", en: "MODULES" } },
      { val: "\u03c6 0.68~0.70", label: { ko: "\uc548\uc815\ub3c4", en: "STABILITY" } },
      { val: "30~60s", label: { ko: "HOLD", en: "HOLD TIME" } },
    ],
  },
  { tier: "TIER 4", zone: "AMBER", name: { ko: "EMERGENCY GATE \u2014 \ube44\uc0c1", en: "EMERGENCY GATE" }, color: "#c0392b",
    desc: {
      ko: "\ube44\ubc00\uc870\uc0ac\uad6d\uc774 \uc804\uc7c1 \ub300\uc751\uc6a9\uc73c\ub85c \uc124\uce58\ud55c \ube44\uc0c1 Gate. \uadf9\uc18c\uc218. \uc704\uce58 \uae30\ubc00.\nRED \uad6c\uc5ed\uacfc\uc758 \uc720\uc77c\ud55c \uc5f0\uacb0\uc810. \uc18c\ud589\uc131 \uc794\ud574 \uc0ac\uc774\uc5d0 \uc704\uc7a5 \ubc30\uce58.\n3\uac1c\ub9cc \ub04a\uae30\uba74 RED \uc804\uc7a5\uc774 \uc740\ud558 \ubcf8\ud1a0\uc640 \uc644\uc804 \ub2e8\uc808.\n\ubc29\uc5b4 \uc6b0\uc120\uc21c\uc704: Gate > \ud589\uc131 > \ud568\uc120.",
      en: "Bureau-installed wartime response gates. Extremely few. Location: CLASSIFIED.\nOnly lifeline to RED zone. Camouflaged among asteroid debris.\n3 destroyed = RED warzone completely severed from galactic mainland.\nDefense priority: Gate > Planet > Vessel.",
    },
    specs: [
      { val: "~1km", label: { ko: "\uc678\uacbd", en: "DIAMETER" } },
      { val: "500~800", label: { ko: "\ubaa8\ub4c8", en: "MODULES" } },
      { val: "\u03c6 0.690", label: { ko: "\uc548\uc815\ub3c4", en: "STABILITY" } },
      { val: "20~40s", label: { ko: "HOLD", en: "HOLD TIME" } },
      { val: "3~5", label: { ko: "\uc804 \uc740\ud558", en: "TOTAL" } },
    ],
  },
];

const CALCS = [
  { label: { ko: "\uc740\ud558 \uc9c0\ub984", en: "Galaxy Diameter" }, val: "100,000 ly", color: "#4488cc" },
  { label: { ko: "\uc740\ud558 \ubc18\uacbd", en: "Galaxy Radius" }, val: "50,000 ly", color: "#4488cc" },
  { label: { ko: "3% \ub9c1 \ud3ed (\uba74\uc801 \uae30\uc900)", en: "3% Ring Width (area)" }, val: "~753 ly", color: "#cc2222" },
  { label: { ko: "3% \ub9c1 \uba74\uc801", en: "3% Ring Area" }, val: "~236M sq\u00b7ly", color: "#cc2222" },
  { label: { ko: "\ucd94\uc815 \ud56d\uc131 \uc218 (3%)", en: "Est. Stars (3%)" }, val: "6~12B", color: "#c8a020" },
  { label: { ko: "\uc778\ub958 \ud589\uc131\uacc4 (3%)", en: "Human Systems (3%)" }, val: "~6,000", color: "#cc2222" },
];

/* ─── SVG COMPONENTS ─── */
function GalaxyMapSVG() {
  return (
    <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Galaxy zone map showing concentric zones from BLACK core to RED warzone" className="w-full max-w-[600px] mx-auto" style={{ fontFamily: "var(--font-mono, monospace)" }}>
      <circle cx="250" cy="250" r="245" fill="none" stroke="#cc2222" strokeWidth="8" opacity="0.5"/>
      <circle cx="250" cy="250" r="245" fill="none" stroke="#cc2222" strokeWidth="1" opacity="0.3"/>
      <circle cx="250" cy="250" r="237" fill="#1a0f08" stroke="#cc6622" strokeWidth="0.5" opacity="0.4"/>
      <circle cx="250" cy="250" r="228" fill="#12100a" stroke="#c8a020" strokeWidth="0.5" opacity="0.3"/>
      <circle cx="250" cy="250" r="200" fill="#0a0e14" stroke="#2980b9" strokeWidth="0.5" opacity="0.3"/>
      <circle cx="250" cy="250" r="168" fill="#080f0c" stroke="#2a7a44" strokeWidth="0.8" opacity="0.4"/>
      <circle cx="250" cy="250" r="78" fill="#0a0a10" stroke="#333355" strokeWidth="0.5" opacity="0.5"/>
      <circle cx="250" cy="250" r="3" fill="#555566"/>
      {/* Gate Hubs */}
      {[[250,140],[345,195],[345,305],[250,360],[155,305],[155,195]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="#4488cc" opacity="0.8"/>
      ))}
      {/* Corridors */}
      {[[250,140,345,195],[345,195,345,305],[345,305,250,360],[250,360,155,305],[155,305,155,195],[155,195,250,140]].map(([x1,y1,x2,y2],i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4488cc" strokeWidth="0.8" strokeDasharray="4,4" opacity="0.5"/>
      ))}
      {/* Radial */}
      {[[250,140,250,55],[345,195,420,120],[345,305,420,380],[250,360,250,445],[155,305,80,380],[155,195,80,120]].map(([x1,y1,x2,y2],i) => (
        <line key={`r${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2980b9" strokeWidth="0.5" strokeDasharray="3,5" opacity="0.3"/>
      ))}
      {/* Frontier */}
      {[[250,38],[438,105],[438,395],[62,105],[62,395]].map(([x,y],i) => (
        <circle key={`f${i}`} cx={x} cy={y} r="2.5" fill="#c8a020" opacity="0.5"/>
      ))}
      {/* Emergency */}
      {[[240,18],[460,260],[120,440]].map(([x,y],i) => (
        <circle key={`e${i}`} cx={x} cy={y} r="1.5" fill="#cc6622" opacity="0.4"/>
      ))}
      {/* Labels */}
      <text x="250" y="254" fill="#333355" fontSize="10" textAnchor="middle" opacity="0.6">BLACK</text>
      {/* Right labels */}
      <text x="385" y="170" fill="#2a7a44" fontSize="9" textAnchor="middle" opacity="0.6">GREEN</text>
      <text x="420" y="250" fill="#2980b9" fontSize="8" textAnchor="middle" opacity="0.5">BLUE</text>
      <text x="440" y="330" fill="#c8a020" fontSize="8" textAnchor="middle" opacity="0.5">YELLOW</text>
      <text x="460" y="400" fill="#cc6622" fontSize="7" textAnchor="middle" opacity="0.5">AMBER</text>
      <text x="475" y="460" fill="#cc2222" fontSize="8" textAnchor="middle" fontWeight="bold" opacity="0.7">RED</text>
      {/* Left labels (mirrored) */}
      <text x="115" y="170" fill="#2a7a44" fontSize="9" textAnchor="middle" opacity="0.4">GREEN</text>
      <text x="80" y="250" fill="#2980b9" fontSize="8" textAnchor="middle" opacity="0.35">BLUE</text>
      <text x="60" y="330" fill="#c8a020" fontSize="8" textAnchor="middle" opacity="0.35">YELLOW</text>
      <text x="40" y="400" fill="#cc6622" fontSize="7" textAnchor="middle" opacity="0.35">AMBER</text>
      <text x="25" y="460" fill="#cc2222" fontSize="8" textAnchor="middle" opacity="0.5">RED</text>
    </svg>
  );
}

function WarzoneCalcSVG() {
  return (
    <svg viewBox="0 0 400 400" role="img" aria-label="Warzone diagram showing outer 3% ring of the galaxy" className="w-full max-w-[350px] mx-auto" xmlns="http://www.w3.org/2000/svg" style={{ fontFamily: "var(--font-mono, monospace)" }}>
      <circle cx="200" cy="200" r="195" fill="#1a1a22" stroke="#cc2222" strokeWidth="6" opacity="0.6"/>
      <circle cx="200" cy="200" r="183" fill="#14141e"/>
      <circle cx="200" cy="200" r="2" fill="#555566"/>
      <text x="200" y="170" fill="#666680" fontSize="12" textAnchor="middle">97%</text>
      <text x="200" y="188" fill="#444460" fontSize="9" textAnchor="middle">Unaware</text>
      <text x="200" y="225" fill="#555566" fontSize="8" textAnchor="middle">R = 50,000 ly</text>
      <text x="365" y="205" fill="#cc2222" fontSize="10" fontWeight="bold">3%</text>
      <text x="365" y="218" fill="#992222" fontSize="8">WAR</text>
    </svg>
  );
}

/* ─── MAIN ─── */
export default function GalaxyMapPage() {
  const { lang } = useLang();
  const en = lang !== "ko";

  return (
    <>
      <Header />
      <main className="pt-24">
        <div className="site-shell py-16 md:py-20">
          <Link href="/archive" aria-label="Back to Archive" className="motion-rise inline-block font-[family-name:var(--font-mono)] text-xs text-text-tertiary hover:text-accent-amber transition-colors tracking-wider uppercase mb-6">
            ← ARCHIVE
          </Link>

          <div className="doc-header motion-rise motion-rise-delay-1 rounded-t-[24px] mb-0">
            <span className="badge badge-classified mr-2">CLASSIFIED</span>
            {en ? "Galaxy Zone & Gate Infrastructure | Bureau of Investigation" : "은하 구역 분류 & Gate 인프라 | 비밀조사국"}
          </div>

          <div className="premium-panel motion-rise motion-rise-delay-2 rounded-b-[30px] rounded-t-none border-t-0 p-6 sm:p-10">

            {/* ═══ SECTION 1: GALAXY ZONES ═══ */}
            <section className="mb-16">
              <h2 className="font-[family-name:var(--font-mono)] text-lg font-bold tracking-wider mb-1" style={{ color: "#4488cc" }}>
                {en ? "I. GALAXY ZONE CLASSIFICATION" : "I. 은하 구역 분류 체계"}
              </h2>
              <p className="text-text-tertiary text-xs mb-6 font-[family-name:var(--font-mono)]">
                {en ? "Area-based concentric zones (10% increments) \u00b7 Bureau Internal Code" : "면적 기준 10% 단위 동심원 분류 \u00b7 비밀조사국 내부 구역 코드"}
              </p>

              <div className="mb-8">
                <GalaxyMapSVG />
              </div>

              {/* Zone Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary tracking-wider text-left p-2">{en ? "ZONE" : "구역"}</th>
                      <th className="font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary tracking-wider text-left p-2">{en ? "RANGE" : "범위"}</th>
                      <th className="font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary tracking-wider text-left p-2">NET</th>
                      <th className="font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary tracking-wider text-left p-2">GATE</th>
                      <th className="font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary tracking-wider text-left p-2">{en ? "CHARACTERISTICS" : "특성"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ZONES.map((z) => (
                      <tr key={z.id} className="border-b border-border/50">
                        <td className="p-2">
                          <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider text-white font-[family-name:var(--font-mono)]" style={{ background: z.color }}>
                            {z.id}
                          </span>
                        </td>
                        <td className="p-2 text-text-secondary font-[family-name:var(--font-mono)]">{z.range}</td>
                        <td className="p-2 text-text-secondary font-[family-name:var(--font-mono)]">{z.net}</td>
                        <td className="p-2 text-text-secondary font-[family-name:var(--font-mono)]">{z.gate}</td>
                        <td className="p-2 text-text-secondary">{en ? z.en : z.ko}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="premium-panel-soft mt-6 rounded-[22px] p-4 text-center text-xs text-text-tertiary italic">
                <strong className="text-text-secondary not-italic">GREEN → RED:</strong> {en ? "Civilization\u2193 NET\u2193 Gate\u2193 Solitude\u2191 War\u2191" : "문명\u2193 NET\u2193 Gate\u2193 고독\u2191 전쟁\u2191"}
                <br /><br />
                {en
                  ? "\"GREEN citizens drink coffee. RED riders watch planets disappear. Same humanity. Same moment. 753 light-years apart.\""
                  : "\"GREEN의 시민은 커피를 마시고, RED의 탑승자는 행성이 사라지는 것을 본다. 같은 인류. 같은 시간. 753 광년의 거리.\""}
              </div>
            </section>

            {/* ═══ SECTION 2: GATE TIERS ═══ */}
            <section className="mb-16">
              <h2 className="font-[family-name:var(--font-mono)] text-lg font-bold tracking-wider mb-1" style={{ color: "#4488cc" }}>
                {en ? "II. GATE INFRASTRUCTURE \u2014 TIER SYSTEM" : "II. GATE 인프라 \u2014 계층 체계"}
              </h2>
              <p className="text-text-tertiary text-xs mb-6 font-[family-name:var(--font-mono)]">
                {en ? "Inward → Outward \u00b7 Denser inside, sparser outside" : "안에서 밖으로 \u00b7 안쪽일수록 촘촘, 바깥일수록 희소"}
              </p>

              <div className="space-y-4">
                {TIERS.map((t) => (
                  <div key={t.tier} className="premium-link-card p-5" style={{ borderLeftWidth: 3, borderLeftColor: t.color }}>
                    <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider mb-1" style={{ color: t.color }}>
                      {t.tier} / {t.zone}
                    </div>
                    <div className="font-bold text-base mb-2" style={{ color: t.color }}>
                      {L2(t.name, lang)}
                    </div>
                    <p className="text-xs text-text-tertiary leading-relaxed whitespace-pre-line mb-3">
                      {L2(t.desc, lang)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {t.specs.map((s, i) => (
                        <div key={i} className="border border-border rounded px-3 py-2 text-center bg-bg-secondary min-w-[80px]">
                          <div className="font-[family-name:var(--font-mono)] text-sm font-bold" style={{ color: t.color }}>{s.val}</div>
                          <div className="text-[9px] text-text-tertiary tracking-wider mt-0.5">{L2(s.label, lang)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* RED - No Gate */}
                <div className="premium-link-card p-5" style={{ borderLeftWidth: 3, borderLeftColor: "#cc2222" }}>
                  <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider mb-1" style={{ color: "#cc2222" }}>
                    RED ZONE
                  </div>
                  <div className="font-bold text-base mb-2" style={{ color: "#cc2222" }}>
                    {en ? "WARZONE \u2014 No Fixed Gate" : "전장 \u2014 고정 Gate 없음"}
                  </div>
                  <p className="text-xs text-text-tertiary leading-relaxed whitespace-pre-line">
                    {en
                      ? "No fixed Gates installed \u2014 Neka's #1 destruction target.\nAlternative: Mobile temporary Gates or Q-Launch self-propulsion only.\nMobility vs. Security: Without Gate = slow. With Gate = position exposed to Neka."
                      : "전장에는 고정 Gate를 설치하지 않는다. 네카의 1순위 파괴 목표가 되기 때문.\n대안: 이동식 임시 Gate 또는 Q-Launch 자체 추진만 사용.\n기동성 vs 안전성의 트레이드오프."}
                  </p>
                </div>
              </div>

              {/* Neka Strategy Box */}
              <div className="mt-4 rounded-md border p-4 text-center" style={{ borderColor: "rgba(204,68,34,0.3)", background: "rgba(204,68,34,0.05)" }}>
                <div className="font-[family-name:var(--font-mono)] text-[10px] tracking-wider mb-2" style={{ color: "#cc4422" }}>
                  {en ? "NEKA OPTIMAL STRATEGY" : "네카의 최적 전략"}
                </div>
                <p className="text-xs text-text-tertiary">
                  {en
                    ? "Destroy AMBER Tier 4 Emergency Gates. 3 destroyed = RED warzone completely severed."
                    : "AMBER Tier 4 비상 Gate 파괴. 3개만 끊으면 RED 전장이 은하 본토와 완전 단절."}
                  <br />
                  <strong className="text-text-secondary">
                    {en ? "\"The war that doesn't exist becomes truly nonexistent.\"" : "\"존재하지 않는 전쟁이 진짜로 존재하지 않게 된다.\""}
                  </strong>
                </p>
              </div>

              <div className="mt-4 text-center text-xs text-text-tertiary italic border border-border/50 rounded p-4 bg-bg-primary">
                {en
                  ? "\"Warp does not shine. No sound. No explosion. 12 seconds of silence → ALLOW → Already arrived.\""
                  : "\"워프는 빛나지 않고 소리 없고 폭발 없다. HOLD 12초의 침묵 → ALLOW → 이미 도착해 있다.\""}
                <br /><br />
                <strong className="text-text-secondary not-italic">
                  {en
                    ? "Contrast: Neka warps with light, sound, and explosion. \"This contrast creates the tension of the universe.\""
                    : "대비: 네카는 빛나고, 소리 내고, 폭발한다. \"이 대비가 세계관의 긴장을 만든다.\""}
                </strong>
              </div>
            </section>

            {/* ═══ SECTION 3: WARZONE CALC ═══ */}
            <section className="mb-16">
              <h2 className="font-[family-name:var(--font-mono)] text-lg font-bold tracking-wider mb-1" style={{ color: "#4488cc" }}>
                {en ? "III. WARZONE \u2014 OUTER 3% RING" : "III. 전장 \u2014 은하 외곽 3% 구역"}
              </h2>
              <p className="text-text-tertiary text-xs mb-6 font-[family-name:var(--font-mono)]">
                {en ? "The war exists in the outermost 3%. 97% of humanity is unaware." : "전쟁은 은하 가장 바깥 3%에서 벌어진다. 97%의 인류는 모른다."}
              </p>

              <div className="mb-6">
                <WarzoneCalcSVG />
              </div>

              <div className="text-center mb-6">
                <span className="inline-block px-6 py-1.5 rounded text-xs font-bold tracking-wider text-white font-[family-name:var(--font-mono)]" style={{ background: "#cc2222" }}>
                  {en ? "WARZONE = Outer 3% Ring" : "전장 = 은하 외곽 끝 3% 링 구역"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CALCS.map((c, i) => (
                  <div key={i} className="flex justify-between items-center border border-border rounded px-4 py-3 bg-bg-primary">
                    <span className="text-xs text-text-tertiary">{L2(c.label, lang)}</span>
                    <span className="font-[family-name:var(--font-mono)] text-sm font-bold" style={{ color: c.color }}>{c.val}</span>
                  </div>
                ))}
              </div>

              <div className="premium-panel-soft mt-6 rounded-[22px] p-4 text-center text-xs text-text-tertiary italic">
                {en
                  ? "\"The warzone is 753 light-years wide. It contains 6,000 human systems. The Bureau fights this war alone.\""
                  : "\"전장은 753 광년 폭이다. 그 안에 6,000개의 인류 행성계가 있다. 비밀조사국이 이 전쟁을 혼자 치른다.\""}
                <br />
                <strong className="text-text-secondary not-italic">
                  {en ? "97% of humanity doesn't know it exists." : "97%의 인류는 이 전쟁의 존재를 모른다."}
                </strong>
              </div>
            </section>

            {/* ═══ SECTION 4: INSTALLATION PRINCIPLE ═══ */}
            <section className="mb-8">
              <h2 className="font-[family-name:var(--font-mono)] text-lg font-bold tracking-wider mb-1" style={{ color: "#4488cc" }}>
                {en ? "IV. GATE INSTALLATION PRINCIPLE" : "IV. GATE 설치 원칙"}
              </h2>
              <p className="text-text-tertiary text-xs mb-6 font-[family-name:var(--font-mono)]">
                {en ? "Inward → Outward. Dense at heart, sparse at edge." : "방향: 안에서 밖으로. 안쪽일수록 촘촘, 바깥일수록 희소."}
              </p>

              <div className="text-center text-sm mb-4 space-x-2">
                <span className="font-bold" style={{ color: "#4488cc" }}>Core</span>
                <span className="text-text-tertiary">→</span>
                <span className="font-bold" style={{ color: "#2980b9" }}>Radial</span>
                <span className="text-text-tertiary">→</span>
                <span className="font-bold" style={{ color: "#d4a017" }}>Frontier</span>
                <span className="text-text-tertiary">→</span>
                <span className="font-bold" style={{ color: "#c0392b" }}>Emergency</span>
              </div>

              <div className="text-center text-xs text-text-tertiary italic border border-border/50 rounded p-4 bg-bg-primary">
                {en
                  ? "\"Denser inside, sparser outside. Humanity's vascular structure \u2014 from the heart (GREEN) to the capillaries (AMBER). Beyond AMBER, there is no blood. Only silence.\""
                  : "\"안쪽일수록 촘촘하고, 바깥일수록 희소하다. 인류 문명의 혈관 구조 \u2014 심장(GREEN)에서 모세혈관(AMBER)으로. AMBER 너머에는 피가 닿지 않는다. 오직 정적뿐.\""}
              </div>
            </section>

            {/* Footer */}
            <div className="border-t border-border pt-6">
              <p className="font-[family-name:var(--font-document)] text-xs text-text-tertiary italic text-center">
                {en ? "This document is for Bureau of Investigation internal reference only." : "이 문서는 비밀조사국 내부 참조용이다."}
                <br />
                {en ? "Unauthorized disclosure will result in the personnel being processed as a typo." : "무단 유출 시 해당 인원은 오타로 처리된다."}
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
