import { resolveLoreguardStorageStatus } from "@/lib/loreguard/storage-status";

describe("loreguard storage status", () => {
  it("저장 전/저장 중/저장됨을 공통 모델로 해석한다", () => {
    expect(resolveLoreguardStorageStatus({}).kind).toBe("idle");
    expect(resolveLoreguardStorageStatus({}).label).toBe("저장 전");

    const saving = resolveLoreguardStorageStatus({ saveFlash: true });
    expect(saving).toMatchObject({ kind: "saving", tone: "info", synced: false });
    expect(saving.label).toBe("저장 중…");

    const saved = resolveLoreguardStorageStatus({ lastSaveTime: 1710000000000 });
    expect(saved).toMatchObject({ kind: "saved", tone: "success", synced: true });
    expect(saved.label).toBe("저장됨");
  });

  it("오류와 충돌은 저장됨보다 우선한다", () => {
    expect(
      resolveLoreguardStorageStatus({ lastSaveTime: 1710000000000, conflictCount: 1 }),
    ).toMatchObject({ kind: "conflict", tone: "danger", synced: false });

    expect(
      resolveLoreguardStorageStatus({
        saveFailed: true,
        lastSaveTime: 1710000000000,
        conflictCount: 1,
      }),
    ).toMatchObject({ kind: "error", label: "저장 실패", tone: "danger", synced: false });
  });

  it("저장 대기 중인 변경은 마지막 저장 시각보다 우선한다", () => {
    expect(
      resolveLoreguardStorageStatus({ lastSaveTime: 1710000000000, dirty: true }),
    ).toMatchObject({ kind: "dirty", label: "변경 있음", tone: "warning", synced: false });
  });

  it("오프라인 상태는 저장됨보다 우선해 표시한다", () => {
    expect(
      resolveLoreguardStorageStatus({ lastSaveTime: 1710000000000, offline: true }),
    ).toMatchObject({ kind: "offline", label: "오프라인 저장", tone: "warning", synced: false });
  });

  it("원격 동기화 중이면 저장됨보다 우선해 짧게 표시한다", () => {
    expect(
      resolveLoreguardStorageStatus({ lastSaveTime: 1710000000000, pendingSync: true }),
    ).toMatchObject({ kind: "pending-sync", label: "동기화 중", tone: "warning", synced: false });
  });

  it("원격 동기화 실패는 로컬 저장 실패와 다른 라벨로 표시한다", () => {
    expect(
      resolveLoreguardStorageStatus({ lastSaveTime: 1710000000000, syncFailed: true }),
    ).toMatchObject({ kind: "sync-error", label: "동기화 실패", tone: "warning", synced: false });

    expect(
      resolveLoreguardStorageStatus({
        saveFailed: true,
        syncFailed: true,
        lastSaveTime: 1710000000000,
      }),
    ).toMatchObject({ kind: "error", label: "저장 실패", tone: "danger", synced: false });
  });

  it("원격 권한 확인 필요는 저장됨보다 우선하되 충돌보다 낮다", () => {
    expect(
      resolveLoreguardStorageStatus({ lastSaveTime: 1710000000000, permissionNeeded: true }),
    ).toMatchObject({ kind: "permission-needed", label: "권한 확인 필요", tone: "warning", synced: false });

    expect(
      resolveLoreguardStorageStatus({
        lastSaveTime: 1710000000000,
        permissionNeeded: true,
        syncFailed: true,
        conflictCount: 1,
      }),
    ).toMatchObject({ kind: "conflict", tone: "danger", synced: false });
  });

  it("사용자에게 길게 보이던 멀티탭 권한 문구를 상태 라벨로 재사용하지 않는다", () => {
    const pending = resolveLoreguardStorageStatus({ pendingSync: true });
    expect(pending).toMatchObject({ kind: "pending-sync", label: "동기화 중" });
    expect(pending.label).not.toContain("저장 동기화 대기");
    expect(pending.label).not.toContain("권한");
  });

  it("4언어 라벨을 제공한다", () => {
    expect(resolveLoreguardStorageStatus({ saveFailed: true }, "EN").label).toBe("Save failed");
    expect(resolveLoreguardStorageStatus({ saveFailed: true }, "JP").label).toBe("保存失敗");
    expect(resolveLoreguardStorageStatus({ saveFailed: true }, "CN").label).toBe("保存失败");
    expect(resolveLoreguardStorageStatus({ syncFailed: true }, "EN").label).toBe("Sync failed");
  });
});
