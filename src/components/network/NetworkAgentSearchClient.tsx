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
    const idToken = await user.getIdToken();
    const result = await searchAgent(queryText, {
      onlyPublic: false,
      idToken,
      userKey: user.uid,
    });

    if (result) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "agent",
          content: result.summary,
          results: result.results,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "agent",
          content: L4(lang, { ko: "검색 중 오류가 발생했습니다. 구글 클라우드 설정을 확인하시거나 잠시 후 다시 시도해 주세요.", en: "Search failed. Please try again later." }),
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
            <div className="site-kicker">{L4(lang, { ko: "로그인 필요", en: "Authentication Required" })}</div>
            <h1 className="site-title mt-3 text-3xl font-semibold">
              {L4(lang, { ko: "Agent Builder 검색을 이용하려면 로그인하세요.", en: "Sign in to use the Network Agent search." })}
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
              {L4(lang, { ko: "네트워크 기록물 AI 검색", en: "Network Archives AI Search" })}
            </h1>
            <p className="mt-2 text-sm text-text-tertiary">
              {L4(lang, { ko: "내 행성, 게시글, 그리고 공개된 세계관 정보를 의미 기반으로 통합 검색합니다.", en: "Search your planets, posts, and public universe data using semantic matching." })}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-4">
                <span className="text-4xl mb-4">🌌</span>
                <p className="text-sm font-medium">
                  {L4(lang, { ko: "\"내 세계관의 주요 사건을 요약해줘\" 같이 질문해보세요.", en: "Try asking: \"Summarize the major events in my universe.\"" })}
                </p>
              </div>
            ) : null}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === "agent" ? "flex-row" : "flex-row-reverse"}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] ${msg.role === "agent" ? "bg-accent-amber/20 text-accent-amber" : "bg-white/10 text-white"}`}>
                  {msg.role === "agent" ? "AI" : "YOU"}
                </div>
                <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === "agent" ? (msg.isError ? "bg-red-500/10 border border-red-500/20" : "bg-white/[0.03] border border-white/5") : "bg-accent-amber/10 border border-accent-amber/20"}`}>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                  {msg.results && msg.results.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                      <p className="text-[10px] font-mono tracking-widest text-text-tertiary">SOURCES</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.results.map((res, i) => (
                          <Link 
                            key={i} 
                            href={res.planetId ? `/network/posts/${res.id}` : `/network/planets/${res.id}`}
                            className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded px-2 py-1 transition-colors"
                          >
                            {res.title}
                          </Link>
                        ))}
                      </div>
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
              placeholder={L4(lang, { ko: "세계관, 설정, 사건에 대해 질문하세요...", en: "Ask about your universe, settings, and events..." })}
              className="flex-1 bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-amber/50 focus:bg-white/[0.04] transition-colors"
            />
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="rounded-xl bg-accent-amber/20 text-accent-amber px-6 py-3 text-sm font-medium hover:bg-accent-amber/30 disabled:opacity-50 transition-colors"
            >
              {L4(lang, { ko: "검색", en: "Search" })}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
