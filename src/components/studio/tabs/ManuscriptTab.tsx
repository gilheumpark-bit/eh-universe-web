// ============================================================
// PART 1 — Imports & Class Constants
// ============================================================
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Share2, Languages, Film, PenLine, Headphones, Download, Settings2, Plus, Github } from 'lucide-react';
import { useGitHubAutoSync, isGitHubAutoSyncEnabled } from '@/hooks/useGitHubAutoSync';
import { AppLanguage, StoryConfig, Message } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import ManuscriptView from '@/components/studio/ManuscriptView';
import { TabHeader } from '@/components/studio/TabHeader';
import AuthorDashboard from '@/components/studio/AuthorDashboard';
import EmotionArcChart from '@/components/studio/EmotionArcChart';
import FatigueDetector from '@/components/studio/FatigueDetector';
import ShareToNetwork from '@/components/studio/ShareToNetwork';
import TranslationPanel from '@/components/studio/TranslationPanel';
import { parseManuscript, generateVoiceMappings, exportScenesAsHTML } from '@/engine/scene-parser';
import type { ParsedScene } from '@/engine/scene-parser';

const ScenePlayer = dynamic(() => import('@/components/studio/ScenePlayer'), { ssr: false });
const SceneTimeline = dynamic(() => import('@/components/studio/SceneTimeline'), { ssr: false });

/**
 * 상단 액션 버튼 공통 스타일 — 중복된 Tailwind 체인을 상수로 추출.
 * 외곽/텍스트 크기는 공통, 활성/비활성 컬러만 BTN_COLORS 에서 선택.
 */
const BTN_CLASS =
  'px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider ' +
  'border transition-[transform,opacity,background-color,border-color,color] flex items-center gap-1.5';

const BTN_INACTIVE =
  'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary';

const BTN_COLORS = {
  purple: 'bg-accent-purple text-white border-accent-purple',
  green: 'bg-accent-green text-white border-accent-green',
  blue: 'bg-accent-blue text-white border-accent-blue',
  amber: 'bg-accent-amber text-white border-accent-amber',
} as const;

const toggleBtn = (active: boolean, color: keyof typeof BTN_COLORS): string =>
  `${BTN_CLASS} ${active ? BTN_COLORS[color] : BTN_INACTIVE}`;

const simpleBtn = (extra = ''): string =>
  `${BTN_CLASS} ${BTN_INACTIVE}${extra ? ` ${extra}` : ''}`;

/**
 * 장면 속성 업데이트용 타입 — ParsedScene의 스트링 필드만 허용.
 * Pick으로 고정하여 키-값 쌍의 타입 안전 보장.
 */
type EditableSceneStringField = 'location' | 'timeOfDay' | 'mood' | 'backgroundPrompt';

type SceneMode = 'off' | 'radio' | 'visual' | 'edit';

// ============================================================
// PART 2 — Props & Component State
// ============================================================
interface ManuscriptTabProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: (c: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;
  messages: Message[];
  onEditInStudio: (content: string) => void;
  /** Visual 탭으로 전환 (이미지 카드 편집용) */
  onOpenVisual?: () => void;
}

const ManuscriptTab: React.FC<ManuscriptTabProps> = ({
  language,
  config,
  setConfig,
  messages,
  onEditInStudio,
  onOpenVisual,
}) => {
  const [showDashboard, setShowDashboard] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [sceneMode, setSceneMode] = useState<SceneMode>('off');
  const [parsedScenes, setParsedScenes] = useState<ParsedScene[]>([]);
  const [showSceneProps, setShowSceneProps] = useState(false);
  const [editingSceneIdx, setEditingSceneIdx] = useState<number | null>(null);

  // ============================================================
  // PART 2.5 — GitHub 자동 동기화 (2026-04-25 신설)
  // ============================================================
  // README/landing 의 "GitHub 자동 백업" 약속 wiring.
  // localStorage 'noa-github-autosync' 토글 + Settings → 백업 섹션에서 OAuth/PAT 연결.
  // 연결됨 + 토글 on 시 manuscripts 변경 → 30초 debounce → episode 별 commit.
  const [autoSyncOn, setAutoSyncOn] = useState<boolean>(() => isGitHubAutoSyncEnabled());
  useEffect(() => {
    const handler = () => setAutoSyncOn(isGitHubAutoSyncEnabled());
    window.addEventListener('noa:github-autosync-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('noa:github-autosync-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  const ghAutoSync = useGitHubAutoSync({
    enabled: autoSyncOn,
    manuscripts: config.manuscripts ?? [],
    projectTitle: config.title || 'Untitled',
    debounceMs: 30_000,
  });
  const handleGitHubPush = useCallback(() => {
    if (!ghAutoSync.connected) {
      // 미연결 시: 사용자에게 설정 진입 안내 (StudioShell이 listen 가능)
      try {
        window.dispatchEvent(new CustomEvent('noa:open-settings', { detail: { section: 'backups' } }));
      } catch { /* noop */ }
      return;
    }
    void ghAutoSync.pushNow();
  }, [ghAutoSync]);
  const formatSyncTime = useCallback((ts: number | null): string => {
    if (!ts) return '';
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return `${diffSec}초 전`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    return `${diffHour}시간 전`;
  }, []);

  // ============================================================
  // PART 3 — Callbacks (scene parsing, export, episode add, prop edit)
  // ============================================================

  // 현재 선택된 에피소드 원고에서 장면 파싱
  const handleSceneMode = useCallback((mode: 'radio' | 'visual' | 'edit') => {
    // 같은 모드 재클릭 시 토글
    if (sceneMode === mode) { setSceneMode('off'); setParsedScenes([]); return; }

    const manuscripts = config.manuscripts ?? [];
    const latestMs = manuscripts[manuscripts.length - 1];
    if (!latestMs?.content) {
      // 원고 없어도 모드는 세팅 → 빈 상태 안내 UI 표시
      setParsedScenes([]);
      setSceneMode(mode);
      return;
    }

    try {
      const result = parseManuscript(latestMs.content, config.characters ?? []);
      setParsedScenes(result.scenes);
      setSceneMode(mode);
    } catch (err) {
      // [C] parseManuscript 실패 시 빈 씬으로 폴백 + 경고 로깅
      logger.warn('ManuscriptTab', 'parseManuscript failed', err);
      setParsedScenes([]);
      setSceneMode(mode);
    }
  }, [config.manuscripts, config.characters, sceneMode]);

  const voiceMappings = useMemo(
    () => generateVoiceMappings(config.characters ?? []),
    [config.characters],
  );

  const handleExportHTML = useCallback(() => {
    if (parsedScenes.length === 0) return;
    const title = config.title || '비주얼 노벨';
    const html = exportScenesAsHTML(parsedScenes, title);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_visual_novel.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [parsedScenes, config.title]);

  const updateSceneProp = useCallback(
    (idx: number, key: EditableSceneStringField, value: string) => {
      setParsedScenes(prev => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
    },
    [],
  );

  const handleAddEpisode = useCallback(() => {
    const manuscripts = config.manuscripts ?? [];
    // [C] 빈 리스트 방어 — 최초 추가 시 episode=1
    const nextEpisode = manuscripts.length > 0
      ? Math.max(...manuscripts.map(m => m.episode)) + 1
      : 1;
    setConfig(prev => ({
      ...prev,
      manuscripts: [
        ...(prev.manuscripts ?? []),
        { episode: nextEpisode, title: `EP.${nextEpisode}`, content: '', charCount: 0, lastUpdate: Date.now() },
      ],
    }));
  }, [config.manuscripts, setConfig]);

  // ============================================================
  // PART 4 — Render (Toolbar + Panels + Scene Modes)
  // ============================================================
  return (
    <>
      <TabHeader
        icon="📚"
        title={L4(language, { ko: '원고', en: 'Manuscript', ja: '原稿', zh: '原稿' })}
        description={L4(language, {
          ko: '에피소드 목록과 전체 구조',
          en: 'Episode list and overall structure',
          ja: 'エピソード一覧と全体構造',
          zh: '剧集列表与整体结构',
        })}
      />
      <div className="max-w-6xl mx-auto px-4 pt-4 flex gap-2">
        <button
          onClick={() => setShowDashboard(!showDashboard)}
          className={toggleBtn(showDashboard, 'purple')}
          title={L4(language, {
            ko: '작가 대시보드 — 누적 글자수·집필 시간·일일 목표 통계',
            en: 'Author dashboard — cumulative word count, writing time, daily goal stats',
            ja: '作家ダッシュボード — 累計文字数・執筆時間・日次目標',
            zh: '作者仪表板 — 累计字数、创作时间、每日目标',
          })}
        >
          📊 {L4(language, { ko: '작가 대시보드', en: 'Author Dashboard', ja: '作家ダッシュボード', zh: '作者仪表板' })}
        </button>
        <button
          onClick={() => { setShowTranslation(!showTranslation); if (!showTranslation) setShowDashboard(false); }}
          className={toggleBtn(showTranslation, 'green')}
          title={L4(language, {
            ko: '번역 — 현재 원고를 Translation Studio 로 가져가 6축 채점 번역',
            en: 'Translate — open this manuscript in Translation Studio (6-axis scored translation)',
            ja: '翻訳 — 現在の原稿を Translation Studio で6軸スコアリング翻訳',
            zh: '翻译 — 在 Translation Studio 中以 6 轴评分翻译当前原稿',
          })}
        >
          <Languages className="w-3 h-3" /> {L4(language, { ko: '번역', en: 'Translate', ja: '翻訳', zh: '翻译' })}
        </button>
        <button
          onClick={() => setShowShare(true)}
          className={simpleBtn('transition-colors')}
          title={L4(language, {
            ko: '네트워크 공유 — 작가 커뮤니티 (행성)에 발췌 게시',
            en: 'Share — publish an excerpt to the writer community (Network)',
            ja: 'ネットワーク共有 — 作家コミュニティ(惑星)に抜粋投稿',
            zh: '网络分享 — 发布选段至作家社区(行星)',
          })}
        >
          <Share2 className="w-3 h-3" /> {L4(language, { ko: '네트워크 공유', en: 'Share', ja: '共有', zh: '分享' })}
        </button>
        {/* [GitHub 동기화 2026-04-25] 미연결 시 설정 진입 안내 / 연결 시 1클릭 푸시 + 마지막 sync 표시 */}
        <button
          onClick={handleGitHubPush}
          className={toggleBtn(ghAutoSync.connected, 'blue')}
          disabled={ghAutoSync.syncing}
          title={
            ghAutoSync.connected
              ? L4(language, {
                  ko: `GitHub 푸시 — 클릭 시 즉시 commit. ${autoSyncOn ? '자동 동기화 ON (30초 debounce).' : '자동 동기화 OFF (설정 → 백업에서 토글).'}${ghAutoSync.lastSyncAt ? ` 마지막: ${formatSyncTime(ghAutoSync.lastSyncAt)}` : ''}`,
                  en: `GitHub push — click to commit now. ${autoSyncOn ? 'Auto-sync ON (30s debounce).' : 'Auto-sync OFF (toggle in Settings → Backup).'}${ghAutoSync.lastSyncAt ? ` Last: ${formatSyncTime(ghAutoSync.lastSyncAt)}` : ''}`,
                  ja: `GitHub プッシュ — クリックで即時 commit。${autoSyncOn ? '自動同期 ON (30秒 debounce)' : '自動同期 OFF'}`,
                  zh: `GitHub 推送 — 点击立即提交。${autoSyncOn ? '自动同步开启 (30秒 debounce)' : '自动同步关闭'}`,
                })
              : L4(language, {
                  ko: 'GitHub 미연결 — 클릭 시 설정 → 백업 섹션 으로 이동. PAT 또는 OAuth 1분 설정.',
                  en: 'GitHub not connected — click to open Settings → Backup. PAT or OAuth (1 min).',
                  ja: 'GitHub未接続 — クリックで設定→バックアップへ',
                  zh: 'GitHub 未连接 — 点击进入设置→备份',
                })
          }
        >
          <Github className="w-3 h-3" />
          {ghAutoSync.connected
            ? `↑ GitHub${ghAutoSync.lastSyncAt ? ` · ${formatSyncTime(ghAutoSync.lastSyncAt)}` : ''}${autoSyncOn ? ' · auto' : ''}`
            : L4(language, { ko: 'GitHub 연결', en: 'Connect GitHub', ja: 'GitHub接続', zh: '连接 GitHub' })}
        </button>
        <button
          onClick={() => handleSceneMode('edit')}
          className={toggleBtn(sceneMode === 'edit', 'blue')}
          title={L4(language, {
            ko: '① 편집 — 텍스트 에디터 모드 (원고 직접 수정)',
            en: '① Edit — text editor mode (direct manuscript editing)',
            ja: '① 編集 — テキストエディタモード(原稿を直接編集)',
            zh: '① 编辑 — 文本编辑器模式(直接修改原稿)',
          })}
        >
          <PenLine className="w-3 h-3" /> {L4(language, { ko: '① 편집', en: '① Edit', ja: '① 編集', zh: '① 编辑' })}
        </button>
        <button
          onClick={() => handleSceneMode('radio')}
          className={toggleBtn(sceneMode === 'radio', 'purple')}
          title={L4(language, {
            ko: '② 라디오 — TTS 음성 재생 모드 (대사 읽기·검수용)',
            en: '② Radio — TTS playback mode (read dialogue aloud for review)',
            ja: '② ラジオ — TTS音声再生モード(セリフ読み上げ・検証用)',
            zh: '② 电台 — TTS 语音播放模式(朗读对话便于审校)',
          })}
        >
          <Headphones className="w-3 h-3" /> {L4(language, { ko: '② 라디오', en: '② Radio', ja: '② ラジオ', zh: '② 电台' })}
        </button>
        <button
          onClick={() => handleSceneMode('visual')}
          className={toggleBtn(sceneMode === 'visual', 'amber')}
          title={L4(language, {
            ko: '③ 비주얼 노벨 — 씬 단위 슬라이드 + 이미지 결합 미리보기 (HTML export 가능)',
            en: '③ Visual Novel — scene-by-scene slides with image overlay (HTML exportable)',
            ja: '③ ビジュアルノベル — シーンごとのスライド+画像合成プレビュー(HTML出力可)',
            zh: '③ 视觉小说 — 按场景的幻灯片+图像叠加预览(可导出 HTML)',
          })}
        >
          <Film className="w-3 h-3" /> {L4(language, { ko: '③ 비주얼 노벨', en: '③ Visual Novel', ja: '③ ビジュアルノベル', zh: '③ 视觉小说' })}
        </button>
        <button
          onClick={handleAddEpisode}
          className={simpleBtn('hover:border-accent-green transition-colors')}
          title={L4(language, { ko: '새 에피소드 추가', en: 'Add new episode', ja: '新しいエピソード', zh: '添加新剧集' })}
        >
          <Plus className="w-3 h-3" /> {L4(language, { ko: '에피소드 추가', en: 'Add Episode', ja: 'エピソード追加', zh: '添加剧集' })}
        </button>
        {parsedScenes.length > 0 && (
          <>
            <button
              onClick={() => setShowSceneProps(!showSceneProps)}
              className={toggleBtn(showSceneProps, 'green')}
            >
              <Settings2 className="w-3 h-3" /> {L4(language, { ko: '속성', en: 'Props', ja: 'プロパティ', zh: '属性' })}
            </button>
            <button
              onClick={handleExportHTML}
              className={simpleBtn('transition-colors')}
            >
              <Download className="w-3 h-3" /> HTML
            </button>
          </>
        )}
      </div>
      {showShare && (
        <ShareToNetwork
          language={language}
          config={config}
          messages={messages}
          onClose={() => setShowShare(false)}
        />
      )}
      {showDashboard && (
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
          <AuthorDashboard messages={messages} language={language} />
          <EmotionArcChart messages={messages} language={language} />
          <FatigueDetector messages={messages} language={language} />
        </div>
      )}
      {showTranslation && (
        <div className="max-w-6xl mx-auto px-4">
          {/* 번역 패널 컨텍스트 안내 — 전용 스튜디오로 유도 */}
          <div className="mb-3 rounded-xl border border-accent-green/25 bg-accent-green/[0.04] px-4 py-3 flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <Languages className="w-4 h-4 text-accent-green shrink-0 mt-0.5" />
              <div className="text-[11px] text-text-secondary leading-relaxed">
                {L4(language, {
                  ko: '이 패널은 빠른 인라인 번역용입니다. 장편·용어집·문체 관리·4축 채점·플랫폼별 내보내기는 전용 번역 스튜디오가 더 강력합니다.',
                  en: 'This panel is for quick inline translation. The dedicated Translation Studio has glossary, style retention, 4-axis scoring, and platform exports.',
                  ja: 'このパネルはクイックインライン翻訳用です。用語集・文体・4軸採点・プラットフォーム出力は翻訳スタジオが高機能。',
                  zh: '此面板用于快速内联翻译。专用翻译工作室支持术语表、文体、4 轴评分和平台导出。',
                })}
              </div>
            </div>
            <a
              href="/translation-studio"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green/15 hover:bg-accent-green/25 text-accent-green border border-accent-green/40 text-[11px] font-bold transition-colors"
            >
              {L4(language, { ko: '번역 스튜디오 열기 →', en: 'Open Translation Studio →', ja: '翻訳スタジオへ →', zh: '打开翻译工作室 →' })}
            </a>
          </div>
          <TranslationPanel language={language} config={config} setConfig={setConfig} />
        </div>
      )}
      {/* 장면 속성 패널 */}
      {showSceneProps && parsedScenes.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="bg-bg-secondary/50 border border-border/30 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-mono font-semibold text-text-primary uppercase tracking-wider mb-2">
              {L4(language, { ko: '장면 속성 편집', en: 'Scene Properties', ja: 'シーン属性', zh: '场景属性' })}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
              {parsedScenes.map((scene, idx) => (
                <div key={scene.id} className={`border rounded-lg p-3 space-y-2 transition-colors ${editingSceneIdx === idx ? 'border-accent-purple/50 bg-accent-purple/5' : 'border-border/20 bg-bg-primary/50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-text-primary">{scene.title}</span>
                    <button onClick={() => setEditingSceneIdx(editingSceneIdx === idx ? null : idx)} className="text-[9px] text-accent-purple">
                      {editingSceneIdx === idx
                        ? L4(language, { ko: '접기', en: 'Close', ja: '閉じる', zh: '关闭' })
                        : L4(language, { ko: '편집', en: 'Edit', ja: '編集', zh: '编辑' })}
                    </button>
                  </div>
                  {editingSceneIdx === idx && (
                    <div className="space-y-1.5">
                      <label className="block">
                        <span className="text-[9px] text-text-tertiary">{L4(language, { ko: '장소', en: 'Location', ja: '場所', zh: '场所' })}</span>
                        <input value={scene.location ?? ''} onChange={e => updateSceneProp(idx, 'location', e.target.value)} className="w-full bg-bg-tertiary border border-border/30 rounded px-2 py-1 text-[10px] text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple" placeholder={L4(language, { ko: '예: 왕궁 정원', en: 'e.g. Royal Garden', ja: '例: 王宮の庭', zh: '例：皇宫花园' })} />
                      </label>
                      <label className="block">
                        <span className="text-[9px] text-text-tertiary">{L4(language, { ko: '시간대', en: 'Time', ja: '時間帯', zh: '时段' })}</span>
                        <select value={scene.timeOfDay ?? ''} onChange={e => updateSceneProp(idx, 'timeOfDay', e.target.value)} className="w-full bg-bg-tertiary border border-border/30 rounded px-2 py-1 text-[10px] text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50">
                          <option value="">-</option>
                          {['새벽', '아침', '낮', '저녁', '밤'].map(tOpt => <option key={tOpt} value={tOpt}>{tOpt}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-[9px] text-text-tertiary">{L4(language, { ko: '분위기', en: 'Mood', ja: '雰囲気', zh: '氛围' })}</span>
                        <select value={scene.mood ?? ''} onChange={e => updateSceneProp(idx, 'mood', e.target.value)} className="w-full bg-bg-tertiary border border-border/30 rounded px-2 py-1 text-[10px] text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50">
                          <option value="">-</option>
                          {['dark', 'bright', 'rainy', 'snowy', 'misty', 'eerie', 'warm', 'cold', 'peaceful'].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-[9px] text-text-tertiary">{L4(language, { ko: '배경 이미지 프롬프트', en: 'Background prompt', ja: '背景プロンプト', zh: '背景提示' })}</span>
                        <input value={scene.backgroundPrompt ?? ''} onChange={e => updateSceneProp(idx, 'backgroundPrompt', e.target.value)} className="w-full bg-bg-tertiary border border-border/30 rounded px-2 py-1 text-[10px] text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple" placeholder={L4(language, { ko: '이미지 생성용 프롬프트', en: 'Prompt for image generation', ja: '画像生成用プロンプト', zh: '图像生成提示' })} />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {sceneMode !== 'off' && !showTranslation && parsedScenes.length === 0 && (
        <div className="max-w-2xl mx-auto text-center py-16 px-4">
          <p className="text-text-tertiary text-sm mb-4">
            {L4(language, { ko: '원고를 먼저 작성해주세요.', en: 'Please write a manuscript first.', ja: '原稿を先にお書きください。', zh: '请先撰写稿件。' })}
          </p>
          <p className="text-text-tertiary text-xs">
            {L4(language, {
              ko: '집필 탭에서 에피소드를 생성하면 편집 · 라디오 · 비주얼 노벨 기능을 사용할 수 있습니다.',
              en: 'Create an episode in the Writing tab to use edit, radio, and visual novel features.',
              ja: '執筆タブでエピソードを作成すると、編集・ラジオ・ビジュアルノベル機能が使えます。',
              zh: '在写作标签中创建剧集后即可使用编辑、电台和视觉小说功能。',
            })}
          </p>
          <button onClick={() => setSceneMode('off')} className="mt-6 px-4 py-2 rounded-lg bg-bg-secondary border border-border text-text-tertiary text-xs hover:text-text-primary transition-colors min-h-[44px]">
            {L4(language, { ko: '← 돌아가기', en: '← Back', ja: '← 戻る', zh: '← 返回' })}
          </button>
        </div>
      )}
      {sceneMode === 'radio' && parsedScenes.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black">
          <ScenePlayer
            scenes={parsedScenes}
            voiceMappings={voiceMappings}
            language={language}
            mode="radio"
            onClose={() => setSceneMode('off')}
            autoPlay
          />
        </div>
      )}
      {sceneMode === 'visual' && parsedScenes.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Visual 탭 이동 버튼 — ScenePlayer 상단 오버레이 */}
          {onOpenVisual && (
            <button
              type="button"
              onClick={() => { setSceneMode('off'); onOpenVisual(); }}
              className="absolute top-4 right-16 z-[60] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-amber/20 hover:bg-accent-amber/30 text-accent-amber border border-accent-amber/40 text-[11px] font-bold backdrop-blur-md transition-colors"
              title={L4(language, { ko: '이미지 카드 편집 (Visual 탭)', en: 'Edit image cards (Visual tab)', ja: '画像カード編集', zh: '编辑图像卡片' })}
            >
              🎨 {L4(language, { ko: '이미지 편집', en: 'Edit Images', ja: '画像編集', zh: '编辑图像' })}
            </button>
          )}
          <ScenePlayer
            scenes={parsedScenes}
            voiceMappings={voiceMappings}
            language={language}
            mode="visual"
            onClose={() => setSceneMode('off')}
            showMetrics
          />
        </div>
      )}
      {sceneMode === 'edit' && parsedScenes.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 py-4" style={{ height: 'calc(100vh - 200px)' }}>
          <SceneTimeline
            scenes={parsedScenes}
            language={language}
            onScenesChange={setParsedScenes}
            onPlayFrom={(_si, _bi) => { setSceneMode('visual'); }}
            onExportText={(text) => {
              setConfig((prev) => {
                const manuscripts = [...(prev.manuscripts ?? [])];
                if (manuscripts.length > 0) {
                  manuscripts[manuscripts.length - 1] = { ...manuscripts[manuscripts.length - 1], content: text, charCount: text.length, lastUpdate: Date.now() };
                }
                return { ...prev, manuscripts };
              });
              setSceneMode('off');
            }}
          />
        </div>
      )}
      {sceneMode === 'off' && !showTranslation && (
        <ManuscriptView
          language={language}
          config={config}
          setConfig={setConfig}
          messages={messages}
          onEditInStudio={onEditInStudio}
        />
      )}
    </>
  );
};

export default ManuscriptTab;
