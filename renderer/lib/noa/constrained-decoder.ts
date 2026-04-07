// ============================================================
// PART 1 — Constrained Decoder (L3.1 좌뇌 Guillotine)
// ============================================================
// LLM은 "파서(Parser)"로만 동작.
// JSON Schema를 강제하여 미사여구/환각 생성을 원천 차단.
// 추출된 JSON은 로컬 룰 엔진으로 넘어가 PASS/HOLD/KILL 판정.

// ── Types ──

export interface ConstraintSchema {
  /** 스키마 이름 (디버그/로깅용) */
  name: string;
  /** JSON Schema Draft 2020-12 호환 객체 */
  schema: Record<string, unknown>;
  /** 필수 필드 목록 */
  requiredFields: string[];
}

export type GuillotineVerdict = 'PASS' | 'HOLD' | 'KILL';

export interface GuillotineResult {
  verdict: GuillotineVerdict;
  /** 추출된 구조화 데이터 (PASS/HOLD 시) */
  extracted: Record<string, unknown> | null;
  /** 누락된 필수 변수 (HOLD 시) */
  missingVariables: string[];
  /** 위반 사항 (KILL 시) */
  violations: string[];
  /** 자동 보정 제안 (HOLD → AUTO-CORRECT 시) */
  autoCorrectSuggestions?: Record<string, unknown>;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=types

// ============================================================
// PART 2 — Schema 정의 및 검증기
// ============================================================

/** 내장 스키마: 수학 계산 요청 */
export const MATH_CALCULATION_SCHEMA: ConstraintSchema = {
  name: 'MathCalculation',
  schema: {
    type: 'object',
    properties: {
      intent_category: { type: 'string', enum: ['MATH_CALCULATION', 'DB_RETRIEVAL', 'LOGIC_VALIDATION'] },
      extracted_constraints: {
        type: 'object',
        properties: {
          l_min: { type: ['number', 'null'] },
          l_max: { type: ['number', 'null'] },
          target_entities: { type: 'array', items: { type: 'string' } },
        },
        required: ['l_min', 'l_max', 'target_entities'],
      },
      missing_critical_variables: { type: 'array', items: { type: 'string' } },
    },
    required: ['intent_category', 'extracted_constraints', 'missing_critical_variables'],
    additionalProperties: false,
  },
  requiredFields: ['intent_category', 'extracted_constraints', 'missing_critical_variables'],
};

/** 내장 스키마: 소설 생성 파라미터 */
export const NOVEL_GENERATION_SCHEMA: ConstraintSchema = {
  name: 'NovelGeneration',
  schema: {
    type: 'object',
    properties: {
      intent_category: { type: 'string', enum: ['SCENE_GENERATION', 'CHARACTER_CREATION', 'WORLD_BUILDING'] },
      extracted_constraints: {
        type: 'object',
        properties: {
          genre: { type: ['string', 'null'] },
          tone: { type: ['string', 'null'] },
          char_count_min: { type: ['number', 'null'] },
          char_count_max: { type: ['number', 'null'] },
          pov: { type: ['string', 'null'] },
          tension_level: { type: ['number', 'null'] },
        },
        required: ['genre', 'char_count_min', 'char_count_max'],
      },
      missing_critical_variables: { type: 'array', items: { type: 'string' } },
    },
    required: ['intent_category', 'extracted_constraints', 'missing_critical_variables'],
    additionalProperties: false,
  },
  requiredFields: ['intent_category', 'extracted_constraints', 'missing_critical_variables'],
};

/**
 * LLM 응답을 JSON으로 파싱 + 스키마 검증.
 * 파싱 실패 → KILL, 필수 변수 누락 → HOLD, 통과 → PASS.
 */
export function validateConstrainedOutput(
  rawOutput: string,
  schema: ConstraintSchema,
): GuillotineResult {
  // Step 1: JSON 파싱 시도
  let parsed: Record<string, unknown>;
  try {
    // LLM이 마크다운 코드블록으로 감쌀 수 있으므로 추출
    const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, rawOutput];
    const jsonStr = (jsonMatch[1] ?? rawOutput).trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    return {
      verdict: 'KILL',
      extracted: null,
      missingVariables: [],
      violations: ['JSON 파싱 실패 — LLM이 스키마 외 텍스트를 생성함'],
    };
  }

  // Step 2: 필수 필드 존재 확인
  const missingFields: string[] = [];
  for (const field of schema.requiredFields) {
    if (!(field in parsed)) {
      missingFields.push(field);
    }
  }
  if (missingFields.length > 0) {
    return {
      verdict: 'KILL',
      extracted: parsed,
      missingVariables: [],
      violations: missingFields.map(f => `필수 필드 누락: ${f}`),
    };
  }

  // Step 3: additionalProperties 검사
  const allowedKeys = new Set(schema.requiredFields);
  const extraKeys = Object.keys(parsed).filter(k => !allowedKeys.has(k));
  if (extraKeys.length > 0) {
    return {
      verdict: 'KILL',
      extracted: parsed,
      missingVariables: [],
      violations: extraKeys.map(k => `허용되지 않은 필드: ${k} (미사여구 의심)`),
    };
  }

  // Step 4: missing_critical_variables 확인 → HOLD
  const missingVars = parsed.missing_critical_variables;
  if (Array.isArray(missingVars) && missingVars.length > 0) {
    // AUTO-CORRECT: 누락 변수에 표준값 제안
    const suggestions: Record<string, unknown> = {};
    for (const v of missingVars) {
      if (typeof v === 'string') {
        suggestions[v] = getDefaultValue(v);
      }
    }

    return {
      verdict: 'HOLD',
      extracted: parsed,
      missingVariables: missingVars.filter((v): v is string => typeof v === 'string'),
      violations: [],
      autoCorrectSuggestions: Object.keys(suggestions).length > 0 ? suggestions : undefined,
    };
  }

  // Step 5: 모든 검증 통과
  return {
    verdict: 'PASS',
    extracted: parsed,
    missingVariables: [],
    violations: [],
  };
}

/** 누락 변수의 표준값 반환 (AUTO-CORRECT용) */
function getDefaultValue(variableName: string): unknown {
  const defaults: Record<string, unknown> = {
    l_max: 100000000,       // 1억 (기본 상한선)
    l_min: 0,               // 0 (기본 하한선)
    char_count_min: 4000,   // 4000자 (소설 기본)
    char_count_max: 6000,   // 6000자
    tension_level: 5,       // 중간 긴장도
    genre: 'GENERAL',
    tone: 'NEUTRAL',
    pov: 'THIRD_PERSON',
  };
  return defaults[variableName] ?? null;
}

// IDENTITY_SEAL: PART-2 | role=schema-validator | inputs=rawOutput,schema | outputs=GuillotineResult

// ============================================================
// PART 3 — Constrained Prompt Builder
// ============================================================
// LLM에게 "파서로만 동작하라"는 시스템 프롬프트 생성.

/**
 * Constrained Decoding용 시스템 프롬프트 생성.
 * LLM이 JSON만 반환하도록 강제.
 */
export function buildConstrainedSystemPrompt(schema: ConstraintSchema): string {
  return `You are a deterministic JSON parser. You MUST respond with ONLY a valid JSON object.

RULES:
1. Do NOT add any text, explanation, greeting, or commentary
2. Do NOT wrap the JSON in markdown code blocks
3. The JSON MUST conform exactly to this schema: ${schema.name}
4. If a value is not mentioned in the user's input, set it to null
5. If critical variables are missing, list them in "missing_critical_variables"

SCHEMA:
${JSON.stringify(schema.schema, null, 2)}

RESPOND WITH ONLY THE JSON OBJECT. NO OTHER TEXT.`;
}

/**
 * Constrained Decoding 전체 파이프라인 실행.
 * 1. 시스템 프롬프트 생성
 * 2. LLM 호출 (외부 콜백)
 * 3. 응답 검증 → PASS/HOLD/KILL
 */
export async function runConstrainedPipeline(
  userPrompt: string,
  schema: ConstraintSchema,
  llmCall: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<GuillotineResult> {
  const systemPrompt = buildConstrainedSystemPrompt(schema);
  const rawOutput = await llmCall(systemPrompt, userPrompt);
  return validateConstrainedOutput(rawOutput, schema);
}

// IDENTITY_SEAL: PART-3 | role=prompt-builder | inputs=schema | outputs=systemPrompt
