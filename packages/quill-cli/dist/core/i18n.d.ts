type MsgKey = 'noFiles' | 'noReceipts' | 'noKeys' | 'noSession' | 'pass' | 'fail' | 'warn' | 'skip' | 'done' | 'error' | 'saved' | 'deleted' | 'generating' | 'verifying' | 'scanning' | 'analyzing' | 'addKey' | 'removeKey' | 'selectLang' | 'selectLevel' | 'improvement' | 'recommendation' | 'auditing' | 'benchmarking' | 'stressTesting' | 'checking' | 'learning' | 'explaining' | 'healing' | 'judging' | 'noAIKey' | 'offlineMode' | 'sessionExpired' | 'badgeEarned';
export declare function msg(key: MsgKey): string;
export declare function setLang(lang: string): void;
export declare const t: typeof msg;
export declare const setLanguage: typeof setLang;
export {};
