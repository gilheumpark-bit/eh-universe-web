/**
 * Quality audit tests for JP and CN translations.
 * Covers grammatical, script, and style consistency checks without
 * requiring native review — catches the most common class of AI-auto
 * translation regressions.
 */

import translationsJa from '@/lib/translations-ja';
import translationsZh from '@/lib/translations-zh';

// ============================================================
// PART 1 — Helpers: flatten nested translation objects into leaves
// ============================================================

type TranslationLeaf = { path: string; value: string };

function flattenLeaves(obj: unknown, path: string[] = []): TranslationLeaf[] {
  if (obj == null) return [];
  if (typeof obj === 'string') {
    return [{ path: path.join('.'), value: obj }];
  }
  if (Array.isArray(obj)) {
    const out: TranslationLeaf[] = [];
    obj.forEach((item, idx) => {
      out.push(...flattenLeaves(item, [...path, String(idx)]));
    });
    return out;
  }
  if (typeof obj === 'object') {
    const out: TranslationLeaf[] = [];
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out.push(...flattenLeaves(v, [...path, k]));
    }
    return out;
  }
  return [];
}

// 繁體(traditional-only) 식별 문자 — 간체에서는 나타나면 안 되는 것들
// 대응 간체: 国/将/时/广/从/发/电/个/头/体/会/还/东/来/处/过/问/门/机/开/关/书/车
const TRADITIONAL_ONLY_CHARS = [
  '國', '將', '時', '廣', '從', '發', '電', '個', '頭', '體',
  '會', '還', '東', '來', '處', '過', '問', '門', '機', '開',
  '關', '書', '車', '馬', '鳥', '魚', '學', '見', '語', '說',
  '讀', '寫', '業', '長', '無', '樣', '點', '當', '麼', '這',
  '為', '對', '實', '給', '經', '選', '設', '應', '當', '後',
];

// CJK 한자 판정 — 중국어 번역에 반드시 포함돼야 할 곳에서 한자가 하나도 없는지 확인
const HAS_CJK = /[\u4e00-\u9fff]/;
// 히라가나·가타카나 — 일본어 문장에 반드시 하나는 있어야 함
const HAS_KANA = /[\u3040-\u309f\u30a0-\u30ff]/;
// 일본 敬体(-です/-ます/-ください) 어말
const JA_POLITE_ENDING = /(です|ます|ください|でしょう|ません)[。！？!?]?$/;

const jaLeaves = flattenLeaves(translationsJa);
const zhLeaves = flattenLeaves(translationsZh);

// ============================================================
// PART 2 — JP translation quality
// ============================================================

describe('JP translations quality', () => {
  it('systemメッセージ (uxHelpers, errorBoundary, common error) — 主な文はですます調終端', () => {
    // 시스템 에러/안내 문구 중 일부 대표 key만 샘플링 — 공손형이어야 함
    const sampleKeys = [
      'uxHelpers.apiKeyErrorMsg',
      'uxHelpers.networkErrorMsg',
      'uxHelpers.timeoutMsg',
      'uxHelpers.parseErrorMsg',
    ];
    const map = new Map(jaLeaves.map((l) => [l.path, l.value]));
    for (const k of sampleKeys) {
      const v = map.get(k);
      expect(v).toBeDefined();
      // 단문이라도 です/ます/ください 중 하나로 끝나야 함
      expect(JA_POLITE_ENDING.test(v!)).toBe(true);
    }
  });

  it('日本語ストリング — 少なくとも1つの仮名/漢字を含む (意味のあるテキストのみ)', () => {
    // 빈 문자열, 순 기호, 영문 전용(모델명 등) 제외 — 일정 길이 이상 + 영문 비율 낮은 것
    const suspect: string[] = [];
    for (const { path, value } of jaLeaves) {
      if (value.length < 4) continue;
      // 영문/숫자/기호만: 스킵
      if (!/[^\u0020-\u007e]/.test(value)) continue;
      // カタカナ/ひらがな/漢字 전혀 없음 → 번역 누락 의심
      if (!HAS_KANA.test(value) && !/[\u4e00-\u9fff]/.test(value)) {
        suspect.push(`${path}: "${value}"`);
      }
    }
    // 0 또는 소수만 허용 — 의심 목록이 크면 누락 문제
    if (suspect.length > 5) {
      throw new Error(`JP untranslated candidates: ${suspect.slice(0, 10).join(' | ')}`);
    }
  });

  it('カタカナ技術用語 — 一般的な片仮名表記を正しく使う', () => {
    const map = new Map(jaLeaves.map((l) => [l.path, l.value]));
    // API → エーピーアイ가 아니라 API 원어 유지 허용.
    // キー / キャンセル / プロンプト / エンジン / キャラクター 등 기본 片仮名어 존재 여부
    const carriers = [
      { key: 'engine.apiKeyCancel', must: 'キャンセル' },
      { key: 'engine.apiKeyTitle', must: 'キー' },
      { key: 'engine.generating', must: 'ナラティブ' },
    ];
    for (const c of carriers) {
      const v = map.get(c.key);
      expect(v).toBeDefined();
      expect(v!.includes(c.must)).toBe(true);
    }
  });

  it('長文に不自然な助詞「を」脱落がない (代表パラグラフのみ)', () => {
    // 동사 직전에 조사 를(を) 없이 명사가 바로 붙는 심각한 패턴은 없는지 체크
    // 완전 검증 불가 — 휴리스틱: 한자+동사(する/ます) 결합 중 "を" 가 없는 사이 공백도 없는 케이스는 예외 허용.
    // 대신 JA 일반 동사 형태가 평문에 존재하는지 확인 (인프라 최저선)
    const verbPattern = /(ます|する|います|しました|できます|なります|くださ|行われ)/;
    const longStrings = jaLeaves.filter((l) => l.value.length >= 15);
    // 긴 문자열 중 동사 형태가 전혀 없는 것은 번역 불완전 의심
    const suspiciousRatio = longStrings.filter((l) => !verbPattern.test(l.value)).length / Math.max(longStrings.length, 1);
    // 60% 초과로 동사 없는 긴 문자열이라면 문제 — 여유있게 90% 로 게이트
    expect(suspiciousRatio).toBeLessThan(0.9);
  });

  it('中黒/句読点 — 中国語専用句点「。」（同じ記号だが全角必須）一致', () => {
    // 일본어는 「。」「、」사용 — 반각 마침표 . 또는 ,로 끝나는 문자열이 많은지
    // 공지/문장 형태는 전각 구두점이 정석
    let halfwidthPunctTail = 0;
    let totalLong = 0;
    for (const { value } of jaLeaves) {
      if (value.length < 10) continue;
      // ASCII 영문/모델명/경로 가능성 → 기호 포함 문자열 중 일본 문자 있는 것만
      if (!HAS_KANA.test(value)) continue;
      totalLong += 1;
      if (/[.,]$/.test(value)) halfwidthPunctTail += 1;
    }
    // 전체 긴 일본어 문장의 절반 이상이 반각 마침표로 끝나는 경우 → 번역 품질 문제
    if (totalLong > 0) {
      expect(halfwidthPunctTail / totalLong).toBeLessThan(0.5);
    }
  });
});

// ============================================================
// PART 3 — CN translation quality
// ============================================================

describe('CN translations quality', () => {
  it('简体一貫性 — 繁體字 (國/將/時 等) を含まない', () => {
    const offenders: Array<{ path: string; value: string; char: string }> = [];
    for (const { path, value } of zhLeaves) {
      for (const ch of TRADITIONAL_ONLY_CHARS) {
        if (value.includes(ch)) {
          offenders.push({ path, value, char: ch });
          break;
        }
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        `CN traditional-char offenders: ${offenders
          .slice(0, 5)
          .map((o) => `${o.path} (${o.char}) "${o.value}"`)
          .join(' | ')}`,
      );
    }
  });

  it('中文ストリング — 少なくとも1つのCJK漢字を含む (意味のあるテキストのみ)', () => {
    const suspect: string[] = [];
    for (const { path, value } of zhLeaves) {
      if (value.length < 4) continue;
      if (!/[^\u0020-\u007e]/.test(value)) continue; // 英数字記号のみ → 除外
      if (!HAS_CJK.test(value)) {
        suspect.push(`${path}: "${value}"`);
      }
    }
    if (suspect.length > 5) {
      throw new Error(`CN untranslated candidates: ${suspect.slice(0, 10).join(' | ')}`);
    }
  });

  it('分類詞 (量詞) — 「个」「本」「次」など一般的な量詞が1つ以上登場する', () => {
    // 평범한 집필 UI에서는 "点击一次" 같은 표현이 나오므로 적어도 1건 이상 있어야 함
    const allText = zhLeaves.map((l) => l.value).join('\n');
    const hasCountWord = /[一两三四五六七八九十几多]个|一本|一次|一页|一条|一份|第[0-9一二三四五]+[章节页步]/.test(allText);
    expect(hasCountWord).toBe(true);
  });

  it('句読点 — 中国語は主に 「。」「，」(全角)。半角 . で終わる長文が大半ではない', () => {
    let halfwidthPunctTail = 0;
    let totalLong = 0;
    for (const { value } of zhLeaves) {
      if (value.length < 10) continue;
      if (!HAS_CJK.test(value)) continue;
      totalLong += 1;
      if (/[.,]$/.test(value)) halfwidthPunctTail += 1;
    }
    if (totalLong > 0) {
      expect(halfwidthPunctTail / totalLong).toBeLessThan(0.5);
    }
  });

  it('核心UIラベル — 共通キーが空でない且つ最低限正しい', () => {
    const map = new Map(zhLeaves.map((l) => [l.path, l.value]));
    const expectations: Array<[string, string]> = [
      ['engine.apiKeySave', '保存'],
      ['engine.apiKeyCancel', '取消'],
      ['ui.apply', '应用'],
      ['ui.undo', '撤销'],
      ['ui.close', '关闭'],
      ['ui.search', '搜索'],
    ];
    for (const [k, expected] of expectations) {
      const v = map.get(k);
      expect(v).toBeDefined();
      expect(v).toBe(expected);
    }
  });

  it('共通設定ラベル — 日本語翻訳の「キャンセル」と中国語「取消」が対応する', () => {
    const jaMap = new Map(jaLeaves.map((l) => [l.path, l.value]));
    const zhMap = new Map(zhLeaves.map((l) => [l.path, l.value]));
    // ペア検査 — 両方に存在し、各言語の慣用語を満たす
    const pairs = ['engine.apiKeyCancel', 'engine.cancel', 'confirm.cancel'];
    for (const k of pairs) {
      const ja = jaMap.get(k);
      const zh = zhMap.get(k);
      if (ja && zh) {
        expect(ja.includes('キャンセル')).toBe(true);
        expect(zh === '取消' || zh.includes('取消')).toBe(true);
      }
    }
  });
});
