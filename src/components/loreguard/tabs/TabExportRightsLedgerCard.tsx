import type { MediaIpPackRightsLedgerRow } from "@/lib/creative/media-ip-pack-markdown";
import { Scale } from "../icons";
import type { RightsLedgerDraft } from "@/components/loreguard/tabs/TabExport.rights-ledger";

type TabExportRightsLedgerCardProps = {
  rows: MediaIpPackRightsLedgerRow[];
  missingCount: number;
  missingLabelsByRowId: Map<string, string[]>;
  editingId: string | null;
  draft: RightsLedgerDraft | null;
  notice: string;
  onBeginEdit: (row: MediaIpPackRightsLedgerRow) => void;
  onUpdateDraft: (field: keyof Omit<RightsLedgerDraft, "id">, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

export default function TabExportRightsLedgerCard({
  rows,
  missingCount,
  missingLabelsByRowId,
  editingId,
  draft,
  notice,
  onBeginEdit,
  onUpdateDraft,
  onSave,
  onCancel,
}: TabExportRightsLedgerCardProps) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Scale size={15} />
        권리 원장
        <span
          className={"pill " + (missingCount > 0 ? "amber" : "green")}
          style={{ marginLeft: "auto" }}
        >
          {missingCount > 0 ? `필수 보강 ${missingCount}건` : `필수 확인 · ${rows.length}개`}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
        {rows.slice(0, 4).map((row) => {
          const rowId = row.id ?? row.categoryKo;
          const missingLabels = missingLabelsByRowId.get(rowId) ?? [];
          const isEditing = editingId === rowId && draft;
          return (
            <div
              key={rowId}
              className="wr-srow"
              style={{
                alignItems: "flex-start",
                borderTop: "1px solid var(--line)",
                gridColumn: editingId === rowId ? "1 / -1" : undefined,
              }}
            >
              {isEditing ? (
                <div style={{ display: "grid", gap: 8, width: "100%" }}>
                  <RightsLedgerInput label="항목" value={draft.categoryKo} field="categoryKo" onChange={onUpdateDraft} />
                  <RightsLedgerInput label="소유/주체" value={draft.ownerKo} field="ownerKo" onChange={onUpdateDraft} />
                  <RightsLedgerInput label="사용 범위" value={draft.usageScopeKo} field="usageScopeKo" onChange={onUpdateDraft} />
                  <RightsLedgerInput label="독점 여부" value={draft.exclusivityKo ?? ""} field="exclusivityKo" onChange={onUpdateDraft} />
                  <RightsLedgerInput label="기간" value={draft.termKo ?? ""} field="termKo" onChange={onUpdateDraft} />
                  <RightsLedgerInput label="지역" value={draft.regionKo ?? ""} field="regionKo" onChange={onUpdateDraft} />
                  <RightsLedgerInput label="매체" value={draft.mediaKo ?? ""} field="mediaKo" onChange={onUpdateDraft} />
                  <RightsLedgerInput label="근거 파일" value={draft.evidenceFileKo ?? ""} field="evidenceFileKo" onChange={onUpdateDraft} />
                  <RightsLedgerInput label="상태" value={draft.statusKo} field="statusKo" onChange={onUpdateDraft} />
                  <label className="wr-srow" style={{ alignItems: "flex-start" }}>
                    <span>메모</span>
                    <textarea
                      className="mini-btn"
                      value={draft.noteKo}
                      onChange={(event) => onUpdateDraft("noteKo", event.target.value)}
                      aria-label="권리 원장 메모"
                      rows={2}
                      style={{ flex: 1, minWidth: 0, justifyContent: "flex-start", resize: "vertical" }}
                    />
                  </label>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" className="mini-btn" onClick={onCancel}>
                      취소
                    </button>
                    <button type="button" className="mini-btn" onClick={onSave}>
                      저장
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="rdot blue" style={{ marginTop: 5 }} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <b>{row.categoryKo}</b>
                    <span style={{ display: "block", color: "var(--ink-3)", fontSize: 11.5 }}>
                      {row.statusKo}
                    </span>
                    <span style={{ display: "block", color: "var(--ink-3)", fontSize: 11.5 }}>
                      {row.usageScopeKo}
                    </span>
                    {missingLabels.length > 0 ? (
                      <span style={{ display: "block", color: "var(--c-amber)", fontSize: 11.5, marginTop: 4 }}>
                        보강: {missingLabels.slice(0, 4).join(" · ")}
                        {missingLabels.length > 4 ? ` 외 ${missingLabels.length - 4}건` : ""}
                      </span>
                    ) : (
                      <span style={{ display: "block", color: "var(--c-green)", fontSize: 11.5, marginTop: 4 }}>
                        필수 항목 채움
                      </span>
                    )}
                  </span>
                  <button type="button" className="mini-btn" onClick={() => onBeginEdit(row)}>
                    수정
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="wr-srow" style={{ color: "var(--ink-3)", marginTop: 8 }}>
        원고, 설정, 외부 자료, 번역, 매체 확장 권리 상태를 출고 패키지와 같은 기준으로 묶습니다.
      </div>
      {notice ? (
        <div className="wr-srow" style={{ color: "var(--ink-2)", fontSize: 12 }}>
          <span className="rdot green" />
          {notice}
        </div>
      ) : null}
    </div>
  );
}

function RightsLedgerInput({
  label,
  value,
  field,
  onChange,
}: {
  label: string;
  value: string;
  field: keyof Omit<RightsLedgerDraft, "id">;
  onChange: (field: keyof Omit<RightsLedgerDraft, "id">, value: string) => void;
}) {
  return (
    <label className="wr-srow" style={{ alignItems: "center" }}>
      <span>{label}</span>
      <input
        className="mini-btn"
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        aria-label={`권리 원장 ${label}`}
        style={{ flex: 1, minWidth: 0, justifyContent: "flex-start" }}
      />
    </label>
  );
}
