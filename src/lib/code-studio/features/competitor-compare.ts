// ============================================================
// Code Studio — Competitor Comparison (EH vs AI Coding Tools)
// ============================================================

export const LAST_UPDATED = '2026-03-28';

export type Competitor = 'cursor' | 'bolt' | 'replit' | 'v0' | 'windsurf';

export interface FeatureComparison {
  feature: string;
  category: string;
  ehScore: number;
  competitorScore: number;
  ehHas: boolean;
  competitorHas: boolean;
  advantage: 'eh' | 'competitor' | 'tie';
}

export interface CompareResult {
  competitor: Competitor;
  competitorName: string;
  features: FeatureComparison[];
  ehTotal: number;
  competitorTotal: number;
  ehAdvantages: string[];
  competitorAdvantages: string[];
  summary: string;
  lastUpdated: string;
}

/* ── Feature matrix ── */

interface FeatureEntry {
  feature: string;
  category: string;
  eh: number;
  cursor: number;
  bolt: number;
  replit: number;
  v0: number;
  windsurf: number;
}

const FEATURES: FeatureEntry[] = [
  { feature: 'AI Code Completion', category: 'AI', eh: 85, cursor: 95, bolt: 80, replit: 75, v0: 60, windsurf: 90 },
  { feature: 'Multi-file Editing', category: 'Editor', eh: 90, cursor: 90, bolt: 85, replit: 80, v0: 50, windsurf: 85 },
  { feature: 'Terminal Integration', category: 'DevTools', eh: 85, cursor: 85, bolt: 90, replit: 90, v0: 30, windsurf: 80 },
  { feature: 'AI Chat', category: 'AI', eh: 90, cursor: 90, bolt: 85, replit: 80, v0: 95, windsurf: 85 },
  { feature: 'Preview/Deploy', category: 'DevTools', eh: 80, cursor: 60, bolt: 95, replit: 90, v0: 90, windsurf: 70 },
  { feature: 'Multi-Agent Pipeline', category: 'AI', eh: 95, cursor: 70, bolt: 60, replit: 50, v0: 40, windsurf: 75 },
  { feature: 'Git Integration', category: 'DevTools', eh: 80, cursor: 85, bolt: 70, replit: 75, v0: 30, windsurf: 80 },
  { feature: 'Code Search', category: 'Editor', eh: 85, cursor: 90, bolt: 70, replit: 70, v0: 40, windsurf: 85 },
  { feature: 'Collaboration', category: 'Social', eh: 75, cursor: 60, bolt: 50, replit: 85, v0: 60, windsurf: 55 },
  { feature: 'Design-to-Code', category: 'AI', eh: 80, cursor: 50, bolt: 70, replit: 40, v0: 95, windsurf: 45 },
];

const COMPETITOR_NAMES: Record<Competitor, string> = {
  cursor: 'Cursor', bolt: 'Bolt.new', replit: 'Replit', v0: 'v0', windsurf: 'Windsurf',
};

/* ── Public API ── */

export function compareWith(competitor: Competitor): CompareResult {
  const features: FeatureComparison[] = FEATURES.map((f) => {
    const cs = f[competitor];
    return {
      feature: f.feature,
      category: f.category,
      ehScore: f.eh,
      competitorScore: cs,
      ehHas: f.eh > 0,
      competitorHas: cs > 0,
      advantage: f.eh > cs ? 'eh' as const : cs > f.eh ? 'competitor' as const : 'tie' as const,
    };
  });

  const ehTotal = features.reduce((s, f) => s + f.ehScore, 0);
  const compTotal = features.reduce((s, f) => s + f.competitorScore, 0);

  return {
    competitor,
    competitorName: COMPETITOR_NAMES[competitor],
    features,
    ehTotal,
    competitorTotal: compTotal,
    ehAdvantages: features.filter((f) => f.advantage === 'eh').map((f) => f.feature),
    competitorAdvantages: features.filter((f) => f.advantage === 'competitor').map((f) => f.feature),
    summary: `EH Code Studio: ${ehTotal} vs ${COMPETITOR_NAMES[competitor]}: ${compTotal}`,
    lastUpdated: LAST_UPDATED,
  };
}

export function compareAll(): CompareResult[] {
  return (['cursor', 'bolt', 'replit', 'v0', 'windsurf'] as Competitor[]).map(compareWith);
}

// IDENTITY_SEAL: role=CompetitorCompare | inputs=Competitor | outputs=CompareResult
