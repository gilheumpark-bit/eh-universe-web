"use client";

import { useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useLang, type Lang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import Link from "next/link";
import type { StoryConfig, Character } from "@/lib/studio-types";

// ============================================================
// PART 1 — Types & i18n
// ============================================================

interface SharedWorldData {
  title: string;
  genre: string;
  synopsis?: string;
  setting?: string;
  primaryEmotion?: string;
  characters: Character[];
  corePremise?: string;
  powerStructure?: string;
  currentConflict?: string;
  worldHistory?: string;
  socialSystem?: string;
  economy?: string;
  magicTechSystem?: string;
  culture?: string;
  religion?: string;
  taboo?: string;
  totalEpisodes?: number;
  tensionCurve?: { position: number; level: number; label: string }[];
  ehEngineLevel?: string;
}

const T: Record<Lang, {
  loading: string;
  invalidData: string;
  backHome: string;
  synopsis: string;
  setting: string;
  emotion: string;
  characters: string;
  role: string;
  traits: string;
  worldRules: string;
  corePremise: string;
  powerStructure: string;
  currentConflict: string;
  worldHistory: string;
  socialSystem: string;
  economy: string;
  magicTech: string;
  culture: string;
  religion: string;
  taboo: string;
  tensionCurve: string;
  ehEngine: string;
  ctaButton: string;
  sharedWorld: string;
  episodes: string;
  noCharacters: string;
  desire: string;
  deficiency: string;
  personality: string;
}> = {
  ko: {
    loading: "세계관 불러오는 중...",
    invalidData: "유효하지 않은 세계관 데이터입니다.",
    backHome: "← 뒤로가기",
    synopsis: "시놉시스",
    setting: "배경",
    emotion: "핵심 감정",
    characters: "등장인물",
    role: "역할",
    traits: "특성",
    worldRules: "세계관 설정",
    corePremise: "핵심 전제",
    powerStructure: "권력 구조",
    currentConflict: "현재 갈등",
    worldHistory: "역사",
    socialSystem: "사회 시스템",
    economy: "경제",
    magicTech: "마법/기술 체계",
    culture: "문화",
    religion: "종교와 신화",
    taboo: "금기와 규범",
    tensionCurve: "텐션 커브",
    ehEngine: "EH 엔진 레벨",
    ctaButton: "이 세계관으로 시작하기",
    sharedWorld: "공유된 세계관",
    episodes: "화",
    noCharacters: "등장인물 없음",
    desire: "욕망",
    deficiency: "결핍",
    personality: "성격",
  },
  en: {
    loading: "Loading world...",
    invalidData: "Invalid world data.",
    backHome: "← Go Back",
    synopsis: "Synopsis",
    setting: "Setting",
    emotion: "Core Emotion",
    characters: "Characters",
    role: "Role",
    traits: "Traits",
    worldRules: "World Rules",
    corePremise: "Core Premise",
    powerStructure: "Power Structure",
    currentConflict: "Current Conflict",
    worldHistory: "History",
    socialSystem: "Social System",
    economy: "Economy",
    magicTech: "Magic / Tech System",
    culture: "Culture",
    religion: "Religion & Mythology",
    taboo: "Taboo & Norms",
    tensionCurve: "Tension Curve",
    ehEngine: "EH Engine Level",
    ctaButton: "Start with this World",
    sharedWorld: "Shared World",
    episodes: "EP",
    noCharacters: "No characters",
    desire: "Desire",
    deficiency: "Deficiency",
    personality: "Personality",
  },
  jp: {
    loading: "世界観を読み込み中...",
    invalidData: "無効な世界観データです。",
    backHome: "← 戻る",
    synopsis: "シノプシス",
    setting: "舞台",
    emotion: "コア感情",
    characters: "登場人物",
    role: "役割",
    traits: "特徴",
    worldRules: "世界ルール",
    corePremise: "核心前提",
    powerStructure: "権力構造",
    currentConflict: "現在の対立",
    worldHistory: "歴史",
    socialSystem: "社会システム",
    economy: "経済",
    magicTech: "魔法/技術体系",
    culture: "文化",
    religion: "宗教と神話",
    taboo: "タブーと規範",
    tensionCurve: "テンションカーブ",
    ehEngine: "EHエンジンレベル",
    ctaButton: "この世界観で始める",
    sharedWorld: "共有された世界観",
    episodes: "話",
    noCharacters: "登場人物なし",
    desire: "欲望",
    deficiency: "欠如",
    personality: "性格",
  },
  cn: {
    loading: "加载世界观中...",
    invalidData: "无效的世界观数据。",
    backHome: "← 返回",
    synopsis: "梗概",
    setting: "背景",
    emotion: "核心情感",
    characters: "角色",
    role: "角色定位",
    traits: "特征",
    worldRules: "世界规则",
    corePremise: "核心前提",
    powerStructure: "权力结构",
    currentConflict: "当前冲突",
    worldHistory: "历史",
    socialSystem: "社会系统",
    economy: "经济",
    magicTech: "魔法/科技体系",
    culture: "文化",
    religion: "宗教与神话",
    taboo: "禁忌与规范",
    tensionCurve: "张力曲线",
    ehEngine: "EH引擎等级",
    ctaButton: "用这个世界观开始",
    sharedWorld: "共享的世界观",
    episodes: "集",
    noCharacters: "没有角色",
    desire: "欲望",
    deficiency: "缺失",
    personality: "性格",
  },
};

const GENRE_DISPLAY: Record<string, Record<Lang, string>> = {
  SF: { ko: "SF", en: "Sci-Fi", jp: "SF", cn: "科幻" },
  FANTASY: { ko: "판타지", en: "Fantasy", jp: "ファンタジー", cn: "奇幻" },
  ROMANCE: { ko: "로맨스", en: "Romance", jp: "ロマンス", cn: "浪漫" },
  THRILLER: { ko: "스릴러", en: "Thriller", jp: "スリラー", cn: "悬疑" },
  HORROR: { ko: "공포", en: "Horror", jp: "ホラー", cn: "恐怖" },
  SYSTEM_HUNTER: { ko: "헌터물", en: "System Hunter", jp: "ハンター", cn: "猎人" },
  FANTASY_ROMANCE: { ko: "로판", en: "Fan-Rom", jp: "ロパン", cn: "奇幻浪漫" },
};

// IDENTITY_SEAL: PART-1 | role=Types & i18n | inputs=Lang | outputs=T, SharedWorldData

// ============================================================
// PART 2 — Data Decoder
// ============================================================

function decodeWorldData(encoded: string | null): SharedWorldData | null {
  if (!encoded) return null;
  try {
    // UTF-8 safe base64 decoding
    const json = decodeURIComponent(escape(atob(encoded)));
    const parsed = JSON.parse(json);
    if (!parsed.title || !parsed.genre) return null;
    return parsed as SharedWorldData;
  } catch {
    return null;
  }
}

function encodeWorldDataForStudio(data: SharedWorldData): string {
  const config: Partial<StoryConfig> = {
    title: data.title,
    genre: data.genre as StoryConfig["genre"],
    synopsis: data.synopsis,
    setting: data.setting,
    primaryEmotion: data.primaryEmotion,
    characters: data.characters ?? [],
    corePremise: data.corePremise,
    powerStructure: data.powerStructure,
    currentConflict: data.currentConflict,
    worldHistory: data.worldHistory,
    socialSystem: data.socialSystem,
    economy: data.economy,
    magicTechSystem: data.magicTechSystem,
    culture: data.culture,
    religion: data.religion,
    taboo: data.taboo,
    totalEpisodes: data.totalEpisodes ?? 25,
  };
  if (data.tensionCurve) {
    config.sceneDirection = { tensionCurve: data.tensionCurve };
  }
  // UTF-8 safe base64 encoding (한국어/일본어 등 멀티바이트 안전)
  return btoa(unescape(encodeURIComponent(JSON.stringify(config))));
}

// IDENTITY_SEAL: PART-2 | role=Encode/Decode | inputs=base64 string | outputs=SharedWorldData

// ============================================================
// PART 3 — Sub-components
// ============================================================

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="premium-panel-soft p-5 md:p-7 space-y-3">
      <h3 className="font-[family-name:var(--font-mono)] text-[10px] font-bold tracking-[0.22em] text-accent-amber uppercase">
        {title}
      </h3>
      <div className="text-text-secondary text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function CharacterCard({ char, t }: { char: Character; t: typeof T["ko"] }) {
  return (
    <div className="premium-panel-soft p-5 space-y-3 hover:border-accent-purple/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-[family-name:var(--font-display)] text-base font-semibold text-text-primary tracking-tight">
            {char.name}
          </h4>
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-accent-purple tracking-wider uppercase">
            {char.role}
          </span>
        </div>
        {char.dna != null && (
          <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-accent-purple/30 bg-accent-purple/10 font-[family-name:var(--font-mono)] text-[10px] font-bold text-accent-purple">
            {char.dna}
          </span>
        )}
      </div>

      {char.traits && (
        <div className="flex flex-wrap gap-1.5">
          {char.traits.split(",").map((trait, i) => (
            <span
              key={i}
              className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary"
            >
              {trait.trim()}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-1 text-[11px] text-text-tertiary">
        {char.personality && (
          <p><span className="text-text-secondary font-medium">{t.personality}:</span> {char.personality}</p>
        )}
        {char.desire && (
          <p><span className="text-text-secondary font-medium">{t.desire}:</span> {char.desire}</p>
        )}
        {char.deficiency && (
          <p><span className="text-text-secondary font-medium">{t.deficiency}:</span> {char.deficiency}</p>
        )}
      </div>

      {char.appearance && (
        <p className="text-[11px] text-text-tertiary italic">{char.appearance}</p>
      )}
    </div>
  );
}

function TensionCurvePreview({ data, episodeLabel }: { data: { position: number; level: number; label: string }[]; episodeLabel: string }) {
  if (!data || data.length === 0) return null;
  const maxLevel = Math.max(...data.map((d) => d.level), 1);
  return (
    <div className="space-y-3">
      <div className="h-24 flex items-end gap-px">
        {data.map((point, i) => {
          const height = Math.round((point.level / maxLevel) * 100);
          return (
            <div key={i} className="flex-1 relative h-full group cursor-default">
              <div
                className="absolute bottom-0 w-full rounded-t-sm bg-gradient-to-t from-accent-purple/60 to-accent-blue/40 transition-all duration-300"
                style={{ height: `${height}%` }}
              />
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-bg-tertiary text-text-secondary text-[8px] px-1.5 py-0.5 rounded whitespace-nowrap border border-white/8">
                {point.label}: {point.level}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between font-[family-name:var(--font-mono)] text-[9px] text-text-tertiary">
        <span>{episodeLabel} 1</span>
        <span>{episodeLabel} {data.length}</span>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=Sub-components | inputs=SharedWorldData, Character | outputs=JSX

// ============================================================
// PART 4 — World Rule Items
// ============================================================

function WorldRuleItem({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="space-y-1.5">
      <dt className="font-[family-name:var(--font-mono)] text-[10px] font-bold tracking-[0.18em] text-text-tertiary uppercase">
        {label}
      </dt>
      <dd className="text-text-secondary text-sm leading-relaxed">{value}</dd>
    </div>
  );
}

// IDENTITY_SEAL: PART-4 | role=WorldRuleItem | inputs=label, value | outputs=JSX

// ============================================================
// PART 5 — Main Page Component
// ============================================================

export default function WorldSharePage() {
  const { lang } = useLang();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = T[lang];

  const { worldData, error, loaded } = useMemo(() => {
    const encoded = searchParams.get("data");
    if (encoded) {
      const decoded = decodeWorldData(encoded);
      if (decoded) {
        return { worldData: decoded, error: false, loaded: true };
      }
      return { worldData: null as SharedWorldData | null, error: true, loaded: true };
    }
    return { worldData: null as SharedWorldData | null, error: true, loaded: true };
  }, [searchParams]);

  const genreLabel = useMemo(() => {
    if (!worldData) return "";
    return GENRE_DISPLAY[worldData.genre]?.[lang] ?? worldData.genre;
  }, [worldData, lang]);

  const worldRules = useMemo(() => {
    if (!worldData) return [];
    return [
      { label: t.corePremise, value: worldData.corePremise },
      { label: t.powerStructure, value: worldData.powerStructure },
      { label: t.currentConflict, value: worldData.currentConflict },
      { label: t.worldHistory, value: worldData.worldHistory },
      { label: t.socialSystem, value: worldData.socialSystem },
      { label: t.economy, value: worldData.economy },
      { label: t.magicTech, value: worldData.magicTechSystem },
      { label: t.culture, value: worldData.culture },
      { label: t.religion, value: worldData.religion },
      { label: t.taboo, value: worldData.taboo },
    ].filter((r) => r.value);
  }, [worldData, t]);

  const handleStartWithWorld = () => {
    if (!worldData) return;
    const encoded = encodeWorldDataForStudio(worldData);
    router.push(`/studio?worldImport=${encoded}`);
  };

  // --- Loading state ---
  if (!loaded) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-28">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-accent-amber/40 border-t-accent-amber rounded-full animate-spin mx-auto" />
            <p className="font-[family-name:var(--font-mono)] text-xs text-text-tertiary tracking-wider">{t.loading}</p>
          </div>
        </main>
      </div>
    );
  }

  // --- Error state ---
  if (error || !worldData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-28">
          <div className="text-center space-y-6">
            <div className="text-4xl">&#x26A0;</div>
            <p className="text-text-secondary text-sm">{t.invalidData}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => router.push("/")}
                className="inline-block rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 font-[family-name:var(--font-mono)] text-xs text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors cursor-pointer"
              >
                {L4(lang, { ko: "홈으로", en: "Home", jp: "ホームへ", cn: "回到首页" })}
              </button>
              <button
                onClick={() => router.push("/studio")}
                className="inline-block rounded-full border border-accent-purple/30 bg-accent-purple/10 px-5 py-2.5 font-[family-name:var(--font-mono)] text-xs text-accent-purple hover:bg-accent-purple/20 transition-colors cursor-pointer"
              >
                {L4(lang, { ko: "스튜디오로", en: "Studio", jp: "スタジオへ", cn: "去工作室" })}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Main view ---
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-purple/[0.06] via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent-purple/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-32 right-1/4 w-80 h-80 bg-accent-blue/[0.04] rounded-full blur-[100px] pointer-events-none" />

        <div className="site-shell relative z-10 text-center space-y-5">
          <p className="font-[family-name:var(--font-mono)] text-[10px] font-bold tracking-[0.3em] text-accent-amber uppercase">
            {t.sharedWorld}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary leading-[1.1]">
            {worldData.title}
          </h1>
          <div className="flex items-center justify-center gap-4 font-[family-name:var(--font-mono)] text-xs text-text-tertiary tracking-wider">
            <span className="rounded-full border border-accent-purple/30 bg-accent-purple/10 px-3 py-1 text-accent-purple text-[10px] font-bold uppercase">
              {genreLabel}
            </span>
            {worldData.totalEpisodes && (
              <span>{worldData.totalEpisodes}{t.episodes}</span>
            )}
            {worldData.ehEngineLevel && (
              <span className="text-accent-amber">{t.ehEngine}: {worldData.ehEngineLevel}</span>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 pb-40">
        <div className="site-shell space-y-8">

          {/* Synopsis & Setting */}
          {(worldData.synopsis || worldData.setting || worldData.primaryEmotion) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {worldData.synopsis && (
                <SectionCard title={t.synopsis}>
                  <p className="whitespace-pre-wrap">{worldData.synopsis}</p>
                </SectionCard>
              )}
              <div className="space-y-4">
                {worldData.setting && (
                  <SectionCard title={t.setting}>
                    <p>{worldData.setting}</p>
                  </SectionCard>
                )}
                {worldData.primaryEmotion && (
                  <SectionCard title={t.emotion}>
                    <p>{worldData.primaryEmotion}</p>
                  </SectionCard>
                )}
              </div>
            </div>
          )}

          {/* Characters */}
          <section className="space-y-5">
            <h2 className="font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.22em] text-text-tertiary uppercase">
              {t.characters}
            </h2>
            {worldData.characters.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {worldData.characters.map((char) => (
                  <CharacterCard key={char.id || char.name} char={char} t={t} />
                ))}
              </div>
            ) : (
              <p className="text-text-tertiary text-xs font-[family-name:var(--font-mono)]">{t.noCharacters}</p>
            )}
          </section>

          {/* World Rules */}
          {worldRules.length > 0 && (
            <section className="space-y-5">
              <h2 className="font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.22em] text-text-tertiary uppercase">
                {t.worldRules}
              </h2>
              <div className="premium-panel-soft p-5 md:p-8">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {worldRules.map((rule, i) => (
                    <WorldRuleItem key={i} label={rule.label} value={rule.value} />
                  ))}
                </dl>
              </div>
            </section>
          )}

          {/* Tension Curve */}
          {worldData.tensionCurve && worldData.tensionCurve.length > 0 && (
            <section className="space-y-5">
              <h2 className="font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.22em] text-text-tertiary uppercase">
                {t.tensionCurve}
              </h2>
              <div className="premium-panel-soft p-5 md:p-8">
                <TensionCurvePreview data={worldData.tensionCurve} episodeLabel={t.episodes} />
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Floating CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none">
        <div className="bg-gradient-to-t from-bg-primary via-bg-primary/90 to-transparent pt-12 pb-6">
          <div className="site-shell flex justify-center pointer-events-auto">
            <button
              onClick={handleStartWithWorld}
              className="premium-button gap-3 text-sm shadow-luxury hover:scale-[1.03] active:scale-[0.98]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              {t.ctaButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-5 | role=Main page component | inputs=URL params | outputs=World share view
