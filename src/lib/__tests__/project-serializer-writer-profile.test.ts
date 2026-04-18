/**
 * project-serializer — WriterProfile GitHub sync round-trip 테스트
 * P0 작업 (다른 기기 sync) 검증
 */

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { extractWriterProfile } from '../project-serializer';
import { createEmptyProfile } from '@/engine/writer-profile';
import { logger } from '@/lib/logger';

describe('extractWriterProfile', () => {
  it('빈 배열 입력 시 null 반환', () => {
    expect(extractWriterProfile([])).toBeNull();
  });

  it('.noa/profile.json 없으면 null 반환', () => {
    const files = [
      { path: 'README.md', content: '# Hello' },
      { path: 'episodes/ep1.md', content: '# EP 1' },
    ];
    expect(extractWriterProfile(files)).toBeNull();
  });

  it('유효한 profile.json 입력 시 WriterProfile 객체 반환', () => {
    const mockProfile = createEmptyProfile('default');
    mockProfile.episodeCount = 5;
    mockProfile.avgGrade = 80;
    mockProfile.skillLevel = 'intermediate';

    const files = [
      { path: '.noa/profile.json', content: JSON.stringify(mockProfile) },
    ];
    const result = extractWriterProfile(files);
    expect(result).not.toBeNull();
    expect(result?.episodeCount).toBe(5);
    expect(result?.avgGrade).toBe(80);
    expect(result?.skillLevel).toBe('intermediate');
  });

  it('잘못된 JSON은 null 반환 (파싱 실패 가드)', () => {
    const warnSpy = logger.warn as jest.Mock;
    warnSpy.mockClear();
    const files = [
      { path: '.noa/profile.json', content: '{invalid json' },
    ];
    // jsonToWriterProfile 내부 try/catch로 보호됨 + logger.warn 호출
    const result = extractWriterProfile(files);
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toBe('project-serializer');
  });

  it('profile.json이 문자열이 아닌 경우 null 반환', () => {
    const files = [
      // content가 string이 아니면 extractWriterProfile이 null 반환
      { path: '.noa/profile.json', content: null as unknown as string },
    ];
    const result = extractWriterProfile(files);
    expect(result).toBeNull();
  });

  it('여러 파일 중 .noa/profile.json 정확히 추출', () => {
    const mockProfile = createEmptyProfile('default');
    mockProfile.episodeCount = 1;
    mockProfile.skillLevel = 'beginner';

    const files = [
      { path: 'README.md', content: '# Test' },
      { path: '.noa/config.yaml', content: 'title: Test' },
      { path: '.noa/profile.json', content: JSON.stringify(mockProfile) },
      { path: 'episodes/ep1.md', content: '# EP 1' },
    ];
    const result = extractWriterProfile(files);
    expect(result).not.toBeNull();
    expect(result?.skillLevel).toBe('beginner');
  });
});
