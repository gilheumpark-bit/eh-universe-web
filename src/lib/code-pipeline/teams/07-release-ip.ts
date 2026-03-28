// ============================================================
// Team 7: Release Gate & IP Firewall
// Ported from csl_team_agent/release/ip_firewall.py + release_gate.py
// ============================================================

import type { TeamResult, Finding, PipelineContext } from "../types";

// ── IP Firewall Patterns (from ip_firewall.py) ──

const IP_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /copyright\s*©?\s*\d{4}/i, message: "저작권 표시 감지" },
  { pattern: /all\s+rights?\s+reserved/i, message: "'All rights reserved' 감지" },
  { pattern: /licen[sc]ed?\s+under/i, message: "라이선스 조항 감지" },
  { pattern: /proprietary/i, message: "'Proprietary' 마킹 감지" },
  { pattern: /confidential/i, message: "'Confidential' 마킹 감지" },
];

const SUSPICIOUS_IMPORTS = [
  /from\s+['"]internal_/,
  /from\s+['"]proprietary_/,
  /import\s+.*_private_api/,
];

// ── Secret Detection ──

const SECRET_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{4,}["']/i, message: "하드코딩된 비밀번호" },
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][A-Za-z0-9_-]{16,}["']/i, message: "하드코딩된 API 키" },
  { pattern: /(?:secret|token|bearer)\s*[:=]\s*["'][A-Za-z0-9_-]{16,}["']/i, message: "하드코딩된 시크릿/토큰" },
  { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/, message: "프라이빗 키 감지" },
  { pattern: /(?:aws_access_key_id|aws_secret)\s*[:=]/i, message: "AWS 자격증명 감지" },
];

// ── Encoded Secret Detection ──

const BASE64_PATTERN = /(?:[A-Za-z0-9+/]{20,}={0,2})/;
const HEX_ENCODED_PATTERN = /(?:0x[0-9a-fA-F]{16,}|[0-9a-fA-F]{32,})/;
const URL_ENCODED_CRED_PATTERN = /(?:password|passwd|pwd|secret|token|key)=[^&\s]*%[0-9A-Fa-f]{2}/i;

function isPrintableAscii(str: string): boolean {
  return /^[\x20-\x7E]+$/.test(str);
}

function looksLikeEncodedSecret(line: string): { found: boolean; message: string } {
  // Base64-encoded secrets
  const b64Match = line.match(BASE64_PATTERN);
  if (b64Match) {
    try {
      const decoded = atob(b64Match[0]);
      if (decoded.length > 8 && isPrintableAscii(decoded)) {
        return { found: true, message: "Base64 인코딩된 시크릿 의심" };
      }
    } catch {
      // not valid base64, ignore
    }
  }

  // Hex-encoded secrets
  if (HEX_ENCODED_PATTERN.test(line)) {
    return { found: true, message: "Hex 인코딩된 시크릿 의심" };
  }

  // URL-encoded credentials
  if (URL_ENCODED_CRED_PATTERN.test(line)) {
    return { found: true, message: "URL 인코딩된 자격증명 감지" };
  }

  return { found: false, message: "" };
}

// ── PII Detection ──

const PII_PATTERNS: { pattern: RegExp; message: string; rule: string }[] = [
  { pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, message: "이메일 주소 감지", rule: "PII_EMAIL" },
  { pattern: /010-\d{4}-\d{4}/, message: "한국 전화번호 감지 (010-XXXX-XXXX)", rule: "PII_PHONE_KR" },
  { pattern: /\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/, message: "국제 전화번호 감지", rule: "PII_PHONE_INTL" },
  { pattern: /\d{6}-[1-4]\d{6}/, message: "주민등록번호 감지", rule: "PII_RRN" },
  { pattern: /(?<!\d)\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}(?!\d)/, message: "신용카드 번호 감지", rule: "PII_CREDIT_CARD" },
  { pattern: /(?<!\d)(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?!\d)/, message: "하드코딩된 IP 주소 감지", rule: "PII_IP_ADDRESS" },
];

// ── Database Connection String Detection ──

const DB_CONN_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /mongodb(?:\+srv)?:\/\/[^\s"']+/i, message: "MongoDB 연결 문자열 감지" },
  { pattern: /postgres(?:ql)?:\/\/[^\s"']+/i, message: "PostgreSQL 연결 문자열 감지" },
  { pattern: /mysql:\/\/[^\s"']+/i, message: "MySQL 연결 문자열 감지" },
  { pattern: /redis:\/\/[^\s"']+/i, message: "Redis 연결 문자열 감지" },
  { pattern: /jdbc:[a-z]+:\/\/[^\s"']+/i, message: "JDBC 연결 문자열 감지" },
  { pattern: /(?:mongodb|postgres|mysql|redis|jdbc)[^"']*[:@][^"']*(?:password|passwd|pwd)[^\s"']*/i, message: "비밀번호 포함 연결 문자열 감지" },
];

// ── License Compatibility Detection ──

const KNOWN_GPL_PACKAGES = [
  "readline", "ghostscript", "ffmpeg", "gmp", "classpath",
  "mysql-connector-java", "linux-kernel-headers", "qtwebkit",
  "gnu-getopt", "samba-client", "bash", "coreutils",
];

const GPL_INDICATORS: RegExp[] = [
  /GPL[-\s]?[23](?:\.\d)?/i,
  /GNU\s+General\s+Public\s+License/i,
  /AGPL/i,
  /LGPL/i,
  /copyleft/i,
];

function detectLicenseIssues(code: string): Finding[] {
  const findings: Finding[] = [];
  const lines = code.split("\n");

  // Check for GPL references in MIT/BSD/Apache projects
  const licenseHeaderLines = lines.slice(0, 30).join("\n");
  const isMITOrPermissive = /MIT\s+License|BSD\s+License|Apache\s+License/i.test(licenseHeaderLines);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect GPL indicators in code/comments
    for (const gplPattern of GPL_INDICATORS) {
      if (gplPattern.test(line)) {
        const severity = isMITOrPermissive ? "critical" : "major";
        findings.push({
          severity,
          message: isMITOrPermissive
            ? `[라이선스] 퍼미시브 프로젝트에 GPL 코드 혼합 의심`
            : `[라이선스] GPL 라이선스 참조 감지`,
          line: i + 1,
          rule: "LICENSE_GPL_COMPAT",
        });
        break;
      }
    }

    // Detect imports of known copyleft packages
    for (const pkg of KNOWN_GPL_PACKAGES) {
      const importPattern = new RegExp(`(?:from|import|require)\\s*[("'].*${pkg}`, "i");
      if (importPattern.test(line)) {
        findings.push({
          severity: "major",
          message: `[라이선스] GPL 라이선스 패키지 사용 의심: ${pkg}`,
          line: i + 1,
          rule: "LICENSE_COPYLEFT_PKG",
        });
      }
    }
  }

  // Check for missing license declaration
  const hasLicenseDeclaration = /licen[sc]e|copyright|©|\(c\)/i.test(lines.slice(0, 10).join("\n"));
  if (!hasLicenseDeclaration && lines.length > 20) {
    findings.push({
      severity: "minor",
      message: "[라이선스] 라이선스 선언 누락 — 파일 상단에 라이선스 표기 권장",
      rule: "LICENSE_MISSING",
    });
  }

  return findings;
}

export function runReleaseIP(ctx: PipelineContext): TeamResult {
  const start = performance.now();
  const lines = ctx.code.split("\n");
  const findings: Finding[] = [];

  // IP Scan
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { pattern, message } of IP_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({ severity: "major", message: `[IP] ${message}`, line: i + 1, rule: "IP_MARKER" });
      }
    }
    for (const pat of SUSPICIOUS_IMPORTS) {
      if (pat.test(line)) {
        findings.push({ severity: "major", message: "[IP] 의심스러운 내부 모듈 import", line: i + 1, rule: "SUSPICIOUS_IMPORT" });
      }
    }
  }

  // Secret Scan
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { pattern, message } of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({ severity: "critical", message: `[보안] ${message}`, line: i + 1, rule: "HARDCODED_SECRET" });
      }
    }
  }

  // Encoded Secret Scan
  for (let i = 0; i < lines.length; i++) {
    const result = looksLikeEncodedSecret(lines[i]);
    if (result.found) {
      findings.push({ severity: "critical", message: `[보안] ${result.message}`, line: i + 1, rule: "ENCODED_SECRET" });
    }
  }

  // PII Scan
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { pattern, message, rule } of PII_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({ severity: "major", message: `[PII] ${message}`, line: i + 1, rule });
      }
    }
  }

  // Database Connection String Scan
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { pattern, message } of DB_CONN_PATTERNS) {
      if (pattern.test(line)) {
        findings.push({ severity: "critical", message: `[보안] ${message}`, line: i + 1, rule: "DB_CONNECTION_STRING" });
      }
    }
  }

  // License Compatibility Scan
  findings.push(...detectLicenseIssues(ctx.code));

  // Release Gate Decision
  const criticals = findings.filter((f) => f.severity === "critical").length;
  const blocked = criticals > 0;
  const score = Math.max(0, 100 - criticals * 30 - (findings.length - criticals) * 5);

  return {
    team: "release-ip",
    status: blocked ? "fail" : findings.length > 0 ? "warn" : "pass",
    score,
    message: blocked
      ? `릴리즈 차단: ${criticals}개 보안 위반`
      : findings.length > 0
        ? `${findings.length}개 IP/보안 주의사항`
        : "릴리즈 승인 — CLEAN",
    findings,
    suggestions: [],
    durationMs: Math.round(performance.now() - start),
  };
}
