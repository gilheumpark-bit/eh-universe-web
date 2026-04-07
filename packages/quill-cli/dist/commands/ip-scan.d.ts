/**
 * Comprehensive SPDX license identifier database.
 * Each entry includes: regex for detection, SPDX ID, copyleft status,
 * a risk tier (permissive / weak-copyleft / strong-copyleft / restrictive),
 * and whether commercial use is allowed.
 */
interface SPDXLicense {
    regex: RegExp;
    license: string;
    spdxId: string;
    copyleft: boolean;
    riskTier: 'permissive' | 'weak-copyleft' | 'strong-copyleft' | 'restrictive' | 'public-domain';
    commercialOk: boolean;
}
declare const SPDX_LICENSE_DB: SPDXLicense[];
/**
 * Match a license string (from package.json or LICENSE file) to an SPDX entry.
 * Tries direct SPDX ID match first, then regex patterns.
 */
declare function matchLicense(licenseStr: string): SPDXLicense | null;
interface DepLicense {
    name: string;
    version: string;
    license: string;
    spdxId: string;
    copyleft: boolean;
    riskTier: string;
    isDirect: boolean;
    dependencyPath: string[];
}
/**
 * Scan transitive dependencies from package-lock.json.
 * Falls back to node_modules scanning if lockfile is unavailable.
 */
declare function scanDependencyLicenses(rootPath: string): DepLicense[];
interface CodeFinding {
    file: string;
    line: number;
    description: string;
    severity: 'info' | 'warning' | 'critical';
}
interface IPScore {
    total: number;
    grade: string;
    breakdown: {
        criticalFindings: number;
        warningFindings: number;
        infoFindings: number;
        strongCopyleft: number;
        weakCopyleft: number;
        restrictive: number;
        unknownLicenses: number;
        transitiveRisks: number;
    };
}
declare function calculateIPScore(findings: CodeFinding[], depLicenses: DepLicense[]): IPScore;
export declare function runIpScan(_path: string, _opts: Record<string, unknown>): Promise<void>;
export { SPDX_LICENSE_DB, matchLicense, scanDependencyLicenses, calculateIPScore };
