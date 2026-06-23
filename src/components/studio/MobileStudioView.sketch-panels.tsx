"use client";

import { useState } from "react";
import { GitBranch, Globe2, Users } from "lucide-react";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import {
  generateMobileSketchId,
  type CharacterSketch,
  type MobileSketchStore,
  type PlotIdea,
  type WorldMemo,
} from "./MobileStudioView.model";

type MobileSketchPanelProps = {
  language: AppLanguage;
  store: MobileSketchStore;
  setStore: (store: MobileSketchStore) => void;
};

export function WorldMemoPanel({ language, store, setStore }: MobileSketchPanelProps) {
  const [draft, setDraft] = useState("");

  const addMemo = () => {
    const text = draft.trim();
    if (!text) return;
    const next: WorldMemo = { id: generateMobileSketchId(), text, updatedAt: Date.now() };
    setStore({ ...store, worldMemos: [next, ...store.worldMemos].slice(0, 200) });
    setDraft("");
  };

  const removeMemo = (id: string) => {
    setStore({ ...store, worldMemos: store.worldMemos.filter((memo) => memo.id !== id) });
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-text-secondary">
        <Globe2 className="w-4 h-4 text-accent-blue" />
        <h2 className="text-sm font-bold">
          {L4(language, { ko: "세계관 메모", en: "World Memos", ja: "世界観メモ", zh: "世界观备忘" })}
        </h2>
      </div>
      <p className="text-xs text-text-tertiary">
        {L4(language, {
          ko: "떠오른 설정/지명/종족/문화 등을 자유롭게 기록하세요. PC에서 정식 세계관으로 옮길 수 있습니다.",
          en: "Quickly jot down worldbuilding ideas. Transfer to full worldview on desktop.",
          ja: "浮かんだ設定・地名・種族・文化などを自由にメモしてください。PCで正式な世界観として整えられます。",
          zh: "自由记录设定、地名、种族、文化等。可在桌面端整理为完整世界观。",
        })}
      </p>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={L4(language, {
          ko: "예: 북방 대륙은 영구적 겨울이다. 엘프는 나이가 드러나지 않는다...",
          en: "e.g. The northern continent is eternally frozen. Elves do not show age...",
          ja: "例: 北方大陸は永遠の冬。エルフは年齢が表に出ない…",
          zh: "例: 北方大陆永远是冬天。精灵不显露年龄…",
        })}
        className="w-full min-h-[120px] p-3 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
      />
      <button
        onClick={addMemo}
        disabled={!draft.trim()}
        className="w-full py-3 bg-accent-blue text-white font-bold text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 transition-[transform,opacity] min-h-[44px]"
      >
        {L4(language, { ko: "메모 추가", en: "Add Memo", ja: "メモ追加", zh: "添加备忘" })}
      </button>

      <div className="flex flex-col gap-2 mt-4">
        {store.worldMemos.length === 0 && (
          <p className="text-xs text-text-quaternary text-center py-6">
            {L4(language, { ko: "아직 메모가 없습니다.", en: "No memos yet.", ja: "まだメモがありません。", zh: "暂无备忘。" })}
          </p>
        )}
        {store.worldMemos.map((memo) => (
          <div key={memo.id} className="p-3 bg-bg-secondary rounded-xl border border-border">
            <p className="text-sm text-text-primary whitespace-pre-wrap break-words">{memo.text}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-[10px] text-text-quaternary">
                {new Date(memo.updatedAt).toLocaleString()}
              </span>
              <button
                onClick={() => removeMemo(memo.id)}
                className="text-[11px] text-accent-red hover:underline min-h-[44px] min-w-[44px] px-2 flex items-center justify-center"
              >
                {L4(language, { ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CharacterSketchPanel({ language, store, setStore }: MobileSketchPanelProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [traits, setTraits] = useState("");

  const addChar = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const next: CharacterSketch = {
      id: generateMobileSketchId(),
      name: trimmedName,
      role: role.trim(),
      traits: traits.trim(),
      updatedAt: Date.now(),
    };
    setStore({ ...store, characters: [next, ...store.characters].slice(0, 100) });
    setName("");
    setRole("");
    setTraits("");
  };

  const removeChar = (id: string) => {
    setStore({ ...store, characters: store.characters.filter((character) => character.id !== id) });
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-text-secondary">
        <Users className="w-4 h-4 text-accent-purple" />
        <h2 className="text-sm font-bold">
          {L4(language, { ko: "캐릭터 스케치", en: "Character Sketches", ja: "キャラクタースケッチ", zh: "角色速写" })}
        </h2>
      </div>
      <p className="text-xs text-text-tertiary">
        {L4(language, {
          ko: "캐릭터의 이름과 핵심 특징만 빠르게 메모하세요. 상세 설정(Tier 2/3)은 PC에서 입력합니다.",
          en: "Jot down name and key traits. Detailed settings (Tier 2/3) are desktop-only.",
          ja: "キャラクターの名前と核心特徴だけ素早くメモ。詳細設定(Tier 2/3)はPCで入力します。",
          zh: "仅快速记录名称和核心特征。详细设定（Tier 2/3）需在桌面端输入。",
        })}
      </p>

      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={L4(language, { ko: "이름 (예: 카이엔)", en: "Name (e.g. Kaien)", ja: "名前 (例: カイエン)", zh: "名字 (例: 凯恩)" })}
        className="w-full px-3 py-3 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple min-h-[44px]"
      />
      <input
        value={role}
        onChange={(event) => setRole(event.target.value)}
        placeholder={L4(language, { ko: "역할 (예: 주인공, 멘토, 적대자)", en: "Role (e.g. hero, mentor, villain)", ja: "役割 (例: 主人公、メンター、敵対者)", zh: "角色 (例: 主角、导师、反派)" })}
        className="w-full px-3 py-3 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple min-h-[44px]"
      />
      <textarea
        value={traits}
        onChange={(event) => setTraits(event.target.value)}
        placeholder={L4(language, {
          ko: "특징 (예: 냉정/고독/검은 로브/과거 기사단장)",
          en: "Traits (e.g. cold, lonely, black robe, ex-knight commander)",
          ja: "特徴 (例: 冷静/孤独/黒いローブ/元騎士団長)",
          zh: "特征 (例: 冷静/孤独/黑袍/前骑士团长)",
        })}
        className="w-full min-h-[80px] p-3 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple"
      />
      <button
        onClick={addChar}
        disabled={!name.trim()}
        className="w-full py-3 bg-accent-purple text-white font-bold text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 transition-[transform,opacity] min-h-[44px]"
      >
        {L4(language, { ko: "캐릭터 추가", en: "Add Character", ja: "キャラクター追加", zh: "添加角色" })}
      </button>

      <div className="flex flex-col gap-2 mt-4">
        {store.characters.length === 0 && (
          <p className="text-xs text-text-quaternary text-center py-6">
            {L4(language, { ko: "아직 캐릭터가 없습니다.", en: "No characters yet.", ja: "まだキャラクターがありません。", zh: "暂无角色。" })}
          </p>
        )}
        {store.characters.map((character) => (
          <div key={character.id} className="p-3 bg-bg-secondary rounded-xl border border-border">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary">{character.name}</span>
                  {character.role && (
                    <span className="text-[11px] px-2 py-0.5 bg-accent-purple/20 text-accent-purple rounded-full">
                      {character.role}
                    </span>
                  )}
                </div>
                {character.traits && (
                  <p className="text-xs text-text-secondary mt-1 whitespace-pre-wrap break-words">
                    {character.traits}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeChar(character.id)}
                className="text-[11px] text-accent-red hover:underline shrink-0 min-h-[44px] min-w-[44px] px-2 flex items-center justify-center"
              >
                {L4(language, { ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlotBrainstormPanel({ language, store, setStore }: MobileSketchPanelProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const addPlot = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const next: PlotIdea = {
      id: generateMobileSketchId(),
      title: trimmedTitle,
      body: body.trim(),
      updatedAt: Date.now(),
    };
    setStore({ ...store, plots: [next, ...store.plots].slice(0, 100) });
    setTitle("");
    setBody("");
  };

  const removePlot = (id: string) => {
    setStore({ ...store, plots: store.plots.filter((plot) => plot.id !== id) });
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-text-secondary">
        <GitBranch className="w-4 h-4 text-accent-amber" />
        <h2 className="text-sm font-bold">
          {L4(language, { ko: "플롯 브레인스토밍", en: "Plot Brainstorming", ja: "プロットブレスト", zh: "情节头脑风暴" })}
        </h2>
      </div>
      <p className="text-xs text-text-tertiary">
        {L4(language, {
          ko: "\"만약 ~한다면?\" 같은 플롯 아이디어를 자유롭게 모으세요. 정식 에피소드는 PC에서 작성합니다.",
          en: "Collect \"what if\" plot ideas freely. Write proper episodes on desktop.",
          ja: "「もし〜だったら」のプロットアイデアを自由に集めてください。正式なエピソードはPCで執筆します。",
          zh: "自由收集\"如果……\"式情节创意。正式章节需在桌面端撰写。",
        })}
      </p>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={L4(language, { ko: "제목 (예: 주인공이 기억을 잃는다면?)", en: "Title (e.g. What if the hero loses memory?)", ja: "タイトル (例: 主人公が記憶を失ったら?)", zh: "标题 (例: 如果主角失忆了?)" })}
        className="w-full px-3 py-3 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber min-h-[44px]"
      />
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={L4(language, {
          ko: "전개/갈등/결말을 자유롭게 서술",
          en: "Describe development / conflict / ending freely",
          ja: "展開・葛藤・結末を自由に記述",
          zh: "自由描述发展/冲突/结局",
        })}
        className="w-full min-h-[120px] p-3 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber"
      />
      <button
        onClick={addPlot}
        disabled={!title.trim()}
        className="w-full py-3 bg-accent-amber text-bg-primary font-bold text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 transition-[transform,opacity] min-h-[44px]"
      >
        {L4(language, { ko: "아이디어 추가", en: "Add Idea", ja: "アイデア追加", zh: "添加创意" })}
      </button>

      <div className="flex flex-col gap-2 mt-4">
        {store.plots.length === 0 && (
          <p className="text-xs text-text-quaternary text-center py-6">
            {L4(language, { ko: "아직 아이디어가 없습니다.", en: "No ideas yet.", ja: "まだアイデアがありません。", zh: "暂无创意。" })}
          </p>
        )}
        {store.plots.map((plot) => (
          <div key={plot.id} className="p-3 bg-bg-secondary rounded-xl border border-border">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-text-primary">{plot.title}</h4>
                {plot.body && (
                  <p className="text-xs text-text-secondary mt-1 whitespace-pre-wrap break-words">
                    {plot.body}
                  </p>
                )}
              </div>
              <button
                onClick={() => removePlot(plot.id)}
                className="text-[11px] text-accent-red hover:underline shrink-0 min-h-[44px] min-w-[44px] px-2 flex items-center justify-center"
              >
                {L4(language, { ko: "삭제", en: "Delete", ja: "削除", zh: "删除" })}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
