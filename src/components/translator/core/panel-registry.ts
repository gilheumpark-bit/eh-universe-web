export type LeftPanelType = 'explorer' | 'glossary' | 'settings' | 'history' | 'backup' | 'multilang' | null;
// [2026-05-08 시장 분석 4차 P0] adoption / signoff 패널 추가 — dual workflow.
export type RightPanelType = 'actions' | 'chat' | 'audit' | 'localization' | 'reference' | 'adoption' | 'signoff' | null;

export interface PanelDef {
  id: string;
  labelEn: string;
  labelKo: string;
}

export const LEFT_PANELS: Record<string, PanelDef> = {
  explorer: { id: 'explorer', labelEn: 'Project', labelKo: '프로젝트' },
  glossary: { id: 'glossary', labelEn: 'Glossary', labelKo: '용어집' },
  settings: { id: 'settings', labelEn: 'Settings', labelKo: '설정' },
  history: { id: 'history', labelEn: 'History', labelKo: '히스토리' },
  backup: { id: 'backup', labelEn: 'Save & backup', labelKo: '저장·백업' },
  multilang: { id: 'multilang', labelEn: 'Multi-lang batch', labelKo: '다국어 배치' },
};

export const RIGHT_PANELS: Record<string, PanelDef> = {
  actions: { id: 'actions', labelEn: 'Translate', labelKo: '번역 실행' },
  chat: { id: 'chat', labelEn: 'Noa Support', labelKo: '노아 보조' },
  audit: { id: 'audit', labelEn: 'Quality Review', labelKo: '품질 점검' },
  localization: { id: 'localization', labelEn: 'Localization Review', labelKo: '현지 판단' },
  reference: { id: 'reference', labelEn: 'Context Notes', labelKo: '참조 컨텍스트' },
  // [2026-05-08 시장 분석 4차 P0] dual workflow.
  adoption: { id: 'adoption', labelEn: 'Segment Adoption', labelKo: '단락별 채택' },
  signoff: { id: 'signoff', labelEn: 'Author Approval', labelKo: '작가 승인' },
};

export function getLeftPanelLabel(id: string, lang: 'KO' | 'EN'): string {
  const p = LEFT_PANELS[id];
  return p ? (lang === 'KO' ? p.labelKo : p.labelEn) : id;
}

export function getRightPanelLabel(id: string, lang: 'KO' | 'EN'): string {
  const p = RIGHT_PANELS[id];
  return p ? (lang === 'KO' ? p.labelKo : p.labelEn) : id;
}
