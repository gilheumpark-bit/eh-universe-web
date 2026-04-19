"use client";

// ============================================================
// PART 1 — Planet Edit Client (행성 수정 폼)
// ============================================================
// owner 권한 검증 + 핵심 필드 5종 편집
// (name / summary / visibility / tags / representativeTags)
// 전체 필드 편집은 추후 확장
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getPlanetById } from "@/lib/network/reads";
import { updatePlanet } from "@/lib/network/writes";
import type { PlanetRecord, Visibility } from "@/lib/network-types";
import { logger } from "@/lib/logger";

// ============================================================
// PART 2 — Component
// ============================================================
export function PlanetEditClient({ planetId }: { planetId: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [planet, setPlanet] = useState<PlanetRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [tagsText, setTagsText] = useState("");
  const [repTagsText, setRepTagsText] = useState("");

  // 초기 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const p = await getPlanetById(planetId);
        if (cancelled) return;
        if (!p) {
          setError("행성을 찾을 수 없습니다.");
          return;
        }
        setPlanet(p);
        setName(p.name);
        setSummary(p.summary || "");
        setVisibility(p.visibility);
        setTagsText((p.tags || []).join(", "));
        setRepTagsText((p.representativeTags || []).join(", "));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "로드 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [planetId]);

  // 권한 검증
  const isOwner = user && planet && user.uid === planet.ownerId;

  const handleSave = useCallback(async () => {
    if (!user || !planet) return;
    if (!isOwner) {
      setError("행성 소유자만 수정할 수 있습니다.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updatePlanet({
        planetId,
        ownerId: user.uid,
        updates: {
          name: name.trim(),
          summary: summary.trim(),
          visibility,
          tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
          representativeTags: repTagsText.split(",").map((t) => t.trim()).filter(Boolean),
        },
      });
      router.push(`/network/planets/${planetId}`);
    } catch (err) {
      logger.warn("PlanetEdit", "update failed", err);
      setError(err instanceof Error ? err.message : "저장 실패");
      setSaving(false);
    }
  }, [user, planet, isOwner, planetId, name, summary, visibility, tagsText, repTagsText, router]);

  // ── Loading / Gate ──
  if (authLoading || loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent-amber" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-text-secondary mb-4">로그인 후 수정할 수 있습니다.</p>
          <button onClick={() => router.back()} className="premium-button secondary">돌아가기</button>
        </div>
      </div>
    );
  }

  if (!planet) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-accent-red mb-4">{error || "행성을 찾을 수 없습니다."}</p>
          <button onClick={() => router.push("/network")} className="premium-button">네트워크로</button>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-accent-amber mb-4">이 행성의 소유자만 수정할 수 있습니다.</p>
          <button onClick={() => router.push(`/network/planets/${planetId}`)} className="premium-button secondary">
            행성으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // ── Edit Form ──
  return (
    <div className="min-h-dvh bg-bg-primary text-text-primary">
      <div className="site-shell py-10 md:py-14 max-w-2xl">
        <button
          onClick={() => router.push(`/network/planets/${planetId}`)}
          className="flex items-center gap-1.5 text-text-tertiary hover:text-text-secondary text-sm mb-6 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          행성 상세로
        </button>

        <h1 className="text-2xl font-black mb-2">행성 수정</h1>
        <p className="text-sm text-text-tertiary mb-8 font-mono">{planet.name} · {planetId}</p>

        <div className="space-y-5">
          {/* name */}
          <label className="block">
            <span className="text-xs font-mono uppercase tracking-wider text-text-tertiary mb-1.5 block">이름 *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
              className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-accent-amber/50"
            />
          </label>

          {/* summary */}
          <label className="block">
            <span className="text-xs font-mono uppercase tracking-wider text-text-tertiary mb-1.5 block">한 줄 소개</span>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              maxLength={240}
              className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-accent-amber/50 resize-y"
            />
            <span className="text-[10px] text-text-tertiary font-mono">{summary.length}/240</span>
          </label>

          {/* visibility */}
          <label className="block">
            <span className="text-xs font-mono uppercase tracking-wider text-text-tertiary mb-1.5 block">공개 범위</span>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-accent-amber/50"
            >
              <option value="public">공개 (모든 사용자)</option>
              <option value="private">비공개 (본인만)</option>
              <option value="unlisted">링크 공유 (목록 미노출)</option>
            </select>
          </label>

          {/* tags */}
          <label className="block">
            <span className="text-xs font-mono uppercase tracking-wider text-text-tertiary mb-1.5 block">태그 (쉼표 구분, 최대 10개)</span>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="예: SF, 디스토피아, 시간여행"
              className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-accent-amber/50"
            />
          </label>

          {/* representative tags */}
          <label className="block">
            <span className="text-xs font-mono uppercase tracking-wider text-text-tertiary mb-1.5 block">대표 태그 (최대 6개)</span>
            <input
              type="text"
              value={repTagsText}
              onChange={(e) => setRepTagsText(e.target.value)}
              placeholder="예: SF, 디스토피아"
              className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-accent-amber/50"
            />
          </label>

          {/* error */}
          {error && (
            <div className="rounded-lg bg-accent-red/5 border border-accent-red/20 text-accent-red text-[13px] px-3 py-2">
              {error}
            </div>
          )}

          {/* actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-lg bg-accent-amber text-bg-primary font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              저장
            </button>
            <button
              type="button"
              onClick={() => router.push(`/network/planets/${planetId}`)}
              disabled={saving}
              className="min-w-[80px] min-h-[48px] rounded-lg border border-border text-text-secondary text-sm disabled:opacity-40"
            >
              취소
            </button>
          </div>

          <p className="text-[11px] text-text-tertiary font-mono leading-relaxed pt-4 border-t border-border/50">
            ※ 고도화 설정(통계·세력·물리 법칙·변종 메타)은 추후 확장. 현재는 핵심 필드 5종만.
          </p>
        </div>
      </div>
    </div>
  );
}
