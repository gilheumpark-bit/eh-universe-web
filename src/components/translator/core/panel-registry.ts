export type LeftPanelType = 'explorer' | 'glossary' | 'settings' | 'history' | null;
export type RightPanelType = 'actions' | 'chat' | 'audit' | 'reference' | null;

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
};

export const RIGHT_PANELS: Record<string, PanelDef> = {
  actions: { id: 'actions', labelEn: 'Translate', labelKo: '번역 실행' },
  chat: { id: 'chat', labelEn: 'AI Copilot', labelKo: 'AI 코파일럿' },
  audit: { id: 'audit', labelEn: 'Quality Audit', labelKo: '품질 검증' },
  reference: { id: 'reference', labelEn: 'References', labelKo: '참고자료' },
};

export function getLeftPanelLabel(id: string, lang: 'KO' | 'EN'): string {
  const p = LEFT_PANELS[id];
  return p ? (lang === 'KO' ? p.labelKo : p.labelEn) : id;
}

export function getRightPanelLabel(id: string, lang: 'KO' | 'EN'): string {
  const p = RIGHT_PANELS[id];
  return p ? (lang === 'KO' ? p.labelKo : p.labelEn) : id;
}
