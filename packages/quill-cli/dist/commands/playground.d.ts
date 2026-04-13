interface PlaygroundOptions {
    full?: boolean;
    compare?: string;
    leaderboard?: boolean;
    challenge?: boolean;
    share?: boolean;
}
export declare function runPlayground(opts: PlaygroundOptions): Promise<void>;
export {};
