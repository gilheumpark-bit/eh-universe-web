"use client";

import { useCallback, useMemo, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { generateWorldSim } from "@/services/geminiService";
import { activeSupportsStructured } from "@/lib/ai-providers";
import { logger } from "@/lib/logger";
import { L4 } from "@/lib/i18n";
import { Alert, Globe, Play } from "@/components/loreguard/icons";
import type { AppLanguage, StoryConfig } from "@/lib/studio-types";
import {
  computeConflicts,
  computeRipples,
  type SimCiv,
  type SimRel,
  type SimResult,
} from "./WorldOpsPanel.helpers";

export function WorldOpsSimView({ config, language }: { config: StoryConfig; language: AppLanguage }) {
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
        ko: "현재 설정에서는 구조화 제안을 사용할 수 없습니다. 연결 키나 실행 경로를 확인해 주세요.",
        en: "The current Noa mode does not support structured suggestions. Check a supported engine or connection key.",
        ja: "現在のNoa運用モードは構造化提案に対応していません。対応エンジンまたは接続キーを確認してください。",
        zh: "当前 Noa 运行模式不支持结构化建议。请检查支持的引擎或连接密钥。",
      }));
      return;
    }
    const base = (config.synopsis ?? "").trim() || (config.corePremise ?? "").trim();
    if (!base) {
      setMsg(L4(language, {
        ko: "먼저 시놉시스나 핵심 전제를 적어 주세요. (우측 보드 → 핵심 전제)",
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
      const gated = res as unknown as { blocked?: boolean; reason?: string };
      if (gated?.blocked) {
        setMsg(L4(language, {
          ko: `노아 요청 보류: ${gated.reason ?? ""}`,
          en: `Noa request held: ${gated.reason ?? ""}`,
          ja: `ノアのリクエスト保留: ${gated.reason ?? ""}`,
          zh: `诺亚请求暂缓: ${gated.reason ?? ""}`,
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
          ko: "결과가 비어 있습니다. 시나리오를 조금 더 구체적으로 적고 다시 시도해 주세요.",
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
    <div className="wops-stack">
      <div className="pcard">
        <div className="pcard-h">
          <Play size={15} />
          {L4(language, { ko: "가정 시나리오", en: "What-if scenario", ja: "仮定シナリオ", zh: "假设情景" })}
          <span className="pill amber wops-push">
            {L4(language, { ko: "검토 참고 — 자동 적용 안 됨", en: "Review aid — not auto-applied", ja: "検討参考 — 自動適用なし", zh: "供复核参考 — 不会自动应用" })}
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
          className="wops-textarea"
        />
        <div className="wops-action-row">
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
            <span role="status" className="wops-status-danger">{msg}</span>
          )}
        </div>
      </div>

      {result && (
        <>
          <div className="pcard">
            <div className="pcard-h">
              <Globe size={15} />
              {L4(language, { ko: "시나리오 이후 문명·세력", en: "Factions after scenario", ja: "シナリオ後の文明・勢力", zh: "情景后的文明·势力" })}
              <span className="pill gray wops-push">
                {L4(language, { ko: "노아 추정", en: "Noa estimate", ja: "ノア推定", zh: "诺亚推断" })}
              </span>
            </div>
            <div className="wops-card-grid">
              {result.civs.map((c, i) => (
                <div key={`${c.name}-${i}`} className="wops-sim-card">
                  <div className="wops-sim-card-title">{c.name}</div>
                  <div className="wops-sim-card-meta">{c.era}</div>
                  <div className="wops-chip-row">
                    {c.traits.map((t, j) => (
                      <span key={j} className="pill teal">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {result.rels.length > 0 && (
              <ul className="wops-rel-list">
                {result.rels.map((r, i) => (
                  <li key={i} className="wops-rel-item">
                    <span className="wops-rel-name">{r.from}</span>
                    {" → "}
                    <span className="wops-rel-name">{r.to}</span>
                    {" : "}
                    <span className="pill purple">{r.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pcard">
            <div className="pcard-h">
              <Alert size={15} />
              {L4(language, { ko: "파급 (등록된 문명·관계 대비 변화)", en: "Ripples (vs registered data)", ja: "波及 (登録データ対比)", zh: "波及(对比已登记数据)" })}
            </div>
            {!ripples?.hasBaseline ? (
              <p className="wops-muted-copy">
                {L4(language, {
                  ko: "등록된 기존 문명·관계 데이터가 없어 변화 비교는 생략합니다 (위 결과 전체가 신규 제안).",
                  en: "No registered factions/relations to compare — the whole result is a new proposal.",
                  ja: "登録済みの文明・関係データがないため比較は省略 (結果全体が新規提案)。",
                  zh: "没有已登记的文明/关系数据可比较 — 整个结果均为新提案。",
                })}
              </p>
            ) : ripples.findings.length === 0 ? (
              <p className="wops-muted-copy">
                {L4(language, { ko: "등록 데이터 대비 변화가 검출되지 않았습니다.", en: "No changes detected vs registered data.", ja: "登録データ対比の変化は検出されませんでした。", zh: "未检测到相对已登记数据的变化。" })}
              </p>
            ) : (
              <ul className="wops-finding-list">
                {ripples.findings.map((f, i) => (
                  <li key={i} className="wops-finding-item">
                    <span className={`pill ${f.tone} wops-chip-fixed`}>
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

          <div className="pcard">
            <div className="pcard-h">
              <Alert size={15} />
              {L4(language, { ko: "모순 검출 (결과 내부 정합)", en: "Contradictions (internal consistency)", ja: "矛盾検出 (内部整合)", zh: "矛盾检测(内部一致性)" })}
            </div>
            {conflicts && conflicts.length > 0 ? (
              <ul className="wops-finding-list">
                {conflicts.map((c, i) => (
                  <li key={i} className="wops-danger-item">{c.text}</li>
                ))}
              </ul>
            ) : (
              <p className="wops-muted-copy">
                {L4(language, { ko: "내부 모순이 검출되지 않았습니다.", en: "No internal contradictions detected.", ja: "内部矛盾は検出されませんでした。", zh: "未检测到内部矛盾。" })}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
