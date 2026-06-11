"use client";

/* ===========================================================
   WorldOpsPanel — 세계관 도구 slide-over (Z2b-world-sim-timeline)

   TabWorld 좌측 레일 버튼(시뮬레이션/타임라인/지도)으로 오픈.
   닫기: 닫기 버튼 / Escape / 오버레이 클릭 — MemoPanel·RevisionPanel 과
   동일 slide-over 패턴 (리스너 전부 cleanup).

   3 서브뷰 (구 셸 자산 실존 확인 후 재사용 — 날조 0):
   (a) 시뮬레이션 — 시나리오 입력("이 설정에서 X가 일어나면?") →
       기존 structured world-sim 경로 재사용: generateWorldSim(geminiService)
       → fetchStructuredGemini → /api/gemini-structured (task:'worldSim'
       → handleWorldSim → buildWorldSimPrompt). 결과 = 문명·관계 카드 +
       파급(기존 worldSimData 대비 결정적 diff)·모순(결과 내부 결정적
       정합 검사) — AI 점수 날조 X. 전체에 "판단용 참고" 라벨·자동 적용 X.
       (구 셸 TabAssistant 'critique' NOS 컨텍스트는 프롬프트 기반 채팅
       경로 — 본 패널은 스펙 지정대로 structured 경로 사용.)
   (b) 타임라인 — config.worldTimeline (additive 신설·grep 결과 연도 기반
       기존 키 부재) CRUD + 시간순 단순 세로 시각화 (xyflow 불필요).
       구 셸 시대 기반 문명 타임라인(WorldTimeline.tsx·worldSimData 기반)은
       데이터 있을 때 하단에 그대로 이식 마운트 (기존 키 호환 유지).
   (c) 지도 — 구 셸 WorldMap.tsx 실존 확인 → 그대로 이식 마운트
       (simData=config.worldSimData·onChange → setConfig 병합 — 구 셸
       WorldStudioView 와 동일 배선·territories/territoryLinks 키 호환).
       worldgraph 어댑터 fallback("지역 보드")은 불필요 — 실물이 존재.

   영속: 전부 setConfig → currentSession.config (IndexedDB+Firestore).
   토큰: MemoPanel 패턴 — 루트 .eh-app 직접 부여 (StudioShell children
   분기 mount 대비)·다크는 data-theme 토큰 연쇄. 신규 CSS 0 (기존
   pcard/pill/btn/seg/eh-icbtn + inline). WorldMap/WorldTimeline 은
   studio Tailwind 토큰 사용 — ItemStudioView(TabCharacter) 선례와 동일.
   =========================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { generateWorldSim } from "@/services/geminiService";
import { activeSupportsStructured } from "@/lib/ai-providers";
import { logger } from "@/lib/logger";
import { L4 } from "@/lib/i18n";
import {
  X,
  Play,
  Clock,
  Map as MapIcon,
  Plus,
  Edit,
  Check,
  Alert,
  Globe,
} from "@/components/loreguard/icons";
import WorldTimeline from "@/components/studio/WorldTimeline";
import WorldMap from "@/components/studio/WorldMap";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";
import type { StoryConfig, WorldTimelineEntry, AppLanguage } from "@/lib/studio-types";

// ============================================================
// PART 0.5 — [s82-stage-coverage] 창작 과정 기록 (TabWorld 동일 패턴 축약)
// ============================================================
// fire-and-forget — setConfig 경로를 await/gate 하지 않음. 실패(부재·reject·
// null resolve) → noa:alert 1회·60s 쿨다운 (silent failure 금지).
// WorldMap 내부 편집은 공용 컴포넌트라 수정 금지 → 미기록 (ItemStudioView
// 선례와 동일 honest gap — 주석 문서화).

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
// PART 1 — Types & 결정적 분석 헬퍼 (AI 점수 날조 X — diff/정합 검사만)
// ============================================================

export type WorldOpsView = "sim" | "timeline" | "map";

interface WorldOpsPanelProps {
  /** 오픈 시 초기 서브뷰 — 내부 seg 로 전환 가능 */
  initialView: WorldOpsView;
  onClose: () => void;
}

interface SimCiv { name: string; era: string; traits: string[] }
interface SimRel { from: string; to: string; type: string }
interface SimResult { scenario: string; civs: SimCiv[]; rels: SimRel[] }

/** 파급 분석 — 시나리오 결과 vs 등록된 worldSimData 의 결정적 diff. */
interface RippleFinding { tone: "blue" | "amber"; text: string }
/** 모순 검출 — 결과 내부의 결정적 정합 위반. */
interface ConflictFinding { text: string }

function computeRipples(
  result: SimResult,
  worldSimData: StoryConfig["worldSimData"],
  language: AppLanguage,
): { findings: RippleFinding[]; hasBaseline: boolean } {
  const existingCivs = worldSimData?.civs ?? [];
  const existingRels = worldSimData?.relations ?? [];
  const hasBaseline = existingCivs.length > 0 || existingRels.length > 0;
  if (!hasBaseline) return { findings: [], hasBaseline };

  const findings: RippleFinding[] = [];
  const civNames = new Set(existingCivs.map((c) => c.name.trim()));
  const relMap = new Map<string, string>(
    existingRels.map((r) => [`${r.fromName.trim()}→${r.toName.trim()}`, r.type]),
  );

  for (const c of result.civs) {
    if (!civNames.has(c.name.trim())) {
      findings.push({
        tone: "blue",
        text: L4(language, {
          ko: `신규 세력 등장: ${c.name} (${c.era})`,
          en: `New faction appears: ${c.name} (${c.era})`,
          ja: `新勢力の登場: ${c.name} (${c.era})`,
          zh: `新势力出现: ${c.name} (${c.era})`,
        }),
      });
    }
  }
  for (const r of result.rels) {
    const key = `${r.from.trim()}→${r.to.trim()}`;
    const prev = relMap.get(key);
    if (prev !== undefined && prev !== r.type) {
      findings.push({
        tone: "amber",
        text: L4(language, {
          ko: `관계 변화: ${r.from}→${r.to} — 기존 "${prev}" → 시나리오 후 "${r.type}"`,
          en: `Relation shift: ${r.from}→${r.to} — "${prev}" → "${r.type}"`,
          ja: `関係の変化: ${r.from}→${r.to} — 既存「${prev}」→「${r.type}」`,
          zh: `关系变化: ${r.from}→${r.to} — 原"${prev}" → "${r.type}"`,
        }),
      });
    } else if (prev === undefined) {
      findings.push({
        tone: "blue",
        text: L4(language, {
          ko: `신규 관계: ${r.from}→${r.to} (${r.type})`,
          en: `New relation: ${r.from}→${r.to} (${r.type})`,
          ja: `新しい関係: ${r.from}→${r.to} (${r.type})`,
          zh: `新关系: ${r.from}→${r.to} (${r.type})`,
        }),
      });
    }
  }
  return { findings, hasBaseline };
}

function computeConflicts(result: SimResult, language: AppLanguage): ConflictFinding[] {
  const findings: ConflictFinding[] = [];
  const names = new Set(result.civs.map((c) => c.name.trim()));
  // 1) 결과 관계가 결과 문명 목록에 없는 세력을 참조 (내부 불일치)
  for (const r of result.rels) {
    for (const end of [r.from, r.to]) {
      if (!names.has(end.trim())) {
        findings.push({
          text: L4(language, {
            ko: `관계 "${r.from}→${r.to}: ${r.type}" 가 문명 목록에 없는 세력 "${end}" 를 참조`,
            en: `Relation "${r.from}→${r.to}: ${r.type}" references unknown faction "${end}"`,
            ja: `関係「${r.from}→${r.to}: ${r.type}」が文明一覧にない勢力「${end}」を参照`,
            zh: `关系"${r.from}→${r.to}: ${r.type}"引用了文明列表外的势力"${end}"`,
          }),
        });
      }
    }
  }
  // 2) 동일 세력쌍에 상충 관계 중복 (같은 from→to 에 서로 다른 type 2개+)
  const pairTypes = new Map<string, Set<string>>();
  for (const r of result.rels) {
    const key = `${r.from.trim()}→${r.to.trim()}`;
    const set = pairTypes.get(key) ?? new Set<string>();
    set.add(r.type);
    pairTypes.set(key, set);
  }
  for (const [key, types] of pairTypes) {
    if (types.size > 1) {
      findings.push({
        text: L4(language, {
          ko: `동일 세력쌍 ${key} 에 상충 관계 ${types.size}건: ${Array.from(types).join(" vs ")}`,
          en: `Conflicting relations for ${key}: ${Array.from(types).join(" vs ")}`,
          ja: `同一勢力ペア ${key} に矛盾する関係: ${Array.from(types).join(" vs ")}`,
          zh: `同一势力对 ${key} 存在冲突关系: ${Array.from(types).join(" vs ")}`,
        }),
      });
    }
  }
  return findings;
}

/** 연표 정렬 키 — 선두 숫자(음수 포함) 추출. 숫자 없으면 마지막(입력 순서 유지). */
function yearSortKey(year: string): number {
  const m = year.match(/-?\d+/);
  return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY;
}

function splitPeople(raw: string): string[] {
  const seen = new Set<string>();
  return raw
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter((s) => {
      if (!s || seen.has(s)) return false;
      seen.add(s);
      return true;
    });
}

// ============================================================
// PART 2 — (a) 시뮬레이션 서브뷰
// ============================================================

function SimView({ config, language }: { config: StoryConfig; language: AppLanguage }) {
  const { hasAiAccess, setShowApiKeyModal } = useStudio();
  const [scenario, setScenario] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<SimResult | null>(null);

  const worldSimData = config.worldSimData;
  const ripples = useMemo(
    () => (result ? computeRipples(result, worldSimData, language) : null),
    [result, worldSimData, language],
  );
  const conflicts = useMemo(
    () => (result ? computeConflicts(result, language) : null),
    [result, language],
  );

  const run = useCallback(async () => {
    if (busy) return;
    if (!hasAiAccess) { setShowApiKeyModal(true); return; }
    if (!activeSupportsStructured()) {
      setMsg(L4(language, {
        ko: "현재 엔진은 구조화 생성을 지원하지 않습니다. Gemini를 사용해주세요.",
        en: "Current engine doesn't support structured generation. Please use Gemini.",
        ja: "現在のエンジンは構造化生成に対応していません。Geminiをご利用ください。",
        zh: "当前引擎不支持结构化生成。请使用 Gemini。",
      }));
      return;
    }
    const base = (config.synopsis ?? "").trim() || (config.corePremise ?? "").trim();
    if (!base) {
      setMsg(L4(language, {
        ko: "먼저 시놉시스 또는 핵심 전제를 작성해주세요 (우측 보드 → 핵심 전제).",
        en: "Write a synopsis or core premise first (board → Core Premise).",
        ja: "先にシノプシスまたは核心前提を作成してください。",
        zh: "请先撰写故事梗概或核心前提。",
      }));
      return;
    }
    const q = scenario.trim();
    if (!q) return;

    setBusy(true);
    setMsg(null);
    setResult(null);
    try {
      // 기존 structured world-sim 경로 그대로 — 시나리오는 시놉시스 슬롯에
      // [가정 시나리오] 블록으로 합성 (서버 prompt builder 미수정·additive).
      const res = await generateWorldSim(
        `${base}\n\n[가정 시나리오] ${q}\n위 시나리오가 실제로 발생했다고 가정하고, 그 이후 시점의 문명·세력 구도와 상호 관계를 생성하시오.`,
        String(config.genre ?? ""),
        language,
        {
          corePremise: config.corePremise,
          powerStructure: config.powerStructure,
          currentConflict: config.currentConflict,
          factionRelations: config.factionRelations,
        },
      );
      // NOA 게이트 차단 계약 (200 + { blocked }) — 사일런트 차단 금지.
      const gated = res as unknown as { blocked?: boolean; reason?: string };
      if (gated?.blocked) {
        setMsg(L4(language, {
          ko: `NOA 보안 차단: ${gated.reason ?? ""}`,
          en: `Blocked by NOA gate: ${gated.reason ?? ""}`,
          ja: `NOAゲートによりブロック: ${gated.reason ?? ""}`,
          zh: `被 NOA 安全网关拦截: ${gated.reason ?? ""}`,
        }));
        return;
      }
      const civs: SimCiv[] = (Array.isArray(res?.civilizations) ? res.civilizations : [])
        .filter((c): c is SimCiv => !!c && typeof c.name === "string" && typeof c.era === "string")
        .map((c) => ({ name: c.name, era: c.era, traits: Array.isArray(c.traits) ? c.traits : [] }));
      const rels: SimRel[] = (Array.isArray(res?.relations) ? res.relations : [])
        .filter((r): r is SimRel =>
          !!r && typeof r.from === "string" && typeof r.to === "string" && typeof r.type === "string");
      if (civs.length === 0 && rels.length === 0) {
        setMsg(L4(language, {
          ko: "결과가 비어 있습니다. 시나리오를 더 구체적으로 적고 다시 시도해주세요.",
          en: "Empty result. Make the scenario more specific and retry.",
          ja: "結果が空です。シナリオをより具体的にして再試行してください。",
          zh: "结果为空。请把情景写得更具体后重试。",
        }));
        return;
      }
      setResult({ scenario: q, civs, rels });
    } catch (err) {
      logger.warn("WorldOpsPanel", "world sim failed", err);
      const detail = err instanceof Error ? err.message : "";
      setMsg(`${L4(language, { ko: "시뮬레이션 실패", en: "Simulation failed", ja: "シミュレーション失敗", zh: "模拟失败" })}${detail ? `: ${detail}` : ""}`);
    } finally {
      setBusy(false);
    }
  }, [busy, hasAiAccess, setShowApiKeyModal, language, config, scenario]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="pcard">
        <div className="pcard-h">
          <Play size={15} />
          {L4(language, { ko: "가정 시나리오", en: "What-if scenario", ja: "仮定シナリオ", zh: "假设情景" })}
          <span className="pill amber" style={{ marginLeft: "auto" }}>
            {L4(language, { ko: "판단용 참고 — 자동 적용 안 됨", en: "For judgment only — not auto-applied", ja: "判断用 — 自動適用なし", zh: "仅供判断 — 不会自动应用" })}
          </span>
        </div>
        <textarea
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          rows={3}
          disabled={busy}
          aria-label={L4(language, { ko: "시뮬레이션 시나리오 입력", en: "Simulation scenario input", ja: "シミュレーションシナリオ入力", zh: "模拟情景输入" })}
          placeholder={L4(language, {
            ko: "이 설정에서 X가 일어나면? (예: 제국의 황제가 암살당하면 세력 구도는?)",
            en: "What if X happens in this setting? (e.g. What if the emperor is assassinated?)",
            ja: "この設定で X が起きたら? (例: 皇帝が暗殺されたら勢力図は?)",
            zh: "在此设定下如果发生 X 会怎样?(例: 皇帝遇刺后势力格局?)",
          })}
          style={{
            width: "100%",
            resize: "vertical",
            padding: "9px 12px",
            borderRadius: 11,
            border: "1px solid var(--line)",
            background: "var(--card-2)",
            color: "inherit",
            font: "inherit",
            fontSize: 13,
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
          <button
            type="button"
            className="btn primary"
            disabled={busy || !scenario.trim()}
            onClick={run}
          >
            <Play size={14} />
            {busy
              ? L4(language, { ko: "시뮬레이션 중…", en: "Simulating…", ja: "シミュレーション中…", zh: "模拟中…" })
              : L4(language, { ko: "시뮬레이션 실행", en: "Run simulation", ja: "シミュレーション実行", zh: "运行模拟" })}
          </button>
          {msg && (
            <span role="status" style={{ color: "var(--c-red)", fontSize: 12 }}>{msg}</span>
          )}
        </div>
      </div>

      {result && (
        <>
          {/* 문명·세력 카드 — AI 결과 그대로 (판단용) */}
          <div className="pcard">
            <div className="pcard-h">
              <Globe size={15} />
              {L4(language, { ko: "시나리오 이후 문명·세력", en: "Factions after scenario", ja: "シナリオ後の文明・勢力", zh: "情景后的文明·势力" })}
              <span className="pill gray" style={{ marginLeft: "auto" }}>
                {L4(language, { ko: "AI 추정", en: "AI estimate", ja: "AI推定", zh: "AI 推断" })}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 8 }}>
              {result.civs.map((c, i) => (
                <div key={`${c.name}-${i}`} style={{ border: "1px solid var(--line)", background: "var(--card-2)", borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink-1)" }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", margin: "2px 0 6px" }}>{c.era}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {c.traits.map((t, j) => (
                      <span key={j} className="pill teal">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {result.rels.length > 0 && (
              <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {result.rels.map((r, i) => (
                  <li key={i} style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                    <span style={{ fontWeight: 600, color: "var(--ink-1)" }}>{r.from}</span>
                    {" → "}
                    <span style={{ fontWeight: 600, color: "var(--ink-1)" }}>{r.to}</span>
                    {" : "}
                    <span className="pill purple">{r.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 파급 — 등록 데이터 대비 결정적 diff (점수 날조 X) */}
          <div className="pcard">
            <div className="pcard-h">
              <Alert size={15} />
              {L4(language, { ko: "파급 (등록된 문명·관계 대비 변화)", en: "Ripples (vs registered data)", ja: "波及 (登録データ対比)", zh: "波及(对比已登记数据)" })}
            </div>
            {!ripples?.hasBaseline ? (
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-3)" }}>
                {L4(language, {
                  ko: "등록된 기존 문명·관계 데이터가 없어 변화 비교는 생략합니다 (위 결과 전체가 신규 제안).",
                  en: "No registered factions/relations to compare — the whole result is a new proposal.",
                  ja: "登録済みの文明・関係データがないため比較は省略 (結果全体が新規提案)。",
                  zh: "没有已登记的文明/关系数据可比较 — 整个结果均为新提案。",
                })}
              </p>
            ) : ripples.findings.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-3)" }}>
                {L4(language, { ko: "등록 데이터 대비 변화가 검출되지 않았습니다.", en: "No changes detected vs registered data.", ja: "登録データ対比の変化は検出されませんでした。", zh: "未检测到相对已登记数据的变化。" })}
              </p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {ripples.findings.map((f, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12.5, color: "var(--ink-2)" }}>
                    <span className={`pill ${f.tone}`} style={{ flexShrink: 0 }}>
                      {f.tone === "amber"
                        ? L4(language, { ko: "변화", en: "shift", ja: "変化", zh: "变化" })
                        : L4(language, { ko: "신규", en: "new", ja: "新規", zh: "新增" })}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 모순 — 결과 내부 결정적 정합 검사 */}
          <div className="pcard">
            <div className="pcard-h">
              <Alert size={15} />
              {L4(language, { ko: "모순 검출 (결과 내부 정합)", en: "Contradictions (internal consistency)", ja: "矛盾検出 (内部整合)", zh: "矛盾检测(内部一致性)" })}
            </div>
            {conflicts && conflicts.length > 0 ? (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {conflicts.map((c, i) => (
                  <li key={i} style={{ fontSize: 12.5, color: "var(--c-red)" }}>{c.text}</li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-3)" }}>
                {L4(language, { ko: "내부 모순이 검출되지 않았습니다.", en: "No internal contradictions detected.", ja: "内部矛盾は検出されませんでした。", zh: "未检测到内部矛盾。" })}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// PART 3 — (b) 타임라인 서브뷰 (worldTimeline CRUD + 세로 시각화)
// ============================================================

interface EntryDraft { year: string; event: string; people: string }

function TimelineView({
  config,
  language,
  setConfig,
}: {
  config: StoryConfig;
  language: AppLanguage;
  setConfig: ReturnType<typeof useStudio>["setConfig"];
}) {
  const entries = useMemo<WorldTimelineEntry[]>(() => config.worldTimeline ?? [], [config.worldTimeline]);
  const [draft, setDraft] = useState<EntryDraft>({ year: "", event: "", people: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EntryDraft>({ year: "", event: "", people: "" });

  // 시간순 정렬 — 선두 숫자 기준·동률/비숫자는 입력 순서 유지 (stable).
  const sorted = useMemo(() => {
    return entries
      .map((e, i) => ({ e, i }))
      .sort((a, b) => (yearSortKey(a.e.year) - yearSortKey(b.e.year)) || (a.i - b.i))
      .map((x) => x.e);
  }, [entries]);

  const characterNames = useMemo(
    () => (config.characters ?? []).map((c) => c.name.trim()).filter(Boolean),
    [config.characters],
  );

  const logEdit = useCallback((entry: WorldTimelineEntry, before: WorldTimelineEntry | null, note: string) => {
    fireCpLog(
      getCreativeLogger()?.logHumanEdit({
        targetType: "world",
        targetId: `worldTimeline:${entry.id}`,
        beforeContent: before ? JSON.stringify(before) : undefined,
        afterContent: JSON.stringify(entry),
        note,
        stage: "world",
      }),
    );
    markExplicitCreativeLog("world");
  }, []);

  const add = useCallback(() => {
    const year = draft.year.trim();
    const event = draft.event.trim();
    if (!year || !event) return;
    const entry: WorldTimelineEntry = {
      id: `wt_${Date.now()}`,
      year,
      event,
      people: splitPeople(draft.people),
    };
    setConfig((prev) => ({ ...prev, worldTimeline: [...(prev.worldTimeline ?? []), entry] }));
    setDraft({ year: "", event: "", people: "" });
    logEdit(entry, null, "world-timeline-add (WorldOpsPanel)");
  }, [draft, setConfig, logEdit]);

  const startEdit = useCallback((e: WorldTimelineEntry) => {
    setEditingId(e.id);
    setEditDraft({ year: e.year, event: e.event, people: (e.people ?? []).join(", ") });
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId) return;
    const year = editDraft.year.trim();
    const event = editDraft.event.trim();
    if (!year || !event) return;
    const before = entries.find((e) => e.id === editingId) ?? null;
    const next: WorldTimelineEntry = {
      id: editingId,
      year,
      event,
      people: splitPeople(editDraft.people),
    };
    setConfig((prev) => ({
      ...prev,
      worldTimeline: (prev.worldTimeline ?? []).map((e) => (e.id === editingId ? next : e)),
    }));
    setEditingId(null);
    logEdit(next, before, "world-timeline-edit (WorldOpsPanel)");
  }, [editingId, editDraft, entries, setConfig, logEdit]);

  const remove = useCallback((id: string) => {
    const before = entries.find((e) => e.id === id) ?? null;
    setConfig((prev) => ({
      ...prev,
      worldTimeline: (prev.worldTimeline ?? []).filter((e) => e.id !== id),
    }));
    if (editingId === id) setEditingId(null);
    if (before) {
      fireCpLog(
        getCreativeLogger()?.logHumanEdit({
          targetType: "world",
          targetId: `worldTimeline:${id}`,
          beforeContent: JSON.stringify(before),
          afterContent: "",
          note: "world-timeline-delete (WorldOpsPanel)",
          stage: "world",
        }),
      );
      markExplicitCreativeLog("world");
    }
  }, [entries, editingId, setConfig]);

  const inputStyle: React.CSSProperties = {
    padding: "8px 11px",
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--card-2)",
    color: "inherit",
    font: "inherit",
    fontSize: 12.5,
    minWidth: 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* 추가 폼 */}
      <div className="pcard">
        <div className="pcard-h">
          <Plus size={15} />
          {L4(language, { ko: "연표 항목 추가", en: "Add timeline entry", ja: "年表項目を追加", zh: "添加年表条目" })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
          <input
            value={draft.year}
            onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))}
            aria-label={L4(language, { ko: "연도", en: "Year", ja: "年", zh: "年份" })}
            placeholder={L4(language, { ko: "연도 (예: 1024)", en: "Year (e.g. 1024)", ja: "年 (例: 1024)", zh: "年份(如 1024)" })}
            style={inputStyle}
          />
          <input
            value={draft.event}
            onChange={(e) => setDraft((d) => ({ ...d, event: e.target.value }))}
            onKeyDown={(e) => { if (!e.nativeEvent.isComposing && e.key === "Enter") add(); }}
            aria-label={L4(language, { ko: "사건", en: "Event", ja: "出来事", zh: "事件" })}
            placeholder={L4(language, { ko: "사건 (예: 대붕괴 — 마법 체계 붕괴)", en: "Event", ja: "出来事", zh: "事件" })}
            style={inputStyle}
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={draft.people}
            onChange={(e) => setDraft((d) => ({ ...d, people: e.target.value }))}
            aria-label={L4(language, { ko: "관련 인물 (쉼표 구분)", en: "Related people (comma-separated)", ja: "関連人物 (カンマ区切り)", zh: "相关人物(逗号分隔)" })}
            placeholder={L4(language, { ko: "관련 인물 — 쉼표 구분", en: "Related people — comma-separated", ja: "関連人物 — カンマ区切り", zh: "相关人物 — 逗号分隔" })}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="button" className="btn primary" disabled={!draft.year.trim() || !draft.event.trim()} onClick={add}>
            <Plus size={14} />
            {L4(language, { ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
          </button>
        </div>
        {characterNames.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
            {characterNames.map((n) => (
              <button
                key={n}
                type="button"
                className="pill blue"
                style={{ cursor: "pointer", border: 0 }}
                title={L4(language, { ko: `관련 인물에 ${n} 추가`, en: `Add ${n} to people`, ja: `関連人物に ${n} を追加`, zh: `把 ${n} 加入相关人物` })}
                onClick={() =>
                  setDraft((d) => {
                    const cur = splitPeople(d.people);
                    if (cur.includes(n)) return d;
                    return { ...d, people: [...cur, n].join(", ") };
                  })
                }
              >
                + {n}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 세로 타임라인 시각화 + 항목별 편집/삭제 */}
      <div className="pcard">
        <div className="pcard-h">
          <Clock size={15} />
          {L4(language, { ko: "연표 (시간순)", en: "Timeline (chronological)", ja: "年表 (時系列)", zh: "年表(按时间)" })}
          <span className="pill gray" style={{ marginLeft: "auto" }}>
            {sorted.length}
          </span>
        </div>
        {sorted.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-3)" }}>
            {L4(language, {
              ko: "아직 연표 항목이 없습니다. 위에서 연도·사건을 추가하세요.",
              en: "No timeline entries yet. Add a year and event above.",
              ja: "まだ年表項目がありません。上で年と出来事を追加してください。",
              zh: "还没有年表条目。请在上方添加年份和事件。",
            })}
          </p>
        ) : (
          <ol style={{ listStyle: "none", margin: 0, padding: "2px 0 2px 14px", borderLeft: "2px solid var(--line)", display: "flex", flexDirection: "column", gap: 14 }}>
            {sorted.map((e) => (
              <li key={e.id} style={{ position: "relative" }}>
                {/* 타임라인 점 */}
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: -21,
                    top: 4,
                    width: 11,
                    height: 11,
                    borderRadius: "50%",
                    background: "var(--c-blue)",
                    border: "2px solid var(--card)",
                  }}
                />
                {editingId === e.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 6 }}>
                      <input
                        value={editDraft.year}
                        onChange={(ev) => setEditDraft((d) => ({ ...d, year: ev.target.value }))}
                        aria-label={L4(language, { ko: "연도 수정", en: "Edit year", ja: "年を編集", zh: "编辑年份" })}
                        style={inputStyle}
                      />
                      <input
                        value={editDraft.event}
                        onChange={(ev) => setEditDraft((d) => ({ ...d, event: ev.target.value }))}
                        aria-label={L4(language, { ko: "사건 수정", en: "Edit event", ja: "出来事を編集", zh: "编辑事件" })}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        value={editDraft.people}
                        onChange={(ev) => setEditDraft((d) => ({ ...d, people: ev.target.value }))}
                        aria-label={L4(language, { ko: "관련 인물 수정 (쉼표 구분)", en: "Edit related people", ja: "関連人物を編集", zh: "编辑相关人物" })}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button type="button" className="btn primary" onClick={saveEdit} disabled={!editDraft.year.trim() || !editDraft.event.trim()}>
                        <Check size={14} />
                        {L4(language, { ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
                      </button>
                      <button type="button" className="btn" onClick={() => setEditingId(null)}>
                        <X size={14} />
                        {L4(language, { ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ minWidth: 86, fontWeight: 800, fontSize: 12.5, color: "var(--c-blue)" }}>{e.year}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "var(--ink-1)", whiteSpace: "pre-wrap" }}>{e.event}</div>
                      {(e.people?.length ?? 0) > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                          {(e.people ?? []).map((p, i) => (
                            <span key={i} className="pill blue">{p}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="eh-icbtn"
                      aria-label={L4(language, { ko: `${e.year} 항목 편집`, en: `Edit entry ${e.year}`, ja: `${e.year} 項目を編集`, zh: `编辑 ${e.year} 条目` })}
                      onClick={() => startEdit(e)}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      className="eh-icbtn"
                      aria-label={L4(language, { ko: `${e.year} 항목 삭제`, en: `Delete entry ${e.year}`, ja: `${e.year} 項目を削除`, zh: `删除 ${e.year} 条目` })}
                      onClick={() => remove(e.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* 구 셸 시대 기반 문명 타임라인 — worldSimData 있을 때 그대로 이식 마운트
          (기존 키 civs/transitions 호환 유지·읽기 전용 시각화) */}
      {(config.worldSimData?.civs?.length ?? 0) > 0 && (
        <div className="pcard">
          <WorldTimeline simData={config.worldSimData || {}} language={language} />
        </div>
      )}
    </div>
  );
}

// ============================================================
// PART 4 — (c) 지도 서브뷰 (구 셸 WorldMap 실존 → 이식 마운트)
// ============================================================
// 구 셸 WorldStudioView 와 동일 배선: simData=config.worldSimData,
// onChange → setConfig 병합 (territories/territoryLinks 키 그대로 — 기존
// 사용자 데이터 호환). worldgraph 어댑터 fallback("지역 보드")은 불필요
// (실물 존재). WorldMap 내부 편집의 창작 과정 기록은 공용 컴포넌트 수정
// 금지 원칙으로 미기록 (ItemStudioView 선례와 동일 honest gap).

function MapView({
  config,
  language,
  setConfig,
}: {
  config: StoryConfig;
  language: AppLanguage;
  setConfig: ReturnType<typeof useStudio>["setConfig"];
}) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <MapIcon size={15} />
        {L4(language, { ko: "세력 지도", en: "Territory map", ja: "勢力マップ", zh: "势力地图" })}
      </div>
      <WorldMap
        simData={config.worldSimData || {}}
        language={language}
        onChange={(updated) =>
          setConfig((prev) => ({
            ...prev,
            worldSimData: { ...prev.worldSimData, ...updated },
          }))
        }
      />
    </div>
  );
}

// ============================================================
// PART 5 — 셸 (slide-over 조립 — MemoPanel 패턴)
// ============================================================

const VIEW_LABELS: Record<WorldOpsView, { ko: string; en: string; ja: string; zh: string }> = {
  sim: { ko: "시뮬레이션", en: "Simulation", ja: "シミュレーション", zh: "模拟" },
  timeline: { ko: "타임라인", en: "Timeline", ja: "タイムライン", zh: "时间线" },
  map: { ko: "지도", en: "Map", ja: "マップ", zh: "地图" },
};
const VIEW_ORDER: WorldOpsView[] = ["sim", "timeline", "map"];
const VIEW_ICONS: Record<WorldOpsView, typeof Play> = { sim: Play, timeline: Clock, map: MapIcon };

export default function WorldOpsPanel({ initialView, onClose }: WorldOpsPanelProps) {
  const { currentSession, setConfig, language } = useStudio();
  const [view, setView] = useState<WorldOpsView>(initialView);
  const config = currentSession?.config ?? null;

  // 모달 a11y — 본 패널은 mount = open (부모가 조건부 마운트). focus trap + 배경 스크롤 차단.
  // Escape 는 아래 기존 핸들러가 전담 → focus trap onEscape 는 미전달 (이중 호출 방지).
  const dialogRef = useRef<HTMLElement>(null);
  useFocusTrap(dialogRef, true);
  useBodyScrollLock(true);

  // Escape 닫기 — 마운트 중에만 청취 (cleanup 보장).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const HeadIcon = VIEW_ICONS[view];

  return (
    <div
      role="presentation"
      className="eh-app"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        minWidth: 0,
        height: "auto",
        background: "var(--overlay-scrim)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-end",
      }}
    >
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, VIEW_LABELS[view])}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(860px, 96vw)",
          height: "100%",
          overflowY: "auto",
          background: "var(--page-2)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "var(--shadow-pop)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* head */}
        <div className="pcard-h" style={{ marginBottom: 0 }}>
          <HeadIcon size={16} />
          {L4(language, VIEW_LABELS[view])}
          <div className="seg" style={{ marginLeft: 12 }}>
            {VIEW_ORDER.map((v) => (
              <button
                key={v}
                type="button"
                className={view === v ? "on" : ""}
                aria-pressed={view === v}
                onClick={() => setView(v)}
              >
                {L4(language, VIEW_LABELS[v])}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="eh-icbtn"
            aria-label={L4(language, { ko: "패널 닫기", en: "Close panel", ja: "パネルを閉じる", zh: "关闭面板" })}
            autoFocus
            style={{ marginLeft: "auto" }}
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* body — currentSession 없으면 빈 상태 (크래시 X) */}
        {!config ? (
          <p style={{ margin: "24px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            {L4(language, {
              ko: "아직 프로젝트가 없습니다. 먼저 '새 세계관'으로 프로젝트를 만들어주세요.",
              en: "No project yet. Create one with 'New World' first.",
              ja: "まだプロジェクトがありません。先に「新しい世界観」を作成してください。",
              zh: "还没有项目。请先用「新世界观」创建项目。",
            })}
          </p>
        ) : view === "sim" ? (
          <SimView config={config} language={language} />
        ) : view === "timeline" ? (
          <TimelineView config={config} language={language} setConfig={setConfig} />
        ) : (
          <MapView config={config} language={language} setConfig={setConfig} />
        )}
      </aside>
    </div>
  );
}
