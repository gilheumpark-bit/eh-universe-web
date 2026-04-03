import React from 'react';
import dynamic from 'next/dynamic';
import LoadingSkeleton from '@/components/studio/LoadingSkeleton';
import { APIKeySlotManager } from '@/components/home/APIKeySlotManager';
import { ConfirmModal } from '@/components/studio/UXHelpers';
import { MoveSessionModal, SaveSlotModal } from '@/components/studio/StudioModals';
import StudioToasts from '@/components/studio/StudioToasts';
import { INITIAL_CONFIG } from '@/hooks/useProjectManager';
import type { ChatSession, AppTab, AppLanguage } from '@/lib/studio-types';

const DynSkeleton = () => <LoadingSkeleton height={120} />;
const QuickStartModal = dynamic(() => import('@/components/studio/QuickStartModal'), { ssr: false, loading: DynSkeleton });

interface StudioOverlayManagerProps {
  language: AppLanguage;
  isKO: boolean;
  showQuickStartModal: boolean;
  setShowQuickStartModal: (v: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleQuickStart: any;
  isQuickGenerating: boolean;
  showApiKeyModal: boolean;
  setShowApiKeyModal: (v: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hostedProviders: any;
  setApiKeyVersion: React.Dispatch<React.SetStateAction<number>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  confirmState: any;
  closeConfirm: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  moveModal: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setMoveModal: (v: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  moveSessionToProject: any;
  saveSlotModalOpen: boolean;
  setSaveSlotModalOpen: (v: boolean) => void;
  activeTab: AppTab;
  currentSession: ChatSession | null | undefined;
  updateCurrentSession: (update: Partial<ChatSession>) => void;
  triggerSave: () => void;
  showSyncReminder: boolean;
  setShowSyncReminder: (v: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  lastSyncTime: number | null;
  handleSync: () => void;
  signInWithGoogle: () => void;
  storageFull: boolean;
  setStorageFull: (v: boolean) => void;
  exportAllJSON: () => void;
  fallbackNotice: string | null;
  setFallbackNotice: (v: string | null) => void;
  exportDoneFormat: string | null;
  worldImportBanner: boolean;
  setWorldImportBanner: React.Dispatch<React.SetStateAction<boolean>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uxError: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setUxError: (v: any) => void;
  alertToast: { message: string; variant: string } | null;
  setAlertToast: (v: { message: string; variant: string } | null) => void;
}

export default function StudioOverlayManager({
  language, isKO,
  showQuickStartModal, setShowQuickStartModal, handleQuickStart, isQuickGenerating,
  showApiKeyModal, setShowApiKeyModal, hostedProviders, setApiKeyVersion,
  confirmState, closeConfirm,
  moveModal, setMoveModal, moveSessionToProject,
  saveSlotModalOpen, setSaveSlotModalOpen, activeTab, currentSession, updateCurrentSession, triggerSave,
  showSyncReminder, setShowSyncReminder, user, lastSyncTime, handleSync, signInWithGoogle,
  storageFull, setStorageFull, exportAllJSON,
  fallbackNotice, setFallbackNotice, exportDoneFormat,
  worldImportBanner, setWorldImportBanner,
  uxError, setUxError,
  alertToast, setAlertToast
}: StudioOverlayManagerProps) {
  return (
    <>
      <QuickStartModal
        language={language}
        isOpen={showQuickStartModal}
        onClose={() => setShowQuickStartModal(false)}
        onStart={handleQuickStart}
        isGenerating={isQuickGenerating}
      />

      {showApiKeyModal && (
        <APIKeySlotManager
          onClose={() => { setShowApiKeyModal(false); setApiKeyVersion(v => v + 1); }}
        />
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        variant={confirmState.variant}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />

      {moveModal && <MoveSessionModal data={moveModal} language={language} onMove={moveSessionToProject} onClose={() => setMoveModal(null)} />}

      {saveSlotModalOpen && <SaveSlotModal language={language} activeTab={activeTab} config={currentSession?.config}
        onSave={(slot) => {
          updateCurrentSession({ config: { ...(currentSession?.config || INITIAL_CONFIG), savedSlots: [...(currentSession?.config?.savedSlots || []), slot] } });
          triggerSave();
        }}
        onClose={() => setSaveSlotModalOpen(false)} />}

      <StudioToasts
        language={language} isKO={isKO}
        showSyncReminder={showSyncReminder} setShowSyncReminder={setShowSyncReminder}
        user={user} lastSyncTime={lastSyncTime} handleSync={handleSync} signInWithGoogle={signInWithGoogle}
        storageFull={storageFull} setStorageFull={setStorageFull} exportAllJSON={exportAllJSON}
        fallbackNotice={fallbackNotice} setFallbackNotice={setFallbackNotice}
        exportDoneFormat={exportDoneFormat}
        worldImportBanner={worldImportBanner} setWorldImportBanner={setWorldImportBanner}
        uxError={uxError} setUxError={setUxError}
      />
      {alertToast && (
        <div className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 max-w-md text-sm ${
          alertToast.variant === 'error' ? 'bg-red-900/95 border border-red-600 text-red-100'
          : alertToast.variant === 'info' ? 'bg-blue-900/95 border border-blue-600 text-blue-100'
          : 'bg-amber-900/95 border border-amber-600 text-amber-100'
        }`}>
          <span>{alertToast.variant === 'error' ? '\u274C' : alertToast.variant === 'info' ? '\u2139\uFE0F' : '\u26A0\uFE0F'} {alertToast.message}</span>
          <button onClick={() => setAlertToast(null)} className="ml-2 opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}
    </>
  );
}
