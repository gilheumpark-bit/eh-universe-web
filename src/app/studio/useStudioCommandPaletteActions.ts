"use client";

import { useCallback, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { StudioAction } from '@/components/studio/GlobalSearchPalette';
import { L4 } from '@/lib/i18n';
import type { AppLanguage, AppTab } from '@/lib/studio-types';

interface UseStudioCommandPaletteActionsArgs {
  language: AppLanguage;
  currentSessionId: string | null;
  createNewSession: () => void;
  handlePrint: () => void;
  setFocusMode: Dispatch<SetStateAction<boolean>>;
  setShowShortcuts: Dispatch<SetStateAction<boolean>>;
  triggerSave: () => Promise<boolean>;
  handleTabChange: (tab: AppTab) => void;
  setRightPanelOpen: Dispatch<SetStateAction<boolean>>;
  setShowApiKeyModal: Dispatch<SetStateAction<boolean>>;
}

export function useStudioCommandPaletteActions({
  language,
  currentSessionId,
  createNewSession,
  handlePrint,
  setFocusMode,
  setShowShortcuts,
  triggerSave,
  handleTabChange,
  setRightPanelOpen,
  setShowApiKeyModal,
}: UseStudioCommandPaletteActionsArgs): StudioAction[] {
  const handleCommandAction = useCallback((actionId: string) => {
    switch (actionId) {
      case 'new-session':
        createNewSession();
        break;
      case 'export-txt':
        window.dispatchEvent(new Event('noa:export-txt'));
        break;
      case 'print':
        handlePrint();
        break;
      case 'toggle-focus':
        setFocusMode(previous => !previous);
        break;
      case 'toggle-shortcuts':
        setShowShortcuts(previous => !previous);
        break;
      case 'save-now':
        void triggerSave();
        break;
      case 'open-settings':
        handleTabChange('settings');
        break;
      case 'switch-branch':
        window.dispatchEvent(new Event('noa:switch-branch'));
        break;
      case 'export-epub':
        window.dispatchEvent(new Event('noa:export-epub'));
        break;
      case 'translate-current': {
        if (!currentSessionId) {
          window.dispatchEvent(new CustomEvent('noa:alert', { detail: { msg: '활성 세션이 없습니다.', kind: 'warning' } }));
          break;
        }
        window.dispatchEvent(new Event('noa:translate-current'));
        window.open(`/translation-studio?from=${encodeURIComponent(currentSessionId)}`, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'toggle-assistant':
        setRightPanelOpen(previous => !previous);
        break;
      case 'open-api-key':
        setShowApiKeyModal(true);
        break;
      case 'open-marketplace':
        handleTabChange('settings');
        setTimeout(() => {
          try {
            window.dispatchEvent(new CustomEvent('noa:open-marketplace', { detail: { actionId: 'open-marketplace' } }));
          } catch {
            /* best-effort */
          }
        }, 50);
        break;
      default:
        break;
    }
  }, [
    createNewSession,
    currentSessionId,
    handlePrint,
    handleTabChange,
    setFocusMode,
    setRightPanelOpen,
    setShowApiKeyModal,
    setShowShortcuts,
    triggerSave,
  ]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { actionId?: string } | undefined;
      if (detail?.actionId) handleCommandAction(detail.actionId);
    };
    window.addEventListener('noa:command-action', handler);
    return () => window.removeEventListener('noa:command-action', handler);
  }, [handleCommandAction]);

  return useMemo<StudioAction[]>(() => [
    {
      id: 'new-session',
      label: L4(language, { ko: '새 에피소드', en: 'New Episode', ja: '新規エピソード', zh: '新章节' }),
      description: L4(language, { ko: '빈 에피소드 세션 생성', en: 'Create a blank episode session', ja: '空のエピソードセッションを作成', zh: '创建空白章节会话' }),
      shortcut: 'Ctrl+Shift+N',
      keywords: ['new', 'session', 'episode', '새', '에피소드'],
      handler: () => handleCommandAction('new-session'),
    },
    {
      id: 'export-txt',
      label: L4(language, { ko: 'TXT 내보내기', en: 'Export TXT', ja: 'TXTエクスポート', zh: '导出TXT' }),
      description: L4(language, { ko: '현재 세션을 TXT로 저장', en: 'Save current session as TXT', ja: '現在のセッションをTXTとして保存', zh: '将当前会话保存为TXT' }),
      shortcut: 'Ctrl+E',
      keywords: ['export', 'txt', 'save', '내보내기'],
      handler: () => handleCommandAction('export-txt'),
    },
    {
      id: 'print',
      label: L4(language, { ko: '인쇄', en: 'Print', ja: '印刷', zh: '打印' }),
      description: L4(language, { ko: '원고 인쇄 대화상자 열기', en: 'Open manuscript print dialog', ja: '原稿印刷ダイアログを開く', zh: '打开稿件打印对话框' }),
      shortcut: 'Ctrl+P',
      keywords: ['print', '인쇄'],
      handler: () => handleCommandAction('print'),
    },
    {
      id: 'toggle-focus',
      label: L4(language, { ko: '집중 모드', en: 'Focus Mode', ja: 'フォーカスモード', zh: '专注模式' }),
      description: L4(language, { ko: 'UI 숨기고 글쓰기만', en: 'Hide UI, write only', ja: 'UIを隠して執筆のみ', zh: '隐藏UI，只写作' }),
      shortcut: 'F11',
      keywords: ['focus', 'zen', '집중'],
      handler: () => handleCommandAction('toggle-focus'),
    },
    {
      id: 'toggle-shortcuts',
      label: L4(language, { ko: '단축키 도움말', en: 'Keyboard Shortcuts', ja: 'キーボードショートカット', zh: '键盘快捷键' }),
      description: L4(language, { ko: '전체 단축키 목록 보기', en: 'Show all keyboard shortcuts', ja: '全ショートカットを表示', zh: '显示所有快捷键' }),
      shortcut: 'F12',
      keywords: ['help', 'shortcut', '단축키'],
      handler: () => handleCommandAction('toggle-shortcuts'),
    },
    {
      id: 'save-now',
      label: L4(language, { ko: '지금 저장', en: 'Save Now', ja: '今すぐ保存', zh: '立即保存' }),
      description: L4(language, { ko: '즉시 수동 저장', en: 'Trigger manual save immediately', ja: '即時に手動保存', zh: '立即手动保存' }),
      shortcut: 'Ctrl+S',
      keywords: ['save', '저장'],
      handler: () => handleCommandAction('save-now'),
    },
    {
      id: 'open-settings',
      label: L4(language, { ko: '설정 열기', en: 'Open Settings', ja: '設定を開く', zh: '打开设置' }),
      description: L4(language, { ko: '스튜디오 설정 탭으로 이동', en: 'Jump to Studio settings tab', ja: 'スタジオ設定タブへ移動', zh: '跳转到工作室设置标签' }),
      shortcut: 'F8',
      keywords: ['settings', 'preferences', '설정'],
      handler: () => handleCommandAction('open-settings'),
    },
    {
      id: 'switch-branch',
      label: L4(language, { ko: '브랜치 전환', en: 'Switch Branch', ja: 'ブランチ切替', zh: '切换分支' }),
      description: L4(language, { ko: 'GitHub 평행우주 브랜치 선택', en: 'Select a parallel-universe Git branch', ja: 'Git並行ブランチを選択', zh: '选择平行宇宙Git分支' }),
      keywords: ['branch', 'git', 'parallel', '브랜치'],
      handler: () => handleCommandAction('switch-branch'),
    },
    {
      id: 'export-epub',
      label: L4(language, { ko: 'EPUB 내보내기', en: 'Export EPUB', ja: 'EPUBエクスポート', zh: '导出EPUB' }),
      description: L4(language, { ko: '전자책 EPUB 3.0 파일 생성', en: 'Generate EPUB 3.0 ebook', ja: 'EPUB 3.0電子書籍を生成', zh: '生成EPUB 3.0电子书' }),
      keywords: ['export', 'epub', 'ebook', '전자책'],
      handler: () => handleCommandAction('export-epub'),
    },
    {
      id: 'translate-current',
      label: L4(language, { ko: '현재 에피소드 번역', en: 'Translate Current Episode', ja: '現在のエピソードを翻訳', zh: '翻译当前章节' }),
      description: L4(language, { ko: '번역·현지화 작업실로 보내기', en: 'Send to Translation & Localization', ja: '翻訳・ローカライズへ送信', zh: '发送至翻译·本地化' }),
      keywords: ['translate', 'i18n', '번역'],
      handler: () => handleCommandAction('translate-current'),
    },
    {
      id: 'toggle-assistant',
      label: L4(language, { ko: '노아 패널 토글', en: 'Toggle Noa panel', ja: 'ノアパネルを切替', zh: '切换诺亚面板' }),
      description: L4(language, { ko: '오른쪽 노아 패널 열기/닫기', en: 'Open or close the right Noa panel', ja: '右側のノアパネルを開閉', zh: '打开或关闭右侧诺亚面板' }),
      shortcut: 'Ctrl+/',
      keywords: ['assistant', 'ai', 'panel', '어시스턴트'],
      handler: () => handleCommandAction('toggle-assistant'),
    },
    {
      id: 'open-api-key',
      label: L4(language, { ko: '연결 키 등록', en: 'Configure Connection Key', ja: '接続キー設定', zh: '配置连接密钥' }),
      description: L4(language, { ko: '모델 연결 키 관리 열기', en: 'Open connection key manager', ja: 'モデル接続キー管理を開く', zh: '打开模型连接密钥管理' }),
      keywords: ['api', 'key', 'provider', '키', '연결'],
      handler: () => handleCommandAction('open-api-key'),
    },
    {
      id: 'open-marketplace',
      label: L4(language, { ko: '확장 기능', en: 'Extensions', ja: '拡張機能', zh: '扩展功能' }),
      description: L4(language, { ko: '내장 보조 기능을 확인하고 켜기', en: 'Review and enable bundled extras', ja: '内蔵補助機能を確認して有効化', zh: '查看并启用内置辅助功能' }),
      shortcut: 'Ctrl+Shift+P',
      keywords: ['extension', 'extensions', 'addon', '확장', '확장 기능'],
      handler: () => handleCommandAction('open-marketplace'),
    },
  ], [handleCommandAction, language]);
}
