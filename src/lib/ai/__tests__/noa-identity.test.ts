import { buildNoaFreshnessRules, buildNoaSystemHeader } from '../noa-identity';

describe('noa-identity — freshness rules', () => {
  const fixedKstDate = new Date('2026-06-14T00:30:00+09:00');

  it('실세계 최신성 기준일을 Asia/Seoul 날짜로 주입한다', () => {
    const result = buildNoaFreshnessRules(fixedKstDate);

    expect(result).toContain('기준일: 2026-06-14 (Asia/Seoul)');
  });

  it('API·모델·요금·법·플랫폼 기준은 최신 근거 필요로 표시한다', () => {
    const result = buildNoaFreshnessRules(fixedKstDate);

    expect(result).toContain('API, SDK, 모델, 요금제');
    expect(result).toContain('[확인 필요] 최신 자료 확인 후 판단해야 합니다');
    expect(result).toContain('날짜와 출처');
  });

  it('노아 공통 헤더에 최신성 기준과 역할 모드를 함께 포함한다', () => {
    const result = buildNoaSystemHeader('권리/IP 점검가', fixedKstDate);

    expect(result).toContain('당신은 "노아(NOA)"입니다');
    expect(result).toContain('실세계 최신성 기준');
    expect(result).toContain('역할 모드: 권리/IP 점검가');
  });
});
