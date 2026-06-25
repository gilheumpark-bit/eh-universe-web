"use client";

import { useEffect, useState } from 'react';
import { Check, GitBranch, Info, Lightbulb, LockKeyhole, Unplug } from 'lucide-react';
import { useGitHubSync } from '@/hooks/useGitHubSync';
import { isGitHubAutoSyncEnabled, setGitHubAutoSyncEnabled } from '@/hooks/useGitHubAutoSync';
import { L4 } from '@/lib/i18n';
import { AppLanguage } from '@/lib/studio-types';
import { isFeatureEnabled } from '@/lib/feature-flags';

function GitHubSyncSection({ language }: { language: AppLanguage }) {
  const ghEnabled = typeof window !== 'undefined' && isFeatureEnabled('GITHUB_SYNC');
  const gh = useGitHubSync();
  const [tokenInput, setTokenInput] = useState('');
  const [autoSync, setAutoSync] = useState<boolean>(() => isGitHubAutoSyncEnabled());
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    setGitHubAutoSyncEnabled(autoSync);
  }, [autoSync]);

  if (!ghEnabled) {
    return (
      <div className="md:col-span-2 ds-card-lg opacity-60">
        <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-4 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-text-tertiary" />
          {L4(language, { ko: '클라우드 백업 (GitHub)', en: 'Cloud Backup (GitHub)', ja: 'Cloud Backup (GitHub)', zh: 'Cloud Backup (GitHub)' })}
          <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-bg-tertiary text-text-tertiary font-bold uppercase tracking-wider">
            {L4(language, { ko: '설정 필요', en: 'Setup needed', ja: '設定が必要', zh: '需要设置' })}
          </span>
        </h3>
        <p className="text-xs text-text-tertiary">
          {L4(language, { ko: 'GitHub 백업 기능 플래그가 꺼져 있습니다.', en: 'GitHub backup is disabled by feature flag.', ja: 'GitHubバックアップの機能フラグが無効です。', zh: 'GitHub 备份功能开关已关闭。' })}
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
                type="button"
                onClick={gh.disconnect}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-red hover:bg-accent-red/10 transition-colors"
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

          <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border bg-bg-secondary/40">
            <div className="min-w-0">
              <div className="text-xs font-bold text-text-primary">
                {L4(language, { ko: '자동 동기화 (Auto-sync)', en: 'Auto-sync', ja: '自動同期', zh: '自动同步' })}
              </div>
              <div className="text-[10px] text-text-tertiary mt-1">
                {L4(language, {
                  ko: '원고 변경 시 30초 debounce 로 episode-{N}.md 에 자동 commit. 끄면 ManuscriptTab GitHub 버튼으로 수동 푸시.',
                  en: 'Auto-commit episode-{N}.md on manuscript change (30s debounce). Off = manual push via Manuscript tab GitHub button.',
                  ja: '原稿変更時30秒debounceで自動commit。OFFの場合はManuscriptタブのGitHubボタンで手動push。',
                  zh: '原稿变更时 30 秒去抖自动 commit。关闭时使用 Manuscript 标签 GitHub 按钮手动推送。',
                })}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="sr-only peer"
                aria-label={L4(language, { ko: '자동 동기화 토글', en: 'Auto-sync toggle', ja: '自動同期トグル', zh: '自动同步开关' })}
              />
              <div className="w-11 h-6 bg-bg-tertiary rounded-full peer peer-focus:ring-2 peer-focus:ring-accent-blue/50 peer-checked:bg-green-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-text-tertiary">
            {L4(language, { ko: 'GitHub 접근 토큰(PAT)을 입력하면 원고를 비공개 저장소에 안전하게 백업할 수 있습니다.', en: 'Enter a GitHub Personal Access Token (PAT) to safely back up manuscripts to a private repository.', ja: 'GitHubアクセストークン(PAT)を入力すると、原稿を非公開リポジトリに安全にバックアップできます。', zh: '输入 GitHub 访问令牌(PAT)后，可将稿件安全备份至私有仓库。' })}
          </p>

          <p className="flex items-start gap-2 text-[10px] text-text-tertiary bg-bg-secondary/40 border border-border rounded-lg px-3 py-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-blue" />
            <span>
              {L4(language, {
                ko: 'GitHub 사용자명 (ID) 직접 입력은 없습니다. 토큰에서 자동 추출됩니다. 토큰 1개만 입력하면 username + 저장소 목록 자동 인식.',
                en: 'No separate GitHub username/ID input. It is auto-detected from the token. One token gives us your username and repo list.',
                ja: 'GitHubユーザー名(ID)の直接入力はありません。トークンから自動抽出。トークン1つでusernameとリポジトリ一覧を自動認識。',
                zh: '无需单独输入 GitHub 用户名(ID)。从令牌自动提取。一个令牌即可识别用户名和仓库列表。',
              })}
            </span>
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
              type="button"
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
            <p className="text-xs text-accent-red px-2">{gh.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function GitHubPatGuide({ language }: { language: AppLanguage }) {
  return (
    <details className="bg-bg-secondary/60 border border-border rounded-xl overflow-hidden" open>
      <summary className="px-4 py-3 text-xs font-bold text-text-primary cursor-pointer select-none hover:bg-bg-tertiary/40 transition-colors flex items-center gap-2">
        <Lightbulb className="h-4 w-4 shrink-0 text-green-500" />
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
              {L4(language, { ko: 'GitHub 가입하기 ->', en: 'Sign up for GitHub ->', ja: 'GitHubに登録 ->', zh: '注册 GitHub ->' })}
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
                en: 'Click below. GitHub opens with the required permission (repo) pre-checked. Just click the green [Generate token] button at the bottom of the page.',
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
              {L4(language, { ko: '토큰 복사 -> 아래 칸에 붙여넣기', en: 'Copy the token -> paste below', ja: 'トークンをコピー -> 下の欄に貼り付け', zh: '复制令牌 -> 粘贴到下方' })}
            </p>
            <p className="text-[11px] text-text-tertiary leading-relaxed">
              {L4(language, {
                ko: '토큰은 "ghp_"로 시작하는 긴 문자열이에요. 한 번만 표시되니 바로 복사하세요. 그 후 아래 입력칸에 붙여넣고 [연결] 버튼을 누르면 끝!',
                en: 'The token is a long string starting with "ghp_". It is shown only once, so copy it right away, paste it below, and click [Connect].',
                ja: 'トークンは「ghp_」で始まる長い文字列です。一度しか表示されないのですぐにコピーし、下の欄に貼り付けて[Connect]をクリック。',
                zh: '令牌是以 "ghp_" 开头的长字符串,仅显示一次,请立即复制,粘贴到下方输入框并点击 [Connect]。',
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-2 items-start px-3 py-2.5 rounded-lg bg-accent-blue/10 border border-accent-blue/20">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-blue" />
          <p className="text-[11px] text-text-secondary leading-relaxed">
            {L4(language, {
              ko: '토큰은 이 브라우저에만 저장되고, Loreguard 서버로는 전송되지 않습니다. GitHub 호출은 브라우저에서 직접 실행돼요.',
              en: 'The token is stored only in this browser and is not sent to Loreguard servers. All GitHub calls happen directly from your browser.',
              ja: 'トークンはこのブラウザにのみ保存され、ロアガードのサーバーには送信されません。GitHubへの通信はブラウザから直接行われます。',
              zh: '令牌仅保存在当前浏览器,不会发送至洛尔加德服务器。所有 GitHub 调用均由浏览器直接发起。',
            })}
          </p>
        </div>
      </div>
    </details>
  );
}

export default GitHubSyncSection;
