import { DOMAIN_FORMS, tabToDomain, getDomainForm } from '../domain-forms';
import {
  firstSentence,
  localFillDomainForm,
  buildDomainFillPrompt,
  parseDomainFill,
  commitFormAsUser,
  formTitle,
} from '../fill-domain';

describe('domain-forms 레지스트리', () => {
  it('5 도메인 + 필드 보유 (창작 4 + 번역)', () => {
    expect(Object.keys(DOMAIN_FORMS).sort()).toEqual(['character', 'direction', 'scene', 'structure', 'translate']);
    // Batch 3: character → Truby Tier 1/2/3 풀 DNA, scene → AI 온도 필드 추가
    expect(DOMAIN_FORMS.character.fields.map((f) => f.key)).toEqual(
      expect.arrayContaining(['name', 'desire', 'ghost', 'weakness', 'need', 'arc', 'voiceFingerprint', 'relationships', 'signaturePhrases']),
    );
    expect(DOMAIN_FORMS.scene.fields.map((f) => f.key)).toContain('aiTemperature');
    expect(DOMAIN_FORMS.translate.fields.map((f) => f.key)).toEqual(
      ['sourceLang', 'targetLang', 'track', 'platform', 'glossary', 'sourceText'],
    );
  });
  it('tabToDomain: 도메인탭→id, world/write→null', () => {
    expect(tabToDomain('character')).toBe('character');
    expect(tabToDomain('world')).toBeNull();
    expect(tabToDomain('write')).toBeNull();
  });
  it('getDomainForm: 미지 → null', () => {
    expect(getDomainForm('nope')).toBeNull();
  });
});

describe('localFillDomainForm', () => {
  it('character: 첫 필드=첫 문장, 나머지=PENDING, ENGINE_DRAFT', () => {
    const f = localFillDomainForm('character', '강민우. 복수에 사로잡힌 검사. 추가 설명.', 1000);
    expect(f).not.toBeNull();
    expect(f!.origin).toBe('ENGINE_DRAFT');
    expect(f!.values.name).toBe('강민우.');
    expect(f!.values.desire).toContain('확인 필요');
    expect(f!.source).toContain('추가 설명');
    expect(f!.createdAt).toBe(1000);
  });
  it('미지 도메인 → null', () => {
    expect(localFillDomainForm('nope', 'x')).toBeNull();
  });
});

describe('firstSentence', () => {
  it('첫 문장/줄 추출', () => {
    expect(firstSentence('A문장. B문장.')).toBe('A문장.');
    expect(firstSentence('한 줄\n다음')).toBe('한 줄');
    expect(firstSentence('  ')).toBe('');
  });
});

describe('buildDomainFillPrompt / parseDomainFill', () => {
  it('프롬프트에 필드 키 + brainstorm', () => {
    const p = buildDomainFillPrompt('scene', '전투 장면');
    expect(p).toContain('chapterType');
    expect(p).toContain('전투 장면');
  });
  it('parse: 정의 필드만 흡수, 배열은 join', () => {
    const raw = 'x {"name":"유주","role":"주연","extra":"무시","desire":["복수","생존"]} y';
    const f = parseDomainFill('character', raw, '원본', 2000);
    expect(f!.values.name).toBe('유주');
    expect(f!.values.desire).toBe('복수, 생존');
    expect(f!.values).not.toHaveProperty('extra');
  });
  it('parse: JSON 아니면 null', () => {
    expect(parseDomainFill('character', 'no json', 'x')).toBeNull();
  });
});

describe('commitFormAsUser / formTitle', () => {
  it('확정 → origin USER', () => {
    const f = localFillDomainForm('character', '유주', 1)!;
    expect(commitFormAsUser(f).origin).toBe('USER');
  });
  it('formTitle = 첫 필드 값', () => {
    const f = localFillDomainForm('character', '강민우', 1)!;
    expect(formTitle(f)).toBe('강민우');
  });
});
