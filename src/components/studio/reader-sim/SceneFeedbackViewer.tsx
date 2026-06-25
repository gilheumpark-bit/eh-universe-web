"use client";

// ============================================================
// SceneFeedbackViewer — 연출탭 독자 피드백 조회 뷰
// ============================================================
// sharedScenePreviews 배열에서 토큰을 선택 → loadFeedbacks 호출.
// 피드백이 없으면 empty state + 링크 복사 버튼 제공.

import { useCallback, useEffect, useState } from "react";
import type { AppLanguage } from "@/lib/studio-types";
import type { SceneFeedback } from "@/lib/scene-share";
import type { SharedScenePreview } from "@/hooks/useSceneShare";
import { L4 } from "@/lib/i18n";

interface SceneFeedbackViewerProps {
  previews: SharedScenePreview[];
  language: AppLanguage;
}

export function SceneFeedbackViewer({ previews, language }: SceneFeedbackViewerProps) {
  const isKO = language === "KO";

  const [selectedToken, setSelectedToken] = useState<string | null>(
    previews.length > 0 ? previews[previews.length - 1].token : null,
  );
  const [feedbacks, setFeedbacks] = useState<SceneFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // 선택 토큰 변경 시 피드백 로드
  useEffect(() => {
    if (!selectedToken) return;
    let cancelled = false;
    setLoading(true);
    setFeedbacks([]);
    (async () => {
      try {
        const { loadFeedbacks } = await import("@/lib/scene-share");
        const data = await loadFeedbacks(selectedToken);
        if (!cancelled) setFeedbacks(data);
      } catch {
        // 로드 실패 시 빈 배열
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedToken]);

  const copyLink = useCallback((token: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/preview/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, []);

  if (previews.length === 0) {
    return (
      <div className="text-center py-8 text-text-tertiary text-xs leading-relaxed">
        <p className="mb-1">{isKO ? "공유 링크를 생성하면 독자 피드백이 여기 모입니다." : "Create a share link to collect reader feedback here."}</p>
        <p className="text-[10px]">{isKO ? "장면 공유는 ScenePlayer 우측 상단 공유 버튼을 이용하세요." : "Use the share button in ScenePlayer to create a preview link."}</p>
      </div>
    );
  }

  const selectedPreview = previews.find((p) => p.token === selectedToken);

  return (
    <div className="space-y-4">
      {/* 공유 목록 탭 */}
      <div className="flex gap-2 flex-wrap">
        {previews.map((p) => {
          const expired = p.expiresAt < Date.now();
          return (
            <button
              key={p.token}
              onClick={() => setSelectedToken(p.token)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                selectedToken === p.token
                  ? "bg-accent-blue/20 border-accent-blue/40 text-accent-blue"
                  : expired
                    ? "bg-bg-secondary border-border text-text-tertiary opacity-50"
                    : "bg-bg-secondary border-border text-text-secondary hover:border-accent-blue/30"
              }`}
            >
              EP.{p.episode}
              {expired && (
                <span className="ml-1 text-[9px]">
                  {isKO ? "(만료)" : "(exp)"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 공유의 링크 복사 + 피드백 */}
      {selectedToken && selectedPreview && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-bg-secondary border border-border">
            <span className="text-[10px] font-mono text-text-tertiary truncate flex-1">
              /preview/{selectedToken}
            </span>
            <button
              onClick={() => copyLink(selectedToken)}
              className="shrink-0 text-[10px] px-2 py-1 rounded bg-bg-primary hover:bg-bg-secondary border border-border text-text-secondary transition-colors"
            >
              {copied ? (isKO ? "복사됨" : "Copied!") : (isKO ? "링크 복사" : "Copy link")}
            </button>
          </div>

          {loading ? (
            <div className="text-xs text-text-tertiary animate-pulse py-4 text-center">
              {L4(language, { ko: "불러오는 중...", en: "Loading..." })}
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-xs text-text-tertiary py-4 text-center">
              {L4(language, { ko: "아직 피드백이 없습니다.", en: "No feedback yet." })}
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="p-3 rounded-xl bg-bg-secondary border border-border"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-text-primary">
                      {fb.author || (isKO ? "익명" : "Anonymous")}
                    </span>
                    <span className="text-[10px] text-text-tertiary font-mono">
                      {new Date(fb.createdAt).toLocaleDateString(language === "KO" ? "ko-KR" : "en-US")}
                    </span>
                  </div>
                  {fb.sceneIndex >= 0 && (
                    <span className="text-[10px] font-mono text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded mb-1 inline-block">
                      {isKO ? `장면 ${fb.sceneIndex + 1}` : `Scene ${fb.sceneIndex + 1}`}
                    </span>
                  )}
                  <p className="text-xs text-text-secondary leading-relaxed mt-1">{fb.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: SceneFeedbackViewer | role=독자 피드백 조회 | inputs=previews,language | outputs=UI
