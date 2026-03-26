import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const KO_DIR = 'C:/Users/sung4/OneDrive/바탕 화면/AI 소설/EH_Universe_소스정리/보고서_콘텐츠';
const EN_DIR = 'C:/Users/sung4/OneDrive/바탕 화면/AI 소설/EH_Universe_소스정리/보고서_콘텐츠_EN';

const START = 11;
const END = 67;

const slugMap = {
  11: 'rpt-nhdc-emergency-guide',
  12: 'rpt-eh-alpha-neural-manual',
  13: 'rpt-1954-asset-custody',
  14: 'rpt-harlan-node-discard',
  15: 'rpt-baseline-elevation',
  16: 'rpt-sector-zero-mainframe',
  17: 'rpt-nhdc-grade-classification',
  18: 'rpt-enhanced-human-generation',
  19: 'rpt-national-audit-exposure',
  20: 'rpt-project-ascendancy',
  21: 'rpt-eh-currency-system',
  22: 'rpt-lee-rua-file',
  23: 'rpt-delta-zero-operations',
  24: 'rpt-global-node-network',
  25: 'rpt-detention-facility-manual',
  26: 'rpt-kang-taesik-file',
  27: 'rpt-second-war-report',
  28: 'rpt-aidens-ledger-discovery',
  29: 'rpt-jayden-carter-file',
  30: 'rpt-carters-record-preface',
  31: 'rpt-sib-overview',
  32: 'rpt-97-percent-ignorance',
  33: 'rpt-neka-chemical-relay',
  34: 'rpt-hpp-protocol-detail',
  35: 'rpt-noa-android-spec',
  36: 'rpt-galaxy-threat-assessment',
  37: 'rpt-ansik-drug-research',
  38: 'rpt-ak-chairman-file',
  39: 'rpt-id-tag-system',
  40: 'rpt-ram-tintapin-file',
  41: 'rpt-finis-planet-recon',
  42: 'rpt-non-intervention-paradox',
  43: 'rpt-bio-server-spec',
  44: 'rpt-fountain-pen-appraisal',
  45: 'rpt-council-vessel-spec',
  46: 'rpt-eh-universe-timeline',
  47: 'rpt-nhdc-construction-audit',
  48: 'rpt-sewer-escape-blueprint',
  49: 'rpt-subprime-human-usa',
  50: 'rpt-records-outlive-people',
  51: 'rpt-baseline-calculation',
  52: 'rpt-construction-aggregate',
  53: 'rpt-eyeglass-collection',
  54: 'rpt-nob-citizen-grade',
  55: 'rpt-sleep-inducer-report',
  56: 'rpt-noise-frequency-adjust',
  57: 'rpt-human-asset-valuation',
  58: 'rpt-jocei-committee',
  59: 'rpt-neka-7-chemical-systems',
  60: 'rpt-ride-rip-spatial-transit',
  61: 'rpt-princeps-fire-control',
  62: 'rpt-imperator-structure',
  63: 'rpt-sib-agent-depth',
  64: 'rpt-neka-emperor-lineage',
  65: 'rpt-suo-philosophy-analysis',
  66: 'rpt-hpg-founding-five',
  67: 'rpt-htctbb-cweh-spec',
};

const categoryMap = {
  11: 'REPORTS', 12: 'TECHNOLOGY', 13: 'CLASSIFIED', 14: 'CLASSIFIED',
  15: 'REPORTS', 16: 'REPORTS', 17: 'CORE', 18: 'TECHNOLOGY',
  19: 'REPORTS', 20: 'CLASSIFIED', 21: 'CORE', 22: 'CLASSIFIED',
  23: 'MILITARY', 24: 'TECHNOLOGY', 25: 'CORE', 26: 'CLASSIFIED',
  27: 'MILITARY', 28: 'REPORTS', 29: 'CLASSIFIED', 30: 'CORE',
  31: 'FACTIONS', 32: 'CORE', 33: 'TECHNOLOGY', 34: 'CORE',
  35: 'TECHNOLOGY', 36: 'GEOGRAPHY', 37: 'TECHNOLOGY', 38: 'CLASSIFIED',
  39: 'TECHNOLOGY', 40: 'CLASSIFIED', 41: 'GEOGRAPHY', 42: 'CORE',
  43: 'TECHNOLOGY', 44: 'REPORTS', 45: 'TECHNOLOGY', 46: 'TIMELINE',
  47: 'REPORTS', 48: 'REPORTS', 49: 'CLASSIFIED', 50: 'CORE',
  51: 'TECHNOLOGY', 52: 'REPORTS', 53: 'REPORTS', 54: 'CORE',
  55: 'REPORTS', 56: 'REPORTS', 57: 'REPORTS', 58: 'FACTIONS',
  59: 'TECHNOLOGY', 60: 'TECHNOLOGY', 61: 'TECHNOLOGY', 62: 'TECHNOLOGY',
  63: 'FACTIONS',
  64: 'FACTIONS', 65: 'FACTIONS', 66: 'CORE', 67: 'TECHNOLOGY',
};

const levelMap = {
  11: 'CLASSIFIED', 12: 'CLASSIFIED', 13: 'TOP_SECRET', 14: 'CLASSIFIED',
  15: 'CLASSIFIED', 16: 'TOP_SECRET', 17: 'RESTRICTED', 18: 'CLASSIFIED',
  19: 'CLASSIFIED', 20: 'TOP_SECRET', 21: 'PUBLIC', 22: 'TOP_SECRET',
  23: 'CLASSIFIED', 24: 'TOP_SECRET', 25: 'RESTRICTED', 26: 'CLASSIFIED',
  27: 'CLASSIFIED', 28: 'RESTRICTED', 29: 'CLASSIFIED', 30: 'PUBLIC',
  31: 'CLASSIFIED', 32: 'CLASSIFIED', 33: 'CLASSIFIED', 34: 'RESTRICTED',
  35: 'CLASSIFIED', 36: 'RESTRICTED', 37: 'CLASSIFIED', 38: 'CLASSIFIED',
  39: 'RESTRICTED', 40: 'CLASSIFIED', 41: 'CLASSIFIED', 42: 'RESTRICTED',
  43: 'CLASSIFIED', 44: 'RESTRICTED', 45: 'RESTRICTED', 46: 'PUBLIC',
  47: 'RESTRICTED', 48: 'CLASSIFIED', 49: 'TOP_SECRET', 50: 'PUBLIC',
  51: 'CLASSIFIED', 52: 'RESTRICTED', 53: 'CLASSIFIED', 54: 'RESTRICTED',
  55: 'CLASSIFIED', 56: 'RESTRICTED', 57: 'CLASSIFIED', 58: 'CLASSIFIED',
  59: 'CLASSIFIED', 60: 'RESTRICTED', 61: 'CLASSIFIED', 62: 'CLASSIFIED',
  63: 'CLASSIFIED',
  64: 'CLASSIFIED', 65: 'TOP_SECRET', 66: 'PUBLIC', 67: 'CLASSIFIED',
};

const koFiles = readdirSync(KO_DIR).filter(f => f.endsWith('.md')).sort();
const enFiles = readdirSync(EN_DIR).filter(f => f.endsWith('.md')).sort();

function getNum(fname) {
  const m = fname.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function extractTitle(content) {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      return trimmed.replace(/^#\s+/, '');
    }
  }
  return 'Untitled';
}

function escapeForTemplate(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

let output = `// ============================================================
// PART 1 — Report Articles (11-67)
// Auto-generated from source markdown files
// ============================================================

import type { ArticleData } from "./articles";

export const reportArticles: Record<string, ArticleData> = {\n`;

let count = 0;
for (let i = START; i <= END; i++) {
  const koFile = koFiles.find(f => getNum(f) === i);
  const enFile = enFiles.find(f => getNum(f) === i);

  if (!koFile || !enFile) {
    console.error(`Missing file for index ${i}: ko=${koFile}, en=${enFile}`);
    continue;
  }

  const koContent = readFileSync(join(KO_DIR, koFile), 'utf-8');
  const enContent = readFileSync(join(EN_DIR, enFile), 'utf-8');

  const koTitle = extractTitle(koContent);
  const enTitle = extractTitle(enContent);

  const slug = slugMap[i];
  const category = categoryMap[i];
  const level = levelMap[i];

  const koEscaped = escapeForTemplate(koContent.trim());
  const enEscaped = escapeForTemplate(enContent.trim());

  output += `  "${slug}": {
    title: { ko: "${koTitle.replace(/"/g, '\\"')}", en: "${enTitle.replace(/"/g, '\\"')}" },
    level: "${level}",
    category: "${category}",
    content: {
      ko: \`${koEscaped}\`,
      en: \`${enEscaped}\`,
    },
  },\n`;
  count++;
}

output += `};\n`;

const outPath = 'C:/Users/sung4/OneDrive/바탕 화면/AI 소설/설정집/최종 정리본/EH프로젝트/eh-universe-web/src/lib/articles-reports.ts';
writeFileSync(outPath, output, 'utf-8');
console.log(`Written ${count} articles to ${outPath}`);
