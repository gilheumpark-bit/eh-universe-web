import {
  evaluateFormCompletion,
  getJurisdictionFormPack,
  inferLocalePackId,
  JURISDICTION_FORM_PACKS,
  listJurisdictionFormPacks,
  type LocalePackId,
  type ReleaseFormId,
} from '../jurisdiction-form-pack';

const REQUIRED_FORMS: ReleaseFormId[] = [
  'project-intake',
  'creative-process',
  'rights-asset',
  'source-reference',
  'translation-localization',
  'release-package',
];

const PACK_IDS: LocalePackId[] = [
  'global',
  'ko-KR',
  'en-US',
  'en-EU',
  'en-GB',
  'en-AU',
  'ja-JP',
  'zh-CN',
  'zh-TW',
];

function allTextValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(allTextValues);
  return Object.values(value as Record<string, unknown>).flatMap(allTextValues);
}

describe('jurisdiction-form-pack', () => {
  it('공통 + KR/US/EU/UK/AU/JP/CN/TW 팩을 모두 제공한다', () => {
    expect(Object.keys(JURISDICTION_FORM_PACKS).sort()).toEqual([...PACK_IDS].sort());
    expect(listJurisdictionFormPacks()).toHaveLength(PACK_IDS.length);
  });

  it('모든 팩은 6개 핵심 양식을 제공하고 각 양식에는 필수 필드가 있다', () => {
    for (const packId of PACK_IDS) {
      const pack = JURISDICTION_FORM_PACKS[packId];
      expect(pack.forms.map((item) => item.id).sort()).toEqual([...REQUIRED_FORMS].sort());
      for (const form of pack.forms) {
        const fields = form.sections.flatMap((section) => section.fields);
        expect(fields.some((field) => field.required)).toBe(true);
      }
    }
  });

  it('모든 사용자 표시 라벨은 4언어 값을 가진다', () => {
    for (const pack of Object.values(JURISDICTION_FORM_PACKS)) {
      for (const form of pack.forms) {
        for (const section of form.sections) {
          for (const field of section.fields) {
            for (const lang of ['ko', 'en', 'ja', 'zh'] as const) {
              expect(field.label[lang]).toBeTruthy();
              expect(field.help[lang]).toBeTruthy();
            }
          }
        }
      }
    }
  });

  it('국가별로 고유 확인 항목을 가진다', () => {
    const krRelease = JURISDICTION_FORM_PACKS['ko-KR'].forms.find((item) => item.id === 'release-package');
    const usRights = JURISDICTION_FORM_PACKS['en-US'].forms.find((item) => item.id === 'rights-asset');
    const euRelease = JURISDICTION_FORM_PACKS['en-EU'].forms.find((item) => item.id === 'release-package');
    const ukRights = JURISDICTION_FORM_PACKS['en-GB'].forms.find((item) => item.id === 'rights-asset');
    const auRights = JURISDICTION_FORM_PACKS['en-AU'].forms.find((item) => item.id === 'rights-asset');
    const jpRights = JURISDICTION_FORM_PACKS['ja-JP'].forms.find((item) => item.id === 'rights-asset');
    const cnRelease = JURISDICTION_FORM_PACKS['zh-CN'].forms.find((item) => item.id === 'release-package');
    const twRelease = JURISDICTION_FORM_PACKS['zh-TW'].forms.find((item) => item.id === 'release-package');

    expect(krRelease?.sections.flatMap((section) => section.fields).map((field) => field.id)).toContain('kr-ai-basic-notice');
    expect(usRights?.sections.flatMap((section) => section.fields).map((field) => field.id)).toContain('us-human-authorship-scope');
    expect(euRelease?.sections.flatMap((section) => section.fields).map((field) => field.id)).toContain('eu-article-50-marking');
    expect(ukRights?.sections.flatMap((section) => section.fields).map((field) => field.id)).toContain('uk-moral-rights-note');
    expect(auRights?.sections.flatMap((section) => section.fields).map((field) => field.id)).toContain('au-indigenous-cultural-material-check');
    expect(jpRights?.sections.flatMap((section) => section.fields).map((field) => field.id)).toContain('jp-similarity-check');
    expect(cnRelease?.sections.flatMap((section) => section.fields).map((field) => field.id)).toContain('cn-explicit-label');
    expect(twRelease?.sections.flatMap((section) => section.fields).map((field) => field.id)).toContain('tw-traditional-chinese-release-copy');
  });

  it('번역·현지화 양식은 타국어를 모르는 작가용 해외 출고 검토 항목을 가진다', () => {
    const form = JURISDICTION_FORM_PACKS.global.forms.find((item) => item.id === 'translation-localization');
    const fields = form?.sections.flatMap((section) => section.fields) ?? [];
    const fieldIds = fields.map((field) => field.id);

    expect(fieldIds).toEqual(
      expect.arrayContaining([
        'source-preservation-copy',
        'market-release-copy',
        'back-translation-summary-ko',
        'cultural-risk-summary-ko',
        'localization-decision-log',
      ]),
    );
    expect(fields.find((field) => field.id === 'back-translation-summary-ko')?.label.ko).toBe('역번역 한국어 요약');
    expect(fields.find((field) => field.id === 'cultural-risk-summary-ko')?.label.ko).toBe('문화 리스크 한국어 요약');
  });

  it('국가별 팩은 2026년 6월 기준일과 근거 출처를 가진다', () => {
    for (const packId of PACK_IDS.filter((id) => id !== 'global')) {
      const pack = JURISDICTION_FORM_PACKS[packId];
      expect(pack.sourceReferences.length).toBeGreaterThan(0);
      for (const reference of pack.sourceReferences) {
        expect(reference.checkedAt).toBe('2026-06-15');
        expect(reference.title).toBeTruthy();
        expect(reference.url).toMatch(/^https:\/\//);
      }
    }
  });

  it('금지성 영업 표현을 사용자 표시 문구에 넣지 않는다', () => {
    const forbidden = /(보증|인증|완전 방어|100%|guarantee|certify|certification|complete defense)/i;
    for (const pack of Object.values(JURISDICTION_FORM_PACKS)) {
      const texts = allTextValues(pack);
      for (const text of texts) {
        expect(text).not.toMatch(forbidden);
      }
    }
  });

  it('팩 조회는 locale prefix fallback 을 지원한다', () => {
    expect(getJurisdictionFormPack('ko').id).toBe('ko-KR');
    expect(getJurisdictionFormPack('ja').id).toBe('ja-JP');
    expect(getJurisdictionFormPack('zh-Hans').id).toBe('zh-CN');
    expect(getJurisdictionFormPack('zh-Hant').id).toBe('zh-TW');
    expect(getJurisdictionFormPack('en-GB').id).toBe('en-GB');
    expect(getJurisdictionFormPack('en-AU').id).toBe('en-AU');
    expect(getJurisdictionFormPack('en').id).toBe('en-US');
  });

  it('프로젝트 시장 설정에서 국가·언어권 팩을 추론한다', () => {
    expect(inferLocalePackId({ targetMarket: 'GB', projectTargetLanguage: 'EN' })).toBe('en-GB');
    expect(inferLocalePackId({ targetMarket: 'AU', projectTargetLanguage: 'EN' })).toBe('en-AU');
    expect(inferLocalePackId({ targetMarket: 'TW', projectTargetLanguage: 'CN' })).toBe('zh-TW');
    expect(inferLocalePackId({ targetMarket: 'EU', projectTargetLanguage: 'EN' })).toBe('en-EU');
    expect(inferLocalePackId({ targetMarket: 'GLOBAL', projectTargetLanguage: 'CN' })).toBe('zh-CN');
  });

  it('필수 필드 누락을 계산한다', () => {
    const result = evaluateFormCompletion('en-US', 'rights-asset', {
      'author-ownership': 'Author',
      'external-materials': ['source-a'],
      'license-notes': 'all rights reserved',
      'character-world-bible': ['bible.md'],
      'derivative-rights': ['publisher'],
      'us-human-authorship-scope': 'selection and revision',
    });
    expect(result.requiredTotal).toBeGreaterThan(0);
    expect(result.missingRequiredFieldIds).toContain('us-nonclaimable-material-note');
    expect(result.requiredPresent).toBe(result.requiredTotal - result.missingRequiredFieldIds.length);
  });
});
