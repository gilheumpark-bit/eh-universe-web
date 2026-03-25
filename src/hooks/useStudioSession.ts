// ============================================================
// useStudioSession — 세션 생성/데모/이름변경 로직
// StudioContext에서 공유 상태를 가져와 의존성 최소화
// ============================================================

import { useState, useCallback } from 'react';
import type { AppLanguage, AppTab, StoryConfig, ChatSession, Message } from '@/lib/studio-types';
import { Genre } from '@/lib/studio-types';
import { INITIAL_CONFIG } from '@/hooks/useProjectManager';
import { createT } from '@/lib/i18n';

interface UseStudioSessionParams {
  language: AppLanguage;
  currentSession: ChatSession | null;
  editDraft: string;
  doCreateNewSession: () => void;
  updateCurrentSession: (data: Partial<ChatSession>) => void;
  setActiveTab: (tab: AppTab) => void;
  setIsSidebarOpen: (open: boolean) => void;
  showConfirm: (opts: {
    title: string; message: string;
    confirmLabel?: string; cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }) => void;
  closeConfirm: () => void;
}

export function useStudioSession({
  language, currentSession, editDraft,
  doCreateNewSession, updateCurrentSession,
  setActiveTab, setIsSidebarOpen,
  showConfirm, closeConfirm,
}: UseStudioSessionParams) {
  const t = createT(language);
  const isKO = language === 'KO';

  // Renaming
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const createNewSession = useCallback((nextTab: AppTab = 'world') => {
    const commitNewSession = () => {
      doCreateNewSession();
      setActiveTab(nextTab);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const hasCurrentWork = Boolean(
      currentSession?.messages.some(message => message.content.trim()) ||
      editDraft.trim() ||
      currentSession?.config.title?.trim() ||
      currentSession?.config.synopsis?.trim() ||
      currentSession?.config.setting?.trim() ||
      currentSession?.config.povCharacter?.trim()
    );

    if (!hasCurrentWork) {
      commitNewSession();
      return;
    }

    showConfirm({
      title: isKO ? '새로운 소설 시작' : 'Start New Story',
      message: isKO ? '현재 작업이 초기화됩니다. 진행하시겠습니까?' : 'Current work will be reset. Do you want to continue?',
      confirmLabel: isKO ? '진행' : 'Continue',
      cancelLabel: t('confirm.cancel'),
      variant: 'warning',
      onConfirm: () => { closeConfirm(); commitNewSession(); },
    });
  }, [closeConfirm, currentSession, doCreateNewSession, editDraft, isKO, showConfirm, t, setActiveTab, setIsSidebarOpen]);

  const createDemoSession = useCallback(() => {
    const demoConfig = {
      ...INITIAL_CONFIG,
      title: isKO ? '네온 심연의 관찰자' : 'Observer of the Neon Abyss',
      genre: Genre.SF,
      synopsis: isKO
        ? '2847년, 인류는 의식을 디지털화하여 영생을 얻었지만, 그 대가로 감정을 잃어가고 있다. 마지막 "감정 보유자"인 주인공은 시스템이 숨긴 진실을 추적하며, 인간성의 의미를 되찾으려 한다.'
        : 'In 2847, humanity achieved immortality through consciousness digitization, but at the cost of losing emotions. The protagonist, the last "emotion bearer," traces the truth hidden by the system, seeking to reclaim what it means to be human.',
      characters: [
        { name: isKO ? '카이' : 'Kai', role: isKO ? '주인공' : 'Protagonist', traits: isKO ? '냉정하지만 감정의 잔재가 남아있음' : 'Cold but retains emotional residue', dna: 78, appearance: '', personality: isKO ? '논리적이나 가끔 비합리적 선택을 함' : 'Logical but makes irrational choices', speechStyle: isKO ? '짧고 건조한 문장' : 'Short, dry sentences', speechExample: isKO ? '"데이터는 거짓말을 하지 않아. 하지만 진실을 말하지도 않지."' : '"Data doesn\'t lie. But it doesn\'t tell the truth either."' },
        { name: isKO ? '에코' : 'Echo', role: isKO ? '안내자' : 'Guide', traits: isKO ? 'AI지만 인간보다 인간적' : 'AI but more human than humans', dna: 45, appearance: '', personality: isKO ? '호기심 많고 유머러스' : 'Curious and humorous', speechStyle: isKO ? '가면 이모티콘을 섞어 말함' : 'Speaks with mask emoticons', speechExample: isKO ? '"🎭 재밌는 가설이네요, 카이. 근데 틀렸어요."' : '"🎭 Interesting hypothesis, Kai. But wrong."' },
      ],
      episode: 1,
      totalEpisodes: 25,
    };
    const demoMessages = [
      { id: 'demo-1', role: 'user' as const, content: isKO ? '첫 장면을 써줘. 카이가 네온 시티의 하층부에서 에코를 처음 만나는 장면.' : 'Write the first scene. Kai meets Echo for the first time in the lower levels of Neon City.', timestamp: Date.now() - 60000 },
      { id: 'demo-2', role: 'assistant' as const, content: isKO
        ? `하층부의 공기는 무겁다.\n\n합성 산소 필터가 뿜어내는 냄새 — 금속과 오존의 혼합물이 코끝을 찔렀다. 카이는 후드를 더 깊이 눌러 쓰고 좁은 골목을 걸었다.\n\n네온사인이 깜빡였다. '의식 업로드 — 99.7% 성공률.' 누군가 그 아래에 스프레이로 덧씌웠다. '0.3%는 어디 갔지?'\n\n좋은 질문이었다.\n\n"찾고 있는 게 있죠?"\n\n목소리는 어둠에서 왔다. 카이가 멈췄다. 손이 허리춤의 데이터 블레이드로 갔다.\n\n골목 끝, 고장난 홀로그램 광고판 앞에 누군가 앉아 있었다. 아니 — 무언가. 인간의 형상이지만, 눈이 두 개가 아니라 네 개였다. 위쪽 두 눈이 가면처럼 빛났다.\n\n"🎭 긴장 풀어요. 저는 에코. 당신이 올 줄 알았어요."\n\n카이는 대답하지 않았다. 데이터는 거짓말을 하지 않는다. 하지만 이 존재에 대한 데이터는 — 없었다.\n\n그게 문제였다.`
        : `The air in the lower levels was heavy.\n\nThe smell of synthetic oxygen filters — a mix of metal and ozone — stung his nostrils. Kai pulled his hood deeper and walked through the narrow alley.\n\nA neon sign flickered. 'Consciousness Upload — 99.7% Success Rate.' Someone had spray-painted underneath: 'Where did the 0.3% go?'\n\nGood question.\n\n"You're looking for something, aren't you?"\n\nThe voice came from the darkness. Kai stopped. His hand went to the data blade at his hip.\n\nAt the end of the alley, someone sat in front of a broken hologram ad. No — something. Human-shaped, but with four eyes instead of two. The upper pair glowed like a mask.\n\n"🎭 Relax. I'm Echo. I knew you'd come."\n\nKai didn't answer. Data doesn't lie. But data on this being — there was none.\n\nThat was the problem.`,
        timestamp: Date.now(),
        meta: { engineReport: { version: 'demo', grade: 'A-', metrics: { tension: 72, pacing: 85, immersion: 78 }, eosScore: 45, aiTonePercent: 8, tensionTarget: 70, serialization: { platform: 'MOBILE' as const, byteSize: 2400, targetRange: { min: 9500, max: 15500 }, withinRange: true }, actPosition: { act: 1, name: '도입', nameEN: 'Introduction', position: 0.04, progress: 4 }, fixes: [], issues: [], processingTimeMs: 0 } }
      },
    ];
    doCreateNewSession();
    setTimeout(() => {
      updateCurrentSession({ messages: demoMessages as Message[], config: demoConfig as StoryConfig, title: demoConfig.title });
      setActiveTab('writing');
    }, 50);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, [isKO, doCreateNewSession, updateCurrentSession, setActiveTab, setIsSidebarOpen]);

  return {
    createNewSession,
    createDemoSession,
    renamingSessionId, setRenamingSessionId,
    renameValue, setRenameValue,
  };
}
