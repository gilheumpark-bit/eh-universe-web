// ============================================================
// grep-verifier.ts — 5축 검증 (browser 환경 한계 — Phase 1 휴리스틱).
//
// 브라우저 환경에서 실제 fs grep 불가. 대신:
//   1. callers — claim 컨텍스트 단어 패턴
//   2. placeholder — TODO/FIXME/placeholder/stub 패턴
//   3. wired — mount/wire/register 동사 누락 여부
//   4. default — "default OFF / 기본 OFF" 표현
//   5. path — claim 의 filePath 형식 검증
// ============================================================

import type { AxisVerdict, ClaimVerification, CompletionClaim, GapSeverity } from './types';

function verifyCallers(_claim: CompletionClaim, claimContext: string): AxisVerdict {
  const hasCallerEvidence = /import|호출|callers?|wired|mount|register/i.test(claimContext);
  const isNew = /신설|신규|added|created|작성/i.test(claimContext);

  if (hasCallerEvidence) {
    return { axis: 'callers', severity: 'pass', message: { ko: '호출처 언급 있음', en: 'Caller evidence present' } };
  }
  if (isNew) {
    return {
      axis: 'callers',
      severity: 'warn',
      message: {
        ko: '신규 작성 — 호출처 검증 필요 (LSP 서버 검증 권장)',
        en: 'New file — caller verification needed (LSP server check recommended)',
      },
    };
  }
  return { axis: 'callers', severity: 'warn', message: { ko: '호출처 정보 부재', en: 'No caller evidence' } };
}

function verifyPlaceholder(_claim: CompletionClaim, claimContext: string): AxisVerdict {
  if (/(TODO|FIXME|placeholder|stub|return\s*\{\s*\}|return\s*null)/i.test(claimContext)) {
    return {
      axis: 'placeholder',
      severity: 'fail',
      message: { ko: 'placeholder/TODO 패턴 감지', en: 'placeholder/TODO pattern detected' },
    };
  }
  return { axis: 'placeholder', severity: 'pass', message: { ko: 'placeholder 없음', en: 'No placeholder' } };
}

function verifyWired(claim: CompletionClaim, claimContext: string): AxisVerdict {
  if (/(mount|wire|register|inject|등록|연결|적용)/i.test(claimContext)) {
    return { axis: 'wired', severity: 'pass', message: { ko: 'wiring 표현 확인', en: 'Wiring confirmed' } };
  }
  if (claim.kind === 'wired' || claim.kind === 'implemented') {
    return {
      axis: 'wired',
      severity: 'warn',
      message: {
        ko: 'wiring 표현 부재 — UI mount 또는 hook 호출 명시 필요',
        en: 'No wiring evidence — UI mount or hook call needed',
      },
    };
  }
  return { axis: 'wired', severity: 'pass', message: { ko: '해당 없음', en: 'N/A' } };
}

function verifyDefault(_claim: CompletionClaim, claimContext: string): AxisVerdict {
  if (/(default[\s:]+(?:false|off|OFF|비활성))|(?:enabled[\s:]+false)|(?:기본\s+OFF)/i.test(claimContext)) {
    return {
      axis: 'default',
      severity: 'warn',
      message: {
        ko: 'default OFF — 사실상 미적용. 사용자가 켜야 작동',
        en: 'Default OFF — feature dormant unless user enables',
      },
    };
  }
  return { axis: 'default', severity: 'pass', message: { ko: 'default 활성', en: 'Default active' } };
}

function verifyPath(claim: CompletionClaim, _claimContext: string): AxisVerdict {
  if (!claim.filePath) {
    return { axis: 'path', severity: 'warn', message: { ko: '파일 경로 미명시', en: 'No file path specified' } };
  }
  if (!/^src\/.+\.(?:ts|tsx)$/.test(claim.filePath)) {
    return {
      axis: 'path',
      severity: 'warn',
      message: { ko: `파일 경로 형식 의심: ${claim.filePath}`, en: `Suspect file path format: ${claim.filePath}` },
      meta: { filePath: claim.filePath },
    };
  }
  return {
    axis: 'path',
    severity: 'pass',
    message: { ko: '경로 형식 OK', en: 'Path format OK' },
    meta: { filePath: claim.filePath },
  };
}

const SEVERITY_WEIGHT: Record<GapSeverity, number> = { pass: 100, warn: 60, fail: 0 };
const SEVERITY_RANK: Record<GapSeverity, number> = { pass: 0, warn: 1, fail: 2 };

export function verifyClaim(claim: CompletionClaim, fullText: string): ClaimVerification {
  const idx = fullText.indexOf(claim.surface);
  const start = idx >= 0 ? Math.max(0, idx - 300) : 0;
  const end = idx >= 0 ? Math.min(fullText.length, idx + claim.surface.length + 300) : fullText.length;
  const ctx = fullText.slice(start, end);

  const verdicts: AxisVerdict[] = [
    verifyCallers(claim, ctx),
    verifyPlaceholder(claim, ctx),
    verifyWired(claim, ctx),
    verifyDefault(claim, ctx),
    verifyPath(claim, ctx),
  ];

  const gapScore = Math.round(
    verdicts.reduce((sum, v) => sum + SEVERITY_WEIGHT[v.severity], 0) / verdicts.length,
  );
  const worst = verdicts.reduce<GapSeverity>(
    (acc, v) => (SEVERITY_RANK[v.severity] > SEVERITY_RANK[acc] ? v.severity : acc),
    'pass' as GapSeverity,
  );

  return { claim, verdicts, gapScore, overallSeverity: worst };
}
