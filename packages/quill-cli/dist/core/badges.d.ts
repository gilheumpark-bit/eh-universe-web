import type { ReceiptData } from '../formatters/receipt';
export interface Badge {
    id: string;
    name: string;
    icon: string;
    description: string;
    condition: (ctx: BadgeContext) => boolean;
}
export interface Challenge {
    id: string;
    name: string;
    icon: string;
    description: string;
    goal: string;
    check: (ctx: BadgeContext) => {
        progress: number;
        total: number;
    };
}
export interface BadgeContext {
    receipts: ReceiptData[];
    totalGenerations: number;
    passRate: number;
    avgScore: number;
    consecutivePasses: number;
    hollowCount: number;
    maxScore: number;
}
export declare const BADGES: Badge[];
export declare const CHALLENGES: Challenge[];
export declare function buildBadgeContext(): BadgeContext;
export declare function evaluateBadges(): {
    newBadges: Badge[];
    allEarned: string[];
};
export declare function evaluateChallenges(): Array<{
    challenge: Challenge;
    progress: number;
    total: number;
}>;
export declare function generateShareCard(projectName: string, score: number, badges: string[]): string;
export declare function generateReadmeBadge(projectName: string, score: number): string;
