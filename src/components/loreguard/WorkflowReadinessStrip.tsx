"use client";

import { L4 } from "@/lib/i18n";
import type { AppLanguage, StoryConfig } from "@/lib/studio-types";
import { getLoreguardTabLabel, type LoreguardTabId } from "./LoreguardShell";

type WorkflowStatus = "ready" | "partial" | "missing";

interface StageAudit {
  id: LoreguardTabId;
  status: WorkflowStatus;
  readyCount: number;
  totalCount: number;
}

interface WorkflowReadinessStripProps {
  activeTab: LoreguardTabId;
  config: StoryConfig | null;
  projectName: string;
  language: AppLanguage;
  onStageSelect?: (stage: LoreguardTabId) => void;
}

const WORKFLOW_ORDER: LoreguardTabId[] = [
  "project",
  "world",
  "character",
  "plot",
  "scene",
  "direction",
  "writing",
  "revision",
  "translate",
  "export",
];

const TECHNIQUE_LABELS: Record<LoreguardTabId, { ko: string; en: string; ja: string; zh: string }> = {
  project: {
    ko: "작품 기준선",
    en: "Rights notes · platform basis",
    ja: "権利メモ・平台基準",
    zh: "权利备注·平台基准",
  },
  world: {
    ko: "세계관 뼈대 확장",
    en: "3-step world structure",
    ja: "世界観3層階層化",
    zh: "世界观三层结构",
  },
  character: {
    ko: "욕망·결핍·관계 계층화",
    en: "Desire · flaw · relation hierarchy",
    ja: "欲望・欠落・関係階層",
    zh: "欲望·缺陷·关系层级",
  },
  plot: {
    ko: "7문장·3막·이벤트 체인",
    en: "7 sentences · 3 acts · event chain",
    ja: "7文・3幕・イベント連鎖",
    zh: "七句·三幕·事件链",
  },
  scene: {
    ko: "화수별 목적·갈등·전환",
    en: "Episode purpose · conflict · turn",
    ja: "各話の目的・対立・転換",
    zh: "章节目的·冲突·转折",
  },
  direction: {
    ko: "톤·카메라·감정선",
    en: "Tone · camera · emotion line",
    ja: "トーン・カメラ・感情線",
    zh: "语气·镜头·情绪线",
  },
  writing: {
    ko: "설정 흐름·원고 연결",
    en: "Setting flow · draft link",
    ja: "設定遵守・原稿連携",
    zh: "设定遵循·正文关联",
  },
  revision: {
    ko: "후보→승인→반영",
    en: "Candidate → approval → apply",
    ja: "候補→承認→反映",
    zh: "候选→批准→应用",
  },
  translate: {
    ko: "원문·번역문·승인",
    en: "Source · translation · sign-off",
    ja: "原文・翻訳文・承認",
    zh: "原文·译文·签核",
  },
  export: {
    ko: "과정기록·권리/IP 자산화",
    en: "Process record · rights/IP package",
    ja: "過程記録・権利/IPパック",
    zh: "过程记录·权利/IP包",
  },
};

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasObjectValues(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some((item) => {
    if (Array.isArray(item)) return item.length > 0;
    if (typeof item === "object" && item !== null) return hasObjectValues(item);
    return hasText(item) || typeof item === "number" || typeof item === "boolean";
  });
}

function stageStatus(id: LoreguardTabId, config: StoryConfig | null, projectName: string): StageAudit {
  const projectNamed =
    hasText(config?.title) ||
    (hasText(projectName) && !["프로젝트 없음", "No project", "プロジェクトなし", "无项目"].includes(projectName));
  const manuscripts = config?.manuscripts ?? [];
  const translated = config?.translatedManuscripts ?? [];
  const sceneSheets = config?.episodeSceneSheets ?? [];
  const accepted = config?.acceptedImportCandidates ?? [];
  const characterHasDepth = (config?.characters ?? []).some((character) =>
    [
      character.desire,
      character.deficiency,
      character.conflict,
      character.changeArc,
      character.assetMemo,
    ].some(hasText),
  );

  const checks: Record<LoreguardTabId, boolean[]> = {
    project: [
      projectNamed,
      hasText(config?.corePremise) || hasText(config?.setting),
      hasText(config?.rightsNote) || !!config?.publishPlatform || !!config?.releasePurpose,
    ],
    world: [
      hasText(config?.corePremise) || hasText(config?.setting),
      hasText(config?.currentConflict) || hasText(config?.powerStructure) || hasText(config?.worldHistory),
      Object.keys(config?.worldFieldEvidence ?? {}).length > 0 || accepted.some((item) => item.bucket === "world"),
    ],
    character: [
      (config?.characters ?? []).length > 0,
      characterHasDepth,
      (config?.items ?? []).length > 0 || (config?.charRelations ?? []).length > 0,
    ],
    plot: [
      hasText(config?.synopsis),
      (config?.mainScenarioStructure?.sevenSentenceSynopsis ?? []).length > 0 ||
        (config?.mainScenarioStructure?.acts ?? []).length > 0,
      (config?.mainScenarioStructure?.eventChain ?? []).length > 0 ||
        !!config?.mainScenarioStructure?.endingLock?.locked,
    ],
    scene: [
      sceneSheets.length > 0,
      sceneSheets.some((sheet) => (sheet.scenes ?? []).length > 0),
      sceneSheets.some((sheet) => hasObjectValues(sheet.directionSnapshot) || hasText(sheet.arc)),
    ],
    direction: [
      hasObjectValues(config?.sceneDirection),
      hasText(config?.primaryEmotion) || hasObjectValues(config?.styleProfile),
      sceneSheets.some((sheet) => hasObjectValues(sheet.directionSnapshot)),
    ],
    writing: [
      manuscripts.some((item) => hasText(item.content)),
      manuscripts.some((item) => (item.content?.trim().length ?? 0) >= 1000),
      sceneSheets.length > 0 || hasObjectValues(config?.sceneDirection) || (config?.characters ?? []).length > 0,
    ],
    revision: [
      manuscripts.some((item) => hasText(item.content)),
      manuscripts.some((item) => (item.corrections ?? []).length > 0) || !!config?.qualityHarness,
      manuscripts.some((item) => item.lifecycleState === "COMPLETED" || item.lifecycleState === "SIGNED_OFF"),
    ],
    translate: [
      !!config?.translationConfig,
      translated.length > 0,
      translated.some((item) => item.faithfulApproved || item.marketApproved),
    ],
    export: [
      manuscripts.some((item) => hasText(item.content)),
      hasText(config?.rightsNote) || accepted.some((item) => item.bucket === "rightsIp"),
      translated.length > 0 || manuscripts.some((item) => item.lifecycleState === "SIGNED_OFF" || item.lifecycleState === "SHIPPED"),
    ],
  };

  const stageChecks = checks[id];
  const readyCount = stageChecks.filter(Boolean).length;
  const status: WorkflowStatus =
    readyCount === stageChecks.length ? "ready" : readyCount > 0 ? "partial" : "missing";
  return { id, status, readyCount, totalCount: stageChecks.length };
}

function statusLabel(status: WorkflowStatus, language: AppLanguage): string {
  if (status === "ready") {
    return L4(language, { ko: "준비됨", en: "Ready", ja: "準備済み", zh: "已准备" });
  }
  if (status === "partial") {
    return L4(language, { ko: "보완 필요", en: "Needs work", ja: "補強が必要", zh: "需要补强" });
  }
  return L4(language, { ko: "시작 전", en: "Not started", ja: "開始前", zh: "尚未开始" });
}

export default function WorkflowReadinessStrip({
  activeTab,
  config,
  projectName,
  language,
  onStageSelect,
}: WorkflowReadinessStripProps) {
  const audits = WORKFLOW_ORDER.map((id) => stageStatus(id, config, projectName));
  const activeAudit = audits.find((item) => item.id === activeTab) ?? audits[0];
  const activeIndex = WORKFLOW_ORDER.indexOf(activeTab);
  const previousAudit = activeIndex > 0 ? audits[activeIndex - 1] : null;
  const nextAudit = activeIndex < WORKFLOW_ORDER.length - 1 ? audits[activeIndex + 1] : null;
  const linkedCount = audits.filter((item) => item.status !== "missing").length;
  const linkedSummary = linkedCount > 0
    ? L4(language, {
      ko: `${linkedCount}개 단계 준비됨`,
      en: `${linkedCount} steps ready`,
      ja: `${linkedCount}本の作業線が連携`,
      zh: `已关联 ${linkedCount} 条工作线`,
    })
    : L4(language, {
      ko: "아직 준비 중",
      en: "Still preparing",
      ja: "作業線準備",
      zh: "工作线准备中",
    });
  const detailBasisLabel = L4(language, { ko: "확인 항목", en: "checks", ja: "確認項目", zh: "检查项" });

  return (
    <aside
      className="lg-workflow-strip"
      aria-label={L4(language, { ko: "단계별 작업 준비 상태", en: "Workflow readiness", ja: "段階別の準備状態", zh: "分步准备状态" })}
    >
      <div className="lg-workflow-main">
        <span className={`lg-workflow-status ${activeAudit.status}`}>
          {statusLabel(activeAudit.status, language)}
        </span>
        <strong>{getLoreguardTabLabel(activeTab, language)}</strong>
        <span>{L4(language, TECHNIQUE_LABELS[activeTab])}</span>
      </div>
      <ol
        className="lg-workflow-steps"
        aria-label={L4(language, { ko: "10단계 준비 상태", en: "10-step readiness", ja: "10段階の準備状態", zh: "十步准备状态" })}
      >
        {audits.map((audit, stageIndex) => (
          <li key={audit.id} className="lg-workflow-step">
            <button
              type="button"
              className={`lg-workflow-dot ${audit.status} ${audit.id === activeTab ? "active" : ""}`}
              title={`${stageIndex + 1}. ${getLoreguardTabLabel(audit.id, language)} · ${statusLabel(audit.status, language)} · ${detailBasisLabel} ${audit.readyCount}/${audit.totalCount}`}
              aria-label={`${stageIndex + 1}. ${getLoreguardTabLabel(audit.id, language)} ${statusLabel(audit.status, language)} ${detailBasisLabel} ${audit.readyCount}/${audit.totalCount}`}
              aria-current={audit.id === activeTab ? "step" : undefined}
              onClick={() => onStageSelect?.(audit.id)}
              disabled={!onStageSelect}
            />
          </li>
        ))}
      </ol>
      <div className="lg-workflow-notes">
        <span>
          <small>{L4(language, { ko: "이전", en: "Previous", ja: "前", zh: "上一步" })}</small>
          {previousAudit ? (
            <button type="button" className="lg-workflow-jump" onClick={() => onStageSelect?.(previousAudit.id)} disabled={!onStageSelect}>
              {getLoreguardTabLabel(previousAudit.id, language)}
            </button>
          ) : (
            <b>—</b>
          )}
        </span>
        <span className="active">
          <small>{L4(language, { ko: "지금", en: "Current", ja: "現在", zh: "当前" })}</small>
          <b>{activeIndex + 1}{L4(language, { ko: "단계", en: " step", ja: "段階", zh: "步" })}</b>
        </span>
        <span>
          <small>{L4(language, { ko: "다음", en: "Next", ja: "次", zh: "下一步" })}</small>
          {nextAudit ? (
            <button type="button" className="lg-workflow-jump" onClick={() => onStageSelect?.(nextAudit.id)} disabled={!onStageSelect}>
              {getLoreguardTabLabel(nextAudit.id, language)}
            </button>
          ) : (
            <b>—</b>
          )}
        </span>
        <span>
          <small>{L4(language, { ko: "준비 상태", en: "Readiness", ja: "準備状態", zh: "准备状态" })}</small>
          <b>{linkedSummary}</b>
        </span>
      </div>
    </aside>
  );
}
