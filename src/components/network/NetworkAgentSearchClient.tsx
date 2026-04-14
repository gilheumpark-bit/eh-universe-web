"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { useNetworkAgent, type NetworkSearchResult } from "@/lib/hooks/useNetworkAgent";

interface SearchMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  results?: NetworkSearchResult[];
  isError?: boolean;
  queryTerms?: string[];
}

/** Compute a simple relevance percentage for a search result against the query */
function computeRelevance(query: string, result: NetworkSearchResult): number {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 50;
  const haystack = `${result.title} ${result.snippet}`.toLowerCase();
  let matched = 0;
  for (const term of terms) {
    if (haystack.includes(term)) matched++;
  }
  const base = Math.round((matched / terms.length) * 80) + 20;
  return Math.min(99, base);
}

/** Wrap matched keywords in <mark> for display */
function highlightKeywords(text: string, terms: string[]): React.ReactNode[] {
  if (!terms.length || !text) return [text];
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark key={i} className="bg-accent-amber/30 text-text-primary rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function NetworkAgentSearchClient() {
  const { lang } = useLang();
  const { user } = useAuth();
  const { searchAgent, isSearching } = useNetworkAgent();

  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<SearchMessage[]>([]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const queryText = query.trim();
    if (!queryText || isSearching || !user) return;

    // Add user message
    const userMessage: SearchMessage = {
      id: Date.now().toString(),
      role: "user",
      content: queryText,
    };
    setMessages((prev) => [...prev, userMessage]);
    setQuery("");

    // Start search
    let idToken: string;
    try {
      idToken = await user.getIdToken();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "agent",
          content: L4(lang, { ko: "인증 토큰을 가져올 수 없습니다. 다시 로그인해 주세요.", en: "Failed to get auth token. Please sign in again.", ja: "인증 토큰을 가져올 수 없습니다. 다시 ログイン해 주세요.", zh: "인증 토큰을 가져올 수 없습니다. 다시 登录해 주세요." }),
          isError: true,
        },
      ]);
      return;
    }
    const result = await searchAgent(queryText, {
      onlyPublic: false,
      idToken,
      userKey: user.uid,
    });

    const searchTerms = queryText.toLowerCase().split(/\s+/).filter(Boolean);

    if (result) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "agent",
          content: result.summary,
          results: result.results,
          queryTerms: searchTerms,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "agent",
          content: L4(lang, { ko: "검색 중 오류가 발생했습니다. 구글 클라우드 설정을 확인하시거나 잠시 후 다시 시도해 주세요.", en: "Search failed. Please try again later.", ja: "検索 중 エラーが発生しました。 구글 클라우드 設定을 確認하시거나 잠시 후 再試行해 주세요.", zh: "搜索 중 发生了错误。 구글 클라우드 设置을 确认하시거나 잠시 후 重试해 주세요." }),
          isError: true,
        },
      ]);
    }
  };

  if (!user) {
    return (
      <main className="pt-14 pb-20">
        <div className="site-shell py-10">
          <section className="premium-panel p-8 text-center">
            <div className="site-kicker">{L4(lang, { ko: "로그인 필요", en: "Authentication Required", ja: "ログイン 필요", zh: "登录 필요" })}</div>
            <h1 className="site-title mt-3 text-3xl font-semibold">
              {L4(lang, { ko: "Agent Builder 검색을 이용하려면 로그인하세요.", en: "Sign in to use the Network Agent search.", ja: "Agent Builder 検索을 이용하려면 ログイン하세요.", zh: "Agent Builder 搜索을 이용하려면 登录하세요." })}
            </h1>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-14 pb-20">
      <div className="site-shell space-y-6 py-8 md:py-10">
        <Link href="/network" className="inline-flex items-center gap-1 font-mono text-xs tracking-widest text-text-tertiary transition hover:text-accent-amber">
          &larr; NETWORK
        </Link>
        
        <section className="premium-panel p-6 md:p-8 flex flex-col h-[70vh]">
          <div className="border-b border-white/10 pb-4 mb-4">
            <div className="site-kicker text-accent-amber">Vertex AI Agent Builder</div>
            <h1 className="site-title mt-2 text-2xl font-semibold">
              {L4(lang, { ko: "네트워크 기록물 NOA 검색", en: "Network Archives NOA Search", ja: "ネットワーク 기록물 NOA 検索", zh: "网络 기록물 NOA 搜索" })}
            </h1>
            <p className="mt-2 text-sm text-text-tertiary">
              {L4(lang, { ko: "내 행성, 게시글, 그리고 공개된 세계관 정보를 의미 기반으로 통합 검색합니다.", en: "Search your planets, posts, and public universe data using semantic matching.", ja: "マイ惑星, 投稿, 그리고 公開된 世界観 情報를 의미 기반으로 통합 検索합니다.", zh: "我的星球, 帖子, 그리고 公开된 世界观 信息를 의미 기반으로 통합 搜索합니다." })}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-4">
                <span className="text-4xl mb-4">🌌</span>
                <p className="text-sm font-medium">
                  {L4(lang, { ko: "\"내 세계관의 주요 사건을 요약해줘\" 같이 질문해보세요.", en: "Try asking: \"Summarize the major events in my universe.\"", ja: "\"내 世界観의 주요 사件을 요약해줘\" 같이 질문해보세요.", zh: "\"내 世界观의 주요 사条을 요약해줘\" 같이 질문해보세요." })}
                </p>
              </div>
            ) : null}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === "agent" ? "flex-row" : "flex-row-reverse"}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] ${msg.role === "agent" ? "bg-accent-amber/20 text-accent-amber" : "bg-white/10 text-white"}`}>
                  {msg.role === "agent" ? "NOA" : "YOU"}
                </div>
                <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === "agent" ? (msg.isError ? "bg-red-500/10 border border-red-500/20" : "bg-white/[0.03] border border-white/5") : "bg-accent-amber/10 border border-accent-amber/20"}`}>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                  {msg.results && msg.results.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                      <p className="text-[10px] font-mono tracking-widest text-text-tertiary">SOURCES</p>
                      <div className="space-y-2">
                        {msg.results.map((res, i) => {
                          const userQuery = messages.find((m) => m.role === "user" && messages.indexOf(m) < messages.indexOf(msg));
                          const terms = msg.queryTerms ?? (userQuery?.content.toLowerCase().split(/\s+/).filter(Boolean) ?? []);
                          const relevance = computeRelevance(userQuery?.content ?? "", res);
                          return (
                            <Link
                              key={i}
                              href={res.planetId ? `/network/posts/${res.id}` : `/network/planets/${res.id}`}
                              className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-text-primary truncate">
                                  {highlightKeywords(res.title, terms)}
                                </div>
                                {res.snippet && (
                                  <p className="text-[11px] text-text-tertiary mt-0.5 line-clamp-2">
                                    {highlightKeywords(res.snippet, terms)}
                                  </p>
                                )}
                              </div>
                              <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent-amber/10 text-accent-amber border border-accent-amber/20">
                                {L4(lang, { ko: "\uC815\uD655\uB3C4", en: "Relevance", ja: "Relevance", zh: "Relevance" })} {relevance}%
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {msg.results && msg.results.length === 0 && !msg.isError && (
                    <div className="mt-4 pt-4 border-t border-white/10 text-center">
                      <p className="text-sm text-text-tertiary">
                        {L4(lang, { ko: "\uAC80\uC0C9 \uACB0\uACFC \uC5C6\uC74C", en: "No results found", ja: "No results found", zh: "No results found" })}
                      </p>
                      <p className="text-xs text-text-tertiary mt-1">
                        {L4(lang, {
                          ko: "\uB2E4\uB978 \uD0A4\uC6CC\uB4DC\uB97C \uC0AC\uC6A9\uD558\uAC70\uB098, \uC9C8\uBB38\uC744 \uB354 \uAD6C\uCCB4\uC801\uC73C\uB85C \uC791\uC131\uD574 \uBCF4\uC138\uC694.",
                          en: "Try different keywords or make your question more specific.",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isSearching && (
              <div className="flex gap-4">
                 <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] bg-accent-amber/20 text-accent-amber">
                  AI
                </div>
                <div className="max-w-[85%] rounded-2xl p-4 bg-white/[0.03] border border-white/5 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSearch} className="mt-4 pt-4 border-t border-white/10 flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isSearching}
              placeholder={L4(lang, { ko: "세계관, 설정, 사건에 대해 질문하세요...", en: "Ask about your universe, settings, and events...", ja: "世界観, 設定, 사件에 대해 질문하세요...", zh: "世界观, 设置, 사条에 대해 질문하세요..." })}
              className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-amber/50 focus:bg-white/[0.04] transition-colors"
            />
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="rounded-xl bg-accent-amber/20 text-accent-amber px-6 py-3 text-sm font-medium hover:bg-accent-amber/30 disabled:opacity-50 transition-colors"
            >
              {L4(lang, { ko: "검색", en: "Search", ja: "検索", zh: "搜索" })}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
