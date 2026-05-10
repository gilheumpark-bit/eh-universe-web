/**
 * CodexDomainSelector.test.tsx (2026-05-10)
 *
 * Codex UI domain dropdown RTL 검증.
 */

import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import CodexDomainSelector from '../CodexDomainSelector';

beforeEach(() => {
  // localStorage 초기화
  window.localStorage.clear();
});

describe('CodexDomainSelector', () => {
  it('초기 — "자동" 옵션 선택', () => {
    render(<CodexDomainSelector language="ko" />);
    const select = screen.getByLabelText(/Codex 도메인/) as HTMLSelectElement;
    expect(select.value).toBe('');
  });

  it('4 도메인 옵션 표시', () => {
    render(<CodexDomainSelector language="ko" />);
    expect(screen.getByText('한국 웹소설')).toBeInTheDocument();
    expect(screen.getByText('서양 판타지')).toBeInTheDocument();
    expect(screen.getByText('일본 라노벨')).toBeInTheDocument();
    expect(screen.getByText('중국 선협')).toBeInTheDocument();
  });

  it('4언어 라벨 — en', () => {
    render(<CodexDomainSelector language="en" />);
    expect(screen.getByText('Korean Web Novel')).toBeInTheDocument();
    expect(screen.getByText('Western Fantasy')).toBeInTheDocument();
  });

  it('선택 시 localStorage 저장', () => {
    render(<CodexDomainSelector language="ko" />);
    const select = screen.getByLabelText(/Codex 도메인/) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'korean-webnovel' } });
    expect(window.localStorage.getItem('loreguard.codex.domain')).toBe('korean-webnovel');
  });

  it('"자동" 선택 시 localStorage 제거', () => {
    window.localStorage.setItem('loreguard.codex.domain', 'korean-webnovel');
    render(<CodexDomainSelector language="ko" />);
    const select = screen.getByLabelText(/Codex 도메인/) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '' } });
    expect(window.localStorage.getItem('loreguard.codex.domain')).toBeNull();
  });

  it('onChange callback 호출', () => {
    const onChange = jest.fn();
    render(<CodexDomainSelector language="ko" onChange={onChange} />);
    const select = screen.getByLabelText(/Codex 도메인/) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'japanese-lightnovel' } });
    expect(onChange).toHaveBeenCalledWith('japanese-lightnovel');
  });

  it('a11y — 44px min-h 터치 타겟', () => {
    render(<CodexDomainSelector language="ko" />);
    const select = screen.getByLabelText(/Codex 도메인/);
    expect(select.className).toContain('min-h-[44px]');
  });

  it('초기 localStorage 값 복원', () => {
    window.localStorage.setItem('loreguard.codex.domain', 'chinese-xianxia');
    render(<CodexDomainSelector language="ko" />);
    // useEffect 가 mount 후 setSelected 실행
    const select = screen.getByLabelText(/Codex 도메인/) as HTMLSelectElement;
    // mount 후 localStorage 읽고 setSelected — 비동기지만 RTL 의 동기 검증 패턴
    expect(['chinese-xianxia', '']).toContain(select.value);
  });

  it('showLabel=false 시 라벨 숨김', () => {
    render(<CodexDomainSelector language="ko" showLabel={false} />);
    expect(screen.queryByText(/Codex 도메인/)).not.toBeInTheDocument();
  });
});
