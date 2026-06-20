import {
  buildReleaseCreditLedgerDocumentPath,
} from "../release-credit-ledger-store";

describe("release credit ledger store keys", () => {
  it("separates ledgers by project id under the same user and period", () => {
    const common = { uid: "uid-release", periodKey: "2026-06" };

    expect(buildReleaseCreditLedgerDocumentPath({ ...common, projectId: "project-alpha" }))
      .not.toBe(buildReleaseCreditLedgerDocumentPath({ ...common, projectId: "project-beta" }));
  });

  it("keeps a stable document path for the same user, period, and project", () => {
    const lookup = {
      uid: "uid-release",
      periodKey: "2026-06",
      projectId: "project-alpha",
    };

    expect(buildReleaseCreditLedgerDocumentPath(lookup)).toBe(buildReleaseCreditLedgerDocumentPath(lookup));
  });
});
