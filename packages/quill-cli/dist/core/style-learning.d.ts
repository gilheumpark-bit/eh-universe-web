export interface StyleProfile {
    projectId: string;
    updatedAt: number;
    naming: {
        camelCase: number;
        pascalCase: number;
        snakeCase: number;
        kebabCase: number;
        preferred: string;
    };
    formatting: {
        useSemicolons: boolean;
        singleQuotes: boolean;
        avgLineLength: number;
        tabWidth: number;
    };
    patterns: {
        usesTypeScript: boolean;
        usesArrowFunctions: boolean;
        preferConst: boolean;
        usesAsyncAwait: boolean;
        usesJSX: boolean;
    };
    imports: {
        usesPathAlias: boolean;
        aliasPrefix: string;
        groupOrder: string[];
    };
    aggressiveness: number;
    totalSuggestions: number;
    acceptedSuggestions: number;
}
export declare function scanProjectStyle(rootPath: string): StyleProfile;
export declare function saveProfile(profile: StyleProfile): void;
export declare function loadProfile(projectId: string): StyleProfile | null;
export declare function recordSuggestionResult(projectId: string, accepted: boolean): void;
export declare function buildStyleDirective(profile: StyleProfile): string;
