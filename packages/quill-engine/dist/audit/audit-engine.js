// ============================================================
// Code Studio — Audit Engine: Orchestrator & Report Generator
// ============================================================
// Runs all 16 areas, combines scores, generates final report.
import { CATEGORY_WEIGHTS, AREA_TO_CATEGORY } from './audit-types';
import { auditOperations, auditComplexity, auditArchitecture, auditDependencies } from './audit-code-health';
import { auditTesting, auditErrorHandling, auditFeatureCompleteness, auditDocumentation } from './audit-quality';
import { auditDesignSystem, auditAccessibility, auditUXQuality, auditI18n } from './audit-ux';
import { auditSecurity, auditPerformance, auditAPIHealth, auditEnvConfig } from './audit-infra';
// ============================================================
// PART 1 — Grade Helper
// ============================================================
function gradeFromScore(s) {
    if (s >= 95)
        return 'S';
    if (s >= 85)
        return 'A';
    if (s >= 70)
        return 'B';
    if (s >= 55)
        return 'C';
    if (s >= 40)
        return 'D';
    return 'F';
}
// IDENTITY_SEAL: PART-1 | role=grade-helper | inputs=score | outputs=AuditGrade
// ============================================================
// PART 2 — Category Aggregation
// ============================================================
function buildCategoryResult(category, areas) {
    const categoryAreas = areas.filter(a => AREA_TO_CATEGORY[a.area] === category);
    if (categoryAreas.length === 0) {
        return { category, score: 0, grade: 'F', areas: [] };
    }
    const avgScore = Math.round(categoryAreas.reduce((s, a) => s + a.score, 0) / categoryAreas.length);
    return {
        category,
        score: avgScore,
        grade: gradeFromScore(avgScore),
        areas: categoryAreas,
    };
}
// IDENTITY_SEAL: PART-2 | role=category-aggregation | inputs=AuditAreaResult[] | outputs=AuditCategoryResult
// ============================================================
// PART 3 — Urgent Items Extraction
// ============================================================
function extractUrgentItems(areas, limit = 10) {
    const severityOrder = {
        critical: 0, high: 1, medium: 2, low: 3, info: 4,
    };
    const allFindings = areas.flatMap(a => a.findings);
    const sorted = [...allFindings].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    return sorted.slice(0, limit).map((f, i) => ({
        rank: i + 1,
        area: f.area,
        severity: f.severity,
        message: f.message,
        file: f.file,
    }));
}
export function runProjectAudit(ctx, onProgress) {
    const startTime = performance.now();
    const total = 16;
    let idx = 0;
    function progress(area) {
        onProgress?.(area, ++idx, total);
    }
    // A. Code Health
    progress('operations');
    const operations = auditOperations(ctx);
    progress('complexity');
    const complexity = auditComplexity(ctx);
    progress('architecture');
    const architecture = auditArchitecture(ctx);
    progress('dependencies');
    const dependencies = auditDependencies(ctx);
    // B. Quality
    progress('testing');
    const testing = auditTesting(ctx);
    progress('error-handling');
    const errorHandling = auditErrorHandling(ctx);
    progress('feature-completeness');
    const featureCompleteness = auditFeatureCompleteness(ctx);
    progress('documentation');
    const documentation = auditDocumentation(ctx);
    // C. User Experience
    progress('design-system');
    const designSystem = auditDesignSystem(ctx);
    progress('accessibility');
    const accessibility = auditAccessibility(ctx);
    progress('ux-quality');
    const uxQuality = auditUXQuality(ctx);
    progress('i18n');
    const i18n = auditI18n(ctx);
    // D. Infra & Security
    progress('security');
    const security = auditSecurity(ctx);
    progress('performance');
    const perf = auditPerformance(ctx);
    progress('api-health');
    const apiHealth = auditAPIHealth(ctx);
    progress('env-config');
    const envConfig = auditEnvConfig(ctx);
    const allAreas = [
        operations, complexity, architecture, dependencies,
        testing, errorHandling, featureCompleteness, documentation,
        designSystem, accessibility, uxQuality, i18n,
        security, perf, apiHealth, envConfig,
    ];
    // Build categories
    const categories = [
        buildCategoryResult('code-health', allAreas),
        buildCategoryResult('quality', allAreas),
        buildCategoryResult('user-experience', allAreas),
        buildCategoryResult('infra-security', allAreas),
    ];
    // Weighted total score
    const totalScore = Math.round(categories.reduce((s, c) => s + c.score * (CATEGORY_WEIGHTS[c.category] ?? 0.25), 0));
    // Hard gate: security critical → fail
    const securityCriticals = security.findings.filter(f => f.severity === 'critical');
    const hardGateFail = securityCriticals.length > 0;
    const hardGateReason = hardGateFail
        ? `보안 CRITICAL ${securityCriticals.length}건: ${securityCriticals.map(f => f.rule).join(', ')}`
        : undefined;
    // Finding counts
    const findingsBySeverity = {
        critical: 0, high: 0, medium: 0, low: 0, info: 0,
    };
    for (const a of allAreas) {
        for (const f of a.findings) {
            findingsBySeverity[f.severity]++;
        }
    }
    const urgent = extractUrgentItems(allAreas);
    const duration = Math.round(performance.now() - startTime);
    return {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `audit_${Date.now()}`,
        timestamp: Date.now(),
        version: '1.0.0',
        totalScore: hardGateFail ? Math.min(totalScore, 30) : totalScore,
        totalGrade: hardGateFail ? 'F' : gradeFromScore(totalScore),
        hardGateFail,
        hardGateReason,
        categories,
        areas: allAreas,
        urgent,
        totalChecks: allAreas.reduce((s, a) => s + a.checks, 0),
        totalFindings: allAreas.reduce((s, a) => s + a.findings.length, 0),
        findingsBySeverity,
        duration,
    };
}
// IDENTITY_SEAL: PART-4 | role=orchestrator | inputs=AuditContext | outputs=AuditReport
// ============================================================
// PART 5 — Report Formatter (Text)
// ============================================================
export function formatAuditReport(report, lang = 'ko') {
    const labels = lang === 'ko'
        ? { title: '프로젝트 감사 보고서', score: '종합 점수', areas: '영역', checks: '검사', findings: '발견', urgent: '시급 항목', hardGate: '하드 게이트', pass: '통과', fail: '실패', duration: '소요 시간', category: '카테고리' }
        : { title: 'PROJECT AUDIT REPORT', score: 'Total Score', areas: 'Areas', checks: 'Checks', findings: 'Findings', urgent: 'Urgent Items', hardGate: 'Hard Gate', pass: 'PASS', fail: 'FAIL', duration: 'Duration', category: 'Category' };
    const lines = [];
    const divider = '═'.repeat(52);
    const thinDiv = '─'.repeat(52);
    lines.push(divider);
    lines.push(`  ${labels.title}`);
    lines.push(`  ${labels.score}: ${report.totalScore}/100 (${report.totalGrade})`);
    lines.push(`  16 ${labels.areas} · ${report.totalChecks} ${labels.checks} · ${report.totalFindings} ${labels.findings}`);
    if (report.hardGateFail) {
        lines.push(`  ❌ ${labels.hardGate}: ${labels.fail} — ${report.hardGateReason}`);
    }
    else {
        lines.push(`  ✅ ${labels.hardGate}: ${labels.pass}`);
    }
    lines.push(divider);
    // Category scores
    lines.push('');
    for (const cat of report.categories) {
        const catLabel = lang === 'ko'
            ? { 'code-health': '코드 건강', quality: '품질 보증', 'user-experience': '사용자 경험', 'infra-security': '인프라 & 보안' }[cat.category]
            : { 'code-health': 'Code Health', quality: 'Quality', 'user-experience': 'User Experience', 'infra-security': 'Infra & Security' }[cat.category];
        const bar = '█'.repeat(Math.round(cat.score / 5)) + '░'.repeat(20 - Math.round(cat.score / 5));
        lines.push(`  ${catLabel?.padEnd(16)} ${bar} ${cat.score}/100 (${cat.grade})`);
    }
    lines.push('');
    lines.push(thinDiv);
    // Area details
    for (const cat of report.categories) {
        lines.push('');
        const catLabel = lang === 'ko'
            ? { 'code-health': 'A. 코드 건강', quality: 'B. 품질 보증', 'user-experience': 'C. 사용자 경험', 'infra-security': 'D. 인프라 & 보안' }[cat.category]
            : { 'code-health': 'A. Code Health', quality: 'B. Quality', 'user-experience': 'C. User Experience', 'infra-security': 'D. Infra & Security' }[cat.category];
        lines.push(`  ${catLabel}`);
        for (const area of cat.areas) {
            const areaLabel = lang === 'ko'
                ? { operations: '운영성', complexity: '복잡도', architecture: '아키텍처', dependencies: '의존성', testing: '테스트', 'error-handling': '에러 핸들링', 'feature-completeness': '기능 완성도', documentation: '문서', 'design-system': '디자인 시스템', accessibility: '접근성', 'ux-quality': 'UX 품질', i18n: '국제화', security: '보안', performance: '성능', 'api-health': 'API 건강', 'env-config': '환경 설정' }[area.area]
                : area.area;
            const icon = area.grade === 'S' || area.grade === 'A' ? '✅' : area.grade === 'B' ? '🔶' : area.grade === 'C' ? '⚠️' : '❌';
            lines.push(`    ${icon} ${(areaLabel ?? area.area).padEnd(14)} ${area.score.toString().padStart(3)}/100 (${area.grade}) — ${area.passed}/${area.checks} ${labels.pass}`);
        }
    }
    lines.push('');
    lines.push(thinDiv);
    // Severity summary
    lines.push('');
    lines.push(`  ${labels.findings}:`);
    lines.push(`    CRITICAL: ${report.findingsBySeverity.critical}  HIGH: ${report.findingsBySeverity.high}  MEDIUM: ${report.findingsBySeverity.medium}  LOW: ${report.findingsBySeverity.low}`);
    // Urgent items
    lines.push('');
    lines.push(thinDiv);
    lines.push(`  TOP ${report.urgent.length} ${labels.urgent}`);
    lines.push('');
    for (const item of report.urgent) {
        const icon = item.severity === 'critical' ? '🔴' : item.severity === 'high' ? '🟠' : item.severity === 'medium' ? '🟡' : '🔵';
        lines.push(`  ${item.rank.toString().padStart(2)}. ${icon} [${item.area}] ${item.message}${item.file ? ` (${item.file.split('/').pop()})` : ''}`);
    }
    lines.push('');
    lines.push(thinDiv);
    lines.push(`  ${labels.duration}: ${report.duration}ms`);
    lines.push(`  Generated: ${new Date(report.timestamp).toISOString()}`);
    lines.push(divider);
    return lines.join('\n');
}
// IDENTITY_SEAL: PART-5 | role=report-formatter | inputs=AuditReport | outputs=string
