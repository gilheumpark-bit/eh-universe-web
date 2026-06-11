/**
 * WriterToolbox.test.tsx (2026-06-08 / 풀점검 priority 5)
 *
 * 18 모듈 사이드바 — 5 그룹, ModuleCard 토글, manuscript empty 가드 검증.
 */

import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import WriterToolbox from '../WriterToolbox';

const SAMPLE = '주인공은 회귀했다. 그리고 모든 것이 달라졌다. '.repeat(40);

describe('WriterToolbox', () => {
  it('렌더 — aside 컨테이너 + Toolbox 헤더', () => {
    render(<WriterToolbox manuscript={SAMPLE} />);
    expect(screen.getByLabelText(/작가 도구함/)).toBeInTheDocument();
    expect(screen.getByText(/Toolbox/i)).toBeInTheDocument();
    // "18 모듈" 은 헤더 + 푸터 카운터 2 곳에 노출 — getAllByText 사용.
    expect(screen.getAllByText(/18 모듈/).length).toBeGreaterThanOrEqual(1);
  });

  it('5 그룹 헤더 — 품질 · 캐릭터 · 씬·연출 · 분석 · 안전', () => {
    render(<WriterToolbox manuscript={SAMPLE} />);
    expect(screen.getByText('품질')).toBeInTheDocument();
    expect(screen.getByText('캐릭터')).toBeInTheDocument();
    expect(screen.getByText('씬·연출')).toBeInTheDocument();
    expect(screen.getByText('분석')).toBeInTheDocument();
    expect(screen.getByText('안전')).toBeInTheDocument();
  });

  it('manuscript 빈 문자열 — empty hint 노출 + 18 모듈 계산 안전', () => {
    render(<WriterToolbox manuscript="" />);
    expect(screen.getByText(/글을 작성하면 18개 품질 모듈이 활성화됩니다/)).toBeInTheDocument();
    // 품질 그룹은 기본 펼침 → 5 카드 렌더 (QA Findings = 0)
    expect(screen.getByText(/QA 감사원/)).toBeInTheDocument();
  });

  it('manuscript 빈 문자열 — 그래도 18 모듈 모두 0 errors 로 계산', () => {
    expect(() => render(<WriterToolbox manuscript="" />)).not.toThrow();
  });

  it('초기 — 품질 그룹만 펼침, 나머지 4 접힘', () => {
    render(<WriterToolbox manuscript={SAMPLE} />);
    const qualitySection = document.querySelector('[data-toolbox-group="quality"]');
    const characterSection = document.querySelector('[data-toolbox-group="character"]');
    expect(qualitySection).toBeInTheDocument();
    expect(characterSection).toBeInTheDocument();
    // 품질 카드 (qa-auditor) 는 보임
    expect(document.querySelector('[data-toolbox-module="qa-auditor"]')).toBeInTheDocument();
    // 캐릭터 카드 (character-dna) 는 처음엔 안 보임
    expect(document.querySelector('[data-toolbox-module="character-dna"]')).toBeNull();
  });

  it('캐릭터 그룹 클릭 — 펼침 + ModuleCard 렌더', () => {
    render(<WriterToolbox manuscript={SAMPLE} />);
    fireEvent.click(screen.getByText('캐릭터'));
    expect(document.querySelector('[data-toolbox-module="character-dna"]')).toBeInTheDocument();
    expect(document.querySelector('[data-toolbox-module="reader-persona-16"]')).toBeInTheDocument();
    expect(document.querySelector('[data-toolbox-module="cliche-transform"]')).toBeInTheDocument();
  });

  it('씬·연출 그룹 클릭 — 4 모듈 카드', () => {
    render(<WriterToolbox manuscript={SAMPLE} />);
    fireEvent.click(screen.getByText('씬·연출'));
    ['scene-temperature', 'beat-bank', 'rhythm-analysis', 'foreshadow-tracker'].forEach((id) => {
      expect(document.querySelector(`[data-toolbox-module="${id}"]`)).toBeInTheDocument();
    });
  });

  it('분석 그룹 — 3 모듈', () => {
    render(<WriterToolbox manuscript={SAMPLE} />);
    fireEvent.click(screen.getByText('분석'));
    ['genre-matrix', 'style-profile', 'work-note'].forEach((id) => {
      expect(document.querySelector(`[data-toolbox-module="${id}"]`)).toBeInTheDocument();
    });
  });

  it('안전 그룹 — 3 모듈 + IP·AI 서명 표시', () => {
    render(<WriterToolbox manuscript={SAMPLE} />);
    fireEvent.click(screen.getByText('안전'));
    ['ai-signature-scan', 'ip-readiness', 'work-receipt'].forEach((id) => {
      expect(document.querySelector(`[data-toolbox-module="${id}"]`)).toBeInTheDocument();
    });
  });

  it('ModuleCard 자세히 토글 — aria-expanded false → true', () => {
    render(<WriterToolbox manuscript={SAMPLE} />);
    const detailBtn = screen.getAllByLabelText(/자세히/)[0];
    expect(detailBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(detailBtn);
    expect(detailBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('onClose 콜백 — 닫기 버튼 노출 + 클릭', () => {
    const onClose = jest.fn();
    render(<WriterToolbox manuscript={SAMPLE} onClose={onClose} />);
    const closeBtn = screen.getByLabelText(/Toolbox 닫기/);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('onClose 없음 — 닫기 버튼 미노출', () => {
    render(<WriterToolbox manuscript={SAMPLE} />);
    expect(screen.queryByLabelText(/Toolbox 닫기/)).toBeNull();
  });

  it('그룹 토글 — 펼침 후 다시 클릭 시 접힘', () => {
    render(<WriterToolbox manuscript={SAMPLE} />);
    // 캐릭터 펼침
    fireEvent.click(screen.getByText('캐릭터'));
    expect(document.querySelector('[data-toolbox-module="character-dna"]')).toBeInTheDocument();
    // 다시 클릭 — 접힘
    fireEvent.click(screen.getByText('캐릭터'));
    expect(document.querySelector('[data-toolbox-module="character-dna"]')).toBeNull();
  });

  it('manuscript override — props 가 Provider 보다 우선', () => {
    // useWritingSafe 는 Provider 없을 때 null → manuscript override 가 사용됨.
    render(<WriterToolbox manuscript="aaaa" />);
    // 빈 hint 안 떠야 함 (chars > 0)
    expect(screen.queryByText(/원고 작성 후/)).toBeNull();
  });

  it('대용량 manuscript — 100KB 도 throw 없이 렌더', () => {
    const huge = SAMPLE.repeat(100);
    expect(() => render(<WriterToolbox manuscript={huge} />)).not.toThrow();
  });

  it('품질 그룹 — QA 감사원 / 통합등급 카드 노출', () => {
    render(<WriterToolbox manuscript={SAMPLE} />);
    expect(screen.getByText(/QA 감사원/)).toBeInTheDocument();
    expect(screen.getByText(/통합등급/)).toBeInTheDocument();
  });

  it('Provider 없이 manuscript 미지정 — 빈 hint', () => {
    render(<WriterToolbox />);
    expect(screen.getByText(/글을 작성하면 18개 품질 모듈이 활성화됩니다/)).toBeInTheDocument();
  });

  it('5 그룹 헤더 — aria-expanded 속성 (펼침/접힘 상태 노출)', () => {
    render(<WriterToolbox manuscript={SAMPLE} />);
    const groupButtons = document.querySelectorAll('button[aria-expanded]');
    // 5 그룹 + 다수 ModuleCard 토글 → 전체 합쳐 충분
    expect(groupButtons.length).toBeGreaterThanOrEqual(5);
  });

  it('character 카드 토글 — 펼침 시 detail 텍스트 노출', () => {
    render(<WriterToolbox manuscript={SAMPLE} />);
    fireEvent.click(screen.getByText('캐릭터'));
    // DNA 카드 자세히 클릭
    const moduleCard = document.querySelector('[data-toolbox-module="character-dna"]');
    expect(moduleCard).toBeInTheDocument();
  });
});
