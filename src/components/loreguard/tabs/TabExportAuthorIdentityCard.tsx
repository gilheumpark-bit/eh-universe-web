import { Book, Shield } from "../icons";

type TabExportAuthorIdentityCardProps = {
  authorDisplayName: string;
  authorLegalName: string;
  workTitle: string;
  authorAliasStatementKo: string;
  onChange: (field: "authorDisplayName" | "authorLegalName", value: string) => void;
};

function identityTone(displayName: string, legalName: string): string {
  if (displayName.trim() && legalName.trim()) return "green";
  if (displayName.trim() || legalName.trim()) return "amber";
  return "red";
}

function identityLabel(displayName: string, legalName: string): string {
  if (displayName.trim() && legalName.trim()) return "문안 생성";
  if (displayName.trim() || legalName.trim()) return "한 항목 보강";
  return "입력 필요";
}

export default function TabExportAuthorIdentityCard({
  authorDisplayName,
  authorLegalName,
  workTitle,
  authorAliasStatementKo,
  onChange,
}: TabExportAuthorIdentityCardProps) {
  const tone = identityTone(authorDisplayName, authorLegalName);

  return (
    <div className="pcard" aria-label="작가 등록 정보">
      <div className="pcard-h">
        <Shield size={15} />
        작가 등록 정보
        <span className={"pill tex-push " + tone}>
          {identityLabel(authorDisplayName, authorLegalName)}
        </span>
      </div>
      <div className="wr-srow tex-muted-row-start">
        <span className="tex-copy-flex">
          저작권 등록 준비 문안에서 제호, 필명, 실명 확인문이 흔들리지 않도록 작가 기준값을 먼저 고정합니다.
        </span>
      </div>
      <div className="lg-author-id-grid">
        <label className="lg-author-id-field">
          <span>작가 표시명</span>
          <input
            aria-label="작가 표시명"
            value={authorDisplayName}
            onChange={(event) => onChange("authorDisplayName", event.target.value)}
            placeholder="예: HGGPT 또는 필명"
          />
        </label>
        <label className="lg-author-id-field">
          <span>작가 실명</span>
          <input
            aria-label="작가 실명"
            value={authorLegalName}
            onChange={(event) => onChange("authorLegalName", event.target.value)}
            placeholder="예: 박길흠"
          />
        </label>
      </div>
      <div className="lg-ip-pack-form-list" aria-label="등록 정보 반영 상태">
        <div className="lg-ip-pack-form-row">
          <div>
            <span>제호</span>
            <b>{workTitle || "무제 작품"}</b>
          </div>
          <strong>작품 기준</strong>
        </div>
        <div className="lg-ip-pack-form-row">
          <div>
            <span>필명 확인문</span>
            <b>{authorAliasStatementKo}</b>
          </div>
          <strong>{tone === "green" ? "검토" : "보강"}</strong>
        </div>
      </div>
      <div className="wr-srow tex-footnote-row">
        <Book size={13} />
        입력값은 등록 준비 3안과 코어 저작권 패키지의 문안에 반영됩니다.
      </div>
    </div>
  );
}
