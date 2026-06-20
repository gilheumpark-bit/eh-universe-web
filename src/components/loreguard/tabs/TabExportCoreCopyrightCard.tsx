import type {
  CoreCopyrightPackage,
  CoreCopyrightStatus,
} from "@/lib/creative-process/core-copyright-package";
import { Book, Download, Layers, Quote, Shield } from "../icons";

type TabExportCoreCopyrightCardProps = {
  coreCopyrightPackage: CoreCopyrightPackage;
  onDownload: () => void;
};

function statusDotClass(status: CoreCopyrightStatus): string {
  if (status === "ready") return "green";
  if (status === "review") return "amber";
  return "red";
}

function statusLabelKo(status: CoreCopyrightStatus): string {
  if (status === "ready") return "준비";
  if (status === "review") return "보강";
  return "미작성";
}

function readinessLabelKo(score: number): string {
  if (score >= 80) return "제안 준비";
  if (score >= 55) return "보강 권장";
  return "필수 보강";
}

export default function TabExportCoreCopyrightCard({
  coreCopyrightPackage,
  onDownload,
}: TabExportCoreCopyrightCardProps) {
  const readinessTone =
    coreCopyrightPackage.readiness.score >= 80
      ? "green"
      : coreCopyrightPackage.readiness.score >= 55
        ? "amber"
        : "red";

  return (
    <div className="pcard" aria-label="코어 저작권 등록 준비 패키지">
      <div className="pcard-h">
        <Shield size={15} />
        코어 저작권 패키지
        <span className={"pill " + readinessTone} style={{ marginLeft: "auto" }}>
          {readinessLabelKo(coreCopyrightPackage.readiness.score)}
        </span>
      </div>
      <div className="wr-srow" style={{ color: "var(--ink-3)", alignItems: "flex-start" }}>
        <span style={{ flex: 1 }}>
          세계관·캐릭터·메인 시나리오를 권리 거래 기준본으로 묶고, 등록 내용설명 3안까지 함께 정리합니다.
        </span>
      </div>
      <div className="wr-srow" style={{ color: "var(--ink-3)", alignItems: "flex-start" }}>
        <span>준비도</span>
        <b style={{ textAlign: "right" }}>{coreCopyrightPackage.readiness.summaryKo}</b>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
        {coreCopyrightPackage.documents.map((documentItem) => (
          <div
            key={documentItem.id}
            className="wr-srow"
            style={{ alignItems: "flex-start", borderTop: "1px solid var(--line)" }}
          >
            <span className={"rdot " + statusDotClass(documentItem.status)} style={{ marginTop: 5 }} />
            <span style={{ minWidth: 0, flex: 1 }}>
              <b>{documentItem.labelKo}</b>
              <span style={{ display: "block", color: "var(--ink-3)", fontSize: 11.5 }}>
                {documentItem.summaryKo}
              </span>
            </span>
          </div>
        ))}
      </div>
      <details className="lg-ip-pack-inline-detail">
        <summary>
          <Book size={13} />
          기준본 산출물
          <span className="pill gray">{coreCopyrightPackage.deliverablesKo.length}개</span>
        </summary>
        <div className="lg-ip-pack-inline-detail-body" aria-label="코어 저작권 기준본 산출물">
          {coreCopyrightPackage.deliverablesKo.map((deliverable) => (
            <div key={deliverable} className="lg-ip-pack-form-row">
              <div>
                <b>{deliverable}</b>
                <span>출고 패키지와 권리/IP 점검 흐름에서 재사용합니다.</span>
              </div>
              <strong>포함</strong>
            </div>
          ))}
        </div>
      </details>
      <details className="lg-ip-pack-inline-detail">
        <summary>
          <Layers size={13} />
          Canon Matrix
          <span className="pill gray">{coreCopyrightPackage.canonMatrix.length}행</span>
        </summary>
        <div className="lg-ip-pack-inline-detail-body" aria-label="코어 저작권 Canon Matrix">
          {coreCopyrightPackage.canonMatrix.length > 0 ? (
            coreCopyrightPackage.canonMatrix.slice(0, 6).map((row) => (
              <div key={row.id} className="lg-ip-pack-form-row">
                <div>
                  <b>{row.assetTypeKo} · {row.assetKo}</b>
                  <span>{row.worldLinkKo} / {row.scenarioLinkKo}</span>
                </div>
                <strong>{row.rightsNoteKo}</strong>
              </div>
            ))
          ) : (
            <div className="lg-ip-pack-form-row">
              <div>
                <b>작성 대기</b>
                <span>캐릭터, 아이템, 사건 또는 회차 원고가 쌓이면 연결표가 만들어집니다.</span>
              </div>
              <strong>보강</strong>
            </div>
          )}
        </div>
      </details>
      <details className="lg-ip-pack-inline-detail">
        <summary>
          <Quote size={13} />
          오리지널리티 설명문
          <span className="pill gray">작가 확인</span>
        </summary>
        <div className="lg-ip-pack-inline-detail-body" aria-label="코어 저작권 오리지널리티 설명문">
          <div className="lg-ip-pack-note">{coreCopyrightPackage.originalityDeclaration.draftTextKo}</div>
          {coreCopyrightPackage.originalityDeclaration.fields.map((field) => (
            <div key={field.id} className="lg-ip-pack-form-row">
              <div>
                <b>{field.labelKo}</b>
                <span>{field.valueKo}</span>
              </div>
              <strong>{statusLabelKo(field.status)}</strong>
            </div>
          ))}
        </div>
      </details>
      <div className="lg-ip-pack-form-list" aria-label="코어 저작권 권리 체크리스트">
        {coreCopyrightPackage.rightsChecklist.map((item) => (
          <div key={item.id} className="lg-ip-pack-form-row">
            <div>
              <b>{item.labelKo}</b>
              <span>{item.detailKo}</span>
            </div>
            <strong>{statusLabelKo(item.status)}</strong>
          </div>
        ))}
      </div>
      <button type="button" className="mini-btn" onClick={onDownload}>
        <Download size={13} />
        코어 패키지 내려받기
      </button>
      <div className="wr-srow" style={{ color: "var(--ink-3)", fontSize: 11.5 }}>
        뜨기 전 기준본을 만들어 두고, 이후 제안서·계약 조건 비교의 기준 자료로 재사용합니다.
      </div>
    </div>
  );
}
