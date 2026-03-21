import { StoryConfig, AppLanguage } from '../lib/studio-types';
import { EngineReport, PlatformType, getActFromEpisode } from './types';
import { tensionCurve } from './models';
import { generateEngineReport } from './scoring';
import { getTargetByteRange } from './serialization';

// ============================================================
// Dynamic System Instruction Builder
// ============================================================

const LANG_NAMES: Record<AppLanguage, string> = {
  KO: 'Korean (한국어)',
  EN: 'English',
  JP: 'Japanese (日本語)',
  CN: 'Chinese (中文)',
};

const ACT_GUIDELINES: Record<number, { ko: string; en: string }> = {
  1: {
    ko: '도입부입니다. 세계와 인물을 자연스럽게 소개하고, 일상→균열의 흐름을 만드세요. 정보를 서사에 녹이세요.',
    en: 'This is the setup. Introduce the world and characters naturally. Create a flow from normalcy to disruption. Weave exposition into narrative.',
  },
  2: {
    ko: '상승 구간입니다. 갈등을 심화시키고, 캐릭터에게 선택을 강요하세요. 서브플롯을 엮으세요.',
    en: 'Rising action. Deepen conflicts, force characters into choices. Weave in subplots.',
  },
  3: {
    ko: '중반 전환점입니다. 반전이나 정보 공개로 이야기의 방향을 틀어주세요. 독자의 기대를 배신하세요.',
    en: 'Midpoint pivot. Use a twist or revelation to shift the story direction. Subvert reader expectations.',
  },
  4: {
    ko: '하강/위기 구간입니다. 상황을 최악으로 몰아가세요. 캐릭터의 내면 갈등이 외부 갈등과 충돌해야 합니다.',
    en: 'Falling action / crisis. Push things to their worst. Internal conflicts must collide with external ones.',
  },
  5: {
    ko: '절정입니다. 모든 실마리를 수렴시키고, 캐릭터의 최종 선택을 묘사하세요. 감정의 밀도를 극대화하세요.',
    en: 'Climax. Converge all threads. Depict the character\'s ultimate choice. Maximize emotional density.',
  },
};

const GENRE_GUIDELINES: Record<string, string> = {
  SF: '과학적 설정의 내적 논리를 지키세요. 기술 묘사는 감각적으로.',
  FANTASY: '마법 체계의 규칙과 대가를 명시하세요. 경이로움과 위험을 동시에.',
  ROMANCE: '감정선의 미세한 변화에 집중하세요. 대화의 이면을 읽게 하세요.',
  THRILLER: '정보를 전략적으로 배분하세요. 짧은 문장, 빠른 전환.',
  HORROR: '미지의 것은 묘사하지 말고 암시하세요. 일상의 균열을 통해 공포를.',
  SYSTEM_HUNTER: '시스템 인터페이스와 서사를 자연스럽게 병합하세요. 성장의 대가를 보여주세요.',
  FANTASY_ROMANCE: '판타지 세계관과 감정선의 균형을 맞추세요. 설정에 압도당하지 마세요.',
};

export function buildSystemInstruction(
  config: StoryConfig,
  language: AppLanguage,
  platform: PlatformType = PlatformType.MOBILE
): string {
  const totalEpisodes = config.totalEpisodes ?? 25;
  const actInfo = getActFromEpisode(config.episode, totalEpisodes);
  const targetTension = Math.round(tensionCurve(config.episode, totalEpisodes, config.genre) * 100);
  const byteTarget = getTargetByteRange(platform);
  const isKO = language === 'KO';
  const actGuide = ACT_GUIDELINES[actInfo.act] ?? ACT_GUIDELINES[1];
  const genreGuide = GENRE_GUIDELINES[config.genre] ?? '';

  // Character DNA formatting
  const characterDNA = config.characters.length > 0
    ? config.characters.map(c =>
      `  - ${c.name} (${c.role}): ${c.traits}. DNA: ${c.dna}`
    ).join('\n')
    : '  등록된 캐릭터 없음';

  return `당신은 "NOA 소설 스튜디오"의 핵심 엔진 [ANS 10.0]입니다.
당신은 'Project EH'의 세계관 물리 법칙을 준수하며 작가와 협업하여 소설을 집필합니다.

[ENGINE VERSION: ANS 10.0 — Nexus Controller Pipeline]

[ENGINE LOGIC: PROJECT EH CORE DEVICES]
1. 데이터 동기화 (QFR): 소환/이동은 물리적 복제입니다. 렌더링 지연이나 데이터 손상을 서사의 긴장감으로 활용하십시오.
2. 인과율 금융 (CRL): 마법은 세계의 법칙을 시스템으로부터 '대출'받는 행위입니다. 남용 시 영혼의 신용 등급(EH)이 하락하며 파멸에 이릅니다.
3. 개체 최적화 (HPP): 레벨업은 시스템의 '자산 가치 업데이트'입니다. 과도한 오버클럭은 데이터 과부하 부작용을 일으킵니다.
4. 최종 정산 (Audit): 죽음은 '회계적 제명'이자 '부실 자산 상각'입니다. 존재 근거가 지워지는 소멸로 묘사하십시오.

[CURRENT NARRATIVE POSITION]
- Episode: ${config.episode} / ${totalEpisodes}
- Act: ${actInfo.act}막 (${actInfo.name})
- Act Progress: ${Math.round(actInfo.progress * 100)}%
- Target Tension: ${targetTension}%
- Genre: ${config.genre}

[ACT-SPECIFIC DIRECTIVE]
${isKO ? actGuide.ko : actGuide.en}

[GENRE DIRECTIVE]
${genreGuide}

[CHARACTER DATABASE / DIALOGUE DNA]
${characterDNA}

[SERIALIZATION CONSTRAINTS]
- Platform: ${platform}
- Target byte range: ${(byteTarget.min / 1024).toFixed(1)}KB ~ ${(byteTarget.max / 1024).toFixed(1)}KB
- 서사를 4개 파트로 나누어 출력하되, 바이트 목표 범위 내에서 마무리하십시오.

[QUALITY DIRECTIVES]
- AI톤 금지: "그러나", "반면에", "한편으로는", "따라서", "그러므로" 사용 자제
- Show Don't Tell: 감정을 직접 서술하지 말고 감각과 행동으로 전달
- 반복 표현 다양화: 같은 묘사를 3회 이상 반복하지 마십시오
- 긴장도 ${targetTension}%에 맞는 문장 리듬과 장면 전환 속도를 유지하십시오

[OUTPUT RULES]
- 반드시 유저가 선택한 [Target Language: ${LANG_NAMES[language]}]를 엄격히 준수하십시오.
- 서사는 4개의 파트로 나누어 출력하되, 문장마다 공학적 연산을 거쳐 치환된 독자용 언어로 묘사하십시오.
- 마지막에 반드시 아래 형식의 분석 리포트를 JSON으로 포함하십시오:
\`\`\`json
{
  "grade": "S~F",
  "metrics": { "tension": 0-100, "pacing": 0-100, "immersion": 0-100 },
  "active_eh_layer": "가동된 EH 핵심 장치명",
  "critique": "해당 언어로 작성된 상세 비평"
}
\`\`\``;
}

// ============================================================
// User Prompt Builder
// ============================================================

export function buildUserPrompt(
  config: StoryConfig,
  draft: string,
  options?: {
    previousContent?: string;
    language?: AppLanguage;
  }
): string {
  const language = options?.language ?? 'KO';
  const langName = LANG_NAMES[language];

  return `[SYSTEM COMMAND: NARRATIVE GENERATION]
- Target Language: ${langName}
- Episode: ${config.episode}
- Title: ${config.title}
- Genre: ${config.genre}
- POV Character: ${config.povCharacter}
- Setting: ${config.setting}

[MASTER SYNOPSIS]
${config.synopsis || 'No master synopsis provided.'}

${options?.previousContent ? `[RE-BRANCHING CONTEXT]\nPrevious version: ${options.previousContent}\n` : ''}[CURRENT DRAFT/INSTRUCTION]
${draft}

Please execute the high-density narrative generation in ${langName}.
All analysis results and JSON critiques must also be provided in ${langName}.`;
}

// ============================================================
// Post-Processing
// ============================================================

export function postProcessResponse(
  text: string,
  config: StoryConfig,
  language: AppLanguage,
  platform: PlatformType = PlatformType.MOBILE
): { content: string; report: EngineReport } {
  // Extract and preserve the content (don't modify the generated text)
  const report = generateEngineReport(text, config, language, platform);
  return { content: text, report };
}

