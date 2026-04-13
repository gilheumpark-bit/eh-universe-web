"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";
import ToolNav from "@/components/tools/ToolNav";

// ============================================================
// PART 1 — Constants & Data Definitions
// ============================================================

const STORAGE_KEY = "eh-warp-gate-command-state";
const CONSISTENCY_TARGET = 0.51;
const CONSISTENCY_BAND_CENTER = 0.5;
const CONSISTENCY_BAND_HALF_WIDTH = 0.2;
const CONSISTENCY_BAND_MIN = CONSISTENCY_BAND_CENTER - CONSISTENCY_BAND_HALF_WIDTH;
const CONSISTENCY_BAND_MAX = CONSISTENCY_BAND_CENTER + CONSISTENCY_BAND_HALF_WIDTH;

interface Ship {
  id: string; name: string; tag: string; tagEn: string; crew: string;
  hull: number; quantum: number; sensor: number; rangeBias: number; stressGuard: number;
  description: string; descriptionEn: string;
}

interface Zone {
  id: string; name: string; subtitle: string; subtitleEn: string;
  distanceText: string; requiredSpan: number; gateTierRequired: number;
  risk: number; minPhi: number; minPsi: number;
  reward: { energy: number; materials: number; hydrogen: number; intel: number };
  x: number; y: number; description: string; descriptionEn: string;
}

interface GateLevel {
  level: number; name: string; color: string; baseSpan: number;
  stability: number; diameter: string; lore: string; loreEn: string;
}

interface UpgradeDef {
  id: string; name: string; nameEn: string; maxLevel: number;
  effect: string; effectEn: string;
}

interface EraDef {
  id: string; name: string; title: string; titleEn: string;
  rangeRequirement: number; hctgRequirement: number;
}

const ERA_DEFS: EraDef[] = [
  { id: "ships", name: "1시대", title: "함선의 시대", titleEn: "Age of Ships", rangeRequirement: 0, hctgRequirement: 7.0 },
  { id: "gates", name: "2시대", title: "게이트의 시대", titleEn: "Age of Gates", rangeRequirement: 160, hctgRequirement: 10.0 },
  { id: "stars", name: "3시대", title: "네트워크와 별의 시대", titleEn: "Age of Networks & Stars", rangeRequirement: 1200, hctgRequirement: 16.0 },
  { id: "galaxy", name: "4시대", title: "은하 중심 도달", titleEn: "Galactic Center Reach", rangeRequirement: 3200, hctgRequirement: 20.0 },
];

const SHIPS: Ship[] = [
  { id: "hope01", name: "Hope-01", tag: "튜토리얼 드론", tagEn: "Tutorial Drone", crew: "0", hull: 0.44, quantum: 0.32, sensor: 0.58, rangeBias: 1.08, stressGuard: 0.16, description: "무인 튜토리얼 정찰기. Deep Core 회수가 이 기체의 존재 이유 전부다.", descriptionEn: "Unmanned tutorial scout. Deep Core recovery is its sole purpose." },
  { id: "warp_probe", name: "Warp Probe", tag: "소모성 정찰기", tagEn: "Expendable Scout", crew: "0", hull: 0.38, quantum: 0.48, sensor: 0.72, rangeBias: 1.22, stressGuard: 0.08, description: "위험 항로용 탐사 프로브. 높은 분기 판독값, 낮은 생존 여유.", descriptionEn: "Hazardous route probe. High branch readings, low survival margin." },
  { id: "warpship_mk1", name: "Warpship Mk I", tag: "1인승 러너", tagEn: "Single-seat Runner", crew: "1", hull: 0.62, quantum: 0.56, sensor: 0.48, rangeBias: 1.36, stressGuard: 0.24, description: "정식 워프 실드를 갖춘 소형 개인 함. 빠르고, 취약하고, 정밀하다.", descriptionEn: "Compact personal vessel with proper warp shielding. Fast, fragile, precise." },
  { id: "hpg_shuttle", name: "HPG Shuttle", tag: "4인승 수송기", tagEn: "4-seat Transport", crew: "4", hull: 0.68, quantum: 0.42, sensor: 0.44, rangeBias: 1.12, stressGuard: 0.28, description: "확립된 회랑 내 네트워크 주력 기체. 안정적인 중계 체인에 최적화.", descriptionEn: "Network workhorse within established corridors. Optimized for stable relay chains." },
  { id: "starship_hpg", name: "Starship HPG", tag: "심우주 탐사선", tagEn: "Deep Space Explorer", crew: "6", hull: 0.82, quantum: 0.61, sensor: 0.57, rangeBias: 1.7, stressGuard: 0.36, description: "최종 등급 착륙 가능 탐사선. 이동 비용이 높지만, 별에 도달하도록 설계되었다.", descriptionEn: "Final-tier landable explorer. High transit cost, but built to reach stars." },
];

const ZONES: Zone[] = [
  { id: "l2_calibration", name: "L2 Calibration Corridor", subtitle: "HPG 프로젝트 시작", subtitleEn: "HPG Project Start", distanceText: "150만 km", requiredSpan: 20, gateTierRequired: 1, risk: 0.12, minPhi: 0.41, minPsi: 0.43, reward: { energy: 40, materials: 24, hydrogen: 4, intel: 18 }, x: 50, y: 20, description: "최초의 통제된 회랑. 챔버에게 안전한 워프가 어떤 것인지 가르치는 데 사용된다.", descriptionEn: "The first controlled corridor. Used to teach the chamber what a safe warp looks like." },
  { id: "jupiter_arc", name: "Jupiter Direct Warp", subtitle: "Gate I 및 Gate II 확장", subtitleEn: "Gate I & II Expansion", distanceText: "5억 3천만 km", requiredSpan: 160, gateTierRequired: 2, risk: 0.22, minPhi: 0.46, minPsi: 0.48, reward: { energy: 50, materials: 36, hydrogen: 8, intel: 24 }, x: 74, y: 36, description: "메인 링의 첫 번째 본격적인 시험. 여기서부터 중계기 간격이 중요해진다.", descriptionEn: "The main ring's first real test. Relay spacing starts to matter here." },
  { id: "seed_belt", name: "Seed Belt Relay Arc", subtitle: "자율 게이트 시드", subtitleEn: "Autonomous Gate Seeds", distanceText: "토성 너머 네트워크 체인", requiredSpan: 460, gateTierRequired: 2, risk: 0.3, minPhi: 0.5, minPsi: 0.52, reward: { energy: 62, materials: 46, hydrogen: 12, intel: 28 }, x: 80, y: 58, description: "중계기 밀집 항로. 게이트 시드가 앞선 경로를 연쇄적으로 개척하기 시작한다.", descriptionEn: "Relay-dense route. Gate seeds begin cascading ahead." },
  { id: "proxima_corridor", name: "Proxima Corridor", subtitle: "골드 링 프론티어", subtitleEn: "Gold Ring Frontier", distanceText: "4.24 광년", requiredSpan: 1200, gateTierRequired: 3, risk: 0.4, minPhi: 0.56, minPsi: 0.58, reward: { energy: 86, materials: 62, hydrogen: 18, intel: 42 }, x: 50, y: 78, description: "게이트가 다리에서 문명의 척추로 변하는 지점.", descriptionEn: "Where gates transform from bridges into civilization's spine." },
  { id: "transparent_run", name: "Transparent Gate Run", subtitle: "n=20 챔버 도약", subtitleEn: "n=20 Chamber Leap", distanceText: "2,500 광년", requiredSpan: 2200, gateTierRequired: 4, risk: 0.54, minPhi: 0.62, minPsi: 0.65, reward: { energy: 110, materials: 88, hydrogen: 30, intel: 56 }, x: 24, y: 60, description: "거의 투명에 가까운 챔버 잠금. 미세한 위상 편차가 치명적이 된다.", descriptionEn: "Near-transparent chamber lock. Minute phase deviations become lethal." },
  { id: "galactic_center", name: "Galactic Center Reach", subtitle: "4세대 중계 승리", subtitleEn: "4th Gen Relay Victory", distanceText: "27,500 광년", requiredSpan: 3200, gateTierRequired: 5, risk: 0.7, minPhi: 0.68, minPsi: 0.72, reward: { energy: 150, materials: 110, hydrogen: 42, intel: 80 }, x: 18, y: 30, description: "최종 항로. 여기서 한 번의 깨끗한 주행이 HPG의 전체 유산의 가치를 증명한다.", descriptionEn: "The final route. One clean run here proves HPG's entire legacy." },
];

const MAIN_GATE_LEVELS: (GateLevel | null)[] = [
  null,
  { level: 1, name: "Gate I", color: "#70cfff", baseSpan: 160, stability: 0.12, diameter: "50m", lore: "초기 행성간 워프를 위한 청백색 기본 링.", loreEn: "Blue-white base ring for initial interplanetary warps." },
  { level: 2, name: "Gate II", color: "#c9f1ff", baseSpan: 520, stability: 0.18, diameter: "80m", lore: "항성계 규모의 직접 항로를 고정할 수 있는 확장 회랑 링.", loreEn: "Extended corridor ring capable of locking system-scale direct routes." },
  { level: 3, name: "Gate III", color: "#ffd87a", baseSpan: 1400, stability: 0.24, diameter: "150m", lore: "프록시마 회랑 시대를 위한 금색 프론티어 링.", loreEn: "Gold frontier ring for the Proxima Corridor era." },
  { level: 4, name: "Gate IV", color: "#ffe6b8", baseSpan: 2600, stability: 0.3, diameter: "220m", lore: "심우주 항성 중계 점프를 위해 건조된 고투명도 챔버.", loreEn: "High-transparency chamber built for deep-space stellar relay jumps." },
  { level: 5, name: "Gate V", color: "#f6ffff", baseSpan: 3400, stability: 0.36, diameter: "300m", lore: "투명 은하급 게이트. 링 형태의 문명 규모 인프라.", loreEn: "Transparent galaxy-class gate. Civilization-scale ring infrastructure." },
];

const UPGRADE_DEFS: UpgradeDef[] = [
  { id: "hctg", name: "HCTG 방어 격자", nameEn: "HCTG Defense Lattice", maxLevel: 6, effect: "격자 밀도와 워프 내성을 높인다.", effectEn: "Raises lattice density and warp resilience." },
  { id: "sondol", name: "S-Ondol 열 외피", nameEn: "S-Ondol Thermal Skin", maxLevel: 4, effect: "추가 전력 소모 없이 엔트로피를 방출한다.", effectEn: "Dissipates entropy without extra power draw." },
  { id: "dpad", name: "D-PAD 완충기", nameEn: "D-PAD Absorber", maxLevel: 4, effect: "충격을 흡수하고 실패 시 함선 스트레스를 줄인다.", effectEn: "Absorbs impacts and reduces ship stress on failure." },
  { id: "qlaunch", name: "Q-Launch 이온 엔진", nameEn: "Q-Launch Ion Engine", maxLevel: 4, effect: "양자 피크와 근거리 게이트 조작을 개선한다.", effectEn: "Improves quantum peak and near-gate maneuvers." },
  { id: "warp_shield", name: "워프 실드", nameEn: "Warp Shield", maxLevel: 4, effect: "psi 급증 시 선체 안정성을 강화한다.", effectEn: "Reinforces hull stability during psi surges." },
  { id: "deep_core", name: "Deep Core 회수 장치", nameEn: "Deep Core Recovery", maxLevel: 3, effect: "DENY 이벤트를 완화하고 정보를 보존한다.", effectEn: "Mitigates DENY events and preserves intel." },
  { id: "cweh", name: "CWEH 에너지 회수", nameEn: "CWEH Energy Recovery", maxLevel: 4, effect: "충격과 잔류 에너지를 챔버로 재순환한다.", effectEn: "Recycles impact and residual energy into the chamber." },
];

const HCTG_SCALE = [7.0, 8.5, 10.0, 12.0, 14.0, 16.0, 20.0];

// IDENTITY_SEAL: PART-1 | role=data-definitions | inputs=none | outputs=constants,types

// ============================================================
// PART 2 — Situation & Campaign Data
// ============================================================

interface SituationDef {
  id: string; title: string; tone: string; summary: string;
  minCampaign: number; maxCampaign: number;
  modifiers: Record<string, number>;
}

const SITUATION_DEFS: SituationDef[] = [
  { id: "quiet_window", title: "고요한 창", tone: "support", summary: "태양 노이즈가 예측치 아래로 떨어졌다. 챔버에 모든 것이 실제보다 깨끗하게 들리는 드문 전환이 찾아왔다.", minCampaign: 1, maxCampaign: 10, modifiers: { phi: 0.018, entropy: -0.05, branchProbability: 0.04, eRms: -0.0018 } },
  { id: "solar_shear", title: "태양 전단면", tone: "danger", summary: "하전 입자 흐름이 링 스택을 긁어대고 있다. 텔레메트리가 완전히 따라잡기 전에 열과 진동이 먼저 도달할 것이다.", minCampaign: 1, maxCampaign: 10, modifiers: { phi: -0.024, entropy: 0.065, eRms: 0.0028, branchProbability: -0.034, holdScale: 0.12, simScale: 0.1 } },
  { id: "relay_echo", title: "중계 에코 정렬", tone: "support", summary: "중계 체인이 우연히 위상 공명에 들어섰다. 회랑이 평소보다 더 많은 자체 하중을 감당하고 있다.", minCampaign: 2, maxCampaign: 10, modifiers: { psi: 0.028, relayHarmony: 0.05, branchProbability: 0.025, consistencySignal: 0.03, holdScale: -0.08 } },
  { id: "crew_drift", title: "승무원 생체 드리프트", tone: "unstable", summary: "호흡 주기와 체온이 챔버를 깨끗한 라인에서 밀어내고 있다.", minCampaign: 3, maxCampaign: 10, modifiers: { phi: -0.018, entropy: 0.03, eRms: 0.0012, branchProbability: -0.02, holdScale: 0.08 } },
  { id: "thermal_bloom", title: "열 폭발", tone: "danger", summary: "잔류 열이 챔버 외피에 달라붙고 있다. 추가 출력 1포인트마다 사령부가 인정하고 싶은 것보다 더 많은 구조적 비용이 든다.", minCampaign: 4, maxCampaign: 10, modifiers: { phi: -0.02, entropy: 0.075, eRms: 0.0018, holdScale: 0.14, simScale: 0.12 } },
  { id: "gravitic_lens", title: "중력 렌즈 포켓", tone: "support", summary: "국소 곡률이 저항 대신 도움을 주고 있다.", minCampaign: 5, maxCampaign: 10, modifiers: { psi: 0.036, branchProbability: 0.032, consistencySignal: 0.02, eRms: 0.001 } },
  { id: "audit_stack", title: "감사 스택 적체", tone: "unstable", summary: "SJC가 동일한 결정 트리에 추가 패스를 소비하고 있다.", minCampaign: 6, maxCampaign: 10, modifiers: { holdScale: 0.24, simScale: 0.28, branchProbability: -0.018 } },
  { id: "seed_resonance", title: "시드 회랑 공명", tone: "support", summary: "자율 시드 항로가 메인 링과 공명하며 윙윙거리고 있다.", minCampaign: 7, maxCampaign: 10, modifiers: { relayHarmony: 0.06, consistencySignal: 0.038, branchProbability: 0.03, entropy: -0.028 } },
  { id: "transparent_shear", title: "투명 전단", tone: "danger", summary: "거의 투명한 격자 층이 서로 미끄러지고 있다. 최종 챔버는 아름답게 보이지만 칼날처럼 행동한다.", minCampaign: 9, maxCampaign: 10, modifiers: { phi: -0.03, psi: -0.022, entropy: 0.05, eRms: 0.0026, branchProbability: -0.06, holdScale: 0.3, simScale: 0.22 } },
  { id: "star_sea_window", title: "별바다의 창", tone: "support", summary: "좁은 미래의 한 스택에서 회랑이 거의 완벽에 가깝게 정렬된다.", minCampaign: 9, maxCampaign: 10, modifiers: { phi: 0.022, psi: 0.03, branchProbability: 0.055, consistencySignal: 0.03, holdScale: 0.1 } },
];

interface CampaignDoc {
  id: string; title: string; author: string; type: string; tone: string;
  summary: string; quote: string; body: string[];
  effectText?: string;
}

interface CampaignRelic {
  id: string; title: string; author: string; type: string; tone: string;
  effectText: string; bonuses: Record<string, number>;
  quote: string; body: string[];
}

interface CampaignRequirements {
  minPhi?: number; minPsi?: number; minConsistency?: number;
  maxEntropy?: number; maxStress?: number; minGateCharge?: number;
  minMainGateCharge?: number; requiredGateLevel?: number;
  minRelay?: number; minSeed?: number; minSolar?: number; minHarvester?: number;
  minHctg?: number; minEnergy?: number; minIntel?: number;
  minBranchProbability?: number; minUpgrade_sondol?: number;
  minUpgrade_deep_core?: number;
}

interface Campaign {
  id: string; number: number; title: string; yearLabel: string;
  generation: string; lead: string; sjcVersion: string; zoneId: string;
  holdSeconds: number; simRange: [number, number]; objective: string;
  summary: string; requirements: CampaignRequirements;
  documents: CampaignDoc[]; relic: CampaignRelic;
  rewards: { energy?: number; materials?: number; hydrogen?: number; intel?: number; setYear?: number };
}

const CAMPAIGNS: Campaign[] = [
  { id: "campaign_01", number: 1, title: "0.51 Boundary", yearLabel: "2095", generation: "1st Gen", lead: "Jaden / Robert Chen", sjcVersion: "v1", zoneId: "l2_calibration", holdSeconds: 3, simRange: [3400, 18200], objective: "Hope-01을 기계 생존 경계 위에 유지하고, phi 0.51이 예산 압박 아래에서 버틸 수 있음을 증명하라.", summary: "프로젝트는 하나의 숫자에서 시작된다. phi가 0.51 아래로 떨어지면, 함선은 발사도 되기 전에 죽은 것이다.", requirements: { minPhi: 0.51, minConsistency: 0.51, maxStress: 18, minGateCharge: 12 }, documents: [ { id: "doc_c1_notebook", title: "Notebook Vol.1", author: "Jaden", type: "현장 기록", tone: "paper", summary: "0.51이 추측에서 교리로 바뀌는 첫 번째 기록.", quote: "phi가 버티면, 기계가 산다. 미끄러지면, 우리는 그저 더 아름다운 실패를 기록하고 있을 뿐이다.", body: ["첫 발사 창은 영웅적 행위를 할 만큼 크지 않다.", "우아한 숫자를 쫓지 마라. 죽기를 거부하는 숫자를 쫓아라.", "오늘 관측된 임계값: phi 0.51. 기록하라. 모든 것을 그 위에 세워라."] }, { id: "doc_c1_budget", title: "Redline Budget Mail", author: "Robert Chen", type: "재무", tone: "dark", summary: "장부는 프로그램이 이미 끝났어야 한다고 말한다.", quote: "잔여 재량 준비금: 4억 5천만. 한 번의 오발사면 다음 기계는 없다.", body: ["선체에서 제거되는 모든 킬로그램이 프로젝트 장부에 한 주의 수명을 더 산다.", "공학은 중복을 원한다. 재무는 증거를 원한다. SJC가 어느 쪽이 살아남을지 결정할 것이다."] } ], relic: { id: "relic_jaden_notebook", title: "Jaden의 노트북 Vol.1", author: "Jaden", type: "계승 유물", tone: "paper", effectText: "위상 고정이 목표 대역 근처에 있을 때 일관성 +0.010.", bonuses: { consistency: 0.01 }, quote: "문명은 하나의 여유가 움직임을 멈출 때 시작된다.", body: ["노트북 여백은 0.51이라는 숫자가 사과 없이 나타날 때까지 줄 긋기로 가득하다."] }, rewards: { energy: 18, materials: 10, intel: 10, setYear: 2096 } },
  { id: "campaign_02", number: 2, title: "Module 107", yearLabel: "2096", generation: "1st Gen", lead: "Vasquez / SJC", sjcVersion: "v1-batch", zoneId: "l2_calibration", holdSeconds: 2.3, simRange: [18400, 56200], objective: "침묵의 배치 텔레메트리 위기를 견디고, 격자가 실패하는 단일 모듈 주변에서 스스로 적응할 수 있음을 증명하라.", summary: "폭풍을 멈출 수 없다. 107번째 모듈이 생존하는 법을 기억하기를 믿을 수만 있다.", requirements: { minPhi: 0.49, minConsistency: 0.5, maxEntropy: 0.5, minBranchProbability: 0.42 }, documents: [ { id: "doc_c2_vasquez", title: "A5 Redline Notes", author: "Vasquez", type: "비상 기록", tone: "paper", summary: "평범한 검정 펜 기록이 모듈 107 주변에서 붉은 선으로 바뀐다.", quote: "이것을 운이라 부르지 마라. 격자가 부러지기 전에 구부러지는 쪽을 선택한 것이다.", body: ["텔레메트리가 6시간 배치로 도착했다. 그때쯤 인간의 공포는 이미 시효가 지났다.", "모듈 107이 실패를 향해 올라가다가, 스스로 위상을 조정하고 나머지 선체에게 따르라고 가르쳤다."] }, { id: "doc_c2_batch", title: "지연 패킷 17", author: "SJC 배치 노드", type: "텔레메트리", tone: "dark", summary: "최악의 순간이 이미 지나간 뒤에 도착한 패킷.", quote: "상태: HOLD 2.3초. 결과: 적응적 생존. 인간 개입: 없음.", body: ["기록은 잔인하게 침착하다.", "지구에 도착했을 때, 기계는 이미 스스로 구했다."] } ], relic: { id: "relic_vasquez_pen", title: "Vasquez의 빨간 펜", author: "Vasquez", type: "계승 유물", tone: "paper", effectText: "충돌 흡수 +0.040, 첫 번째 DENY는 구조적 페널티 없음.", bonuses: { collisionAbsorption: 0.04 }, quote: "그것이 이야기가 되기로 결정하기 전에 균열을 표시하라.", body: ["빨간 펜은 실패가 사전에 보여야 할 때만 사용되었다."] }, rewards: { materials: 14, intel: 16, setYear: 2098 } },
  { id: "campaign_03", number: 3, title: "The Cost of Crew", yearLabel: "2098", generation: "1.5 Gen", lead: "Yuki / Marcus", sjcVersion: "v2", zoneId: "l2_calibration", holdSeconds: 5, simRange: [56200, 148000], objective: "유인 프레임이 열과 심장박동이 phi를 찢어놓지 않으면서 동일한 회랑을 생존할 수 있음을 증명하라.", summary: "기계는 정밀했다. 인간이 도착하고, 정밀함이 신체세를 내기 시작했다.", requirements: { minPhi: 0.52, minConsistency: 0.505, maxEntropy: 0.44, minUpgrade_sondol: 1 }, documents: [ { id: "doc_c3_medical", title: "의료 관찰 장부", author: "Yuki", type: "의료", tone: "paper", summary: "승무원 맥박이 제어 모델에 들어가고 phi가 눈에 띄게 숙인다.", quote: "하나의 불안한 폐가 확신 0.002를 잡아먹을 수 있다.", body: ["첫 인간 측정값은 선체 모델에 들어가기 전까지 작아 보였다.", "열 관리는 더 이상 편안함이 아니다. 그것은 구조적 자비다."] }, { id: "doc_c3_multitool", title: "Bench Tool Memo", author: "Marcus", type: "공학", tone: "dark", summary: "유인 시스템이 실제보다 덜 깨지기 쉽게 느끼도록 만드는 정비 메모.", quote: "여기 아무것도 섬세하지 않다. 단지 우리가 있다는 것을 아는 것처럼 행동할 뿐이다.", body: ["밀봉 진동 커플러를 두 번 조이라. 승무원의 귀는 센서가 용서하는 것을 듣는다."] } ], relic: { id: "relic_yuki_chart", title: "Yuki 관찰 차트", author: "Yuki", type: "계승 유물", tone: "paper", effectText: "열 지원 +0.035, 스트레스 감소 +0.020.", bonuses: { thermalSupport: 0.035, stressReduction: 0.02 }, quote: "승무원은 이제 방정식의 일부다. 그렇지 않은 척하는 것을 멈춰라.", body: ["이후 모든 승무원 명부는 여전히 Yuki의 첫 환자 주석을 빌려 쓴다."] }, rewards: { energy: 22, materials: 12, intel: 18, setYear: 2103 } },
  { id: "campaign_04", number: 4, title: "Geometry of Trust", yearLabel: "2103", generation: "2nd Gen", lead: "Sophia / Hope-03 Crew", sjcVersion: "v3", zoneId: "l2_calibration", holdSeconds: 8, simRange: [148000, 284000], objective: "3인 승무원을 SJC가 스트레스 기하학 플래그를 멈출 만큼 사회적으로 동기화된 상태로 유지하라.", summary: "선체는 이제 타이밍 노이즈로 위장한 감정을 운반한다.", requirements: { minPhi: 0.54, minConsistency: 0.52, maxStress: 26, minIntel: 24 }, documents: [ { id: "doc_c4_sync", title: "승무원 동기화 삼각형", author: "Sophia", type: "승무원 역학", tone: "paper", summary: "외로움이 구조 손실로 나타날 수 있음을 증명하는 삼각 그래프.", quote: "한 꼭짓점이 떨어지면, 삼각형이 렌치가 듣기 전에 phi를 자른다.", body: ["승무원은 개인으로서 실패하지 않았다. 각도로서 실패했다."] }, { id: "doc_c4_note", title: "승무원 바이탈 노트", author: "SJC", type: "시스템 알림", tone: "dark", summary: "공학이 얼마나 내밀해졌는지 사령부에게 가르친 노란 경고.", quote: "승무원 바이탈: 주의. 동기화가 허용치 아래로 떨어졌다.", body: ["알람은 울리지 않았다. 줄이 그냥 나타났고, 관제실 전체가 함선이 듣고 있음을 이해했다."] } ], relic: { id: "relic_sophia_triangle", title: "Sophia 동기화 다이어그램", author: "Sophia", type: "계승 유물", tone: "paper", effectText: "일관성 +0.012, 분기 확률 +0.015.", bonuses: { consistency: 0.012, branchProbability: 0.015 }, quote: "승무원 조화는 심장박동을 입은 중계 조화일 뿐이다.", body: ["이 다이어그램은 이후 모든 승무원 스케줄 보드 근처에 고정되어 있다."] }, rewards: { energy: 24, materials: 18, intel: 22, setYear: 2115 } },
  { id: "campaign_05", number: 5, title: "Ship to Gate", yearLabel: "2115", generation: "2nd Gen", lead: "Brian / Kim Mi-rae", sjcVersion: "v4", zoneId: "jupiter_arc", holdSeconds: 10, simRange: [284000, 421000], objective: "조선공처럼 생각하기를 멈춰라. Gate I을 성장시키고 첫 번째 psi 주도 ALLOW를 쟁취하라.", summary: "화이트보드의 단어가 Ship에서 Gate로 바뀌고, 역사가 마커 자국을 따른다.", requirements: { requiredGateLevel: 2, minPsi: 0.58, minMainGateCharge: 26, minSolar: 1, minHctg: 12.0 }, documents: [ { id: "doc_c5_whiteboard", title: "파란 마커 화이트보드", author: "Brian", type: "지시문", tone: "paper", summary: "하나의 단어가 오래된 임무 태세를 대체한다: Gate.", quote: "또 다른 용감한 함선을 만들지 마라. 용기가 더 싸지는 장소를 만들어라.", body: ["마커 줄이 굵은 이유는 방 안의 아무도 반대할 준비가 되지 않았기 때문이다."] }, { id: "doc_c5_glg", title: "GLG 성장 시트", author: "Kim Mi-rae", type: "성장 프로토콜", tone: "dark", summary: "패널 수, 챔버 습도, 그리고 게이트를 작물처럼 키우는 기묘한 인내.", quote: "n=12는 소리 지른다고 더 빨리 오지 않는다.", body: ["첫 게이트 패널은 조립되지 않는다. 길러진다."] } ], relic: { id: "relic_brian_marker", title: "Brian의 파란 마커", author: "Brian", type: "계승 유물", tone: "paper", effectText: "기본 phi +0.005, psi +0.020, 중계 조화 +0.018.", bonuses: { phi: 0.005, psi: 0.02, relayHarmony: 0.018 }, quote: "유리 위의 한 단어가, 방이 그것을 믿는다면, 한 세기를 움직일 수 있다.", body: ["뚜껑이 갈라져 있다. 아무도 교체하지 않는다."] }, rewards: { energy: 42, materials: 28, intel: 26, setYear: 2128 } },
  { id: "campaign_06", number: 6, title: "The 0.097 Second Sentence", yearLabel: "2128", generation: "2.5 Gen", lead: "SJC-RPT-006", sjcVersion: "v4 crisis", zoneId: "seed_belt", holdSeconds: 9, simRange: [421000, 638000], objective: "파괴된 중계 노드 주변에 구조 경로를 안정화하여 첫 번째 진정한 DENY에서 회복하라.", summary: "아무도 보지 못했던 단어가 빨갛게 변하고, 슬픔의 값을 결정한다.", requirements: { requiredGateLevel: 2, minRelay: 4, minUpgrade_deep_core: 1, minEnergy: 180, minPhi: 0.5, minConsistency: 0.505 }, documents: [ { id: "doc_c6_report", title: "SJC-RPT-006", author: "보안 아카이브", type: "기밀 보고서", tone: "dark", summary: "누구도 흥정하기 전에 도장이 찍힌 첫 번째 적색 DENY 보고서.", quote: "귀환 생존 확률: 39.7%. 즉각 회랑 승인 거부.", body: ["보고서는 모욕적일 만큼 차갑다.", "승무원이 운명한다고 말하지 않는다. 사령부가 구하려면 예상보다 더 지불해야 한다고 말한다."] }, { id: "doc_c6_salvage", title: "비상 중계 우회", author: "구조 데스크", type: "구조 계획", tone: "paper", summary: "한 번 더 기회를 사기 위해서만 존재하는 축소된 경로.", quote: "메인 라인이 죽었다면, 네트워크에게 절뚝거리는 법을 가르쳐라.", body: ["Relay #223은 연료, Deep Core 텔레메트리, 사령부의 용기가 모두 함께 도착해야만 우회할 수 있다."] } ], relic: { id: "relic_deep_core_capsule", title: "Deep Core 캡슐", author: "구조 데스크", type: "계승 유물", tone: "dark", effectText: "DENY 페널티 완화, 분기 확률 +0.012.", bonuses: { denyMitigation: 0.18, branchProbability: 0.012 }, quote: "함선이 사라져도, 다시 시도해야 한다는 논거는 살아남을 수 있다.", body: ["캡슐은 영광스럽지 않다. 영광이 실패한 뒤에 집에 돌아오는 부분이다."] }, rewards: { materials: 34, intel: 30, hydrogen: 8, setYear: 2133 } },
  { id: "campaign_07", number: 7, title: "Five Hundred Candles", yearLabel: "2133-2138", generation: "3rd Gen", lead: "Kim Mi-rae", sjcVersion: "v5 direct warp", zoneId: "jupiter_arc", holdSeconds: 18, simRange: [638000, 982000], objective: "수백 개의 중계기를 하나의 직접 워프 아키텍처로 위상 고정하고, Brian에서 Mi-rae로의 인계를 생존하라.", summary: "네트워크가 의식처럼 느껴질 만큼 밝아지고, 의식을 가질 자격이 있을 만큼 위험해진다.", requirements: { requiredGateLevel: 3, minRelay: 6, minConsistency: 0.52, minEnergy: 240, minPsi: 0.6 }, documents: [ { id: "doc_c7_handover", title: "마커 인계", author: "Brian / Kim Mi-rae", type: "계승 기록", tone: "paper", summary: "파란 마커가 내려놓인다. 검은 마커가 그 자리를 차지한다.", quote: "보드는 여전히 당신 것이다. 필체가 더 이상 당신의 것일 필요는 없다.", body: ["방은 의식보다 변화를 더 의식한다."] }, { id: "doc_c7_direct", title: "역방향 집속 노트", author: "Kim Mi-rae", type: "제어 이론", tone: "dark", summary: "중계 필드에게 자신을 거꾸로 하나의 회랑에 쏟아붓는 법을 가르치는 방법.", quote: "직접 워프는 군중이 창이 되기로 결정하는 것일 뿐이다.", body: ["500개의 중계기 불빛은 인프라처럼 느껴지지 않는다. 움직이려 하는 야경처럼 느껴진다."] } ], relic: { id: "relic_mirae_marker", title: "Kim Mi-rae의 검은 마커", author: "Kim Mi-rae", type: "계승 유물", tone: "paper", effectText: "Psi +0.018, 일관성 +0.008, 지원 순환 가속.", bonuses: { psi: 0.018, consistency: 0.008, growth: 0.12 }, quote: "보드 위의 두 번째 줄은 야망이 불가피하게 들리기 시작하는 곳이다.", body: ["이 마커는 발명이 아니라 규모의 지휘를 표시한다."] }, rewards: { energy: 50, materials: 40, intel: 32, setYear: 2148 } },
  { id: "campaign_08", number: 8, title: "Seeds Make Seeds", yearLabel: "2148", generation: "3rd Gen", lead: "Lena", sjcVersion: "mini v5 autonomous", zoneId: "proxima_corridor", holdSeconds: 24, simRange: [982000, 1425000], objective: "햇빛이 사령부를 직접 지원할 수 있는 것보다 더 멀리 전송을 계속할 수 있는 자율 시드 연쇄를 구축하라.", summary: "프론티어가 명령을 기다리는 것을 멈추고, 재귀적으로 자신의 길을 짓기 시작한다.", requirements: { requiredGateLevel: 3, minSeed: 4, minHarvester: 2, minHctg: 16.0, minConsistency: 0.52 }, documents: [ { id: "doc_c8_seed_map", title: "연쇄 시드 지도", author: "Lena", type: "자율 지도", tone: "paper", summary: "각 시드가 다음 시드의 부모가 될 수 있는 지도.", quote: "사령부가 제시간에 도달할 수 없다면, 시드가 의도를 계승해야 한다.", body: ["지도가 72시간 간격으로 빛난다: 전송, 수신, 다시 전송."] }, { id: "doc_c8_hydrogen", title: "항성간 스쿱 메모", author: "Lena", type: "자원 프로토콜", tone: "dark", summary: "네트워크가 별 사이의 희박한 매질로 자급자족할 수 있음을 증명하는 메모.", quote: "별빛이 사라지면, 수소는 습관이 되어야 한다.", body: ["스쿱 회수 없이, 모든 시드는 그저 용감한 낭비일 뿐이다."] } ], relic: { id: "relic_lena_marker", title: "Lena의 초록 마커", author: "Lena", type: "계승 유물", tone: "paper", effectText: "시드 성장 +0.18, 자원 수율 +0.10.", bonuses: { growth: 0.18, resourceYield: 0.1 }, quote: "회랑이 성장하는 법을 기억하길 원한다면 초록으로 그려라.", body: ["Lena의 시대에 이르면, 마커 색 자체가 어떤 종류의 미래가 설계되고 있는지 신호한다."] }, rewards: { energy: 60, materials: 48, hydrogen: 16, intel: 40, setYear: 2150 } },
  { id: "campaign_09", number: 9, title: "Footprints on Two Worlds", yearLabel: "2150-2158", generation: "3rd Gen", lead: "Tomas / Mei", sjcVersion: "v5 corridor transit", zoneId: "transparent_run", holdSeconds: 40, simRange: [1425000, 1870000], objective: "Starship HPG를 긴 회랑으로 밀어넣고, 그들을 다르게 기억하는 행성에 착륙시켜라.", summary: "한 세계는 빨간 표시를 간직한다. 다른 세계는 그 표시를 씻어낸다. 사령부는 둘 다 중요하다는 것을 배운다.", requirements: { requiredGateLevel: 4, minBranchProbability: 0.6, minConsistency: 0.52, minIntel: 140, minHctg: 16.0 }, documents: [ { id: "doc_c9_sample", title: "Tau Ceti 수질 샘플", author: "Tomas", type: "행성 기록", tone: "paper", summary: "긴 HOLD를 가치 있게 만드는 조용한 샘플 기록.", quote: "바다가 우리의 발자국을 지웠지만, 도착은 지우지 못했다.", body: ["승무원은 지질학을 기대했다. 대신 첫 번째 유용한 기록은 감사처럼 느껴졌다."] }, { id: "doc_c9_adapt", title: "인간 적응 시트", author: "Mei", type: "생물학", tone: "dark", summary: "회랑 시간이 여전히 걷고자 하는 신체에 무엇을 하는지 측정하려는 시도.", quote: "HOLD 40초는 모든 사람이 자신의 두려움을 이름으로 만나기에 충분했다.", body: ["이 캠페인쯤 되면, 홀드 타이머 자체가 임무 의학의 일부가 된다."] } ], relic: { id: "relic_mei_chart", title: "Mei 적응 차트", author: "Mei", type: "계승 유물", tone: "paper", effectText: "스트레스 감소 +0.030, 선체 안정성 +0.015.", bonuses: { stressReduction: 0.03, phi: 0.015 }, quote: "신체에게 회랑을 가르칠 수 있다면, 회랑은 형벌처럼 느끼는 것을 멈춘다.", body: ["이 차트는 이후 시대의 장시간 HOLD 창을 생존 가능하게 만들었다."] }, rewards: { energy: 72, materials: 56, intel: 60, setYear: 2168 } },
  { id: "campaign_10", number: 10, title: "Transparent Gate, Sea of Stars", yearLabel: "2168-2170", generation: "4th Gen", lead: "Yara", sjcVersion: "v6 transparent gate", zoneId: "galactic_center", holdSeconds: 60, simRange: [1870000, 2750000], objective: "Gate V를 올리고, psi 523급 야망을 투명 격자 규율과 정렬하여, 최종 시드를 은하 중심을 향해 발사하라.", summary: "수십 년의 텍스트 끝에, 화면이 마침내 빛이 될 자격을 얻는다.", requirements: { requiredGateLevel: 5, minSeed: 11, minHctg: 20.0, minConsistency: 0.54, minPsi: 0.72, minBranchProbability: 0.68 }, documents: [ { id: "doc_c10_tablet", title: "Yara 항법 태블릿", author: "Yara", type: "지휘 태블릿", tone: "dark", summary: "중심을 향한 디지털 지도. 하나의 단어로 주석: 계속.", quote: "HPG는 결코 목적지가 아니었다. 바깥으로 계속 그릴 수 있는 허가였다.", body: ["태블릿은 최종 선 아래에 이전의 모든 경로를 흐릿한 유령으로 담고 있다."] }, { id: "doc_c10_window", title: "별의 바다 렌더 노트", author: "아카이브 엔진", type: "최종 시각화", tone: "paper", summary: "터미널에게 텍스트 대신 빛을 보여줘도 될 때를 알려주는 지시.", quote: "ALLOW가 도착하면, 기계를 75년 동안 벌어온 별 속으로 페이드하라.", body: ["이 명령은 하드웨어가 그것을 받을 자격이 되기 훨씬 전에 작성되었다."] } ], relic: { id: "relic_yara_tablet", title: "Yara의 계속 태블릿", author: "Yara", type: "계승 유물", tone: "dark", effectText: "Psi +0.022, 분기 확률 +0.022, 자원 성장 +0.08.", bonuses: { psi: 0.022, branchProbability: 0.022, resourceYield: 0.08 }, quote: "계속.", body: ["최종 유물은 기억의 대상이 아니다. 다음 세기에 대한 지시다."] }, rewards: { energy: 100, materials: 80, intel: 100, setYear: 2170 } },
];

const TUTORIAL_SCENARIOS = [
  { phase: 50, verdict: "DENY" as const, label: "단계 1 / 3", title: "phi 0.50 // 즉시 거부", titleEn: "phi 0.50 // Instant DENY", detail: "0.01 부족이면 충분하다. 기계는 phi 0.50을 죽은 회랑으로 취급한다.", detailEn: "0.01 short is enough. The machine treats phi 0.50 as a dead corridor.", phi: 0.5, psi: 0.482, consistency: 0.498, eRms: 0.012, entropy: 0.344, branchProbability: 0.322, simCount: 12 },
  { phase: 52, verdict: "ALLOW" as const, label: "단계 2 / 3", title: "phi 0.52 // 즉시 승인", titleEn: "phi 0.52 // Instant ALLOW", detail: "작은 여유가 생존이 된다. 챔버는 phi 0.52를 보고 승인한다.", detailEn: "A small margin becomes survival. The chamber sees phi 0.52 and approves.", phi: 0.52, psi: 0.536, consistency: 0.526, eRms: 0.009, entropy: 0.298, branchProbability: 0.541, simCount: 28 },
  { phase: 51, verdict: "HOLD" as const, label: "단계 3 / 3", title: "phi 0.51 // 기계가 망설인다", titleEn: "phi 0.51 // The machine hesitates", detail: "HOLD는 우유부단함이 아니다. 기계가 2.1초를 들여 확인하는 것이다.", detailEn: "HOLD is not indecision. The machine takes 2.1s to verify.", phi: 0.51, psi: 0.511, consistency: 0.51, eRms: 0.01, entropy: 0.318, branchProbability: 0.472, simStart: 0, simEnd: 84, holdSeconds: 2.1 },
];

// IDENTITY_SEAL: PART-2 | role=campaign-situation-data | inputs=none | outputs=CAMPAIGNS,SITUATION_DEFS,TUTORIAL_SCENARIOS

// ============================================================
// PART 3 — Game State Types & Initial State
// ============================================================

interface GameState {
  year: number;
  selectedShipId: string;
  selectedZoneId: string;
  resources: { energy: number; materials: number; hydrogen: number; intel: number };
  structures: { mainGateLevel: number; relay: number; seed: number; solar: number; harvester: number };
  upgrades: Record<string, number>;
  controls: { phase: number; curvature: number; coolant: number; relaySync: number };
  gateCharge: number;
  shipStress: number;
  focusPulse: boolean;
  simulation: {
    orbitalAngle: number; flightPosition: number[]; flightVelocity: number[];
    hullIntegrity: number; coreTemperature: number; crystalMass: number;
    alloyMass: number; latticeDensity: number; seedProgress: number;
  };
  campaignIndex: number;
  campaignFlags: { campaign06CrisisTriggered: boolean; vasquezShieldUsed: boolean };
  campaignAttempts: Record<string, number>;
  completedCampaignIds: string[];
  unlockedRelicIds: string[];
  selectedDocumentId: string | null;
  rescueIncident: {
    active: boolean; kind: string; campaignId: string; title: string;
    relayNode: string; remainingHours: number; attempts: number;
    droneCost: { energy: number; materials: number; hydrogen: number };
    result: string; crewLabel: string;
  } | null;
  finale: { unlocked: boolean; title: string | null; detail: string | null; yearUnlocked: number | null };
  terminal: {
    mode: string; simCount: number; holdTimeRemaining: number;
    activeCampaignId: string; lastVerdict: string | null; lines: string[];
  };
  tutorial: { active: boolean; step: number; completed: boolean };
  currentSituation: {
    campaignId: string; id: string; title: string; tone: string;
    summary: string; modifiers: Record<string, number>;
    effectTexts: string[]; reason: string; rolledAt: number; severity: number;
  } | null;
  completedZones: string[];
  latestResolution: Record<string, unknown> | null;
  log: { kind: string; title: string; detail: string; year: number }[];
}

const INITIAL_STATE: GameState = {
  year: 2095, selectedShipId: "hope01", selectedZoneId: "l2_calibration",
  resources: { energy: 180, materials: 150, hydrogen: 24, intel: 0 },
  structures: { mainGateLevel: 1, relay: 0, seed: 0, solar: 0, harvester: 0 },
  upgrades: { hctg: 0, sondol: 0, dpad: 0, qlaunch: 0, warp_shield: 0, deep_core: 0, cweh: 0 },
  controls: { phase: 51, curvature: 50, coolant: 55, relaySync: 44 },
  gateCharge: 10, shipStress: 6, focusPulse: false,
  simulation: { orbitalAngle: 12, flightPosition: [0, 0, 0], flightVelocity: [0.1, 0, 0], hullIntegrity: 0.94, coreTemperature: 318, crystalMass: 22, alloyMass: 16, latticeDensity: 7, seedProgress: 0.08 },
  campaignIndex: 0, campaignFlags: { campaign06CrisisTriggered: false, vasquezShieldUsed: false },
  campaignAttempts: {}, completedCampaignIds: [], unlockedRelicIds: [],
  selectedDocumentId: null, rescueIncident: null,
  finale: { unlocked: false, title: null, detail: null, yearUnlocked: null },
  terminal: { mode: "IDLE", simCount: 0, holdTimeRemaining: 0, activeCampaignId: "campaign_01", lastVerdict: null, lines: [] },
  tutorial: { active: false, step: 0, completed: false },
  currentSituation: null, completedZones: [], latestResolution: null, log: [],
};

// IDENTITY_SEAL: PART-3 | role=state-types | inputs=none | outputs=GameState,INITIAL_STATE

// ============================================================
// PART 4 — Pure Computation Functions
// ============================================================

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
function clamp(v: number, lo: number, hi: number) { return Math.min(Math.max(v, lo), hi); }
function fixed(v: number, d: number) { return Number(v).toFixed(d); }

function normalizeState(raw: Partial<GameState> | null): GameState {
  if (!raw || typeof raw !== "object") return clone(INITIAL_STATE);
  const m = clone(INITIAL_STATE);
  Object.assign(m, raw);
  m.resources = { ...INITIAL_STATE.resources, ...(raw.resources || {}) };
  m.structures = { ...INITIAL_STATE.structures, ...(raw.structures || {}) };
  m.upgrades = { ...INITIAL_STATE.upgrades, ...(raw.upgrades || {}) };
  m.controls = { ...INITIAL_STATE.controls, ...(raw.controls || {}) };
  m.simulation = { ...INITIAL_STATE.simulation, ...(raw.simulation || {}) };
  m.terminal = { ...INITIAL_STATE.terminal, ...(raw.terminal || {}) };
  m.campaignFlags = { ...INITIAL_STATE.campaignFlags, ...(raw.campaignFlags || {}) };
  m.campaignAttempts = { ...INITIAL_STATE.campaignAttempts, ...(raw.campaignAttempts || {}) };
  m.completedZones = Array.isArray(raw.completedZones) ? raw.completedZones.slice() : [];
  m.completedCampaignIds = Array.isArray(raw.completedCampaignIds) ? raw.completedCampaignIds.slice() : [];
  m.unlockedRelicIds = Array.isArray(raw.unlockedRelicIds) ? raw.unlockedRelicIds.slice() : [];
  m.selectedDocumentId = typeof raw.selectedDocumentId === "string" ? raw.selectedDocumentId : null;
  m.rescueIncident = raw.rescueIncident && typeof raw.rescueIncident === "object" ? { ...raw.rescueIncident } as GameState["rescueIncident"] : null;
  m.finale = { ...INITIAL_STATE.finale, ...(raw.finale || {}) };
  m.tutorial = { ...INITIAL_STATE.tutorial, ...(raw.tutorial || {}) };
  m.currentSituation = raw.currentSituation && typeof raw.currentSituation === "object" ? { ...raw.currentSituation } as GameState["currentSituation"] : null;
  m.campaignIndex = clamp(Number(raw.campaignIndex || 0), 0, CAMPAIGNS.length - 1);
  m.log = Array.isArray(raw.log) ? raw.log.slice(0, 18) : [];
  return m;
}

function getShip(s: GameState) { return SHIPS.find(sh => sh.id === s.selectedShipId) || SHIPS[0]; }
function getZone(s: GameState) { return ZONES.find(z => z.id === s.selectedZoneId) || ZONES[0]; }
function getGate(s: GameState) { return MAIN_GATE_LEVELS[s.structures.mainGateLevel]!; }
function getCampaign(s: GameState) { return CAMPAIGNS[s.campaignIndex] || CAMPAIGNS[CAMPAIGNS.length - 1]; }
function findZoneById(id: string) { return ZONES.find(z => z.id === id) || ZONES[0]; }

function baseHctgValue(s: GameState) { return HCTG_SCALE[s.upgrades.hctg]; }
function hctgValue(s: GameState) { return Math.max(baseHctgValue(s), s.simulation.latticeDensity || 7); }

function networkSpan(s: GameState) {
  const gate = getGate(s);
  return gate.baseSpan + s.structures.relay * 46 + s.structures.seed * 92 + s.structures.solar * 70 + s.structures.harvester * 80 + s.upgrades.cweh * 34;
}

function currentEraIndex(s: GameState) {
  const span = networkSpan(s); const lattice = hctgValue(s);
  let era = 0;
  for (let i = 0; i < ERA_DEFS.length; i++) {
    if (span >= ERA_DEFS[i].rangeRequirement && lattice >= ERA_DEFS[i].hctgRequirement) era = i;
  }
  return era;
}

function allRelics() {
  return CAMPAIGNS.map(c => ({ ...c.relic, campaignId: c.id, campaignNumber: c.number, generation: c.generation }));
}

function unlockedRelics(s: GameState) {
  const ids = new Set(s.unlockedRelicIds);
  return allRelics().filter(r => ids.has(r.id));
}

function computeLegacyBonuses(s: GameState) {
  return unlockedRelics(s).reduce((acc, r) => {
    Object.entries(r.bonuses || {}).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
    return acc;
  }, {} as Record<string, number>);
}

function bandedConsistency(signal: number) {
  return clamp(CONSISTENCY_BAND_MIN + signal * (CONSISTENCY_BAND_HALF_WIDTH * 2), CONSISTENCY_BAND_MIN, CONSISTENCY_BAND_MAX);
}

function consistencyBandOverflow(value: number) {
  return Math.max(Math.abs(value - CONSISTENCY_BAND_CENTER) - CONSISTENCY_BAND_HALF_WIDTH, 0);
}

interface Metrics {
  zone: Zone; ship: Ship; gate: GateLevel; span: number;
  phi: number; psi: number; entropy: number; consistency: number;
  branchProbability: number; quantumPeak: number; relayHarmony: number;
  spanCoverage: number; verdict: string; reason: string;
  hullIntegrity: number; thermalLoad: number; eRms: number;
  legacyBonuses: Record<string, number>;
  situation: GameState["currentSituation"];
}

function computeMetrics(s: GameState): Metrics {
  const ship = getShip(s); const zone = getZone(s); const gate = getGate(s);
  const lb = computeLegacyBonuses(s);
  const sit = s.currentSituation && s.currentSituation.campaignId === getCampaign(s).id ? s.currentSituation : null;
  const sm = sit ? sit.modifiers : {};
  const span = networkSpan(s);
  const sim = s.simulation;
  const hctgR = (hctgValue(s) - 7.0) / 13.0;
  const hullI = clamp(sim.hullIntegrity, 0.2, 1);
  const thermalL = clamp((sim.coreTemperature - 280) / 120, 0, 1);
  const pi = s.controls.phase / 100; const ci = s.controls.curvature / 100;
  const cli = s.controls.coolant / 100; const ri = s.controls.relaySync / 100;
  const rH = clamp(0.14 + s.structures.relay * 0.025 + s.structures.seed * 0.045 + ri * 0.18 + (lb.relayHarmony || 0) + (sm.relayHarmony || 0), 0, 0.95);
  const sC = clamp((span * ship.rangeBias) / zone.requiredSpan, 0, 1.8);
  const cP = clamp(1 - sC, 0, 1);
  const gCN = s.gateCharge / 100;
  const fB = s.focusPulse ? 0.08 : 0.0;
  const tS = s.upgrades.sondol * 0.032 + s.structures.solar * 0.015 + (lb.thermalSupport || 0);
  const sP = clamp((s.shipStress / 100) + (sm.stress || 0) - (lb.stressReduction || 0), 0, 0.72);
  const eRms = clamp(clamp(0.0038 + zone.risk * 0.006 + (1 - rH) * 0.0038 + sP * 0.0046 + thermalL * 0.0024 - s.upgrades.dpad * 0.0012 - (lb.ermsReduction || 0), 0.001, 0.025) + (sm.eRms || 0), 0.001, 0.03);
  const entropy = clamp(0.26 + zone.risk * 0.4 + cP * 0.24 + (1 - cli) * 0.2 + thermalL * 0.12 - tS - s.upgrades.cweh * 0.018 - gCN * 0.08 + (sm.entropy || 0), 0.06, 0.98);
  const phi = clamp(0.24 + ship.hull * 0.36 + hctgR * 0.24 + gate.stability * 0.16 + s.upgrades.dpad * 0.034 + s.upgrades.warp_shield * 0.05 + (hullI - 0.7) * 0.24 + (lb.phi || 0) + (sm.phi || 0) - zone.risk * 0.2 - sP * 0.22 - entropy * 0.14 - eRms * 1.3, 0, 1);
  const psi = clamp(0.18 + ci * 0.28 + pi * 0.16 + rH * 0.18 + gate.stability * 0.22 + gCN * 0.12 + s.upgrades.qlaunch * 0.04 + fB + (lb.psi || 0) + (sm.psi || 0) - cP * 0.16, 0, 1);
  const pLE = Math.abs(pi - CONSISTENCY_TARGET);
  const qP = clamp(0.36 + ship.quantum * 0.24 + s.upgrades.qlaunch * 0.06 + gCN * 0.08, 0, 1);
  const cSig = clamp(0.18 * phi + 0.22 * psi + 0.18 * rH + 0.16 * qP + 0.14 * (1 - pLE * 1.9) + 0.12 * (1 - entropy) + (lb.consistency || 0) + (sm.consistencySignal || 0), 0, 1);
  const consistency = bandedConsistency(cSig);
  const branchP = clamp(0.14 + phi * 0.2 + psi * 0.21 + ship.sensor * 0.17 + rH * 0.12 + qP * 0.1 + sC * 0.08 + hullI * 0.05 + (lb.branchProbability || 0) + (sm.branchProbability || 0) - zone.risk * 0.18 - consistencyBandOverflow(consistency) * 1.2, 0.01, 0.99);

  let verdict = "DENY"; let reason = "범위 또는 위상 조건이 운용 최소값 미만입니다.";
  if (span < zone.requiredSpan) { reason = "네트워크 범위가 이 항로를 물리적으로 지탱할 수 없습니다."; }
  else if (s.structures.mainGateLevel < zone.gateTierRequired) { reason = "메인 게이트 등급이 이 회랑에 충분하지 않습니다."; }
  else if (phi >= zone.minPhi && psi >= zone.minPsi && consistency >= CONSISTENCY_TARGET) { verdict = "ALLOW"; reason = "챔버 잠금 달성. 회랑이 점프를 실행할 만큼 안정적입니다."; }
  else if (consistency >= CONSISTENCY_TARGET - 0.06 && phi >= zone.minPhi - 0.06 && psi >= zone.minPsi - 0.06) { verdict = "HOLD"; reason = "챔버가 거의 안정적이지만 더 깨끗한 위상 잠금을 기다리고 있습니다."; }

  return { zone, ship, gate, span, phi, psi, entropy, consistency, branchProbability: branchP, quantumPeak: qP, relayHarmony: rH, spanCoverage: sC, verdict, reason, hullIntegrity: hullI, thermalLoad: thermalL, eRms, legacyBonuses: lb, situation: sit };
}

function passiveIncome(s: GameState) {
  return { energy: 22 + s.structures.solar * 28 + s.upgrades.cweh * 6, hydrogen: s.structures.harvester * 3, materials: 8 + s.structures.seed * 2 };
}

function actionCost(s: GameState, type: string) {
  const m = computeMetrics(s);
  if (type === "jump") return { energy: Math.round(m.zone.requiredSpan * 0.06 + s.structures.mainGateLevel * 14 + m.ship.rangeBias * 18), materials: Math.round(m.zone.risk * 18 + m.ship.hull * 10), hydrogen: Math.round(m.zone.requiredSpan * 0.005 + s.structures.mainGateLevel * 2) };
  return { energy: 0, materials: 0, hydrogen: 0 };
}

function canAfford(s: GameState, cost: { energy?: number; materials?: number; hydrogen?: number }) {
  return s.resources.energy >= (cost.energy || 0) && s.resources.materials >= (cost.materials || 0) && s.resources.hydrogen >= (cost.hydrogen || 0);
}

function structureCost(s: GameState, kind: string) {
  if (kind === "mainGate") { const n = s.structures.mainGateLevel + 1; return { energy: 56 + n * 28, materials: 70 + n * 34, hydrogen: 10 + n * 3 }; }
  if (kind === "relay") return { energy: 18 + s.structures.relay * 4, materials: 24 + s.structures.relay * 6, hydrogen: 0 };
  if (kind === "seed") return { energy: 34 + s.structures.seed * 6, materials: 38 + s.structures.seed * 8, hydrogen: 6 };
  if (kind === "solar") return { energy: 10, materials: 30 + s.structures.solar * 10, hydrogen: 0 };
  if (kind === "harvester") return { energy: 16, materials: 24 + s.structures.harvester * 9, hydrogen: 0 };
  return { energy: 0, materials: 0, hydrogen: 0 };
}

function upgradeCost(s: GameState, def: UpgradeDef) {
  const lv = s.upgrades[def.id];
  return { energy: 18 + lv * 16 + (def.id === "hctg" ? 10 : 0), materials: 20 + lv * 18 + (def.id === "hctg" ? 16 : 0), hydrogen: def.id === "qlaunch" || def.id === "cweh" ? 3 + lv : 0 };
}

function situationMetricLabel(key: string) {
  return ({ phi: "phi", psi: "psi", entropy: "엔트로피", eRms: "E_rms", branchProbability: "분기", relayHarmony: "중계", consistencySignal: "일관성", holdScale: "홀드", simScale: "시뮬 스택" } as Record<string, string>)[key] || key;
}

function formatSituationEffect(key: string, value: number) {
  const label = situationMetricLabel(key);
  if (key === "holdScale" || key === "simScale") { const p = Math.round(value * 100); return `${label} ${p >= 0 ? "+" : ""}${p}%`; }
  return `${label} ${value >= 0 ? "+" : ""}${fixed(value, 3)}`;
}

function buildSituationInstance(campaign: Campaign, def: SituationDef, reason: string) {
  const severity = clamp(0.88 + campaign.number * 0.03 + Math.random() * 0.18, 0.9, 1.42);
  const sm: Record<string, number> = {};
  for (const k of Object.keys(def.modifiers)) {
    sm[k] = Number(fixed(def.modifiers[k] * severity, k === "holdScale" || k === "simScale" ? 3 : 4));
  }
  const ets = Object.keys(sm).filter(k => Math.abs(sm[k]) > 0).map(k => formatSituationEffect(k, sm[k]));
  return { campaignId: campaign.id, id: def.id, title: def.title, tone: def.tone || "unstable", summary: def.summary, modifiers: sm, effectTexts: ets, reason: reason || "stack-refresh", rolledAt: Date.now(), severity: Number(fixed(severity, 3)) };
}

function buildCampaignChecks(s: GameState, campaign: Campaign, metrics: Metrics) {
  const req = campaign.requirements || {};
  const checks: { label: string; current: string; target: string; met: boolean; hard: boolean }[] = [];
  const add = (l: string, c: string | number, t: string | number, m: boolean, h = false) => checks.push({ label: l, current: String(c), target: String(t), met: m, hard: h });

  if (campaign.zoneId) { const tz = findZoneById(campaign.zoneId); add("항로", metrics.zone.name, tz.name, metrics.zone.id === campaign.zoneId, true); }
  if (req.requiredGateLevel) add("메인 게이트", `Gate ${s.structures.mainGateLevel}`, `Gate ${req.requiredGateLevel}`, s.structures.mainGateLevel >= req.requiredGateLevel, true);
  if (req.minPhi) add("phi", fixed(metrics.phi, 3), fixed(req.minPhi, 3), metrics.phi >= req.minPhi);
  if (req.minPsi) add("psi", fixed(metrics.psi, 3), fixed(req.minPsi, 3), metrics.psi >= req.minPsi);
  if (req.maxEntropy) add("엔트로피", fixed(metrics.entropy, 3), `<= ${fixed(req.maxEntropy, 3)}`, metrics.entropy <= req.maxEntropy);
  if (req.minConsistency) add("일관성", fixed(metrics.consistency, 3), fixed(req.minConsistency, 3), metrics.consistency >= req.minConsistency);
  if (req.minBranchProbability) add("분기", fixed(metrics.branchProbability, 3), fixed(req.minBranchProbability, 3), metrics.branchProbability >= req.minBranchProbability);
  if (req.maxStress) add("스트레스", String(Math.round(s.shipStress)), `<= ${req.maxStress}`, s.shipStress <= req.maxStress);
  if (req.minGateCharge || req.minMainGateCharge) { const tc = req.minMainGateCharge || req.minGateCharge || 0; add("게이트 충전", `${Math.round(s.gateCharge)}%`, `${tc}%`, s.gateCharge >= tc); }
  if (req.minEnergy) add("에너지", String(Math.round(s.resources.energy)), String(req.minEnergy), s.resources.energy >= req.minEnergy);
  if (req.minIntel) add("정보", String(Math.round(s.resources.intel)), String(req.minIntel), s.resources.intel >= req.minIntel);
  if (req.minRelay) add("중계 게이트", String(s.structures.relay), String(req.minRelay), s.structures.relay >= req.minRelay);
  if (req.minSeed) add("게이트 시드", String(s.structures.seed), String(req.minSeed), s.structures.seed >= req.minSeed);
  if (req.minSolar) add("태양 집광기", String(s.structures.solar), String(req.minSolar), s.structures.solar >= req.minSolar);
  if (req.minHarvester) add("수소 수확기", String(s.structures.harvester), String(req.minHarvester), s.structures.harvester >= req.minHarvester);
  if (req.minHctg) add("격자 밀도", `n=${fixed(hctgValue(s), 1)}`, `n=${fixed(req.minHctg, 1)}`, hctgValue(s) >= req.minHctg);
  if (req.minUpgrade_sondol) add("S-Ondol", `L${s.upgrades.sondol}`, `L${req.minUpgrade_sondol}`, s.upgrades.sondol >= req.minUpgrade_sondol);
  if (req.minUpgrade_deep_core) add("Deep Core", `L${s.upgrades.deep_core}`, `L${req.minUpgrade_deep_core}`, s.upgrades.deep_core >= req.minUpgrade_deep_core);
  return checks;
}

// IDENTITY_SEAL: PART-4 | role=pure-computation | inputs=GameState | outputs=Metrics,checks,costs

// ============================================================
// PART 5 — Styled UI Components
// ============================================================

const panelCls = "border border-border rounded-2xl bg-bg-secondary/80 backdrop-blur-sm p-4 shadow-lg";
const cardCls = "border border-white/[0.06] rounded-2xl bg-white/[0.03] p-3.5";
const btnCls = "rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-text-primary cursor-pointer transition-all hover:border-accent-blue/40 hover:bg-accent-blue/10 hover:-translate-y-px disabled:opacity-45 disabled:cursor-not-allowed disabled:transform-none font-mono";
const btnPrimary = `${btnCls} !bg-gradient-to-b from-accent-blue/25 to-accent-blue/15 !border-accent-blue/40`;
const btnAlt = `${btnCls} !bg-gradient-to-b from-accent-amber/15 to-accent-amber/8 !border-accent-amber/35`;
const btnDanger = `${btnCls} !border-red-400/30 !bg-red-400/10`;
const pillCls = "inline-flex items-center rounded-full border border-border px-3 py-1.5 bg-accent-blue/10 text-accent-blue text-sm font-mono";
const kickerCls = "text-accent-blue text-sm tracking-[0.18em] uppercase font-mono";
const mutedCls = "text-text-tertiary text-sm";

function ResourceStrip({ s, metrics, en }: { s: GameState; metrics: Metrics; en: boolean }) {
  const era = ERA_DEFS[currentEraIndex(s)];
  const items = [
    [en ? "Year" : "연도", String(s.year)],
    [en ? "Era" : "시대", en ? era.titleEn : era.title],
    [en ? "Energy" : "에너지", String(Math.round(s.resources.energy))],
    [en ? "Materials" : "자재", String(Math.round(s.resources.materials))],
    [en ? "Hydrogen" : "수소", String(Math.round(s.resources.hydrogen))],
    [en ? "Intel" : "정보", String(Math.round(s.resources.intel))],
    [en ? "Network Span" : "네트워크 범위", String(Math.round(metrics.span))],
    [en ? "Ship Stress" : "함선 스트레스", String(Math.round(s.shipStress))],
  ];
  return (
    <div className={`${panelCls} grid grid-cols-4 md:grid-cols-8 gap-3 mt-4`}>
      {items.map(([label, val]) => (
        <div key={label} className={cardCls}>
          <span className={kickerCls + " !text-xs"}>{label}</span>
          <strong className="block mt-1.5 text-lg text-text-primary">{val}</strong>
        </div>
      ))}
    </div>
  );
}

function ShipPanel({ s, en, onSelect }: { s: GameState; en: boolean; onSelect: (id: string) => void }) {
  return (
    <section className={panelCls}>
      <div className={kickerCls}>{en ? "Fleet Layer" : "함대 레이어"}</div>
      <h2 className="text-lg font-bold mt-1 mb-4 text-text-primary">{en ? "Ship Hangar" : "함선 격납고"}</h2>
      <div className="grid gap-3">
        {SHIPS.map(ship => (
          <article key={ship.id} className={`${cardCls} ${ship.id === s.selectedShipId ? "!border-accent-blue/40 !bg-accent-blue/10" : ""}`}>
            <div className="flex justify-between items-start gap-2">
              <div><h3 className="font-bold text-text-primary">{ship.name}</h3><p className={mutedCls}>{en ? ship.descriptionEn : ship.description}</p></div>
              <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-text-tertiary uppercase tracking-wider whitespace-nowrap">{en ? ship.tagEn : ship.tag}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[[en ? "Crew" : "승무원", ship.crew], [en ? "Hull" : "선체", fixed(ship.hull, 2)], [en ? "Quantum" : "양자", fixed(ship.quantum, 2)], [en ? "Range" : "사거리", `${fixed(ship.rangeBias, 2)}x`]].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl bg-white/[0.04] p-2"><span className="block text-xs text-text-tertiary">{l}</span><strong className="block mt-0.5 text-sm text-text-primary">{v}</strong></div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className={mutedCls}>{en ? "Sensor" : "센서"} {fixed(ship.sensor, 2)} {'// '}{en ? "Stress Guard" : "스트레스 방어"} {fixed(ship.stressGuard, 2)}</span>
              <button className={btnCls} onClick={() => onSelect(ship.id)}>{en ? "Deploy" : "배치"}</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function StructurePanel({ s, en, onBuild }: { s: GameState; en: boolean; onBuild: (action: string) => void }) {
  const gate = getGate(s);
  const cards = [
    { title: `${gate.name} // ${en ? "Main Gate" : "메인 게이트"}`, copy: en ? `${gate.diameter} chamber. ${gate.loreEn}` : `${gate.diameter} 챔버. ${gate.lore}`, stats: `${en ? "Base span" : "기본 범위"} ${gate.baseSpan} // ${en ? "Stability" : "안정성"} ${fixed(gate.stability, 2)}`, action: "upgrade-main-gate", disabled: s.structures.mainGateLevel >= 5, cost: structureCost(s, "mainGate") },
    { title: `${en ? "Relay Gate" : "중계 게이트"} x${s.structures.relay}`, copy: en ? "Short-range stepping stones preventing ships from tearing apart in long corridors." : "긴 회랑에서 함선이 찢어지는 것을 막아주는 단거리 디딤돌.", stats: en ? "Each relay adds +46 span." : "각 중계기는 범위 +46을 추가한다.", action: "build-relay", disabled: false, cost: structureCost(s, "relay") },
    { title: `${en ? "Gate Seed" : "게이트 시드"} x${s.structures.seed}`, copy: en ? "Autonomous seed rings that leap ahead and grow the next corridor node." : "앞서 도약하여 다음 회랑 노드를 성장시키는 자율 시드 링.", stats: en ? "Each seed adds +92 span." : "각 시드는 범위 +92를 제공한다.", action: "launch-seed", disabled: s.structures.mainGateLevel < 2, cost: structureCost(s, "seed") },
    { title: `${en ? "Solar Concentrator" : "태양 집광기"} x${s.structures.solar}`, copy: en ? "Reflector swarms that pour amplified sunlight into the local gate stack." : "증폭된 태양광을 로컬 게이트 스택에 쏟아붓는 반사경 군집.", stats: en ? "Passive energy per major action." : "주요 행동마다 패시브 에너지 획득.", action: "build-solar", disabled: s.structures.solar >= 4, cost: structureCost(s, "solar") },
    { title: `${en ? "Hydrogen Harvester" : "수소 수확기"} x${s.structures.harvester}`, copy: en ? "Deep-space funnels scraping trace hydrogen into usable fuel." : "미량 수소를 사용 가능한 연료로 긁어모으는 심우주 깔때기.", stats: en ? "Passive hydrogen gain." : "패시브 수소 획득.", action: "build-harvester", disabled: s.structures.harvester >= 4, cost: structureCost(s, "harvester") },
  ];
  return (
    <section className={panelCls}>
      <div className={kickerCls}>{en ? "Infrastructure" : "인프라"}</div>
      <h2 className="text-lg font-bold mt-1 mb-4 text-text-primary">{en ? "Build Queue" : "건설 대기열"}</h2>
      <div className="grid gap-3">
        {cards.map(c => (
          <article key={c.action} className={cardCls}>
            <h4 className="font-bold text-sm text-text-primary">{c.title}</h4>
            <p className={`${mutedCls} mt-1`}>{c.copy}</p>
            <div className="flex justify-between items-center mt-3">
              <span className={mutedCls}>{c.stats}<br />E {c.cost.energy} / M {c.cost.materials} / H {c.cost.hydrogen}</span>
              <button className={btnCls} disabled={c.disabled} onClick={() => onBuild(c.action)}>{en ? "Build" : "실행"}</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function UpgradePanel({ s, en, onUpgrade }: { s: GameState; en: boolean; onUpgrade: (id: string) => void }) {
  return (
    <section className={panelCls}>
      <div className={kickerCls}>{en ? "Core Tech" : "핵심 기술"}</div>
      <h2 className="text-lg font-bold mt-1 mb-4 text-text-primary">{en ? "Upgrade Deck" : "업그레이드 데크"}</h2>
      <div className="grid gap-3">
        {UPGRADE_DEFS.map(def => {
          const lv = s.upgrades[def.id]; const cost = upgradeCost(s, def);
          const sp = def.id === "hctg" ? `n=${fixed(hctgValue(s), 1)}` : `L${lv}/${def.maxLevel}`;
          return (
            <article key={def.id} className={cardCls}>
              <div className="flex justify-between items-start gap-2">
                <div><h4 className="font-bold text-sm text-text-primary">{en ? def.nameEn : def.name}</h4><p className={`${mutedCls} mt-1`}>{en ? def.effectEn : def.effect}</p></div>
                <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-text-tertiary whitespace-nowrap">{sp}</span>
              </div>
              <div className="flex justify-between items-center mt-3">
                <span className={mutedCls}>E {cost.energy} / M {cost.materials} / H {cost.hydrogen}</span>
                <button className={btnCls} disabled={lv >= def.maxLevel} onClick={() => onUpgrade(def.id)}>{en ? "Upgrade" : "업그레이드"}</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// IDENTITY_SEAL: PART-5 | role=sidebar-UI | inputs=GameState,callbacks | outputs=JSX

// ============================================================
// PART 6 — Main Column UI (Campaign, Terminal, Gate Chamber, etc.)
// ============================================================

function CampaignPanel({ s, metrics, en, onEvaluate, onSkipHold, onTutorial, onSelectDoc }: {
  s: GameState; metrics: Metrics; en: boolean;
  onEvaluate: () => void; onSkipHold: () => void; onTutorial: () => void;
  onSelectDoc: (id: string) => void;
}) {
  const campaign = getCampaign(s);
  const checks = buildCampaignChecks(s, campaign, metrics);
  const tutorialAvailable = campaign.id === "campaign_01";
  const sit = s.currentSituation && s.currentSituation.campaignId === campaign.id ? s.currentSituation : null;
  const docs = campaign.documents;
  const relics = unlockedRelics(s);
  const selDoc = docs.find(d => d.id === s.selectedDocumentId) || relics.find(r => r.id === s.selectedDocumentId) || docs[0] || null;

  return (
    <section className={panelCls}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className={kickerCls}>{en ? "Campaign Layer" : "캠페인 레이어"}</div>
          <h2 className="text-lg font-bold mt-1 text-text-primary">{en ? "SJC Protocol Console" : "SJC 프로토콜 콘솔"}</h2>
        </div>
        <span className={pillCls}>{en ? "Campaign" : "캠페인"} {campaign.number} / {CAMPAIGNS.length} {'// '}{campaign.yearLabel}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Campaign Brief */}
        <div className={`${cardCls} grid gap-3`}>
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className={kickerCls + " !text-xs"}>{campaign.generation} {'// '}{campaign.sjcVersion}</div>
              <h3 className="text-lg font-bold text-text-primary mt-1">{campaign.title}</h3>
            </div>
            <span className={pillCls + " !text-xs"}>{campaign.lead}</span>
          </div>
          <p className={mutedCls}>{campaign.summary}</p>

          {tutorialAvailable && (
            <div className={`rounded-2xl p-3.5 border ${s.tutorial.completed ? "border-green-400/25 bg-green-400/10" : "border-amber-400/25 bg-amber-400/10"}`}>
              <strong className="block text-sm text-text-primary mb-1">0.51 {en ? "Onboarding" : "온보딩"}</strong>
              <p className={mutedCls}>{en ? "Run the three-step phi tutorial to feel how 0.01 separates DENY, ALLOW, and HOLD." : "3단계 phi 튜토리얼을 실행하여 0.01이 DENY, ALLOW, HOLD를 어떻게 나누는지 체험하라."}</p>
            </div>
          )}

          {sit && (
            <div className={`rounded-2xl p-3.5 border grid gap-2 ${sit.tone === "support" ? "border-green-400/25 bg-green-400/10" : sit.tone === "danger" ? "border-red-400/25 bg-red-400/10" : "border-accent-blue/20 bg-accent-blue/10"}`}>
              <div className="flex justify-between items-start gap-2">
                <strong className="text-sm text-text-primary">{en ? "Situation //" : "상황 //"} {sit.title}</strong>
                <span className={mutedCls + " !text-xs uppercase"}>{sit.reason === "campaign-advance" ? (en ? "new stack" : "새 스택") : (en ? "active stack" : "활성 스택")}</span>
              </div>
              <p className={mutedCls}>{sit.summary}</p>
              <div className="flex flex-wrap gap-1.5">{sit.effectTexts.map((e, i) => <span key={i} className="rounded-full bg-white/[0.06] border border-white/[0.07] px-2.5 py-1 text-xs text-text-primary">{e}</span>)}</div>
            </div>
          )}

          <div className="grid gap-2">
            <div className={cardCls}><span className={mutedCls}>{en ? "Objective" : "목표"}</span><strong className="block mt-1 text-sm text-text-primary">{campaign.objective}</strong></div>
            <div className={cardCls}><span className={mutedCls}>{en ? "Linked Route" : "연결 항로"}</span><strong className="block mt-1 text-sm text-text-primary">{findZoneById(campaign.zoneId).name}</strong></div>
            <div className={cardCls}><span className={mutedCls}>{en ? "Expected HOLD" : "예상 HOLD"}</span><strong className="block mt-1 text-sm text-text-primary">{campaign.holdSeconds} s</strong></div>
          </div>

          <div className="grid gap-2">
            {checks.map((ch, i) => (
              <div key={i} className={`${cardCls} ${ch.met ? "!border-green-400/30" : "!border-amber-400/25"}`}>
                <span className={mutedCls}>{ch.label}</span>
                <strong className="block mt-1 text-sm text-text-primary">{ch.current} / {ch.target}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Terminal */}
        <div className={`${cardCls} grid gap-3`}>
          <div className="flex justify-between items-start">
            <div>
              <div className={kickerCls + " !text-xs"}>SJC {en ? "Terminal" : "터미널"}</div>
              <h3 className="text-lg font-bold text-text-primary mt-1">{en ? "Evaluation Stack" : "평가 스택"}</h3>
            </div>
            <span className={`${pillCls} ${s.terminal.mode === "ALLOW" ? "!border-green-400/40 !bg-green-400/15 !text-green-300" : s.terminal.mode === "DENY" ? "!border-red-400/40 !bg-red-400/15 !text-red-300" : ""}`}>{s.terminal.mode}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className={cardCls}><span className={mutedCls + " !text-xs"}>{en ? "Simulations" : "시뮬레이션"}</span><strong className="block mt-1 text-sm text-text-primary">{(s.terminal.simCount || 0).toLocaleString()}</strong></div>
            <div className={cardCls}><span className={mutedCls + " !text-xs"}>{en ? "Hold Timer" : "홀드 타이머"}</span><strong className="block mt-1 text-sm text-text-primary">{fixed(s.terminal.holdTimeRemaining || 0, 1)} s</strong></div>
            <div className={cardCls}><span className={mutedCls + " !text-xs"}>{en ? "Campaign" : "캠페인"}</span><strong className="block mt-1 text-sm text-text-primary">{campaign.title}</strong></div>
          </div>
          <pre className={`min-h-[200px] p-4 rounded-2xl border text-sm leading-relaxed whitespace-pre-wrap overflow-auto font-mono text-sky-100 ${s.terminal.mode === "ALLOW" ? "border-green-400/35 shadow-[inset_0_0_0_1px_rgba(134,240,183,0.08)]" : s.terminal.mode === "DENY" ? "border-red-400/35 shadow-[inset_0_0_0_1px_rgba(255,141,125,0.08)]" : "border-amber-400/25"} bg-gradient-to-b from-[rgba(0,8,14,0.94)] to-[rgba(4,10,21,0.96)]`}>
            {s.terminal.lines.join("\n") || `> ${en ? "Awaiting evaluation for" : "평가 대기 중:"} ${campaign.title}.`}
          </pre>
          <div className="flex gap-2 flex-wrap">
            {tutorialAvailable && <button className={btnAlt} disabled={s.terminal.mode === "EVALUATE" || s.terminal.mode === "HOLD"} onClick={onTutorial}>{s.tutorial.completed ? (en ? "Rerun 0.51 Tutorial" : "0.51 튜토리얼 재실행") : (en ? "Run 0.51 Tutorial" : "0.51 튜토리얼 실행")}</button>}
            <button className={btnPrimary} disabled={s.terminal.mode === "EVALUATE" || s.terminal.mode === "HOLD"} onClick={onEvaluate}>{en ? "Evaluate" : "평가"}</button>
            <button className={btnAlt} disabled={s.terminal.mode !== "HOLD"} onClick={onSkipHold}>{en ? "Skip Hold" : "홀드 건너뛰기"}</button>
          </div>
        </div>
      </div>

      {/* Archive / Document / Legacy row */}
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className={cardCls}>
          <div className="flex justify-between items-start mb-3"><strong className="text-sm text-text-primary">{en ? "Document Archive" : "문서 아카이브"}</strong><span className={mutedCls + " !text-xs"}>{en ? "Campaign docs & reports" : "캠페인 문서 및 보고서"}</span></div>
          <div className="grid gap-2 max-h-[300px] overflow-auto">
            {docs.map(d => (
              <div key={d.id} className={`${cardCls} cursor-pointer ${s.selectedDocumentId === d.id ? "!border-accent-blue/40 !bg-accent-blue/10" : ""}`} onClick={() => onSelectDoc(d.id)}>
                <span className={mutedCls + " !text-xs"}>{d.type}</span>
                <strong className="block mt-0.5 text-sm text-text-primary">{d.title}</strong>
                <span className={mutedCls + " !text-xs"}>{d.author}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={cardCls}>
          <div className="flex justify-between items-start mb-3"><strong className="text-sm text-text-primary">{en ? "Document Viewer" : "문서 뷰어"}</strong></div>
          {selDoc ? (
            <div className={`rounded-2xl p-4 min-h-[300px] ${selDoc.tone === "dark" ? "bg-gradient-to-b from-[rgba(15,21,34,0.96)] to-[rgba(9,14,25,0.95)] text-sky-100" : "bg-gradient-to-b from-[rgba(234,232,221,0.95)] to-[rgba(216,210,190,0.92)] text-gray-900"}`}>
              <h4 className="font-bold text-lg">{selDoc.title}</h4>
              <div className="flex flex-wrap gap-2 mt-2 mb-3">
                <span className={`rounded-full px-2.5 py-1 text-xs ${selDoc.tone === "dark" ? "bg-white/[0.08]" : "bg-black/[0.08]"}`}>{selDoc.author}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs ${selDoc.tone === "dark" ? "bg-white/[0.08]" : "bg-black/[0.08]"}`}>{selDoc.type}</span>
                {"effectText" in selDoc && selDoc.effectText && <span className={`rounded-full px-2.5 py-1 text-xs ${selDoc.tone === "dark" ? "bg-white/[0.08]" : "bg-black/[0.08]"}`}>{selDoc.effectText}</span>}
              </div>
              <div className="grid gap-3 text-sm leading-relaxed">
                {"summary" in selDoc && <p>{(selDoc as {summary?: string}).summary}</p>}
                {selDoc.quote && <div className={`border-l-2 pl-3 italic ${selDoc.tone === "dark" ? "border-white/25" : "border-black/25"}`}>{selDoc.quote}</div>}
                {selDoc.body.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          ) : <p className={mutedCls}>{en ? "Select a document to view." : "문서를 선택하여 열람하세요."}</p>}
        </div>
        <div className={cardCls}>
          <div className="flex justify-between items-start mb-3"><strong className="text-sm text-text-primary">{en ? "Legacy Inheritance" : "세대 계승"}</strong><span className={mutedCls + " !text-xs"}>{en ? "Inherited tools & relic effects" : "계승된 도구와 유물 효과"}</span></div>
          <div className="grid gap-2 max-h-[300px] overflow-auto">
            {relics.length ? relics.map(r => (
              <div key={r.id} className={`${cardCls} cursor-pointer ${s.selectedDocumentId === r.id ? "!border-accent-blue/40 !bg-accent-blue/10" : ""}`} onClick={() => onSelectDoc(r.id)}>
                <span className={mutedCls + " !text-xs"}>{r.generation}</span>
                <strong className="block mt-0.5 text-sm text-text-primary">{r.title}</strong>
                <span className={mutedCls + " !text-xs"}>{r.effectText}</span>
              </div>
            )) : <div className={cardCls}><span className={mutedCls}>{en ? "No relay inheritance yet" : "아직 계승된 유물 없음"}</span><strong className="block mt-1 text-sm text-text-primary">{en ? "Complete campaigns to inherit relics." : "캠페인을 완료하여 유물을 계승하라."}</strong></div>}
          </div>
        </div>
      </div>
    </section>
  );
}

function ZoneMapPanel({ s, metrics, en, onSelectZone }: { s: GameState; metrics: Metrics; en: boolean; onSelectZone: (id: string) => void }) {
  const zone = metrics.zone;
  const accessState = s.structures.mainGateLevel < zone.gateTierRequired ? (en ? "Gate tier insufficient" : "메인 게이트 등급 부족") : metrics.span < zone.requiredSpan ? (en ? "Network span insufficient" : "네트워크 범위 부족") : (en ? "Route physically accessible" : "항로 물리적 접근 가능");
  return (
    <section className={panelCls}>
      <div className="flex justify-between items-start mb-4">
        <div><div className={kickerCls}>{en ? "Route Layer" : "항로 레이어"}</div><h2 className="text-lg font-bold mt-1 text-text-primary">{en ? "Galactic Sector Map" : "은하 구역 지도"}</h2></div>
        <span className={pillCls}>{zone.name} {'// '}{zone.distanceText}</span>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="relative min-h-[320px] rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[rgba(0,8,14,0.6)] to-[rgba(4,10,21,0.8)] overflow-hidden">
          {ZONES.map(z => {
            const sel = z.id === s.selectedZoneId; const comp = s.completedZones.includes(z.id);
            const lock = networkSpan(s) < z.requiredSpan * 0.82 && !s.completedZones.includes(z.id);
            return (
              <button key={z.id} className={`absolute rounded-xl p-2 border text-left transition-all ${sel ? "border-accent-blue/50 bg-accent-blue/20 z-10" : comp ? "border-green-400/30 bg-green-400/10" : lock ? "border-white/[0.04] bg-white/[0.02] opacity-40" : "border-white/[0.08] bg-white/[0.05]"} hover:border-accent-blue/40`}
                style={{ left: `${z.x}%`, top: `${z.y}%`, transform: "translate(-50%, -50%)" }}
                onClick={() => onSelectZone(z.id)}>
                <strong className="block text-xs text-text-primary">{z.name}</strong>
                <span className="text-xs text-text-tertiary">{z.distanceText}</span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-3">
          <div className={cardCls}><h3 className="font-bold text-text-primary">{zone.name}</h3><p className={mutedCls + " mt-1"}>{en ? zone.descriptionEn : zone.description}</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[[en ? "Subtitle" : "부제", en ? zone.subtitleEn : zone.subtitle], [en ? "Distance" : "거리", zone.distanceText], [en ? "Required Span" : "필요 범위", zone.requiredSpan], [en ? "Gate Tier" : "게이트 등급", zone.gateTierRequired], [en ? "Min phi" : "최소 phi", fixed(zone.minPhi, 2)], [en ? "Min psi" : "최소 psi", fixed(zone.minPsi, 2)], [en ? "Risk" : "위험도", `${Math.round(zone.risk * 100)}%`], [en ? "Status" : "상태", accessState]].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl bg-white/[0.04] p-2"><span className="block text-xs text-text-tertiary">{l}</span><strong className="block mt-0.5 text-sm text-text-primary">{v}</strong></div>
              ))}
            </div>
          </div>
          <div className={cardCls}><h3 className="font-bold text-text-primary">{en ? "Route Reward" : "항로 보상"}</h3>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[[en ? "Energy" : "에너지", `+${zone.reward.energy}`], [en ? "Materials" : "자재", `+${zone.reward.materials}`], [en ? "Hydrogen" : "수소", `+${zone.reward.hydrogen}`], [en ? "Intel" : "정보", `+${zone.reward.intel}`]].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl bg-white/[0.04] p-2"><span className="block text-xs text-text-tertiary">{l}</span><strong className="block mt-0.5 text-sm text-text-primary">{v}</strong></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function GateChamberPanel({ s, metrics, en, onCalibrate, onCharge, onFocus, onJump, onSlider }: {
  s: GameState; metrics: Metrics; en: boolean;
  onCalibrate: () => void; onCharge: () => void; onFocus: () => void; onJump: () => void;
  onSlider: (key: string, val: number) => void;
}) {
  const gate = metrics.gate; const jc = actionCost(s, "jump");
  const verdictColor = metrics.verdict === "ALLOW" ? "text-green-300 border-green-400/40" : metrics.verdict === "DENY" ? "text-red-300 border-red-400/40" : "text-amber-300 border-amber-400/40";
  const bars: [string, number, string][] = [
    [`phi // ${en ? "Hull Stability" : "선체 안정성"}`, metrics.phi, "bg-accent-blue"],
    [`psi // ${en ? "Gate Curvature" : "게이트 곡률"}`, metrics.psi, "bg-accent-blue"],
    [en ? "Entropy" : "엔트로피", metrics.entropy, "bg-red-400"],
    [en ? "Consistency" : "일관성", metrics.consistency, "bg-amber-400"],
    [en ? "Branch Probability" : "분기 확률", metrics.branchProbability, "bg-green-400"],
  ];

  return (
    <section className={panelCls}>
      <div className="flex justify-between items-start mb-4">
        <div><div className={kickerCls}>{en ? "Warp Layer" : "워프 레이어"}</div><h2 className="text-lg font-bold mt-1 text-text-primary">{en ? "Gate Chamber" : "게이트 챔버"}</h2></div>
        <span className={`${pillCls} ${verdictColor}`}>SJC // {metrics.verdict}</span>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {/* Controls */}
        <div className="grid gap-3">
          {[
            { label: en ? "Phase Lock" : "위상 고정", sub: en ? "phi alignment" : "phi 정렬", key: "phase", val: s.controls.phase },
            { label: en ? "Curvature Feed" : "곡률 공급", sub: en ? "psi injection" : "psi 주입", key: "curvature", val: s.controls.curvature },
            { label: en ? "Coolant / S-Ondol Bias" : "냉각 / S-Ondol 편향", sub: en ? "entropy emission" : "엔트로피 방출", key: "coolant", val: s.controls.coolant },
            { label: en ? "Relay Sync" : "중계 동기화", sub: en ? "network harmony" : "네트워크 조화", key: "relaySync", val: s.controls.relaySync },
          ].map(sl => (
            <div key={sl.key} className={cardCls}>
              <label className="text-sm font-bold text-text-primary">{sl.label}</label>
              <div className="flex justify-between items-center mt-1"><span className={mutedCls + " !text-xs"}>{sl.sub}</span><strong className="text-sm text-text-primary">{sl.val}</strong></div>
              <input type="range" min={0} max={100} value={sl.val} onChange={e => onSlider(sl.key, Number(e.target.value))} className="w-full mt-2 accent-sky-400" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <button className={btnCls} onClick={onCalibrate}>{en ? "Calibrate" : "챔버 보정"}</button>
            <button className={btnCls} onClick={onCharge}>{en ? "Charge Gate" : "게이트 충전"}</button>
            <button className={btnAlt} onClick={onFocus}>{en ? "Reverse Focus" : "역방향 집속"}</button>
            <button className={btnPrimary} onClick={onJump}>{en ? "Execute Jump" : "점프 실행"}</button>
          </div>
        </div>

        {/* Gate Display */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-48 h-48 rounded-full border-2 flex items-center justify-center" style={{ borderColor: gate.color, boxShadow: `inset 0 0 34px rgba(255,255,255,0.05), 0 0 42px ${gate.color}66` }}>
            <div className="text-center">
              <span className={kickerCls + " !text-xs"}>{gate.name}</span>
              <strong className="block text-2xl text-text-primary mt-1">{Math.round(s.gateCharge)}%</strong>
              <span className={mutedCls + " !text-xs"}>{en ? "Span" : "범위"} {Math.round(metrics.span)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full">
            {[[en ? "Focus Pulse" : "집속 펄스", s.focusPulse ? (en ? "charged" : "충전") : (en ? "offline" : "오프라인")], [en ? "Main Gate" : "메인 게이트", gate.name], [en ? "Relays" : "중계기", String(s.structures.relay)], [en ? "Seeds" : "게이트 시드", String(s.structures.seed)]].map(([l, v]) => (
              <div key={String(l)} className={cardCls}><span className={mutedCls + " !text-xs"}>{l}</span><strong className="block mt-0.5 text-sm text-text-primary">{v}</strong></div>
            ))}
          </div>
        </div>

        {/* Verdict Metrics */}
        <div className="grid gap-3">
          {bars.map(([label, val, color]) => (
            <div key={label}>
              <div className="flex justify-between items-center mb-1"><span className={mutedCls + " !text-xs"}>{label}</span><strong className="text-sm text-text-primary">{fixed(val, 3)}</strong></div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${val * 100}%` }} /></div>
            </div>
          ))}
          <div className="grid gap-1.5 mt-2">
            {[[en ? "Ship" : "함선", metrics.ship.name], ["HCTG", `n=${fixed(hctgValue(s), 1)}`], [en ? "Hull" : "선체", `${Math.round(metrics.hullIntegrity * 100)}%`], [en ? "Quantum" : "양자 피크", fixed(metrics.quantumPeak, 3)], [en ? "Relay Harmony" : "중계 조화", fixed(metrics.relayHarmony, 3)], [en ? "Jump Cost" : "점프 비용", `E${jc.energy}/M${jc.materials}/H${jc.hydrogen}`], [en ? "Reason" : "판정 사유", metrics.reason]].map(([l, v]) => (
              <div key={String(l)} className="flex justify-between items-center py-1 border-b border-white/[0.04]"><span className={mutedCls + " !text-xs"}>{l}</span><strong className="text-xs text-text-primary max-w-[60%] text-right">{v}</strong></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MissionArchivePanel({ s, en, onSave, onReset }: { s: GameState; en: boolean; onSave: () => void; onReset: () => void }) {
  const eraIdx = currentEraIndex(s);
  const res = s.latestResolution as Record<string, unknown> | null;
  return (
    <section className={panelCls}>
      <div className="flex justify-between items-start mb-4">
        <div><div className={kickerCls}>{en ? "Command Layer" : "지휘 레이어"}</div><h2 className="text-lg font-bold mt-1 text-text-primary">{en ? "Mission Archive" : "임무 아카이브"}</h2></div>
        <div className="flex gap-2">
          <button className={btnCls} onClick={onSave}>{en ? "Save" : "저장"}</button>
          <button className={btnDanger} onClick={onReset}>{en ? "Reset" : "초기화"}</button>
        </div>
      </div>
      {/* Era Track */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {ERA_DEFS.map((era, i) => (
          <div key={era.id} className={`${cardCls} flex-1 min-w-[120px] ${i < eraIdx ? "!border-green-400/25" : i === eraIdx ? "!border-accent-blue/40 !bg-accent-blue/10" : ""}`}>
            <strong className="block text-sm text-text-primary">{era.name}</strong>
            <span className={mutedCls + " !text-xs"}>{en ? era.titleEn : era.title}</span>
            <span className={mutedCls + " !text-xs block"}>Span {era.rangeRequirement}+ // HCTG {fixed(era.hctgRequirement, 1)}+</span>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className={cardCls}><h3 className="font-bold text-sm text-text-primary mb-3">{en ? "Jump Log" : "점프 기록"}</h3>
          <div className="grid gap-2 max-h-[350px] overflow-auto">
            {s.log.map((entry, i) => (
              <div key={i} className={`${cardCls} ${entry.kind === "allow" ? "!border-green-400/25" : entry.kind === "deny" ? "!border-red-400/25" : "!border-amber-400/20"}`}>
                <strong className="block text-xs text-text-primary">{entry.year} {'// '}{entry.title}</strong>
                <span className={mutedCls + " !text-xs"}>{entry.detail}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={cardCls}><h3 className="font-bold text-sm text-text-primary mb-3">{en ? "Latest Verdict" : "최신 판정 결과"}</h3>
          {res ? (
            <div>
              <div className={`rounded-2xl p-3 mb-3 ${String(res.verdict) === "ALLOW" ? "bg-green-400/15 border border-green-400/25" : String(res.verdict) === "DENY" ? "bg-red-400/15 border border-red-400/25" : "bg-amber-400/10 border border-amber-400/20"}`}>
                <strong className="text-sm text-text-primary">{String(res.verdict)}</strong>
                <p className={mutedCls + " mt-1 !text-xs"}>{String(res.detail || "")}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([["phi", res.phi], ["psi", res.psi], ["E_rms", res.eRms], [en ? "Entropy" : "엔트로피", res.entropy], [en ? "Consistency" : "일관성", res.consistency], [en ? "Branch" : "분기", res.branchProbability]] as [string, number][]).map(([l, v]) => (
                  <div key={l} className="flex justify-between py-0.5"><span className={mutedCls + " !text-xs"}>{l}</span><strong className="text-xs text-text-primary">{typeof v === "number" ? fixed(v, 3) : String(v ?? "-")}</strong></div>
                ))}
              </div>
              {s.finale.unlocked && (
                <div className="mt-4 rounded-2xl p-4 bg-gradient-to-b from-accent-blue/15 to-transparent border border-accent-blue/25">
                  <span className={kickerCls + " !text-xs"}>{en ? "Final Archive" : "최종 아카이브"}</span>
                  <strong className="block text-lg text-text-primary mt-1">{s.finale.title || (en ? "Sea of Stars" : "별의 바다")}</strong>
                  <p className={mutedCls + " mt-2"}>{s.finale.detail}</p>
                  <div className="flex gap-4 mt-3">
                    <div><span className={mutedCls + " !text-xs"}>{en ? "Unlocked" : "해금"}</span><strong className="block text-sm text-text-primary">{s.finale.yearUnlocked || s.year}</strong></div>
                    <div><span className={mutedCls + " !text-xs"}>{en ? "Campaigns" : "캠페인"}</span><strong className="block text-sm text-text-primary">{s.completedCampaignIds.length}/{CAMPAIGNS.length}</strong></div>
                    <div><span className={mutedCls + " !text-xs"}>{en ? "Relics" : "유물"}</span><strong className="block text-sm text-text-primary">{s.unlockedRelicIds.length}</strong></div>
                  </div>
                </div>
              )}
            </div>
          ) : <p className={mutedCls}>{en ? "Chamber awaiting input." : "챔버가 입력을 기다리고 있습니다."}</p>}
        </div>
      </div>
    </section>
  );
}

// IDENTITY_SEAL: PART-6 | role=main-column-UI | inputs=GameState,Metrics,callbacks | outputs=JSX

// ============================================================
// PART 7 — Main Page Component (State Management & Actions)
// ============================================================

function loadSavedState(): GameState {
  if (typeof window === "undefined") return clone(INITIAL_STATE);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(INITIAL_STATE);
    return normalizeState(JSON.parse(raw));
  } catch { return clone(INITIAL_STATE); }
}

export default function WarpGatePage() {
  const { lang } = useLang();
  const en = lang !== "ko";
  const [sideTab, setSideTab] = useState<"ship" | "struct" | "upgrade">("ship");
  const [s, setS] = useState<GameState>(() => {
    const loaded = loadSavedState();
    if (loaded.log.length === 0) {
      loaded.log.unshift({ kind: "hold", title: "HPG 사령부 초기화 완료.", detail: "Hope-01이 새로운 Gate I 챔버 안에서 대기 중입니다.", year: loaded.year });
    }
    return loaded;
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback((ns: GameState) => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ns));
  }, []);

  const update = useCallback((fn: (draft: GameState) => void) => {
    setS(prev => {
      const next = clone(prev);
      fn(next);
      save(next);
      return next;
    });
  }, [save]);

  const pushLog = useCallback((ns: GameState, kind: string, title: string, detail: string) => {
    ns.log.unshift({ kind, title, detail, year: ns.year });
    ns.log = ns.log.slice(0, 18);
  }, []);

  const ensureSituation = useCallback((ns: GameState) => {
    const campaign = getCampaign(ns);
    if (ns.currentSituation && ns.currentSituation.campaignId === campaign.id) return;
    const pool = SITUATION_DEFS.filter(d => campaign.number >= d.minCampaign && campaign.number <= d.maxCampaign);
    if (!pool.length) { ns.currentSituation = null; return; }
    const def = pool[Math.floor(Math.random() * pool.length)];
    ns.currentSituation = buildSituationInstance(campaign, def, "campaign-sync");
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const metrics = computeMetrics(s);

  // --- Action handlers ---
  const onSelectShip = (id: string) => update(ns => { ns.selectedShipId = id; pushLog(ns, "hold", en ? "Ship reassigned." : "함선 재배치.", `${getShip(ns).name} ${en ? "standing by." : "대기 중."}`); });
  const onSelectZone = (id: string) => update(ns => { ns.selectedZoneId = id; pushLog(ns, "hold", en ? "Route changed." : "항로 변경.", `${getZone(ns).name} ${en ? "selected." : "선택됨."}`); });

  const onBuild = (action: string) => update(ns => {
    const map: Record<string, string> = { "upgrade-main-gate": "mainGate", "build-relay": "relay", "launch-seed": "seed", "build-solar": "solar", "build-harvester": "harvester" };
    const kind = map[action]; if (!kind) return;
    if (kind === "mainGate" && ns.structures.mainGateLevel >= 5) return;
    if (kind === "solar" && ns.structures.solar >= 4) return;
    if (kind === "harvester" && ns.structures.harvester >= 4) return;
    if (kind === "seed" && ns.structures.mainGateLevel < 2) { pushLog(ns, "deny", en ? "Gate seed unavailable." : "게이트 시드 불가.", en ? "Need Gate II." : "Gate II가 필요합니다."); return; }
    const cost = structureCost(ns, kind);
    if (!canAfford(ns, cost)) { pushLog(ns, "deny", en ? "Build blocked." : "건설 차단.", en ? "Insufficient resources." : "자원 부족."); return; }
    ns.resources.energy -= cost.energy; ns.resources.materials -= cost.materials; ns.resources.hydrogen -= cost.hydrogen;
    if (kind === "mainGate") { ns.structures.mainGateLevel += 1; ns.year += 6; const g = getGate(ns); pushLog(ns, "allow", `${g.name} ${en ? "commissioned." : "취역."}`, en ? g.loreEn : g.lore); }
    else if (kind === "relay") { ns.structures.relay += 1; ns.year += 1; pushLog(ns, "allow", en ? "Relay deployed." : "중계 게이트 배치.", en ? "Corridor grew longer." : "회랑이 더 길어졌다."); }
    else if (kind === "seed") { ns.structures.seed += 1; ns.year += 2; pushLog(ns, "allow", en ? "Gate seed launched." : "게이트 시드 발사.", en ? "Autonomous seeding begun." : "자율 시딩 시작."); }
    else if (kind === "solar") { ns.structures.solar += 1; ns.year += 1; pushLog(ns, "allow", en ? "Solar concentrator added." : "태양 집광기 추가.", en ? "More sunlight for gate." : "게이트를 위한 추가 태양광."); }
    else if (kind === "harvester") { ns.structures.harvester += 1; ns.year += 1; pushLog(ns, "allow", en ? "Harvester deployed." : "수확기 배치.", en ? "Fuel recovery improving." : "연료 회수 개선."); }
  });

  const onUpgrade = (id: string) => update(ns => {
    const def = UPGRADE_DEFS.find(d => d.id === id); if (!def || ns.upgrades[id] >= def.maxLevel) return;
    const cost = upgradeCost(ns, def);
    if (!canAfford(ns, cost)) { pushLog(ns, "deny", `${en ? def.nameEn : def.name} ${en ? "blocked." : "차단."}`, en ? "Insufficient resources." : "자원 부족."); return; }
    ns.resources.energy -= cost.energy; ns.resources.materials -= cost.materials; ns.resources.hydrogen -= cost.hydrogen;
    ns.upgrades[id] += 1; ns.year += id === "hctg" ? 4 : 2;
    pushLog(ns, "allow", `${en ? def.nameEn : def.name} ${en ? "upgraded." : "업그레이드."}`, en ? def.effectEn : def.effect);
  });

  const onSlider = useCallback((key: string, val: number) => {
    setS(prev => {
      const next = { ...prev, controls: { ...prev.controls, [key]: val } };
      save(next);
      return next;
    });
  }, [save]);

  const onCalibrate = () => update(ns => {
    const zone = getZone(ns); const ship = getShip(ns);
    ns.controls.phase = clamp(Math.round(51 + (zone.minPhi - 0.5) * 70 + ns.upgrades.warp_shield * 2 - zone.risk * 8), 36, 78);
    ns.controls.curvature = clamp(Math.round(50 + (zone.minPsi - 0.5) * 90 + ns.structures.mainGateLevel * 5 + ship.rangeBias * 4), 38, 88);
    ns.controls.coolant = clamp(Math.round(58 + ns.upgrades.sondol * 7 + ns.upgrades.cweh * 3 - zone.risk * 10), 32, 94);
    ns.controls.relaySync = clamp(Math.round(42 + ns.structures.relay * 4 + ns.structures.seed * 6 + ns.upgrades.qlaunch * 2), 20, 96);
    ns.gateCharge = clamp(ns.gateCharge + 6, 0, 100); ns.year += 1;
    pushLog(ns, "hold", en ? "Chamber recalibrated." : "챔버 보정 완료.", en ? `Controls nudged toward ${zone.name}.` : `${zone.name} 방향으로 제어 조정.`);
  });

  const onCharge = () => update(ns => {
    const pi = passiveIncome(ns);
    ns.resources.energy += pi.energy; ns.resources.hydrogen += pi.hydrogen; ns.resources.materials += pi.materials;
    const cost = { energy: 18, materials: 4, hydrogen: 1 };
    if (!canAfford(ns, cost)) { pushLog(ns, "deny", en ? "Charge failed." : "충전 실패.", en ? "Not enough resources." : "자원 부족."); return; }
    ns.resources.energy -= cost.energy; ns.resources.materials -= cost.materials; ns.resources.hydrogen -= cost.hydrogen;
    ns.gateCharge = clamp(ns.gateCharge + 18 + ns.structures.solar * 3 + ns.upgrades.cweh * 2, 0, 100); ns.year += 1;
    pushLog(ns, "hold", en ? "Gate charged." : "게이트 충전.", `${Math.round(ns.gateCharge)}%`);
  });

  const onFocus = () => update(ns => {
    if (ns.structures.relay < 3) { pushLog(ns, "deny", en ? "Focus denied." : "집속 거부.", en ? "Need 3+ relays." : "중계기 3개 이상 필요."); return; }
    const cost = { energy: 28, materials: 0, hydrogen: 4 };
    if (!canAfford(ns, cost)) { pushLog(ns, "deny", en ? "Focus denied." : "집속 거부.", en ? "Not enough fuel." : "연료 부족."); return; }
    ns.resources.energy -= cost.energy; ns.resources.hydrogen -= cost.hydrogen;
    ns.focusPulse = true; ns.gateCharge = clamp(ns.gateCharge + 12, 0, 100); ns.year += 1;
    pushLog(ns, "hold", en ? "Resonance inverted." : "공명 역전.", en ? "Relay energy fed into main chamber." : "중계 에너지가 메인 챔버로 주입.");
  });

  const onJump = () => update(ns => {
    const m = computeMetrics(ns); const cost = actionCost(ns, "jump");
    if (!canAfford(ns, cost)) { pushLog(ns, "deny", en ? "Jump scrubbed." : "점프 중단.", en ? "Insufficient fuel." : "연료 부족."); return; }
    ns.resources.energy -= cost.energy; ns.resources.materials -= cost.materials; ns.resources.hydrogen -= cost.hydrogen;
    const pi = passiveIncome(ns); ns.resources.energy += pi.energy; ns.resources.hydrogen += pi.hydrogen; ns.resources.materials += pi.materials;
    if (m.verdict === "ALLOW") {
      ns.resources.energy += m.zone.reward.energy; ns.resources.materials += m.zone.reward.materials; ns.resources.hydrogen += m.zone.reward.hydrogen; ns.resources.intel += m.zone.reward.intel;
      ns.gateCharge = 0; ns.shipStress = clamp(ns.shipStress + m.zone.risk * 12 - m.ship.stressGuard * 18 - ns.upgrades.dpad * 4, 0, 100);
      if (!ns.completedZones.includes(m.zone.id)) ns.completedZones.push(m.zone.id);
      ns.focusPulse = false; ns.year += m.zone.requiredSpan >= 1200 ? 8 : m.zone.requiredSpan >= 400 ? 4 : 2;
      pushLog(ns, "allow", "SJC [ALLOW]", `${m.ship.name} ${en ? "crossed" : "통과"} ${m.zone.name}. phi ${fixed(m.phi, 3)}, psi ${fixed(m.psi, 3)}.`);
      ns.latestResolution = { verdict: "ALLOW", detail: `${m.ship.name} crossed ${m.zone.name}.`, phi: m.phi, psi: m.psi, entropy: m.entropy, consistency: m.consistency, branchProbability: m.branchProbability, eRms: m.eRms, zoneName: m.zone.name, shipName: m.ship.name };
    } else if (m.verdict === "HOLD") {
      ns.gateCharge = clamp(ns.gateCharge + 12, 0, 100); ns.shipStress = clamp(ns.shipStress + 8 - ns.upgrades.dpad * 2, 0, 100); ns.focusPulse = false; ns.year += 1;
      pushLog(ns, "hold", "SJC [HOLD]", `phi ${fixed(m.phi, 3)} / psi ${fixed(m.psi, 3)}`);
      ns.latestResolution = { verdict: "HOLD", detail: en ? "Chamber stalled." : "챔버 정체.", phi: m.phi, psi: m.psi, entropy: m.entropy, consistency: m.consistency, branchProbability: m.branchProbability, eRms: m.eRms, zoneName: m.zone.name, shipName: m.ship.name };
    } else {
      const dcb = ns.upgrades.deep_core * 0.18; const savedI = Math.round(m.zone.reward.intel * dcb); ns.resources.intel += savedI;
      ns.shipStress = clamp(ns.shipStress + 18 - ns.upgrades.dpad * 2 - ns.upgrades.deep_core * 3, 0, 100); ns.gateCharge = 0; ns.focusPulse = false; ns.year += 1;
      pushLog(ns, "deny", "SJC [DENY]", en ? "Corridor collapsed." : "회랑 붕괴.");
      ns.latestResolution = { verdict: "DENY", detail: en ? "Corridor collapsed." : "회랑 붕괴.", phi: m.phi, psi: m.psi, entropy: m.entropy, consistency: m.consistency, branchProbability: m.branchProbability, eRms: m.eRms, zoneName: m.zone.name, shipName: m.ship.name };
    }
  });

  const onEvaluate = () => {
    if (s.terminal.mode === "EVALUATE" || s.terminal.mode === "HOLD") return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    update(ns => {
      ensureSituation(ns);
      const campaign = getCampaign(ns);
      const m = computeMetrics(ns);
      const checks = buildCampaignChecks(ns, campaign, m);
      const failed = checks.filter(c => !c.met);
      const hardFail = failed.some(c => c.hard);
      const nearMiss = failed.length > 0 && failed.length <= 2 && !hardFail;
      const forcedCrisis = campaign.id === "campaign_06" && !ns.campaignFlags.campaign06CrisisTriggered;
      let verdict = failed.length === 0 ? "ALLOW" : nearMiss ? "HOLD" : "DENY";
      let summary = failed.length === 0 ? `${campaign.title}: ${en ? "All conditions met." : "모든 조건 충족."}` : failed.map(c => `${c.label} ${c.target}`).join(" / ");
      if (forcedCrisis) { verdict = "DENY"; summary = en ? "Relay #223 ruptured during evaluation." : "Relay #223이 평가 중 파열."; }

      ns.campaignAttempts[campaign.id] = (ns.campaignAttempts[campaign.id] || 0) + 1;
      ns.terminal.activeCampaignId = campaign.id;
      ns.terminal.mode = "EVALUATE";
      ns.terminal.simCount = campaign.simRange[0];
      ns.terminal.holdTimeRemaining = campaign.holdSeconds;
      ns.terminal.lines.unshift(`> ${en ? "Evaluating" : "평가 중"} ${campaign.title} :: ${campaign.sjcVersion}`);
      ns.terminal.lines = ns.terminal.lines.slice(0, 18);

      // Schedule the HOLD phase in the next tick
      const holdDisplaySec = campaign.holdSeconds;
      const isRetry = (ns.campaignAttempts[campaign.id] || 0) > 1;
      let realSeconds = holdDisplaySec >= 40 ? 14 : holdDisplaySec >= 18 ? 10 : holdDisplaySec >= 8 ? 7 : Math.max(2.2, holdDisplaySec * 0.9);
      if (isRetry) realSeconds = Math.max(1.2, Math.min(2.2, holdDisplaySec * 0.12));
      const totalTicks = Math.max(3, Math.ceil(holdDisplaySec));
      const tickMs = Math.max(80, Math.min(420, Math.floor((realSeconds * 1000) / totalTicks)));

      setTimeout(() => {
        let tickIdx = 0;
        setS(prev => ({ ...prev, terminal: { ...prev.terminal, mode: "HOLD" } }));

        intervalRef.current = setInterval(() => {
          tickIdx += 1;
          const progress = tickIdx / totalTicks;

          setS(prev => {
            const next = clone(prev);
            next.terminal.simCount = Math.round(campaign.simRange[0] + (campaign.simRange[1] - campaign.simRange[0]) * progress);
            next.terminal.holdTimeRemaining = Math.max(holdDisplaySec - progress * holdDisplaySec, 0);
            if (tickIdx % Math.max(Math.floor(totalTicks / 4), 1) === 0) {
              next.terminal.lines.unshift(`> [HOLD] ${fixed(next.terminal.holdTimeRemaining, 1)} s // sim ${next.terminal.simCount.toLocaleString()}`);
              next.terminal.lines = next.terminal.lines.slice(0, 18);
            }

            if (tickIdx >= totalTicks) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = null;
              // Finalize
              next.terminal.mode = verdict;
              next.terminal.lastVerdict = verdict;
              next.terminal.simCount = campaign.simRange[1];
              next.terminal.holdTimeRemaining = 0;
              next.terminal.lines.unshift(`> [${verdict}] ${summary}`);
              next.terminal.lines = next.terminal.lines.slice(0, 18);

              if (verdict === "ALLOW") {
                // Success
                if (!next.completedCampaignIds.includes(campaign.id)) {
                  next.completedCampaignIds.push(campaign.id);
                  next.resources.energy += campaign.rewards.energy || 0;
                  next.resources.materials += campaign.rewards.materials || 0;
                  next.resources.hydrogen += campaign.rewards.hydrogen || 0;
                  next.resources.intel += campaign.rewards.intel || 0;
                  if (campaign.rewards.setYear) next.year = Math.max(next.year, campaign.rewards.setYear);
                }
                if (campaign.relic && !next.unlockedRelicIds.includes(campaign.relic.id)) {
                  next.unlockedRelicIds.push(campaign.relic.id);
                  pushLog(next, "allow", en ? "Relic inherited." : "유물 계승.", `${campaign.relic.title}. ${campaign.relic.effectText}`);
                }
                if (campaign.zoneId && !next.completedZones.includes(campaign.zoneId)) next.completedZones.push(campaign.zoneId);
                if (campaign.id === "campaign_10" && !next.finale.unlocked) {
                  next.finale = { unlocked: true, title: en ? "Sea of Stars" : "별의 바다", detail: en ? "The terminal finally lets the archive become light." : "터미널이 마침내 아카이브를 빛으로 변하게 허락했다.", yearUnlocked: next.year };
                  pushLog(next, "allow", en ? "Sea of Stars unlocked." : "별의 바다 해금.", en ? "The final view opened." : "최종 뷰가 열렸다.");
                }
                if (next.campaignIndex < CAMPAIGNS.length - 1) {
                  next.campaignIndex += 1; next.selectedZoneId = getCampaign(next).zoneId; next.selectedDocumentId = null;
                }
                pushLog(next, "allow", `${en ? "Campaign" : "캠페인"} ${campaign.number} ${en ? "cleared." : "클리어."}`, campaign.summary);
              } else {
                // Setback
                next.shipStress = clamp(next.shipStress + (verdict === "DENY" ? 10 : 4), 0, 100);
                if (verdict === "DENY") {
                  next.resources.energy = Math.max(0, next.resources.energy - 20);
                  next.resources.materials = Math.max(0, next.resources.materials - 10);
                }
                pushLog(next, verdict === "DENY" ? "deny" : "hold", `${en ? "Campaign" : "캠페인"} ${campaign.number} ${en ? "unresolved." : "미해결."}`, summary);
              }
              next.latestResolution = { verdict, detail: summary, phi: m.phi, psi: m.psi, entropy: m.entropy, consistency: m.consistency, branchProbability: m.branchProbability, eRms: m.eRms, zoneName: m.zone.name, shipName: m.ship.name };

              // Roll new situation
              const campaignNext = getCampaign(next);
              const pool = SITUATION_DEFS.filter(d => campaignNext.number >= d.minCampaign && campaignNext.number <= d.maxCampaign);
              if (pool.length) { const def = pool[Math.floor(Math.random() * pool.length)]; next.currentSituation = buildSituationInstance(campaignNext, def, verdict === "ALLOW" ? "campaign-advance" : "retry-stack"); }

              timeoutRef.current = setTimeout(() => {
                setS(prev => {
                  const r = { ...prev, terminal: { ...prev.terminal, mode: "IDLE", holdTimeRemaining: 0 } };
                  save(r); return r;
                });
              }, 1400);
              save(next);
            } else {
              save(next);
            }
            return next;
          });
        }, tickMs);
      }, 250);
    });
  };

  const onSkipHold = () => {
    if (s.terminal.mode !== "HOLD") return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    update(ns => { ns.terminal.mode = "IDLE"; ns.terminal.holdTimeRemaining = 0; });
  };

  const onTutorial = () => {
    if (s.terminal.mode === "EVALUATE" || s.terminal.mode === "HOLD") return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    update(ns => {
      const idx = ns.tutorial.completed ? 0 : clamp(ns.tutorial.step, 0, TUTORIAL_SCENARIOS.length - 1);
      const sc = TUTORIAL_SCENARIOS[idx];
      ns.tutorial.active = true; ns.tutorial.step = idx + 1;
      ns.controls.phase = sc.phase;
      ns.terminal.lines.unshift(`> ${sc.label} :: ${en ? sc.titleEn : sc.title}`);
      ns.terminal.lines = ns.terminal.lines.slice(0, 18);

      if (sc.verdict !== "HOLD") {
        ns.terminal.mode = sc.verdict; ns.terminal.lastVerdict = sc.verdict;
        ns.latestResolution = { verdict: sc.verdict, title: en ? sc.titleEn : sc.title, detail: en ? sc.detailEn : sc.detail, phi: sc.phi, psi: sc.psi, entropy: sc.entropy, consistency: sc.consistency, branchProbability: sc.branchProbability, eRms: sc.eRms };
        pushLog(ns, sc.verdict === "DENY" ? "deny" : "allow", `0.51 ${en ? "Tutorial" : "튜토리얼"} // ${sc.verdict}`, en ? sc.detailEn : sc.detail);
        timeoutRef.current = setTimeout(() => setS(prev => ({ ...prev, terminal: { ...prev.terminal, mode: "IDLE" }, tutorial: { ...prev.tutorial, active: false } })), 1000);
      } else {
        ns.terminal.mode = "HOLD";
        ns.latestResolution = { verdict: "HOLD", title: en ? sc.titleEn : sc.title, detail: en ? sc.detailEn : sc.detail, phi: sc.phi, psi: sc.psi, entropy: sc.entropy, consistency: sc.consistency, branchProbability: sc.branchProbability, eRms: sc.eRms };
        let tick = 0; const total = 7;
        intervalRef.current = setInterval(() => {
          tick += 1;
          setS(prev => {
            const next = clone(prev);
            next.terminal.simCount = Math.round((sc.simStart || 0) + ((sc.simEnd || 84) - (sc.simStart || 0)) * (tick / total));
            next.terminal.holdTimeRemaining = Math.max((sc.holdSeconds || 2.1) - (sc.holdSeconds || 2.1) * (tick / total), 0);
            if (tick >= total) {
              if (intervalRef.current) clearInterval(intervalRef.current); intervalRef.current = null;
              next.terminal.mode = "ALLOW"; next.terminal.lastVerdict = "ALLOW";
              next.tutorial.active = false; next.tutorial.completed = true;
              next.terminal.lines.unshift(`> [ALLOW] ${en ? "Tutorial complete." : "튜토리얼 완료."}`);
              next.terminal.lines = next.terminal.lines.slice(0, 18);
              pushLog(next, "allow", `0.51 ${en ? "Tutorial complete." : "튜토리얼 완료."}`, en ? "0.01 separates death, life, and hesitation." : "0.01이 죽음, 삶, 망설임을 갈랐다.");
              timeoutRef.current = setTimeout(() => setS(p => ({ ...p, terminal: { ...p.terminal, mode: "IDLE" } })), 1400);
              save(next);
            }
            return next;
          });
        }, 300);
      }
    });
  };

  const onSelectDoc = (id: string) => update(ns => { ns.selectedDocumentId = id; });

  const onSave = () => {
    save(s);
    update(ns => { pushLog(ns, "allow", en ? "Manual save." : "수동 저장.", en ? "Archive flushed." : "아카이브 저장 완료."); });
  };

  const onReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const fresh = clone(INITIAL_STATE);
    fresh.log.unshift({ kind: "hold", title: en ? "Archive reset." : "아카이브 초기화.", detail: en ? "Back to Gate I." : "Gate I로 복귀.", year: fresh.year });
    fresh.selectedZoneId = getCampaign(fresh).zoneId;
    save(fresh);
    setS(fresh);
  };

  return (
    <>
      <Header />
      <main className="pt-24 bg-bg-primary min-h-screen">
        <div className="site-shell py-16 md:py-20">
          <ToolNav
            toolName={en ? "Warp Gate" : "워프 게이트"}
            isKO={!en}
            relatedTools={[
              { href: '/tools/galaxy-map', label: en ? 'Galaxy Map' : '은하 지도' },
              { href: '/tools/vessel', label: en ? 'Vessel' : '함선 비교' },
            ]}
          />

          <div className="doc-header motion-rise motion-rise-delay-1 rounded-t-[24px] mb-0">
            <span className="badge badge-classified mr-2">{en ? "FIELD PROTOTYPE" : "현장 시제품"}</span>
            {en ? "HPG 7.0 // Warp Gate Command -- Interactive Simulation" : "HPG 7.0 // 워프 게이트 사령부 -- 대화형 시뮬레이션"}
          </div>

          {/* Hero */}
          <div className={`${panelCls} mt-0 rounded-t-none border-t-0`}>
            <div className={kickerCls}>EH UNIVERSE // HPG 7.0 {en ? "Field Prototype" : "현장 시제품"}</div>
            <h1 className="text-3xl md:text-5xl font-bold mt-2 mb-3 text-text-primary leading-tight">{en ? "Warp Gate Command" : "워프 게이트 사령부"}</h1>
            <p className="text-text-tertiary text-sm leading-relaxed max-w-[840px]">
              {en ? "Build relay infrastructure, phase-lock the chamber to 0.51 consistency, and lead humanity from the age of ships to the galactic center."
                : "중계 인프라를 건설하고, 챔버를 0.51 일관성에 위상 고정하여, 인류를 함선의 시대에서 은하 중심 도달까지 이끄십시오."}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {(en ? ["Ship Select", "Relay Build", "Gate Chamber", "Field Physics", "SJC Verdict"] : ["함선 선택", "중계기 건설", "게이트 챔버", "필드 물리학", "SJC 판정"]).map(t => (
                <span key={t} className={pillCls}>{t}</span>
              ))}
            </div>
          </div>

          <ResourceStrip s={s} metrics={metrics} en={en} />

          {/* Main Layout — 컴팩트 2컬럼 */}
          <div className="grid lg:grid-cols-[280px_1fr] gap-4 mt-4 items-start">
            {/* Sidebar — 탭 전환 */}
            <div className="space-y-2">
              <div className="flex gap-1 rounded-xl border border-white/6 bg-white/[0.02] p-1">
                {(["ship", "struct", "upgrade"] as const).map(tab => (
                  <button key={tab} onClick={() => setSideTab(tab)}
                    className={`flex-1 rounded-lg px-2 py-1.5 font-mono text-[10px] font-bold tracking-wider uppercase transition-all ${
                      sideTab === tab ? "bg-white/[0.08] text-text-primary" : "text-text-tertiary hover:text-text-secondary"
                    }`}>
                    {tab === "ship" ? (en ? "Ship" : "함선") : tab === "struct" ? (en ? "Build" : "건설") : (en ? "Upgrade" : "강화")}
                  </button>
                ))}
              </div>
              {sideTab === "ship" && <ShipPanel s={s} en={en} onSelect={onSelectShip} />}
              {sideTab === "struct" && <StructurePanel s={s} en={en} onBuild={onBuild} />}
              {sideTab === "upgrade" && <UpgradePanel s={s} en={en} onUpgrade={onUpgrade} />}
            </div>

            {/* Main Column — 전부 접기식 */}
            <div className="space-y-3">
              <details open className="group">
                <summary className="cursor-pointer rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 font-mono text-[11px] font-bold tracking-wider text-text-tertiary uppercase hover:text-text-secondary transition-colors">
                  {en ? "▾ Campaign Layer" : "▾ 캠페인 레이어"}
                </summary>
                <div className="mt-2">
                  <CampaignPanel s={s} metrics={metrics} en={en} onEvaluate={onEvaluate} onSkipHold={onSkipHold} onTutorial={onTutorial} onSelectDoc={onSelectDoc} />
                </div>
              </details>
              <details open className="group">
                <summary className="cursor-pointer rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 font-mono text-[11px] font-bold tracking-wider text-text-tertiary uppercase hover:text-text-secondary transition-colors">
                  {en ? "▾ Gate Chamber" : "▾ 게이트 챔버"}
                </summary>
                <div className="mt-2">
                  <GateChamberPanel s={s} metrics={metrics} en={en} onCalibrate={onCalibrate} onCharge={onCharge} onFocus={onFocus} onJump={onJump} onSlider={onSlider} />
                </div>
              </details>
              <details className="group">
                <summary className="cursor-pointer rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 font-mono text-[11px] font-bold tracking-wider text-text-tertiary uppercase hover:text-text-secondary">
                  {en ? "▸ Zone Map & Mission Archive" : "▸ 구역 지도 & 임무 아카이브"}
                </summary>
                <div className="mt-2 space-y-4">
                  <ZoneMapPanel s={s} metrics={metrics} en={en} onSelectZone={onSelectZone} />
                  <MissionArchivePanel s={s} en={en} onSave={onSave} onReset={onReset} />
                </div>
              </details>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// IDENTITY_SEAL: PART-7 | role=main-page-component | inputs=user-interactions | outputs=rendered-game-page
