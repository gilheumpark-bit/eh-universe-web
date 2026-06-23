"use client";

import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { Send } from "lucide-react";
import type { StoryConfig, EpisodeManuscript, Message } from "@/lib/studio-types";
import type { CreativeEvent } from "@/lib/creative-process/types";
import { buildTensionTrajectory } from "@/lib/long-arc-verifier/tension-trajectory";
import type { FindReferencesResult } from "@/lib/symbol-index/types";
import type { useLongArcVerifier } from "@/hooks/useLongArcVerifier";
import type { useReaderSimulation } from "@/hooks/useReaderSimulation";
import type { useStoryDebugger } from "@/hooks/useStoryDebugger";
import type { useSymbolIndex } from "@/hooks/useSymbolIndex";
import {
  CompletionGapPanel,
  CreativeContributionInspector,
  DebuggerPanel,
  DropoutHeatmap,
  ForeshadowLedger,
  LongArcGraph,
  LongArcReportPanel,
  MetaContextPanel,
  NovelIDESettingsPanel,
  ProvenanceReport,
  ReaderProfilePanel,
  ReferencesPanel,
  SemanticDiffPanel,
  SymbolOutlinePanel,
} from "./NovelIDELauncher.lazy";
import type { CertificateLanguage, JournalView, LauncherTab, NovelIDELanguage } from "./NovelIDELauncher.model";

type SemanticDiffResult = ComponentProps<typeof SemanticDiffPanel>["result"];

type NovelIDELauncherTabBodyProps = {
  tab: LauncherTab;
  language: NovelIDELanguage;
  isKO: boolean;
  config: StoryConfig | null | undefined;
  episodes: EpisodeManuscript[] | null | undefined;
  messages: Message[] | null | undefined;
  symbolIndex: ReturnType<typeof useSymbolIndex>;
  refsResult: FindReferencesResult | null;
  setRefsResult: Dispatch<SetStateAction<FindReferencesResult | null>>;
  longArc: ReturnType<typeof useLongArcVerifier>;
  handleJump: (episodeId: number, charOffset?: number) => void;
  foreshadowMarkers: ReturnType<typeof import("@/lib/long-arc-verifier/foreshadow-tracker").extractAllForeshadowMarkers>;
  debuggerState: ReturnType<typeof useStoryDebugger>;
  readerSim: ReturnType<typeof useReaderSimulation>;
  semanticDiffResult: SemanticDiffResult;
  journalView: JournalView;
  setJournalView: Dispatch<SetStateAction<JournalView>>;
  setSubmissionOpen: Dispatch<SetStateAction<boolean>>;
  creativeEvents: CreativeEvent[];
  certLang: CertificateLanguage;
};

export function NovelIDELauncherTabBody({
  tab,
  language,
  isKO,
  config,
  episodes,
  messages,
  symbolIndex,
  refsResult,
  setRefsResult,
  longArc,
  handleJump,
  foreshadowMarkers,
  debuggerState,
  readerSim,
  semanticDiffResult,
  journalView,
  setJournalView,
  setSubmissionOpen,
  creativeEvents,
  certLang,
}: NovelIDELauncherTabBodyProps) {
  return (
    <div className="flex-1 overflow-hidden p-3">
      {tab === "outline" && (
        <div className="space-y-3 h-full overflow-y-auto">
          <SymbolOutlinePanel index={symbolIndex} language={language} />
          {refsResult && (
            <ReferencesPanel
              result={refsResult}
              language={language}
              onClose={() => setRefsResult(null)}
            />
          )}
        </div>
      )}
      {tab === "long-arc" && (
        <div className="space-y-3 h-full overflow-y-auto">
          <LongArcReportPanel
            report={longArc.report}
            loading={longArc.loading}
            language={language}
            episodes={episodes ?? undefined}
            onRefresh={longArc.refresh}
            onJump={handleJump}
          />
          {episodes && episodes.length > 0 && (
            <LongArcGraph
              trajectory={buildTensionTrajectory(episodes)}
              language={language}
            />
          )}
          <ForeshadowLedger markers={foreshadowMarkers} language={language} onJump={handleJump} />
        </div>
      )}
      {tab === "debugger" && (
        <DebuggerPanel
          isRunning={debuggerState.isRunning}
          currentLocation={debuggerState.currentLocation}
          frame={debuggerState.frame}
          breakpoints={debuggerState.breakpoints}
          watches={debuggerState.watches}
          callHierarchy={debuggerState.callHierarchy}
          language={language}
          characters={config?.characters}
          episodes={episodes ?? undefined}
          onStart={() => debuggerState.start()}
          onPause={debuggerState.pause}
          onStop={debuggerState.stop}
          onStepOver={debuggerState.stepOver}
          onStepInto={debuggerState.stepInto}
          onAddWatch={debuggerState.addWatch}
          onRemoveWatch={debuggerState.removeWatch}
          onToggleBreakpoint={debuggerState.toggleBp}
        />
      )}
      {tab === "reader-sim" && (
        <div className="space-y-3 h-full overflow-y-auto">
          <ReaderProfilePanel
            profile={readerSim.profile}
            loading={readerSim.loading}
            language={language}
            onRefresh={readerSim.refresh}
          />
          {readerSim.profile && readerSim.profile.predictions.length > 0 && (
            <DropoutHeatmap profile={readerSim.profile} language={language} />
          )}
        </div>
      )}
      {tab === "diff" && (
        <SemanticDiffPanel
          result={semanticDiffResult}
          language={language}
          beforeLabel={
            episodes && episodes.length >= 2
              ? `EP${episodes[episodes.length - 2].episode}`
              : undefined
          }
          afterLabel={
            episodes && episodes.length >= 1
              ? `EP${episodes[episodes.length - 1].episode}`
              : undefined
          }
        />
      )}
      {tab === "defense" && (
        <div className="space-y-3 h-full overflow-y-auto">
          <CompletionGapPanel messages={messages ?? undefined} language={language} />
          <MetaContextPanel language={language} />
        </div>
      )}
      {tab === "journal" && (
        <div className="space-y-3 h-full overflow-y-auto">
          <div className="flex items-center gap-2 p-2 border border-border bg-bg-secondary/50">
            <button
              type="button"
              onClick={() => setJournalView("inspector")}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border ${
                journalView === "inspector"
                  ? "border-text-primary bg-bg-primary text-text-primary"
                  : "border-border bg-transparent text-text-tertiary hover:text-text-primary"
              }`}
            >
              {isKO ? "기여도" : "Inspector"}
            </button>
            <button
              type="button"
              onClick={() => setJournalView("provenance")}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border ${
                journalView === "provenance"
                  ? "border-text-primary bg-bg-primary text-text-primary"
                  : "border-border bg-transparent text-text-tertiary hover:text-text-primary"
              }`}
            >
              {isKO ? "출처 보고서" : "Provenance"}
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setSubmissionOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-text-primary bg-text-primary text-bg-primary hover:opacity-90"
            >
              <Send className="w-3 h-3" aria-hidden="true" />
              {isKO ? "제출 묶음" : "Submit"}
            </button>
          </div>

          {journalView === "inspector" && (
            <CreativeContributionInspector
              events={creativeEvents}
              language={certLang}
              view="private"
              contextMeta={{
                sceneCount: episodes?.length,
                activeCharacters: config?.characters?.map((character) => character.name).slice(0, 8),
              }}
              compact
            />
          )}
          {journalView === "provenance" && (
            <ProvenanceReport
              events={creativeEvents}
              language={certLang}
              workTitle={config?.synopsis?.slice(0, 40) ?? undefined}
            />
          )}
        </div>
      )}
      {tab === "settings" && <NovelIDESettingsPanel language={language} />}
    </div>
  );
}
