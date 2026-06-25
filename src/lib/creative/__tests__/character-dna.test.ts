// character-dna 단위 테스트 — 정상·빈입력·경계·이상값
import {
  emptyCharacterDNA,
  validateDNA,
  dnaCompleteness,
  dnaToPromptBlock,
  type CharacterDNA,
} from '../character-dna';

// 완전히 채워진 샘플 DNA 빌더
function fullDNA(): CharacterDNA {
  return {
    tier1: {
      name: '강도하',
      desire: '제국을 무너뜨린다',
      ghost: '어린 시절 가족을 잃었다',
      weakness: '타인을 믿지 못한다',
    },
    tier2: {
      need: '용서하는 법을 배워야 한다',
      values: ['정의', '복수'],
      voiceFingerprint: '짧고 단정적인 말투',
      arc: '냉혈한 복수자 → 공동체의 수호자',
    },
    tier3: {
      relationships: ['스승 백운'],
      secrets: ['실은 황실 혈통'],
      signaturePhrases: ['끝까지 간다'],
    },
  };
}

describe('emptyCharacterDNA', () => {
  it('빈 DNA 는 모든 필수 필드가 비어 검증 실패', () => {
    const dna = emptyCharacterDNA();
    expect(validateDNA(dna).ok).toBe(false);
    expect(validateDNA(dna).missing.length).toBe(8);
    expect(dnaCompleteness(dna)).toBe(0);
  });

  it('매 호출 신규 객체 (가변 기본인수 회피)', () => {
    const a = emptyCharacterDNA();
    const b = emptyCharacterDNA();
    a.tier1.name = '변경';
    expect(b.tier1.name).toBe('');
  });
});

describe('validateDNA', () => {
  it('완전한 DNA 는 ok=true, missing 없음', () => {
    const v = validateDNA(fullDNA());
    expect(v.ok).toBe(true);
    expect(v.missing).toEqual([]);
  });

  it('null/undefined 방어 — 8개 필수 슬롯 모두 누락', () => {
    expect(validateDNA(null).ok).toBe(false);
    expect(validateDNA(null).missing).toContain('tier1.name');
    expect(validateDNA(undefined).missing).toContain('tier2.values');
    expect(validateDNA(null).missing.length).toBe(8);
  });

  it('부분 입력 — 누락 경로만 정확히 보고', () => {
    const dna = emptyCharacterDNA();
    dna.tier1.name = '홍길동';
    dna.tier2.values = ['의리'];
    const v = validateDNA(dna);
    expect(v.missing).not.toContain('tier1.name');
    expect(v.missing).not.toContain('tier2.values');
    expect(v.missing).toContain('tier1.desire');
    expect(v.missing).toContain('tier2.arc');
  });

  it('이상값 — 공백/빈배열은 미충족으로 처리', () => {
    const dna = emptyCharacterDNA();
    dna.tier1.name = '   '; // 공백만
    dna.tier2.values = ['', '  ']; // 빈 항목만
    const v = validateDNA(dna);
    expect(v.missing).toContain('tier1.name');
    expect(v.missing).toContain('tier2.values');
  });
});

describe('dnaCompleteness', () => {
  it('완전 DNA = 100%', () => {
    expect(dnaCompleteness(fullDNA())).toBe(100);
  });

  it('절반 채움 (4/8) ≈ 50%', () => {
    const dna = emptyCharacterDNA();
    dna.tier1.name = 'A';
    dna.tier1.desire = 'B';
    dna.tier1.ghost = 'C';
    dna.tier1.weakness = 'D';
    expect(dnaCompleteness(dna)).toBe(50);
  });

  it('null 입력 = 0% (0분모 없음)', () => {
    expect(dnaCompleteness(null)).toBe(0);
  });
});

describe('dnaToPromptBlock', () => {
  it('완전 DNA — 모든 라벨 포함', () => {
    const block = dnaToPromptBlock(fullDNA());
    expect(block).toContain('[캐릭터 DNA]');
    expect(block).toContain('이름: 강도하');
    expect(block).toContain('가치관(Values): 정의, 복수');
    expect(block).toContain('시그니처 대사(Signature): 끝까지 간다');
  });

  it('빈 DNA / null — 안내 문구 반환', () => {
    expect(dnaToPromptBlock(emptyCharacterDNA())).toBe('[캐릭터 DNA 없음]');
    expect(dnaToPromptBlock(null)).toBe('[캐릭터 DNA 없음]');
  });

  it('부분 입력 — 채워진 필드만 출력, 빈 줄 누출 없음', () => {
    const dna = emptyCharacterDNA();
    dna.tier1.name = '이순신';
    const block = dnaToPromptBlock(dna);
    expect(block).toContain('이름: 이순신');
    expect(block).not.toContain('욕망');
    // 빈 줄 누출 검사 — 모든 줄이 헤더이거나 '- ' 항목
    for (const ln of block.split('\n')) {
      expect(ln === '[캐릭터 DNA]' || ln.startsWith('- ')).toBe(true);
    }
  });

  it('tier3 없어도 tier1/2 정상 출력', () => {
    const dna = fullDNA();
    delete dna.tier3;
    const block = dnaToPromptBlock(dna);
    expect(block).toContain('변화 곡선(Arc)');
    expect(block).not.toContain('관계(Relationships)');
  });
});
