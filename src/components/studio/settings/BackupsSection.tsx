"use client";

// ============================================================
// PART 1 — Imports, Types, and Section Shell
// ============================================================

import { showAlert } from '@/lib/show-alert';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { logger } from '@/lib/logger';
import {
  Shield, ChevronDown,
  GitBranch, Check, Unplug,
  Download, Archive, Upload,
} from 'lucide-react';
import { useGitHubSync } from '@/hooks/useGitHubSync';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  exportFullBundle,
  downloadBundle,
  exportFullBundleAsZip,
  downloadZipBundle,
  suggestZipFilename,
  importFullBundle,
  rollbackFromPreRestoreBackup,
} from '@/lib/full-backup';

export interface VersionedBackup {
  timestamp: number;
  label: string;
}

interface BackupsSectionProps {
  language: AppLanguage;
  versionedBackups?: VersionedBackup[];
  onRestoreBackup?: (timestamp: number) => Promise<boolean>;
  onRefreshBackups?: () => void;
}

const BackupsSection: React.FC<BackupsSectionProps> = ({
  language,
  versionedBackups,
  onRestoreBackup,
  onRefreshBackups,
}) => {
  return (
    <details className="ds-accordion rounded-2xl bg-bg-secondary/20 border border-border overflow-hidden group">
      <summary className="cursor-pointer select-none list-none flex items-center gap-3 px-5 py-4 hover:bg-bg-secondary/40 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue">
        <GitBranch className="w-4 h-4 text-green-500 shrink-0" />
        <span className="text-sm font-black text-text-primary flex-1">
          {L4(language, { ko: 'GitHub / 백업', en: 'GitHub / Backup', ja: 'GitHub / バックアップ', zh: 'GitHub / 备份' })}
        </span>
        <ChevronDown className="w-4 h-4 text-text-tertiary transition-transform group-open:rotate-180" />
      </summary>
      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {versionedBackups && onRestoreBackup && (
          <VersionedBackupList
            language={language}
            versionedBackups={versionedBackups}
            onRestoreBackup={onRestoreBackup}
            onRefreshBackups={onRefreshBackups}
          />
        )}
        <FullBundleSection language={language} />
        {isFeatureEnabled('GOOGLE_DRIVE_BACKUP') && <GoogleDriveSection language={language} />}
        <GitHubSyncSection language={language} />
      </div>
    </details>
  );
};

export default BackupsSection;

// ============================================================
// PART 2 — Versioned Backup List (auto-snapshots)
// ============================================================

function VersionedBackupList({
  language,
  versionedBackups,
  onRestoreBackup,
  onRefreshBackups,
}: {
  language: AppLanguage;
  versionedBackups: VersionedBackup[];
  onRestoreBackup: (timestamp: number) => Promise<boolean>;
  onRefreshBackups?: () => void;
}) {
  return (
    <div className="md:col-span-2 ds-card-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-500" /> {L4(language, { ko: '자동 백업 (10분 간격)', en: 'Auto Backup (every 10 min)', ja: 'Auto Backup (every 10 min)', zh: 'Auto Backup (every 10 min)' })}
        </h3>
        {onRefreshBackups && (
          <button onClick={onRefreshBackups} className="text-[10px] text-text-tertiary hover:text-text-primary font-mono uppercase tracking-wider transition-colors" title={L4(language, { ko: '목록 새로고침', en: 'Refresh list', ja: '一覧 更新', zh: '列表 刷新' })}>
            {L4(language, { ko: '새로고침', en: 'Refresh', ja: '更新', zh: '刷新' })}
          </button>
        )}
      </div>
      {versionedBackups.length === 0 ? (
        <div className="text-sm text-text-tertiary py-4 text-center">
          {L4(language, { ko: '저장된 백업이 없습니다. 10분 후 자동 백업됩니다.', en: 'No backups yet. Auto-backup runs every 10 minutes.', ja: '保存されたバックアップがありません。10分後に自動バックアップが実行されます。', zh: '暂无已保存的备份。10 分钟后将自动备份。' })}
        </div>
      ) : (
        <div className="space-y-2">
          {versionedBackups.map((b) => (
            <div key={b.timestamp} className="flex items-center justify-between p-4 bg-bg-secondary rounded-xl border border-border">
              <div>
                <div className="text-xs font-bold text-text-primary">{new Date(b.timestamp).toLocaleString()}</div>
                <div className="text-[10px] text-text-tertiary font-mono">
                  {L4(language, { ko: '자동 백업', en: 'Auto backup', ja: 'Auto backup', zh: 'Auto backup' })}
                </div>
              </div>
              <button
                onClick={async () => {
                  const ok = await onRestoreBackup(b.timestamp);
                  if (ok) {
                    showAlert(L4(language, { ko: '백업에서 복원되었습니다.', en: 'Restored from backup.', ja: 'Restored from backup.', zh: 'Restored from backup.' }));
                  } else {
                    showAlert(L4(language, { ko: '복원에 실패했습니다.', en: 'Restore failed.', ja: 'Restore failed.', zh: 'Restore failed.' }));
                  }
                }}
                className="text-[10px] font-bold font-mono uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 border border-blue-500/30 rounded-lg hover:bg-blue-500/10"
                title={L4(language, { ko: '이 백업으로 복원', en: 'Restore from this backup', ja: 'Restore from this backup', zh: 'Restore from this backup' })}
              >
                {L4(language, { ko: '복원', en: 'Restore', ja: 'Restore', zh: 'Restore' })}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PART 3 — GitHub Sync Section (OAuth + PAT onboarding)
// ============================================================

function GitHubSyncSection({ language }: { language: AppLanguage }) {
  const ghEnabled = typeof window !== 'undefined' && isFeatureEnabled('GITHUB_SYNC');
  const gh = useGitHubSync();
  const [tokenInput, setTokenInput] = useState('');
  const [connecting, setConnecting] = useState(false);

  // GitHub OAuth popup handler — with CSRF state parameter
  const handleOAuthLogin = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) return;

    // Generate random state for CSRF protection and store in cookie
    const state = crypto.randomUUID();
    document.cookie = `gh_oauth_state=${state}; path=/; max-age=600; SameSite=Lax; Secure`;

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo&state=${state}`;
    const w = 600, h = 700;
    const left = (screen.width - w) / 2, top = (screen.height - h) / 2;
    window.open(authUrl, 'github-oauth', `width=${w},height=${h},left=${left},top=${top}`);
  }, []);

  // Listen for OAuth token from callback redirect hash
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.includes('github_token=')) {
        const token = hash.split('github_token=')[1]?.split('&')[0];
        if (token) {
          gh.connect(token);
          window.location.hash = '';
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [gh]);

  const hasOAuthClientId = typeof process !== 'undefined' && !!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

  if (!ghEnabled) {
    return (
      <div className="md:col-span-2 ds-card-lg opacity-60">
        <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-4 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-text-tertiary" />
          {L4(language, { ko: '클라우드 백업 (GitHub)', en: 'Cloud Backup (GitHub)', ja: 'Cloud Backup (GitHub)', zh: 'Cloud Backup (GitHub)' })}
          <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-bg-tertiary text-text-tertiary font-bold uppercase tracking-wider">
            {L4(language, { ko: '준비 중', en: 'Coming Soon', ja: 'Coming Soon', zh: 'Coming Soon' })}
          </span>
        </h3>
        <p className="text-xs text-text-tertiary">
          {L4(language, { ko: '원고를 GitHub에 백업하고 버전 관리할 수 있습니다. 곧 활성화됩니다.', en: 'Back up manuscripts to GitHub with version control. Coming soon.', ja: '原稿をGitHubにバックアップし、バージョン管理できます。まもなく有効化されます。', zh: '将稿件备份到 GitHub 并进行版本管理。即将启用。' })}
        </p>
      </div>
    );
  }

  const handleConnect = async () => {
    if (!tokenInput.trim()) return;
    setConnecting(true);
    try {
      await gh.connect(tokenInput.trim());
    } finally {
      setConnecting(false);
    }
  };

  const handleSelectRepo = (value: string) => {
    const repo = gh.repos.find(r => `${r.owner}/${r.name}` === value);
    if (repo) gh.selectRepo(repo.owner, repo.name);
  };

  return (
    <div className="md:col-span-2 ds-card-lg">
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-6 flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-green-500" />
        {L4(language, { ko: '원고 백업 (GitHub)', en: 'Manuscript Backup (GitHub)', ja: '原稿バックアップ (GitHub)', zh: '稿件备份 (GitHub)' })}
      </h3>

      {gh.connected ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-xl border border-border">
            <div className="flex items-center gap-3 min-w-0">
              <GitBranch className="w-4 h-4 text-green-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-text-primary truncate">
                  {gh.config?.owner}/{gh.config?.repo}
                </div>
                <div className="text-[10px] text-text-tertiary">
                  {gh.config?.branch ?? 'main'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] font-bold text-green-500 flex items-center gap-1">
                <Check className="w-3 h-3" />
                {L4(language, { ko: '연결됨', en: 'Connected', ja: 'Connected', zh: 'Connected' })}
              </span>
              <button
                onClick={gh.disconnect}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title={L4(language, { ko: '연결 해제', en: 'Disconnect', ja: 'Disconnect', zh: 'Disconnect' })}
                aria-label="Disconnect GitHub"
              >
                <Unplug className="w-4 h-4" />
              </button>
            </div>
          </div>
          {gh.lastSyncAt && (
            <div className="text-[10px] text-text-tertiary px-2">
              {L4(language, { ko: '마지막 동기화', en: 'Last sync', ja: 'Last sync', zh: 'Last sync' })}: {new Date(gh.lastSyncAt).toLocaleString()}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {hasOAuthClientId && (
            <button
              onClick={handleOAuthLogin}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#24292f] hover:bg-[#2f363d] text-white text-xs font-bold rounded-xl transition-colors"
            >
              <GitBranch className="w-4 h-4" />
              {L4(language, { ko: 'GitHub으로 로그인', en: 'Sign in with GitHub', ja: 'GitHubでログイン', zh: '使用 GitHub 登录' })}
            </button>
          )}
          {hasOAuthClientId && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-text-tertiary font-mono uppercase">{L4(language, { ko: '또는 PAT 입력', en: 'or enter PAT', ja: 'またはPATを入力', zh: '或输入 PAT' })}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
          <p className="text-xs text-text-tertiary">
            {L4(language, { ko: 'GitHub 접근 토큰(PAT)을 입력하면 원고를 비공개 저장소에 안전하게 백업할 수 있습니다.', en: 'Enter a GitHub Personal Access Token (PAT) to safely back up manuscripts to a private repository.', ja: 'GitHubアクセストークン(PAT)を入力すると、原稿を非公開リポジトリに安全にバックアップできます。', zh: '输入 GitHub 访问令牌(PAT)后，可将稿件安全备份至私有仓库。' })}
          </p>

          <GitHubPatGuide language={language} />

          <div className="flex gap-2">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={L4(language, { ko: 'ghp_xxxx... (2단계에서 복사한 토큰 붙여넣기)', en: 'ghp_xxxx... (paste the token from step 2)', ja: 'ghp_xxxx... (手順2でコピーしたトークンを貼り付け)', zh: 'ghp_xxxx... (粘贴步骤2中复制的令牌)' })}
              className="flex-1 bg-bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-text-primary placeholder-text-quaternary focus:border-green-500 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 font-mono"
              onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
              aria-label={L4(language, { ko: 'GitHub 개인 접근 토큰 입력', en: 'GitHub Personal Access Token input', ja: 'GitHub個人アクセストークン入力', zh: '输入 GitHub 个人访问令牌' })}
            />
            <button
              onClick={handleConnect}
              disabled={connecting || !tokenInput.trim()}
              className="px-4 py-2.5 bg-green-600/80 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {connecting
                ? L4(language, { ko: '연결 중...', en: 'Connecting...', ja: 'Connecting...', zh: 'Connecting...' })
                : L4(language, { ko: '연결', en: 'Connect', ja: 'Connect', zh: 'Connect' })}
            </button>
          </div>

          {gh.repos.length > 0 && !gh.connected && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                {L4(language, { ko: '저장소 선택', en: 'Select Repository', ja: 'リポジトリを選択', zh: '选择仓库' })}
              </label>
              <select
                onChange={(e) => handleSelectRepo(e.target.value)}
                defaultValue=""
                className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-text-primary focus:border-green-500 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 cursor-pointer"
              >
                <option value="" disabled>
                  {L4(language, { ko: '저장소를 선택하세요...', en: 'Choose a repository...', ja: 'リポジトリを選択してください...', zh: '请选择仓库...' })}
                </option>
                {gh.repos.map((r) => (
                  <option key={`${r.owner}/${r.name}`} value={`${r.owner}/${r.name}`}>
                    {r.owner}/{r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {gh.error && (
            <p className="text-xs text-red-400 px-2">{gh.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PART 4 — PAT Onboarding Guide (3-step)
// ============================================================

function GitHubPatGuide({ language }: { language: AppLanguage }) {
  return (
    <details className="bg-bg-secondary/60 border border-border rounded-xl overflow-hidden" open>
      <summary className="px-4 py-3 text-xs font-bold text-text-primary cursor-pointer select-none hover:bg-bg-tertiary/40 transition-colors flex items-center gap-2">
        <span>💡</span>
        <span>{L4(language, { ko: '처음이신가요? 1분이면 끝나요', en: 'New here? Takes 1 minute', ja: '初めての方へ — 1分で完了', zh: '第一次使用?一分钟搞定' })}</span>
      </summary>
      <div className="px-4 pb-4 pt-2 space-y-3 border-t border-border/50">
        <div className="flex gap-3 items-start">
          <span className="shrink-0 w-6 h-6 rounded-full bg-green-600/15 text-green-500 font-bold text-[11px] flex items-center justify-center">1</span>
          <div className="space-y-1.5 flex-1">
            <p className="text-xs text-text-primary font-semibold">
              {L4(language, { ko: 'GitHub 계정이 있으신가요?', en: 'Do you have a GitHub account?', ja: 'GitHubアカウントはお持ちですか?', zh: '您有 GitHub 账号吗?' })}
            </p>
            <p className="text-[11px] text-text-tertiary leading-relaxed">
              {L4(language, {
                ko: '없다면 무료로 가입할 수 있어요. 이메일만 있으면 됩니다.',
                en: "If not, sign up for free — just an email is enough.",
                ja: 'なければ無料で登録できます。メールアドレスだけでOK。',
                zh: '没有的话可以免费注册,只需一个邮箱即可。',
              })}
            </p>
            <a
              href="https://github.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-accent-blue hover:underline font-medium"
            >
              {L4(language, { ko: 'GitHub 가입하기 →', en: 'Sign up for GitHub →', ja: 'GitHubに登録 →', zh: '注册 GitHub →' })}
            </a>
          </div>
        </div>

        <div className="flex gap-3 items-start">
          <span className="shrink-0 w-6 h-6 rounded-full bg-green-600/15 text-green-500 font-bold text-[11px] flex items-center justify-center">2</span>
          <div className="space-y-1.5 flex-1">
            <p className="text-xs text-text-primary font-semibold">
              {L4(language, { ko: '토큰 만들기 (원클릭)', en: 'Create a token (one click)', ja: 'トークンを作成(ワンクリック)', zh: '创建令牌(一键完成)' })}
            </p>
            <p className="text-[11px] text-text-tertiary leading-relaxed">
              {L4(language, {
                ko: '아래 버튼을 누르면 GitHub이 열리고, 필요한 권한(repo)이 미리 체크되어 있어요. 페이지 아래 초록색 [Generate token] 버튼만 누르면 됩니다.',
                en: 'Click below — GitHub opens with the required permission (repo) pre-checked. Just click the green [Generate token] button at the bottom of the page.',
                ja: '下のボタンを押すとGitHubが開き、必要な権限(repo)がすでにチェックされています。ページ下部の緑の[Generate token]ボタンを押すだけです。',
                zh: '点击下方按钮打开 GitHub,所需权限(repo)已预先勾选。只需点击页面底部绿色的 [Generate token] 按钮。',
              })}
            </p>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=%EB%A1%9C%EC%96%B4%EA%B0%80%EB%93%9C%20%EC%9B%90%EA%B3%A0%20%EB%B0%B1%EC%97%85"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600/80 hover:bg-green-600 text-white text-[11px] font-bold rounded-lg transition-colors"
            >
              <GitBranch className="w-3 h-3" />
              {L4(language, { ko: 'GitHub에서 토큰 만들기', en: 'Create token on GitHub', ja: 'GitHubでトークンを作成', zh: '在 GitHub 创建令牌' })}
            </a>
          </div>
        </div>

        <div className="flex gap-3 items-start">
          <span className="shrink-0 w-6 h-6 rounded-full bg-green-600/15 text-green-500 font-bold text-[11px] flex items-center justify-center">3</span>
          <div className="space-y-1.5 flex-1">
            <p className="text-xs text-text-primary font-semibold">
              {L4(language, { ko: '토큰 복사 → 아래 칸에 붙여넣기', en: 'Copy the token → paste below', ja: 'トークンをコピー → 下の欄に貼り付け', zh: '复制令牌 → 粘贴到下方' })}
            </p>
            <p className="text-[11px] text-text-tertiary leading-relaxed">
              {L4(language, {
                ko: '토큰은 "ghp_"로 시작하는 긴 문자열이에요. 한 번만 표시되니 바로 복사하세요. 그 후 아래 입력칸에 붙여넣고 [연결] 버튼을 누르면 끝!',
                en: 'The token is a long string starting with "ghp_". It is shown only once — copy it right away, paste into the input below, and click [Connect].',
                ja: 'トークンは「ghp_」で始まる長い文字列です。一度しか表示されないのですぐにコピーし、下の欄に貼り付けて[Connect]をクリック。',
                zh: '令牌是以 "ghp_" 开头的长字符串,仅显示一次,请立即复制,粘贴到下方输入框并点击 [Connect]。',
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-start px-3 py-2.5 rounded-lg bg-accent-blue/10 border border-accent-blue/20">
          <span className="shrink-0">🔒</span>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            {L4(language, {
              ko: '토큰은 이 브라우저에만 저장되고, 로어가드 서버로는 절대 전송되지 않습니다. GitHub 호출은 브라우저에서 직접 실행돼요.',
              en: 'The token is stored only in this browser and never sent to Loreguard servers. All GitHub calls happen directly from your browser.',
              ja: 'トークンはこのブラウザにのみ保存され、ロアガードのサーバーには送信されません。GitHubへの通信はブラウザから直接行われます。',
              zh: '令牌仅保存在当前浏览器,绝不发送至洛尔加德服务器。所有 GitHub 调用均由浏览器直接发起。',
            })}
          </p>
        </div>
      </div>
    </details>
  );
}

// ============================================================
// PART 5 — Google Drive Backup Section
// ============================================================

function GoogleDriveSection({ language }: { language: AppLanguage }) {
  const { user } = useAuth();
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try { stored = typeof window !== 'undefined' ? localStorage.getItem('noa_drive_last_sync') : null; } catch (err) { logger.warn('BackupsSection', 'read noa_drive_last_sync failed', err); }
    if (stored) setLastSync(parseInt(stored));
  }, []);

  let hasToken = false;
  let encActive = false;
  try { hasToken = typeof window !== 'undefined' && !!localStorage.getItem('noa_drive_token'); } catch (err) { logger.warn('BackupsSection', 'read noa_drive_token failed', err); }
  try { encActive = typeof window !== 'undefined' && !!localStorage.getItem('noa_drive_enc'); } catch (err) { logger.warn('BackupsSection', 'read noa_drive_enc failed', err); }

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      window.dispatchEvent(new CustomEvent('noa:drive-sync-requested'));
      const now = Date.now();
      setLastSync(now);
      try { localStorage.setItem('noa_drive_last_sync', String(now)); } catch (err) { logger.warn('BackupsSection', 'save noa_drive_last_sync failed', err); }
    } finally {
      setTimeout(() => setSyncing(false), 2000);
    }
  };

  return (
    <div className="md:col-span-2 ds-card-lg">
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-6 flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-500" />
        {L4(language, { ko: 'Google Drive 백업', en: 'Google Drive Backup', ja: 'Google Driveバックアップ', zh: 'Google Drive备份' })}
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
          <span className="text-xs text-text-secondary">{L4(language, { ko: '연결 상태', en: 'Connection', ja: '接続状態', zh: '连接状态' })}</span>
          <span className={`text-xs font-black ${user && hasToken ? 'text-green-500' : 'text-text-tertiary'}`}>
            {user && hasToken
              ? L4(language, { ko: '연결됨', en: 'Connected', ja: '接続済み', zh: '已连接' })
              : L4(language, { ko: '미연결', en: 'Not Connected', ja: '未接続', zh: '未连接' })}
          </span>
        </div>
        <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
          <span className="text-xs text-text-secondary">{L4(language, { ko: '마지막 동기화', en: 'Last Sync', ja: '最終同期', zh: '上次同步' })}</span>
          <span className="text-xs font-black text-text-tertiary">
            {lastSync ? new Date(lastSync).toLocaleString() : L4(language, { ko: '없음', en: 'Never', ja: 'なし', zh: '从未' })}
          </span>
        </div>
        <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
          <span className="text-xs text-text-secondary">{L4(language, { ko: '암호화', en: 'Encryption', ja: '暗号化', zh: '加密' })}</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${encActive ? 'bg-green-500/15 text-green-500 border border-green-500/30' : 'bg-bg-tertiary text-text-tertiary'}`}>
            {encActive ? 'AES-GCM-256' : L4(language, { ko: '비활성', en: 'Off', ja: '無効', zh: '关闭' })}
          </span>
        </div>
        <button
          onClick={handleManualSync}
          disabled={syncing || !user}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600/10 border border-blue-500/30 rounded-xl text-xs font-bold text-blue-400 hover:bg-blue-600/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {syncing
            ? L4(language, { ko: '동기화 중...', en: 'Syncing...', ja: '同期中...', zh: '同步中...' })
            : L4(language, { ko: '지금 동기화', en: 'Sync Now', ja: '今すぐ同期', zh: '立即同步' })}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// PART 6 — Full Bundle Export / Import (project-level backup)
// 사용자 신뢰 기본: 원고 + 설정 + 번역 메모리까지 한 번에 백업
// ============================================================

function FullBundleSection({ language }: { language: AppLanguage }) {
  const [busy, setBusy] = useState<'json' | 'zip' | 'restore' | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /** 현재 활성 프로젝트 ID 조회 — 폴백: 첫 프로젝트 */
  const resolveProjectId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const last = localStorage.getItem('noa_last_project_id');
      if (last) return last;
    } catch (err) { logger.warn('BackupsSection', 'read noa_last_project_id failed', err); }
    try {
      const raw = localStorage.getItem('noa_projects_v2');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed[0]?.id) return String(parsed[0].id);
    } catch (err) { logger.warn('BackupsSection', 'fallback project read failed', err); }
    return null;
  }, []);

  const handleExportJson = useCallback(async () => {
    const pid = resolveProjectId();
    if (!pid) {
      showAlert(L4(language, {
        ko: '백업할 프로젝트가 없습니다.',
        en: 'No project to back up.',
        ja: 'バックアップするプロジェクトがありません。',
        zh: '没有可备份的项目。',
      }), 'warning');
      return;
    }
    setBusy('json');
    try {
      const bundle = await exportFullBundle(pid);
      downloadBundle(bundle);
      showAlert(L4(language, {
        ko: '전체 백업(.json) 다운로드 완료',
        en: 'Full backup (.json) downloaded',
        ja: '全体バックアップ(.json)のダウンロード完了',
        zh: '全量备份(.json)下载完成',
      }), 'info');
    } catch (err) {
      logger.error('BackupsSection', 'exportFullBundle failed', err);
      showAlert(L4(language, {
        ko: '백업 생성 실패. 콘솔 확인.',
        en: 'Backup failed. Check console.',
        ja: 'バックアップ作成失敗。コンソール確認。',
        zh: '备份失败,请查看控制台。',
      }), 'error');
    } finally {
      setBusy(null);
    }
  }, [language, resolveProjectId]);

  const handleExportZip = useCallback(async () => {
    const pid = resolveProjectId();
    if (!pid) {
      showAlert(L4(language, {
        ko: '백업할 프로젝트가 없습니다.',
        en: 'No project to back up.',
        ja: 'バックアップするプロジェクトがありません。',
        zh: '没有可备份的项目。',
      }), 'warning');
      return;
    }
    setBusy('zip');
    try {
      const blob = await exportFullBundleAsZip(pid);
      if (!blob) {
        showAlert(L4(language, {
          ko: 'ZIP 생성 실패. JSON 백업을 이용하세요.',
          en: 'ZIP failed. Use JSON backup instead.',
          ja: 'ZIP失敗。JSONバックアップを使用。',
          zh: 'ZIP 失败,请改用 JSON 备份。',
        }), 'warning');
        return;
      }
      const bundle = await exportFullBundle(pid);
      downloadZipBundle(blob, suggestZipFilename(bundle));
      showAlert(L4(language, {
        ko: '전체 백업(.zip) 다운로드 완료',
        en: 'Full backup (.zip) downloaded',
        ja: '全体バックアップ(.zip)のダウンロード完了',
        zh: '全量备份(.zip)下载完成',
      }), 'info');
    } catch (err) {
      logger.error('BackupsSection', 'exportFullBundleAsZip failed', err);
      showAlert(L4(language, {
        ko: 'ZIP 백업 생성 실패.',
        en: 'ZIP backup failed.',
        ja: 'ZIPバックアップ失敗。',
        zh: 'ZIP 备份失败。',
      }), 'error');
    } finally {
      setBusy(null);
    }
  }, [language, resolveProjectId]);

  const handleRestore = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 동일 파일 재선택 가능하도록 reset
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    const confirmed = window.confirm(L4(language, {
      ko: '현재 데이터를 덮어쓰고 백업을 복원합니다. 복원 전 현재 상태가 자동 저장됩니다. 계속할까요?',
      en: 'Current data will be overwritten. The current state is auto-saved before restore. Continue?',
      ja: '現在のデータを上書きしてバックアップを復元します。復元前に現在の状態を自動保存します。続けますか?',
      zh: '将覆盖当前数据并恢复备份。恢复前会自动保存当前状态。继续吗?',
    }));
    if (!confirmed) return;
    setBusy('restore');
    try {
      const result = await importFullBundle(file);
      if (!result.success) {
        // pre-restore backup이 있으면 자동 rollback
        if (result.preRestoreBackup) {
          rollbackFromPreRestoreBackup(result.preRestoreBackup);
        }
        showAlert(L4(language, {
          ko: `복원 실패: ${result.warnings.join(', ')}`,
          en: `Restore failed: ${result.warnings.join(', ')}`,
          ja: `復元失敗: ${result.warnings.join(', ')}`,
          zh: `恢复失败: ${result.warnings.join(', ')}`,
        }), 'error');
        return;
      }
      const msg = L4(language, {
        ko: `복원 완료 (프로젝트 ${result.restoredProjects}개). 페이지를 새로고침합니다.`,
        en: `Restored ${result.restoredProjects} project(s). Reloading page.`,
        ja: `復元完了 (プロジェクト${result.restoredProjects}件)。ページを再読み込みします。`,
        zh: `恢复完成 (项目 ${result.restoredProjects} 个)。正在刷新页面。`,
      });
      showAlert(msg, 'info');
      // 2초 후 자동 새로고침 — hydrated 상태 초기화
      setTimeout(() => {
        if (typeof window !== 'undefined') window.location.reload();
      }, 2000);
    } catch (err) {
      logger.error('BackupsSection', 'importFullBundle failed', err);
      showAlert(L4(language, {
        ko: '복원 중 오류 발생. 파일이 올바른지 확인하세요.',
        en: 'Restore error. Check the file is valid.',
        ja: '復元エラー。ファイルを確認してください。',
        zh: '恢复出错。请检查文件是否有效。',
      }), 'error');
    } finally {
      setBusy(null);
    }
  }, [language]);

  return (
    <div className="md:col-span-2 ds-card-lg">
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-6 flex items-center gap-2">
        <Archive className="w-4 h-4 text-accent-blue" />
        {L4(language, {
          ko: '전체 백업 · 복원',
          en: 'Full Backup · Restore',
          ja: '全体バックアップ・復元',
          zh: '全量备份・恢复',
        })}
      </h3>
      <p className="text-xs text-text-tertiary mb-4 leading-relaxed">
        {L4(language, {
          ko: '원고 + 설정 + 번역 메모리까지 한 번에 백업하고 복원하세요. 로어가드를 떠날 때도 데이터는 당신 것입니다.',
          en: 'Back up and restore everything — manuscripts, settings, translation memory. Your data stays yours, even if you leave Loreguard.',
          ja: '原稿+設定+翻訳メモリを一括バックアップ・復元。Loreguardを離れてもデータはあなたのものです。',
          zh: '一次性备份和恢复稿件+设置+翻译记忆。即使离开洛尔加德,数据仍归您所有。',
        })}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleExportJson}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent-blue"
        >
          <Download className="w-4 h-4" />
          {busy === 'json'
            ? L4(language, { ko: '생성 중...', en: 'Creating...', ja: '作成中...', zh: '生成中...' })
            : L4(language, {
                ko: '전체 백업 (.json)',
                en: 'Full Backup (.json)',
                ja: '全体バックアップ (.json)',
                zh: '全量备份 (.json)',
              })}
        </button>
        <button
          type="button"
          onClick={handleExportZip}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-accent-blue/10 border border-accent-blue/30 rounded-xl text-xs font-bold text-accent-blue hover:bg-accent-blue/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent-blue"
        >
          <Archive className="w-4 h-4" />
          {busy === 'zip'
            ? L4(language, { ko: '생성 중...', en: 'Creating...', ja: '作成中...', zh: '生成中...' })
            : L4(language, {
                ko: '전체 백업 (.zip) · 권장',
                en: 'Full Backup (.zip) · Recommended',
                ja: '全体バックアップ (.zip) · 推奨',
                zh: '全量备份 (.zip) · 推荐',
              })}
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <label className="flex items-center justify-center gap-2 px-4 py-3 bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-accent-blue">
          <Upload className="w-4 h-4" />
          {busy === 'restore'
            ? L4(language, { ko: '복원 중...', en: 'Restoring...', ja: '復元中...', zh: '恢复中...' })
            : L4(language, {
                ko: '백업 파일에서 복원 (.json / .zip)',
                en: 'Restore from Backup (.json / .zip)',
                ja: 'バックアップから復元 (.json / .zip)',
                zh: '从备份恢复 (.json / .zip)',
              })}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json,.zip,application/zip"
            onChange={handleRestore}
            disabled={busy !== null}
            className="hidden"
            aria-label={L4(language, {
              ko: '백업 파일 선택',
              en: 'Select backup file',
              ja: 'バックアップファイルを選択',
              zh: '选择备份文件',
            })}
          />
        </label>
        <p className="text-[10px] text-text-tertiary mt-2 px-1 leading-relaxed">
          {L4(language, {
            ko: '복원 전 현재 상태가 자동 저장됩니다. 실패 시 자동으로 원래 상태로 되돌립니다.',
            en: 'Current state is auto-saved before restore. Auto-rollback on failure.',
            ja: '復元前に現在の状態を自動保存します。失敗時は自動で元に戻します。',
            zh: '恢复前会自动保存当前状态,失败时自动回滚。',
          })}
        </p>
      </div>
    </div>
  );
}
