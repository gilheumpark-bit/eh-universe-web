import { apiLog } from '@/lib/api-logger';
import {
  recordWebVitalMetric,
  resetRuntimeMetricsForTest,
  snapshotRuntimeMetrics,
} from '../runtime-metrics';

describe('runtime metrics', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetRuntimeMetricsForTest();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('records API counts and duration samples from apiLog', () => {
    apiLog({
      level: 'info',
      event: 'chat_complete',
      route: '/api/chat',
      status: 200,
      durationMs: 42,
    });
    apiLog({
      level: 'warn',
      event: 'chat_complete',
      route: '/api/chat',
      status: 200,
      durationMs: 120,
    });

    const row = snapshotRuntimeMetrics().api[0];
    expect(row).toMatchObject({
      route: '/api/chat',
      event: 'chat_complete',
      status: '200',
      count: 2,
      durationCount: 2,
      durationSumMs: 162,
      durationP95Ms: 120,
    });
  });

  it('records Web Vitals samples with p75 values', () => {
    recordWebVitalMetric({ name: 'LCP', rating: 'good', value: 1000 });
    recordWebVitalMetric({ name: 'LCP', rating: 'good', value: 1200 });
    recordWebVitalMetric({ name: 'LCP', rating: 'good', value: 1800 });
    recordWebVitalMetric({ name: 'LCP', rating: 'good', value: 2200 });

    const row = snapshotRuntimeMetrics().webVitals[0];
    expect(row).toMatchObject({
      name: 'LCP',
      rating: 'good',
      count: 4,
      valueCount: 4,
      valueSum: 6200,
      valueP75: 1800,
    });
  });
});
