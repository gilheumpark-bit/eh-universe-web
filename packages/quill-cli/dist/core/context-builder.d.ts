import { printHeader, printScore, printSection, icons, colors, compatDivider, compatProgressBar } from './terminal-compat';
import { Spinner, ProgressTimer } from '../tui/progress';
export interface CommandContext {
    ui: {
        printHeader: typeof printHeader;
        printScore: typeof printScore;
        printSection: typeof printSection;
        icons: typeof icons;
        colors: typeof colors;
        divider: typeof compatDivider;
        progressBar: typeof compatProgressBar;
        spinner: (label: string) => Spinner;
        timer: (label: string, total: number) => ProgressTimer;
    };
    t: (key: string) => string;
    lang: string;
    cwd: string;
    projectName: string;
    framework?: string;
    presetDirective: string;
    pastMistakes: string;
    styleDirective: string;
}
export declare function buildCommandContext(cwd?: string): Promise<CommandContext>;
export declare function invalidateContext(): void;
export declare function buildAISystemHeader(ctx: CommandContext): string;
