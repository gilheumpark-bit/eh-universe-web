"use client";

import { useState } from "react";
import Header from "@/components/Header";
import _Link from "next/link";
import { useLang } from "@/lib/LangContext";
import ToolNav from "@/components/tools/ToolNav";

// ============================================================
// PART 1 — Data Types & Ship Definitions
// ============================================================

type FactionKey = "council" | "neka" | "lib";

interface Variant {
  type: string;
  tonnage: string;
  detail: string;
}

interface Ship {
  name: string;
  ko: string;
  badge?: string;
  variants: Variant[];
}

interface FlagshipSpec {
  label: string;
  value: string;
}

interface Flagship {
  name: string;
  specs: FlagshipSpec[];
}

interface FactionData {
  title: string;
  desc: string;
  motto: string;
  scaleNote: string;
  ships: Ship[];
  flagship: Flagship;
}

const COUNCIL_SHIPS: Ship[] = [
  { name: "CORVETTE", ko: "\uCD08\uACC4\uD568", variants: [
    { type: "-1 Strike", tonnage: "3,500t", detail: "\uB4DC\uB860 150\uAE30" },
    { type: "-2 Guard", tonnage: "4,000t", detail: "CWEH \uAC15\uD654" },
    { type: "-3 Support", tonnage: "3,000t", detail: "ECM / \uC815\uCC30" },
  ]},
  { name: "FRIGATE", ko: "\uD504\uB9AC\uAE43", badge: "\u2605 \uAE30\uC900\uD568\uAE09", variants: [
    { type: "-1 Strike", tonnage: "6,500t", detail: "\uB4DC\uB860 540\uAE30 / \uCD5C\uB300 \uD654\uB825" },
    { type: "-2 Guard", tonnage: "7,500t", detail: "CWEH \uCD5C\uB300 / \uD638\uC704" },
    { type: "-3 Support", tonnage: "5,500t", detail: "ECM + \uC218\uB9AC / \uC548\uB4DC\uB85C\uC774\uB4DC \uCD5C\uB2E4" },
  ]},
  { name: "DESTROYER", ko: "\uAD6C\uCD95\uD568", variants: [
    { type: "-1 Strike", tonnage: "15,000t", detail: "\uB4DC\uB860 1,400\uAE30 / \uD568\uB300 \uC8FC\uB825" },
    { type: "-2 Guard", tonnage: "18,000t", detail: "CWEH \uCD5C\uB300 / \uD568\uB300 \uBC29\uC5B4" },
    { type: "-3 Support", tonnage: "12,000t", detail: "C4ISR / \uC804\uC790\uC804" },
  ]},
  { name: "CRUISER", ko: "\uC21C\uC591\uD568", variants: [
    { type: "-1 Strike", tonnage: "42,000t", detail: "\uB4DC\uB860 4,000\uAE30" },
    { type: "-2 Guard", tonnage: "48,000t", detail: "CWEH \uCF54\uC5B4" },
    { type: "-3 Support", tonnage: "36,000t", detail: "\uD568\uB300 ECM" },
  ]},
  { name: "BATTLESHIP", ko: "\uC804\uD568", variants: [
    { type: "-1 Strike", tonnage: "130,000t", detail: "\uB4DC\uB860 14,000\uAE30" },
    { type: "-2 Guard", tonnage: "150,000t", detail: "\uD568\uB300 \uC575\uCEE4" },
    { type: "-3 Support", tonnage: "100,000t", detail: "\uC774\uB3D9 \uC0AC\uB839\uBD80" },
  ]},
];

const NEKA_SHIPS: Ship[] = [
  { name: "RAIDER", ko: "\uB808\uC774\uB354 \u2014 \uCD08\uACC4\uD568\uAE09", variants: [
    { type: "-1 Strike", tonnage: "4,000t / 400\uBA85", detail: "RIDE \uACB0\uC815 \uC120\uC218 / \uB2E8\uB3C5 \uCE68\uD22C" },
    { type: "-2 Guard", tonnage: "5,500t / 550\uBA85", detail: "RIDE \uBC29\uC5B4\uB9C9 \uAC15\uD654" },
    { type: "-3 Support", tonnage: "3,000t / 300\uBA85", detail: "\uC2E0\uD638 \uAD50\uB780 / \uC815\uCC30" },
  ]},
  { name: "HUNTER", ko: "\uD5CC\uD130 \u2014 \uD504\uB9AC\uAE43\uAE09", variants: [
    { type: "-1 Strike", tonnage: "9,000t / 1,200\uBA85", detail: "RIDE \uACB0\uC815 \uC9D1\uC911 / \uCD5C\uB300 \uBC29\uC804" },
    { type: "-2 Guard", tonnage: "11,000t / 1,500\uBA85", detail: "RIDE \uC7A5\uAC11 \uADF9\uB300\uD654" },
    { type: "-3 Support", tonnage: "7,500t / 900\uBA85", detail: "\uD1B5\uC2E0 \uC911\uACC4 / \uBCF4\uAE09" },
  ]},
  { name: "LANCER", ko: "\uB79C\uC11C \u2014 \uAD6C\uCD95\uD568\uAE09", variants: [
    { type: "-1 Strike", tonnage: "25,000t / 3,500\uBA85", detail: "\uD568\uB300 \uC8FC\uB825 / RIDE \uC9D1\uC18D\uD3EC" },
    { type: "-2 Guard", tonnage: "30,000t / 4,000\uBA85", detail: "\uD568\uB300 \uBC29\uC5B4\uB9C9" },
    { type: "-3 Support", tonnage: "20,000t / 2,500\uBA85", detail: "\uC804\uC790\uC804 / C4ISR" },
  ]},
  { name: "SOVEREIGN", ko: "\uC18C\uBC84\uB9B0 \u2014 \uC21C\uC591\uD568\uAE09", variants: [
    { type: "-1 Strike", tonnage: "55,000t / 7,000\uBA85", detail: "RIDE \uBC29\uC804 \uBB34\uAE30 \uADF9\uB300\uD654" },
    { type: "-2 Guard", tonnage: "65,000t / 8,500\uBA85", detail: "\uC81C\uAD6D \uD568\uB300 \uD575\uC2EC \uBC29\uC5B4" },
    { type: "-3 Support", tonnage: "45,000t / 5,500\uBA85", detail: "\uC0AC\uB839 \uC911\uACC4" },
  ]},
  { name: "PRAETORIAN", ko: "\uD504\uB808\uD1A0\uB9AC\uC548 \u2014 \uC804\uD568\uAE09", variants: [
    { type: "-1 Strike", tonnage: "200,000t / 12,000\uBA85", detail: "RIDE \uC644\uC804 \uBC29\uC804 \uC2DC \uC808\uB300\uD751" },
    { type: "-2 Guard", tonnage: "230,000t / 14,000\uBA85", detail: "\uC81C\uAD6D \uD568\uB300 \uC575\uCEE4" },
    { type: "-3 Support", tonnage: "160,000t / 9,000\uBA85", detail: "\uC774\uB3D9 \uC0AC\uB839\uBD80" },
  ]},
];

const LIB_SHIPS: Ship[] = [
  { name: "NEEDLE", ko: "\uB2C8\uB4E4 \u2014 \uCD08\uC18C\uD615", variants: [
    { type: "~200t", tonnage: "", detail: "1\uC778 / \uC18C\uC218 \uD0D1\uC2B9 / \uCE68\uD22C \u00B7 \uC5F0\uB77D \uD2B9\uD654" },
  ]},
  { name: "SPIKE", ko: "\uC2A4\uD30C\uC774\uD06C \u2014 \uACBD\uB7C9 \uC804\uD22C\uD568", variants: [
    { type: "~1,500t", tonnage: "", detail: "\uAC8C\uB9B4\uB77C \uC804\uD22C / \uACE0\uAE30\uB3D9" },
  ]},
  { name: "THORN", ko: "\uC190 \u2014 \uC911\uD615 \uC804\uD22C\uD568", variants: [
    { type: "~8,000t", tonnage: "", detail: "\uD574\uBC29\uC5F0\uB300 \uC8FC\uB825 / \uBE44\uB300\uCE6D \uD654\uB825" },
  ]},
  { name: "BASTION", ko: "\uBC30\uC2A4\uCC9C \u2014 \uAC70\uC810\uD568", variants: [
    { type: "~40,000t", tonnage: "", detail: "\uC774\uB3D9 \uAC70\uC810 / \uBCF4\uAE09 \u00B7 \uC218\uC6A9" },
  ]},
];

const FACTIONS: Record<FactionKey, FactionData> = {
  council: {
    title: "\uC778\uB958\uACF5\uB3D9\uD611\uC758\uD68C \uC5F0\uD569\uD568\uB300",
    desc: "\uD0C0\uC6D0\uD615 \uC120\uCCB4 / EH Chamber \uC911\uC559 \uB3D4 / \uB4DC\uB860 \uC719 \uD3EC\uB4DC / \uB2E4\uD06C \uC2A4\uD2F8 \uBE14\uB8E8 / \uD568\uC120\uB2F9 \uB77C\uC774\uB354 1\uC778",
    motto: '"An open hand."',
    scaleNote: "\uC2A4\uCF00\uC77C \uC6D0\uCE59: \uB3D9\uC77C\uD55C \uD0C0\uC6D0\uD615 \uC124\uACC4 \uC5B8\uC5B4 \uC720\uC9C0. \uB300\uD615\uD654 = \uC719 \uD3EC\uB4DC \uC99D\uAC00 + EH \uB3D4 \uD655\uC7A5 + \uC120\uCCB4 \uB450\uAED8 \uC99D\uAC00.",
    ships: COUNCIL_SHIPS,
    flagship: { name: "\uAE30\uD568 \u2014 FLAGSHIP", specs: [
      { label: "TONNAGE", value: "500,000t" },
      { label: "DRONES", value: "48,000\uAE30" },
      { label: "PILOT REQ.", value: "\u03C6 MAX" },
      { label: "UNITS", value: "\uADF9\uC18C" },
    ]},
  },
  neka: {
    title: "\uB124\uCE74 \uC81C\uAD6D \uD568\uB300",
    desc: "RIDE \uACB0\uC815\uCCB4 \uC131\uC7A5\uD615 / \uAC01\uC9C4 \uB2E4\uBA74\uCCB4 \uC120\uCCB4 / \uB4DC\uB860 \uC5C6\uC74C \u2014 \uC804\uC6D0 \uC2B9\uBB34\uC6D0 / \uB2E4\uD06C \uAC74\uBA54\uD0C8 + \uC2E4\uBC84 \uADF8\uB808\uC778",
    motto: '"A clenched fist."',
    scaleNote: "\u2605 \uB124\uCE74 \uD568\uC120\uC740 \"\uC81C\uC791\"\uB418\uC9C0 \uC54A\uB294\uB2E4 \u2014 RIDE \uACB0\uC815\uC5D0\uC11C \uACF5\uBA85 \uAC00\uC18C\uC131\uC744 \uD1B5\uD574 \"\uC131\uC7A5\"\uD55C\uB2E4. \uC120\uCCB4\uB294 \uACB0\uC815\uC9C8 \uB2E4\uBA74\uCCB4\uC640 \uC2E4\uBC84 \uADF8\uB808\uC778 \uBB34\uB2AC\uB97C \uC720\uC9C0\uD55C\uB2E4. \uAE30\uD558\uD559\uC801\uC73C\uB85C \uB3D9\uC77C\uD55C \uD568\uC120\uC740 \uC874\uC7AC\uD558\uC9C0 \uC54A\uB294\uB2E4.",
    ships: NEKA_SHIPS,
    flagship: { name: "\uC784\uD398\uB77C\uD1A0\uB974 \u2014 IMPERATOR", specs: [
      { label: "TONNAGE", value: "1,200,000t" },
      { label: "LENGTH", value: "4km" },
      { label: "PILOT", value: "\uD669\uC81C \uC804\uC6A9" },
      { label: "UNITS", value: "1" },
    ]},
  },
  lib: {
    title: "\uD574\uBC29\uC5F0\uB300 \uD568\uB300",
    desc: "\uBE44\uB300\uCE6D \uC120\uCCB4 / \uAC1C\uC870\uB41C \uBBFC\uAC04 \uC120\uBC15 \uAE30\uBC18 / \uD760\uC9D1\u00B7\uC218\uB9AC \uD754\uC801 \uADF8\uB300\uB85C / \uBB34\uAD11 \uB2E4\uD06C \uADF8\uB9B0-\uADF8\uB808\uC774",
    motto: '"A thorn that won\'t break."',
    scaleNote: "\uD568\uC120 \uAC1C\uBCC4 \uC774\uB984 \uC874\uC7AC. \uB2C9\uB124\uC784 \uD398\uC778\uD2B8 \uAC01\uC778. \uAC19\uC740 \uD615\uC2DD\uC758 \uD568\uC120\uC774 \uB450 \uCC99 \uC5C6\uB2E4. \"It's all they have.\" \u2014 \uADF8\uAC8C \uC804\uBD80\uC9C0\uB9CC, \uBD80\uB7EC\uC9C0\uC9C0 \uC54A\uB294\uB2E4.",
    ships: LIB_SHIPS,
    flagship: { name: "", specs: [] },
  },
};

// ============================================================
// PART 2 — Comparison Data
// ============================================================

const COMPARE_ROWS = [
  { label: "\uC120\uCCB4 \uD615\uD0DC", council: "\uD0C0\uC6D0\uD615 / EH \uB3D4", neka: "\uAC01\uC9C4 \uACB0\uC815\uCCB4 \uB2E4\uBA74\uCCB4", lib: "\uBE44\uB300\uCE6D / \uAC1C\uC870 \uBBFC\uAC04\uC120" },
  { label: "\uC0C9\uC0C1", council: "\uB2E4\uD06C \uC2A4\uD2F8 \uBE14\uB8E8 / \uBE14\uB8E8-\uBC14\uC774\uC62C\uB9BF \uAE00\uB85C\uC6B0", neka: "\uB2E4\uD06C \uAC74\uBA54\uD0C8 / \uC2E4\uBC84 \uADF8\uB808\uC778", lib: "\uBB34\uAD11 \uB2E4\uD06C \uADF8\uB9B0-\uADF8\uB808\uC774 / \uD760\uC9D1\u00B7\uC218\uB9AC \uD754\uC801" },
  { label: "\uC6B4\uC6A9 \uBC29\uC2DD", council: "\uB4DC\uB860 \uC911\uC2EC / \uB77C\uC774\uB354 1\uC778", neka: "\uC804\uC6D0 \uC2B9\uBB34\uC6D0 / \uB4DC\uB860 \uC5C6\uC74C", lib: "\uAC8C\uB9B4\uB77C / \uC18C\uADDC\uBAA8 \uD300" },
  { label: "\uC18C\uC7AC", council: "\uB2E4\uD06C \uC2A4\uD2F8 \uBCF5\uD569\uC7AC", neka: "RIDE \uACB0\uC815\uCCB4 (\uC131\uC7A5\uD615)", lib: "\uBD88\uADDC\uCE59 \uAC1C\uC870\uC7AC" },
  { label: "\uC815\uCCB4\uC131", council: "\uC81C\uC791\uB428 / \uADDC\uACA9\uD654", neka: "\uC131\uC7A5\uD568 / \uBB34\uD55C \uBCC0\uD615", lib: "\uC0B4\uC544\uB0A8\uC74C / \uAC1C\uBCC4 \uBA85\uBA85" },
];

const SIZE_BARS = [
  { name: "Imperator", faction: "neka" as const, width: "100%", value: "1,200,000t / 4km" },
  { name: "Flagship", faction: "council" as const, width: "41.7%", value: "500,000t" },
  { name: "Praetorian", faction: "neka" as const, width: "19.2%", value: "200,000t" },
  { name: "Battleship", faction: "council" as const, width: "12.5%", value: "130,000t" },
  { name: "Hunter", faction: "neka" as const, width: "0.9%", value: "9,000t" },
  { name: "Frigate", faction: "council" as const, width: "0.65%", value: "6,500t" },
  { name: "Needle", faction: "lib" as const, width: "0.02%", value: "~200t" },
];

const FACTION_COLORS: Record<FactionKey, { accent: string; dim: string; glow: string; gradient: string }> = {
  council: { accent: "#4488cc", dim: "#1a3355", glow: "rgba(68,136,204,0.15)", gradient: "linear-gradient(90deg,#1a3355,#4488cc)" },
  neka:    { accent: "#cc4422", dim: "#3a1008", glow: "rgba(204,68,34,0.15)", gradient: "linear-gradient(90deg,#3a1008,#cc4422)" },
  lib:     { accent: "#44aa66", dim: "#0d2a18", glow: "rgba(68,170,102,0.15)", gradient: "linear-gradient(90deg,#0d2a18,#44aa66)" },
};

/* ── Stat system for radar chart / comparison ── */
interface ShipStat {
  key: string;
  faction: FactionKey;
  name: string;
  ko: string;
  firepower: number;   // 0–10
  defense: number;
  speed: number;
  capacity: number;    // crew / drone capacity
  stealth: number;
  tonnageNum: number;  // raw tonnage for silhouette
}

const ALL_SHIPS: ShipStat[] = [
  // Council
  { key: "c-corvette", faction: "council", name: "Corvette-1", ko: "초계함 Strike", firepower: 3, defense: 2, speed: 8, capacity: 2, stealth: 5, tonnageNum: 3500 },
  { key: "c-frigate", faction: "council", name: "Frigate-1", ko: "프리깃 Strike", firepower: 5, defense: 4, speed: 6, capacity: 4, stealth: 4, tonnageNum: 6500 },
  { key: "c-destroyer", faction: "council", name: "Destroyer-1", ko: "구축함 Strike", firepower: 7, defense: 6, speed: 5, capacity: 6, stealth: 3, tonnageNum: 15000 },
  { key: "c-cruiser", faction: "council", name: "Cruiser-1", ko: "순양함 Strike", firepower: 8, defense: 7, speed: 4, capacity: 7, stealth: 2, tonnageNum: 42000 },
  { key: "c-battleship", faction: "council", name: "Battleship-1", ko: "전함 Strike", firepower: 9, defense: 9, speed: 2, capacity: 9, stealth: 1, tonnageNum: 130000 },
  { key: "c-flagship", faction: "council", name: "Flagship", ko: "기함", firepower: 10, defense: 10, speed: 2, capacity: 10, stealth: 1, tonnageNum: 500000 },
  // Neka
  { key: "n-raider", faction: "neka", name: "Raider-1", ko: "레이더 Strike", firepower: 4, defense: 2, speed: 9, capacity: 2, stealth: 6, tonnageNum: 4000 },
  { key: "n-hunter", faction: "neka", name: "Hunter-1", ko: "헌터 Strike", firepower: 6, defense: 5, speed: 7, capacity: 5, stealth: 4, tonnageNum: 9000 },
  { key: "n-lancer", faction: "neka", name: "Lancer-1", ko: "랜서 Strike", firepower: 7, defense: 6, speed: 5, capacity: 6, stealth: 3, tonnageNum: 25000 },
  { key: "n-sovereign", faction: "neka", name: "Sovereign-1", ko: "소버린 Strike", firepower: 9, defense: 8, speed: 3, capacity: 8, stealth: 2, tonnageNum: 55000 },
  { key: "n-praetorian", faction: "neka", name: "Praetorian-1", ko: "프레토리안 Strike", firepower: 10, defense: 9, speed: 2, capacity: 9, stealth: 1, tonnageNum: 200000 },
  { key: "n-imperator", faction: "neka", name: "Imperator", ko: "임페라토르", firepower: 10, defense: 10, speed: 1, capacity: 10, stealth: 0, tonnageNum: 1200000 },
  // Liberation
  { key: "l-needle", faction: "lib", name: "Needle", ko: "니들", firepower: 1, defense: 1, speed: 10, capacity: 1, stealth: 9, tonnageNum: 200 },
  { key: "l-spike", faction: "lib", name: "Spike", ko: "스파이크", firepower: 4, defense: 2, speed: 8, capacity: 2, stealth: 7, tonnageNum: 1500 },
  { key: "l-thorn", faction: "lib", name: "Thorn", ko: "손", firepower: 6, defense: 4, speed: 5, capacity: 4, stealth: 5, tonnageNum: 8000 },
  { key: "l-bastion", faction: "lib", name: "Bastion", ko: "배스천", firepower: 5, defense: 6, speed: 2, capacity: 7, stealth: 3, tonnageNum: 40000 },
];

const STAT_LABELS = [
  { key: "firepower", label: "Firepower", ko: "화력" },
  { key: "defense", label: "Defense", ko: "방어" },
  { key: "speed", label: "Speed", ko: "속도" },
  { key: "capacity", label: "Capacity", ko: "탑재량" },
  { key: "stealth", label: "Stealth", ko: "은밀" },
];

const TABS: { key: string; label: string; faction?: FactionKey }[] = [
  { key: "council", label: "I. COUNCIL", faction: "council" },
  { key: "neka", label: "II. NEKA EMPIRE", faction: "neka" },
  { key: "lib", label: "III. LIBERATION FRONT", faction: "lib" },
  { key: "compare", label: "IV. COMPARISON" },
  { key: "detail", label: "V. SHIP DETAIL" },
];

// ============================================================
// PART 3 — Sub-components
// ============================================================

function ShipCard({ ship, accent }: { ship: Ship; accent: string }) {
  const isLib = ship.variants.length === 1 && !ship.variants[0].tonnage;
  return (
    <div
      className="bg-bg-secondary border border-border p-5 transition-colors hover:shadow-lg"
      style={{ borderTopWidth: 2, borderTopColor: accent }}
    >
      <div className="font-mono text-sm font-bold tracking-widest flex items-center gap-2" style={{ color: accent }}>
        {ship.name}
        {ship.badge && (
          <span className="text-[9px] px-1.5 py-0.5 font-bold" style={{ background: accent, color: "#05050d" }}>{ship.badge}</span>
        )}
      </div>
      <div className="text-[11px] text-text-tertiary tracking-wider mb-4">{ship.ko}</div>
      <table className="w-full text-[11px]">
        <tbody>
          {ship.variants.map((v, i) => (
            <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-white/[0.02]">
              <td className="py-1.5 px-2 font-semibold whitespace-nowrap w-20" style={{ color: accent }}>{v.type}</td>
              {isLib ? (
                <td className="py-1.5 px-2 text-text-tertiary" colSpan={2}>{v.detail}</td>
              ) : (
                <>
                  <td className="py-1.5 px-2 text-text-tertiary/70 w-24">{v.tonnage}</td>
                  <td className="py-1.5 px-2 text-text-tertiary">{v.detail}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FlagshipCard({ flagship, accent }: { flagship: Flagship; accent: string }) {
  if (!flagship.name) return null;
  return (
    <div
      className="relative border p-5 mb-6 overflow-hidden"
      style={{ borderColor: accent, background: `linear-gradient(135deg, var(--color-bg-secondary) 0%, ${accent}08 100%)` }}
    >
      <span
        className="absolute -top-2 right-4 font-mono text-[9px] tracking-[3px] px-2.5 py-0.5"
        style={{ background: accent, color: "#05050d" }}
      >
        FLAGSHIP
      </span>
      <div className="font-mono text-sm font-bold tracking-widest mb-3" style={{ color: accent }}>
        {flagship.name}
      </div>
      <div className="flex flex-wrap gap-8">
        {flagship.specs.map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5">
            <span className="font-mono text-[9px] tracking-widest text-text-tertiary">{s.label}</span>
            <span className="text-xl font-bold" style={{ color: accent }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PART 4 — Page Component
// ============================================================

export default function VesselPage() {
  const { lang } = useLang();
  const en = lang !== "ko";
  const [activeTab, setActiveTab] = useState("council");

  const renderFactionPanel = (key: FactionKey) => {
    const data = FACTIONS[key];
    const colors = FACTION_COLORS[key];
    return (
      <div>
        <div className="flex items-start gap-4 mb-7 p-5" style={{ borderLeft: `3px solid ${colors.accent}`, background: colors.glow }}>
          <div>
            <div className="text-xl font-bold tracking-wider" style={{ color: colors.accent }}>{data.title}</div>
            <div className="text-[11px] text-text-tertiary mt-1.5 leading-relaxed">{data.desc}</div>
            <span className="inline-block mt-2 px-2.5 py-1 border text-[11px] italic opacity-70" style={{ borderColor: colors.accent, color: colors.accent }}>
              {data.motto}
            </span>
          </div>
        </div>
        {key === "neka" && <NekaEnergyStates />}
        {key === "lib" && (
          <div className="border border-dashed p-4 text-[11px] leading-relaxed mb-6" style={{ borderColor: "#44aa66", background: "rgba(68,170,102,0.15)", color: "#44aa66" }}>
            {"\uD568\uC120 \uAC1C\uBCC4 \uC774\uB984 \uC874\uC7AC. \uB2C9\uB124\uC784 \uD398\uC778\uD2B8 \uAC01\uC778. \uAC19\uC740 \uD615\uC2DD\uC758 \uD568\uC120\uC774 \uB450 \uCC99 \uC5C6\uB2E4."}
            <br />
            {'"It\'s all they have." \u2014 \uADF8\uAC8C \uC804\uBD80\uC9C0\uB9CC, \uBD80\uB7EC\uC9C0\uC9C0 \uC54A\uB294\uB2E4.'}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {data.ships.map((ship) => <ShipCard key={ship.name} ship={ship} accent={colors.accent} />)}
        </div>
        <FlagshipCard flagship={data.flagship} accent={colors.accent} />
        <div className="text-[11px] text-text-tertiary border-l-2 border-border pl-4 mb-8 leading-relaxed">{data.scaleNote}</div>
      </div>
    );
  };

  return (
    <>
      <Header />
      <main className="pt-24">
        <div className="site-shell py-16 md:py-20">
          <ToolNav
            toolName={en ? "Vessel" : "함선 비교"}
            isKO={!en}
            relatedTools={[
              { href: '/tools/galaxy-map', label: en ? 'Galaxy Map' : '은하 지도' },
              { href: '/tools/warp-gate', label: en ? 'Warp Gate' : '워프 게이트' },
            ]}
          />

          <div className="doc-header motion-rise motion-rise-delay-1 rounded-t-[24px] mb-0">
            <span className="badge badge-classified mr-2">CLASSIFIED</span>
            {en ? "Vessel Classification: CLASSIFIED | Bureau of Investigation" : "\uD568\uAE09 \uBD84\uB958\uCCB4\uACC4: \uAE30\uBC00 | \uBE44\uBC00\uC870\uC0AC\uAD6D"}
          </div>

          <div className="premium-panel motion-rise motion-rise-delay-2 rounded-b-[30px] rounded-t-none border-t-0 p-6 sm:p-10">
            <h1 className="site-title text-2xl font-bold tracking-tight mb-1">
              {en ? "VESSEL CLASSIFICATION FULL REFERENCE" : "\uD568\uAE09 \uBD84\uB958 \uC804\uCCB4 \uCC38\uC870"}
            </h1>
            <p className="text-text-tertiary text-sm mb-8 font-mono">
              {en ? "All classes / Type -1 Strike / -2 Guard / -3 Support variants" : "\uC804\uCCB4 \uD568\uAE09 / -1 \uD0C0\uACA9 / -2 \uBC29\uC5B4 / -3 \uC9C0\uC6D0 \uBCC0\uD615"}
            </p>

            {/* Tabs */}
            <div className="flex gap-1 mb-8 border-b border-border overflow-x-auto">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                const color = tab.faction ? FACTION_COLORS[tab.faction].accent : "#f0c040";
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="px-5 py-2.5 font-mono text-[11px] tracking-widest whitespace-nowrap transition-colors -mb-px border-b-2"
                    style={{
                      color: isActive ? color : "var(--color-text-tertiary)",
                      borderColor: isActive ? color : "transparent",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Panels */}
            {activeTab === "council" && renderFactionPanel("council")}
            {activeTab === "neka" && renderFactionPanel("neka")}
            {activeTab === "lib" && renderFactionPanel("lib")}
            {activeTab === "compare" && <ComparePanel />}
            {activeTab === "detail" && <ShipDetailPanel en={en} />}

            {/* Footer */}
            <div className="mt-10 border-t border-border pt-6">
              <p className="font-[family-name:var(--font-document)] text-xs text-text-tertiary italic text-center">
                Source: {en ? "Session Master / Neka Empire Design / 3-Faction Vessel Classification" : "\uC138\uC158_\uD1B5\uD569_\uB9C8\uC2A4\uD130 / \uB124\uCE74_\uC81C\uAD6D_\uC885\uD569\uC124\uC815\uC9D1_v1.0 / 3\uC138\uB825_\uD568\uAE09\uBD84\uB958_\uCCB4\uACC4"}
                <br />
                Bureau of Investigation &mdash; Internal Design Archive / CLASSIFIED
                <br />
                <span className="text-red-500/80 not-italic">
                  {en ? "Unauthorized disclosure will result in the personnel being processed as a typo." : "\uBB34\uB2E8 \uC720\uCD9C \uC2DC \uD574\uB2F9 \uC778\uC6D0\uC740 \uC624\uD0C0\uB85C \uCC98\uB9AC\uB41C\uB2E4."}
                </span>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// ============================================================
// PART 5 — Neka Energy States & Compare Panel
// ============================================================

function NekaEnergyStates() {
  const states = [
    { name: "NORMAL", desc: "\uB2E4\uD06C \uAC74\uBA54\uD0C8 / \uC2E4\uBC84 \uADF8\uB808\uC778 \uAC00\uC2DC", swatch: "linear-gradient(90deg, #2a2a2a, #4a4040)", swatchBorder: "#5a3020", nameColor: "#888899" },
    { name: "\uC5D0\uB108\uC9C0 \uBC29\uC804", desc: '\uC808\uB300\uD751 / "\uC5B4\uB460\uC774 \uC228\uC26C\uB294"', swatch: "#050302", swatchBorder: "#aa2200", nameColor: "#cc4422", nameBg: "#cc4422", nameText: "#111" },
    { name: "DEPLETED", desc: '\uC7AC\uBC31\uC0C9 / "\uC8FD\uC5B4\uAC00\uB294 \uC2E0\uD638"', swatch: "linear-gradient(90deg, #c8c0b8, #e8e0d8)", swatchBorder: "#888", nameColor: "#c8c0b8" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      {states.map((s) => (
        <div key={s.name} className="border border-border bg-bg-secondary p-4 text-center">
          <div className="w-full h-2 rounded-sm mb-2.5" style={{ background: s.swatch, border: `1px solid ${s.swatchBorder}` }} />
          <div
            className="font-mono text-[10px] tracking-widest mb-2 inline-block"
            style={{ color: s.nameText ?? s.nameColor, background: s.nameBg, padding: s.nameBg ? "2px 6px" : undefined }}
          >
            {s.name}
          </div>
          <div className="text-[11px] text-text-tertiary leading-relaxed whitespace-pre-line">{s.desc}</div>
        </div>
      ))}
    </div>
  );
}

function ComparePanel() {
  const amber = "#f0c040";
  return (
    <div>
      <div className="flex items-start gap-4 mb-7 p-5" style={{ borderLeft: `3px solid ${amber}`, background: "rgba(240,192,64,0.1)" }}>
        <div>
          <div className="text-xl font-bold tracking-wider" style={{ color: amber }}>{"\uC138\uB825\uBCC4 \uBE44\uAD50 \uBD84\uC11D"}</div>
          <div className="text-[11px] text-text-tertiary mt-1.5">{"\uD568\uC120 \uCCA0\uD559 \u00B7 \uD06C\uAE30 \uBE44\uAD50 \u00B7 \uC6B4\uC6A9 \uBC29\uC2DD"}</div>
        </div>
      </div>

      {/* Mottos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {(["council", "neka", "lib"] as const).map((f) => (
          <div key={f} className="border p-5 text-center" style={{ borderColor: FACTION_COLORS[f].dim }}>
            <div className="font-mono text-[11px] tracking-[3px] mb-3" style={{ color: FACTION_COLORS[f].accent }}>
              {f === "council" ? "COUNCIL" : f === "neka" ? "NEKA EMPIRE" : "LIBERATION FRONT"}
            </div>
            <div className="text-lg font-semibold italic" style={{ color: FACTION_COLORS[f].accent }}>{FACTIONS[f].motto}</div>
          </div>
        ))}
      </div>

      {/* Compare table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="p-3 text-left font-mono text-[9px] tracking-widest text-text-tertiary">{"\uC124\uACC4 \uC5B8\uC5B4"}</th>
              <th className="p-3 text-left font-mono text-[9px] tracking-widest text-text-tertiary">COUNCIL</th>
              <th className="p-3 text-left font-mono text-[9px] tracking-widest text-text-tertiary">NEKA</th>
              <th className="p-3 text-left font-mono text-[9px] tracking-widest text-text-tertiary">LIBERATION</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr key={row.label} className="border-b border-border/40 hover:bg-white/[0.02]">
                <td className="p-3 text-text-tertiary">{row.label}</td>
                <td className="p-3" style={{ color: FACTION_COLORS.council.accent }}>{row.council}</td>
                <td className="p-3" style={{ color: FACTION_COLORS.neka.accent }}>{row.neka}</td>
                <td className="p-3" style={{ color: FACTION_COLORS.lib.accent }}>{row.lib}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Size bars */}
      <div className="font-mono text-[10px] tracking-widest text-text-tertiary mb-4">SIZE COMPARISON</div>
      <div className="space-y-2.5 mb-8">
        {SIZE_BARS.map((bar) => (
          <div key={bar.name} className="flex items-center gap-3">
            <div className="text-[11px] w-[200px] flex-shrink-0 text-text-tertiary">
              <strong style={{ color: FACTION_COLORS[bar.faction].accent }}>{bar.name}</strong>{" "}
              ({bar.faction === "council" ? "Council" : bar.faction === "neka" ? "Neka" : "Liberation"})
            </div>
            <div className="flex-1 bg-bg-secondary h-4 border border-border overflow-hidden">
              <div className="h-full" style={{ width: bar.width, background: FACTION_COLORS[bar.faction].gradient, minWidth: bar.width === "0.02%" ? 2 : undefined }} />
            </div>
            <div className="text-[10px] text-text-tertiary w-[100px] text-right flex-shrink-0">{bar.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PART 6 — Ship Detail Panel (Radar Chart + Comparison + Silhouette)
// ============================================================

function RadarChart({ ships, en }: { ships: ShipStat[]; en: boolean }) {
  const cx = 140, cy = 140, r = 100;
  const n = STAT_LABELS.length;
  const angleStep = (Math.PI * 2) / n;

  const getPoint = (i: number, val: number) => {
    const angle = angleStep * i - Math.PI / 2;
    const dist = (val / 10) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const gridLevels = [2, 4, 6, 8, 10];
  const shipColors = [FACTION_COLORS[ships[0]?.faction ?? "council"].accent, ships[1] ? FACTION_COLORS[ships[1].faction].accent : "#888"];

  return (
    <svg viewBox="0 0 280 280" className="w-full max-w-[320px] mx-auto">
      {/* Grid */}
      {gridLevels.map(lv => (
        <polygon
          key={lv}
          points={Array.from({ length: n }, (_, i) => {
            const p = getPoint(i, lv);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none" stroke="var(--color-border)" strokeWidth="0.5" opacity={0.5}
        />
      ))}
      {/* Axes */}
      {STAT_LABELS.map((_, i) => {
        const p = getPoint(i, 10);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--color-border)" strokeWidth="0.5" opacity={0.3} />;
      })}
      {/* Labels */}
      {STAT_LABELS.map((sl, i) => {
        const p = getPoint(i, 12);
        return (
          <text key={sl.key} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fill="var(--color-text-tertiary)" fontSize="9" fontFamily="var(--font-mono)">
            {en ? sl.label : sl.ko}
          </text>
        );
      })}
      {/* Data polygons */}
      {ships.map((ship, si) => {
        const vals = [ship.firepower, ship.defense, ship.speed, ship.capacity, ship.stealth];
        const pts = vals.map((v, i) => getPoint(i, v));
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";
        return (
          <g key={ship.key}>
            <path d={d} fill={shipColors[si]} fillOpacity={0.15} stroke={shipColors[si]} strokeWidth="1.5" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={shipColors[si]} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function ShipSilhouette({ ship }: { ship: ShipStat }) {
  const color = FACTION_COLORS[ship.faction].accent;
  const logScale = Math.log10(ship.tonnageNum + 1);
  const maxLog = Math.log10(1200001);
  const w = Math.max(24, (logScale / maxLog) * 260);
  const h = Math.max(8, w * 0.18);
  return (
    <svg viewBox="0 0 280 60" className="w-full max-w-[300px] mx-auto">
      <rect x={(280 - w) / 2} y={(60 - h) / 2} width={w} height={h} rx={h * 0.2}
        fill={color} fillOpacity={0.2} stroke={color} strokeWidth="1" />
      <rect x={(280 - w * 0.15) / 2} y={(60 - h) / 2 - h * 0.5} width={w * 0.15} height={h * 0.5} rx={2}
        fill={color} fillOpacity={0.35} stroke={color} strokeWidth="0.5" />
      <rect x={(280 - w) / 2 - 3} y={(60 - h * 0.5) / 2} width={4} height={h * 0.5} rx={1}
        fill={color} fillOpacity={0.6} />
      <polygon
        points={`${(280 + w) / 2},${(60 - h * 0.3) / 2} ${(280 + w) / 2 + w * 0.12},${30} ${(280 + w) / 2},${(60 + h * 0.3) / 2}`}
        fill={color} fillOpacity={0.3} stroke={color} strokeWidth="0.5"
      />
      <text x={140} y={56} textAnchor="middle" fill={color} fontSize="8" fontFamily="var(--font-mono)" opacity={0.7}>
        {ship.name} — {ship.tonnageNum.toLocaleString()}t
      </text>
    </svg>
  );
}

function ShipDetailPanel({ en }: { en: boolean }) {
  const [selA, setSelA] = useState<string>(ALL_SHIPS[0].key);
  const [selB, setSelB] = useState<string>("");
  const shipA = ALL_SHIPS.find(s => s.key === selA) ?? ALL_SHIPS[0];
  const shipB = selB ? ALL_SHIPS.find(s => s.key === selB) : null;
  const radarShips = shipB ? [shipA, shipB] : [shipA];

  const amber = "#f0c040";

  return (
    <div>
      <div className="flex items-start gap-4 mb-7 p-5" style={{ borderLeft: `3px solid ${amber}`, background: "rgba(240,192,64,0.1)" }}>
        <div>
          <div className="text-xl font-bold tracking-wider" style={{ color: amber }}>
            {en ? "Ship Detail & Comparison" : "함선 상세 · 비교"}
          </div>
          <div className="text-[11px] text-text-tertiary mt-1.5">
            {en ? "Select one or two ships to compare stats, radar profile, and silhouette." : "1~2척의 함선을 선택하여 스탯, 레이더 프로파일, 실루엣을 비교합니다."}
          </div>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div>
          <label className="font-mono text-[9px] tracking-widest text-text-tertiary block mb-2">
            {en ? "SHIP A (Primary)" : "함선 A (주)"}
          </label>
          <select
            value={selA}
            onChange={e => setSelA(e.target.value)}
            className="w-full bg-bg-secondary border border-border text-text-primary text-xs p-2.5 rounded font-mono"
          >
            {ALL_SHIPS.map(s => (
              <option key={s.key} value={s.key}>
                [{s.faction.toUpperCase()}] {s.name} ({en ? s.name : s.ko})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-mono text-[9px] tracking-widest text-text-tertiary block mb-2">
            {en ? "SHIP B (Compare)" : "함선 B (비교)"}
          </label>
          <select
            value={selB}
            onChange={e => setSelB(e.target.value)}
            className="w-full bg-bg-secondary border border-border text-text-primary text-xs p-2.5 rounded font-mono"
          >
            <option value="">{en ? "— None —" : "— 없음 —"}</option>
            {ALL_SHIPS.filter(s => s.key !== selA).map(s => (
              <option key={s.key} value={s.key}>
                [{s.faction.toUpperCase()}] {s.name} ({en ? s.name : s.ko})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="mb-8">
        <div className="font-mono text-[10px] tracking-widest text-text-tertiary mb-3">
          {en ? "STAT RADAR" : "스탯 레이더"}
        </div>
        <div className="border border-border bg-bg-secondary p-4 rounded flex justify-center">
          <RadarChart ships={radarShips} en={en} />
        </div>
        <div className="flex gap-6 justify-center mt-3">
          <div className="flex items-center gap-2 text-[10px]">
            <div className="w-3 h-3 rounded-sm" style={{ background: FACTION_COLORS[shipA.faction].accent }} />
            <span style={{ color: FACTION_COLORS[shipA.faction].accent }}>{shipA.name}</span>
          </div>
          {shipB && (
            <div className="flex items-center gap-2 text-[10px]">
              <div className="w-3 h-3 rounded-sm" style={{ background: FACTION_COLORS[shipB.faction].accent }} />
              <span style={{ color: FACTION_COLORS[shipB.faction].accent }}>{shipB.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stat Table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="p-3 text-left font-mono text-[9px] tracking-widest text-text-tertiary">STAT</th>
              <th className="p-3 text-center font-mono text-[9px] tracking-widest" style={{ color: FACTION_COLORS[shipA.faction].accent }}>{shipA.name}</th>
              {shipB && (
                <th className="p-3 text-center font-mono text-[9px] tracking-widest" style={{ color: FACTION_COLORS[shipB.faction].accent }}>{shipB.name}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {STAT_LABELS.map(sl => {
              const va = shipA[sl.key as keyof ShipStat] as number;
              const vb = shipB ? (shipB[sl.key as keyof ShipStat] as number) : null;
              return (
                <tr key={sl.key} className="border-b border-border/40 hover:bg-white/[0.02]">
                  <td className="p-3 text-text-tertiary">{en ? sl.label : sl.ko}</td>
                  <td className="p-3 text-center font-bold" style={{ color: FACTION_COLORS[shipA.faction].accent }}>{va}/10</td>
                  {shipB && (
                    <td className="p-3 text-center font-bold" style={{ color: FACTION_COLORS[shipB.faction].accent }}>{vb}/10</td>
                  )}
                </tr>
              );
            })}
            <tr className="border-b border-border/40">
              <td className="p-3 text-text-tertiary">{en ? "Tonnage" : "톤수"}</td>
              <td className="p-3 text-center font-bold" style={{ color: FACTION_COLORS[shipA.faction].accent }}>{shipA.tonnageNum.toLocaleString()}t</td>
              {shipB && (
                <td className="p-3 text-center font-bold" style={{ color: FACTION_COLORS[shipB.faction].accent }}>{shipB.tonnageNum.toLocaleString()}t</td>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Silhouettes */}
      <div className="font-mono text-[10px] tracking-widest text-text-tertiary mb-3">
        {en ? "SILHOUETTE (Log Scale)" : "실루엣 (로그 스케일)"}
      </div>
      <div className="border border-border bg-bg-secondary p-4 rounded space-y-4">
        <ShipSilhouette ship={shipA} />
        {shipB && <ShipSilhouette ship={shipB} />}
      </div>
    </div>
  );
}
