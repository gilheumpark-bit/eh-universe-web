import {
  applyReleaseCreditLedgerOperation,
  buildReleaseCreditDebitOperationFromPreview,
  buildReleaseCreditPreview,
  createReleaseCreditLedgerSnapshot,
  RELEASE_CREDIT_POLICY_CHECKED_AT,
} from "../release-credit-ledger";

describe("release credit ledger preview", () => {
  it("shows included credit debit preview without mutating billing state", () => {
    const preview = buildReleaseCreditPreview({
      planId: "studio",
      packageProfileId: "external-submission",
      projectId: "project-rights-ledger",
      workTitle: "권리 원장 테스트",
      certificateId: "cert-rights-ledger",
    });

    expect(preview.status).toBe("included");
    expect(preview.canUseIncludedCredits).toBe(true);
    expect(preview.purchaseRequired).toBe(false);
    expect(preview.requiredCredits).toBe(10);
    expect(preview.remainingCredits).toBe(0);
    expect(preview.projectScoped).toBe(true);
    expect(preview.projectScopeNoteKo).toContain("project-rights-ledger");
    expect(preview.debitPreviewKo).toBe("완결 과정기록 발급 시 10개 사용, 차감 후 0개 남습니다.");
    expect(preview.receiptDraftKo).toBe("완결 과정기록 · 10개 사용 예정 · 잔여 0개");
    expect(preview.ledgerNoteKo).toContain("실제 차감은 결제/발급 승인 이후");
    expect(preview.eventDraft).toMatchObject({
      projectId: "project-rights-ledger",
      projectScoped: true,
      certificateId: "cert-rights-ledger",
      statusKo: "포함 크레딧 사용 가능",
      projectScopeNoteKo: "프로젝트 project-rights-ledger 기준으로 원장 키를 분리합니다.",
      checkedAt: RELEASE_CREDIT_POLICY_CHECKED_AT,
    });
  });

  it("keeps separate purchase as guidance when credits are insufficient", () => {
    const preview = buildReleaseCreditPreview({
      planId: "starter",
      packageProfileId: "external-submission",
      availableCreditsOverride: 3,
    });

    expect(preview.status).toBe("upgrade");
    expect(preview.canUseIncludedCredits).toBe(false);
    expect(preview.upgradeRecommended).toBe(true);
    expect(preview.purchaseRequired).toBe(false);
    expect(preview.projectScoped).toBe(false);
    expect(preview.ledgerNoteKo).toBe("프로젝트가 확정되기 전에는 실제 차감 원장을 만들지 않습니다.");
    expect(preview.eventDraft.projectId).toBe("project-draft");
    expect(preview.receiptDraftKo).toBe("완결 과정기록 · 상위 권한 검토 후 발급");
  });

  it("records publisher plans as organization ledger previews", () => {
    const preview = buildReleaseCreditPreview({
      planId: "publisher",
      packageProfileId: "ip-sale",
      projectId: "publisher-project",
    });

    expect(preview.status).toBe("unlimited");
    expect(preview.remainingCredits).toBeNull();
    expect(preview.eventDraft.statusKo).toBe("조직 권한 협의");
    expect(preview.debitPreviewKo).toContain("조직 원장에서 수량 협의");
  });

  it("keeps long project ids separated in idempotency keys", () => {
    const prefix = "project-" + "same-prefix-".repeat(8);
    const first = buildReleaseCreditPreview({
      planId: "pro",
      packageProfileId: "ip-sale",
      projectId: `${prefix}A`,
      workTitle: "긴 프로젝트 격리",
      certificateId: "cert-long-project",
    });
    const second = buildReleaseCreditPreview({
      planId: "pro",
      packageProfileId: "ip-sale",
      projectId: `${prefix}B`,
      workTitle: "긴 프로젝트 격리",
      certificateId: "cert-long-project",
    });

    expect(first.eventDraft.projectId).not.toBe(second.eventDraft.projectId);
    expect(first.eventDraft.idempotencyKey).not.toBe(second.eventDraft.idempotencyKey);
    expect(first.eventDraft.projectId.length).toBeLessThanOrEqual(48);
    expect(second.eventDraft.projectId.length).toBeLessThanOrEqual(48);
  });

  it("applies debit once and blocks duplicate or over-debit attempts", () => {
    const snapshot = createReleaseCreditLedgerSnapshot({
      userId: "uid-ledger",
      planId: "studio",
      periodKey: "2026-06",
      projectId: "project-rights-ledger",
      createdAt: "2026-06-15T00:00:00.000Z",
    });
    const preview = buildReleaseCreditPreview({
      planId: "studio",
      packageProfileId: "external-submission",
      projectId: "project-rights-ledger",
      workTitle: "권리 원장 테스트",
      certificateId: "cert-rights-ledger",
    });
    const debit = buildReleaseCreditDebitOperationFromPreview(preview, {
      createdAt: "2026-06-15T00:01:00.000Z",
    });

    const first = applyReleaseCreditLedgerOperation(snapshot, debit);
    expect(first.status).toBe("applied");
    expect(first.snapshot.balance).toBe(0);
    expect(first.entry?.balanceBefore).toBe(10);
    expect(first.entry?.balanceAfter).toBe(0);

    const duplicate = applyReleaseCreditLedgerOperation(first.snapshot, debit);
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.snapshot.entries).toHaveLength(first.snapshot.entries.length);

    const secondDebit = {
      ...debit,
      idempotencyKey: `${debit.idempotencyKey}:second`,
      certificateId: "cert-rights-ledger-2",
      createdAt: "2026-06-15T00:02:00.000Z",
    };
    const blocked = applyReleaseCreditLedgerOperation(first.snapshot, secondDebit);
    expect(blocked.status).toBe("insufficient-credits");
    expect(blocked.snapshot.balance).toBe(0);
  });

  it("restores credits through a refund or void operation", () => {
    const snapshot = createReleaseCreditLedgerSnapshot({
      userId: "uid-ledger",
      planId: "studio",
      periodKey: "2026-06",
      projectId: "project-refund",
      createdAt: "2026-06-15T00:00:00.000Z",
    });
    const preview = buildReleaseCreditPreview({
      planId: "studio",
      packageProfileId: "external-submission",
      projectId: "project-refund",
      workTitle: "환불 테스트",
      certificateId: "cert-refund",
    });
    const debitResult = applyReleaseCreditLedgerOperation(
      snapshot,
      buildReleaseCreditDebitOperationFromPreview(preview, {
        createdAt: "2026-06-15T00:01:00.000Z",
      }),
    );
    const refund = applyReleaseCreditLedgerOperation(debitResult.snapshot, {
      kind: "refund-credit",
      idempotencyKey: "release-credit-refund:project-refund:cert-refund",
      creditAmount: 10,
      projectId: "project-refund",
      planId: "studio",
      packageProfileId: "external-submission",
      productId: "complete-basic",
      certificateId: "cert-refund",
      reasonKo: "발급 취소에 따른 크레딧 복구",
      createdAt: "2026-06-15T00:03:00.000Z",
    });

    expect(refund.status).toBe("applied");
    expect(refund.snapshot.balance).toBe(10);
    expect(refund.entry?.balanceBefore).toBe(0);
    expect(refund.entry?.balanceAfter).toBe(10);
  });

  it("records publisher debits without finite balance mutation", () => {
    const snapshot = createReleaseCreditLedgerSnapshot({
      userId: "uid-publisher",
      planId: "publisher",
      periodKey: "2026-06",
      projectId: "publisher-project",
      createdAt: "2026-06-15T00:00:00.000Z",
    });
    const preview = buildReleaseCreditPreview({
      planId: "publisher",
      packageProfileId: "ip-sale",
      projectId: "publisher-project",
      certificateId: "cert-publisher",
    });
    const debit = applyReleaseCreditLedgerOperation(
      snapshot,
      buildReleaseCreditDebitOperationFromPreview(preview, {
        createdAt: "2026-06-15T00:01:00.000Z",
      }),
    );

    expect(snapshot.unlimited).toBe(true);
    expect(snapshot.balance).toBeNull();
    expect(debit.status).toBe("applied");
    expect(debit.snapshot.balance).toBeNull();
    expect(debit.entry?.balanceBefore).toBeNull();
    expect(debit.entry?.balanceAfter).toBeNull();
  });
});
