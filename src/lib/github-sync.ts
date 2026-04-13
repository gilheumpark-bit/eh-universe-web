// ============================================================
// PART 1 — Types & Config
// ============================================================

import { Octokit } from 'octokit';

export interface GitHubSyncConfig {
  token: string;       // GitHub PAT or OAuth token
  owner: string;       // repo owner
  repo: string;        // repo name
  branch?: string;     // default 'main'
}

export interface GitHubFile {
  path: string;
  content: string;
  sha: string;
}

export interface GitHubFileEntry {
  path: string;
  type: 'file' | 'dir';
  sha: string;
}

export interface GitHubRepo {
  owner: string;
  name: string;
  private: boolean;
}

function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

function getBranch(config: GitHubSyncConfig): string {
  return config.branch ?? 'main';
}

// ============================================================
// PART 2 — File CRUD Operations
// ============================================================

/**
 * Fetch a single file from the repository.
 * Returns null for 404 (file not found), throws on other errors.
 */
export async function getFile(
  config: GitHubSyncConfig,
  path: string,
): Promise<GitHubFile | null> {
  const octokit = createOctokit(config.token);
  try {
    const res = await octokit.rest.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path,
      ref: getBranch(config),
    });

    const data = res.data;
    if (Array.isArray(data) || data.type !== 'file') return null;

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return { path: data.path, content, sha: data.sha };
  } catch (err: unknown) {
    if (isNotFoundError(err)) return null;
    throw err;
  }
}

/**
 * Create or update a file.
 * If `sha` is provided, performs an update. Otherwise creates a new file.
 */
export async function putFile(
  config: GitHubSyncConfig,
  path: string,
  content: string,
  sha?: string,
  message?: string,
): Promise<{ sha: string }> {
  const octokit = createOctokit(config.token);
  const commitMessage =
    message ?? (sha ? `Update ${path}` : `Create ${path}`);

  const res = await octokit.rest.repos.createOrUpdateFileContents({
    owner: config.owner,
    repo: config.repo,
    path,
    message: commitMessage,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    branch: getBranch(config),
    ...(sha ? { sha } : {}),
  });

  return { sha: res.data.content?.sha ?? '' };
}

/**
 * Delete a file from the repository. Requires the current sha.
 */
export async function deleteFile(
  config: GitHubSyncConfig,
  path: string,
  sha: string,
  message?: string,
): Promise<void> {
  const octokit = createOctokit(config.token);
  await octokit.rest.repos.deleteFile({
    owner: config.owner,
    repo: config.repo,
    path,
    message: message ?? `Delete ${path}`,
    sha,
    branch: getBranch(config),
  });
}

/**
 * List files/directories at a given path.
 * Returns an empty array for 404.
 */
export async function listFiles(
  config: GitHubSyncConfig,
  path?: string,
): Promise<GitHubFileEntry[]> {
  const octokit = createOctokit(config.token);
  try {
    const res = await octokit.rest.repos.getContent({
      owner: config.owner,
      repo: config.repo,
      path: path ?? '',
      ref: getBranch(config),
    });

    const data = res.data;
    if (!Array.isArray(data)) return [];

    return data.map((item) => ({
      path: item.path,
      type: item.type === 'dir' ? 'dir' as const : 'file' as const,
      sha: item.sha,
    }));
  } catch (err: unknown) {
    if (isNotFoundError(err)) return [];
    throw err;
  }
}

// ============================================================
// PART 3 — Tree & Branch Operations
// ============================================================

/**
 * Get the full repository tree (recursive).
 */
export async function getTree(
  config: GitHubSyncConfig,
): Promise<Array<{ path: string; type: string; sha: string }>> {
  const octokit = createOctokit(config.token);
  const branch = getBranch(config);

  const branchRef = await octokit.rest.git.getRef({
    owner: config.owner,
    repo: config.repo,
    ref: `heads/${branch}`,
  });

  const commitSha = branchRef.data.object.sha;
  const commit = await octokit.rest.git.getCommit({
    owner: config.owner,
    repo: config.repo,
    commit_sha: commitSha,
  });

  const treeRes = await octokit.rest.git.getTree({
    owner: config.owner,
    repo: config.repo,
    tree_sha: commit.data.tree.sha,
    recursive: 'true',
  });

  return (treeRes.data.tree ?? [])
    .filter((t): t is typeof t & { path: string; sha: string } =>
      Boolean(t.path && t.sha),
    )
    .map((t) => ({
      path: t.path!,
      type: t.type ?? 'blob',
      sha: t.sha!,
    }));
}

/**
 * List all branches in the repository.
 */
export async function listBranches(
  config: GitHubSyncConfig,
): Promise<string[]> {
  const octokit = createOctokit(config.token);
  const res = await octokit.rest.repos.listBranches({
    owner: config.owner,
    repo: config.repo,
    per_page: 100,
  });
  return res.data.map((b) => b.name);
}

/**
 * Create a new branch from a reference (defaults to HEAD of current branch).
 */
export async function createBranch(
  config: GitHubSyncConfig,
  name: string,
  fromRef?: string,
): Promise<void> {
  const octokit = createOctokit(config.token);
  const sha = fromRef ?? (await getLatestCommitSha(config));

  await octokit.rest.git.createRef({
    owner: config.owner,
    repo: config.repo,
    ref: `refs/heads/${name}`,
    sha,
  });
}

/**
 * Get the latest commit SHA on the configured branch.
 */
export async function getLatestCommitSha(
  config: GitHubSyncConfig,
): Promise<string> {
  const octokit = createOctokit(config.token);
  const branch = getBranch(config);

  const res = await octokit.rest.git.getRef({
    owner: config.owner,
    repo: config.repo,
    ref: `heads/${branch}`,
  });

  return res.data.object.sha;
}

// ============================================================
// PART 4 — Branch Switch & Merge
// ============================================================

/**
 * Switch to a different branch by returning a new config with the branch updated.
 * Validates that the branch exists before switching.
 */
export async function switchBranch(
  config: GitHubSyncConfig,
  branch: string,
): Promise<GitHubSyncConfig> {
  const octokit = createOctokit(config.token);

  // Validate branch exists
  try {
    await octokit.rest.git.getRef({
      owner: config.owner,
      repo: config.repo,
      ref: `heads/${branch}`,
    });
  } catch (err: unknown) {
    if (isNotFoundError(err)) {
      throw new Error(`Branch "${branch}" does not exist`);
    }
    throw err;
  }

  return { ...config, branch };
}

/**
 * Merge a source branch into the current branch.
 * Uses the GitHub merge API (non-fast-forward merge).
 */
export async function mergeBranch(
  config: GitHubSyncConfig,
  sourceBranch: string,
  message?: string,
): Promise<{ sha: string }> {
  const octokit = createOctokit(config.token);
  const base = getBranch(config);
  const commitMessage =
    message ?? `Merge ${sourceBranch} into ${base}`;

  const res = await octokit.rest.repos.merge({
    owner: config.owner,
    repo: config.repo,
    base,
    head: sourceBranch,
    commit_message: commitMessage,
  });

  return { sha: res.data.sha };
}

// ============================================================
// PART 5 — Repo Operations & Helpers
// ============================================================

/**
 * List repositories accessible by the token.
 */
export async function listRepos(
  token: string,
): Promise<GitHubRepo[]> {
  const octokit = createOctokit(token);
  const res = await octokit.rest.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: 'updated',
    direction: 'desc',
  });

  return res.data.map((r) => ({
    owner: r.owner.login,
    name: r.name,
    private: r.private,
  }));
}

/**
 * Create a new private repository.
 */
export async function createRepo(
  token: string,
  name: string,
): Promise<{ owner: string; name: string }> {
  const octokit = createOctokit(token);
  const res = await octokit.rest.repos.createForAuthenticatedUser({
    name,
    private: true,
    auto_init: true,
    description: 'NOA Novel Studio — manuscript sync repository',
  });

  return { owner: res.data.owner.login, name: res.data.name };
}

/**
 * Type guard for GitHub 404 errors.
 */
function isNotFoundError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    return (err as { status: number }).status === 404;
  }
  return false;
}

// IDENTITY_SEAL: PART-5 | role=github-sync | inputs=GitHubSyncConfig,token | outputs=GitHubFile,GitHubRepo
