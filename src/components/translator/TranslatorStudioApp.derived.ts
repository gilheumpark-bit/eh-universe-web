import { PROVIDERS, type TranslatorBackgroundMode } from "@/lib/translator-constants";
import type { ChapterEntry, TranslationMode } from "@/types/translator";
import { isTranslationChapterComplete } from "./TranslatorStudioApp.helpers";

interface TranslatorReferenceBundle {
  projectNames: string[];
}

interface TranslatorDisplayModelArgs {
  chapters: ChapterEntry[];
  projectName: string;
  langKo: boolean;
  provider: string;
  backgroundMode: TranslatorBackgroundMode;
  translationMode: TranslationMode;
  isAuthLoaded: boolean;
  userId: string | null;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  referenceBundle: TranslatorReferenceBundle;
  storySummary: string;
  lastSavedAt: number | null;
}

export function buildTranslatorDisplayModel({
  chapters,
  projectName,
  langKo,
  provider,
  backgroundMode,
  translationMode,
  isAuthLoaded,
  userId,
  supabaseUrl,
  supabaseAnonKey,
  referenceBundle,
  storySummary,
  lastSavedAt,
}: TranslatorDisplayModelArgs) {
  const completedChapters = chapters.filter(isTranslationChapterComplete).length;
  const completionRate = chapters.length ? Math.round((completedChapters / chapters.length) * 100) : 0;
  const workspaceName = projectName.trim() || (langKo ? "새 번역 작업실" : "New translation workspace");
  const providerLabel = PROVIDERS.find((item) => item.id === provider)?.label || provider.toUpperCase();
  const stripeCheckoutEnabled = Boolean(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID?.trim());
  const autoSaveLabel = lastSavedAt
    ? langKo
      ? "저장됨"
      : "Saved"
    : langKo
      ? "저장 대기"
      : "Save pending";
  const atmosphereLabel =
    backgroundMode === "bright"
      ? "Editorial White"
      : backgroundMode === "beige"
        ? "Warm Paper"
        : "Nebula Depth";
  const pipelineLabel = translationMode === "novel" ? "Narrative Pipeline" : "Auxiliary General";
  const cloudSyncEnabled = Boolean(isAuthLoaded && userId && supabaseUrl && supabaseAnonKey);
  const referenceStatusLabel = referenceBundle.projectNames.length
    ? `컨텍스트 연결: ${referenceBundle.projectNames.join(", ")}`
    : "연결 작품 없음";
  const storyBibleStatusLabel = storySummary.trim()
    ? `설정집 누적 ${storySummary.split("\n---\n").length}블록`
    : "설정집 아직 비어 있음";

  return {
    completedChapters,
    completionRate,
    workspaceName,
    providerLabel,
    stripeCheckoutEnabled,
    autoSaveLabel,
    atmosphereLabel,
    pipelineLabel,
    cloudSyncEnabled,
    referenceStatusLabel,
    storyBibleStatusLabel,
  };
}
