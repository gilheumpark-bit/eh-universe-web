interface VibeTemplate {
    name: string;
    keywords: string[];
    systemModifier: string;
    constraints: {
        maxLinesPerFile: number;
        commentDensity: 'none' | 'minimal' | 'moderate' | 'heavy';
        namingStyle: 'short' | 'descriptive' | 'verbose';
        errorHandling: 'minimal' | 'standard' | 'comprehensive';
        codeStyle: string;
    };
}
declare const VIBE_TEMPLATES: Record<string, VibeTemplate>;
/**
 * Parse vibe keywords from the user prompt and return the matching template.
 * Falls back to 'casual' if no keywords match.
 */
declare function detectVibeFromPrompt(prompt: string): VibeTemplate;
/**
 * Build style constraint instructions to inject into the AI system prompt.
 */
declare function buildStyleConstraints(template: VibeTemplate): string;
export declare function runVibe(prompt: string): Promise<void>;
export { VIBE_TEMPLATES, detectVibeFromPrompt, buildStyleConstraints };
