"use client";

// ============================================================
// PART 1 — ModeSwitch: 5-mode toolbar (집필/노아 제안 + 고급 3모드)
// ============================================================
//
// 역할:
//   - sticky 상단 툴바 — 모드 전환 + undo/redo + 자동완성 토글 + 미리보기 바로가기
//   - Progressive Disclosure — advancedWritingMode OFF 시 기본 2모드만.
//   - 고급 드롭다운은 ON 상태에서만 노출 (3단계/다듬기/고급).
//   - writingMode가 고급 전용인데 OFF로 돌아가면 부모에서 edit로 안전 복귀.
//
// [C] 외부 클릭 감지: MouseEvent.target을 Node로 좁혀 contains() 안전 호출.
// [K] Tier 토글 버튼 + 분할 뷰 버튼은 항상 노출 (기본 모드에서도 사용).
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles, Columns2, Undo2, Redo2, PenLine, Layers, Wand2,
  Settings2, ChevronDown, X,
} from 'lucide-react';
import type { AppLanguage, ChatSession, AppTab } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

// ============================================================
// PART 2 — Props
// ============================================================

export interface ModeSwitchProps {
  language: AppLanguage;
  writingMode: 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced';
  setWritingMode: (m: 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced') => void;
  hasApiKey: boolean;
  setShowApiKeyModal: (show: boolean) => void;
  editDraft: string;
  setEditDraft: (v: string) => void;
  currentSession: ChatSession;
  advancedWritingMode: boolean;
  setAdvancedWritingMode: (v: boolean) => void;
  // Undo/Redo (edit 모드만 노출)
  undoStack: {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
  };
  // Inline completion 토글 (edit 모드만 노출)
  inlineCompletionEnabled: boolean;
  toggleInlineCompletion: () => void;
  // Split view
  splitView: 'chat' | 'reference' | null;
  setSplitView: (v: 'chat' | 'reference' | null) => void;
  // 원고 미리보기 (원고 탭으로 전환)
  setActiveTab: (tab: AppTab) => void;
}

// ============================================================
// PART 3 — 외부 클릭 감지 훅 (드롭다운 닫기)
// ============================================================

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
): void {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (ref.current && !ref.current.contains(target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, ref, onClose]);
}

// ============================================================
// PART 4 — ModeSwitch
// ============================================================

function ModeSwitchImpl(props: ModeSwitchProps): React.ReactElement {
  const {
    language, writingMode, setWritingMode,
    hasApiKey, setShowApiKeyModal,
    editDraft, setEditDraft, currentSession,
    advancedWritingMode, setAdvancedWritingMode,
    undoStack,
    inlineCompletionEnabled, toggleInlineCompletion,
    splitView, setSplitView,
    setActiveTab,
  } = props;

  const [advancedMenuOpen, setAdvancedMenuOpen] = useState(false);
  const advancedMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(advancedMenuRef, advancedMenuOpen, () => setAdvancedMenuOpen(false));

  const handleEditClick = () => {
    setWritingMode('edit');
    // [K] 기존 UX 유지 — edit 진입 시 비어있으면 어시스턴트 메시지를 합쳐 프리필.
    if (!editDraft && currentSession.messages.length > 0) {
      const allText = currentSession.messages
        .filter((m) => m.role === 'assistant' && m.content)
        .map((m) => m.content.replace(/```json\n[\s\S]*?\n```/g, '').trim())
        .join('\n\n---\n\n');
      setEditDraft(allText);
    }
  };

  const handleAiClick = () => {
    if (!hasApiKey) { setShowApiKeyModal(true); return; }
    setWritingMode('ai');
  };

  return (
    <div
      data-zen-hide-bar
      className="sticky top-0 z-30 shrink-0 px-3 py-2.5 border-b border-border/60 bg-bg-primary/95 backdrop-blur-md shadow-[0_6px_20px_rgba(0,0,0,0.12)]"
    >
      <div className="flex flex-wrap gap-2 justify-center max-w-4xl mx-auto items-center">
        {/* ────── 기본 2개: 항상 노출 ────── */}
        <button
          type="button"
          onClick={handleEditClick}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
            writingMode === 'edit'
              ? 'bg-accent-amber/20 border-accent-amber/50 text-accent-amber'
              : 'border-border text-text-secondary hover:border-accent-amber/40'
          }`}
          title={L4(language, {
            ko: '직접 타이핑으로 소설을 씁니다. 실시간 품질 분석, 인라인 리라이트 지원.',
            en: 'Write your novel by typing directly. Real-time quality analysis, inline rewrite.',
            ja: '直接タイピングで小説を書きます。リアルタイム品質分析、インラインリライトに対応。',
            zh: '通过直接键入撰写小说。支持实时质量分析与内联重写。',
          })}
        >
          <PenLine className="w-3.5 h-3.5" />
          <span className="flex flex-col items-start leading-tight">
            <span>{L4(language, { ko: '집필', en: 'Write', ja: '執筆', zh: '写作' })}</span>
            <span className="text-[9px] font-normal text-text-tertiary">
              {L4(language, { ko: '직접 타이핑', en: 'Type directly', ja: 'Type directly', zh: 'Type directly' })}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={handleAiClick}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
            writingMode === 'ai'
              ? 'bg-accent-purple/20 border-accent-purple/50 text-accent-purple'
              : 'border-border text-text-secondary hover:border-accent-purple/40'
          }`}
          title={L4(language, {
            ko: '장면/사건을 입력하면 노아가 이어 쓸 후보를 제안합니다. Enter로 전송.',
            en: 'Describe a scene and Noa suggests a continuation. Press Enter to send.',
            ja: 'シーン/事件を入力するとNoaが続きを提案します。Enterで送信。',
            zh: '输入场景/事件后 Noa 会建议后续内容。按 Enter 发送。',
          })}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="flex flex-col items-start leading-tight">
            <span>{L4(language, { ko: '노아 제안', en: 'Noa suggestion', ja: 'Noa提案', zh: 'Noa 建议' })}</span>
            <span className="text-[9px] font-normal text-text-tertiary">
              {L4(language, {
                ko: '작가가 고를 후보를 준비합니다',
                en: 'Prepare options for the author',
                ja: '作者が選ぶ候補を用意します',
                zh: '准备供作者选择的候选',
              })}
            </span>
          </span>
        </button>

        {/* ────── 고급 드롭다운 (advancedWritingMode && hasApiKey) ────── */}
        {hasApiKey && advancedWritingMode && (
          <>
            <div className="w-px h-5 bg-border/50 mx-1" />
            {(writingMode === 'canvas' || writingMode === 'refine' || writingMode === 'advanced') ? (
              <button
                type="button"
                onClick={() => setWritingMode('edit')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-bold border transition-colors min-h-[44px] ${
                  writingMode === 'canvas' ? 'bg-accent-green/20 border-accent-green/50 text-accent-green' :
                  writingMode === 'refine' ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue' :
                  'bg-accent-red/20 border-accent-red/50 text-accent-red'
                }`}
                title={L4(language, {
                  ko: '기본 모드로 돌아가기',
                  en: 'Back to basic mode',
                  ja: '基本モードに戻る',
                  zh: '返回基础模式',
                })}
              >
                {writingMode === 'canvas' && <><Layers className="w-3.5 h-3.5" />{L4(language, { ko: '3단계', en: '3-Step', ja: '3-Step', zh: '3-Step' })}</>}
                {writingMode === 'refine' && <><Wand2 className="w-3.5 h-3.5" />{L4(language, { ko: '다듬기', en: 'Refine', ja: 'Refine', zh: 'Refine' })}</>}
                {writingMode === 'advanced' && <><Settings2 className="w-3.5 h-3.5" />{L4(language, { ko: '고급', en: 'Advanced', ja: 'Advanced', zh: 'Advanced' })}</>}
                <X className="w-3 h-3 ml-0.5 opacity-60" />
              </button>
            ) : (
              <div className="relative" ref={advancedMenuRef}>
                <button
                  type="button"
                  onClick={() => setAdvancedMenuOpen(v => !v)}
                  aria-haspopup="menu"
                  aria-expanded={advancedMenuOpen}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[13px] font-bold border min-h-[44px] transition-colors ${
                    advancedMenuOpen
                      ? 'text-text-primary border-border bg-bg-secondary'
                      : 'border-transparent text-text-tertiary hover:text-text-secondary hover:border-border'
                  }`}
                  title={L4(language, {
                    ko: '고급 모드 (3단계·다듬기·고급)',
                    en: 'Advanced modes (3-Step, Refine, Advanced)',
                    ja: '上級モード(3ステップ・リファイン・アドバンス)',
                    zh: '高级模式(3 步骤·润色·进阶)',
                  })}
                >
                  <Settings2 className="w-4 h-4" />
                  {L4(language, { ko: '고급', en: 'More', ja: 'More', zh: 'More' })}
                  <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${advancedMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {advancedMenuOpen && (
                  <div
                    role="menu"
                    className="absolute top-full left-0 mt-1 py-1 bg-bg-primary border border-border rounded-xl shadow-2xl min-w-[200px]"
                    style={{ zIndex: 'var(--z-dropdown, 50)' }}
                  >
                    <button
                      type="button"
                      onClick={() => { setWritingMode('canvas'); setAdvancedMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-3 text-[13px] font-bold text-text-secondary hover:bg-bg-secondary hover:text-accent-green transition-colors min-h-[44px]"
                      title={L4(language, {
                        ko: '뼈대 -> 초안 -> 다듬기 3단계 완성',
                        en: 'Skeleton, draft, polish in 3 steps',
                        ja: '骨組み→下書き→仕上げの3ステップで完成',
                        zh: '骨架→草稿→润色 3 步完成',
                      })}
                    >
                      <Layers className="w-4 h-4 shrink-0" />
                      <span className="flex flex-col items-start leading-tight">
                        <span>{L4(language, { ko: '3단계', en: '3-Step', ja: '3-Step', zh: '3-Step' })}</span>
                        <span className="text-[13px] font-normal text-text-tertiary">
                          {L4(language, {
                            ko: '구상→초안→완성 3스텝',
                            en: 'Idea→Draft→Polish',
                            ja: '構想→下書き→完成の3ステップ',
                            zh: '构思→草稿→完成 3 步',
                          })}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setWritingMode('refine'); setAdvancedMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-3 text-[13px] font-bold text-text-secondary hover:bg-bg-secondary hover:text-accent-blue transition-colors min-h-[44px]"
                      title={L4(language, {
                        ko: '약한 문단 자동 개선',
                        en: 'Auto-improve weak paragraphs',
                        ja: '弱い段落を自動改善',
                        zh: '自动改善薄弱段落',
                      })}
                    >
                      <Wand2 className="w-4 h-4 shrink-0" />
                      <span className="flex flex-col items-start leading-tight">
                        <span>{L4(language, { ko: '다듬기', en: 'Refine', ja: 'Refine', zh: 'Refine' })}</span>
                        <span className="text-[13px] font-normal text-text-tertiary">
                          {L4(language, {
                            ko: '기존 원고를 30% 다듬기',
                            en: 'Polish existing draft 30%',
                            ja: '既存原稿を30%仕上げ',
                            zh: '将现有稿件润色 30%',
                          })}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setWritingMode('advanced'); setAdvancedMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-3 text-[13px] font-bold text-text-secondary hover:bg-bg-secondary hover:text-accent-red transition-colors min-h-[44px]"
                      title={L4(language, {
                        ko: '표현 자유도와 세부 설정 직접 조절',
                        en: 'Fine control over expression and settings',
                        ja: '表現の幅と詳細設定を調整',
                        zh: '精细调整表达范围与设置',
                      })}
                    >
                      <Settings2 className="w-4 h-4 shrink-0" />
                      <span className="flex flex-col items-start leading-tight">
                        <span>{L4(language, { ko: '고급', en: 'Advanced', ja: 'Advanced', zh: 'Advanced' })}</span>
                        <span className="text-[13px] font-normal text-text-tertiary">
                          {L4(language, {
                            ko: '세부 설정 직접 조절',
                            en: 'Fine-tune settings',
                            ja: '詳細設定を直接調整',
                            zh: '直接调整详细设置',
                          })}
                        </span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ────── Undo/Redo (edit 모드만) ────── */}
        {writingMode === 'edit' && (
          <div className="flex items-center gap-0.5 ml-2 pl-2 border-l border-border/40">
            <button
              type="button"
              onClick={() => undoStack.undo()}
              disabled={!undoStack.canUndo}
              className={`p-1.5 rounded-lg transition-colors ${
                undoStack.canUndo
                  ? 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                  : 'text-text-quaternary opacity-40 cursor-not-allowed'
              }`}
              title={L4(language, {
                ko: '실행취소 (Ctrl+Z)',
                en: 'Undo (Ctrl+Z)',
                ja: '元に戻す (Ctrl+Z)',
                zh: '撤销 (Ctrl+Z)',
              })}
              aria-label="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => undoStack.redo()}
              disabled={!undoStack.canRedo}
              className={`p-1.5 rounded-lg transition-colors ${
                undoStack.canRedo
                  ? 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
                  : 'text-text-quaternary opacity-40 cursor-not-allowed'
              }`}
              title={L4(language, {
                ko: '다시실행 (Ctrl+Shift+Z)',
                en: 'Redo (Ctrl+Shift+Z)',
                ja: 'Redo (Ctrl+Shift+Z)',
                zh: 'Redo (Ctrl+Shift+Z)',
              })}
              aria-label="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ────── 인라인 자동완성 토글 (edit 모드만) ────── */}
        {writingMode === 'edit' && (
          <button
            type="button"
            onClick={toggleInlineCompletion}
            className={`p-1.5 rounded-lg transition-colors ${
              inlineCompletionEnabled
                ? 'text-accent-amber hover:text-accent-amber/80 hover:bg-accent-amber/10'
                : 'text-text-quaternary hover:text-text-secondary hover:bg-bg-secondary'
            }`}
            title={L4(language, {
              ko: `인라인 자동완성 (Tab) — ${inlineCompletionEnabled ? '켜짐' : '꺼짐'}`,
              en: `Inline autocomplete (Tab) — ${inlineCompletionEnabled ? 'On' : 'Off'}`,
            })}
            aria-label={L4(language, {
              ko: '인라인 자동완성 토글',
              en: 'Toggle inline autocomplete',
              ja: 'Toggle inline autocomplete',
              zh: 'Toggle inline autocomplete',
            })}
          >
            <Wand2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* ────── 원고 미리보기 바로가기 (메시지 존재 시) ────── */}
        {currentSession.messages.some(m => m.role === 'assistant' && m.content) && (
          <button
            type="button"
            onClick={() => setActiveTab('manuscript')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-bold text-text-secondary hover:border-accent-purple/40 hover:text-accent-purple transition-colors"
            title={L4(language, {
              ko: '미리보기 — 원고 탭에서 음성 확인/시각 미리보기',
              en: 'Preview — audio review / visual preview in Manuscript tab',
              ja: 'プレビュー — 原稿タブで音声確認/視覚プレビュー',
              zh: '预览 — 在稿件标签中进行语音检查/视觉预览',
            })}
          >
            <span className="text-sm">🎬</span>
            {L4(language, { ko: '미리보기', en: 'Preview', ja: 'プレビュー', zh: '预览' })}
          </button>
        )}

        {/* ────── 분할 뷰 토글 ────── */}
        <button
          type="button"
          onClick={() => setSplitView(splitView ? null : 'reference')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-[transform,opacity,background-color,border-color,color] ml-auto ${
            splitView
              ? 'bg-accent-amber/20 border-accent-amber/50 text-accent-amber shadow-sm'
              : 'border-border bg-bg-secondary/50 text-text-secondary hover:bg-bg-secondary hover:border-accent-amber/30'
          }`}
        >
          <Columns2 className="w-4 h-4" />
          {L4(language, { ko: '분할 뷰', en: 'Split', ja: 'Split', zh: 'Split' })}
        </button>

        {/* ────── Tier 토글 — 기본/고급 전환 ────── */}
        <button
          type="button"
          onClick={() => setAdvancedWritingMode(!advancedWritingMode)}
          className={`text-[11px] tracking-wide px-2 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
            advancedWritingMode
              ? 'text-text-secondary hover:text-text-primary'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
          title={advancedWritingMode
            ? L4(language, {
                ko: '5모드/세부 옵션 숨기기',
                en: 'Hide 5 modes / advanced options',
                ja: '5モード/詳細オプションを非表示',
                zh: '隐藏 5 模式/高级选项',
              })
            : L4(language, {
                ko: '3단계·다듬기·고급 등 5모드 펼치기',
                en: 'Expand 5 modes (3-Step, Refine, Advanced)',
                ja: '5モードを展開',
                zh: '展开 5 模式',
              })
          }
          aria-pressed={advancedWritingMode}
        >
          {advancedWritingMode
            ? L4(language, {
                ko: '← 기본 모드로',
                en: '← Basic Mode',
                ja: '← 基本モードへ',
                zh: '← 返回基础模式',
              })
            : L4(language, {
                ko: '⚙ 고급 모드',
                en: '⚙ Advanced Mode',
                ja: '⚙ 高度モード',
                zh: '⚙ 高级模式',
              })
          }
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PART 5 — Memo 비교 (M2.2)
// ============================================================
// [G] ModeSwitch 는 sticky toolbar 로 고정 위치 렌더되지만
//     editDraft 타이핑 중 부모가 리렌더되면 toolbar도 함께 리렌더된다.
//     얕은 비교로 실제 변경 없는 렌더를 스킵한다.
//     undoStack 객체는 useUndoStack 에서 새 참조로 교체될 때만 관련 상태 변화.
function modeSwitchPropsEqual(
  prev: Readonly<ModeSwitchProps>,
  next: Readonly<ModeSwitchProps>,
): boolean {
  return (
    prev.language === next.language &&
    prev.writingMode === next.writingMode &&
    prev.setWritingMode === next.setWritingMode &&
    prev.hasApiKey === next.hasApiKey &&
    prev.setShowApiKeyModal === next.setShowApiKeyModal &&
    prev.editDraft === next.editDraft &&
    prev.setEditDraft === next.setEditDraft &&
    prev.currentSession === next.currentSession &&
    prev.advancedWritingMode === next.advancedWritingMode &&
    prev.setAdvancedWritingMode === next.setAdvancedWritingMode &&
    prev.undoStack === next.undoStack &&
    prev.inlineCompletionEnabled === next.inlineCompletionEnabled &&
    prev.toggleInlineCompletion === next.toggleInlineCompletion &&
    prev.splitView === next.splitView &&
    prev.setSplitView === next.setSplitView &&
    prev.setActiveTab === next.setActiveTab
  );
}

export const ModeSwitch = React.memo(ModeSwitchImpl, modeSwitchPropsEqual);
ModeSwitch.displayName = 'ModeSwitch';

export default ModeSwitch;
