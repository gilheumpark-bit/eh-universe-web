#!/usr/bin/env node
/**
 * lighthouse-check — 로컬 서버 대상 Lighthouse 프로그래매틱 러너.
 *
 * 사용:
 *   npm start &         # 또는 next dev
 *   npm run lh:check
 *
 * 환경변수:
 *   LIGHTHOUSE_URLS   쉼표 구분 URL 목록 (기본: localhost:3000 루트/studio/translation-studio)
 *   LIGHTHOUSE_PORT   Lighthouse가 사용할 Chrome 디버그 포트 (기본: 9222)
 *
 * 출력: docs/lighthouse-report.md
 *   Performance / Accessibility / Best Practices / SEO 점수 표 + 임계치 플래그.
 *
 * 임계치: 어느 점수든 75 미만이면 비-0 exit code.
 */

// ============================================================
// PART 1 — Imports & Config
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const docsDir = path.join(root, 'docs');

const DEFAULT_URLS = [
  'http://localhost:3000/',
  'http://localhost:3000/studio',
  'http://localhost:3000/translation-studio',
];

const SCORE_THRESHOLD = 75;

// ============================================================
// PART 2 — URL / Config Resolution
// ============================================================

function resolveUrls() {
  const raw = process.env.LIGHTHOUSE_URLS;
  if (!raw) return DEFAULT_URLS;
  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_URLS;
}

function categoryScore(result, key) {
  const cat = result?.lhr?.categories?.[key];
  if (!cat || typeof cat.score !== 'number') return null;
  return Math.round(cat.score * 100);
}

// ============================================================
// PART 3 — Lighthouse Runner
// ============================================================

/**
 * 단일 URL 에 대해 Lighthouse 실행. Chrome 인스턴스는 호출 측에서 관리.
 *
 * [C] try/catch 로 단일 URL 실패가 전체를 중단하지 않도록.
 * [G] 순차 실행 — Chrome 한 개만 띄우고 재사용.
 * [K] lighthouse 동적 import — 타입 미설치 환경에서도 스크립트 로드.
 */
async function runOne(lighthouse, url, port) {
  try {
    const result = await lighthouse(
      url,
      {
        port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    );
    return {
      url,
      ok: true,
      performance: categoryScore(result, 'performance'),
      accessibility: categoryScore(result, 'accessibility'),
      bestPractices: categoryScore(result, 'best-practices'),
      seo: categoryScore(result, 'seo'),
    };
  } catch (err) {
    return {
      url,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================================
// PART 4 — Report Rendering
// ============================================================

function renderReport(rows) {
  const lines = [];
  lines.push('# Lighthouse Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Threshold: every category ≥ ${SCORE_THRESHOLD}`);
  lines.push('');
  lines.push('| URL | Performance | Accessibility | Best Practices | SEO | Status |');
  lines.push('|-----|-------------|---------------|----------------|-----|--------|');

  for (const r of rows) {
    if (!r.ok) {
      lines.push(`| ${r.url} | — | — | — | — | error: ${r.error?.slice(0, 80) ?? 'unknown'} |`);
      continue;
    }
    const scores = [r.performance, r.accessibility, r.bestPractices, r.seo];
    const minScore = scores.reduce(
      (min, s) => (typeof s === 'number' && (min === null || s < min) ? s : min),
      null,
    );
    const status =
      typeof minScore === 'number' && minScore < SCORE_THRESHOLD
        ? `⚠️ min ${minScore}`
        : 'ok';
    lines.push(
      `| ${r.url} | ${r.performance ?? '—'} | ${r.accessibility ?? '—'} | ${r.bestPractices ?? '—'} | ${r.seo ?? '—'} | ${status} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

// ============================================================
// PART 5 — Main
// ============================================================

async function main() {
  const urls = resolveUrls();
  const port = Number(process.env.LIGHTHOUSE_PORT ?? 9222);

  // [확인 필요] chrome-launcher / lighthouse 의 exports 구조는 버전별 변동 — try/catch.
  let launchChrome;
  let lighthouse;
  try {
    const clMod = await import('chrome-launcher');
    launchChrome = clMod.launch ?? clMod.default?.launch;
    const lhMod = await import('lighthouse');
    lighthouse = lhMod.default ?? lhMod;
    if (typeof lighthouse !== 'function') {
      // lighthouse 는 default export 가 함수. 아니면 중첩 확인.
      lighthouse = lhMod.default?.default ?? lhMod.lighthouse ?? lighthouse;
    }
  } catch (err) {
    console.error('[lighthouse-check] dependencies missing:', err?.message ?? err);
    console.error('Run: npm install -D lighthouse');
    process.exit(2);
  }

  if (typeof launchChrome !== 'function' || typeof lighthouse !== 'function') {
    console.error('[lighthouse-check] invalid exports from chrome-launcher/lighthouse');
    process.exit(2);
  }

  console.log(`[lighthouse-check] running against ${urls.length} URL(s) on port ${port}`);

  const chrome = await launchChrome({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
    port,
  });

  const rows = [];
  try {
    for (const u of urls) {
      console.log(`  → ${u}`);
      const row = await runOne(lighthouse, u, chrome.port);
      rows.push(row);
    }
  } finally {
    await chrome.kill().catch(() => {});
  }

  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  const report = renderReport(rows);
  const outPath = path.join(docsDir, 'lighthouse-report.md');
  fs.writeFileSync(outPath, report, 'utf8');
  console.log('');
  console.log(report);
  console.log(`Wrote ${path.relative(root, outPath)}`);

  // 임계치 미달 시 exit 1 — CI 실패 신호.
  const failed = rows.some((r) => {
    if (!r.ok) return true;
    return [r.performance, r.accessibility, r.bestPractices, r.seo].some(
      (s) => typeof s === 'number' && s < SCORE_THRESHOLD,
    );
  });
  if (failed) {
    console.error(`[lighthouse-check] at least one score < ${SCORE_THRESHOLD} or run failed`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[lighthouse-check] unexpected error:', err);
  process.exit(3);
});

// IDENTITY_SEAL: PART-1~5 | role=lighthouse-runner | threshold=75 | default=localhost:3000
