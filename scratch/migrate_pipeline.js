const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'apps/desktop/renderer/components/code-studio/PipelinePanel.tsx');
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  'import { L4 } from "@/lib/i18n";',
  'import { L4, createT } from "@/lib/i18n";\nimport type { AppLanguage } from "@eh/shared-types";'
);

c = c.replace(
  `function StatusBadge({ status, lang }: { status: string; lang: string }) {`,
  `function StatusBadge({ status, lang }: { status: string; lang: string }) {\n  const t = createT(lang as AppLanguage);`
);

c = c.replace(
  'L4(lang, { ko: "통과", en: "PASS" })',
  "t('pipelinePanel.pass')"
);
c = c.replace(
  'L4(lang, { ko: "경고", en: "WARN" })',
  "t('pipelinePanel.warn')"
);
c = c.replace(
  'L4(lang, { ko: "실패", en: "FAIL" })',
  "t('pipelinePanel.fail')"
);

c = c.replace(
  'const { lang } = useLang();',
  'const { lang } = useLang();\n  const t = createT(lang as AppLanguage);'
);

c = c.replaceAll(
  'L4(lang, { ko: "파이프라인 결과 없음", en: "No pipeline results yet" })',
  "t('pipelinePanel.noResults')"
);
c = c.replaceAll(
  'L4(lang, { ko: "파이프라인 실행", en: "Run Pipeline" })',
  "t('pipelinePanel.runTitle')"
);
c = c.replaceAll(
  'L4(lang, { ko: "최근 실행:", en: "Last run:" })',
  "t('pipelinePanel.lastRun')"
);
c = c.replaceAll(
  'L4(lang, { ko: "파이프라인 실행 중...", en: "Pipeline running..." })',
  "t('pipelinePanel.running')"
);
c = c.replaceAll(
  'L4(lang, { ko: "중단", en: "Abort" })',
  "t('pipelinePanel.abort')"
);
c = c.replaceAll(
  'L4(lang, { ko: "파이프라인 실행 중", en: "Pipeline Running" })',
  "t('pipelinePanel.runningTitle')"
);
c = c.replaceAll(
  'L4(lang, { ko: "파이프라인 결과", en: "Pipeline Results" })',
  "t('pipelinePanel.resultsTitle')"
);
c = c.replaceAll(
  'L4(lang, { ko: "다시 실행", en: "Re-run" })',
  "t('pipelinePanel.rerun')"
);
c = c.replaceAll(
  'L4(lang, { ko: "보고서 복사", en: "Copy report" })',
  "t('pipelinePanel.copyReport')"
);
c = c.replaceAll(
  'L4(lang, { ko: "보고서 다운로드", en: "Download report" })',
  "t('pipelinePanel.downloadReport')"
);
c = c.replaceAll(
  '{L4(lang, { ko: "개 항목", en: "findings" })}',
  "{t('pipelinePanel.findingsCount')}"
);

c = c.replace(
  'L4(lang, { ko: "시뮬레이션", en: "Simulation" })',
  "t('pipelinePanel.teamSimulation')"
);
c = c.replace(
  'L4(lang, { ko: "생성", en: "Generation" })',
  "t('pipelinePanel.teamGeneration')"
);
c = c.replace(
  'L4(lang, { ko: "검증", en: "Validation" })',
  "t('pipelinePanel.teamValidation')"
);
c = c.replace(
  'L4(lang, { ko: "크기/밀도", en: "Size/Density" })',
  "t('pipelinePanel.teamSizeDensity')"
);
c = c.replace(
  'L4(lang, { ko: "자산 추적", en: "Asset Trace" })',
  "t('pipelinePanel.teamAssetTrace')"
);
c = c.replace(
  'L4(lang, { ko: "안정성", en: "Stability" })',
  "t('pipelinePanel.teamStability')"
);
c = c.replace(
  'L4(lang, { ko: "릴리스/IP", en: "Release/IP" })',
  "t('pipelinePanel.teamReleaseIp')"
);
c = c.replace(
  'L4(lang, { ko: "거버넌스", en: "Governance" })',
  "t('pipelinePanel.teamGovernance')"
);

fs.writeFileSync(p, c);
console.log("Pipeline migrated");
