type CompatResult = 'compatible' | 'incompatible' | 'check-required';
/**
 * License compatibility matrix.
 * Key = project license, inner key = dependency license.
 * Determines whether using a dep under that license is compatible with the project license.
 */
declare const LICENSE_COMPAT_MATRIX: Record<string, Record<string, CompatResult>>;
interface CompatIssue {
    dependency: string;
    depLicense: string;
    projectLicense: string;
    result: CompatResult;
}
declare function checkLicenseCompatibility(projectLicense: string, deps: Array<{
    name: string;
    license: string;
}>): CompatIssue[];
interface ComplianceOptions {
    preRelease?: boolean;
}
export declare function runCompliance(_opts: ComplianceOptions): Promise<void>;
interface SBOMComponent {
    name: string;
    version: string;
    license: string;
    spdxId: string;
    purl: string;
    scope: 'required' | 'optional' | 'dev';
    isDirect: boolean;
    integrity?: string;
}
/**
 * Extract full dependency tree from package-lock.json for real SBOM generation.
 * Falls back to package.json + node_modules if lockfile unavailable.
 */
declare function collectSBOMComponents(): SBOMComponent[];
export declare function generateSBOM(format?: 'cyclonedx' | 'spdx'): Promise<string>;
/**
 * Export SBOM to a file in the specified format.
 */
export declare function exportSBOM(format?: 'cyclonedx' | 'spdx', outputPath?: string): Promise<string>;
export { checkLicenseCompatibility, LICENSE_COMPAT_MATRIX, collectSBOMComponents };
