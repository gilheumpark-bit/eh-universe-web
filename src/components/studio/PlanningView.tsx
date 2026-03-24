
import React, { useState } from 'react';
import { StoryConfig, Genre, AppLanguage, PlatformType, PublishPlatform } from '@/lib/studio-types';
import { PLATFORM_PRESETS, PLATFORM_BY_LANG } from '@/engine/types';
import { TRANSLATIONS, GENRE_LABELS } from '@/lib/studio-constants';
import { createT } from '@/lib/i18n';
import { validateWorld, calcCompletionScore, WarningBadge, CompletionBar } from './TierValidator';
import { Sparkles, BarChart3, Monitor, Smartphone, Shuffle, Bot, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { generateTensionCurveData } from '@/engine/models';
import { generateWorldDesign } from '@/services/geminiService';
import { getApiKey, getActiveProvider } from '@/lib/ai-providers';

// ============================================================
// Genre-specific auto-generation presets
// ============================================================

const AUTO_PRESETS: Record<string, { ko: { title: string; pov: string; setting: string; emotion: string; synopsis: string }; en: { title: string; pov: string; setting: string; emotion: string; synopsis: string } }[]> = {
  [Genre.SF]: [
    { ko: { title: "네온 심연의 관찰자", pov: "K-042", setting: "Sector 7 하층 구역", emotion: "공포와 호기심", synopsis: "AI가 지배하는 근미래 도시. 폐기물 처리 로봇 K-042는 금지된 데이터 칩을 발견한다. 그 안에는 인류의 마지막 감정 데이터가 기록되어 있었다." }, en: { title: "Observer of the Neon Abyss", pov: "K-042", setting: "Sector 7 Lower District", emotion: "Fear and curiosity", synopsis: "A near-future city ruled by AI. Waste-processing robot K-042 discovers a forbidden data chip containing humanity's last emotional records." } },
    { ko: { title: "항성간 유배지", pov: "유진 하", setting: "식민선 아르카디아호", emotion: "고독과 결의", synopsis: "반란 혐의로 냉동 수면에서 깨어난 유진 하. 600년이 흘렀고, 목적지에 도착한 배에는 자신만 남아있다. 행성 표면에서 발견한 건 인류의 것이 아닌 도시 유적." }, en: { title: "Interstellar Exile", pov: "Eugene Ha", setting: "Colony ship Arcadia", emotion: "Solitude and resolve", synopsis: "Eugene Ha wakes from cryo-sleep 600 years late. The ship arrived at its destination, but he's the only one left. On the planet surface: ruins of a city not built by humans." } },
  ],
  [Genre.FANTASY]: [
    { ko: { title: "잿빛 왕관의 계승자", pov: "리안 카이젤", setting: "몰락한 엘도라 왕국", emotion: "분노와 복수심", synopsis: "왕국이 하룻밤에 멸망했다. 유일한 생존 왕족 리안은 검은 마법사의 잿빛 왕관을 쓰고 금지된 힘을 각성한다. 왕국을 되찾기 위해 마법의 대가를 지불하며 전진하지만, 되찾을수록 잃는 것은 자신의 인간성." }, en: { title: "Heir of the Ash Crown", pov: "Lian Kaijel", setting: "Fallen Kingdom of Eldora", emotion: "Rage and vengeance", synopsis: "The kingdom fell overnight. Sole surviving royal Lian dons the dark sorcerer's Ash Crown, awakening forbidden power. Each step to reclaim the throne costs a piece of his humanity." } },
    { ko: { title: "세계수의 마지막 잎", pov: "에린", setting: "시들어가는 세계수 아래", emotion: "희망과 슬픔", synopsis: "세계수가 죽어간다. 마지막 잎 하나가 남았을 때, 숲의 정령 에린은 잎을 구하기 위해 인간 세계로 내려온다. 그러나 인간들은 세계수의 존재조차 잊었다." }, en: { title: "The Last Leaf of the World Tree", pov: "Erin", setting: "Beneath the withering World Tree", emotion: "Hope and sorrow", synopsis: "The World Tree is dying. When only one leaf remains, forest spirit Erin descends to the human world to save it. But humans have forgotten the Tree even exists." } },
  ],
  [Genre.ROMANCE]: [
    { ko: { title: "카페 라떼에 적힌 이름", pov: "서하은", setting: "서울 연남동 카페거리", emotion: "설렘과 불안", synopsis: "매일 같은 시간에 같은 카페에서 마주치는 두 사람. 서하은은 그의 라떼 잔에 적힌 이름을 보고 심장이 멈춘다. 3년 전 편지 한 장 남기고 사라진 첫사랑의 이름이었다." }, en: { title: "The Name on the Latte", pov: "Haeun Seo", setting: "Yeonnam-dong cafe street, Seoul", emotion: "Flutter and anxiety", synopsis: "Two people meet at the same cafe, same time, every day. When Haeun sees the name on his latte cup, her heart stops. It's the name of her first love who vanished three years ago." } },
    { ko: { title: "우산 하나의 거리", pov: "정민준", setting: "부산 해운대 비 오는 거리", emotion: "그리움과 용기", synopsis: "비 오는 날에만 나타나는 우산 가게 주인. 민준은 매번 우산을 사러 가지만 진짜 이유는 그녀의 미소 때문이다. 장마가 끝나면 가게도 사라진다는 소문." }, en: { title: "One Umbrella Apart", pov: "Minjun Jung", setting: "Rainy streets of Haeundae, Busan", emotion: "Longing and courage", synopsis: "An umbrella shop owner who only appears on rainy days. Minjun buys umbrellas every time, but the real reason is her smile. Rumor says the shop vanishes when the rainy season ends." } },
  ],
  [Genre.THRILLER]: [
    { ko: { title: "12번째 증인", pov: "검사 한서진", setting: "서울중앙지방법원", emotion: "집착과 의심", synopsis: "연쇄살인범 재판의 12번째 증인이 법정에서 사라졌다. 검사 한서진은 증인을 추적하지만, 증인이 남긴 메모에는 '판사가 범인이다'라고 적혀있다." }, en: { title: "The 12th Witness", pov: "Prosecutor Han Seojin", setting: "Seoul Central District Court", emotion: "Obsession and suspicion", synopsis: "The 12th witness in a serial killer trial vanishes from the courtroom. Prosecutor Han tracks the witness, but their note reads: 'The judge is the killer.'" } },
    { ko: { title: "마지막 통화", pov: "형사 박태호", setting: "서울 용산구 폐공장", emotion: "긴장과 죄책감", synopsis: "납치된 딸의 마지막 통화 녹음 3분 47초. 배경 소음 분석으로 위치를 추적하지만, 녹음 속 목소리 중 하나는 자신의 동료였다." }, en: { title: "The Last Call", pov: "Detective Park Taeho", setting: "Abandoned factory, Yongsan, Seoul", emotion: "Tension and guilt", synopsis: "3 minutes 47 seconds of his kidnapped daughter's last call. Background noise analysis leads to a location, but one voice in the recording belongs to his own partner." } },
  ],
  [Genre.HORROR]: [
    { ko: { title: "505호의 초대", pov: "이수아", setting: "1970년대 아파트 단지", emotion: "공포와 호기심", synopsis: "새로 이사 온 아파트 505호에서 매일 밤 초대장이 문틈으로 밀려들어온다. '오세요'라는 한 마디만 적힌 초대장. 505호는 30년 전 폐쇄된 방이다." }, en: { title: "Invitation from 505", pov: "Sua Lee", setting: "1970s apartment complex", emotion: "Terror and curiosity", synopsis: "Every night, an invitation slides under the door of unit 505. Just two words: 'Please come.' Unit 505 was sealed shut 30 years ago." } },
    { ko: { title: "거울 속의 나", pov: "한지연", setting: "시골 외가댁 다락방", emotion: "혼란과 공포", synopsis: "외할머니 장례 후 다락방에서 발견한 거울. 거울 속의 나는 0.5초 늦게 움직인다. 밤이 되면 그 차이는 점점 벌어진다." }, en: { title: "Me in the Mirror", pov: "Jiyeon Han", setting: "Grandmother's attic in the countryside", emotion: "Confusion and terror", synopsis: "A mirror found in the attic after grandmother's funeral. The reflection moves 0.5 seconds late. At night, the gap grows wider." } },
  ],
  [Genre.SYSTEM_HUNTER]: [
    { ko: { title: "최하위 사냥꾼의 각성", pov: "강도현", setting: "서울 강남 게이트 구역", emotion: "절망에서 결의로", synopsis: "E랭크 최하위 헌터 강도현. 모두가 포기한 레드게이트에 홀로 남겨진 그는 죽음의 순간, 아무도 가져본 적 없는 '오류 시스템'을 각성한다. 버그인가, 축복인가." }, en: { title: "Awakening of the Lowest Hunter", pov: "Dohyeon Kang", setting: "Gangnam Gate Zone, Seoul", emotion: "Despair to resolve", synopsis: "E-rank bottom hunter Dohyeon Kang. Left alone in an abandoned Red Gate, at the moment of death he awakens the 'Error System' no one has ever possessed. Bug or blessing?" } },
    { ko: { title: "듀얼 시스템", pov: "윤세라", setting: "인천 블루게이트 단지", emotion: "갈등과 성장", synopsis: "두 개의 시스템을 동시에 가진 유일한 헌터. 하나는 치유, 하나는 파괴. 동시에 쓰면 몸이 버티지 못한다. 최강의 보스 앞에서 그녀는 선택해야 한다." }, en: { title: "Dual System", pov: "Sera Yoon", setting: "Incheon Blue Gate complex", emotion: "Conflict and growth", synopsis: "The only hunter with two systems. One heals, one destroys. Using both breaks the body. Before the ultimate boss, she must choose." } },
  ],
  [Genre.FANTASY_ROMANCE]: [
    { ko: { title: "악녀는 두 번 죽지 않는다", pov: "아리아 벨몬트", setting: "크로노아 제국 황궁", emotion: "분노와 사랑", synopsis: "독살당한 악녀 아리아가 3년 전으로 회귀했다. 이번 생에서는 나를 죽인 약혼자 대신, 나를 지켜봤던 북방 공작을 선택한다. 그런데 그 공작이 전생의 기억을 가지고 있다." }, en: { title: "The Villainess Won't Die Twice", pov: "Aria Belmont", setting: "Imperial Palace, Chronoa Empire", emotion: "Rage and love", synopsis: "Poisoned villainess Aria regresses 3 years. This time, instead of the fiancé who killed her, she chooses the northern duke who watched over her. But he has memories of the past life too." } },
    { ko: { title: "계약 결혼의 조건", pov: "엘레나 크로스", setting: "아르테미아 공작저", emotion: "경계와 설렘", synopsis: "사교계 최악의 공작에게 온 계약 결혼 제안. 조건: 1년간 완벽한 부부 연기. 대가: 자유. 그런데 연기가 진심이 되어간다." }, en: { title: "Terms of the Contract Marriage", pov: "Elena Cross", setting: "Ducal estate of Artemia", emotion: "Wariness and excitement", synopsis: "A contract marriage proposal from society's worst duke. Terms: one year of perfect couple performance. Reward: freedom. But the act is becoming real." } },
  ],
};

interface PlanningViewProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  onStart: () => void;
  startLabel?: string;
}

const PlanningView: React.FC<PlanningViewProps> = ({ language, config, setConfig, onStart, startLabel }) => {
  const tl = createT(language);
  const t = TRANSLATIONS[language].planning;
  const te = TRANSLATIONS[language].engine;
  const isKO = language === 'KO';

  const totalEpisodes = config.totalEpisodes ?? 25;
  const tensionData = generateTensionCurveData(totalEpisodes, config.genre);
  const [autoGenGenre, setAutoGenGenre] = useState<Genre>(config.genre);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showWorldTier2, setShowWorldTier2] = useState(false);
  const [showWorldTier3, setShowWorldTier3] = useState(false);

  const handleAIGenerate = async () => {
    if (!getApiKey(getActiveProvider())) {
      alert(tl('planningExtra.apiKeyAlert'));
      return;
    }
    setAiGenerating(true);
    try {
      // 사용자가 입력한 값을 힌트로 전달
      const hints = {
        title: config.title || undefined,
        povCharacter: config.povCharacter || undefined,
        setting: config.setting || undefined,
        primaryEmotion: config.primaryEmotion || undefined,
        synopsis: config.synopsis || undefined,
      };
      const result = await generateWorldDesign(autoGenGenre, language, hints);
      setConfig((prev: StoryConfig) => ({
        ...prev,
        title: result.title || prev.title,
        genre: autoGenGenre,
        povCharacter: result.povCharacter || prev.povCharacter,
        setting: result.setting || prev.setting,
        primaryEmotion: result.primaryEmotion || prev.primaryEmotion,
        synopsis: result.synopsis || prev.synopsis,
        corePremise: result.corePremise || prev.corePremise,
        powerStructure: result.powerStructure || prev.powerStructure,
        currentConflict: result.currentConflict || prev.currentConflict,
        totalEpisodes: 25,
        guardrails: { min: 4000, max: 6000 },
      }));
    } catch {
      alert(tl('planningExtra.aiFailed'));
    } finally {
      setAiGenerating(false);
    }
  };

  const injectDemoData = () => {
    const presets = AUTO_PRESETS[autoGenGenre];
    if (!presets || presets.length === 0) return;
    const preset = presets[Math.floor(Math.random() * presets.length)];
    const data = isKO ? preset.ko : preset.en;
    setConfig((prev: StoryConfig) => ({
      ...prev,
      title: data.title,
      genre: autoGenGenre,
      povCharacter: data.pov,
      setting: data.setting,
      primaryEmotion: data.emotion,
      totalEpisodes: 25,
      synopsis: data.synopsis,
      guardrails: { min: 4000, max: 6000 }
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-10 space-y-12 animate-in fade-in duration-700 pb-32">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">{t.title}</h2>
          <p className="text-zinc-600 text-[10px] font-bold tracking-widest uppercase">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={autoGenGenre} onChange={e => setAutoGenGenre(e.target.value as Genre)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-black text-zinc-400 outline-none cursor-pointer uppercase">
            {Object.values(Genre).map(g => (
              <option key={g} value={g}>{GENRE_LABELS[language][g]}</option>
            ))}
          </select>
          <div className="relative">
            <button onClick={() => setShowPresetMenu(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95">
              <Shuffle className="w-3.5 h-3.5" /> {tl('planningExtra.preset')}
            </button>
            {showPresetMenu && (
              <div className="absolute top-full mt-1 right-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 min-w-[240px] max-h-[320px] overflow-y-auto">
                {(AUTO_PRESETS[autoGenGenre] || []).map((preset, i) => {
                  const data = isKO ? preset.ko : preset.en;
                  return (
                    <button key={i} onClick={() => {
                      setConfig((prev: StoryConfig) => ({
                        ...prev, title: data.title, genre: autoGenGenre, povCharacter: data.pov,
                        setting: data.setting, primaryEmotion: data.emotion, totalEpisodes: 25,
                        synopsis: data.synopsis, guardrails: { min: 4000, max: 6000 },
                      }));
                      setShowPresetMenu(false);
                    }}
                      className="w-full text-left px-4 py-3 text-[11px] text-zinc-400 hover:bg-blue-600/20 hover:text-white transition-colors border-b border-zinc-800 last:border-0">
                      <div className="font-bold text-zinc-200">{data.title}</div>
                      <div className="text-[9px] mt-0.5 opacity-70">{data.pov} · {data.emotion}</div>
                    </button>
                  );
                })}
                {(!AUTO_PRESETS[autoGenGenre] || AUTO_PRESETS[autoGenGenre].length === 0) && (
                  <div className="px-4 py-3 text-[11px] text-zinc-500">{tl('planningExtra.noPreset')}</div>
                )}
              </div>
            )}
          </div>
          <button onClick={handleAIGenerate} disabled={aiGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-all active:scale-95 disabled:opacity-50">
            {aiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
            {aiGenerating ? tl('planningExtra.aiGenerating') : tl('planningExtra.aiGenerate')}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/20 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.projectTitle}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              aria-label={t.projectTitle}
              value={config.title}
              onChange={e => setConfig({ ...config, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.primaryGenre}</label>
            <select
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none cursor-pointer"
              aria-label={t.primaryGenre}
              value={config.genre}
              onChange={e => setConfig({ ...config, genre: e.target.value as Genre })}
            >
              {Object.values(Genre).map(g => (
                <option key={g} value={g}>{GENRE_LABELS[language][g]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* New: Total Episodes + Platform */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{te.totalEpisodes}</label>
            <input
              type="number"
              min="5"
              max="300"
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              value={totalEpisodes}
              onChange={e => setConfig({ ...config, totalEpisodes: parseInt(e.target.value) || 25 })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{te.platform}</label>
            <div className="flex gap-3">
              <button
                onClick={() => setConfig({ ...config, platform: PlatformType.MOBILE })}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
                  config.platform === PlatformType.MOBILE
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                    : 'bg-black border-zinc-800 text-zinc-600 hover:text-zinc-400'
                }`}
              >
                <Smartphone className="w-4 h-4" /> {te.mobile}
              </button>
              <button
                onClick={() => setConfig({ ...config, platform: PlatformType.WEB })}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
                  config.platform === PlatformType.WEB
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                    : 'bg-black border-zinc-800 text-zinc-600 hover:text-zinc-400'
                }`}
              >
                <Monitor className="w-4 h-4" /> {te.web}
              </button>
            </div>
          </div>
        </div>

        {/* 연재 플랫폼 선택 */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">
            {tl('planningExtra.publishPlatform')}
          </label>
          <div className="flex flex-wrap gap-2">
            {[PublishPlatform.NONE, ...(PLATFORM_BY_LANG[language] || Object.values(PublishPlatform).filter(p => p !== 'NONE'))].map(pp => {
              const labels: Record<string, string> = {
                NONE: tl('planningExtra.none'),
                MUNPIA: '문피아', NOVELPIA: '노벨피아', KAKAOPAGE: '카카오페이지', SERIES: '시리즈',
                ROYAL_ROAD: 'Royal Road', WEBNOVEL: 'Webnovel', KINDLE_VELLA: 'Kindle Vella', WATTPAD: 'Wattpad',
                KAKUYOMU: 'カクヨム', NAROU: 'なろう', ALPHAPOLIS: 'アルファポリス',
                QIDIAN: '起点', JJWXC: '晋江', FANQIE: '番茄',
              };
              const selected = (config.publishPlatform || PublishPlatform.NONE) === pp;
              const preset = PLATFORM_PRESETS[pp];
              return (
                <button key={pp}
                  onClick={() => {
                    const updates: Partial<StoryConfig> = { publishPlatform: pp };
                    if (preset) {
                      updates.guardrails = { min: preset.episodeLength.min, max: preset.episodeLength.max };
                    }
                    setConfig(prev => ({ ...prev, ...updates }));
                  }}
                  className={`px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                    selected
                      ? 'bg-accent-purple/10 border-accent-purple/40 text-accent-purple'
                      : 'bg-black border-zinc-800 text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  {labels[pp] || pp}
                </button>
              );
            })}
          </div>
          {config.publishPlatform && config.publishPlatform !== PublishPlatform.NONE && PLATFORM_PRESETS[config.publishPlatform] && (
            <div className="mt-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-[10px] text-zinc-500 space-y-1">
              <div><span className="text-zinc-400 font-bold">{tl('planningExtra.target')}:</span> {PLATFORM_PRESETS[config.publishPlatform].targetReader}</div>
              <div><span className="text-zinc-400 font-bold">{tl('planningExtra.length')}:</span> {PLATFORM_PRESETS[config.publishPlatform].episodeLength.min.toLocaleString()}~{PLATFORM_PRESETS[config.publishPlatform].episodeLength.max.toLocaleString()}{tl('planningExtra.chars')}</div>
              <div><span className="text-zinc-400 font-bold">{tl('planningExtra.pace')}:</span> {PLATFORM_PRESETS[config.publishPlatform].pace}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{tl('planningExtra.povCharacter')}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              placeholder={tl('planningExtra.povPlaceholder')}
              value={config.povCharacter}
              onChange={e => setConfig({ ...config, povCharacter: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{tl('planningExtra.settingLabel')}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              placeholder={tl('planningExtra.settingPlaceholder')}
              value={config.setting}
              onChange={e => setConfig({ ...config, setting: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{tl('planningExtra.coreEmotion')}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              placeholder={tl('planningExtra.emotionPlaceholder')}
              value={config.primaryEmotion}
              onChange={e => setConfig({ ...config, primaryEmotion: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.synopsis}</label>
          <textarea
            className="w-full bg-black border border-zinc-800 rounded-2xl p-6 text-sm h-64 resize-none focus:border-blue-600 outline-none font-serif leading-relaxed"
            placeholder={t.synopsisPlaceholder}
            value={config.synopsis}
            onChange={e => setConfig({ ...config, synopsis: e.target.value })}
          />
        </div>

        {/* 세계관 뼈대 — 3-tier framework */}
        <div className="space-y-4 pt-6 border-t border-zinc-800">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{t.worldTier1}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.corePremise}</label>
              <textarea
                className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm h-24 resize-none focus:border-blue-600 outline-none leading-relaxed"
                placeholder={t.corePremisePH}
                value={config.corePremise ?? ''}
                onChange={e => setConfig({ ...config, corePremise: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.powerStructure}</label>
              <textarea
                className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm h-24 resize-none focus:border-blue-600 outline-none leading-relaxed"
                placeholder={t.powerStructurePH}
                value={config.powerStructure ?? ''}
                onChange={e => setConfig({ ...config, powerStructure: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.currentConflict}</label>
              <textarea
                className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm h-24 resize-none focus:border-blue-600 outline-none leading-relaxed"
                placeholder={t.currentConflictPH}
                value={config.currentConflict ?? ''}
                onChange={e => setConfig({ ...config, currentConflict: e.target.value })}
              />
            </div>
          </div>
          {/* 세계관 한 줄 요약 */}
          {(config.corePremise || config.currentConflict) && (
            <div className="p-4 bg-accent-purple/5 border border-accent-purple/10 rounded-xl">
              <span className="text-[10px] font-black text-accent-purple/60 uppercase tracking-widest">{t.worldFormula}</span>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                {tl('planningExtra.worldFormulaSentence')
                  .replace('{premise}', config.corePremise || '___')
                  .replace('{genre}', config.genre)
                  .replace('{power}', config.powerStructure || '___')
                  .replace('{conflict}', config.currentConflict || '___')
                }
              </p>
            </div>
          )}
          {/* 세계관 검증 */}
          {(() => {
            const warnings = validateWorld(config, language);
            const score = calcCompletionScore(warnings, 11);
            return (
              <div className="space-y-2 mt-4">
                <CompletionBar score={score} language={language} />
                <WarningBadge warnings={warnings} language={language} />
              </div>
            );
          })()}
        </div>

        {/* 세계관 2단계 — 작동 */}
        <div className="space-y-4 pt-6 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setShowWorldTier2(v => !v)}
            className="text-[10px] font-black text-zinc-600 uppercase tracking-widest cursor-pointer flex items-center gap-2 hover:text-zinc-400 transition-colors"
          >
            {showWorldTier2 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {t.worldTier2}
          </button>
          {showWorldTier2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.worldHistory}</label>
                <textarea
                  className="w-full bg-black border border-amber-500/20 rounded-xl p-3 text-sm h-20 resize-none focus:border-amber-500 outline-none leading-relaxed"
                  placeholder={t.worldHistoryPH}
                  value={config.worldHistory ?? ''}
                  onChange={e => setConfig({ ...config, worldHistory: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.socialSystem}</label>
                <textarea
                  className="w-full bg-black border border-amber-500/20 rounded-xl p-3 text-sm h-20 resize-none focus:border-amber-500 outline-none leading-relaxed"
                  placeholder={t.socialSystemPH}
                  value={config.socialSystem ?? ''}
                  onChange={e => setConfig({ ...config, socialSystem: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.economy}</label>
                <textarea
                  className="w-full bg-black border border-amber-500/20 rounded-xl p-3 text-sm h-20 resize-none focus:border-amber-500 outline-none leading-relaxed"
                  placeholder={t.economyPH}
                  value={config.economy ?? ''}
                  onChange={e => setConfig({ ...config, economy: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.magicTechSystem}</label>
                <textarea
                  className="w-full bg-black border border-amber-500/20 rounded-xl p-3 text-sm h-20 resize-none focus:border-amber-500 outline-none leading-relaxed"
                  placeholder={t.magicTechSystemPH}
                  value={config.magicTechSystem ?? ''}
                  onChange={e => setConfig({ ...config, magicTechSystem: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.factionRelations}</label>
                <textarea
                  className="w-full bg-black border border-amber-500/20 rounded-xl p-3 text-sm h-20 resize-none focus:border-amber-500 outline-none leading-relaxed"
                  placeholder={t.factionRelationsPH}
                  value={config.factionRelations ?? ''}
                  onChange={e => setConfig({ ...config, factionRelations: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.survivalEnvironment}</label>
                <textarea
                  className="w-full bg-black border border-amber-500/20 rounded-xl p-3 text-sm h-20 resize-none focus:border-amber-500 outline-none leading-relaxed"
                  placeholder={t.survivalEnvironmentPH}
                  value={config.survivalEnvironment ?? ''}
                  onChange={e => setConfig({ ...config, survivalEnvironment: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {/* 세계관 3단계 — 디테일 */}
        <div className="space-y-4 pt-6 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => setShowWorldTier3(v => !v)}
            className="text-[10px] font-black text-zinc-600 uppercase tracking-widest cursor-pointer flex items-center gap-2 hover:text-zinc-400 transition-colors"
          >
            {showWorldTier3 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {t.worldTier3}
          </button>
          {showWorldTier3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.culture}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.culturePH}
                  value={config.culture ?? ''}
                  onChange={e => setConfig({ ...config, culture: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.religion}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.religionPH}
                  value={config.religion ?? ''}
                  onChange={e => setConfig({ ...config, religion: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.education}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.educationPH}
                  value={config.education ?? ''}
                  onChange={e => setConfig({ ...config, education: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.lawOrder}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.lawOrderPH}
                  value={config.lawOrder ?? ''}
                  onChange={e => setConfig({ ...config, lawOrder: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.taboo}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.tabooPH}
                  value={config.taboo ?? ''}
                  onChange={e => setConfig({ ...config, taboo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.dailyLife}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.dailyLifePH}
                  value={config.dailyLife ?? ''}
                  onChange={e => setConfig({ ...config, dailyLife: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.travelComm}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.travelCommPH}
                  value={config.travelComm ?? ''}
                  onChange={e => setConfig({ ...config, travelComm: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.truthVsBeliefs}</label>
                <textarea
                  className="w-full bg-black border border-emerald-500/20 rounded-xl p-3 text-sm h-16 resize-none focus:border-emerald-500 outline-none leading-relaxed"
                  placeholder={t.truthVsBeliefsPH}
                  value={config.truthVsBeliefs ?? ''}
                  onChange={e => setConfig({ ...config, truthVsBeliefs: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tension Curve Preview */}
        <div className="space-y-4 pt-6 border-t border-zinc-800">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" /> {te.tensionPreview}
          </h3>
          <div className="bg-black/40 rounded-2xl border border-zinc-800/50 p-4">
            <div className="h-20 flex items-end gap-px">
              {tensionData.map((t, i) => {
                const height = Math.round(t * 100);
                const isCurrentEp = i + 1 === config.episode;
                return (
                  <div key={i} className="flex-1 relative h-full group cursor-default">
                    <div
                      className={`absolute bottom-0 w-full rounded-t-sm transition-all duration-300 ${
                        isCurrentEp
                          ? 'bg-gradient-to-t from-blue-500 to-cyan-400'
                          : 'bg-gradient-to-t from-blue-600/40 to-indigo-400/20'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                    {isCurrentEp && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full" />
                    )}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-zinc-800 text-zinc-300 text-[7px] px-1 py-0.5 rounded whitespace-nowrap">
                      EP.{i + 1}: {height}%
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-zinc-700 mt-2">
              <span>EP.1</span>
              <span>EP.{totalEpisodes}</span>
            </div>
          </div>
        </div>

        {/* Guardrails */}
        <div className="space-y-6 pt-6 border-t border-zinc-800">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> {tl('planningExtra.narrativeGuardrails')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                <span>{t.minDensity}</span>
                <span>{config.guardrails.min}{tl('planningExtra.chars')}</span>
              </div>
              <input type="range" min="1000" max="10000" step="500" aria-label={t.minDensity} className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-full appearance-none" value={config.guardrails.min} onChange={e => setConfig({...config, guardrails: {...config.guardrails, min: parseInt(e.target.value)}})} />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                <span>{t.maxCapacity}</span>
                <span>{config.guardrails.max}{tl('planningExtra.chars')}</span>
              </div>
              <input type="range" min="2000" max="15000" step="500" aria-label={t.maxCapacity} className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-full appearance-none" value={config.guardrails.max} onChange={e => setConfig({...config, guardrails: {...config.guardrails, max: parseInt(e.target.value)}})} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button onClick={onStart} className="flex items-center gap-3 md:gap-4 px-8 py-4 text-lg md:px-12 md:py-6 md:text-xl bg-white text-black rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-2xl">
          <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
          {startLabel ?? t.commence}
        </button>
      </div>
    </div>
  );
};

export default PlanningView;

