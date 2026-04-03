import type { SocialProfile, AppLanguage } from '@/lib/studio-types';
import {
  formatSocialProfile,
  RELATION_LABELS,
  AGE_LABELS,
  EXPLICIT_LABELS,
  PROFANITY_LABELS,
} from '../social-register';

// ============================================================
// PART 1 — Label map exports
// ============================================================

describe('label map exports', () => {
  it('RELATION_LABELS has entries for all 4 languages', () => {
    const langs: AppLanguage[] = ['KO', 'EN', 'JA', 'ZH'];
    for (const lang of langs) {
      expect(RELATION_LABELS[lang]).toBeDefined();
      expect(RELATION_LABELS[lang]['friend']).toBeTruthy();
    }
  });

  it('AGE_LABELS has entries for all 4 languages', () => {
    expect(AGE_LABELS['KO']['teen']).toBe('10대');
    expect(AGE_LABELS['EN']['adult']).toBe('Adult');
  });

  it('EXPLICIT_LABELS has entries for all 4 languages', () => {
    expect(EXPLICIT_LABELS['JA']['high']).toBe('高');
    expect(EXPLICIT_LABELS['ZH']['none']).toBe('无');
  });

  it('PROFANITY_LABELS has entries for all 4 languages', () => {
    expect(PROFANITY_LABELS['KO']['strong']).toBe('강함');
    expect(PROFANITY_LABELS['EN']['mild']).toBe('Mild');
  });
});

// ============================================================
// PART 2 — formatSocialProfile
// ============================================================

const baseSocialProfile: SocialProfile = {
  relationDistance: 'friend',
  ageRegister: 'young_adult',
  explicitness: 'low',
  profanityLevel: 'mild',
};

describe('formatSocialProfile', () => {
  it('formats KO output with correct labels', () => {
    const result = formatSocialProfile(baseSocialProfile, '민수', 'KO');
    expect(result).toContain('[민수 사회적 레지스터]');
    expect(result).toContain('관계: 친구');
    expect(result).toContain('나이대: 청년');
    expect(result).toContain('수위: 낮음');
    expect(result).toContain('비속어: 경미');
  });

  it('formats EN output with correct labels', () => {
    const result = formatSocialProfile(baseSocialProfile, 'Alice', 'EN');
    expect(result).toContain('[Alice Social Register]');
    expect(result).toContain('Relation: Friend');
    expect(result).toContain('Age: Young Adult');
    expect(result).toContain('Explicitness: Low');
    expect(result).toContain('Profanity: Mild');
  });

  it('formats JP output', () => {
    const result = formatSocialProfile(baseSocialProfile, '太郎', 'JA');
    expect(result).toContain('[太郎 Social Register]');
    expect(result).toContain('Relation: 友人');
  });

  it('formats CN output', () => {
    const result = formatSocialProfile(baseSocialProfile, '小明', 'ZH');
    expect(result).toContain('Relation: 朋友');
  });

  it('includes profession when provided (KO)', () => {
    const profile: SocialProfile = {
      ...baseSocialProfile,
      professionRegister: '의사',
    };
    const result = formatSocialProfile(profile, '지연', 'KO');
    expect(result).toContain('직업: 의사');
  });

  it('includes profession when provided (EN)', () => {
    const profile: SocialProfile = {
      ...baseSocialProfile,
      professionRegister: 'Doctor',
    };
    const result = formatSocialProfile(profile, 'Bob', 'EN');
    expect(result).toContain('Profession: Doctor');
  });

  it('omits profession when not provided', () => {
    const result = formatSocialProfile(baseSocialProfile, 'Test', 'KO');
    expect(result).not.toContain('직업');
  });

  it('uses separator between parts', () => {
    const result = formatSocialProfile(baseSocialProfile, 'X', 'EN');
    expect(result).toContain(' / ');
  });

  it('falls back to raw value for unknown relation key', () => {
    const profile = {
      ...baseSocialProfile,
      relationDistance: 'custom_relation' as SocialProfile['relationDistance'],
    };
    const result = formatSocialProfile(profile, 'Test', 'EN');
    expect(result).toContain('custom_relation');
  });

  it('handles all relation types in KO', () => {
    const types: SocialProfile['relationDistance'][] = ['stranger', 'formal', 'colleague', 'friend', 'intimate', 'hostile'];
    for (const rel of types) {
      const profile = { ...baseSocialProfile, relationDistance: rel };
      const result = formatSocialProfile(profile, 'A', 'KO');
      expect(result).toContain(RELATION_LABELS['KO'][rel]);
    }
  });

  it('handles all age registers in EN', () => {
    const ages: SocialProfile['ageRegister'][] = ['teen', 'young_adult', 'adult', 'middle', 'elder'];
    for (const age of ages) {
      const profile = { ...baseSocialProfile, ageRegister: age };
      const result = formatSocialProfile(profile, 'A', 'EN');
      expect(result).toContain(AGE_LABELS['EN'][age]);
    }
  });

  it('handles all explicitness levels', () => {
    const levels: SocialProfile['explicitness'][] = ['none', 'implied', 'low', 'medium', 'high'];
    for (const lvl of levels) {
      const profile = { ...baseSocialProfile, explicitness: lvl };
      const result = formatSocialProfile(profile, 'A', 'EN');
      expect(result).toContain(EXPLICIT_LABELS['EN'][lvl]);
    }
  });

  it('handles all profanity levels', () => {
    const levels: SocialProfile['profanityLevel'][] = ['none', 'mild', 'strong'];
    for (const lvl of levels) {
      const profile = { ...baseSocialProfile, profanityLevel: lvl };
      const result = formatSocialProfile(profile, 'A', 'KO');
      expect(result).toContain(PROFANITY_LABELS['KO'][lvl]);
    }
  });
});
