"use client";

// ============================================================
// WritingTabContainer (rank 11 — 2026-06-07)
// useWriting() 에서 60+ 값을 꺼내 WritingTabInline 에 패스스루.
// StudioTabRouter 가 이 컨테이너를 마운트하면 router 의 writing 관련 props 24개가
// 제거 가능해진다 (후속 PR). 이 단계에선 prop drilling 1-hop 만 차단.
// ============================================================

import dynamic from 'next/dynamic';
import LoadingSkeleton from '@/components/studio/LoadingSkeleton';
import { useWriting } from '@/app/studio/WritingContext';

const WritingTabInline = dynamic(
  () => import('./WritingTabInline'),
  { ssr: false, loading: () => <LoadingSkeleton height={300} /> },
);

/**
 * WritingContext 의 값을 WritingTabInline 의 props 시그니처로 매핑한다.
 * Inline 컴포넌트 자체는 기존 60+ props 인터페이스를 유지 (테스트/하위 호환).
 * 호출처 (StudioTabRouter) 는 이 컨테이너만 마운트하면 되어 prop drilling 0-hop.
 */
export default function WritingTabContainer() {
  const w = useWriting();
  return (
    <WritingTabInline
      language={w.language}
      currentSession={w.currentSession}
      currentSessionId={w.currentSessionId}
      currentProjectId={w.currentProjectId}
      updateCurrentSession={w.updateCurrentSession}
      setConfig={w.setConfig}
      writingMode={w.writingMode}
      setWritingMode={w.setWritingMode}
      editDraft={w.editDraft}
      setEditDraft={w.setEditDraft}
      editDraftRef={w.editDraftRef}
      canvasContent={w.canvasContent}
      setCanvasContent={w.setCanvasContent}
      canvasPass={w.canvasPass}
      setCanvasPass={w.setCanvasPass}
      promptDirective={w.promptDirective}
      isGenerating={w.isGenerating}
      lastReport={w.lastReport}
      generationTime={w.generationTime}
      tokenUsage={w.tokenUsage}
      handleSend={w.handleSend}
      handleCancel={w.handleCancel}
      handleRegenerate={w.handleRegenerate}
      handleVersionSwitch={w.handleVersionSwitch}
      handleTypoFix={w.handleTypoFix}
      messagesEndRef={w.messagesEndRef}
      searchQuery={w.searchQuery}
      filteredMessages={w.filteredMessages}
      hasApiKey={w.hasApiKey}
      setShowApiKeyModal={w.setShowApiKeyModal}
      setActiveTab={w.setActiveTab}
      advancedSettings={w.advancedSettings}
      setAdvancedSettings={w.setAdvancedSettings}
      advancedOutputMode={w.advancedOutputMode}
      setAdvancedOutputMode={w.setAdvancedOutputMode}
      showDashboard={w.showDashboard}
      rightPanelOpen={w.rightPanelOpen}
      setRightPanelOpen={w.setRightPanelOpen}
      directorReport={w.directorReport}
      hfcpState={w.hfcpState}
      handleNextEpisode={w.handleNextEpisode}
      showAiLock={w.showAiLock}
      hostedProviders={w.hostedProviders}
      saveFlash={w.saveFlash}
      triggerSave={w.triggerSave}
      writingColumnShell={w.writingColumnShell}
      writingInputDockOffset={w.writingInputDockOffset}
      input={w.input}
      setInput={w.setInput}
      suggestions={w.suggestions}
      setSuggestions={w.setSuggestions}
      pipelineResult={w.pipelineResult}
    />
  );
}
