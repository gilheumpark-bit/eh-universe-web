// ============================================================
// Code Studio — Patent/IP Scanner
// ============================================================
// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=LicenseInfo,CodePatternMatch,IPReport
// ============================================================
// PART 2 — License Detection
// ============================================================
const LICENSE_PATTERNS = [
    { regex: /MIT License/i, license: 'MIT', spdxId: 'MIT' },
    { regex: /Apache License.*2\.0/i, license: 'Apache 2.0', spdxId: 'Apache-2.0' },
    { regex: /GNU General Public License.*v3/i, license: 'GPL-3.0', spdxId: 'GPL-3.0-only' },
    { regex: /GNU General Public License.*v2/i, license: 'GPL-2.0', spdxId: 'GPL-2.0-only' },
    { regex: /BSD 3-Clause/i, license: 'BSD-3-Clause', spdxId: 'BSD-3-Clause' },
    { regex: /BSD 2-Clause/i, license: 'BSD-2-Clause', spdxId: 'BSD-2-Clause' },
    { regex: /ISC License/i, license: 'ISC', spdxId: 'ISC' },
    { regex: /Mozilla Public License.*2\.0/i, license: 'MPL-2.0', spdxId: 'MPL-2.0' },
    { regex: /Creative Commons/i, license: 'CC', spdxId: 'CC-BY-4.0' },
    { regex: /Unlicense/i, license: 'Unlicense', spdxId: 'Unlicense' },
];
const HEADER_PATTERNS = [
    /^\s*\/\*[\s\S]*?Copyright/m,
    /^\s*\/\/.*Copyright/m,
    /^\s*#.*Copyright/m,
    /^\s*\/\*[\s\S]*?License/m,
    /^\s*\/\/.*SPDX-License-Identifier/m,
];
function detectLicense(content) {
    for (const p of LICENSE_PATTERNS) {
        if (p.regex.test(content))
            return { license: p.license, spdxId: p.spdxId };
    }
    return null;
}
function hasLicenseHeader(content) {
    return HEADER_PATTERNS.some((p) => p.test(content.slice(0, 500)));
}
// IDENTITY_SEAL: PART-2 | role=license detection | inputs=file content | outputs=LicenseInfo
// ============================================================
// PART 3 — Code Pattern Scanning
// ============================================================
const SUSPICIOUS_PATTERNS = [
    { regex: /stackoverflow\.com/i, description: 'Stack Overflow reference detected', severity: 'info' },
    { regex: /copied from|taken from|based on/i, description: 'Copy attribution comment', severity: 'warning' },
    { regex: /TODO:\s*remove|HACK|FIXME:\s*license/i, description: 'IP-related TODO/FIXME', severity: 'warning' },
    { regex: /all rights reserved/i, description: 'All rights reserved notice', severity: 'critical' },
    { regex: /proprietary|confidential/i, description: 'Proprietary/confidential marker', severity: 'critical' },
    { regex: /patent pending|patented/i, description: 'Patent reference', severity: 'critical' },
];
function flattenFiles(nodes, prefix = '') {
    const out = [];
    for (const n of nodes) {
        const p = prefix ? `${prefix}/${n.name}` : n.name;
        if (n.type === 'file' && n.content != null)
            out.push({ path: p, content: n.content });
        if (n.children)
            out.push(...flattenFiles(n.children, p));
    }
    return out;
}
// IDENTITY_SEAL: PART-3 | role=pattern scanning | inputs=FileNode[] | outputs=CodePatternMatch[]
// ============================================================
// PART 4 — Report Generation
// ============================================================
export function scanProject(files) {
    const flat = flattenFiles(files);
    const licenses = [];
    const patterns = [];
    for (const f of flat) {
        // License detection
        const lic = detectLicense(f.content);
        if (lic || /license/i.test(f.path)) {
            licenses.push({
                file: f.path,
                license: lic?.license ?? 'Unknown',
                spdxId: lic?.spdxId ?? '',
                hasHeader: hasLicenseHeader(f.content),
                isOSS: !!lic,
            });
        }
        // Pattern scanning
        const lines = f.content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            for (const sp of SUSPICIOUS_PATTERNS) {
                if (sp.regex.test(lines[i])) {
                    patterns.push({
                        file: f.path,
                        line: i + 1,
                        pattern: lines[i].trim().slice(0, 100),
                        description: sp.description,
                        severity: sp.severity,
                    });
                }
            }
        }
    }
    const criticals = patterns.filter((p) => p.severity === 'critical').length;
    const warnings = patterns.filter((p) => p.severity === 'warning').length;
    const score = Math.max(0, 100 - criticals * 25 - warnings * 10);
    const grade = score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : score >= 30 ? 'D' : 'F';
    const recommendations = [];
    if (licenses.length === 0)
        recommendations.push('Add a LICENSE file to the project');
    if (criticals > 0)
        recommendations.push('Review critical IP flags before distribution');
    if (flat.some((f) => !hasLicenseHeader(f.content) && /\.(ts|tsx|js|jsx)$/.test(f.path))) {
        recommendations.push('Consider adding license headers to source files');
    }
    return {
        licenses,
        patterns,
        score,
        grade,
        summary: `IP scan: ${score}/100 (${grade}). ${licenses.length} license files, ${patterns.length} patterns flagged.`,
        recommendations,
    };
}
// IDENTITY_SEAL: PART-4 | role=report | inputs=FileNode[] | outputs=IPReport
