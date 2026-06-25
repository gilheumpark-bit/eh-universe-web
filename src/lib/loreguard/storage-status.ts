import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";

export type LoreguardStorageStatusKind =
  | "idle"
  | "loading"
  | "empty"
  | "dirty"
  | "saving"
  | "saved"
  | "pending-sync"
  | "sync-error"
  | "offline"
  | "permission-needed"
  | "conflict"
  | "error"
  | "recoverable";

export type LoreguardStorageTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface LoreguardStorageStatusInput {
  loading?: boolean;
  saveFlash?: boolean;
  saveFailed?: boolean;
  lastSaveTime?: number | null;
  dirty?: boolean;
  pendingSync?: boolean;
  syncFailed?: boolean;
  offline?: boolean;
  permissionNeeded?: boolean;
  conflictCount?: number;
  recoverable?: boolean;
  empty?: boolean;
}

export interface LoreguardStorageStatus {
  kind: LoreguardStorageStatusKind;
  tone: LoreguardStorageTone;
  label: string;
  ariaLabel: string;
  synced: boolean;
}

const STATUS_TONE: Record<LoreguardStorageStatusKind, LoreguardStorageTone> = {
  idle: "neutral",
  loading: "info",
  empty: "neutral",
  dirty: "warning",
  saving: "info",
  saved: "success",
  "pending-sync": "warning",
  "sync-error": "warning",
  offline: "warning",
  "permission-needed": "warning",
  conflict: "danger",
  error: "danger",
  recoverable: "warning",
};

function labelFor(kind: LoreguardStorageStatusKind, language: AppLanguage): string {
  switch (kind) {
    case "loading":
      return L4(language, { ko: "저장 확인 중", en: "Checking save", ja: "保存確認中", zh: "正在检查保存" });
    case "empty":
      return L4(language, { ko: "작업 없음", en: "No work yet", ja: "作業なし", zh: "暂无工作" });
    case "dirty":
      return L4(language, { ko: "변경 있음", en: "Unsaved changes", ja: "変更あり", zh: "有未保存更改" });
    case "saving":
      return L4(language, { ko: "저장 중…", en: "Saving…", ja: "保存中…", zh: "正在保存…" });
    case "saved":
      return L4(language, { ko: "저장됨", en: "Saved", ja: "保存済み", zh: "已保存" });
    case "pending-sync":
      return L4(language, { ko: "동기화 중", en: "Syncing", ja: "同期中", zh: "同步中" });
    case "sync-error":
      return L4(language, { ko: "동기화 실패", en: "Sync failed", ja: "同期失敗", zh: "同步失败" });
    case "offline":
      return L4(language, { ko: "오프라인 저장", en: "Offline save", ja: "オフライン保存", zh: "离线保存" });
    case "permission-needed":
      return L4(language, { ko: "권한 확인 필요", en: "Permission needed", ja: "権限確認が必要", zh: "需要确认权限" });
    case "conflict":
      return L4(language, { ko: "충돌 확인 필요", en: "Conflict needs review", ja: "競合確認が必要", zh: "需要检查冲突" });
    case "error":
      return L4(language, { ko: "저장 실패", en: "Save failed", ja: "保存失敗", zh: "保存失败" });
    case "recoverable":
      return L4(language, { ko: "복구 가능", en: "Recoverable", ja: "復旧可能", zh: "可恢复" });
    case "idle":
    default:
      return L4(language, { ko: "저장 전", en: "Not saved", ja: "未保存", zh: "尚未保存" });
  }
}

export function resolveLoreguardStorageStatus(
  input: LoreguardStorageStatusInput,
  language: AppLanguage = "KO",
): LoreguardStorageStatus {
  const conflictCount = Math.max(0, input.conflictCount ?? 0);

  let kind: LoreguardStorageStatusKind = "idle";
  if (input.saveFailed) kind = "error";
  else if (conflictCount > 0) kind = "conflict";
  else if (input.permissionNeeded) kind = "permission-needed";
  else if (input.syncFailed) kind = "sync-error";
  else if (input.offline) kind = "offline";
  else if (input.loading) kind = "loading";
  else if (input.saveFlash) kind = "saving";
  else if (input.pendingSync) kind = "pending-sync";
  else if (input.dirty) kind = "dirty";
  else if (input.recoverable) kind = "recoverable";
  else if (input.lastSaveTime) kind = "saved";
  else if (input.empty) kind = "empty";

  const label = labelFor(kind, language);
  return {
    kind,
    tone: STATUS_TONE[kind],
    label,
    ariaLabel: L4(language, {
      ko: `저장 상태: ${label}`,
      en: `Storage status: ${label}`,
      ja: `保存状態: ${label}`,
      zh: `保存状态：${label}`,
    }),
    synced: kind === "saved",
  };
}
