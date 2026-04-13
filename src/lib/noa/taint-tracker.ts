// ============================================================
// PART 1 — Taint Tracker (L2 데이터 격리)
// ============================================================
// 도메인 간 데이터 오염 방지.
// 소설 데이터 → 코드 컨텍스트 유출 차단.
// 기밀 엔티티 → 비식별화(Redaction) 후 전달.

// ── Types ──

export type TaintDomain = 'novel' | 'code' | 'translation' | 'world' | 'public';

export interface TaintedData {
  /** 원본 데이터 */
  content: string;
  /** 오염 도메인 */
  domain: TaintDomain;
  /** 오염 태그 */
  taintId: string;
  /** 기밀 엔티티 목록 (마스킹 대상) */
  sensitiveEntities: string[];
  /** 타임스탬프 */
  createdAt: number;
}

export interface DecontaminatedData {
  /** 비식별화된 데이터 */
  content: string;
  /** 마스킹된 엔티티 수 */
  maskedCount: number;
  /** 원본 도메인 */
  sourceDomain: TaintDomain;
  /** 대상 도메인 */
  targetDomain: TaintDomain;
}

// ── 격리 규칙 ──

/** 도메인 간 데이터 이동 허용 매트릭스 */
const ISOLATION_MATRIX: Record<TaintDomain, Set<TaintDomain>> = {
  novel:       new Set(['novel', 'public']),        // 소설 → 소설, 공개만
  code:        new Set(['code', 'public']),          // 코드 → 코드, 공개만
  translation: new Set(['translation', 'novel', 'public']), // 번역 → 번역, 소설, 공개
  world:       new Set(['world', 'novel', 'public']), // 세계관 → 세계관, 소설, 공개
  public:      new Set(['novel', 'code', 'translation', 'world', 'public']), // 공개 → 어디든
};

// IDENTITY_SEAL: PART-1 | role=types-and-rules | inputs=none | outputs=types

// ============================================================
// PART 2 — Taint Engine
// ============================================================

let _taintCounter = 0;

export class TaintTracker {
  private registry = new Map<string, TaintedData>();

  /** 데이터에 오염 태그 부착 */
  taint(content: string, domain: TaintDomain, sensitiveEntities: string[] = []): TaintedData {
    const taintId = `taint-${domain}-${++_taintCounter}`;
    const data: TaintedData = {
      content,
      domain,
      taintId,
      sensitiveEntities,
      createdAt: Date.now(),
    };
    this.registry.set(taintId, data);
    return data;
  }

  /** 도메인 간 이동 가능 여부 확인 */
  canTransfer(sourceDomain: TaintDomain, targetDomain: TaintDomain): boolean {
    return ISOLATION_MATRIX[sourceDomain].has(targetDomain);
  }

  /** 데이터를 다른 도메인으로 이동 (정화 프록시 적용) */
  transfer(taintId: string, targetDomain: TaintDomain): DecontaminatedData | null {
    const data = this.registry.get(taintId);
    if (!data) return null;

    // 직접 이동 허용?
    if (this.canTransfer(data.domain, targetDomain)) {
      return {
        content: data.content,
        maskedCount: 0,
        sourceDomain: data.domain,
        targetDomain,
      };
    }

    // 비허용 → 정화(Decontamination) 후 이동
    return this.decontaminate(data, targetDomain);
  }

  /** 기밀 엔티티 비식별화 (Soft-Fail) */
  private decontaminate(data: TaintedData, targetDomain: TaintDomain): DecontaminatedData {
    let masked = data.content;
    let maskedCount = 0;

    // 등록된 기밀 엔티티 마스킹
    for (const entity of data.sensitiveEntities) {
      if (masked.includes(entity)) {
        masked = masked.replaceAll(entity, '<MASKED_DATA>');
        maskedCount++;
      }
    }

    // 자동 패턴 마스킹 (API 키, 이메일, 전화번호 등)
    const autoPatterns = [
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, label: 'EMAIL' },
      { pattern: /\b(?:sk-|AIza|ghp_|xoxb-)[A-Za-z0-9_-]{20,}\b/g, label: 'API_KEY' },
      { pattern: /\b\d{3}[-.]?\d{3,4}[-.]?\d{4}\b/g, label: 'PHONE' },
      { pattern: /\b\d{6}[-]?\d{7}\b/g, label: 'ID_NUMBER' },
    ];

    for (const { pattern, label } of autoPatterns) {
      const matches = masked.match(pattern);
      if (matches) {
        for (const match of matches) {
          masked = masked.replace(match, `<${label}_MASKED>`);
          maskedCount++;
        }
      }
    }

    return {
      content: masked,
      maskedCount,
      sourceDomain: data.domain,
      targetDomain,
    };
  }

  /** 레지스트리 조회 */
  getTaintedData(taintId: string): TaintedData | undefined {
    return this.registry.get(taintId);
  }

  /** 도메인별 오염 데이터 수 */
  countByDomain(domain: TaintDomain): number {
    let count = 0;
    for (const data of this.registry.values()) {
      if (data.domain === domain) count++;
    }
    return count;
  }

  /** 오래된 오염 데이터 정리 (30분 이상) */
  cleanup(maxAgeMs = 30 * 60 * 1000): number {
    const now = Date.now();
    let removed = 0;
    for (const [id, data] of this.registry) {
      if (now - data.createdAt > maxAgeMs) {
        this.registry.delete(id);
        removed++;
      }
    }
    return removed;
  }

  /** 전체 리셋 */
  reset(): void {
    this.registry.clear();
  }
}

// ── Singleton ──
let _globalTracker: TaintTracker | null = null;
export function getTaintTracker(): TaintTracker {
  if (!_globalTracker) _globalTracker = new TaintTracker();
  return _globalTracker;
}

// IDENTITY_SEAL: PART-2 | role=taint-engine | inputs=content,domain | outputs=DecontaminatedData
