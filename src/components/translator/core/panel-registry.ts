export type LeftPanelType = 'explorer' | 'glossary' | 'settings' | 'history' | 'backup' | 'multilang' | null;
// [2026-05-08 시장 분석 4차 P0] adoption / signoff 패널 추가 — dual workflow.
export type RightPanelType = 'actions' | 'chat' | 'audit' | 'reference' | 'adoption' | 'signoff' | null;

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
  chat: { id: 'chat', labelEn: 'NOA Copilot', labelKo: 'NOA 코파일럿' },
  audit: { id: 'audit', labelEn: 'Quality Audit', labelKo: '품질 검증' },
  reference: { id: 'reference', labelEn: 'References', labelKo: '참고자료' },
  // [2026-05-08 시장 분석 4차 P0] dual workflow.
  adoption: { id: 'adoption', labelEn: 'Segment Adoption', labelKo: '세그먼트 채택' },
  signoff: { id: 'signoff', labelEn: 'Author Sign-off', labelKo: '작가 sign-off' },
};

export function getLeftPanelLabel(id: string, lang: 'KO' | 'EN'): string {
  const p = LEFT_PANELS[id];
  return p ? (lang === 'KO' ? p.labelKo : p.labelEn) : id;
}

export function getRightPanelLabel(id: string, lang: 'KO' | 'EN'): string {
  const p = RIGHT_PANELS[id];
  return p ? (lang === 'KO' ? p.labelKo : p.labelEn) : id;
}
