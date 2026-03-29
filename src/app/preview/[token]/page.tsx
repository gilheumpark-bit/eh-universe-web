"use client";

// ============================================================
// /preview/[token] — 공유 비주얼 노벨 프리뷰 페이지
// ============================================================
// 서버 불필요. Firestore에서 직접 읽어 ScenePlayer 렌더.
// 비밀번호 보호 + 만료 체크 + 피드백 수집.

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2, Lock, Clock, AlertTriangle, MessageSquare, Send, Headphones, Film } from "lucide-react";
import { loadSharedScene, verifyPassword, saveFeedback, loadFeedbacks } from "@/lib/scene-share";
import type { SharedSceneData, SceneFeedback } from "@/lib/scene-share";
import { generateVoiceMappings } from "@/engine/scene-parser";
import type { VoiceMapping } from "@/engine/scene-parser";

const ScenePlayer = dynamic(() => import("@/components/studio/ScenePlayer"), { ssr: false });

// ============================================================
// PART 1 — 상태 타입
// ============================================================

type PageState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "expired" }
  | { status: "password"; data: SharedSceneData }
  | { status: "ready"; data: SharedSceneData }
  | { status: "error"; message: string };

// IDENTITY_SEAL: PART-1 | role=state-types | inputs=none | outputs=PageState

// ============================================================
// PART 2 — 피드백 패널
// ============================================================

function FeedbackPanel({
  token,
  feedbackEnabled,
}: {
  token: string;
  feedbackEnabled: boolean;
}) {
  const [feedbacks, setFeedbacks] = useState<SceneFeedback[]>([]);
  const [comment, setComment] = useState("");
  const [author, setAuthor] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!feedbackEnabled) return;
    loadFeedbacks(token).then(setFeedbacks).catch(() => { /* P3#15: Firestore 미연결 시 무시 — 피드백 기능만 비활성 */ });
  }, [token, feedbackEnabled]);

  const handleSend = useCallback(async () => {
    if (!comment.trim()) return;
    setSending(true);
    try {
      await saveFeedback({
        token,
        sceneIndex: 0,
        comment: comment.trim(),
        author: author.trim() || "익명",
      });
      setFeedbacks((prev) => [...prev, {
        id: `local_${Date.now()}`,
        token,
        sceneIndex: 0,
        comment: comment.trim(),
        author: author.trim() || "익명",
        createdAt: Date.now(),
      }]);
      setComment("");
    } catch { /* silent */ }
    setSending(false);
  }, [token, comment, author]);

  if (!feedbackEnabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-purple/90 hover:bg-accent-purple text-white rounded-full shadow-luxury backdrop-blur-sm transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="text-xs font-[family-name:var(--font-mono)]">피드백 {feedbacks.length > 0 ? `(${feedbacks.length})` : ""}</span>
        </button>
      ) : (
        <div className="w-80 bg-bg-primary/95 backdrop-blur-md border border-border/40 rounded-2xl shadow-luxury overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
            <span className="text-xs font-[family-name:var(--font-mono)] font-semibold text-text-primary">피드백</span>
            <button onClick={() => setOpen(false)} className="text-text-tertiary hover:text-text-primary text-xs">닫기</button>
          </div>

          {/* 피드백 목록 */}
          <div className="max-h-48 overflow-y-auto p-3 space-y-2">
            {feedbacks.length === 0 && (
              <p className="text-[11px] text-text-tertiary text-center py-4">아직 피드백이 없습니다</p>
            )}
            {feedbacks.map((fb) => (
              <div key={fb.id} className="bg-bg-secondary/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-semibold text-accent-purple">{fb.author}</span>
                  <span className="text-[8px] text-text-tertiary">
                    {new Date(fb.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <p className="text-[11px] text-text-primary leading-relaxed">{fb.comment}</p>
              </div>
            ))}
          </div>

          {/* 입력 */}
          <div className="p-3 border-t border-border/20 space-y-2">
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="이름 (선택)"
              className="w-full bg-bg-tertiary/50 rounded-lg px-3 py-1.5 text-[11px] text-text-primary placeholder-text-tertiary border border-border/20 outline-none focus:border-accent-purple/40"
            />
            <div className="flex gap-1.5">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="이 장면에 대한 의견..."
                className="flex-1 bg-bg-tertiary/50 rounded-lg px-3 py-1.5 text-[11px] text-text-primary placeholder-text-tertiary border border-border/20 outline-none focus:border-accent-purple/40"
              />
              <button
                onClick={handleSend}
                disabled={sending || !comment.trim()}
                className="p-1.5 rounded-lg bg-accent-purple/20 hover:bg-accent-purple/30 disabled:opacity-30 transition-colors"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-purple" /> : <Send className="h-3.5 w-3.5 text-accent-purple" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=feedback-panel | inputs=token,feedbackEnabled | outputs=feedback-UI

// ============================================================
// PART 3 — 메인 페이지
// ============================================================

export default function PreviewPage() {
  const params = useParams();
  const token = params?.token as string;
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [passwordInput, setPasswordInput] = useState("");

  // 데이터 로드
  useEffect(() => {
    if (!token) { setState({ status: "not-found" }); return; }

    loadSharedScene(token)
      .then((data) => {
        if (!data) { setState({ status: "not-found" }); return; }
        if (data.expiresAt < Date.now()) { setState({ status: "expired" }); return; }
        if (data.password) { setState({ status: "password", data }); return; }
        setState({ status: "ready", data });
      })
      .catch((err) => setState({ status: "error", message: (err as Error).message }));
  }, [token]);

  // 비밀번호 확인
  const handlePasswordSubmit = useCallback(() => {
    if (state.status !== "password") return;
    if (verifyPassword(state.data, passwordInput)) {
      setState({ status: "ready", data: state.data });
    } else {
      setPasswordInput("");
    }
  }, [state, passwordInput]);

  // 로딩
  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent-purple" />
        <p className="text-sm text-text-secondary font-[family-name:var(--font-mono)]">로딩 중...</p>
      </div>
    );
  }

  // 만료
  if (state.status === "expired") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary gap-4">
        <Clock className="h-10 w-10 text-accent-amber" />
        <h1 className="text-lg font-semibold text-text-primary">링크가 만료되었습니다</h1>
        <p className="text-sm text-text-secondary">작가에게 새 링크를 요청해주세요.</p>
      </div>
    );
  }

  // 없음
  if (state.status === "not-found") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary gap-4">
        <AlertTriangle className="h-10 w-10 text-accent-red" />
        <h1 className="text-lg font-semibold text-text-primary">프리뷰를 찾을 수 없습니다</h1>
        <p className="text-sm text-text-secondary">링크가 잘못되었거나 삭제되었습니다.</p>
      </div>
    );
  }

  // 에러
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary gap-4">
        <AlertTriangle className="h-10 w-10 text-accent-red" />
        <h1 className="text-lg font-semibold text-text-primary">오류 발생</h1>
        <p className="text-sm text-text-secondary">{state.message}</p>
      </div>
    );
  }

  // 비밀번호
  if (state.status === "password") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary gap-6">
        <Lock className="h-10 w-10 text-accent-purple" />
        <h1 className="text-lg font-semibold text-text-primary">비밀번호가 필요합니다</h1>
        <div className="flex gap-2">
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handlePasswordSubmit(); }}
            placeholder="비밀번호 입력"
            className="bg-bg-secondary border border-border/40 rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-accent-purple/50"
            autoFocus
          />
          <button
            onClick={handlePasswordSubmit}
            className="px-5 py-2.5 bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple rounded-xl text-sm font-[family-name:var(--font-mono)] transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  // 재생
  const { data } = state;
  const [previewMode, setPreviewMode] = useState<'select' | 'radio' | 'visual'>('select');
  // P2#11 fix: 공유 데이터에서 캐릭터 이름 추출하여 음성 매핑 복원
  const voiceMappings: VoiceMapping[] = data.voiceMappings.length > 0
    ? data.voiceMappings
    : generateVoiceMappings(
        data.scenes
          .flatMap((s) => s.beats)
          .filter((b) => b.speaker)
          .reduce<{ name: string; traits: string; appearance: string; role: string; dna: number; id: string }[]>((acc, b) => {
            if (b.speaker && !acc.some((c) => c.name === b.speaker)) {
              acc.push({ id: b.speaker, name: b.speaker, traits: '', appearance: '', role: '', dna: 0 });
            }
            return acc;
          }, []),
      );

  const bgUrls = data.backgroundUrls
    ? new Map(Object.entries(data.backgroundUrls))
    : undefined;

  // 모드 선택 화면
  if (previewMode === 'select') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary gap-8">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-[family-name:var(--font-display)] font-bold text-text-primary">{data.title}</h1>
          {data.authorName && <p className="text-sm text-text-secondary">by {data.authorName}</p>}
        </div>
        <p className="text-sm text-text-tertiary">감상 방식을 선택하세요</p>
        <div className="flex gap-4">
          <button
            onClick={() => setPreviewMode('radio')}
            className="flex flex-col items-center gap-3 px-8 py-6 bg-bg-secondary hover:bg-accent-purple/10 border border-border/30 hover:border-accent-purple/40 rounded-2xl transition-all group"
          >
            <Headphones className="h-10 w-10 text-accent-purple group-hover:scale-110 transition-transform" />
            <span className="text-sm font-[family-name:var(--font-mono)] text-text-primary">🎧 라디오 드라마</span>
            <span className="text-[10px] text-text-tertiary">눈을 감고 들어보세요</span>
          </button>
          <button
            onClick={() => setPreviewMode('visual')}
            className="flex flex-col items-center gap-3 px-8 py-6 bg-bg-secondary hover:bg-accent-amber/10 border border-border/30 hover:border-accent-amber/40 rounded-2xl transition-all group"
          >
            <Film className="h-10 w-10 text-accent-amber group-hover:scale-110 transition-transform" />
            <span className="text-sm font-[family-name:var(--font-mono)] text-text-primary">🎬 비주얼 노벨</span>
            <span className="text-[10px] text-text-tertiary">그 세계에 들어가세요</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black">
      <ScenePlayer
        scenes={data.scenes}
        voiceMappings={voiceMappings}
        language="KO"
        mode={previewMode}
        showMetrics={false}
        backgroundUrls={bgUrls}
        onClose={() => setPreviewMode('select')}
      />

      <FeedbackPanel token={token} feedbackEnabled={data.feedbackEnabled} />

      {/* 하단 크레딧 */}
      <div className="fixed top-4 left-4 z-40">
        <div className="bg-bg-primary/40 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border/20">
          <p className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)]">
            {data.title} {data.authorName ? `· ${data.authorName}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=preview-page | inputs=token(URL) | outputs=full-screen-player
