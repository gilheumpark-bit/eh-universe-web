"use client";

/* ===========================================================
   TabCharacter — 캐릭터 (Character) tab — Phase 3 (real engine wiring)
   Source: /tmp/design2_handoff/2/project/tab_character.jsx (window.TabCharacter)

   3-pane (ch-grid):
     · 좌 268px 로스터 (ch-rail): 인물 목록 + "새 인물" 버튼
     · 중앙 프로필 (ch-center): 히어로 + 2열(ch-cols)
         - ch-main: 기본정보 / 성격 키워드 / 말투·보이스 / 관계
         - ch-side: 서사 잠재력(dna) / 비밀·상징 (real config fields)
   contract: default export, props 없음, CSS prefix `ch-`,
   아이콘은 @/components/loreguard/icons. CSS 는 loreguard.css 에 이미 포팅됨.

   [P? loreguard-phase3 2026-06-10] real wiring — currentSession.config.characters[]
   + charRelations[] (StoryConfig). setConfig 로 영속(IndexedDB+Firestore).
   REMOVED (no engine source): 일관성 검수 %(외형/말투/동기 일치) · 등장 빈도 % ·
   per-character 챕터 추적 — 채점 엔진 부재로 날조 금지(Rule 4).

   [P? loreguard-items 2026-06-10] 아이템 서브뷰 — 제품 파이프라인 단계는
   '캐릭터·아이템'. ch-rail 에 모드 토글(인물/아이템·useStudio charSubTab state)
   추가, '아이템' 선택 시 기존 검증 컴포넌트 ItemStudioView 를 ch-center 에
   동일 real props(language·config·setConfig — 옛 CharacterTab 과 동일 경로)로
   마운트. 아이템 UI 재구축 X — 재사용 (영속은 setConfig → StoryConfig).

   [P? loreguard-character-ai 2026-06-10] AI 캐릭터 생성 — 옛 CharacterTab 의
   동일 엔진 재사용: generateCharacters(geminiService) → fetchStructuredGemini
   → /api/gemini-structured (task:'characters'·config.genre+synopsis 컨텍스트).
   ch-rail 헤더에 'AI 생성' 버튼, 결과는 config.characters 에 APPEND(이름
   dedupe·기존 덮어쓰기 X), 에러는 인라인 표시. hasAiAccess 게이트.

   [X1-xyflow 2026-06-11] "관계도" 서브뷰 — 인물 모드 안 프로필/관계도 토글
   (기본 = 프로필·그래프는 보조 뷰). 데이터 = config.characters +
   config.charRelations 그대로 (관계 없으면 노드만 — 날조 금지). 구 셸
   CharacterRelationGraph 의 원형 배치·관계색 개념 재사용, 렌더는 xyflow
   (RelationGraph·dynamic ssr:false — 토글 진입 시에만 번들 로드).
   노드 드래그 좌표는 config.charGraphLayout(additive)에 디바운스 setConfig
   영속. 노드 클릭 = 해당 인물 프로필로 이동.
   =========================================================== */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import LoadingSkeleton from "@/components/studio/LoadingSkeleton";
import type { GraphNodeSpec, GraphEdgeSpec } from "@/components/loreguard/RelationGraph";
import { User, Plus, Edit, Quote, Shield, Check, X, Layers, Sparkle, Sync } from "@/components/loreguard/icons";
import { useStudio } from "@/app/studio/StudioContext";
// [Z2a-chatcanvas 2026-06-11] 접이식 노아 채팅 도크 — 기본 접힘, 프로필 필드
// 제안 감지 → 채택 시 setConfig merge (기존 'AI 생성' 버튼과 트리거 분리).
import ChatCanvasDock, {
  extractJsonBlocks,
  type DockSuggestion,
} from "@/components/loreguard/ChatCanvasDock";
import ItemStudioView from "@/components/studio/ItemStudioView";
import { generateCharacters } from "@/services/geminiService";
import { activeSupportsStructured } from "@/lib/ai-providers";
import { logger } from "@/lib/logger";
import type { Character, CharRelation, CharRelationType } from "@/lib/studio-types";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";

// ============================================================
// PART 0.5 — [s82-stage-coverage] 창작 과정 기록 (TabWriting S2 패턴 축약)
// ============================================================
// fire-and-forget — setConfig 경로를 await/gate 하지 않음. 실패(logger 부재·
// reject·null resolve) → noa:alert 1회·60s 쿨다운 (silent failure 금지).
// 아이템(ItemStudioView) 내부 추가/편집은 공용 컴포넌트라 수정 금지 → 미기록 (honest gap).

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
// PART 1 — 표현용 헬퍼 (날조 데이터 X — 순수 프레젠테이션 파생)
// ============================================================

/** 프로토타입 아바타 색상 팔레트 — index 기반(데이터 아님, 표시 일관성용). */
const AV_COLORS = [
  "var(--c-blue)",
  "var(--c-purple)",
  "var(--c-green)",
  "var(--c-amber)",
  "var(--c-red)",
  "var(--c-teal)",
] as const;

const REL_LABELS: Record<CharRelationType, string> = {
  lover: "연인",
  rival: "라이벌",
  friend: "친구",
  enemy: "적대",
  family: "가족",
  mentor: "사제",
  subordinate: "부하",
};

// [X1-xyflow] 관계 타입 → 엣지 색 — 구 셸 CharacterRelationGraph REL_COLORS 의
// 색 의미 매핑 재사용, 값은 loreguard 토큰(다크 자동 대응)으로 치환.
const REL_EDGE_COLORS: Record<CharRelationType, string> = {
  lover: "var(--c-red)",
  rival: "var(--c-amber)",
  friend: "var(--c-green)",
  enemy: "var(--c-red)",
  family: "var(--c-blue)",
  mentor: "var(--c-purple)",
  subordinate: "var(--ink-3)",
};

// [X1-xyflow] 관계도 그래프 — xyflow 래퍼는 토글 진입 시에만 로드 (ssr:false).
const RelationGraph = dynamic(() => import("@/components/loreguard/RelationGraph"), {
  ssr: false,
  loading: () => <LoadingSkeleton height={480} />,
});

/** 저장된 레이아웃이 없을 때의 기본 원형 배치 (구 셸 computePositions 개념 재사용). */
function circularFallback(index: number, total: number): { x: number; y: number } {
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2; // 12시 시작
  const radius = 230;
  return {
    x: Math.round(320 + radius * Math.cos(angle)),
    y: Math.round(260 + radius * Math.sin(angle)),
  };
}

function avColor(index: number): string {
  return AV_COLORS[index % AV_COLORS.length];
}

function avLetter(name: string): string {
  return name.trim().charAt(0) || "?";
}

/** 프로토타입 x_grad: 아바타 큰 원의 사선 그라데이션 (color-mix 허용). */
function avatarGradient(color: string): string {
  return `linear-gradient(145deg, color-mix(in srgb, ${color} 85%, #fff), ${color})`;
}

/** traits 는 StoryConfig 상 comma 구분 string. 키워드 배열로 분해. */
function splitTraits(traits: string | undefined): string[] {
  if (!traits) return [];
  return traits
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Character 의 실제 필드만으로 기본 정보 행 구성 (값 있는 것만). */
function infoRows(c: Character): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (c.role) rows.push(["역할", c.role]);
  if (c.desire) rows.push(["욕망", c.desire]);
  if (c.deficiency) rows.push(["결핍", c.deficiency]);
  if (c.conflict) rows.push(["갈등", c.conflict]);
  if (c.changeArc) rows.push(["변화 아크", c.changeArc]);
  if (c.values) rows.push(["가치관", c.values]);
  if (c.strength) rows.push(["강점", c.strength]);
  if (c.weakness) rows.push(["약점", c.weakness]);
  return rows;
}

// ============================================================
// PART 1.7 — [Z2a-chatcanvas] 채팅 도크 프로필 제안 (감지 파서 + 형식 지시)
// ============================================================
// 노아가 ```json {"characters":[...]} 블록으로 제안 → 채택 시 setConfig merge.
// 필드는 Character 의 실존 필드만 (발명 금지). name 필수, 나머지 옵션.

const DOCK_PROPOSAL_GUIDE = `[캔버스 제안 형식] 대화 중 구체적인 캐릭터 프로필 제안에 도달하면, 응답 끝에 아래 형식의 \`\`\`json 코드 블록을 1개 포함하십시오 (제안이 없으면 블록 생략):
\`\`\`json
{"characters":[{"name":"이름","role":"역할","traits":"성격 키워드(쉼표 구분)","personality":"성격 한 줄","speechStyle":"말투 스타일","speechExample":"대표 대사","appearance":"외형"}]}
\`\`\`
name 외 필드는 제안할 값이 있을 때만 포함하십시오. 캔버스 반영은 작가가 채택 버튼으로 확정합니다 — 이미 반영했다고 단정하지 마십시오.`;

/** 도크 제안 1건 — Character 실존 필드 부분집합 (name 필수) */
interface CharProposal {
  name: string;
  role?: string;
  traits?: string;
  personality?: string;
  speechStyle?: string;
  speechExample?: string;
  appearance?: string;
}

/** JSON 블록 → CharProposal[] (런타임 검증·name 없는 행 드롭·최대 6) */
function parseCharProposals(data: unknown): CharProposal[] {
  if (!data || typeof data !== "object") return [];
  const arr = (data as { characters?: unknown }).characters;
  if (!Array.isArray(arr)) return [];
  const out: CharProposal[] = [];
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;
  for (const c of arr) {
    if (!c || typeof c !== "object") continue;
    const r = c as Record<string, unknown>;
    const name = str(r.name);
    if (!name) continue;
    out.push({
      name,
      role: str(r.role),
      traits: str(r.traits),
      personality: str(r.personality),
      speechStyle: str(r.speechStyle),
      speechExample: str(r.speechExample),
      appearance: str(r.appearance),
    });
    if (out.length >= 6) break;
  }
  return out;
}

// ============================================================
// PART 2 — 사이드 패널 (서사 잠재력 + 비밀/상징) — real config fields
// ============================================================

/** dna = 서사 잠재력 점수 0-100 (AI 엔진이 실제로 부여·영속하는 필드). */
function PotentialCard({ char }: { char: Character }) {
  const dna = typeof char.dna === "number" ? Math.max(0, Math.min(100, char.dna)) : null;
  const tone = dna == null ? "gray" : dna >= 80 ? "green" : dna >= 50 ? "amber" : "red";
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Shield size={15} strokeWidth={1.6} />
        서사 잠재력
      </div>
      {dna == null ? (
        <span className="ch-none">아직 평가되지 않음</span>
      ) : (
        <div className="ch-check">
          <div className="ch-check-top">
            <span>DNA 점수</span>
            <b style={{ color: `var(--c-${tone})` }}>{`${dna}`}</b>
          </div>
          <div className="tbar">
            <span style={{ width: `${dna}%`, background: `var(--c-${tone})` }} />
          </div>
        </div>
      )}
    </div>
  );
}

/** 비밀·상징·인상 — Character 의 실제 옵션 필드. 값 없으면 카드 미표시. */
function LoreCard({ char }: { char: Character }) {
  const rows: Array<[string, string]> = [];
  if (char.symbol) rows.push(["상징", char.symbol]);
  if (char.secret) rows.push(["비밀", char.secret]);
  if (char.externalPerception) rows.push(["타인의 인상", char.externalPerception]);
  if (char.backstory) rows.push(["과거", char.backstory]);
  if (rows.length === 0) return null;
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Quote size={15} strokeWidth={1.6} />
        서사 디테일
      </div>
      {rows.map(([k, v]) => (
        <div key={k} className="ch-check">
          <div className="ch-check-top">
            <span>{k}</span>
          </div>
          <div className="ch-voice" style={{ fontSize: 13, padding: "10px 13px" }}>
            {v}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// PART 3 — 편집 폼 (setConfig 로 write-back — 로컬 state 보관 금지)
// ============================================================

interface CharFormProps {
  char: Character;
  onSave: (patch: Partial<Character>) => void;
  onCancel: () => void;
}

function CharForm({ char, onSave, onCancel }: CharFormProps) {
  const [name, setName] = useState(char.name);
  const [role, setRole] = useState(char.role);
  const [traits, setTraits] = useState(char.traits ?? "");
  const [personality, setPersonality] = useState(char.personality ?? "");
  const [speechStyle, setSpeechStyle] = useState(char.speechStyle ?? "");
  const [speechExample, setSpeechExample] = useState(char.speechExample ?? "");
  const [appearance, setAppearance] = useState(char.appearance ?? "");

  // 폼 스타일은 인라인 — loreguard.css(공유 파일) 수정 금지(Rule 7).
  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 12,
  };
  const labelTextStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    color: "var(--ink-3)",
    marginBottom: 6,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    fontSize: 13.5,
    color: "var(--ink-1)",
    fontFamily: "inherit",
    resize: "vertical",
  };

  const field = (label: string, value: string, set: (v: string) => void, multiline = false) => (
    <label style={labelStyle}>
      <span style={labelTextStyle}>{label}</span>
      {multiline ? (
        <textarea style={inputStyle} rows={2} value={value} onChange={(e) => set(e.target.value)} />
      ) : (
        <input style={inputStyle} value={value} onChange={(e) => set(e.target.value)} />
      )}
    </label>
  );

  return (
    <div className="ch-sec" style={{ maxWidth: 640 }}>
      <div className="ch-sec-h">인물 편집</div>
      {field("이름", name, setName)}
      {field("역할", role, setRole)}
      {field("성격 키워드 (쉼표 구분)", traits, setTraits)}
      {field("성격", personality, setPersonality, true)}
      {field("말투 스타일", speechStyle, setSpeechStyle)}
      {field("대표 대사", speechExample, setSpeechExample, true)}
      {field("외형", appearance, setAppearance, true)}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button
          type="button"
          className="btn primary"
          onClick={() =>
            onSave({
              name: name.trim() || char.name,
              role: role.trim(),
              traits: traits.trim(),
              personality: personality.trim() || undefined,
              speechStyle: speechStyle.trim() || undefined,
              speechExample: speechExample.trim() || undefined,
              appearance: appearance.trim(),
            })
          }
        >
          <Check size={15} strokeWidth={1.6} />
          저장
        </button>
        <button type="button" className="btn ghost" onClick={onCancel}>
          <X size={15} strokeWidth={1.6} />
          취소
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PART 4 — TabCharacter 본체 (3-pane 합성 + real state 배선)
// ============================================================

export default function TabCharacter() {
  const {
    currentSession,
    setConfig,
    createNewSession,
    isKO,
    language,
    charSubTab,
    setCharSubTab,
    hasAiAccess,
    setShowApiKeyModal,
  } = useStudio();
  const config = currentSession?.config ?? null;
  const characters = useMemo<Character[]>(() => config?.characters ?? [], [config]);
  const relations = useMemo<CharRelation[]>(() => config?.charRelations ?? [], [config]);

  // 인물/아이템 서브뷰 — charSubTab 은 useStudio 컨텍스트 state (옛 CharacterTab 과 동일 키).
  const isItems = charSubTab === "items";

  const [selId, setSelId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // [X1-xyflow] 인물 모드 서브뷰 — 기본은 기존 프로필 뷰, 관계도는 보조(토글 진입).
  const [charView, setCharView] = useState<"profile" | "graph">("profile");

  // ---- [X1-xyflow] 관계도 데이터 변환 (실데이터만 — 날조 금지) ----
  const charGraphLayout = config?.charGraphLayout;
  const graphNodes = useMemo<GraphNodeSpec[]>(
    () =>
      characters.map((c, i) => {
        const saved = charGraphLayout?.[c.id];
        const fallback = circularFallback(i, characters.length);
        return {
          id: c.id,
          label: c.name || "?",
          sublabel: c.role || undefined,
          x: saved?.x ?? fallback.x,
          y: saved?.y ?? fallback.y,
          accent: avColor(i),
        };
      }),
    [characters, charGraphLayout],
  );

  // charRelations 의 from/to 는 이 탭에서 id 기준이나, 구 데이터(이름 기준)도
  // 존재 가능 → id·이름 둘 다 해석. 양 끝점이 실존 인물일 때만 엣지 생성.
  const graphEdges = useMemo<GraphEdgeSpec[]>(() => {
    const byKey = new Map<string, string>();
    for (const c of characters) {
      byKey.set(c.id, c.id);
      if (c.name) byKey.set(c.name, c.id);
    }
    const out: GraphEdgeSpec[] = [];
    relations.forEach((r, i) => {
      const source = byKey.get(r.from);
      const target = byKey.get(r.to);
      if (!source || !target || source === target) return;
      out.push({
        id: `rel-${i}-${source}-${target}`,
        source,
        target,
        label: r.desc?.trim() || REL_LABELS[r.type] || r.type,
        color: REL_EDGE_COLORS[r.type] ?? "var(--line)",
      });
    });
    return out;
  }, [characters, relations]);

  // ---- [X1-xyflow] 드래그 좌표 → config.charGraphLayout 디바운스 영속 ----
  const pendingLayoutRef = useRef<Record<string, { x: number; y: number }>>({});
  const layoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushGraphLayout = useCallback(() => {
    layoutTimerRef.current = null;
    const pending = pendingLayoutRef.current;
    if (Object.keys(pending).length === 0) return;
    pendingLayoutRef.current = {};
    setConfig((prev) => ({
      ...prev,
      charGraphLayout: { ...(prev.charGraphLayout ?? {}), ...pending },
    }));
  }, [setConfig]);

  const handleGraphDragStop = useCallback(
    (id: string, x: number, y: number) => {
      pendingLayoutRef.current[id] = { x: Math.round(x), y: Math.round(y) };
      if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current);
      layoutTimerRef.current = setTimeout(flushGraphLayout, 600);
    },
    [flushGraphLayout],
  );

  // 언마운트/재구성 시 타이머 정리 + 미저장 좌표 즉시 flush (좌표 유실 방지).
  useEffect(() => {
    return () => {
      if (layoutTimerRef.current) {
        clearTimeout(layoutTimerRef.current);
        layoutTimerRef.current = null;
      }
      flushGraphLayout();
    };
  }, [flushGraphLayout]);

  // 노드 클릭 = 해당 인물 선택 후 프로필 뷰로 이동 (드래그와는 xyflow 가 구분).
  const handleGraphNodeClick = useCallback((id: string) => {
    setSelId(id);
    setEditing(false);
    setCharView("profile");
  }, []);

  // AI 생성 상태 — 에러/안내는 인라인 표시 (silent fail 금지).
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ text: string; tone: "error" | "info" } | null>(null);

  // 선택 보정: 선택 id 가 사라졌으면 첫 인물로 폴백.
  const active = useMemo<Character | null>(() => {
    if (characters.length === 0) return null;
    return characters.find((c) => c.id === selId) ?? characters[0];
  }, [characters, selId]);

  const activeIndex = active ? characters.findIndex((c) => c.id === active.id) : -1;

  // ---- 쓰기 핸들러 (모두 setConfig 경유 → IndexedDB+Firestore 영속) ----

  const handleAdd = () => {
    const newChar: Character = {
      id: `char_${Date.now()}`,
      name: "새 인물",
      role: "",
      traits: "",
      appearance: "",
      dna: 0,
    };
    setConfig((prev) => ({ ...prev, characters: [...(prev.characters ?? []), newChar] }));
    setSelId(newChar.id);
    setEditing(true);
    // [s82] 새 인물 = 인간 신규 생성 (beforeContent 없음 → HUMAN_DRAFT/create)
    fireCpLog(
      getCreativeLogger()?.logHumanEdit({
        targetType: "character",
        targetId: newChar.id,
        afterContent: JSON.stringify(newChar),
        note: "character-add (TabCharacter)",
        stage: "character",
      }),
    );
    markExplicitCreativeLog("character");
  };

  const handleSave = (patch: Partial<Character>) => {
    if (!active) return;
    setConfig((prev) => ({
      ...prev,
      characters: (prev.characters ?? []).map((c) => (c.id === active.id ? { ...c, ...patch } : c)),
    }));
    setEditing(false);
    // [s82] 편집 저장 = HUMAN_REVISION (before/after 해시 체인 — active 스냅샷 기준)
    fireCpLog(
      getCreativeLogger()?.logHumanEdit({
        targetType: "character",
        targetId: active.id,
        beforeContent: JSON.stringify(active),
        afterContent: JSON.stringify({ ...active, ...patch }),
        note: "character-edit (TabCharacter)",
        stage: "character",
      }),
    );
    markExplicitCreativeLog("character");
  };

  const handleDelete = (id: string) => {
    setConfig((prev) => {
      const next = (prev.characters ?? []).filter((c) => c.id !== id);
      // [X1-xyflow] 그래프 좌표도 정리 — 고아 레이아웃 잔존 방지.
      let nextLayout = prev.charGraphLayout;
      if (nextLayout && id in nextLayout) {
        nextLayout = { ...nextLayout };
        delete nextLayout[id];
      }
      return {
        ...prev,
        characters: next,
        // 관계도 정리 — 삭제된 인물 참조 제거.
        charRelations: (prev.charRelations ?? []).filter((r) => r.from !== id && r.to !== id),
        charGraphLayout: nextLayout,
      };
    });
    if (selId === id) setSelId(null);
    setEditing(false);
    // [s82] 삭제 — logger 에 delete 전용 메서드 없음 → HUMAN_REVISION(edit) + note 로 정직 기록.
    const removed = characters.find((c) => c.id === id);
    fireCpLog(
      getCreativeLogger()?.logHumanEdit({
        targetType: "character",
        targetId: id,
        beforeContent: removed ? JSON.stringify(removed) : "(unknown)",
        afterContent: "",
        note: "character-deleted (TabCharacter)",
        stage: "character",
      }),
    );
    markExplicitCreativeLog("character");
  };

  // ---- AI 캐릭터 생성 (옛 CharacterTab 과 동일 엔진 경로 재사용) ----
  // generateCharacters → fetchStructuredGemini → /api/gemini-structured.
  // 결과는 기존 characters 에 APPEND — 이름 기준 dedupe, 덮어쓰기 X.
  const handleAiGenerate = async () => {
    if (aiBusy) return;
    if (!hasAiAccess) {
      setShowApiKeyModal(true);
      return;
    }
    if (!config) return;
    if (!activeSupportsStructured()) {
      setAiMsg({
        tone: "error",
        text: isKO
          ? "현재 엔진은 구조화 생성을 지원하지 않습니다. Gemini를 사용해주세요."
          : "Current engine doesn't support structured generation. Please use Gemini.",
      });
      return;
    }
    if (!config.synopsis?.trim()) {
      setAiMsg({
        tone: "error",
        text: isKO
          ? "먼저 세계관 탭에서 시놉시스를 작성해주세요."
          : "Please write the synopsis first (World tab).",
      });
      return;
    }

    setAiBusy(true);
    setAiMsg(null);
    try {
      const generated = await generateCharacters(config, language, 4);
      if (generated.length === 0) {
        setAiMsg({
          tone: "info",
          text: isKO
            ? "생성 결과가 비어 있습니다. 다시 시도해주세요."
            : "Generation returned no characters. Please try again.",
        });
        return;
      }
      // 이름 기준 dedupe — 기존 인물 + 이번 배치 내부 중복 모두 제거.
      const seen = new Set(
        characters.map((c) => c.name.trim().toLowerCase()).filter(Boolean),
      );
      const fresh = generated.filter((c) => {
        const key = c.name.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (fresh.length === 0) {
        setAiMsg({
          tone: "info",
          text: isKO
            ? "새 인물이 없습니다 — 생성 결과가 모두 기존 인물과 중복입니다."
            : "No new characters — all results duplicate existing names.",
        });
        return;
      }
      setConfig((prev) => {
        // updater 내부에서도 prev 기준 재검사 (저장 경합 방어).
        const existing = new Set(
          (prev.characters ?? []).map((c) => c.name.trim().toLowerCase()),
        );
        const toAdd = fresh.filter((c) => !existing.has(c.name.trim().toLowerCase()));
        return { ...prev, characters: [...(prev.characters ?? []), ...toAdd] };
      });
      setSelId(fresh[0].id);
      setEditing(false);
      // [s82] AI 생성 결과 append = 작가가 버튼으로 트리거·결과 수용 → AI_SUGGESTION 귀속
      // (인간 1.0 오귀속 금지). updater 내부 재검사로 일부가 걸러질 수 있는 미세 race 는
      // best-effort 로 수용 (fresh 기준 기록 — 과대 기록 가능성 낮음·문서화).
      const cl = getCreativeLogger();
      for (const c of fresh) {
        fireCpLog(
          cl?.logAcceptAI({
            targetType: "character",
            targetId: c.id,
            afterContent: JSON.stringify(c),
            provider: "gemini",
            stage: "character",
          }),
        );
      }
      markExplicitCreativeLog("character");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      logger.warn("TabCharacter", "generateCharacters failed", detail);
      setAiMsg({
        tone: "error",
        text: `${isKO ? "캐릭터 생성 실패" : "Character generation failed"}${detail ? `: ${detail}` : ""}`,
      });
    } finally {
      setAiBusy(false);
    }
  };

  // ---- [Z2a-chatcanvas] 채팅 도크 배선 (채택 = 사용자 확정 후 setConfig merge) ----
  // 동명 인물 존재 → 제안이 제공한 필드만 갱신 (미제공 필드 보존 — 통째 덮어쓰기 X).
  // 미존재 → 신규 인물 append (handleAiGenerate 와 동일 영속 경로·cpLog AI 귀속).
  const applyCharacterProposal = useCallback(
    (p: CharProposal) => {
      const nameKey = p.name.trim().toLowerCase();
      const existing = characters.find((c) => c.name.trim().toLowerCase() === nameKey);
      const targetId = existing?.id ?? `char_${Date.now()}`;
      setConfig((prev) => {
        const list = prev.characters ?? [];
        const idx = list.findIndex((c) => c.name.trim().toLowerCase() === nameKey);
        if (idx >= 0) {
          const cur = list[idx];
          const merged: Character = {
            ...cur,
            role: p.role ?? cur.role,
            traits: p.traits ?? cur.traits,
            appearance: p.appearance ?? cur.appearance,
            personality: p.personality ?? cur.personality,
            speechStyle: p.speechStyle ?? cur.speechStyle,
            speechExample: p.speechExample ?? cur.speechExample,
          };
          return { ...prev, characters: list.map((c, i) => (i === idx ? merged : c)) };
        }
        const fresh: Character = {
          id: targetId,
          name: p.name.trim(),
          role: p.role ?? "",
          traits: p.traits ?? "",
          appearance: p.appearance ?? "",
          dna: 0,
          ...(p.personality ? { personality: p.personality } : {}),
          ...(p.speechStyle ? { speechStyle: p.speechStyle } : {}),
          ...(p.speechExample ? { speechExample: p.speechExample } : {}),
        };
        return { ...prev, characters: [...list, fresh] };
      });
      setSelId(targetId);
      setEditing(false);
      // [s82] 채택 = AI_SUGGESTION 귀속 (인간 1.0 오귀속 금지 — handleAiGenerate 동일)
      fireCpLog(
        getCreativeLogger()?.logAcceptAI({
          targetType: "character",
          targetId,
          afterContent: JSON.stringify(p),
          stage: "character",
        }),
      );
      markExplicitCreativeLog("character");
    },
    [characters, setConfig],
  );

  const dockExtract = useCallback(
    (content: string): DockSuggestion[] => {
      const out: DockSuggestion[] = [];
      for (const block of extractJsonBlocks(content)) {
        for (const p of parseCharProposals(block)) {
          const key = `char-${p.name.trim().toLowerCase()}`;
          if (out.some((o) => o.key === key)) continue;
          out.push({
            key,
            label: `캐릭터 반영: ${p.name}`,
            apply: () => applyCharacterProposal(p),
          });
          if (out.length >= 6) return out;
        }
      }
      return out;
    },
    [applyCharacterProposal],
  );

  // 캔버스 현황 — 실데이터만 (이름·역할 상한 12 — TabDirection MAX_CHARS 동일 기준)
  const dockContext = useMemo(() => {
    if (characters.length === 0) return "등록된 인물: 없음";
    const lines = characters
      .slice(0, 12)
      .map((c) => `- ${c.name}${c.role ? ` (${c.role})` : ""}`);
    if (characters.length > 12) lines.push(`(+${characters.length - 12}명 생략)`);
    return `등록된 인물 (${characters.length}명):\n${lines.join("\n")}`;
  }, [characters]);

  // ---- 빈 상태: 세션 없음 ----
  if (!currentSession) {
    return (
      <div className="ch-grid">
        <section className="ch-center" style={{ display: "grid", placeItems: "center" }}>
          <div style={{ textAlign: "center", maxWidth: 360 }}>
            <span className="ch-av lg" style={{ background: avatarGradient(AV_COLORS[0]), margin: "0 auto 18px" }}>
              <User size={34} strokeWidth={1.6} />
            </span>
            <h2 className="ch-name" style={{ fontSize: 22 }}>
              {isKO ? "프로젝트가 없습니다" : "No project yet"}
            </h2>
            <div className="ch-oneliner" style={{ margin: "8px auto 20px" }}>
              {isKO
                ? "캐릭터를 관리하려면 먼저 프로젝트를 만들어 주세요."
                : "Create a project first to manage characters."}
            </div>
            <button type="button" className="btn primary" onClick={() => createNewSession("characters")}>
              <Plus size={15} strokeWidth={1.6} />
              {isKO ? "새 프로젝트" : "New project"}
            </button>
          </div>
        </section>
      </div>
    );
  }

  // active 의 관계 — charRelations 에서 이 인물이 from 인 항목, 상대 이름 해석.
  const activeRels: Array<{ id: string; name: string; kind: string }> = active
    ? relations
        .filter((r) => r.from === active.id)
        .map((r) => {
          const other = characters.find((c) => c.id === r.to);
          return {
            id: r.to,
            name: other?.name ?? r.to,
            kind: r.desc?.trim() || REL_LABELS[r.type] || r.type,
          };
        })
    : [];

  return (
    // [Z2a-chatcanvas] 접이식 노아 채팅 도크 — 기본 접힘 (프로필 작업 무방해),
    // 열면 좌측 1/3 채팅 + 캔버스 축소. 접힘 상태 noa-lg-chatdock 영속.
    <ChatCanvasDock
      tabKey="character"
      roleMode="캐릭터 설계 어시스턴트"
      proposalGuide={DOCK_PROPOSAL_GUIDE}
      contextBlock={dockContext}
      extractSuggestions={dockExtract}
      placeholder="인물·관계에 대해 노아와 대화…"
    >
    <div className="ch-grid">
      {/* ---- 좌: 로스터 ---- */}
      <aside className="ch-rail">
        <div className="ch-rail-head">
          <div className="trail-title">
            <span className="trail-ic">
              {isItems ? <Layers size={18} strokeWidth={1.6} /> : <User size={18} strokeWidth={1.6} />}
            </span>
            <div>
              <div className="trail-name">{isItems ? "아이템 모드" : "캐릭터 모드"}</div>
              <div className="trail-sub">
                {isItems
                  ? `아이템 ${config?.items?.length ?? 0} · 스킬 ${config?.skills?.length ?? 0} · 체계 ${config?.magicSystems?.length ?? 0}`
                  : `인물 ${characters.length}명`}
              </div>
            </div>
          </div>
        </div>

        {/* 모드 토글 — 인물/아이템 (.seg = loreguard 기존 세그먼트 클래스) */}
        <div className="seg" style={{ display: "flex", width: "100%", margin: "2px 0 10px" }}>
          <button
            type="button"
            className={!isItems ? "on" : ""}
            style={{ flex: 1 }}
            aria-pressed={!isItems}
            onClick={() => setCharSubTab("characters")}
          >
            인물
          </button>
          <button
            type="button"
            className={isItems ? "on" : ""}
            style={{ flex: 1 }}
            aria-pressed={isItems}
            onClick={() => setCharSubTab("items")}
          >
            아이템
          </button>
        </div>

        {isItems ? (
          <div className="ch-none" style={{ padding: "8px 10px" }}>
            아이템·스킬·마법 체계는 우측 패널에서 추가·편집합니다. 밸런스 분석 포함.
          </div>
        ) : (
          <>
            {/* [X1-xyflow] 프로필/관계도 서브뷰 토글 — 그래프는 보조 뷰 */}
            <div className="seg" style={{ display: "flex", width: "100%", margin: "0 0 10px" }}>
              <button
                type="button"
                className={charView === "profile" ? "on" : ""}
                style={{ flex: 1 }}
                aria-pressed={charView === "profile"}
                onClick={() => setCharView("profile")}
              >
                프로필
              </button>
              <button
                type="button"
                className={charView === "graph" ? "on" : ""}
                style={{ flex: 1 }}
                aria-pressed={charView === "graph"}
                onClick={() => setCharView("graph")}
              >
                관계도
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, margin: "4px 0 12px" }}>
              <button
                type="button"
                className="btn"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={handleAdd}
              >
                <Plus size={15} strokeWidth={1.6} />
                새 인물
              </button>
              <button
                type="button"
                className="btn primary"
                style={{ flex: 1, justifyContent: "center", opacity: aiBusy ? 0.6 : 1 }}
                onClick={handleAiGenerate}
                disabled={aiBusy}
                aria-busy={aiBusy}
              >
                {aiBusy ? (
                  <Sync size={15} strokeWidth={1.6} className="animate-spin" />
                ) : (
                  <Sparkle size={15} strokeWidth={1.6} />
                )}
                {aiBusy ? "생성 중…" : "AI 생성"}
              </button>
            </div>
            {aiMsg && (
              <div
                role={aiMsg.tone === "error" ? "alert" : "status"}
                className="ch-none"
                style={{
                  padding: "0 4px 10px",
                  ...(aiMsg.tone === "error" ? { color: "var(--c-red)" } : null),
                }}
              >
                {aiMsg.text}
              </div>
            )}
            {characters.length === 0 ? (
              <div className="ch-none" style={{ padding: "8px 10px" }}>
                아직 등록된 인물이 없습니다. “새 인물”로 추가하세요.
              </div>
            ) : (
              characters.map((x, i) => {
                const isPov = config?.povCharacter === x.id || config?.povCharacter === x.name;
                return (
                  <button
                    key={x.id}
                    type="button"
                    className={`ch-rost${active?.id === x.id ? " on" : ""}`}
                    onClick={() => {
                      setSelId(x.id);
                      setEditing(false);
                    }}
                  >
                    <span className="ch-av sm" style={{ background: avColor(i) }}>
                      {avLetter(x.name)}
                    </span>
                    <div className="ch-rost-body">
                      <div className="ch-rost-n">{x.name}</div>
                      <div className="ch-rost-r">{x.role || "역할 미정"}</div>
                    </div>
                    <span className={`pill ${isPov ? "blue" : "gray"}`}>{isPov ? "POV" : "인물"}</span>
                  </button>
                );
              })
            )}
          </>
        )}
      </aside>

      {/* ---- 중앙: 프로필 또는 아이템 스튜디오 ---- */}
      <section className="ch-center">
        {isItems ? (
          // 기존 검증 컴포넌트 재사용 — 옛 CharacterTab 과 동일 props 경로
          // (language·currentSession.config·setConfig → IndexedDB+Firestore 영속).
          config ? (
            <ItemStudioView language={language} config={config} setConfig={setConfig} />
          ) : null
        ) : charView === "graph" ? (
          // [X1-xyflow] 관계도 서브뷰 — 보조 뷰 (기본 프로필 뷰는 그대로 유지)
          characters.length === 0 ? (
            <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
              <div className="ch-none">인물이 없습니다. “새 인물”을 추가하면 관계도가 표시됩니다.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div className="ch-sec-h">관계도</div>
                <div className="ch-none" style={{ padding: "2px 0 4px" }}>
                  {graphEdges.length === 0
                    ? "등록된 관계가 없어 인물 노드만 표시합니다. 노드 드래그 위치는 자동 저장, 클릭 시 프로필로 이동합니다."
                    : "노드 드래그 위치는 자동 저장, 노드 클릭 시 해당 인물 프로필로 이동합니다."}
                </div>
              </div>
              <RelationGraph
                nodes={graphNodes}
                edges={graphEdges}
                ariaLabel="캐릭터 관계도 그래프"
                height={520}
                draggable
                onNodeClick={handleGraphNodeClick}
                onNodeDragStop={handleGraphDragStop}
              />
            </div>
          )
        ) : !active ? (
          <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
            <div className="ch-none">인물을 선택하거나 “새 인물”을 추가하세요.</div>
          </div>
        ) : (
          <>
            <div className="ch-hero">
              <span className="ch-av lg" style={{ background: avatarGradient(avColor(activeIndex)) }}>
                {avLetter(active.name)}
              </span>
              <div className="ch-hero-body">
                <div className="ch-hero-top">
                  <h2 className="ch-name">{active.name}</h2>
                  {(config?.povCharacter === active.id || config?.povCharacter === active.name) && (
                    <span className="pill blue">POV</span>
                  )}
                </div>
                <div className="ch-role">{active.role || "역할 미정"}</div>
                {active.personality && <div className="ch-oneliner">{active.personality}</div>}
              </div>
              {!editing && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn" onClick={() => setEditing(true)}>
                    <Edit size={15} strokeWidth={1.6} />
                    편집
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    aria-label="인물 삭제"
                    onClick={() => handleDelete(active.id)}
                  >
                    <X size={15} strokeWidth={1.6} />
                    삭제
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <CharForm char={active} onSave={handleSave} onCancel={() => setEditing(false)} />
            ) : (
              <div className="ch-cols">
                <div className="ch-main">
                  <div className="ch-sec">
                    <div className="ch-sec-h">기본 정보</div>
                    {infoRows(active).length > 0 ? (
                      <div className="ch-info">
                        {infoRows(active).map(([key, val]) => (
                          <div key={key} className="ch-info-i">
                            <span className="ch-info-k">{key}</span>
                            <span className="ch-info-v">{val}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="ch-none">기본 정보가 아직 비어 있습니다. “편집”으로 채우세요.</div>
                    )}
                  </div>

                  <div className="ch-sec">
                    <div className="ch-sec-h">성격 키워드</div>
                    {splitTraits(active.traits).length > 0 ? (
                      <div className="ch-traits">
                        {splitTraits(active.traits).map((trait) => (
                          <span key={trait} className="ch-trait">
                            {trait}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="ch-none">키워드 없음</div>
                    )}
                  </div>

                  <div className="ch-sec">
                    <div className="ch-sec-h">
                      <Quote size={14} strokeWidth={1.6} />
                      말투 · 보이스
                    </div>
                    {active.speechExample || active.speechStyle ? (
                      <div className="ch-voice">
                        {active.speechExample || active.speechStyle}
                        {active.speechExample && active.speechStyle && (
                          <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--ink-3)" }}>
                            {active.speechStyle}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="ch-none">말투 정보 없음</div>
                    )}
                  </div>

                  <div className="ch-sec">
                    <div className="ch-sec-h">관계</div>
                    {activeRels.length > 0 ? (
                      <div className="ch-rels">
                        {activeRels.map((r) => (
                          <div key={r.id} className="ch-rel">
                            <span className="ch-av xs">{avLetter(r.name)}</span>
                            <span className="ch-rel-n">{r.name}</span>
                            <span className="ch-rel-r">{r.kind}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="ch-none">등록된 관계 없음</div>
                    )}
                  </div>
                </div>

                <div className="ch-side">
                  <PotentialCard char={active} />
                  <LoreCard char={active} />
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
    </ChatCanvasDock>
  );
}
