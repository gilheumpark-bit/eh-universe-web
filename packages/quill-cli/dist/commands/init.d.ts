interface DetectedFramework {
    name: string;
    version: string;
    category: 'frontend' | 'backend' | 'css' | 'build' | 'test' | 'language' | 'meta' | 'orm' | 'database' | 'state' | 'api';
}
declare function detectFrameworks(): DetectedFramework[];
interface MonorepoInfo {
    type: 'none' | 'npm-workspaces' | 'yarn-workspaces' | 'pnpm-workspaces' | 'lerna' | 'turborepo' | 'nx';
    workspaces: string[];
    packages: string[];
}
declare function detectMonorepo(): MonorepoInfo;
interface TestFrameworkInfo {
    framework: string | null;
    configFile: string | null;
    testDirs: string[];
    hasTestScript: boolean;
}
declare function detectTestFramework(): TestFrameworkInfo;
export declare function runInit(): Promise<void>;
export { detectFrameworks, detectMonorepo, detectTestFramework };
