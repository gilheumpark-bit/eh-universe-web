// ============================================================
// /verify — 창작 과정 확인서 공개 검색·검증 페이지
// ============================================================
// 외부 검증자(출판사·심사기관·독자)가 certId 또는 봉인번호(LG-…)만으로
// 레지스트리 등록 여부 + 메타(발급일·공개범위·발급자·GitHub 앵커)를 확인.
//
// 원본 콘텐츠 표시·다운로드 절대 없음 — 레지스트리는 해시·메타만 보관.
// 정직 한계 의무 표기: 인간 작성 자체는 증명 불가 — 앵커 시점 이후
// 무변조·존재만 증명.
//
// /status 페이지 패턴 재사용 (L4 i18n·badge·premium-panel-soft).
// ============================================================

"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

// ============================================================
// PART 1 — Types & constants
// ============================================================

/** API 측 ID_REGEX 와 동기 유지 (src/app/api/cp/verify/[id]/route.ts) */
const ID_REGEX = /^[A-Za-z0-9_-]{8,64}$/;
/** GitHub 링크 안전 가드 — 레지스트리 값 그대로 href 에 넣지 않음 */
const GITHUB_REPO_REGEX = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const GITHUB_SHA_REGEX = /^[0-9a-f]{7,40}$/i;

const FETCH_TIMEOUT_MS = 15_000;

interface LookupMeta {
  cert_id: string;
  seal_number: string | null;
  registered_at: string | null;
  visibility: string | null;
  issuer_type: string | null;
  github_repo: string | null;
  github_commit_sha: string | null;
}

type LookupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "pass"; meta: LookupMeta }
  | { kind: "fail" } // cert_not_registered
  | { kind: "error"; code: "format" | "rate_limited" | "unavailable" | "network" };

// ============================================================
// PART 2 — Page
// ============================================================

export default function VerifyPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);

  const [input, setInput] = useState("");
  const [state, setState] = useState<LookupState>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  // unmount 시 in-flight 요청 정리
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind === "loading") return; // 이중 제출 가드

    const id = input.trim();
    if (!ID_REGEX.test(id)) {
      setState({ kind: "error", code: "format" });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    setState({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/cp/verify/${encodeURIComponent(id)}?lookup=true`,
        { cache: "no-store", signal: controller.signal },
      );
      if (res.status === 429) {
        setState({ kind: "error", code: "rate_limited" });
        return;
      }
      if (res.status === 503) {
        setState({ kind: "error", code: "unavailable" });
        return;
      }
      if (res.status === 404) {
        setState({ kind: "fail" });
        return;
      }
      if (res.status === 400) {
        setState({ kind: "error", code: "format" });
        return;
      }
      if (!res.ok) {
        setState({ kind: "error", code: "network" });
        return;
      }
      const data = (await res.json()) as LookupMeta & { registered?: boolean };
      if (!data.registered) {
        setState({ kind: "fail" });
        return;
      }
      setState({ kind: "pass", meta: data });
    } catch {
      if (controller.signal.aborted && abortRef.current !== controller) return; // 새 요청으로 대체됨
      setState({ kind: "error", code: "network" });
    } finally {
      clearTimeout(timer);
    }
  }

  // ── 라벨 매핑 ──
  const visibilityLabel = (v: string | null) => {
    switch (v) {
      case "public":
        return T({ ko: "공개", en: "Public", ja: "公開", zh: "公开" });
      case "publisher":
        return T({ ko: "출판사·플랫폼", en: "Publisher", ja: "出版社", zh: "出版社" });
      case "legal":
        return T({ ko: "법적 대응용", en: "Legal", ja: "法的対応用", zh: "法律用途" });
      case "private":
        return T({ ko: "비공개", en: "Private", ja: "非公開", zh: "私密" });
      default:
        return v ?? "—";
    }
  };
  const issuerLabel = (v: string | null) => {
    switch (v) {
      case "self":
        return T({ ko: "작가 본인", en: "Author (self)", ja: "作家本人", zh: "作者本人" });
      case "publisher":
        return T({ ko: "출판사·에이전시", en: "Publisher / agency", ja: "出版社", zh: "出版社/代理" });
      case "collaborator":
        return T({ ko: "공동 작업자", en: "Collaborator", ja: "共同作業者", zh: "协作者" });
      case "admission_token":
        return T({ ko: "외부 검증 토큰", en: "External verification token", ja: "外部検証トークン", zh: "外部验证令牌" });
      default:
        return v ?? "—";
    }
  };

  // ── 결과 badge ──
  const badge = (() => {
    if (state.kind === "pass")
      return (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-green-500" aria-hidden="true" />
          <span className="text-lg font-semibold text-green-600 dark:text-green-400">
            {T({ ko: "PASS — 등록 확인", en: "PASS — Registered", ja: "PASS — 登録確認", zh: "PASS — 已登记" })}
          </span>
        </span>
      );
    if (state.kind === "fail")
      return (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500" aria-hidden="true" />
          <span className="text-lg font-semibold text-red-600 dark:text-red-400">
            {T({ ko: "FAIL — 미등록", en: "FAIL — Not registered", ja: "FAIL — 未登録", zh: "FAIL — 未登记" })}
          </span>
        </span>
      );
    return null;
  })();

  const errorMessage = (() => {
    if (state.kind !== "error") return null;
    switch (state.code) {
      case "format":
        return T({
          ko: "ID 형식이 올바르지 않습니다 (영문·숫자·-·_ 8~64자, 예: LG-2605-0042-A8F5).",
          en: "Invalid ID format (letters, digits, - and _, 8–64 chars; e.g. LG-2605-0042-A8F5).",
          ja: "ID 形式が正しくありません（英数・-・_ 8〜64文字、例: LG-2605-0042-A8F5）。",
          zh: "ID 格式不正确（字母、数字、- 和 _，8–64 个字符，例如 LG-2605-0042-A8F5）。",
        });
      case "rate_limited":
        return T({
          ko: "요청이 너무 많습니다. 잠시 후 다시 시도하세요.",
          en: "Too many requests. Please retry in a moment.",
          ja: "リクエストが多すぎます。しばらくしてから再試行してください。",
          zh: "请求过多。请稍后重试。",
        });
      case "unavailable":
        return T({
          ko: "레지스트리에 일시적으로 접근할 수 없습니다. 잠시 후 다시 시도하세요.",
          en: "Registry temporarily unavailable. Please retry later.",
          ja: "レジストリに一時的にアクセスできません。後で再試行してください。",
          zh: "暂时无法访问登记处。请稍后重试。",
        });
      default:
        return T({
          ko: "조회에 실패했습니다. 네트워크 상태를 확인하세요.",
          en: "Lookup failed. Please check your network connection.",
          ja: "照会に失敗しました。ネットワークを確認してください。",
          zh: "查询失败。请检查网络连接。",
        });
    }
  })();

  // ── GitHub 앵커 링크 (안전 가드 통과 시에만 href 생성) ──
  const githubLink = (() => {
    if (state.kind !== "pass") return null;
    const { github_repo: repo, github_commit_sha: sha } = state.meta;
    if (!sha) return null;
    if (repo && GITHUB_REPO_REGEX.test(repo) && GITHUB_SHA_REGEX.test(sha)) {
      return (
        <a
          href={`https://github.com/${repo}/commit/${sha}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-amber hover:underline font-[--font-mono] break-all"
        >
          {sha}
        </a>
      );
    }
    return <span className="font-[--font-mono] break-all">{sha}</span>;
  })();

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="mb-2 font-[--font-mono] text-xs uppercase tracking-widest text-text-tertiary">
        {T({ ko: "확인서 검증", en: "Certificate Verification", ja: "確認書検証", zh: "确认书验证" })}
      </h1>
      <h2 className="mb-8 text-3xl font-bold text-text-primary">
        {T({ ko: "창작 과정 확인서 조회", en: "Authorship Journal Lookup", ja: "制作過程確認書の照会", zh: "创作过程确认书查询" })}
      </h2>

      {/* ── 검색 폼 ── */}
      <section className="premium-panel-soft rounded-xl p-6">
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="verify-id" className="block text-sm font-medium text-text-secondary mb-2">
            {T({
              ko: "확인서 ID 또는 봉인번호",
              en: "Certificate ID or seal number",
              ja: "確認書 ID または封印番号",
              zh: "确认书 ID 或封印编号",
            })}
          </label>
          <div className="flex gap-2">
            <input
              id="verify-id"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="LG-2605-0042-A8F5"
              autoComplete="off"
              spellCheck={false}
              maxLength={64}
              className="flex-1 rounded-lg border border-border-subtle bg-transparent px-3 py-2 font-[--font-mono] text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-amber"
            />
            <button
              type="submit"
              disabled={state.kind === "loading"}
              className="rounded-lg bg-accent-amber px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
            >
              {state.kind === "loading"
                ? T({ ko: "조회 중…", en: "Looking up…", ja: "照会中…", zh: "查询中…" })
                : T({ ko: "조회", en: "Verify", ja: "照会", zh: "查询" })}
            </button>
          </div>
        </form>
        {errorMessage ? (
          <p className="mt-3 text-sm text-red-500" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </section>

      {/* ── 결과 ── */}
      <section aria-live="polite" aria-atomic="true">
        {state.kind === "pass" || state.kind === "fail" ? (
          <div className="premium-panel-soft mt-6 rounded-xl p-6">
            {badge}
            {state.kind === "pass" ? (
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">
                    {T({ ko: "확인서 ID", en: "Certificate ID", ja: "確認書 ID", zh: "确认书 ID" })}
                  </dt>
                  <dd className="font-[--font-mono] break-all text-text-primary">{state.meta.cert_id}</dd>
                </div>
                {state.meta.seal_number ? (
                  <div>
                    <dt className="text-text-tertiary">
                      {T({ ko: "봉인번호", en: "Seal number", ja: "封印番号", zh: "封印编号" })}
                    </dt>
                    <dd className="font-[--font-mono] text-text-primary">{state.meta.seal_number}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-text-tertiary">
                    {T({ ko: "등록(앵커) 시각", en: "Registered (anchor) at", ja: "登録（アンカー）時刻", zh: "登记（锚定）时间" })}
                  </dt>
                  <dd className="text-text-primary">
                    {state.meta.registered_at
                      ? new Date(state.meta.registered_at).toLocaleString(lang)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">
                    {T({ ko: "공개 범위", en: "Visibility", ja: "公開範囲", zh: "公开范围" })}
                  </dt>
                  <dd className="text-text-primary">{visibilityLabel(state.meta.visibility)}</dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">
                    {T({ ko: "발급자 유형", en: "Issuer type", ja: "発行者種別", zh: "发行者类型" })}
                  </dt>
                  <dd className="text-text-primary">{issuerLabel(state.meta.issuer_type)}</dd>
                </div>
                {githubLink ? (
                  <div>
                    <dt className="text-text-tertiary">
                      {T({ ko: "GitHub 앵커 커밋", en: "GitHub anchor commit", ja: "GitHub アンカーコミット", zh: "GitHub 锚定提交" })}
                    </dt>
                    <dd>{githubLink}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-text-secondary">
                {T({
                  ko: "해당 ID/봉인번호로 등록된 확인서가 없습니다. 입력값을 다시 확인하거나 발급자에게 문의하세요.",
                  en: "No certificate is registered under this ID / seal number. Check the input or contact the issuer.",
                  ja: "この ID／封印番号で登録された確認書はありません。入力を確認するか発行者にお問い合わせください。",
                  zh: "没有以该 ID/封印编号登记的确认书。请检查输入或联系发行者。",
                })}
              </p>
            )}
          </div>
        ) : null}
      </section>

      {/* ── 정직 한계 + 프라이버시 (의무 표기 — 항상 표시) ── */}
      <section className="mt-10 text-xs text-text-tertiary space-y-2">
        <h3 className="font-[--font-mono] uppercase tracking-widest text-accent-purple">
          {T({ ko: "검증의 한계", en: "Limitations", ja: "検証の限界", zh: "验证的局限" })}
        </h3>
        <p>
          {T({
            ko: "본 검증은 인간 작성 자체를 증명하지 않습니다 — 앵커(등록) 시점 이후의 무변조·존재만 증명합니다.",
            en: "This verification does NOT prove human authorship — it only proves existence and non-tampering since the anchor (registration) time.",
            ja: "この検証は人間による執筆そのものを証明しません — アンカー（登録）時点以降の非改ざん・存在のみを証明します。",
            zh: "本验证不证明内容由人类撰写 — 仅证明自锚定（登记）时刻以来的存在性与未被篡改。",
          })}
        </p>
        <p>
          {T({
            ko: "원본 콘텐츠는 이 페이지에서 표시·다운로드되지 않습니다. 레지스트리는 해시·메타데이터만 보관합니다.",
            en: "No manuscript content is displayed or downloadable here. The registry stores hashes and metadata only.",
            ja: "原本コンテンツはこのページで表示・ダウンロードされません。レジストリはハッシュとメタデータのみを保管します。",
            zh: "本页面不显示或提供下载任何原稿内容。登记处仅保存哈希与元数据。",
          })}
        </p>
      </section>
    </main>
  );
}

// IDENTITY_SEAL: VerifyPage | role=public-cert-lookup | inputs=/api/cp/verify/[id]?lookup=true | outputs=pass-fail-badge+meta-only
