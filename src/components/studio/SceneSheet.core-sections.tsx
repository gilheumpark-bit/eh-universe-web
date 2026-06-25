"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { L4 } from "@/lib/i18n";
import {
  CLIFF_TYPES,
  EMOTIONS,
  HOOK_TYPES,
  TONE_OPTIONS,
  type CliffEntry,
  type DialogueRule,
  type EmotionPoint,
  type ForeshadowEntry,
  type GogumaEntry,
  type HookEntry,
  type Lang,
  type TensionPoint,
} from "./SceneSheet.data";
import { Section } from "./SceneSheet.parts";

type SceneSheetCoreSectionsProps = {
  lang: Lang;
  translate: (key: string) => string;
  characterNames?: string[];
  dialogueRules: DialogueRule[];
  emotions: EmotionPoint[];
  foreshadows: ForeshadowEntry[];
  gogumaLabel: string;
  gogumas: GogumaEntry[];
  hideGoguma: boolean;
  hooks: HookEntry[];
  cliffs: CliffEntry[];
  tensionPoints: TensionPoint[];
  writerNotes: string;
  setCliffs: Dispatch<SetStateAction<CliffEntry[]>>;
  setDialogueRules: Dispatch<SetStateAction<DialogueRule[]>>;
  setEmotions: Dispatch<SetStateAction<EmotionPoint[]>>;
  setForeshadows: Dispatch<SetStateAction<ForeshadowEntry[]>>;
  setGogumas: Dispatch<SetStateAction<GogumaEntry[]>>;
  setHooks: Dispatch<SetStateAction<HookEntry[]>>;
  setTensionPoints: Dispatch<SetStateAction<TensionPoint[]>>;
  setWriterNotes: Dispatch<SetStateAction<string>>;
};

export function SceneSheetCoreSections({
  lang,
  translate,
  characterNames,
  dialogueRules,
  emotions,
  foreshadows,
  gogumaLabel,
  gogumas,
  hideGoguma,
  hooks,
  cliffs,
  tensionPoints,
  writerNotes,
  setCliffs,
  setDialogueRules,
  setEmotions,
  setForeshadows,
  setGogumas,
  setHooks,
  setTensionPoints,
  setWriterNotes,
}: SceneSheetCoreSectionsProps) {
  const sortedEmotions = useMemo(() => [...emotions].sort((a, b) => a.position - b.position), [emotions]);

  return (
    <>
      <div className="mb-2">
        <span className="text-[9px] font-black text-accent-purple uppercase tracking-widest">
          {L4(lang, { ko: "이번 화에 꼭 설정할 것", en: "Must-set for this episode", ja: "今回必ず設定", zh: "本话必设" })}
        </span>
      </div>

      <Section
        title={L4(lang, { ko: "줄거리", en: "Story", ja: "ストーリー", zh: "故事" })}
        highlight
        desc={L4(lang, {
          ko: "이번 화의 줄거리, 고구마/사이다, 클리프행어를 설계합니다",
          en: "Design this episode's story, tension/release, and cliffhanger",
          ja: "ストーリー・テンション・クリフハンガーを設計",
          zh: "设计故事、张力/释放和悬念",
        })}
        badge={(() => {
          const items = [writerNotes.trim(), gogumas.length > 0, cliffs.length > 0, foreshadows.length > 0, hooks.length > 0];
          const filled = items.filter(Boolean).length;
          return `${filled}/5 ${L4(lang, { ko: "항목 설정", en: "set", ja: "項目設定", zh: "项目设置" })}`;
        })()}
      >
        <input
          value={writerNotes.split("\n")[0] ?? ""}
          onChange={(event) => {
            const lines = writerNotes.split("\n");
            lines[0] = event.target.value;
            setWriterNotes(lines.join("\n"));
          }}
          placeholder={L4(lang, {
            ko: "이번 화 요약 (한 줄)",
            en: "Episode summary (one line)",
            ja: "Episode summary (one line)",
            zh: "Episode summary (one line)",
          })}
          maxLength={200}
          className="w-full bg-bg-primary border border-border rounded px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple transition-colors min-h-[44px]"
        />

        {!hideGoguma && (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-amber shrink-0" />
              <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{gogumaLabel}</span>
            </div>
            <p className="text-[9px] text-text-quaternary mt-0.5 mb-1">
              {L4(lang, {
                ko: "독자가 답답함을 느끼는 장치 (해소 시 사이다)",
                en: "Device that builds frustration (releases as catharsis)",
                ja: "読者がもどかしさを感じる仕掛け",
                zh: "让读者感到焦急的装置 (释放时的爽快感)",
              })}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {(["small", "medium", "large"] as const).map((intensity) => (
                <button
                  key={`g-${intensity}`}
                  onClick={() => setGogumas((prev) => [...prev, { id: `g-${Date.now()}`, type: "goguma", intensity, desc: "", episode: 1 }])}
                  className="px-2.5 py-1.5 bg-amber-600/10 border border-amber-600/30 rounded text-[10px] font-bold text-amber-500 hover:bg-amber-600/20 transition-colors min-h-[44px]"
                >
                  {L4(
                    lang,
                    {
                      small: { ko: "소", en: "S", ja: "小", zh: "小" },
                      medium: { ko: "중", en: "M", ja: "中", zh: "中" },
                      large: { ko: "대", en: "L", ja: "大", zh: "大" },
                    }[intensity],
                  )}
                </button>
              ))}
              <button
                onClick={() => setGogumas((prev) => [...prev, { id: `g-${Date.now()}`, type: "cider", intensity: "large", desc: "", episode: 1 }])}
                className="px-2.5 py-1.5 bg-cyan-600/10 border border-cyan-600/30 rounded text-[10px] font-bold text-cyan-400 hover:bg-cyan-600/20 transition-colors min-h-[44px]"
              >
                {L4(lang, { ko: "사이다", en: "Cider", ja: "サイダー", zh: "解除" })}
              </button>
            </div>
            {gogumas.map((goguma, index) => (
              <div key={goguma.id} className={`flex items-center gap-2 mt-1.5 border rounded px-2.5 py-2 ${goguma.type === "goguma" ? "border-amber-600/30 bg-amber-600/5" : "border-cyan-500/30 bg-cyan-500/5"}`}>
                <span className="text-[9px] font-bold uppercase min-w-[32px]">{goguma.type === "goguma" ? goguma.intensity[0].toUpperCase() : "R"}</span>
                <input
                  value={goguma.desc}
                  onChange={(event) => setGogumas((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, desc: event.target.value } : item)))}
                  placeholder={L4(lang, { ko: "설명...", en: "Description...", ja: "説明...", zh: "描述..." })}
                  maxLength={500}
                  className="flex-1 bg-transparent text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 text-text-secondary min-h-[44px]"
                />
                <button
                  onClick={() => setGogumas((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                  aria-label={L4(lang, { ko: `고구마/사이다 ${index + 1} 삭제`, en: `Delete tension/release ${index + 1}`, ja: `テンション ${index + 1} を削除`, zh: `删除张力 ${index + 1}` })}
                  className="text-text-tertiary hover:text-accent-red text-xs min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
                >
                  &#10005;
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-red shrink-0" />
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "클리프행어", en: "Cliffhanger", ja: "クリフハンガー", zh: "悬念" })}</span>
          </div>
          <p className="text-[9px] text-text-quaternary mt-0.5 mb-1">
            {L4(lang, { ko: "화 끝에 긴장감을 남기는 방법", en: "How to leave tension at the end of the episode", ja: "エピソード終わりに緊張感を残す方法", zh: "在每话结尾留下悬念的方法" })}
          </p>
          <div className="flex gap-2 mt-1.5">
            <select
              value={cliffs[0]?.cliffType ?? ""}
              onChange={(event) => {
                if (cliffs.length === 0) setCliffs([{ id: `cl-${Date.now()}`, cliffType: event.target.value, desc: "", episode: 1 }]);
                else setCliffs((prev) => [{ ...prev[0], cliffType: event.target.value }, ...prev.slice(1)]);
              }}
              className="bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]"
            >
              <option value="">{L4(lang, { ko: "-- 선택 --", en: "-- Select --", ja: "-- 選択 --", zh: "-- 选择 --" })}</option>
              {CLIFF_TYPES.map((cliffType) => <option key={cliffType.id} value={cliffType.id}>{L4(lang, cliffType)}</option>)}
            </select>
            <input
              value={cliffs[0]?.desc ?? ""}
              onChange={(event) => {
                if (cliffs.length === 0) setCliffs([{ id: `cl-${Date.now()}`, cliffType: "crisis-cut", desc: event.target.value, episode: 1 }]);
                else setCliffs((prev) => [{ ...prev[0], desc: event.target.value }, ...prev.slice(1)]);
              }}
              placeholder={L4(lang, { ko: "클리프행어 내용...", en: "Cliffhanger content...", ja: "クリフハンガー内容...", zh: "悬念钩子内容..." })}
              maxLength={500}
              className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "복선/떡밥", en: "Foreshadow", ja: "伏線", zh: "伏笔" })}</span>
            <button onClick={() => setForeshadows((prev) => [...prev, { id: `fs-${Date.now()}`, planted: "", payoff: "", episode: 1, resolved: false }])} className="text-[13px] text-accent-purple hover:underline min-h-[44px]">
              + {L4(lang, { ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
            </button>
          </div>
          {foreshadows.map((foreshadow, index) => (
            <div key={foreshadow.id} className="flex items-center gap-2 mt-1 border border-border rounded px-2 py-1.5 bg-bg-primary text-[10px]">
              <input value={foreshadow.planted} onChange={(event) => setForeshadows((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, planted: event.target.value } : item)))} placeholder={L4(lang, { ko: "심기", en: "Plant", ja: "Plant", zh: "Plant" })} maxLength={500} className="flex-1 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
              <span className="text-text-tertiary">&#8594;</span>
              <input value={foreshadow.payoff} onChange={(event) => setForeshadows((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, payoff: event.target.value } : item)))} placeholder={L4(lang, { ko: "회수", en: "Payoff", ja: "Payoff", zh: "Payoff" })} maxLength={500} className="flex-1 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
              <label className="flex items-center gap-1 text-[9px] text-text-tertiary cursor-pointer">
                <input type="checkbox" checked={foreshadow.resolved} onChange={(event) => setForeshadows((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, resolved: event.target.checked } : item)))} className="accent-accent-green" />
                {L4(lang, { ko: "완료", en: "Done", ja: "完了", zh: "完成" })}
              </label>
              <button onClick={() => setForeshadows((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} aria-label={L4(lang, { ko: `복선 ${index + 1} 삭제`, en: `Delete foreshadow ${index + 1}`, ja: `伏線 ${index + 1} を削除`, zh: `删除伏笔 ${index + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={L4(lang, { ko: "분위기 · 훅", en: "Mood · Hooks", ja: "ムード · フック", zh: "氛围 · 钩子" })}
        highlight
        desc={L4(lang, { ko: "감정선과 훅(독자 유입 장치)을 설계합니다", en: "Design emotion arcs and hooks to engage readers", ja: "感情線とフックを設計", zh: "设计情绪曲线和读者引入装置" })}
        badge={emotions.length > 0 ? `${L4(lang, { ko: "감정", en: "Emotion", ja: "Emotion", zh: "Emotion" })}: ${emotions[0].emotion} ${Math.round(emotions[0].intensity)}%` : undefined}
      >
        <div>
          <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "감정", en: "Emotion", ja: "感情", zh: "情绪" })}</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {EMOTIONS.map((emotion) => (
              <button key={emotion} onClick={() => setEmotions((prev) => [...prev, { id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, position: prev.length * 20, emotion, intensity: 50 }])} className="px-2.5 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors min-h-[44px]">
                {emotion}
              </button>
            ))}
          </div>
          {emotions.length > 0 && (
            <div className="relative h-20 border border-border rounded-lg bg-bg-primary overflow-hidden mt-2">
              <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none" role="img" aria-label={L4(lang, { ko: "감정 곡선", en: "Emotion curve", ja: "Emotion curve", zh: "Emotion curve" })}>
                {emotions.length >= 2 && <polyline fill="none" stroke="var(--color-accent-purple)" strokeWidth="0.5" points={sortedEmotions.map((emotion) => `${emotion.position},${50 - emotion.intensity / 2}`).join(" ")} />}
                {emotions.map((emotion) => <circle key={emotion.id} cx={emotion.position} cy={50 - emotion.intensity / 2} r="1.5" fill="var(--color-accent-purple)" />)}
              </svg>
            </div>
          )}
          {emotions.map((emotion, index) => (
            <div key={emotion.id} className="flex items-center gap-2 mt-1.5 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
              <span className="text-[10px] font-bold w-12 truncate">{emotion.emotion}</span>
              <input type="range" min={0} max={100} value={emotion.intensity} aria-label={L4(lang, { ko: "감정 강도", en: "Emotion intensity", ja: "Emotion intensity", zh: "Emotion intensity" })} onChange={(event) => setEmotions((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, intensity: parseInt(event.target.value) } : item)))} className="flex-1 h-1 accent-accent-purple" />
              <span className="text-[9px] font-bold text-accent-purple w-6 text-right">{emotion.intensity}</span>
              <button onClick={() => setEmotions((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} aria-label={L4(lang, { ko: `감정점 ${index + 1} 삭제`, en: `Delete emotion point ${index + 1}`, ja: `感情点 ${index + 1} を削除`, zh: `删除情感点 ${index + 1}` })} className="text-text-tertiary hover:text-accent-red text-xs min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
            </div>
          ))}
        </div>

        <div>
          <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "텐션 레벨", en: "Tension Level", ja: "テンション", zh: "张力等级" })}</span>
          {tensionPoints.length === 0 && (
            <button onClick={() => setTensionPoints([{ id: `tp-${Date.now()}`, position: 50, level: 50, label: "" }])} className="block mt-1 text-[13px] text-accent-purple hover:underline min-h-[44px]">
              + {L4(lang, { ko: "텐션 포인트 추가", en: "Add Tension Point", ja: "テンションポイントを追加", zh: "添加张力点" })}
            </button>
          )}
          {tensionPoints.length > 0 &&
            tensionPoints.slice(0, 1).map((point, index) => (
              <div key={point.id} className="flex items-center gap-2 mt-1.5">
                <input type="range" min={0} max={100} value={point.level} aria-label={L4(lang, { ko: "텐션 레벨", en: "Tension level", ja: "Tension level", zh: "Tension level" })} onChange={(event) => setTensionPoints((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, level: parseInt(event.target.value) } : item)))} className="flex-1 h-1 accent-accent-red" />
                <span className="text-[10px] font-bold text-accent-red w-10 text-right">{point.level}%</span>
              </div>
            ))}
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-purple shrink-0" />
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "훅 배치", en: "Hook Design", ja: "フック", zh: "钩子" })}</span>
          </div>
          <p className="text-[9px] text-text-quaternary mt-0.5 mb-1">{L4(lang, { ko: "독자가 다음 화를 클릭하게 만드는 요소", en: "Elements that make readers click the next episode", ja: "読者が次話をクリックしたくなる要素", zh: "让读者点击下一话的要素" })}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {(["opening", "middle", "ending"] as const).map((position) => (
              <button key={position} onClick={() => setHooks((prev) => [...prev, { id: `h-${Date.now()}`, position, hookType: "question", desc: "" }])} className="px-2.5 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple transition-colors min-h-[44px]">
                + {L4(lang, {
                  opening: { ko: "오프닝", en: "Opening", ja: "オープニング", zh: "开头" },
                  middle: { ko: "미들", en: "Middle", ja: "ミドル", zh: "中间" },
                  ending: { ko: "엔딩", en: "Ending", ja: "エンディング", zh: "结尾" },
                }[position])}
              </button>
            ))}
          </div>
          {hooks.map((hook, index) => (
            <div key={hook.id} className="flex items-center gap-2 mt-1.5 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${hook.position === "opening" ? "bg-accent-blue/10 text-accent-blue" : hook.position === "ending" ? "bg-accent-red/10 text-accent-red" : "bg-amber-500/10 text-amber-400"}`}>{hook.position}</span>
              <select value={hook.hookType} onChange={(event) => setHooks((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, hookType: event.target.value } : item)))} className="bg-bg-secondary border border-border rounded px-1.5 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]">
                {HOOK_TYPES.map((hookType) => <option key={hookType.id} value={hookType.id}>{L4(lang, hookType)}</option>)}
              </select>
              <input value={hook.desc} onChange={(event) => setHooks((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, desc: event.target.value } : item)))} placeholder={L4(lang, { ko: "훅 내용...", en: "Hook content...", ja: "フック内容...", zh: "钩子内容..." })} maxLength={500} className="flex-1 bg-transparent text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
              <button onClick={() => setHooks((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} aria-label={L4(lang, { ko: `훅 ${index + 1} 삭제`, en: `Delete hook ${index + 1}`, ja: `フック ${index + 1} を削除`, zh: `删除钩子 ${index + 1}` })} className="text-text-tertiary hover:text-accent-red text-xs min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
            </div>
          ))}
        </div>
      </Section>

      <div className="mt-4 mb-2">
        <span className="text-[9px] font-bold text-text-quaternary uppercase tracking-widest">
          {L4(lang, { ko: "추가 설정", en: "Additional Settings", ja: "追加設定", zh: "附加设置" })}
        </span>
      </div>

      <Section
        title={L4(lang, { ko: "캐릭터", en: "Cast", ja: "キャスト", zh: "角色" })}
        defaultOpen={false}
        desc={L4(lang, { ko: "캐릭터별 대사 톤과 등장 규칙", en: "Dialogue tone and rules per character", ja: "キャラクター別台詞トーンとルール", zh: "角色对话语气和规则" })}
        badge={dialogueRules.length > 0 ? `${dialogueRules.length}${L4(lang, { ko: "명 선택", en: " selected", ja: "名 選択", zh: "人 选择" })}` : characterNames && characterNames.length > 0 ? `${characterNames.length}${L4(lang, { ko: "명 등록", en: " available", ja: "名 登録", zh: "人 提交" })}` : undefined}
      >
        {characterNames && characterNames.length > 0 ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button onClick={() => setDialogueRules(characterNames.map((name) => ({ id: `d-${Date.now()}-${name}`, character: name, tone: "", notes: "" })))} className="text-[13px] text-accent-purple hover:underline min-h-[44px]">{L4(lang, { ko: "전체 선택", en: "Select All", ja: "すべて 選択", zh: "全部 选择" })}</button>
              <button onClick={() => setDialogueRules([])} className="text-[13px] text-text-tertiary hover:underline min-h-[44px]">{L4(lang, { ko: "초기화", en: "Clear All", ja: "リセット", zh: "重置" })}</button>
            </div>
            {characterNames.map((name) => {
              const rule = dialogueRules.find((item) => item.character === name);
              const isActive = Boolean(rule);
              return (
                <div key={name} className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input type="checkbox" checked={isActive} onChange={(event) => {
                      if (event.target.checked) setDialogueRules((prev) => [...prev, { id: `d-${Date.now()}-${name}`, character: name, tone: "", notes: "" }]);
                      else setDialogueRules((prev) => prev.filter((item) => item.character !== name));
                    }} className="accent-accent-purple" />
                    <span className="text-xs font-bold">{name}</span>
                  </label>
                  {isActive && (
                    <select value={rule?.tone ?? ""} onChange={(event) => setDialogueRules((prev) => prev.map((item) => (item.character === name ? { ...item, tone: event.target.value } : item)))} className="bg-bg-secondary border border-border rounded px-2 py-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]">
                      <option value="">{L4(lang, { ko: "톤 선택", en: "Select tone", ja: "トーン選択", zh: "选择语调" })}</option>
                      {TONE_OPTIONS.map((tone) => <option key={tone.id} value={tone.id}>{L4(lang, tone)}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <button onClick={() => setDialogueRules((prev) => [...prev, { id: `d-${Date.now()}`, character: "", tone: "", notes: "" }])} className="text-[13px] text-accent-purple hover:underline min-h-[44px]">
              + {L4(lang, { ko: "캐릭터 대사 규칙 추가", en: "Add Dialogue Rule", ja: "キャラクターの台詞ルールを追加", zh: "添加角色台词规则" })}
            </button>
            {dialogueRules.map((rule, index) => (
              <div key={rule.id} className="flex items-center gap-2 border border-border rounded px-2.5 py-1.5 bg-bg-primary">
                <input value={rule.character} onChange={(event) => setDialogueRules((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, character: event.target.value } : item)))} placeholder={L4(lang, { ko: "캐릭터명", en: "Character", ja: "キャラクター名", zh: "角色人" })} maxLength={100} className="w-24 bg-bg-secondary border border-border rounded px-2 py-1.5 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                <input value={rule.tone} onChange={(event) => setDialogueRules((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, tone: event.target.value } : item)))} placeholder={L4(lang, { ko: "톤", en: "Tone", ja: "Tone", zh: "Tone" })} maxLength={200} className="flex-1 bg-bg-secondary border border-border rounded px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]" />
                <button onClick={() => setDialogueRules((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} aria-label={L4(lang, { ko: `대사 규칙 ${index + 1} 삭제`, en: `Delete dialogue rule ${index + 1}`, ja: `台詞ルール ${index + 1} を削除`, zh: `删除对话规则 ${index + 1}` })} className="text-text-tertiary hover:text-accent-red min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">&#10005;</button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="pt-2">
        <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">{L4(lang, { ko: "작가 메모", en: "Writer Notes", ja: "作家メモ", zh: "作者笔记" })}</span>
        <textarea
          value={writerNotes}
          onChange={(event) => setWriterNotes(event.target.value)}
          maxLength={10000}
          className="w-full mt-1 min-h-[80px] bg-bg-primary border border-border rounded-lg p-3 text-sm leading-relaxed text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple transition-colors resize-y"
          placeholder={translate("sceneSheet.writerNotesPlaceholder")}
        />
        <div className="text-[9px] text-text-tertiary font-mono mt-0.5">
          {writerNotes.length.toLocaleString()}
          {translate("sceneSheet.chars")}
        </div>
      </div>
    </>
  );
}
