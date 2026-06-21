export interface NoaPromptAssemblyArgs {
  criticalRules: string; // L1: 금지 패턴, 권리/IP 점검, 프로젝트 격리
  currentProjectLore: string; // L2: 현재 프로젝트 세계관·캐릭터·시나리오
  recentContext: string; // L3: 최근 대화, 의도 메모, 작가 합의
  externalCraftReferenceBlock?: string; // L3.5: 외부 프로젝트에서 추출한 기법만 (선택 사항)
  currentTask: string; // L4: 현재 회차 씬시트·연출·집필 목표
  finalAuthorCommand: string; // L5: 작가 실시간 지시
}

/**
 * NOA 5계층 프롬프트 조립 엔진
 * 수학적으로 계산된 최적의 어텐션 가중치 배분(Recency Bias 등)을 위해 
 * 반드시 정해진 계층(L1 -> L5) 순서대로 프롬프트를 조립합니다.
 */
export function assembleNoaPrompt(args: NoaPromptAssemblyArgs): string {
  let prompt = '';

  // L1: 최상단 방화벽 (절대 무시할 수 없는 기본 규칙 및 금지어)
  if (args.criticalRules.trim()) {
    prompt += `<CRITICAL_RULES>\n${args.criticalRules}\n</CRITICAL_RULES>\n\n`;
  }

  // L2: 현재 세계관 (DNA 및 장기 기억)
  if (args.currentProjectLore.trim()) {
    prompt += `<CURRENT_PROJECT_LORE>\n${args.currentProjectLore}\n</CURRENT_PROJECT_LORE>\n\n`;
  }

  // L3: 최근 맥락 (사회성 및 대화 기록)
  if (args.recentContext.trim()) {
    prompt += `<RECENT_CONTEXT>\n${args.recentContext}\n</RECENT_CONTEXT>\n\n`;
  }

  // L3.5: 외부 기법 참조 브릿지 (일회용 망분리 스타일 주입)
  if (args.externalCraftReferenceBlock && args.externalCraftReferenceBlock.trim()) {
    prompt += `${args.externalCraftReferenceBlock}\n\n`;
  }

  // L4: 현재 실무 작업 목표
  if (args.currentTask.trim()) {
    prompt += `<CURRENT_TASK>\n${args.currentTask}\n</CURRENT_TASK>\n\n`;
  }

  // L5: 최하단 최우선 지시 (Recency Bias를 활용한 실시간 통제)
  // L1의 경계(방화벽) 안에서 L5의 목표를 최대화하도록 유도합니다.
  if (args.finalAuthorCommand.trim()) {
    prompt += `<FINAL_AUTHOR_COMMAND>\n`;
    prompt += `[지시사항: 상기한 <CRITICAL_RULES>의 금지 사항을 엄격히 준수하는 한도 내에서, 아래의 작가 지시를 최우선으로 반영하여 결과물을 생성할 것.]\n`;
    prompt += `${args.finalAuthorCommand}\n`;
    prompt += `</FINAL_AUTHOR_COMMAND>\n`;
  }

  return prompt.trim();
}
