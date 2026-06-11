"use client";

/* ===========================================================
   TabWorld — 세계관 (Worldbuilding) tab — Phase 3 (real wiring)
   Source: /tmp/design2_handoff/2/project/tab_world.jsx (window.TabWorld)

   3-pane (.wd-grid):
     좌 96px 레일(.wd-rail)  — 새 세계관 / 버전 비교 도구 (real handlers)
     중앙 AI 채팅(.wd-center) — filteredMessages 실시간 + handleSend 입력바
     우 408px 보드(.wd-board) — 17개 3-tier 세계관 필드 카드 (StoryConfig)
       [G3-rulebook-fields] 구 셸 AdvancedPlanningSection 의 3-tier 구조 필드
       전체 복원 (economy·survivalEnvironment·education·dailyLife·travelComm·
       truthVsBeliefs 6개 추가 — config 키 동일 = 기존 사용자 데이터 호환).
       tier 별 접이식 섹션 — 접힘 상태 localStorage `noa-lg-world-sections` 영속.

   배선:
     - 세계관 카드 → StoryConfig 17 필드 (corePremise … truthVsBeliefs). 채움/미채움
       상태 + 완성도 %는 실제 config 값에서 계산 (가짜 "항목 23개" 제거).
     - 채팅 입력 → setInput + handleSend (실 엔진 스트리밍).
     - 채택 → setConfig 로 해당 필드에 AI 메시지 본문 병합 (IndexedDB+Firestore 저장).
     - 새 세계관 → createNewSession('world').
     - 버전 비교 → versionedBackups / doRestoreVersionedBackup.
     - currentSession 없음 → 빈 상태(프로젝트 생성) 렌더, 크래시 X.

   CSS: 전부 src/app/loreguard.css 에 .eh-app 스코프로 포팅됨 (신규 CSS 금지).
   아이콘: @/components/loreguard/icons (lucide re-export, strokeWidth prop).

   [Z2b-world-sim-timeline 2026-06-11] 좌 레일에 시뮬레이션/타임라인/지도
   3 도구 추가 — WorldOpsPanel slide-over 오픈 (MemoPanel 패턴·dynamic
   ssr:false — 진입 시에만 번들 로드). (a) 시뮬레이션 = 기존 structured
   world-sim 경로(generateWorldSim → task:'worldSim') 재사용·판단용 라벨,
   (b) 타임라인 = config.worldTimeline additive CRUD + 구 셸 WorldTimeline
   (worldSimData 시대 기반) 이식 마운트, (c) 지도 = 구 셸 WorldMap 실존
   확인 → 이식 (territories/territoryLinks 키 호환). 세션 없으면 도구
   미노출 (빈 상태 레일은 '새 세계관'만 유지).
   =========================================================== */

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Globe,
  Clock,
  Plus,
  Scale,
  Play,
  Book,
  Alert,
  Check,
  X,
  Pin,
  Send,
  Chevron,
  ChevronR,
  Layers,
  Sparkle,
  Shield,
  Flag,
  Lock,
  Sync,
  Coins,
  Map,
  Grad,
  User,
  Route,
  Eye,
} from "@/components/loreguard/icons";
import type { LucideIcon } from "lucide-react";
import { useStudio } from "@/app/studio/StudioContext";
import type { StoryConfig } from "@/lib/studio-types";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";
import { L4 } from "@/lib/i18n";
import type { WorldOpsView } from "@/components/loreguard/WorldOpsPanel";

// [Z2b] 세계관 도구 slide-over — 진입 시에만 번들 로드 (WorldMap/WorldTimeline 포함).
const WorldOpsPanel = dynamic(() => import("@/components/loreguard/WorldOpsPanel"), {
  ssr: false,
});

// ============================================================
// PART 0.5 — [s82-stage-coverage] 창작 과정 기록 (TabWriting S2 패턴 축약)
// ============================================================
// window.__creativeLogger (StudioShell mount·creative-logger-global.d.ts typed).
// fire-and-forget — adopt 경로를 await/gate 하지 않음. 실패(부재·reject·null
// resolve = 기록 미수행) → noa:alert 1회·60s 쿨다운 (silent failure 금지).

let cpAlertAt = 0;
function surfaceCpLogFailure(): void {
  const now = Date.now();
  if (now - cpAlertAt < 60_000) return;
  cpAlertAt = now;
  try {
    window.dispatchEvent(
      new CustomEvent("noa:alert", {
        detail: { message: "창작 과정 기록 실패 — 확인서 정확도에 영향", variant: "warning" },
      }),
    );
  } catch { /* noop */ }
}
function fireCpLog(p: Promise<string | null> | null | undefined): void {
  if (!p) { surfaceCpLogFailure(); return; }
  p.then((id) => { if (id === null) surfaceCpLogFailure(); }).catch(() => surfaceCpLogFailure());
}
const getCreativeLogger = () =>
  typeof window !== "undefined" ? window.__creativeLogger ?? null : null;

// ============================================================
// PART 1 — 세계관 필드 정의 (StoryConfig 3-tier 17 필드 ↔ 보드 카드)
// [G3-rulebook-fields] 구 셸 AdvancedPlanningSection 의 필드 목록·순서 그대로.
// ============================================================

// StoryConfig 의 세계관 필드 key 만 사용 (studio-types.ts 확인).
type WorldFieldKey =
  | "corePremise"
  | "powerStructure"
  | "currentConflict"
  | "worldHistory"
  | "socialSystem"
  | "economy"
  | "magicTechSystem"
  | "factionRelations"
  | "survivalEnvironment"
  | "culture"
  | "religion"
  | "education"
  | "lawOrder"
  | "taboo"
  | "dailyLife"
  | "travelComm"
  | "truthVsBeliefs";

interface WorldFieldDef {
  key: WorldFieldKey;
  ic: LucideIcon;
  color: string;
  title: string;
  desc: string;
  /** 3-tier framework 단계 (표시용 pill) */
  tier: 1 | 2 | 3;
}

// 색상은 loreguard.css 의 --c-* 토큰만 사용.
const WORLD_FIELDS: WorldFieldDef[] = [
  { key: "corePremise", ic: Globe, color: "var(--c-blue)", title: "핵심 전제", desc: "현실과 다른 이 세계의 근본 전제를 정의합니다.", tier: 1 },
  { key: "powerStructure", ic: Scale, color: "var(--c-purple)", title: "권력 구조", desc: "누가 세계를 지배하고 어떤 질서가 작동하는지 정리합니다.", tier: 1 },
  { key: "currentConflict", ic: Alert, color: "var(--c-red)", title: "현재 갈등", desc: "이야기를 움직이는 지금의 핵심 갈등을 기록합니다.", tier: 1 },
  { key: "worldHistory", ic: Clock, color: "var(--c-green)", title: "역사", desc: "세계의 주요 사건과 시대 흐름을 연대순으로 정리합니다.", tier: 2 },
  { key: "socialSystem", ic: Layers, color: "var(--c-teal)", title: "사회 시스템", desc: "신분·계층·제도 등 사회가 작동하는 방식을 정의합니다.", tier: 2 },
  { key: "economy", ic: Coins, color: "var(--c-amber)", title: "경제와 생활", desc: "자원·화폐·일상적 생업 등 경제가 돌아가는 방식을 정리합니다.", tier: 2 },
  { key: "magicTechSystem", ic: Sparkle, color: "var(--c-amber)", title: "마법 / 기술 체계", desc: "마법 또는 기술의 원천·규칙·한계를 체계적으로 정리합니다.", tier: 2 },
  { key: "factionRelations", ic: Shield, color: "var(--c-blue)", title: "종족 / 세력 관계", desc: "주요 종족·세력과 그들 사이의 관계를 정리합니다.", tier: 2 },
  { key: "survivalEnvironment", ic: Map, color: "var(--c-green)", title: "생존 환경", desc: "지리·기후·위험 요소 등 생존 조건을 정의합니다.", tier: 2 },
  { key: "culture", ic: Book, color: "var(--c-purple)", title: "문화", desc: "관습·예술·언어 등 세계의 문화적 결을 정의합니다.", tier: 3 },
  { key: "religion", ic: Flag, color: "var(--c-amber)", title: "종교와 신화", desc: "신앙·신화·세계관적 믿음 체계를 정리합니다.", tier: 3 },
  { key: "education", ic: Grad, color: "var(--c-blue)", title: "교육/지식 전달", desc: "어떻게 배우고 가르치는지, 지식이 전달되는 방식을 정리합니다.", tier: 3 },
  { key: "lawOrder", ic: Lock, color: "var(--c-green)", title: "법과 질서", desc: "법·치안·처벌 등 질서 유지 방식을 정의합니다.", tier: 3 },
  { key: "taboo", ic: Pin, color: "var(--c-red)", title: "금기와 규범", desc: "넘으면 안 되는 금기와 사회적 규범을 기록합니다.", tier: 3 },
  { key: "dailyLife", ic: User, color: "var(--c-teal)", title: "평범한 사람의 하루", desc: "아침에 일어나서 잠들기까지 평범한 사람의 하루를 그립니다.", tier: 3 },
  { key: "travelComm", ic: Route, color: "var(--c-purple)", title: "이동/통신 속도", desc: "도시 간 이동 시간과 정보가 전달되는 속도를 정의합니다.", tier: 3 },
  { key: "truthVsBeliefs", ic: Eye, color: "var(--c-amber)", title: "믿음 vs 진실", desc: "사람들이 믿는 것과 실제 진실의 간극을 기록합니다.", tier: 3 },
];

const TIER_TONE: Record<1 | 2 | 3, string> = { 1: "purple", 2: "blue", 3: "teal" };
const TIER_LABEL: Record<1 | 2 | 3, string> = { 1: "1단계 뼈대", 2: "2단계 작동", 3: "3단계 디테일" };
const WORLD_TIERS = [1, 2, 3] as const;

function fieldValue(config: StoryConfig | null | undefined, key: WorldFieldKey): string {
  const v = config?.[key];
  return typeof v === "string" ? v.trim() : "";
}

// ============================================================
// PART 1.5 — [G3-rulebook-fields] tier 섹션 접힘 상태 영속
// localStorage `noa-lg-world-sections` — {"1":bool,"2":bool,"3":bool}
// (true = 접힘). 기본 전부 펼침 (기존 사용자 경험 보존). 트리는
// dynamic(ssr:false) — LoreguardShell 테마와 동일하게 lazy init 안전.
// ============================================================

const WORLD_SECTIONS_KEY = "noa-lg-world-sections";
type CollapsedTiers = Record<1 | 2 | 3, boolean>;
const SECTIONS_DEFAULT: CollapsedTiers = { 1: false, 2: false, 3: false };

function readCollapsedTiers(): CollapsedTiers {
  if (typeof window === "undefined") return SECTIONS_DEFAULT;
  try {
    const raw = window.localStorage.getItem(WORLD_SECTIONS_KEY);
    if (!raw) return SECTIONS_DEFAULT;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return SECTIONS_DEFAULT;
    const p = parsed as Record<string, unknown>;
    return { 1: p["1"] === true, 2: p["2"] === true, 3: p["3"] === true };
  } catch {
    return SECTIONS_DEFAULT;
  }
}

// ============================================================
// PART 2 — 보드 카드 (우측 — config 값에서 채움/미채움 표시)
// ============================================================

interface BoardCardProps {
  def: WorldFieldDef;
  value: string;
  /** 이 필드를 채택 대상으로 선택 */
  onPick: (key: WorldFieldKey) => void;
  picked: boolean;
}

function BoardCard({ def, value, onPick, picked }: BoardCardProps) {
  const Icon = def.ic;
  const filled = value.length > 0;
  return (
    <button
      type="button"
      className="wd-card"
      onClick={() => onPick(def.key)}
      style={{
        textAlign: "left",
        cursor: "pointer",
        outline: picked ? "2px solid var(--primary)" : undefined,
      }}
      aria-pressed={picked}
      title={picked ? `${def.title} — 채택 대상으로 선택됨` : `${def.title} 채택 대상으로 선택`}
    >
      <div
        className="wd-card-ic"
        style={{
          color: def.color,
          background: `color-mix(in srgb, ${def.color} 13%, transparent)`,
        }}
      >
        <Icon size={20} />
      </div>
      <div className="wd-card-body">
        <div className="wd-card-top">
          <span className="wd-card-title">{def.title}</span>
          <span className={`pill ${TIER_TONE[def.tier]}`}>{TIER_LABEL[def.tier]}</span>
          <span className={`pill ${filled ? "green" : "gray"}`}>
            {filled ? "작성됨" : "비어 있음"}
          </span>
        </div>
        <div className="wd-card-desc">{filled ? value : def.desc}</div>
      </div>
      <ChevronR size={18} style={{ color: "var(--ink-3)", alignSelf: "center" }} />
    </button>
  );
}

// ============================================================
// PART 3 — 빈 상태 (currentSession 없음)
// ============================================================

function WorldEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="wd-center">
      <div className="wd-chat card" style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: "48px 24px" }}>
        <div className="wd-card-ic" style={{ color: "var(--c-blue)", background: "color-mix(in srgb, var(--c-blue) 13%, transparent)" }}>
          <Globe size={22} />
        </div>
        <p className="wd-p" style={{ marginTop: 16, fontWeight: 600 }}>
          아직 세계관을 설계할 프로젝트가 없습니다.
        </p>
        <p className="wd-p" style={{ color: "var(--ink-3)" }}>
          새 세계관을 만들면 핵심 전제부터 세계의 디테일까지 {WORLD_FIELDS.length}개 항목을 AI와 함께 채워나갈 수 있습니다.
        </p>
        <button type="button" className="btn primary" style={{ marginTop: 16 }} onClick={onCreate}>
          <Plus size={16} />새 세계관 만들기
        </button>
      </div>
    </section>
  );
}

// ============================================================
// PART 4 — 셸 (3-pane 조립 + 실 엔진 배선)
// ============================================================

export default function TabWorld() {
  const {
    currentSession,
    setConfig,
    filteredMessages,
    isGenerating,
    handleSend,
    handleCancel,
    input,
    setInput,
    createNewSession,
    versionedBackups,
    doRestoreVersionedBackup,
    refreshBackupList,
    language,
  } = useStudio();

  // 채택 대상 필드 (보드에서 클릭하여 선택) — 채택 시 이 필드에 병합.
  const [pickedField, setPickedField] = useState<WorldFieldKey>("corePremise");
  const [showVersions, setShowVersions] = useState(false);

  // [Z2b] 세계관 도구 slide-over — null = 닫힘. key 로 재오픈 시 초기 뷰 재시드.
  const [opsView, setOpsView] = useState<WorldOpsView | null>(null);

  // [G3-rulebook-fields] tier 섹션 접힘 상태 — noa-lg-world-sections 영속.
  const [collapsedTiers, setCollapsedTiers] = useState<CollapsedTiers>(readCollapsedTiers);
  useEffect(() => {
    try {
      window.localStorage.setItem(WORLD_SECTIONS_KEY, JSON.stringify(collapsedTiers));
    } catch { /* noop — 저장 불가(프라이빗 모드 등) 시 세션 내 상태만 유지 */ }
  }, [collapsedTiers]);
  const toggleTier = useCallback((tier: 1 | 2 | 3) => {
    setCollapsedTiers((prev) => ({ ...prev, [tier]: !prev[tier] }));
  }, []);

  // config 는 currentSession?.config (StudioContext 직접 필드 아님).
  const cfg: StoryConfig | null = currentSession?.config ?? null;

  // 완성도 — 실제 채워진 필드 수 / WORLD_FIELDS.length(17) (가짜 메트릭 제거).
  const filledCount = useMemo(
    () => WORLD_FIELDS.filter((f) => fieldValue(cfg, f.key).length > 0).length,
    [cfg],
  );
  const completeness = Math.round((filledCount / WORLD_FIELDS.length) * 100);

  const pickedDef = WORLD_FIELDS.find((f) => f.key === pickedField) ?? WORLD_FIELDS[0];

  const submit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    // 세계관 디렉티브 — 실 엔진 스트리밍. handleSend 가 input 을 읽고 비운다.
    handleSend(`[세계관 설계] ${trimmed}`);
  }, [input, isGenerating, handleSend]);

  // 채택 — AI 메시지 본문을 선택된 세계관 필드에 병합 후 영구 저장.
  const adopt = useCallback(
    (content: string) => {
      if (!cfg) return;
      const clean = content.trim();
      if (!clean) return;
      setConfig((prev) => {
        const existing = typeof prev[pickedField] === "string" ? (prev[pickedField] as string).trim() : "";
        const merged = existing ? `${existing}\n\n${clean}` : clean;
        return { ...prev, [pickedField]: merged };
      });
      // [s82] AI 채택 = AI_SUGGESTION 귀속 (인간 1.0 오귀속 금지). merged 값은
      // cfg 스냅샷 기준 재계산 (updater 의 prev 와 미세 race 가능 — hash 기록용 best-effort).
      // stage 정보는 logAcceptAI 시그니처에 extra 필드가 없어 targetType 'world' +
      // targetId(필드 key)로 전달 (note 는 logger 가 자체 생성 — 정직 한계).
      const existingCfg = fieldValue(cfg, pickedField);
      const mergedForLog = existingCfg ? `${existingCfg}\n\n${clean}` : clean;
      fireCpLog(
        getCreativeLogger()?.logAcceptAI({
          targetType: "world",
          targetId: pickedField,
          afterContent: mergedForLog,
          stage: "world",
        }),
      );
      markExplicitCreativeLog("world");
    },
    [cfg, pickedField, setConfig],
  );

  const handleNewWorld = useCallback(() => createNewSession("world"), [createNewSession]);

  const openVersions = useCallback(() => {
    refreshBackupList?.();
    setShowVersions((s) => !s);
  }, [refreshBackupList]);

  // [F2] 버전 복원 — 기존 fire-and-forget(무피드백)을 비차단 noa:toast 피드백으로.
  // ToastHost(LoreguardStudio 마운트)가 수신. 실패·reject 모두 비침묵 (silent failure 금지).
  const restoreVersion = useCallback(
    (timestamp: number) => {
      if (!doRestoreVersionedBackup) return;
      const toast = (ok: boolean) => {
        window.dispatchEvent(
          new CustomEvent("noa:toast", {
            detail: ok
              ? {
                  message: L4(language, {
                    ko: "백업이 복원되었습니다",
                    en: "Backup restored",
                    ja: "バックアップを復元しました",
                    zh: "已恢复备份",
                  }),
                  variant: "success",
                }
              : {
                  message: L4(language, {
                    ko: "백업 복원에 실패했습니다",
                    en: "Backup restore failed",
                    ja: "バックアップの復元に失敗しました",
                    zh: "备份恢复失败",
                  }),
                  variant: "error",
                },
          }),
        );
      };
      doRestoreVersionedBackup(timestamp)
        .then((ok) => toast(ok !== false))
        .catch(() => toast(false));
    },
    [doRestoreVersionedBackup, language],
  );

  // 빈 상태 — currentSession 없음.
  if (!currentSession) {
    return (
      <div className="wd-grid">
        <aside className="wd-rail" aria-label="세계관 도구">
          <button type="button" className="wd-tool" onClick={handleNewWorld}>
            <span className="wd-tool-ic"><Plus size={20} /></span>
            <span>새 세계관</span>
          </button>
        </aside>
        <WorldEmptyState onCreate={handleNewWorld} />
        <aside className="wd-board" aria-label="세계관 보드" />
      </div>
    );
  }

  const backups = versionedBackups ?? [];

  return (
    <div className="wd-grid">
      {/* 좌 96px 레일 — 실 동작 도구만 (세팅동기화 dead 버튼 제거) */}
      <aside className="wd-rail" aria-label="세계관 도구">
        <button type="button" className="wd-tool" onClick={handleNewWorld}>
          <span className="wd-tool-ic"><Plus size={20} /></span>
          <span>새 세계관</span>
        </button>
        {doRestoreVersionedBackup ? (
          <button
            type="button"
            className="wd-tool"
            onClick={openVersions}
            aria-pressed={showVersions}
          >
            <span className="wd-tool-ic"><Scale size={20} /></span>
            <span>버전 비교</span>
          </button>
        ) : null}
        {/* [Z2b] 세계관 도구 — 시뮬레이션/타임라인/지도 slide-over */}
        <button
          type="button"
          className="wd-tool"
          aria-haspopup="dialog"
          onClick={() => setOpsView("sim")}
        >
          <span className="wd-tool-ic"><Play size={20} /></span>
          <span>{L4(language, { ko: "시뮬레이션", en: "Simulate", ja: "シミュレーション", zh: "模拟" })}</span>
        </button>
        <button
          type="button"
          className="wd-tool"
          aria-haspopup="dialog"
          onClick={() => setOpsView("timeline")}
        >
          <span className="wd-tool-ic"><Clock size={20} /></span>
          <span>{L4(language, { ko: "타임라인", en: "Timeline", ja: "タイムライン", zh: "时间线" })}</span>
        </button>
        <button
          type="button"
          className="wd-tool"
          aria-haspopup="dialog"
          onClick={() => setOpsView("map")}
        >
          <span className="wd-tool-ic"><Map size={20} /></span>
          <span>{L4(language, { ko: "지도", en: "Map", ja: "マップ", zh: "地图" })}</span>
        </button>
      </aside>

      {/* 중앙 AI 채팅 — filteredMessages 실시간 + handleSend 입력 */}
      <section className="wd-center">
        <div className="wd-chat card">
          <div className="wd-chat-head">
            <div className="wd-chat-title">
              <Globe size={17} />
              세계관 모드
              <span className="wd-online">
                <span className={`rdot ${isGenerating ? "amber" : "green"}`} />
                {isGenerating ? "생성 중…" : "AI 어시스턴트"}
              </span>
            </div>
            <button type="button" className="btn ghost" onClick={openVersions}>
              <Clock size={15} />
              버전 기록
            </button>
          </div>

          {showVersions ? (
            <div className="wd-chat-body">
              {backups.length === 0 ? (
                <p className="wd-p" style={{ color: "var(--ink-3)" }}>저장된 버전 백업이 없습니다.</p>
              ) : (
                backups.map((b) => (
                  <div key={b.timestamp} className="wd-card" style={{ marginBottom: 8 }}>
                    <div className="wd-card-ic" style={{ color: "var(--c-green)", background: "color-mix(in srgb, var(--c-green) 13%, transparent)" }}>
                      <Clock size={18} />
                    </div>
                    <div className="wd-card-body">
                      <div className="wd-card-top">
                        <span className="wd-card-title">{b.label}</span>
                      </div>
                      <div className="wd-card-meta">
                        <span>{new Date(b.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    {doRestoreVersionedBackup ? (
                      <button
                        type="button"
                        className="btn"
                        style={{ alignSelf: "center" }}
                        onClick={() => restoreVersion(b.timestamp)}
                      >
                        <Sync size={14} />복원
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="wd-chat-body">
              {filteredMessages.length === 0 ? (
                <div className="wd-msg ai">
                  <div className="wd-ai-av">EH</div>
                  <div className="wd-ai-body">
                    <div className="wd-bubble ai">
                      <p className="wd-p">
                        세계관을 함께 설계해 봅시다. 마법 체계의 제약, 권력 구조, 역사 등
                        궁금한 것을 입력하면 제안을 드립니다. 마음에 드는 답변은
                        오른쪽 보드의 항목을 고른 뒤 <b>채택</b>으로 저장할 수 있어요.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                filteredMessages.map((msg) =>
                  msg.role === "user" ? (
                    <div key={msg.id} className="wd-msg user">
                      <div className="wd-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="wd-bubble user">{msg.content}</div>
                    </div>
                  ) : (
                    <div key={msg.id} className="wd-msg ai">
                      <div className="wd-ai-av">EH</div>
                      <div className="wd-ai-body">
                        <div className="wd-time">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="wd-bubble ai">
                          <p className="wd-p" style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                          <div className="wd-msg-actions">
                            <button
                              type="button"
                              className="wd-mact"
                              aria-label={`'${pickedDef.title}' 항목에 채택`}
                              title={`'${pickedDef.title}' 항목에 채택`}
                              onClick={() => adopt(msg.content)}
                            >
                              <Check size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                )
              )}
            </div>
          )}

          {/* 입력바 — setInput + handleSend (dead 첨부/음성/AI보강 버튼 제거) */}
          <div className="wd-input">
            <input
              className="wd-in-field"
              placeholder={`'${pickedDef.title}' 항목을 설계할 지시를 입력하세요…`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              disabled={isGenerating}
            />
            {isGenerating ? (
              <button
                type="button"
                className="wd-in-send"
                aria-label="생성 중지"
                title="생성 중지"
                onClick={handleCancel}
              >
                <X size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="wd-in-send"
                aria-label="전송"
                onClick={submit}
                disabled={!input.trim()}
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 우 408px 보드 — 17개 세계관 필드 (tier 접이식 섹션) + 실제 완성도 */}
      <aside className="wd-board" aria-label="세계관 보드">
        <div className="wd-card" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
          <div className="wd-card-top">
            <span className="wd-card-title">세계관 완성도</span>
            <span className="pill blue" style={{ marginLeft: "auto" }}>
              {filledCount} / {WORLD_FIELDS.length} 작성됨
            </span>
          </div>
          <div className="tbar">
            <span style={{ width: `${completeness}%` }} />
          </div>
          <div className="wd-card-meta">
            <span>완성도 {completeness}%</span>
          </div>
        </div>
        {/* [G3-rulebook-fields] tier 별 접이식 섹션 — noa-lg-world-sections 영속 */}
        {WORLD_TIERS.map((tier) => {
          const fields = WORLD_FIELDS.filter((f) => f.tier === tier);
          const tierFilled = fields.filter((f) => fieldValue(cfg, f.key).length > 0).length;
          const collapsed = collapsedTiers[tier];
          const sectionId = `wd-tier-section-${tier}`;
          return (
            <section
              key={tier}
              aria-label={TIER_LABEL[tier]}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <button
                type="button"
                className="wd-card"
                style={{ padding: "10px 15px", alignItems: "center", textAlign: "left" }}
                aria-expanded={!collapsed}
                aria-controls={sectionId}
                onClick={() => toggleTier(tier)}
                title={collapsed ? `${TIER_LABEL[tier]} 섹션 펼치기` : `${TIER_LABEL[tier]} 섹션 접기`}
              >
                <span className={`pill ${TIER_TONE[tier]}`}>{TIER_LABEL[tier]}</span>
                <span className="wd-card-meta" style={{ marginLeft: "auto" }}>
                  {tierFilled} / {fields.length} 작성됨
                </span>
                <Chevron
                  size={16}
                  aria-hidden="true"
                  style={{
                    color: "var(--ink-3)",
                    transition: "transform .16s var(--ease)",
                    transform: collapsed ? "rotate(-90deg)" : "none",
                  }}
                />
              </button>
              {!collapsed && (
                <div id={sectionId} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {fields.map((def) => (
                    <BoardCard
                      key={def.key}
                      def={def}
                      value={fieldValue(cfg, def.key)}
                      picked={pickedField === def.key}
                      onPick={setPickedField}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </aside>

      {/* [Z2b] 세계관 도구 slide-over — fixed overlay (wd-grid 레이아웃 비간섭) */}
      {opsView !== null && (
        <WorldOpsPanel
          key={opsView}
          initialView={opsView}
          onClose={() => setOpsView(null)}
        />
      )}
    </div>
  );
}
