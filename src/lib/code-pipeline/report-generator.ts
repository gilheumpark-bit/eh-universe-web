// ============================================================
// Pipeline Report Generator
// 파이프라인 실행 결과를 마크다운 리포트로 생성
// ============================================================

import type { PipelineResult, TeamResult, Finding, Severity } from './types';
import type { ConsensusResult } from './multi-ai-review';
import {
  type PipelineCustomConfig,
  calculateWeightedScore,
  getDefaultConfig,
  getStatusFromScore,
  hasBlockingFailure,
} from './pipeline-config';

// ── Types ──

export interface PipelineReport {
  id: string;
  timestamp: number;
  fileName: string;
  config: PipelineCustomConfig;
  stages: TeamResult[];
  overallScore: number;
  overallStatus: string;
  multiAIConsensus?: ConsensusResult;
  markdown: string;
  summary: string;
}

// ── Storage ──

const REPORT_STORAGE_KEY = 'csl-pipeline-reports';
const MAX_STORED_REPORTS = 50;

// ── Team Label Map (Korean) ──

const TEAM_LABELS: Record<string, string> = {
  simulation: '시뮬레이션',
  generation: '코드 생성',
  validation: '유효성 검증',
  'size-density': '크기/밀도 (비콘)',
  'asset-trace': '자산 추적',
  stability: '안정성',
  'release-ip': '릴리스/IP',
  governance: '거버넌스',
  'multi-ai-review': '멀티 AI 리뷰',
};

const STATUS_EMOJI: Record<string, string> = {
  pass: '✅',
  warn: '⚠️',
  fail: '❌',
  skip: '⏭️',
  running: '🔄',
  pending: '⏳',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: '🔴 심각',
  major: '🟠 주요',
  minor: '🟡 경미',
  info: '🔵 정보',
};

// ── Helpers ──

function generateId(): string {
  return `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function scoreBar(score: number): string {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `\`${bar}\` **${score}점**`;
}

function durationStr(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}초`;
}

// ── Report Generation ──

export function generateReport(
  result: PipelineResult,
  consensus?: ConsensusResult,
): PipelineReport {
  const config = getDefaultConfig();

  const weightedScore = calculateWeightedScore(
    result.stages.map((s) => ({ team: s.team, score: s.score })),
    config,
  );

  const overallScore = Math.round(weightedScore);
  const blocked = hasBlockingFailure(
    result.stages.map((s) => ({ team: s.team, status: s.status })),
    config,
  );
  const overallStatus = blocked ? 'fail' : getStatusFromScore(overallScore, config);

  const report: PipelineReport = {
    id: generateId(),
    timestamp: result.timestamp,
    fileName: '',
    config,
    stages: result.stages,
    overallScore,
    overallStatus,
    multiAIConsensus: consensus,
    markdown: '',
    summary: '',
  };

  // Generate summary
  const passCount = result.stages.filter((s) => s.status === 'pass').length;
  const warnCount = result.stages.filter((s) => s.status === 'warn').length;
  const failCount = result.stages.filter((s) => s.status === 'fail').length;
  const totalFindings = result.stages.reduce((sum, s) => sum + s.findings.length, 0);

  report.summary =
    `${result.stages.length}개 팀 검사 완료: ` +
    `통과 ${passCount}, 경고 ${warnCount}, 실패 ${failCount}. ` +
    `가중 점수 ${overallScore}점, 발견 사항 ${totalFindings}건.`;

  // Generate markdown
  report.markdown = formatReportAsMarkdown(report);

  return report;
}

// ── Markdown Formatting ──

export function formatReportAsMarkdown(report: PipelineReport): string {
  const lines: string[] = [];

  // ── Header ──
  lines.push('# 📋 CSL 파이프라인 검사 리포트');
  lines.push('');
  lines.push(`| 항목 | 값 |`);
  lines.push(`|------|-----|`);
  lines.push(`| 파일 | \`${report.fileName || '(미지정)'}\` |`);
  lines.push(`| 일시 | ${formatDate(report.timestamp)} |`);
  lines.push(`| 상태 | ${STATUS_EMOJI[report.overallStatus] || ''} **${report.overallStatus.toUpperCase()}** |`);
  lines.push(`| 통과 임계값 | ${report.config.passThreshold}점 |`);
  lines.push(`| 경고 임계값 | ${report.config.warnThreshold}점 |`);
  lines.push('');

  // ── Overall Score ──
  lines.push('## 📊 종합 점수');
  lines.push('');
  lines.push(scoreBar(report.overallScore));
  lines.push('');

  // ── Per-Team Results Table ──
  lines.push('## 🏢 팀별 결과');
  lines.push('');
  lines.push('| 팀 | 상태 | 점수 | 가중치 | 소요 시간 | 메시지 |');
  lines.push('|-----|------|------|--------|-----------|--------|');

  for (const stage of report.stages) {
    const label = TEAM_LABELS[stage.team] || stage.team;
    const status = STATUS_EMOJI[stage.status] || stage.status;
    const weight = report.config.teamWeights[stage.team] ?? 1.0;
    const duration = durationStr(stage.durationMs);
    const msg = stage.message.length > 60 ? stage.message.slice(0, 57) + '...' : stage.message;
    lines.push(`| ${label} | ${status} | ${stage.score} | x${weight} | ${duration} | ${msg} |`);
  }
  lines.push('');

  // ── Findings grouped by severity ──
  const allFindings: Array<Finding & { team: string }> = [];
  for (const stage of report.stages) {
    for (const f of stage.findings) {
      allFindings.push({ ...f, team: stage.team });
    }
  }

  if (allFindings.length > 0) {
    lines.push('## 🔍 발견 사항');
    lines.push('');

    const severityOrder: Severity[] = ['critical', 'major', 'minor', 'info'];
    for (const sev of severityOrder) {
      const group = allFindings.filter((f) => f.severity === sev);
      if (group.length === 0) continue;

      lines.push(`### ${SEVERITY_LABELS[sev]} (${group.length}건)`);
      lines.push('');

      for (const f of group) {
        const teamLabel = TEAM_LABELS[f.team] || f.team;
        const lineRef = f.line != null ? ` (라인 ${f.line})` : '';
        const ruleRef = f.rule ? ` [${f.rule}]` : '';
        lines.push(`- **[${teamLabel}]** ${f.message}${lineRef}${ruleRef}`);
      }
      lines.push('');
    }
  } else {
    lines.push('## 🔍 발견 사항');
    lines.push('');
    lines.push('발견 사항이 없습니다. 코드가 모든 검사를 통과했습니다.');
    lines.push('');
  }

  // ── Multi-AI Consensus Section ──
  if (report.multiAIConsensus) {
    const c = report.multiAIConsensus;
    lines.push('## 🤖 멀티 AI 합의 리뷰');
    lines.push('');
    lines.push(`| 항목 | 값 |`);
    lines.push(`|------|-----|`);
    lines.push(`| 참여 AI | ${c.reviews.length}개 |`);
    lines.push(`| 합의 상태 | ${STATUS_EMOJI[c.consensusStatus]} ${c.consensusStatus.toUpperCase()} |`);
    lines.push(`| 합의 점수 | ${scoreBar(c.consensusScore)} |`);
    lines.push(`| 합의도 | ${Math.round(c.agreement * 100)}% |`);
    lines.push(`| 소요 시간 | ${durationStr(c.totalTimeMs)} |`);
    lines.push('');

    // Individual reviewer results
    if (c.reviews.length > 0) {
      lines.push('### 개별 리뷰어 결과');
      lines.push('');
      lines.push('| 리뷰어 | 관점 | 상태 | 점수 | 소요 시간 |');
      lines.push('|--------|------|------|------|-----------|');

      for (const r of c.reviews) {
        const status = STATUS_EMOJI[r.status] || r.status;
        lines.push(
          `| ${r.reviewer} | ${r.perspective} | ${status} | ${r.score} | ${durationStr(r.responseTimeMs)} |`,
        );
      }
      lines.push('');
    }

    // Merged findings with confidence
    if (c.mergedFindings.length > 0) {
      lines.push('### 합의된 발견 사항');
      lines.push('');

      for (const f of c.mergedFindings) {
        const conf = Math.round(f.confidence * 100);
        const sevLabel = SEVERITY_LABELS[f.severity] || f.severity;
        const agreedStr = f.agreedBy.join(', ');
        lines.push(`- ${sevLabel} (신뢰도 ${conf}%) — ${f.message}`);
        lines.push(`  - 동의: ${agreedStr}`);
      }
      lines.push('');
    }

    lines.push(`**요약:** ${c.summary}`);
    lines.push('');
  }

  // ── Recommendations ──
  lines.push('## 💡 권장 사항');
  lines.push('');

  const criticalFindings = allFindings.filter((f) => f.severity === 'critical');
  const majorFindings = allFindings.filter((f) => f.severity === 'major');
  const failedTeams = report.stages.filter((s) => s.status === 'fail');
  const warnTeams = report.stages.filter((s) => s.status === 'warn');

  if (criticalFindings.length > 0) {
    lines.push(
      `1. **즉시 수정 필요:** 심각한 문제가 ${criticalFindings.length}건 발견되었습니다. 배포 전 반드시 수정하세요.`,
    );
  }
  if (majorFindings.length > 0) {
    lines.push(
      `${criticalFindings.length > 0 ? '2' : '1'}. **주요 문제 해결:** ${majorFindings.length}건의 주요 문제를 검토하고 수정하세요.`,
    );
  }
  if (failedTeams.length > 0) {
    const names = failedTeams.map((t) => TEAM_LABELS[t.team] || t.team).join(', ');
    lines.push(`- **실패 팀 재검토:** ${names} 팀의 검사가 실패했습니다.`);
  }
  if (warnTeams.length > 0) {
    const names = warnTeams.map((t) => TEAM_LABELS[t.team] || t.team).join(', ');
    lines.push(`- **경고 해결 권장:** ${names} 팀에서 경고가 발생했습니다.`);
  }
  if (report.overallScore >= report.config.warnThreshold && allFindings.length === 0) {
    lines.push('- 모든 검사를 통과했습니다. 코드 품질이 우수합니다.');
  }
  if (!report.multiAIConsensus && report.config.multiAIReview) {
    lines.push('- **멀티 AI 리뷰를 활성화**하면 더 정확한 코드 분석을 받을 수 있습니다.');
  }

  lines.push('');
  lines.push('---');
  lines.push(`*CSL IDE 파이프라인 리포트 — ${formatDate(report.timestamp)}*`);

  return lines.join('\n');
}

// ── Report History (localStorage) ──

export function getReportHistory(): PipelineReport[] {
  try {
    const raw = localStorage.getItem(REPORT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[ReportGenerator] 리포트 이력 로드 실패:', err);
    return [];
  }
}

export function saveReport(report: PipelineReport): void {
  try {
    const history = getReportHistory();
    history.unshift(report);

    // Keep only the most recent reports
    const trimmed = history.slice(0, MAX_STORED_REPORTS);
    localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('[ReportGenerator] 리포트 저장 실패, 공간 확보 시도:', err);
    // localStorage full — try to make room
    try {
      const history = getReportHistory();
      const trimmed = history.slice(0, Math.floor(MAX_STORED_REPORTS / 2));
      trimmed.unshift(report);
      localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (retryErr) {
      console.warn('[ReportGenerator] 리포트 저장 재시도 실패:', retryErr);
    }
  }
}

export function clearReportHistory(): void {
  try {
    localStorage.removeItem(REPORT_STORAGE_KEY);
  } catch (err) {
    console.warn('[ReportGenerator] 리포트 이력 삭제 실패:', err);
  }
}

export function deleteReport(reportId: string): void {
  try {
    const history = getReportHistory();
    const filtered = history.filter((r) => r.id !== reportId);
    localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('[ReportGenerator] 개별 리포트 삭제 실패:', err);
  }
}
