// Genre Presets — pipeline.ts에서 추출

// ============================================================
// Temperature 설계 원칙 (작가 40% 룰)
// ============================================================
// AI 초안 = 작가 완성본의 약 60%. 작가가 40%를 직접 덧쓴다.
// temperature가 높으면 → 창의적이지만 일관성↓ → 작가 수정량 증가
// temperature가 낮으면 → 안전하지만 밋밋 → 작가가 개성을 추가
//
// 레벨링 기준:
// - 논리 의존도 높은 장르 (스릴러/대체역사/호러) → 낮은 temp (0.65~0.75)
//   → AI가 일관성 있게 쓰고, 작가가 감정/분위기를 덧씀
// - 감정/묘사 중심 장르 (로맨스/판타지) → 중간 temp (0.80~0.90)
//   → AI가 감정 표현을 자유롭게, 작가가 세밀하게 다듬음
// - 자유도 높은 장르 (라노벨/코미디) → 높은 temp (0.90~1.0)
//   → AI가 예측불가한 전개를 던지고, 작가가 가려 씀
//
// 평균 예측: 전 장르 가중평균 ≈ 0.80 (기존 고정 0.9보다 0.1 낮음)
// → AI 톤이 전체적으로 안정화되어 작가 수정 부담 감소

// Narrative Sentinel™ Genre Presets
export const GENRE_PRESETS: Record<string, { rules: string; pacing: string; tensionBase: number; temperature: number; cliffTypes: string; emotionFocus: string }> = {
  ROMANCE: {
    rules: '해결을 의도적으로 지연. 행동보다 감정적 머뭇거림이 중요. 물리적 접촉은 절제 속에서 의미. 대화의 행간(말하지 않은 것)이 핵심. 시선/손끝/호흡 미세 묘사.',
    pacing: 'slow_burn_with_spikes', tensionBase: 0.4, temperature: 0.82,
    cliffTypes: '고백 지연, 제3자 등장', emotionFocus: '욕망, 질투, 그리움',
  },
  THRILLER: {
    rules: '모든 질문에 한꺼번에 답하지 말 것. 각 폭로는 더 큰 질문을 만들어야 함. 독자가 추리 가능한 단서 공정 배치. 레드헤링 최소 1개. 진실은 조각조각.',
    pacing: 'steady_rise_with_reversals', tensionBase: 0.6, temperature: 0.70,
    cliffTypes: '새 단서, 용의자 전환', emotionFocus: '호기심, 공포, 의심',
  },
  SYSTEM_HUNTER: {
    rules: '전력 대비가 흥분을 만듦. 전투는 에스컬레이션, 반복 금지. 각성/레벨업은 대가를 치르고. 스탯/스킬은 서사에 녹여서. 전투 중 내면 독백은 짧고 강렬하게.',
    pacing: 'fast_spikes', tensionBase: 0.7, temperature: 0.78,
    cliffTypes: '보스 등장, 스킬 각성', emotionFocus: '쾌감, 공포, 승리',
  },
  FANTASY: {
    rules: '마법 체계에 명확한 비용/제한. 세계관 설명은 장면 속에 녹여서(인포덤프 금지). 정치/세력 구도 최소 2개 긴장 축. 지명/인명 일관성.',
    pacing: 'epic_waves', tensionBase: 0.5, temperature: 0.88,
    cliffTypes: '힘의 폭로, 배신', emotionFocus: '경이, 결의, 희생',
  },
  HORROR: {
    rules: '보여주지 않는 것이 더 무섭다. 일상 묘사를 불안하게 뒤트는 기법. 안전 공간이 점차 침식. 감각 박탈/과부하 번갈아. 희망을 줬다가 빼앗는 리듬.',
    pacing: 'slow_build_to_spike', tensionBase: 0.8, temperature: 0.68,
    cliffTypes: '정체 드러남, 탈출 실패', emotionFocus: '공포, 불안, 편집증',
  },
  SF: {
    rules: '과학적 설정의 내적 논리 준수. 기술 묘사는 감각적으로. 사회 체계와 기술의 상호작용. 미래 사회의 윤리적 딜레마.',
    pacing: 'steady_rise_with_reversals', tensionBase: 0.5, temperature: 0.78,
    cliffTypes: '기술 폭로, 사회 붕괴', emotionFocus: '경이, 고독, 결의',
  },
  FANTASY_ROMANCE: {
    rules: '판타지 세계관과 감정선 균형. 회귀자의 자신감이 점차 흔들리는 구조. 2회차 이점이 줄어드는 긴장. 과거 행동이 미래를 바꿔야 함.',
    pacing: 'layered_accumulation', tensionBase: 0.5, temperature: 0.84,
    cliffTypes: '예상 변화, 미래 무효화', emotionFocus: '후회, 기대, 불안',
  },
  ALT_HISTORY: {
    rules: '대체 역사는 시스템 롤백(QFR)으로 과거의 분기점으로 데이터를 동기화하는 서사. 미래 지식으로 역사를 바꾸는 행위는 인과율(CRL)을 대규모로 소모하는 시장 교란 행위. 역사적 사실과 창작의 경계를 명확히. 나비효과를 논리적으로.',
    pacing: 'steady_rise_with_reversals', tensionBase: 0.5, temperature: 0.72,
    cliffTypes: '역사 분기, 예상치 못한 변수', emotionFocus: '책임감, 딜레마, 긴장',
  },
  MODERN_FANTASY: {
    rules: '현대 사회에 숨겨진 시스템 백도어를 발견한 자의 서사. 돈/권력/명예는 세계의 인과율 파이를 독점하는 시장 교란. 전문직 지식은 시스템의 디버깅 도구. 일상과 비일상의 경계에서 긴장 유지.',
    pacing: 'fast_spikes', tensionBase: 0.55, temperature: 0.82,
    cliffTypes: '정체 노출, 세력 충돌', emotionFocus: '야망, 긴장, 성취',
  },
  WUXIA: {
    rules: '내공은 백그라운드 프로세싱 파워(HPP) 축적. 무공 수련은 시스템 자산 가치 업데이트. 주화입마는 데이터 충돌/메모리 누수. 강호 세력 구도는 최소 3개 축. 전투 묘사는 기세와 흐름 중심.',
    pacing: 'epic_waves', tensionBase: 0.6, temperature: 0.84,
    cliffTypes: '고수 등장, 비급 발견', emotionFocus: '의리, 복수, 초월',
  },
  LIGHT_NOVEL: {
    rules: '가볍고 유쾌한 톤 유지. 성별 전환(TS)은 QFR 데이터 동기화 중 Vessel 재할당 오류. 착각물은 시스템 로그 출력 오류로 HPP 과대 측정 버그. 루프물은 인스턴스 서버 리부트 + 캐시 유지. 대화문 비율 높게, 독백은 코믹하게.',
    pacing: 'fast_spikes', tensionBase: 0.35, temperature: 0.95,
    cliffTypes: '정체 노출, 착각 증폭', emotionFocus: '쾌감, 당혹, 유머',
  },
};

/** 장르명으로 프리셋 temperature 조회. 매칭 안 되면 0.82 (전 장르 가중평균) */
export function getGenreTemperature(genre: string): number {
  const key = genre.toUpperCase().replace(/[\s-]/g, '_');
  // 직접 매칭
  if (GENRE_PRESETS[key]) return GENRE_PRESETS[key].temperature;
  // 한글 장르명 → 키 매핑
  const KO_MAP: Record<string, string> = {
    '로맨스': 'ROMANCE', '스릴러': 'THRILLER', '헌터물': 'SYSTEM_HUNTER',
    '판타지': 'FANTASY', '공포': 'HORROR', 'SF': 'SF',
    '로판': 'FANTASY_ROMANCE', '대체역사': 'ALT_HISTORY',
    '현판': 'MODERN_FANTASY', '무협': 'WUXIA', '라노벨': 'LIGHT_NOVEL',
  };
  const mapped = KO_MAP[genre];
  if (mapped && GENRE_PRESETS[mapped]) return GENRE_PRESETS[mapped].temperature;
  return 0.82; // 전 장르 가중평균
}
