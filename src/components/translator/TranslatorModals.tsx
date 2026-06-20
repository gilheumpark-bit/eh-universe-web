"use client";

import React from "react";
import { APIKeySlotManager } from "@/components/home/APIKeySlotManager";
import { AppDialog } from "@/components/ui/AppDialog";
import type { DialogState } from "@/hooks/useAppDialog";

interface TranslatorModalsProps {
  showApiKeyModal: boolean;
  onCloseApiKeyModal: () => void;
  dialog: DialogState | null;
  onDismiss: () => void;
  onConfirmYes: () => void;
  onAlertOk: () => void;
}

/**
 * Modals rendered at the bottom of TranslatorStudioApp:
 * - API Key configuration modal
 * - Generic alert/confirm dialog
 */
export const TranslatorModals = React.memo(function TranslatorModals({
  showApiKeyModal,
  onCloseApiKeyModal,
  dialog,
  onDismiss,
  onConfirmYes,
  onAlertOk,
}: TranslatorModalsProps) {
  return (
    <>
      {showApiKeyModal && (
        <APIKeySlotManager onClose={onCloseApiKeyModal} />
      )}
      {dialog && (
        <AppDialog
          open
          variant={dialog.kind === "confirm" ? "confirm" : "alert"}
          title={dialog.title ?? "\uC54C\uB9BC"}
          message={dialog.message}
          onClose={onDismiss}
          onConfirm={onConfirmYes}
          onAlertOk={onAlertOk}
        />
      )}
    </>
  );
});
