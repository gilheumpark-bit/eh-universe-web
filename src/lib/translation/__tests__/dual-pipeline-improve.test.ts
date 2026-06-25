// ============================================================
// dual-pipeline improveLevel — [Z1a-1] 4버전 누진 현지화 검증.
// undefined/1/2 = 기존 2트랙 동작 불변·3 = Tier-1 15·4 = +Tier-2 30.
// 주입 위치: Stage 4-Market prompt 만 (Faithful track 비오염).
// ============================================================

import {
  runDualTranslation,
  buildImproveDirective,
  IMPROVE_DIRECTIVE_MARKER,
  IMPROVE_TIER1_CHECKLIST,
  IMPROVE_TIER2_CHECKLIST,
  type DualPipelineParams,
} from '../dual-pipeline';

describe('buildImproveDirective (순수 함수)', () => {
  it('undefined → 빈 문자열 (기존 동작 불변)', () => {
    expect(buildImproveDirective(undefined)).toBe('');
  });

  it('level 1·2 → 빈 문자열 (주입 없음)', () => {
    expect(buildImproveDirective(1)).toBe('');
    expect(buildImproveDirective(2)).toBe('');
  });

  it('level 3 → Tier-1 15항목 numbered list + 마커', () => {
    const d = buildImproveDirective(3);
    expect(d).toContain(IMPROVE_DIRECTIVE_MARKER);
    expect(d).toContain('level 3');
    expect(d).toContain('15 checklist items');
    expect(d).toContain('15. ');
    expect(d).not.toContain('16. ');
    // Tier-1 첫 항목 포함, Tier-2 첫 항목 미포함
    expect(d).toContain(IMPROVE_TIER1_CHECKLIST[0]);
    expect(d).not.toContain(IMPROVE_TIER2_CHECKLIST[0]);
  });

  it('level 4 → Tier-1+Tier-2 30항목', () => {
    const d = buildImproveDirective(4);
    expect(d).toContain('30 checklist items');
    expect(d).toContain('30. ');
    expect(d).toContain(IMPROVE_TIER1_CHECKLIST[0]);
    expect(d).toContain(IMPROVE_TIER2_CHECKLIST[14]);
  });

  it('체크리스트는 정확히 15+15 (누진 구조 회귀 가드)', () => {
    expect(IMPROVE_TIER1_CHECKLIST).toHaveLength(15);
    expect(IMPROVE_TIER2_CHECKLIST).toHaveLength(15);
  });
});

describe('runDualTranslation × improveLevel 주입 위치', () => {
  const mkParams = (over: Partial<DualPipelineParams> = {}): DualPipelineParams & { prompts: string[] } => {
    const prompts: string[] = [];
    return {
      text: '원문 단락 하나.\n\n원문 단락 둘.',
      from: 'KO',
      to: 'EN',
      verifyIntegrity: false, // 본 테스트 초점은 prompt 주입 위치
      translateFn: async (prompt: string) => {
        prompts.push(prompt);
        return 'Paragraph one.\n\nParagraph two.';
      },
      prompts,
      ...over,
    };
  };

  it('improveLevel 미지정 → 어떤 prompt 에도 마커 없음 (기존 동작 불변)', async () => {
    const params = mkParams();
    await runDualTranslation(params);
    expect(params.prompts).toHaveLength(7); // Stage 1~3 공유 + 2 track × Stage 4~5
    expect(params.prompts.filter((p) => p.includes(IMPROVE_DIRECTIVE_MARKER))).toHaveLength(0);
  });

  it('improveLevel 4 → 정확히 1개 prompt (Stage 4-Market) 에만 마커', async () => {
    const params = mkParams({ improveLevel: 4 });
    const result = await runDualTranslation(params);
    const hit = params.prompts.filter((p) => p.includes(IMPROVE_DIRECTIVE_MARKER));
    expect(hit).toHaveLength(1);
    // Market Stage 4 prompt — Market track MISSION 문구 동반 (Faithful 비오염 증거)
    expect(hit[0]).toContain('Market-ready Localization');
    expect(hit[0]).not.toContain('Faithful Resonance');
    expect(result.faithful).not.toBeNull();
    expect(result.market).not.toBeNull();
  });

  it('improveLevel 2 → 마커 0 (레벨 1·2 는 기존 prompt 그대로)', async () => {
    const params = mkParams({ improveLevel: 2 });
    await runDualTranslation(params);
    expect(params.prompts.filter((p) => p.includes(IMPROVE_DIRECTIVE_MARKER))).toHaveLength(0);
  });
});
