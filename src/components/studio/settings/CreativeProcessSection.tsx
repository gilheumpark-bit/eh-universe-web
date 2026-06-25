"use client";

// ============================================================
// CreativeProcessSection — Settings Advanced 탭 신규 섹션
// ============================================================
//
// 위치: SettingsView Advanced 탭 (BackupsSection, AdvancedSection 와 같은 위계).
// 역할: 작가가 명시적으로 "작업 정리 노트" (창작 과정 확인서) 발급.
//
// 사상 정합:
//   - 5차 §2 "장부는 뒤에서 자동 — 발급은 사용자 명시 액션"
//   - 13차 §5.2 외부 명칭 "확인서" + 메뉴 명칭 "작업 정리 노트" 분리
//   - 14차 §3 엄밀성 시장 — 디스클레이머 첫 줄 강제
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollText, Loader2, CheckCircle2, AlertCircle, FileText, Download, ChevronDown, ShieldCheck } from 'lucide-react';
import { logger } from '@/lib/logger';
import { L4 } from '@/lib/i18n';
import { useCreativeProcessTrackingPreference } from '@/hooks/useCreativeProcessTrackingPreference';
import type { AppLanguage } from '@/lib/studio-types';
import {
  buildCertificate,
  renderCertificateHtml,
  renderCertificateMarkdown,
  buildCertificateFilename,
  saveProcessCertificate,
  countCreativeEvents,
  countSources,
  listCreativeEvents,
  CREATIVE_EVENT_CAPTURED,
  type CertificateLanguage,
  type CertificateView,
} from '@/lib/creative-process';

// ============================================================
// PART 1 — Props + 상태 타입
// ============================================================

interface CreativeProcessSectionProps {
  language: AppLanguage;
}

type IssueStatus = 'idle' | 'working' | 'success' | 'error';
type OutputFormat = 'html' | 'md';

interface SectionStats {
  totalEvents: number;
  totalSources: number;
  aiAssistUsed: boolean;
  humanRevisionCount: number;
}

// ============================================================
// PART 2 — i18n 헬퍼
// ============================================================
//
// AppLanguage = 'KO' | 'EN' | 'JP' | 'CN' (대문자)
// CertificateLanguage = 'ko' | 'en' | 'ja' | 'zh' (소문자, ja/zh 다름)

function toCertLang(lang: AppLanguage): CertificateLanguage {
  switch (lang) {
    case 'KO': return 'ko';
    case 'EN': return 'en';
    case 'JP': return 'ja';
    case 'CN': return 'zh';
    default: return 'ko';
  }
}

// ============================================================
// PART 3 — Download helper (AuditExportButton.tsx 패턴 차용)
// ============================================================

function triggerDownload(filename: string, content: string, mimeType: string): void {
  if (typeof document === 'undefined') return;
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    logger.warn('CreativeProcessSection', 'triggerDownload failed', err);
    throw err;
  }
}

// ============================================================
// PART 4 — Stats throttle 헬퍼
// ============================================================

const STATS_REFRESH_THROTTLE_MS = 5000;

// ============================================================
// PART 5 — 메인 컴포넌트
// ============================================================

const CreativeProcessSection: React.FC<CreativeProcessSectionProps> = ({ language }) => {
  const certLang: CertificateLanguage = toCertLang(language);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [stats, setStats] = useState<SectionStats | null>(null);
  const [view, setView] = useState<CertificateView>('private');
  const [format, setFormat] = useState<OutputFormat>('html');
  const [status, setStatus] = useState<IssueStatus>('idle');
  const [lastFilename, setLastFilename] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useCreativeProcessTrackingPreference();

  const lastRefreshRef = useRef<number>(0);

  // ============================================================
  // PART 5.1 — projectId 동적 획득 + 전환 감지 (P0-2)
  // ============================================================
  //
  // StudioShell 이 currentProjectId 를 localStorage 에 mirror.
  // mount 시 read + storage event listener 로 프로젝트 전환 자동 감지.

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // [C] mount 시 1회 read
    const readProjectId = () => {
      try {
        const stored = window.localStorage?.getItem('noa_studio_currentProjectId');
        setProjectId(stored && stored.length > 0 ? stored : null);
      } catch { /* noop */ }
    };
    readProjectId();

    // [C] 프로젝트 전환 감지 — storage event (다른 탭) + custom event (같은 탭)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'noa_studio_currentProjectId') readProjectId();
    };
    const handleProjectSwitch = () => readProjectId();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('noa:project-switched', handleProjectSwitch);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('noa:project-switched', handleProjectSwitch);
    };
  }, []);

  // ============================================================
  // PART 5.2 — 누적 통계 read + throttle
  // ============================================================

  const refreshStats = useCallback(async () => {
    if (!projectId) {
      setStats(null);
      return;
    }
    try {
      const [totalEvents, totalSources, events] = await Promise.all([
        countCreativeEvents(projectId),
        countSources(projectId),
        listCreativeEvents({ projectId, limit: 200 }),
      ]);
      const aiAssistUsed = events.some((e) => e.actorType === 'ai');
      const humanRevisionCount = events.filter((e) => e.eventType === 'edit' && e.actorType === 'human').length;
      setStats({ totalEvents, totalSources, aiAssistUsed, humanRevisionCount });
    } catch (err) {
      logger.warn('CreativeProcessSection', 'refreshStats failed', err);
      setStats(null);
    }
  }, [projectId]);

  useEffect(() => {
    // [legitimate fetch-on-mount] refreshStats 가 IDB read → setState. 외부 데이터 sync 패턴.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      const now = Date.now();
      if (now - lastRefreshRef.current < STATS_REFRESH_THROTTLE_MS) return;
      lastRefreshRef.current = now;
      refreshStats();
    };
    window.addEventListener(CREATIVE_EVENT_CAPTURED, handler);
    return () => window.removeEventListener(CREATIVE_EVENT_CAPTURED, handler);
  }, [refreshStats]);

  // ============================================================
  // PART 5.3 — 발급 액션
  // ============================================================

  const handleIssue = useCallback(async () => {
    if (!projectId) return;
    setStatus('working');
    setErrorMessage(null);
    try {
      // [P0-4] localStorage `noa_projects_v2` 에서 실 프로젝트 데이터 read.
      // 격리: studio-types.ts (절대 금지 §1) 의 Project 타입 import 회피 위해 minimal cast.
      let projectName = L4(language, { ko: '내 작품', en: 'My Work', ja: '自作品', zh: '我的作品' });
      let episodes: Array<{ episode: number; content: string }> = [];
      let worldSummary: { genre?: string; era?: string; ruleCount?: number } | undefined;
      let characters: Array<{ id: string; name: string }> | undefined;

      try {
        if (typeof window !== 'undefined') {
          const raw = window.localStorage?.getItem('noa_projects_v2');
          if (raw) {
            const projects = JSON.parse(raw) as Array<{
              id: string;
              name?: string;
              sessions?: Array<{
                config?: {
                  manuscripts?: Array<{ episode: number; content: string }>;
                  world?: { genre?: string; era?: string; rules?: unknown[] };
                  worldSimData?: { genre?: string };
                  characters?: Array<{ id: string; name: string }>;
                };
              }>;
            }>;
            const proj = projects.find((p) => p.id === projectId);
            if (proj) {
              projectName = proj.name || projectName;
              // 모든 session 의 manuscripts 합치기
              const allMs: Array<{ episode: number; content: string }> = [];
              const charsSet: Map<string, { id: string; name: string }> = new Map();
              let worldGenre: string | undefined;
              let ruleCount = 0;
              for (const sess of proj.sessions ?? []) {
                for (const m of sess.config?.manuscripts ?? []) {
                  if (typeof m.content === 'string') {
                    allMs.push({ episode: m.episode, content: m.content });
                  }
                }
                for (const c of sess.config?.characters ?? []) {
                  if (c?.id) charsSet.set(c.id, { id: c.id, name: c.name || c.id });
                }
                if (!worldGenre) {
                  worldGenre = sess.config?.world?.genre || sess.config?.worldSimData?.genre;
                }
                if (Array.isArray(sess.config?.world?.rules)) {
                  ruleCount += sess.config!.world!.rules!.length;
                }
              }
              episodes = allMs;
              characters = Array.from(charsSet.values());
              if (worldGenre || ruleCount > 0) {
                worldSummary = { genre: worldGenre, ruleCount };
              }
            }
          }
        }
      } catch (readErr) {
        logger.warn('CreativeProcessSection', 'project read failed (using placeholders)', readErr);
      }

      const result = await buildCertificate({
        projectId,
        view,
        language: certLang,
        projectMeta: { name: projectName },
        episodes,
        worldSummary,
        characters,
        generatedBy: 'loreguard@certificate-service',
      });

      const content = format === 'html'
        ? renderCertificateHtml(result.cert, result.sections, view, certLang)
        : renderCertificateMarkdown(result.cert, result.sections, view, certLang);
      const mimeType = format === 'html' ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8';
      const filename = buildCertificateFilename(result.cert, format);

      triggerDownload(filename, content, mimeType);
      try {
        await saveProcessCertificate(result.cert);
      } catch (saveErr) {
        logger.warn('CreativeProcessSection', 'certificate save failed', saveErr);
        window.dispatchEvent(new CustomEvent('noa:alert', {
          detail: {
            message: L4(language, {
              ko: '발급본 저장 실패 — 다운로드 파일은 유지되지만 출고 화면 연결은 나중에 다시 시도해 주세요.',
              en: 'Failed to save the issued record — downloads are available, but export linking may need another try.',
              ja: '発行記録の保存に失敗しました。ダウンロードファイルは維持されますが、出稿画面との連携は後で再試行してください。',
              zh: '发行记录保存失败。下载文件仍可使用，但与出库画面的连接请稍后重试。',
            }),
            variant: 'warning',
          },
        }));
      }
      setLastFilename(filename);
      setStatus('success');

      // [Phase 1.2-2 — 2026-05-07] 발급 후 toast 4언어 안내 (법적 무게 명시)
      if (typeof window !== 'undefined') {
        const noticeMap: Record<string, string> = {
          KO: '확인서가 다운로드되었습니다. 법적 효력은 없으며, 출판사·플랫폼 제출 시 참조 자료로 사용 가능합니다.',
          EN: 'Authorship Journal downloaded. Not a legal certification — usable as a reference document for publishers/platforms.',
          JP: '確認書をダウンロードしました。法的効力はなく、出版社・プラットフォーム提出時の参考資料として使用可能です。',
          CN: '确认书已下载。不具有法律效力,可用作向出版社·平台提交时的参考资料。',
        };
        const msg = noticeMap[language] || noticeMap.KO;
        window.dispatchEvent(new CustomEvent('noa:alert', {
          detail: { message: msg, variant: 'info', duration: 6000 },
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn('CreativeProcessSection', 'issue failed', err);
      setErrorMessage(message.slice(0, 120));
      setStatus('error');
    }
  }, [projectId, view, format, certLang, language]);

  // ============================================================
  // PART 5.4 — UI 라벨 (4언어)
  // ============================================================

  const labels = useMemo(
    () => ({
      menuTitle: L4(language, { ko: '작업 정리 노트', en: 'Work Notes', ja: '作業ノート', zh: '作业笔记' }),
      subtitle: L4(language, {
        ko: '창작 과정 확인서 발급',
        en: 'Issue Authorship Journal',
        ja: '制作過程確認書を発行',
        zh: '创作过程确认书发行',
      }),
      description: L4(language, {
        ko: 'Loreguard에서 작업한 과정을 정리한 자료를 발급합니다. 법적 효력 X.',
        en: 'Generates a journal of activities performed in Loreguard. Not a legal certification.',
        ja: 'Loreguardでの作業過程をまとめた資料を発行します。法的効力なし。',
        zh: '生成在 Loreguard 上的工作过程记录。不具有法律效力。',
      }),
      tracking: {
        title: L4(language, {
          ko: '발급용 과정기록',
          en: 'Journal recording',
          ja: '発行用の過程記録',
          zh: '发行用过程记录',
        }),
        desc: L4(language, {
          ko: '켜면 이후 집필·설정 변경과 외부 편입 후보가 기록됩니다. 끄면 일반 작업 도구처럼 기록을 남기지 않습니다.',
          en: 'When on, later writing, setting changes, and external-import candidates are recorded. When off, no automatic work record is kept.',
          ja: 'オンにすると以後の執筆・設定変更・外部取り込み候補を記録します。オフでは通常の作業ツールとして動作します。',
          zh: '开启后记录之后的写作、设定变更和外部导入候选。关闭时不会自动留下工作记录。',
        }),
        on: L4(language, { ko: '기록 중', en: 'Recording', ja: '記録中', zh: '记录中' }),
        off: L4(language, { ko: '꺼짐', en: 'Off', ja: 'オフ', zh: '关闭' }),
      },
      noProject: L4(language, {
        ko: '프로젝트를 먼저 선택하세요.',
        en: 'Select a project first.',
        ja: 'プロジェクトを先に選択してください。',
        zh: '请先选择项目。',
      }),
      stats: {
        totalEvents: L4(language, { ko: '총 이벤트', en: 'Events', ja: 'イベント', zh: '事件' }),
        totalSources: L4(language, { ko: '외부 편입', en: 'Imports', ja: '取り込み', zh: '导入' }),
        // [톤 정책 — 2026-05-07] "AI" 단어 회피, 작가 친숙어 (AGENTS.md §6 + 5차 §4)
        aiAssistUsed: L4(language, { ko: '같이 쓰기', en: 'Co-Write', ja: '共同執筆', zh: '共同写作' }),
        humanRevisionCount: L4(language, { ko: '작가 수정', en: 'Edits', ja: '修正', zh: '修改' }),
      },
      view: {
        label: L4(language, { ko: '공개 범위', en: 'Visibility', ja: '公開範囲', zh: '公开范围' }),
        public: L4(language, { ko: '공개', en: 'Public', ja: '公開', zh: '公开' }),
        publisher: L4(language, { ko: '출판사', en: 'Publisher', ja: '出版社', zh: '出版社' }),
        private: L4(language, { ko: '비공개 (작가)', en: 'Private (Author)', ja: '非公開（作家）', zh: '私人（作家）' }),
        // [Phase 1.2-1 — 2026-05-07] "분쟁 대응" → "분쟁 보조 자료" (법적 무게 ↓)
        legal: L4(language, { ko: '분쟁 보조 자료', en: 'Dispute Reference', ja: '紛争参考資料', zh: '纠纷参考资料' }),
      },
      format: L4(language, { ko: '형식', en: 'Format', ja: '形式', zh: '格式' }),
      issue: {
        idle: L4(language, { ko: '발급', en: 'Issue', ja: '発行', zh: '发行' }),
        working: L4(language, { ko: '생성 중...', en: 'Generating...', ja: '生成中...', zh: '生成中...' }),
        success: L4(language, { ko: '발급 완료', en: 'Issued', ja: '発行完了', zh: '发行完成' }),
        error: L4(language, { ko: '발급 실패', en: 'Failed', ja: '発行失敗', zh: '发行失败' }),
      },
      yes: L4(language, { ko: '예', en: 'Yes', ja: 'はい', zh: '是' }),
      no: L4(language, { ko: '아니오', en: 'No', ja: 'いいえ', zh: '否' }),
    }),
    [language],
  );

  // ============================================================
  // PART 5.5 — 렌더
  // ============================================================

  return (
    <details className="ds-accordion rounded-2xl bg-bg-secondary/20 border border-border">
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-secondary/40 transition-colors">
        <ScrollText className="w-4 h-4 text-accent-amber shrink-0" />
        <span className="font-medium text-text-primary">{labels.menuTitle}</span>
        <ChevronDown className="w-4 h-4 ml-auto text-text-tertiary" />
      </summary>

      <div className="p-4 md:p-6 space-y-4">
        {/* 부제 + 설명 */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-1">{labels.subtitle}</h3>
          <p className="text-xs text-text-tertiary">{labels.description}</p>
        </div>

        {/* projectId 미설정 가드 */}
        {!projectId ? (
          <div className="p-3 bg-bg-secondary/40 rounded-lg text-sm text-text-tertiary">
            {labels.noProject}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-bg-secondary/30 border border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-bg-secondary rounded-xl shrink-0">
                  <ShieldCheck className="w-4 h-4 text-accent-amber" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-text-primary">{labels.tracking.title}</div>
                  <div className="text-[12px] text-text-tertiary">{labels.tracking.desc}</div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={trackingEnabled}
                onClick={() => setTrackingEnabled(!trackingEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 shrink-0 ${trackingEnabled ? 'bg-accent-green' : 'bg-bg-tertiary'}`}
                aria-label={labels.tracking.title}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${trackingEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
              <span className={`text-[10px] font-black uppercase tracking-widest ${trackingEnabled ? 'text-accent-green' : 'text-text-tertiary'}`}>
                {trackingEnabled ? labels.tracking.on : labels.tracking.off}
              </span>
            </div>

            {/* 누적 통계 4 박스 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-bg-secondary/30 rounded-lg">
                <div className="text-[10px] uppercase text-text-tertiary tracking-widest">{labels.stats.totalEvents}</div>
                <div className="text-lg font-bold text-text-primary mt-1">{stats?.totalEvents ?? '—'}</div>
              </div>
              <div className="p-3 bg-bg-secondary/30 rounded-lg">
                <div className="text-[10px] uppercase text-text-tertiary tracking-widest">{labels.stats.totalSources}</div>
                <div className="text-lg font-bold text-text-primary mt-1">{stats?.totalSources ?? '—'}</div>
              </div>
              <div className="p-3 bg-bg-secondary/30 rounded-lg">
                <div className="text-[10px] uppercase text-text-tertiary tracking-widest">{labels.stats.aiAssistUsed}</div>
                <div className="text-lg font-bold text-text-primary mt-1">
                  {stats === null ? '—' : (stats.aiAssistUsed ? labels.yes : labels.no)}
                </div>
              </div>
              <div className="p-3 bg-bg-secondary/30 rounded-lg">
                <div className="text-[10px] uppercase text-text-tertiary tracking-widest">{labels.stats.humanRevisionCount}</div>
                <div className="text-lg font-bold text-text-primary mt-1">{stats?.humanRevisionCount ?? '—'}</div>
              </div>
            </div>

            {/* View 선택 */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <label className="text-xs text-text-tertiary whitespace-nowrap">{labels.view.label}</label>
              <select
                value={view}
                onChange={(e) => setView(e.target.value as CertificateView)}
                className="text-sm px-3 py-1.5 rounded-lg bg-bg-secondary/40 border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              >
                <option value="private">{labels.view.private}</option>
                <option value="publisher">{labels.view.publisher}</option>
                <option value="public">{labels.view.public}</option>
                {/* [Round 2-3 — 2026-05-07] legal view 활성화 (분쟁 대응 자료) */}
                <option value="legal">{labels.view.legal}</option>
              </select>
            </div>

            {/* Format 선택 */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-text-tertiary whitespace-nowrap">{labels.format}:</span>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="cert-format"
                  value="html"
                  checked={format === 'html'}
                  onChange={() => setFormat('html')}
                  className="cursor-pointer"
                />
                HTML
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="cert-format"
                  value="md"
                  checked={format === 'md'}
                  onChange={() => setFormat('md')}
                  className="cursor-pointer"
                />
                Markdown
              </label>
            </div>

            {/* 발급 버튼 + 상태 */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleIssue}
                disabled={status === 'working'}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent-blue text-white font-medium hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-blue"
              >
                {status === 'idle' && <FileText className="w-4 h-4" />}
                {status === 'working' && <Loader2 className="w-4 h-4 animate-spin" />}
                {status === 'success' && <CheckCircle2 className="w-4 h-4" />}
                {status === 'error' && <AlertCircle className="w-4 h-4" />}
                <span>
                  {status === 'idle' && labels.issue.idle}
                  {status === 'working' && labels.issue.working}
                  {status === 'success' && labels.issue.success}
                  {status === 'error' && labels.issue.error}
                </span>
              </button>

              {/* 상태 메시지 */}
              {status === 'success' && lastFilename && (
                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                  <Download className="w-3 h-3" />
                  <span className="truncate">{lastFilename}</span>
                </div>
              )}
              {status === 'error' && errorMessage && (
                <div className="text-xs text-accent-red break-words">{errorMessage}</div>
              )}
            </div>
          </>
        )}
      </div>
    </details>
  );
};

export default CreativeProcessSection;
