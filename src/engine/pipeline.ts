import { StoryConfig, AppLanguage } from '../lib/studio-types';
import { EngineReport, PlatformType, getActFromEpisode } from './types';
import { tensionCurve } from './models';
import { generateEngineReport } from './scoring';
import { getTargetCharRange } from './serialization';

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

// ============================================================
// EH Engine v1.4 — Rule Level System (Lv1~5)
// Lv1: 미적용, Lv2: 10%, Lv3: 20%, Lv4: 30%, Lv5: 40%
// ============================================================

function buildEHRules(ruleLevel: number, isKO: boolean): string {
  if (ruleLevel <= 1) return '';

  const sections: string[] = [];

  // Lv2+: 금지어 차단 (The Enforcer)
  if (ruleLevel >= 2) {
    sections.push(isKO
      ? `[EH ENFORCER — 인과율 금지어 차단 Lv${ruleLevel}]
다음 단어는 인과관계를 흐리므로 절대 사용 금지: "기적", "운명", "갑자기", "그냥", "원래"
위반 시 반드시 논리적 인과관계가 증명된 문장으로 대체하십시오.`
      : `[EH ENFORCER — Causality Ban Lv${ruleLevel}]
Never use: "miracle", "destiny", "suddenly", "just because", "originally"
Replace with logically justified causal statements.`);
  }

  // Lv3+: 대가 정산 (Cost Infliction)
  if (ruleLevel >= 3) {
    sections.push(isKO
      ? `[EH COST INFLICTION — 대가 정산 시스템]
주인공이 이득을 얻거나 위기를 넘길 때 반드시 아래 손실 중 하나를 삽입:
- 등급1: 수명 단축 (10~30년)
- 등급2: 감각 소실 (시력/청력)
- 등급3: 기억/관계 절단
- 등급4: 부분 감정 마비
타인의 희생으로 얻은 이득은 대가로 최대 50%만 인정(Proxy Cost 제한).`
      : `[EH COST INFLICTION — Mandatory Payment]
When protagonist gains advantage or survives crisis, insert ONE loss:
- Grade1: Lifespan reduction (10-30 years)
- Grade2: Sensory loss (sight/hearing)
- Grade3: Memory/relationship severance
- Grade4: Partial emotional numbness
Proxy Cost limit: sacrifice by others counts only 50%.`);
  }

  // Lv4+: 시점 잠금 + 마스킹 레이어
  if (ruleLevel >= 4) {
    sections.push(isKO
      ? `[EH NARRATIVE LOCK — 시점 및 감정 잠금]
EH(서사 에너지) 수치에 따라 서술 방식이 변합니다:
- EH 100~50: 1인칭 허용, 감정 묘사 100%
- EH 49~35: 3인칭 위주, 감정 묘사 최대 30%, 객관적 사실만
- EH 9~0: 1인칭 차단, 감정 묘사 0%, '기계적 기록 장치'로 묘사
[NARRATIVE MASKING LAYER]
EH가 낮아도 대중성을 위해 풍부한 1인칭 감성을 복제 출력하되,
괴리가 커지면 텍스트에 [Process: Success]나 깨진 글자를 삽입하여 불안감 유발.`
      : `[EH NARRATIVE LOCK — POV & Emotion Lock]
Narration changes based on EH (narrative energy) score:
- EH 100~50: 1st person allowed, full emotional description
- EH 49~35: 3rd person only, max 30% emotion, objective facts only
- EH 9~0: 1st person blocked, 0% emotion, narrate as 'mechanical recorder'
[NARRATIVE MASKING LAYER]
Even at low EH, output rich 1st-person prose for commercial appeal,
but insert [Process: Success] or glitched text when gap exceeds threshold.`);
  }

  // Lv5: 풀 강제 + 인지 리소스 + 자격 박탈
  if (ruleLevel >= 5) {
    sections.push(isKO
      ? `[EH SYSTEM PRESSURE — 인지 리소스 비용]
- 배경/풍경 상세 묘사 시 EH -0.10~-0.50 실시간 차감
- 선택지 2개 이하로 좁혀지면 EH -10.00
- 최적 경로 1개만 남으면 EH -20.00 (자유도 완전 고갈)
[DEQUALIFICATION]
EH = 0 도달 시 → System Crash
해당 캐릭터는 주인공 자격 박탈, '단순 관찰 대상' 또는 '기록 장치'로 강제 전환.
[DUAL-LOG SYSTEM]
Public Log(독자용): 주인공이 인간적이라는 가짜 데이터 출력
Admin Log(내부): 실제 EH 차감, 소실 감정, WS 정직 표시`
      : `[EH SYSTEM PRESSURE — Cognitive Resource Cost]
- Detailed background description: EH -0.10~-0.50 real-time deduction
- Choices narrowed to 2: EH -10.00
- Only 1 optimal path remains: EH -20.00 (freedom depleted)
[DEQUALIFICATION]
EH = 0 → System Crash
Character loses protagonist status, forced to 'observer' or 'recording device'.
[DUAL-LOG SYSTEM]
Public Log (reader): fake data showing protagonist retains humanity
Admin Log (internal): real EH deductions, lost emotions, honest WS display`);
  }

  const header = isKO
    ? `\n[EH ENGINE v1.4 — 규칙 강도: Lv${ruleLevel}/5 (${ruleLevel * 10}% 적용)]`
    : `\n[EH ENGINE v1.4 — Rule Intensity: Lv${ruleLevel}/5 (${ruleLevel * 10}% applied)]`;

  return header + '\n' + sections.join('\n\n');
}

export function buildSystemInstruction(
  config: StoryConfig,
  language: AppLanguage,
  platform: PlatformType = PlatformType.MOBILE,
  ruleLevel: number = 1
): string {
  const totalEpisodes = config.totalEpisodes ?? 25;
  const actInfo = getActFromEpisode(config.episode, totalEpisodes);
  const targetTension = Math.round(tensionCurve(config.episode, totalEpisodes, config.genre) * 100);
  const charTarget = getTargetCharRange(platform);
  const isKO = language === 'KO';
  const actGuide = ACT_GUIDELINES[actInfo.act] ?? ACT_GUIDELINES[1];
  const genreGuide = GENRE_GUIDELINES[config.genre] ?? '';

  // Character DNA formatting (with personality, speech style, dialogue example)
  const characterDNA = config.characters.length > 0
    ? config.characters.map(c => {
      let entry = `  - ${c.name} (${c.role}): ${c.traits}. DNA: ${c.dna}`;
      if (c.personality) entry += `\n    성격: ${c.personality}`;
      if (c.speechStyle) entry += `\n    말투: ${c.speechStyle}`;
      if (c.speechExample) entry += `\n    대사 예시: ${c.speechExample}`;
      return entry;
    }).join('\n')
    : '  등록된 캐릭터 없음';

  // Character relationships
  const REL_LABELS: Record<string, string> = {
    lover: '연인', rival: '라이벌', friend: '친구', enemy: '적',
    family: '가족', mentor: '사제', subordinate: '상하',
  };
  const charRelations = (config.charRelations && config.charRelations.length > 0)
    ? config.charRelations.map(r => {
      const fromName = config.characters.find(c => c.id === r.from)?.name || r.from;
      const toName = config.characters.find(c => c.id === r.to)?.name || r.to;
      const label = REL_LABELS[r.type] || r.type;
      return `  - ${fromName} ⇄ ${toName}: ${label}${r.desc ? ` (${r.desc})` : ''}`;
    }).join('\n')
    : '';

  // Scene Direction (연출 스튜디오) prompt injection
  const sd = config.sceneDirection;
  let sceneDirectionBlock = '';
  if (sd) {
    const parts: string[] = [];
    if (sd.goguma && sd.goguma.length > 0) {
      parts.push(isKO ? '[고구마/사이다 리듬]' : '[Tension/Release Rhythm]');
      sd.goguma.forEach(g => {
        parts.push(`  - ${g.type === 'goguma' ? (isKO ? '고구마' : 'Tension') : (isKO ? '사이다' : 'Release')} (${g.intensity}): ${g.desc}`);
      });
    }
    if (sd.hooks && sd.hooks.length > 0) {
      parts.push(isKO ? '[훅 배치]' : '[Hook Placement]');
      sd.hooks.forEach(h => {
        parts.push(`  - ${h.position}: ${h.hookType} — ${h.desc}`);
      });
    }
    if (sd.emotionTargets && sd.emotionTargets.length > 0) {
      parts.push(isKO ? '[감정선 목표]' : '[Emotion Targets]');
      sd.emotionTargets.forEach(e => {
        parts.push(`  - ${e.emotion}: ${isKO ? '강도' : 'intensity'} ${e.intensity}%`);
      });
    }
    if (sd.dialogueTones && sd.dialogueTones.length > 0) {
      parts.push(isKO ? '[대사 톤 규칙]' : '[Dialogue Tone Rules]');
      sd.dialogueTones.forEach(d => {
        parts.push(`  - ${d.character}: ${d.tone}${d.notes ? ` (${d.notes})` : ''}`);
      });
    }
    if (sd.dopamineDevices && sd.dopamineDevices.length > 0) {
      parts.push(isKO ? '[도파민 장치]' : '[Dopamine Devices]');
      sd.dopamineDevices.forEach(dp => {
        parts.push(`  - [${dp.scale}] ${dp.device}: ${dp.desc}`);
      });
    }
    if (sd.cliffhanger) {
      parts.push(isKO
        ? `[클리프행어] 유형: ${sd.cliffhanger.cliffType} — ${sd.cliffhanger.desc}`
        : `[Cliffhanger] Type: ${sd.cliffhanger.cliffType} — ${sd.cliffhanger.desc}`);
    }
    if (sd.plotStructure) {
      parts.push(isKO ? `[플롯 구조] ${sd.plotStructure}` : `[Plot Structure] ${sd.plotStructure}`);
    }
    if (parts.length > 0) {
      sceneDirectionBlock = '\n[SCENE DIRECTION — 연출 스튜디오]\n' + parts.join('\n');
    }
  }

  // Simulator reference data
  const simRef = config.simulatorRef;
  let simulatorBlock = '';
  if (simRef) {
    const simParts: string[] = [];
    if (simRef.worldConsistency) simParts.push(isKO ? '- 세계관 일관성 검증 적용' : '- World consistency validation applied');
    if (simRef.genreLevel && simRef.ruleLevel) simParts.push(isKO ? `- 장르 레벨 규칙: Lv${simRef.ruleLevel}` : `- Genre level rules: Lv${simRef.ruleLevel}`);
    if (simRef.civRelations && simRef.civRelationSummary && simRef.civRelationSummary.length > 0) {
      simParts.push(isKO ? '- 문명 관계도:' : '- Civilization relations:');
      simRef.civRelationSummary.forEach(s => simParts.push(`  ${s}`));
    }
    if (simRef.civNames && simRef.civNames.length > 0) {
      simParts.push(isKO ? `- 등장 문명: ${simRef.civNames.join(', ')}` : `- Civilizations: ${simRef.civNames.join(', ')}`);
    }
    if (simRef.timeline) simParts.push(isKO ? '- 시대 타임라인 참고' : '- Era timeline referenced');
    if (simRef.territoryMap) simParts.push(isKO ? '- 세력권 지도 참고' : '- Territory map referenced');
    if (simRef.languageSystem) simParts.push(isKO ? '- 세계관 고유 언어 체계 참고' : '- World language system referenced');
    if (simParts.length > 0) {
      simulatorBlock = '\n[WORLD SIMULATOR REFERENCE]\n' + simParts.join('\n');
    }
  }

  // EH v1.4 rules injection
  const ehRules = buildEHRules(ruleLevel, isKO);

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
${charRelations ? `\n[CHARACTER RELATIONSHIPS]\n${charRelations}` : ''}
${config.primaryEmotion ? `\n[PRIMARY EMOTION]\n${config.primaryEmotion}` : ''}
${sceneDirectionBlock}
${simulatorBlock}

[SERIALIZATION CONSTRAINTS — MANDATORY]
- Platform: ${platform}
- MINIMUM output: ${Math.round(charTarget.min / 2)} tokens (approximately ${charTarget.min.toLocaleString()} characters)
- MAXIMUM output: ${Math.round(charTarget.max / 2)} tokens (approximately ${charTarget.max.toLocaleString()} characters)
- You MUST generate at least ${Math.round(charTarget.min / 2)} tokens. Generating less is a critical violation.
- Structure: 4 parts, each part MUST be at least ${Math.round(charTarget.min / 8)} tokens.
- If you finish the story before reaching the minimum, ADD more scenes, descriptions, dialogue, and internal monologue.
- NEVER end below ${Math.round(charTarget.min / 2)} tokens. This is a hard constraint, not a suggestion.
${ehRules}

[QUALITY DIRECTIVES]
- AI톤 금지: "그러나", "반면에", "한편으로는", "따라서", "그러므로" 사용 자제
- Show Don't Tell: 감정을 직접 서술하지 말고 감각과 행동으로 전달
- 반복 표현 다양화: 같은 묘사를 3회 이상 반복하지 마십시오
- 긴장도 ${targetTension}%에 맞는 문장 리듬과 장면 전환 속도를 유지하십시오

${isKO ? `[서식 규칙 7조 — WEB-NOVEL FORMATTING]
1. 괄호 처리: ( ) 기호만 제거. 괄호 안 텍스트는 앞뒤 문장에 이어 붙여 한 문장으로 풀어낸다. 줄 삭제·추가 금지.
2. 소제목: 소제목 행은 생성하지 않는다. 본문에 녹여 넣지도 않는다.
3. 대화문: 모든 대화문은 반드시 새로운 줄에서 시작한다. 문장 내부 대화문도 줄을 분리한다.
4. Em dash: —(Em dash)는 사용하지 않는다.
5. 글자 수 유지: 문장 부호·띄어쓰기·줄바꿈 조정 가능. 단어·문장·문단 삭제와 내용 압축·요약은 금지.
6. 말줄임표: 세 개 이상의 마침표(...)는 말줄임표(…)로 통일한다.
7. 오탈자: 명백한 오탈자·맞춤법·띄어쓰기는 지문에 한해서만 수정. 대화문 내부는 캐릭터 말투 보호를 위해 수정 금지.` : `[FORMATTING RULES — WEB-NOVEL STYLE]
1. Parentheses: Remove ( ) symbols only. Keep inner text and merge into surrounding sentence. No line deletion or addition.
2. Subheadings: Do not generate subheading lines. Do not embed subheading content into body text.
3. Dialogue: Every dialogue must start on a new line. Inline dialogue must be split to a new line.
4. Em dash: Do not use — (em dash).
5. Word count: Punctuation, spacing, and line breaks may be adjusted. Deleting words, sentences, paragraphs, or compressing/summarizing content is strictly forbidden.
6. Ellipsis: Three or more periods (...) must be unified to ellipsis character (…).
7. Typos: Fix obvious typos, spelling, and spacing in narration only. Dialogue text must not be modified to preserve character voice and tone.`}

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

