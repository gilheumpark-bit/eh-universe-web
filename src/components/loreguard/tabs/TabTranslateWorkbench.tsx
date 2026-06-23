"use client";

import { Sparkle, X, Sync, Download, Eye, Send, Lock, Check } from "@/components/loreguard/icons";
import TranslatePanels from "@/components/loreguard/TranslatePanels";
import { TranslateRail } from "./TabTranslateRail";
import { EmptyState, TranslateEditor } from "./TabTranslate.sections";
import { TranslatePanel } from "./TabTranslatePanel";
import { REWRITE_CHIPS } from "./TabTranslate.shared";
import type { TabTranslateActions } from "./useTabTranslateActions";
import type { TabTranslateState } from "./useTabTranslateState";

export function TabTranslateWorkbench({
  state,
  actions,
}: {
  state: TabTranslateState;
  actions: TabTranslateActions;
}) {
  if (!state.currentSession) {
    return (
      <EmptyState
        reason="no-session"
        onGoProject={() => state.setLoreguardTab("project")}
        onGoWriting={() => state.setLoreguardTab("writing")}
      />
    );
  }

  if (!state.activeManuscript || state.segments.length === 0) {
    return (
      <EmptyState
        reason="no-manuscript"
        onGoProject={() => state.setLoreguardTab("project")}
        onGoWriting={() => state.setLoreguardTab("writing")}
      />
    );
  }

  const activeManuscript = state.activeManuscript;
  const lockedGlossaryCount = state.glossary.filter((term) => term.locked).length;
  const txDecisionItems = [
    {
      label: "원문 보존",
      value: actions.stats.total > 0 ? `${actions.stats.total}문단 기준` : "원고 대기",
      Icon: Eye,
    },
    {
      label: "용어 고정",
      value: lockedGlossaryCount > 0 ? `${lockedGlossaryCount}/${state.glossary.length}개 고정` : `${state.glossary.length}개 용어`,
      Icon: Lock,
    },
    {
      label: "검수",
      value: state.qualityGate ? "품질 게이트 준비" : "확정 후 점검",
      Icon: Check,
    },
    {
      label: "사인오프",
      value: actions.stats.done === actions.stats.total && actions.stats.total > 0 ? "내보내기 준비" : `${actions.stats.done}/${actions.stats.total} 확정`,
      Icon: Download,
    },
  ] as const;

  const bottomActions = [
    ["되돌리기", Sync, actions.handleRevert],
    ["저장", Download, actions.handleSave],
    ["미리보기", Eye, actions.handlePreview],
  ] as const;

  return (
    <div className="tx-grid">
      <TranslateRail
        lang={state.lang}
        onLang={state.setLang}
        progress={actions.progressMap}
        layout={state.layout}
        onLayout={state.setLayout}
        chapters={state.chapters}
        activeManuscriptEp={activeManuscript.episode}
        onSelectChapter={state.handleSelectChapter}
      />

      <div className="tx-center">
        <div className="tx-decision-strip" aria-label="번역 품질 루프">
          <div className="tx-decision-copy">
            <span>번역 품질 루프</span>
            <b>원문 보존 → 용어 고정 → 검수 → 사인오프</b>
          </div>
          {txDecisionItems.map(({ label, value, Icon }) => (
            <div key={label} className="tx-decision-item">
              <Icon size={14} aria-hidden="true" />
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </div>

        <TranslateEditor
          segments={state.segments}
          lang={state.lang}
          layout={state.layout}
          statuses={state.statuses}
          translations={state.translations}
          suggestions={state.suggestions}
          selectedId={state.effectiveSelected}
          onSelect={state.setSelectedId}
          activeTerm={state.activeTerm}
          onTranslateSeg={(id) => {
            void actions.translateSegment(id);
          }}
          onAcceptSugg={actions.acceptSuggestion}
          onRejectSugg={actions.rejectSuggestion}
          busy={actions.isTranslating}
        />

        <div className="tx-bottom">
          <div className="tx-actions">
            {bottomActions.map(([label, Icon, onClick]) => (
              <button key={label} className="tx-act" onClick={onClick}>
                <Icon size={16} strokeWidth={1.6} />
                <span>{label}</span>
              </button>
            ))}
            <button className="btn primary tx-export-btn" onClick={actions.handleExport}>
              <Download size={15} strokeWidth={1.6} />
              번역본 내보내기
            </button>
          </div>
          <div className="tx-ai">
            <div className="tx-ai-bar">
              <span className="tx-ai-spark">
                <Sparkle size={16} strokeWidth={1.6} />
              </span>
              <input
                className="tx-ai-input"
                value={state.aiText}
                onChange={(e) => state.setAiText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !actions.isTranslating && actions.handleAiSend()}
                placeholder={state.progressLabel || "선택한 문단을 노아에게 재번역 요청… (Enter)"}
                disabled={actions.isTranslating}
              />
              {actions.isTranslating ? (
                <button
                  type="button"
                  className="tx-ai-send"
                  aria-label="번역 취소"
                  title="번역 취소"
                  onClick={actions.abort}
                >
                  <X size={15} strokeWidth={1.6} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className="tx-ai-send"
                  aria-label="재번역 요청 전송"
                  title="재번역 요청 전송"
                  onClick={actions.handleAiSend}
                >
                  <Send size={15} strokeWidth={1.6} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="tx-chips">
              <button
                className="tx-chip"
                onClick={actions.handleTranslateAll}
                disabled={actions.isTranslating}
                title="현재 회차 전체를 일괄 번역"
              >
                <Sparkle size={13} strokeWidth={1.6} />
                전체 번역
              </button>
              {REWRITE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  className="tx-chip"
                  disabled={actions.isTranslating || !state.effectiveSelected}
                  onClick={() => {
                    if (state.effectiveSelected) void actions.translateSegment(state.effectiveSelected, chip);
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TranslatePanel
        lang={state.lang}
        uiLanguage={state.language}
        stats={actions.stats}
        glossary={state.glossary}
        activeTerm={state.activeTerm}
        onTerm={state.setActiveTerm}
        onAddGlossary={actions.addGlossary}
        onRemoveGlossary={actions.removeGlossary}
        onOpenPanel={state.setOpenPanel}
        open={state.panelOpen}
        onToggle={state.togglePanel}
        gate={state.qualityGate}
        trackComparison={state.trackComparison}
        riskReport={state.riskReport}
      />

      <TranslatePanels
        open={state.openPanel}
        onClose={() => state.setOpenPanel(null)}
        lang={state.lang}
        activeEpisode={activeManuscript.episode}
        source={activeManuscript.content ?? ""}
        result={state.liveResult}
        onResultChange={state.applyExternalResult}
      />
    </div>
  );
}
