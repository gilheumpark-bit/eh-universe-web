// ============================================================
// PART 1 — Module Header
// ============================================================
//
// report-builder.ts — VerifierReport → Markdown / HTML 리포트.
//
// 5 섹션 구조:
//   1. 종합 점수
//   2. 5축 점수 카드
//   3. 위반 우선순위 list
//   4. 텐션 궤적 (SVG inline)
//   5. 메타 (생성 시각 / hash)
//
// 4언어 지원 (ko/en/ja/zh).
//
// [C] 빈 report → 최소 헤더만
// [G] 단일 패스 — 큰 리포트도 1회 빌드
// [K] CSS 0건 (HTML self-contained inline style)
// ============================================================

import type { VerifierReport, AxisResult, Violation, TensionTrajectory } from './types';
import { buildTensionTrajectory } from './tension-trajectory';
import type { EpisodeManuscript } from '@/lib/studio-types';

type Lang = 'ko' | 'en' | 'ja' | 'zh';

// ============================================================
// PART 2 — Localized labels
// ============================================================

const L = {
  ko: {
    title: 'Long-Arc Verifier 리포트',
    overallScore: '종합 점수',
    axes: '5축 점수',
    plotDrift: '시놉시스 드리프트',
    characterArc: '캐릭터 일관성',
    worldRule: '세계관 룰',
    foreshadow: '떡밥 회수',
    tension: '텐션 궤적',
    violations: '위반 우선순위',
    tensionGraph: '텐션 곡선',
    meta: '메타',
    generatedAt: '생성 시각',
    hash: 'manuscript hash',
    none: '위반 없음',
    severity: { error: '오류', warning: '경고', info: '정보' } as const,
  },
  en: {
    title: 'Long-Arc Verifier Report',
    overallScore: 'Overall Score',
    axes: '5-Axis Scores',
    plotDrift: 'Synopsis Drift',
    characterArc: 'Character Arc',
    worldRule: 'World Rules',
    foreshadow: 'Foreshadow',
    tension: 'Tension',
    violations: 'Violations (prioritized)',
    tensionGraph: 'Tension Curve',
    meta: 'Meta',
    generatedAt: 'Generated',
    hash: 'manuscript hash',
    none: 'No violations',
    severity: { error: 'Error', warning: 'Warning', info: 'Info' } as const,
  },
  ja: {
    title: 'Long-Arc Verifier レポート',
    overallScore: '総合スコア',
    axes: '5 軸スコア',
    plotDrift: 'あらすじドリフト',
    characterArc: 'キャラクター整合',
    worldRule: '世界観ルール',
    foreshadow: '伏線回収',
    tension: 'テンション',
    violations: '違反優先順位',
    tensionGraph: 'テンション曲線',
    meta: 'メタ',
    generatedAt: '生成時刻',
    hash: 'manuscript hash',
    none: '違反なし',
    severity: { error: 'エラー', warning: '警告', info: '情報' } as const,
  },
  zh: {
    title: 'Long-Arc Verifier 报告',
    overallScore: '总分',
    axes: '5 轴评分',
    plotDrift: '大纲偏离',
    characterArc: '角色一致性',
    worldRule: '世界观规则',
    foreshadow: '伏笔回收',
    tension: '紧张度',
    violations: '违规优先级',
    tensionGraph: '紧张度曲线',
    meta: '元信息',
    generatedAt: '生成时间',
    hash: 'manuscript hash',
    none: '无违规',
    severity: { error: '错误', warning: '警告', info: '信息' } as const,
  },
} as const;

// ============================================================
// PART 3 — Markdown
// ============================================================

export function renderReportMarkdown(
  report: VerifierReport,
  episodes: EpisodeManuscript[] | null | undefined,
  language: Lang = 'ko',
): string {
  const t = L[language];
  const trajectory = buildTensionTrajectory(episodes);

  const lines: string[] = [];
  lines.push(`# ${t.title}`);
  lines.push('');
  lines.push(`**${t.overallScore}**: ${report.overallScore} / 100`);
  lines.push('');

  // 5축
  lines.push(`## ${t.axes}`);
  lines.push('');
  lines.push(`| ${t.plotDrift} | ${t.characterArc} | ${t.worldRule} | ${t.foreshadow} | ${t.tension} |`);
  lines.push('|---|---|---|---|---|');
  lines.push(
    `| ${report.axes.plotDrift.score} | ${report.axes.characterArc.score} | ${report.axes.worldViolation.score} | ${report.axes.foreshadow.score} | ${report.axes.tension.score} |`,
  );
  lines.push('');

  // 위반
  lines.push(`## ${t.violations} (${report.totalViolations})`);
  lines.push('');
  if (report.prioritized.length === 0) {
    lines.push(`_${t.none}_`);
  } else {
    for (const v of report.prioritized.slice(0, 50)) {
      const ep = v.episodeId ? ` (EP${v.episodeId})` : '';
      const sev = t.severity[v.severity];
      const msg = v.messages[language] ?? v.messages.ko;
      lines.push(`- **[${sev}]**${ep} ${msg}`);
    }
  }
  lines.push('');

  // 텐션 궤적 (텍스트 표)
  if (trajectory.points.length > 0) {
    lines.push(`## ${t.tensionGraph}`);
    lines.push('');
    lines.push('| Episode | Tension | Inflection |');
    lines.push('|---|---|---|');
    for (const p of trajectory.points.slice(0, 50)) {
      lines.push(`| EP${p.episodeId} | ${p.tension} | ${p.isInflection ? '★' : ''} |`);
    }
    lines.push('');
  }

  // 메타
  lines.push(`## ${t.meta}`);
  lines.push('');
  lines.push(`- ${t.generatedAt}: ${report.generatedAt}`);
  lines.push(`- ${t.hash}: \`${report.manuscriptHash}\``);

  return lines.join('\n');
}

// ============================================================
// PART 4 — HTML (self-contained, inline style)
// ============================================================

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTensionSvg(trajectory: TensionTrajectory): string {
  if (trajectory.points.length === 0) return '';
  const w = 600;
  const h = 200;
  const pad = 30;
  const max = trajectory.points.length;
  const stepX = (w - pad * 2) / Math.max(1, max - 1);

  const path = trajectory.points
    .map((p, i) => {
      const x = pad + i * stepX;
      const y = h - pad - (p.tension / 100) * (h - pad * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const dots = trajectory.points
    .map((p, i) => {
      const x = pad + i * stepX;
      const y = h - pad - (p.tension / 100) * (h - pad * 2);
      const fill = p.isInflection ? '#ef4444' : '#8b5cf6';
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${fill}" />`;
    })
    .join('');

  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;max-width:${w}px;height:auto;background:#1a1a1a">
  <path d="${path}" fill="none" stroke="#8b5cf6" stroke-width="1.5" />
  ${dots}
</svg>`;
}

export function renderReportHtml(
  report: VerifierReport,
  episodes: EpisodeManuscript[] | null | undefined,
  language: Lang = 'ko',
): string {
  const t = L[language];
  const trajectory = buildTensionTrajectory(episodes);

  const violationsHtml =
    report.prioritized.length === 0
      ? `<p><em>${escapeHtml(t.none)}</em></p>`
      : `<ul>${report.prioritized
          .slice(0, 50)
          .map((v) => {
            const ep = v.episodeId ? ` (EP${v.episodeId})` : '';
            const sev = t.severity[v.severity];
            const color =
              v.severity === 'error' ? '#ef4444' : v.severity === 'warning' ? '#f59e0b' : '#3b82f6';
            const msg = escapeHtml(v.messages[language] ?? v.messages.ko);
            return `<li><strong style="color:${color}">[${escapeHtml(sev)}]</strong>${escapeHtml(ep)} ${msg}</li>`;
          })
          .join('')}</ul>`;

  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(t.title)}</title>
<style>
body{font-family:-apple-system,'Pretendard','Noto Sans KR','Noto Sans JP','Noto Sans SC',sans-serif;background:#0d0d0d;color:#e5e5e5;max-width:900px;margin:2em auto;padding:1em}
h1{font-size:1.5em;border-bottom:1px solid #333;padding-bottom:.3em}
h2{font-size:1.2em;margin-top:1.5em}
.score{font-size:3em;font-weight:bold;color:#8b5cf6}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #333;padding:.5em;text-align:center}
ul{padding-left:1.5em}
.meta{color:#888;font-size:.85em;margin-top:2em}
code{background:#1a1a1a;padding:.1em .3em;border-radius:3px}
</style>
</head>
<body>
<h1>${escapeHtml(t.title)}</h1>

<h2>${escapeHtml(t.overallScore)}</h2>
<div class="score">${report.overallScore} <span style="font-size:.4em;color:#888">/ 100</span></div>

<h2>${escapeHtml(t.axes)}</h2>
<table>
  <tr><th>${escapeHtml(t.plotDrift)}</th><th>${escapeHtml(t.characterArc)}</th><th>${escapeHtml(t.worldRule)}</th><th>${escapeHtml(t.foreshadow)}</th><th>${escapeHtml(t.tension)}</th></tr>
  <tr><td>${report.axes.plotDrift.score}</td><td>${report.axes.characterArc.score}</td><td>${report.axes.worldViolation.score}</td><td>${report.axes.foreshadow.score}</td><td>${report.axes.tension.score}</td></tr>
</table>

<h2>${escapeHtml(t.violations)} (${report.totalViolations})</h2>
${violationsHtml}

${trajectory.points.length > 0 ? `<h2>${escapeHtml(t.tensionGraph)}</h2>${renderTensionSvg(trajectory)}` : ''}

<div class="meta">
<p>${escapeHtml(t.generatedAt)}: ${escapeHtml(report.generatedAt)}</p>
<p>${escapeHtml(t.hash)}: <code>${escapeHtml(report.manuscriptHash)}</code></p>
</div>
</body>
</html>`;
}
