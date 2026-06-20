import { EMPTY_EXPORT_PREVIEW } from "@/components/loreguard/tabs/TabExport.constants";
import { Check, Plus } from "../icons";

type TabExportEmptyStateProps = {
  onCreateProject: () => void;
};

export default function TabExportEmptyState({ onCreateProject }: TabExportEmptyStateProps) {
  return (
    <div className="wd-grid wd-export-grid lg-export-empty-grid">
      <section className="wd-center lg-export-empty" data-testid="export-empty-preview">
        <div className="lg-export-empty-hero">
          <span className="pill gray">출고 패키지 · 과정기록 · 권리/IP</span>
          <h2>작품이 준비되면 이 화면이 제출용 묶음으로 채워집니다</h2>
          <p>
            출고는 단순 다운로드가 아니라 작가의 결정, 권리/IP 메모, 제출 자료를 한 번에 정리하는 마지막 작업대입니다.
          </p>
          <div className="lg-export-empty-actions">
            <button type="button" className="btn" onClick={onCreateProject}>
              <Plus size={15} />
              프로젝트 만들기
            </button>
            <span>원고 저장 후 실제 값으로 자동 전환</span>
          </div>
        </div>

        <div className="lg-export-empty-preview" aria-label="출고 패키지 미리보기">
          {EMPTY_EXPORT_PREVIEW.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.titleKo} className="lg-export-empty-card">
                <div className="lg-export-empty-card-head">
                  <Icon size={18} />
                  <b>{item.titleKo}</b>
                  <span>미리보기</span>
                </div>
                <p>{item.detailKo}</p>
                <ul>
                  {item.itemsKo.map((label) => (
                    <li key={label}>
                      <Check size={13} />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
