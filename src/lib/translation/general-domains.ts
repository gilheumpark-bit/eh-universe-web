// ============================================================
// General Translation — Domain Presets (Sandboxed)
// ============================================================
// 소설 특화 파이프라인과 완전 분리. 필요할 때만 lazy import.
// build-prompt.ts의 DOMAIN_EXTRA에는 등록하지 않음 (오염 방지).

// ── Domain Presets ──

export type GeneralDomain =
  | 'academic'    // 논문, 학술
  | 'business'    // 비즈니스, 보고서
  | 'essay'       // 에세이, 칼럼
  | 'legal'       // 법률
  | 'medical'     // 의료
  | 'it'          // IT/기술
  | 'journalism'  // 저널리즘, 뉴스
  | 'general';    // 범용

export interface DomainPreset {
  id: GeneralDomain;
  label: string;
  labelKo: string;
  /** 시스템 프롬프트에 삽입되는 도메인별 지시문 */
  directive: string;
  /** 채점 시 추가 평가 축 */
  extraAxes: string[];
  /** 패스스루 패턴 (번역하지 않고 보존할 정규식) */
  passthroughPatterns: RegExp[];
}

export const GENERAL_DOMAIN_PRESETS: Record<GeneralDomain, DomainPreset> = {
  academic: {
    id: 'academic',
    label: 'Academic / Research',
    labelKo: '학술 / 논문',
    directive: [
      'DOMAIN ACADEMIC:',
      '- Preserve ALL citations exactly: [1], (Author, 2024), doi:, arXiv:, etc.',
      '- Keep LaTeX math expressions ($...$, \\equation, \\begin{align}) UNTRANSLATED.',
      '- Preserve table structures, figure captions numbering (Fig. 1, Table 2).',
      '- Use formal academic register. No colloquialisms.',
      '- Preserve abbreviations defined in the source (e.g., "convolutional neural network (CNN)").',
      '- Do NOT paraphrase hypotheses, conclusions, or statistical claims.',
    ].join('\n'),
    extraAxes: ['accuracy', 'completeness', 'citation_fidelity', 'register'],
    passthroughPatterns: [
      /\$[^$]+\$/g,                          // inline LaTeX
      /\$\$[\s\S]+?\$\$/g,                   // block LaTeX
      /\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, // LaTeX environments
      /\[[\d,\s–-]+\]/g,                     // numeric citations [1], [1-3], [1, 2]
      /\((?:[A-Z][a-z]+(?:\s(?:et\s)?al\.?)?,?\s*\d{4}(?:;\s*)?)+\)/g, // (Author, 2024)
      /doi:\S+/gi,                            // DOI
      /arXiv:\S+/gi,                          // arXiv
      /https?:\/\/\S+/g,                      // URLs
    ],
  },

  business: {
    id: 'business',
    label: 'Business / Report',
    labelKo: '비즈니스 / 보고서',
    directive: [
      'DOMAIN BUSINESS:',
      '- Maintain professional corporate tone throughout.',
      '- Preserve company names, product names, financial figures, dates exactly.',
      '- Keep acronyms (KPI, ROI, EBITDA, SaaS) intact.',
      '- Preserve bullet point and numbered list structures.',
      '- Currency symbols and units must follow target locale conventions.',
    ].join('\n'),
    extraAxes: ['accuracy', 'tone_consistency', 'format_fidelity'],
    passthroughPatterns: [
      /\$[\d,.]+[BMKk]?/g,                   // monetary values
      /€[\d,.]+[BMKk]?/g,
      /¥[\d,.]+[BMKk]?/g,
      /₩[\d,.]+[BMKk]?/g,
      /\d+(?:\.\d+)?%/g,                     // percentages
      /https?:\/\/\S+/g,
    ],
  },

  essay: {
    id: 'essay',
    label: 'Essay / Column',
    labelKo: '에세이 / 칼럼',
    directive: [
      'DOMAIN ESSAY:',
      '- Preserve the author\'s personal voice and rhetorical style.',
      '- Cultural references and idioms should be localized for the target audience.',
      '- Maintain paragraph rhythm and sentence variety.',
      '- Footnotes and endnotes must be preserved with their numbering.',
    ].join('\n'),
    extraAxes: ['voice_fidelity', 'cultural_adaptation', 'readability'],
    passthroughPatterns: [
      /https?:\/\/\S+/g,
    ],
  },

  legal: {
    id: 'legal',
    label: 'Legal / Contract',
    labelKo: '법률 / 계약서',
    directive: [
      'DOMAIN LEGAL:',
      '- Preserve defined terms, party names, article/section numbers, and citation formats EXACTLY.',
      '- Do NOT paraphrase obligations, conditions, or dates.',
      '- Keep Latin legal terms (e.g., "pro rata", "force majeure") unless target locale has established equivalents.',
      '- Maintain numbered clause structure precisely.',
    ].join('\n'),
    extraAxes: ['accuracy', 'term_consistency', 'structure_fidelity'],
    passthroughPatterns: [
      /§\s*\d+/g,                             // section symbols
      /Article\s+\d+/gi,
      /제\d+조/g,                              // Korean article numbers
    ],
  },

  medical: {
    id: 'medical',
    label: 'Medical / Clinical',
    labelKo: '의료 / 임상',
    directive: [
      'DOMAIN MEDICAL:',
      '- Use standard medical terminology for the target locale (ICD codes, drug names).',
      '- Do NOT invent dosages, diagnoses, or clinical conclusions.',
      '- Keep numbers, units (mg, mL, mmHg), and lab values EXACTLY.',
      '- Preserve patient identifiers as-is (anonymized placeholders).',
    ].join('\n'),
    extraAxes: ['accuracy', 'terminology_precision', 'safety'],
    passthroughPatterns: [
      /\d+(?:\.\d+)?\s*(?:mg|mL|mmHg|kg|cm|mm|µg|IU|U\/L)/g,
      /[A-Z]\d{2}(?:\.\d{1,2})?/g,           // ICD codes
    ],
  },

  it: {
    id: 'it',
    label: 'IT / Technical',
    labelKo: 'IT / 기술',
    directive: [
      'DOMAIN IT:',
      '- Preserve API names, CLI commands, file paths, version numbers, and code tokens EXACTLY.',
      '- Code blocks (```...```) must NOT be translated.',
      '- Translate comments, prose, and documentation only.',
      '- Keep technical abbreviations (REST, API, SDK, CLI, JSON, YAML) intact.',
    ].join('\n'),
    extraAxes: ['accuracy', 'code_preservation', 'terminology_consistency'],
    passthroughPatterns: [
      /```[\s\S]*?```/g,                      // code blocks
      /`[^`]+`/g,                             // inline code
      /https?:\/\/\S+/g,
      /\b[A-Z_]{2,}(?:\.[A-Z_]+)*\b/g,       // CONSTANT_NAMES
    ],
  },

  journalism: {
    id: 'journalism',
    label: 'Journalism / News',
    labelKo: '저널리즘 / 뉴스',
    directive: [
      'DOMAIN JOURNALISM:',
      '- Maintain objective, neutral tone unless the source is an opinion piece.',
      '- Preserve direct quotes with proper attribution.',
      '- Keep dates, times, locations, and proper nouns exactly.',
      '- Adapt headline conventions to target locale style (e.g., title case for EN).',
    ].join('\n'),
    extraAxes: ['accuracy', 'objectivity', 'quote_fidelity'],
    passthroughPatterns: [
      /https?:\/\/\S+/g,
      /"[^"]*"/g,                             // quoted speech
    ],
  },

  general: {
    id: 'general',
    label: 'General',
    labelKo: '범용',
    directive: '',
    extraAxes: ['accuracy', 'naturalness'],
    passthroughPatterns: [
      /https?:\/\/\S+/g,
    ],
  },
};

export const GENERAL_DOMAIN_LIST = Object.values(GENERAL_DOMAIN_PRESETS);
