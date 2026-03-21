
import React, { useState } from 'react';
import { StoryConfig, Genre, AppLanguage, PlatformType } from '@/lib/studio-types';
import { TRANSLATIONS, GENRE_LABELS } from '@/lib/studio-constants';
import { Sparkles, BarChart3, Monitor, Smartphone, Shuffle } from 'lucide-react';
import { generateTensionCurveData } from '@/engine/models';

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
  ],
  [Genre.THRILLER]: [
    { ko: { title: "12번째 증인", pov: "검사 한서진", setting: "서울중앙지방법원", emotion: "집착과 의심", synopsis: "연쇄살인범 재판의 12번째 증인이 법정에서 사라졌다. 검사 한서진은 증인을 추적하지만, 증인이 남긴 메모에는 '판사가 범인이다'라고 적혀있다." }, en: { title: "The 12th Witness", pov: "Prosecutor Han Seojin", setting: "Seoul Central District Court", emotion: "Obsession and suspicion", synopsis: "The 12th witness in a serial killer trial vanishes from the courtroom. Prosecutor Han tracks the witness, but their note reads: 'The judge is the killer.'" } },
  ],
  [Genre.HORROR]: [
    { ko: { title: "505호의 초대", pov: "이수아", setting: "1970년대 아파트 단지", emotion: "공포와 호기심", synopsis: "새로 이사 온 아파트 505호에서 매일 밤 초대장이 문틈으로 밀려들어온다. '오세요'라는 한 마디만 적힌 초대장. 505호는 30년 전 폐쇄된 방이다." }, en: { title: "Invitation from 505", pov: "Sua Lee", setting: "1970s apartment complex", emotion: "Terror and curiosity", synopsis: "Every night, an invitation slides under the door of unit 505. Just two words: 'Please come.' Unit 505 was sealed shut 30 years ago." } },
  ],
  [Genre.SYSTEM_HUNTER]: [
    { ko: { title: "최하위 사냥꾼의 각성", pov: "강도현", setting: "서울 강남 게이트 구역", emotion: "절망에서 결의로", synopsis: "E랭크 최하위 헌터 강도현. 모두가 포기한 레드게이트에 홀로 남겨진 그는 죽음의 순간, 아무도 가져본 적 없는 '오류 시스템'을 각성한다. 버그인가, 축복인가." }, en: { title: "Awakening of the Lowest Hunter", pov: "Dohyeon Kang", setting: "Gangnam Gate Zone, Seoul", emotion: "Despair to resolve", synopsis: "E-rank bottom hunter Dohyeon Kang. Left alone in an abandoned Red Gate, at the moment of death he awakens the 'Error System' no one has ever possessed. Bug or blessing?" } },
  ],
  [Genre.FANTASY_ROMANCE]: [
    { ko: { title: "악녀는 두 번 죽지 않는다", pov: "아리아 벨몬트", setting: "크로노아 제국 황궁", emotion: "분노와 사랑", synopsis: "독살당한 악녀 아리아가 3년 전으로 회귀했다. 이번 생에서는 나를 죽인 약혼자 대신, 나를 지켜봤던 북방 공작을 선택한다. 그런데 그 공작이 전생의 기억을 가지고 있다." }, en: { title: "The Villainess Won't Die Twice", pov: "Aria Belmont", setting: "Imperial Palace, Chronoa Empire", emotion: "Rage and love", synopsis: "Poisoned villainess Aria regresses 3 years. This time, instead of the fiancé who killed her, she chooses the northern duke who watched over her. But he has memories of the past life too." } },
  ],
};

interface PlanningViewProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
  onStart: () => void;
}

const PlanningView: React.FC<PlanningViewProps> = ({ language, config, setConfig, onStart }) => {
  const t = TRANSLATIONS[language].planning;
  const te = TRANSLATIONS[language].engine;
  const isKO = language === 'KO';

  const totalEpisodes = config.totalEpisodes ?? 25;
  const tensionData = generateTensionCurveData(totalEpisodes, config.genre);
  const [autoGenGenre, setAutoGenGenre] = useState<Genre>(config.genre);

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
    <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-10 space-y-12 animate-in fade-in duration-700 pb-32">
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
          <button onClick={injectDemoData} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95">
            <Shuffle className="w-3.5 h-3.5" /> {isKO ? '자동 생성' : 'Auto Generate'}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/20 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.projectTitle}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              value={config.title}
              onChange={e => setConfig({ ...config, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{t.primaryGenre}</label>
            <select
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none cursor-pointer"
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
              max="100"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{language === 'KO' ? '시점 캐릭터' : 'POV Character'}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              placeholder={language === 'KO' ? '주인공 이름...' : 'Protagonist name...'}
              value={config.povCharacter}
              onChange={e => setConfig({ ...config, povCharacter: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{language === 'KO' ? '주요 배경' : 'Setting'}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              placeholder={language === 'KO' ? '장소, 시대...' : 'Place, era...'}
              value={config.setting}
              onChange={e => setConfig({ ...config, setting: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">{language === 'KO' ? '핵심 감정' : 'Core Emotion'}</label>
            <input
              className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-sm font-bold focus:border-blue-600 outline-none transition-all"
              placeholder={language === 'KO' ? '공포, 사랑, 분노...' : 'Fear, love, rage...'}
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
            <div className="flex justify-between text-[8px] text-zinc-700 mt-2">
              <span>EP.1</span>
              <span>EP.{totalEpisodes}</span>
            </div>
          </div>
        </div>

        {/* Guardrails */}
        <div className="space-y-6 pt-6 border-t border-zinc-800">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Narrative Guardrails
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                <span>{t.minDensity}</span>
                <span>{config.guardrails.min}{language === 'KO' ? '자' : ' chars'}</span>
              </div>
              <input type="range" min="1000" max="10000" step="500" className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-full appearance-none" value={config.guardrails.min} onChange={e => setConfig({...config, guardrails: {...config.guardrails, min: parseInt(e.target.value)}})} />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase">
                <span>{t.maxCapacity}</span>
                <span>{config.guardrails.max}{language === 'KO' ? '자' : ' chars'}</span>
              </div>
              <input type="range" min="2000" max="15000" step="500" className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-full appearance-none" value={config.guardrails.max} onChange={e => setConfig({...config, guardrails: {...config.guardrails, max: parseInt(e.target.value)}})} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button onClick={onStart} className="flex items-center gap-3 md:gap-4 px-8 py-4 text-lg md:px-12 md:py-6 md:text-xl bg-white text-black rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-2xl">
          <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
          {t.commence}
        </button>
      </div>
    </div>
  );
};

export default PlanningView;

