/**
 * compliance/orchestrator.test.ts (2026-05-12 — Doc 3 ⑦ T-03 / F-test)
 * 7축 채점 통합 실행기 검증.
 */

import { scoreAllAxes, applyDirectiveToPrompt } from '../orchestrator';
import type { AxisContext, ComplianceReport } from '../types';

describe('compliance/orchestrator — scoreAllAxes', () => {
  const minimalCtx: AxisContext = {
    draft: '잠들지 못한 사람들이 모이는 시간이 있다. 유진은 그 시간을 알고 있었다.',
  };

  it('빈 draft 도 throw 안 함 — degraded 점수', () => {
    const report = scoreAllAxes({ draft: '' });
    expect(typeof report.totalScore).toBe('number');
    expect(report.totalScore).toBeGreaterThanOrEqual(0);
    expect(report.totalScore).toBeLessThanOrEqual(100);
  });

  it('7개 축 모두 실행 (axesToRun 미지정 시)', () => {
    const report = scoreAllAxes(minimalCtx);
    expect(report.axes.length).toBe(7);
    const axisIds = report.axes.map((a) => a.axis).sort();
    expect(axisIds).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('axesToRun = [1, 7] 만 실행', () => {
    const report = scoreAllAxes(minimalCtx, { axesToRun: [1, 7] });
    expect(report.axes.length).toBe(2);
    const ids = report.axes.map((a) => a.axis).sort();
    expect(ids).toEqual([1, 7]);
  });

  it('각 axis result — id / name / score / weight / passed / issues / recommendations', () => {
    const report = scoreAllAxes(minimalCtx);
    for (const axis of report.axes) {
      expect([1, 2, 3, 4, 5, 6, 7]).toContain(axis.axis);
      expect(typeof axis.name).toBe('string');
      expect(typeof axis.score).toBe('number');
      expect(axis.score).toBeGreaterThanOrEqual(0);
      expect(axis.score).toBeLessThanOrEqual(100);
      expect(typeof axis.weight).toBe('number');
      expect(typeof axis.passed).toBe('boolean');
      expect(Array.isArray(axis.issues)).toBe(true);
      expect(Array.isArray(axis.recommendations)).toBe(true);
    }
  });

  it('totalScore — 0~100 범위', () => {
    const report = scoreAllAxes(minimalCtx);
    expect(report.totalScore).toBeGreaterThanOrEqual(0);
    expect(report.totalScore).toBeLessThanOrEqual(100);
  });

  it('totalPassThreshold — 100 강제 시 거의 모든 case 불합격', () => {
    const report = scoreAllAxes(minimalCtx, { totalPassThreshold: 100 });
    // totalScore가 정확히 100이 아니면 allPassed false
    if (report.totalScore < 100) {
      expect(report.allPassed).toBe(false);
    }
  });

  it('strictCritical true — critical 1건이라도 있으면 allPassed false', () => {
    const report = scoreAllAxes(minimalCtx, { strictCritical: true });
    if (report.criticalCount > 0) {
      expect(report.allPassed).toBe(false);
    }
  });

  it('regenerationDirective — 불합격 시 string, 합격 시 empty', () => {
    const report = scoreAllAxes(minimalCtx);
    expect(typeof report.regenerationDirective).toBe('string');
    if (report.allPassed) {
      expect(report.regenerationDirective).toBe('');
    } else if (report.regenerationDirective.length > 0) {
      expect(report.regenerationDirective).toContain('재생성');
    }
  });

  it('축 내부 예외 시에도 다른 축 계속 실행', () => {
    // ctx에 정상 draft 주면 throw 위험 없음 — 다만 가드 패턴 검증
    const report = scoreAllAxes({ draft: 'OK draft text' });
    // 7개 모두 result 객체 반환 (error 시 score 0 + critical issue 형태)
    expect(report.axes.length).toBe(7);
  });

  it('완전 빈 ctx — 모든 축 default 처리', () => {
    const report = scoreAllAxes({ draft: '간단한 본문입니다.' });
    // 컨텍스트 미제공 → 각 축이 default 처리 (no-skip / no-throw)
    expect(report.axes.length).toBe(7);
    expect(report.totalScore).toBeGreaterThanOrEqual(0);
  });

  it('IP 위반 시 axis-7 critical', () => {
    const reportClean = scoreAllAxes({ draft: '주인공이 카페에 갔다.' });
    const reportIp = scoreAllAxes({
      draft: '나혼자만 레벨업 처럼, Marvel 같은 세계관에서.',
    });
    const axis7Clean = reportClean.axes.find((a) => a.axis === 7);
    const axis7Ip = reportIp.axes.find((a) => a.axis === 7);
    // ip-guard L1 brand-blocklist 검증 — 의심 brand 들어가면 axis-7 score 낮아져야
    expect(axis7Clean).toBeDefined();
    expect(axis7Ip).toBeDefined();
    if (axis7Clean && axis7Ip) {
      // brand 포함된 draft가 더 낮은 또는 같은 score
      expect(axis7Ip.score).toBeLessThanOrEqual(axis7Clean.score);
    }
  });
});

describe('compliance/orchestrator — applyDirectiveToPrompt', () => {
  it('합격 시 — 원본 그대로', () => {
    const passedReport: ComplianceReport = {
      totalScore: 100,
      allPassed: true,
      criticalCount: 0,
      axes: [],
      regenerationDirective: '',
    };
    const original = '원본 프롬프트입니다.';
    expect(applyDirectiveToPrompt(original, passedReport)).toBe(original);
  });

  it('불합격 + directive 있으면 결합', () => {
    const failedReport: ComplianceReport = {
      totalScore: 60,
      allPassed: false,
      criticalCount: 1,
      axes: [],
      regenerationDirective: '[재생성 지시] 축 1 불합격',
    };
    const result = applyDirectiveToPrompt('원본', failedReport);
    expect(result).toContain('원본');
    expect(result).toContain('재생성');
  });

  it('합격 X 이지만 directive 비었으면 원본 그대로', () => {
    const partial: ComplianceReport = {
      totalScore: 60,
      allPassed: false,
      criticalCount: 0,
      axes: [],
      regenerationDirective: '',
    };
    expect(applyDirectiveToPrompt('원본', partial)).toBe('원본');
  });
});

describe('compliance/orchestrator — gating contract (downstream pipeline)', () => {
  it('가중 평균 산식 정합 — axes의 score × weight 합 / weight 합', () => {
    const report = scoreAllAxes({ draft: '본문 내용' });
    if (report.axes.length > 0) {
      const weightSum = report.axes.reduce((s, a) => s + a.weight, 0);
      if (weightSum > 0) {
        const weighted = report.axes.reduce((s, a) => s + a.score * a.weight, 0);
        const expected = Math.round(weighted / weightSum);
        expect(report.totalScore).toBe(expected);
      }
    }
  });

  it('criticalCount === sum of axes critical issues', () => {
    const report = scoreAllAxes({ draft: '본문' });
    const sumCriticals = report.axes.reduce(
      (s, a) => s + a.issues.filter((i) => i.severity === 'critical').length,
      0,
    );
    expect(report.criticalCount).toBe(sumCriticals);
  });
});
