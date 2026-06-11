import {
  scanForeshadows,
  unresolvedForeshadows,
  payoffDistance,
  foreshadowHealth,
  type Foreshadow,
} from '@/lib/creative/foreshadow-tracker';

describe('foreshadow-tracker', () => {
  // --- 정상: 마커 추출 + payoff 회수 ---
  it('복선/떡밥 마커를 id별로 추출하고 payoff 위치를 잡는다', () => {
    const text =
      '서문 [복선:검은새] 본문 전개 [떡밥:반지:remind] 더 진행 [복선:검은새:payoff] 마무리';
    const result = scanForeshadows(text);
    const bird = result.find((f) => f.id === '검은새')!;
    const ring = result.find((f) => f.id === '반지')!;

    expect(result).toHaveLength(2);
    expect(bird.state).toBe('payoff');
    expect(bird.payoffAt).toBeGreaterThan(bird.plantedAt);
    expect(ring.state).toBe('remind');
    expect(ring.payoffAt).toBeUndefined();
  });

  // --- 정상: 한글 상태 별칭 + 최고 단계 승급 ---
  it('한글 상태 별칭을 정규화하고 최고 단계로 승급한다', () => {
    const text = '[복선:왕좌:심기] ... [복선:왕좌:긴장] ... [복선:왕좌:여운]';
    const [seat] = scanForeshadows(text);
    expect(seat.id).toBe('왕좌');
    expect(seat.state).toBe('echo'); // echo가 최고 단계
    expect(seat.payoffAt).toBeUndefined(); // payoff 마커 없음
  });

  // --- 빈 입력 ---
  it('빈 문자열·마커 0건은 빈 배열을 반환한다', () => {
    expect(scanForeshadows('')).toEqual([]);
    expect(scanForeshadows('마커가 전혀 없는 평범한 본문입니다.')).toEqual([]);
    // 잘못된 타입 방어
    expect(scanForeshadows(undefined as unknown as string)).toEqual([]);
    expect(scanForeshadows(null as unknown as string)).toEqual([]);
  });

  // --- 경계: 빈 id 마커 무시 + 정렬 순서 ---
  it('빈 id 마커는 무시하고 plantedAt 오름차순 정렬한다', () => {
    const text = '[복선:]무시 [복선:나중에]뒤 그리고 앞쪽 [떡밥:먼저]';
    const result = scanForeshadows(text);
    // 빈 id는 제외 → 2건
    expect(result.map((f) => f.id)).toEqual(['나중에', '먼저']);
    expect(result[0].plantedAt).toBeLessThan(result[1].plantedAt);
  });

  // --- 미회수 추출 ---
  it('unresolvedForeshadows는 payoff 없는 복선만 추린다', () => {
    const text = '[복선:A:payoff] [복선:B] [떡밥:C:tension]';
    const list = scanForeshadows(text);
    const unresolved = unresolvedForeshadows(list);
    expect(unresolved.map((f) => f.id).sort()).toEqual(['B', 'C']);
    // null 안전
    expect(unresolvedForeshadows(null as unknown as Foreshadow[])).toEqual([]);
  });

  // --- payoffDistance 정상 + null 방어 ---
  it('payoffDistance는 거리 계산과 null 방어를 한다', () => {
    const resolved: Foreshadow = {
      id: 'x',
      label: 'x',
      state: 'payoff',
      plantedAt: 10,
      payoffAt: 35,
    };
    expect(payoffDistance(resolved)).toBe(25);

    const open: Foreshadow = { id: 'y', label: 'y', state: 'plant', plantedAt: 5 };
    expect(payoffDistance(open)).toBeNull();
    expect(payoffDistance(null as unknown as Foreshadow)).toBeNull();
  });

  // --- foreshadowHealth 집계 + 0분모 방어 ---
  it('foreshadowHealth는 회수 통계와 평균 거리를 0분모 방어로 집계한다', () => {
    const text =
      '[복선:A]시작............[복선:A:payoff] 그리고 [복선:B] 그리고 [떡밥:C:remind]';
    const health = foreshadowHealth(scanForeshadows(text));
    expect(health.total).toBe(3);
    expect(health.resolved).toBe(1);
    expect(health.unresolved).toBe(2);
    expect(health.avgDistance).not.toBeNull();
    expect(health.avgDistance!).toBeGreaterThan(0);

    // 회수 0건 → avgDistance null
    const noPayoff = foreshadowHealth(scanForeshadows('[복선:Z]'));
    expect(noPayoff).toEqual({ total: 1, resolved: 0, unresolved: 1, avgDistance: null });

    // 빈 목록 / null 방어
    expect(foreshadowHealth([])).toEqual({
      total: 0,
      resolved: 0,
      unresolved: 0,
      avgDistance: null,
    });
    expect(foreshadowHealth(null as unknown as Foreshadow[])).toEqual({
      total: 0,
      resolved: 0,
      unresolved: 0,
      avgDistance: null,
    });
  });
});
