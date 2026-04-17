// ============================================================
// MobileStudioView — 모바일 전용 스튜디오 (세계관/캐릭터/플롯 스케치)
// ============================================================
// 모바일은 PC급 집필·번역·코드 스튜디오를 지원하지 않는다.
// 아이디어 단계(메모/스케치/브레인스토밍)만 가능하고,
// 본격 집필은 "데스크톱에서 이용 가능" 안내로 잠근다.
// ============================================================

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Globe2, Users, GitBranch, Sparkles, Info, BookOpen, Monitor } from 'lucide-react';
import { L4 } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/studio-types';

// ============================================================
// PART 1 — 타입 및 상수
// ============================================================

type MobileTab = 'world' | 'characters' | 'plots';

interface Props {
  language: AppLanguage;
  /** 데스크톱 사용을 안내하는 CTA 클릭 콜백 (예: 공유 링크 복사) */
  onDesktopCTA?: () => void;
}

interface WorldMemo {
  id: string;
  text: string;
  updatedAt: number;
}

interface CharacterSketch {
  id: string;
  name: string;
  role: string;
  traits: string;
  updatedAt: number;
}

interface PlotIdea {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

const STORAGE_KEY = 'noa_mobile_sketch';

function generateId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================
// PART 2 — 로컬 저장소 (모바일 스케치는 클라우드 동기화 없음, 로컬만)
// ============================================================

interface MobileSketchStore {
  worldMemos: WorldMemo[];
  characters: CharacterSketch[];
  plots: PlotIdea[];
}

const DEFAULT_STORE: MobileSketchStore = { worldMemos: [], characters: [], plots: [] };

function loadStore(): MobileSketchStore {
  if (typeof window === 'undefined') return DEFAULT_STORE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STORE;
    const parsed = JSON.parse(raw) as MobileSketchStore;
    return {
      worldMemos: Array.isArray(parsed.worldMemos) ? parsed.worldMemos : [],
      characters: Array.isArray(parsed.characters) ? parsed.characters : [],
      plots: Array.isArray(parsed.plots) ? parsed.plots : [],
    };
  } catch {
    return DEFAULT_STORE;
  }
}

function saveStore(store: MobileSketchStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch { /* quota */ }
}

// ============================================================
// PART 3 — 세계관 메모 탭
// ============================================================

function WorldMemoPanel({ language, store, setStore }: { language: AppLanguage; store: MobileSketchStore; setStore: (s: MobileSketchStore) => void }) {
  const [draft, setDraft] = useState('');

  const addMemo = () => {
    const text = draft.trim();
    if (!text) return;
    const next: WorldMemo = { id: generateId(), text, updatedAt: Date.now() };
    setStore({ ...store, worldMemos: [next, ...store.worldMemos].slice(0, 200) });
    setDraft('');
  };

  const removeMemo = (id: string) => {
    setStore({ ...store, worldMemos: store.worldMemos.filter(m => m.id !== id) });
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-text-secondary">
        <Globe2 className="w-4 h-4 text-accent-blue" />
        <h3 className="text-sm font-bold">
          {L4(language, { ko: '세계관 메모', en: 'World Memos', ja: '世界観メモ', zh: '世界观备忘' })}
        </h3>
      </div>
      <p className="text-xs text-text-tertiary">
        {L4(language, {
          ko: '떠오른 설정/지명/종족/문화 등을 자유롭게 기록하세요. PC에서 정식 세계관으로 옮길 수 있습니다.',
          en: 'Quickly jot down worldbuilding ideas. Transfer to full worldview on desktop.',
          ja: '浮かんだ設定・地名・種族・文化などを自由にメモしてください。PCで正式な世界観として整えられます。',
          zh: '自由记录设定、地名、种族、文化等。可在桌面端整理为完整世界观。',
        })}
      </p>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder={L4(language, {
          ko: '예: 북방 대륙은 영구적 겨울이다. 엘프는 나이가 드러나지 않는다...',
          en: 'e.g. The northern continent is eternally frozen. Elves do not show age...',
          ja: '例: 北方大陸は永遠の冬。エルフは年齢が表に出ない…',
          zh: '例: 北方大陆永远是冬天。精灵不显露年龄…',
        })}
        className="w-full min-h-[120px] p-3 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
      />
      <button
        onClick={addMemo}
        disabled={!draft.trim()}
        className="w-full py-3 bg-accent-blue text-white font-bold text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 transition-all min-h-[44px]"
      >
        {L4(language, { ko: '메모 추가', en: 'Add Memo', ja: 'メモ追加', zh: '添加备忘' })}
      </button>

      <div className="flex flex-col gap-2 mt-4">
        {store.worldMemos.length === 0 && (
          <p className="text-xs text-text-quaternary text-center py-6">
            {L4(language, { ko: '아직 메모가 없습니다.', en: 'No memos yet.', ja: 'まだメモがありません。', zh: '暂无备忘。' })}
          </p>
        )}
        {store.worldMemos.map(m => (
          <div key={m.id} className="p-3 bg-bg-secondary rounded-xl border border-border">
            <p className="text-sm text-text-primary whitespace-pre-wrap break-words">{m.text}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-[10px] text-text-quaternary">
                {new Date(m.updatedAt).toLocaleString()}
              </span>
              <button
                onClick={() => removeMemo(m.id)}
                className="text-[11px] text-accent-red hover:underline min-h-[44px] min-w-[44px] px-2 flex items-center justify-center"
              >
                {L4(language, { ko: '삭제', en: 'Delete', ja: '削除', zh: '删除' })}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PART 4 — 캐릭터 스케치 탭
// ============================================================

function CharacterSketchPanel({ language, store, setStore }: { language: AppLanguage; store: MobileSketchStore; setStore: (s: MobileSketchStore) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [traits, setTraits] = useState('');

  const addChar = () => {
    const n = name.trim();
    if (!n) return;
    const next: CharacterSketch = {
      id: generateId(),
      name: n,
      role: role.trim(),
      traits: traits.trim(),
      updatedAt: Date.now(),
    };
    setStore({ ...store, characters: [next, ...store.characters].slice(0, 100) });
    setName(''); setRole(''); setTraits('');
  };

  const removeChar = (id: string) => {
    setStore({ ...store, characters: store.characters.filter(c => c.id !== id) });
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-text-secondary">
        <Users className="w-4 h-4 text-accent-purple" />
        <h3 className="text-sm font-bold">
          {L4(language, { ko: '캐릭터 스케치', en: 'Character Sketches', ja: 'キャラクタースケッチ', zh: '角色速写' })}
        </h3>
      </div>
      <p className="text-xs text-text-tertiary">
        {L4(language, {
          ko: '캐릭터의 이름과 핵심 특징만 빠르게 메모하세요. 상세 설정(Tier 2/3)은 PC에서 입력합니다.',
          en: 'Jot down name and key traits. Detailed settings (Tier 2/3) are desktop-only.',
          ja: 'キャラクターの名前と核心特徴だけ素早くメモ。詳細設定(Tier 2/3)はPCで入力します。',
          zh: '仅快速记录名称和核心特征。详细设定（Tier 2/3）需在桌面端输入。',
        })}
      </p>

      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={L4(language, { ko: '이름 (예: 카이엔)', en: 'Name (e.g. Kaien)', ja: '名前 (例: カイエン)', zh: '名字 (例: 凯恩)' })}
        className="w-full px-3 py-3 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple min-h-[44px]"
      />
      <input
        value={role}
        onChange={e => setRole(e.target.value)}
        placeholder={L4(language, { ko: '역할 (예: 주인공, 멘토, 적대자)', en: 'Role (e.g. hero, mentor, villain)', ja: '役割 (例: 主人公、メンター、敵対者)', zh: '角色 (例: 主角、导师、反派)' })}
        className="w-full px-3 py-3 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple min-h-[44px]"
      />
      <textarea
        value={traits}
        onChange={e => setTraits(e.target.value)}
        placeholder={L4(language, {
          ko: '특징 (예: 냉정/고독/검은 로브/과거 기사단장)',
          en: 'Traits (e.g. cold, lonely, black robe, ex-knight commander)',
          ja: '特徴 (例: 冷静/孤独/黒いローブ/元騎士団長)',
          zh: '特征 (例: 冷静/孤独/黑袍/前骑士团长)',
        })}
        className="w-full min-h-[80px] p-3 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple"
      />
      <button
        onClick={addChar}
        disabled={!name.trim()}
        className="w-full py-3 bg-accent-purple text-white font-bold text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 transition-all min-h-[44px]"
      >
        {L4(language, { ko: '캐릭터 추가', en: 'Add Character', ja: 'キャラクター追加', zh: '添加角色' })}
      </button>

      <div className="flex flex-col gap-2 mt-4">
        {store.characters.length === 0 && (
          <p className="text-xs text-text-quaternary text-center py-6">
            {L4(language, { ko: '아직 캐릭터가 없습니다.', en: 'No characters yet.', ja: 'まだキャラクターがありません。', zh: '暂无角色。' })}
          </p>
        )}
        {store.characters.map(c => (
          <div key={c.id} className="p-3 bg-bg-secondary rounded-xl border border-border">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary">{c.name}</span>
                  {c.role && <span className="text-[11px] px-2 py-0.5 bg-accent-purple/20 text-accent-purple rounded-full">{c.role}</span>}
                </div>
                {c.traits && <p className="text-xs text-text-secondary mt-1 whitespace-pre-wrap break-words">{c.traits}</p>}
              </div>
              <button
                onClick={() => removeChar(c.id)}
                className="text-[11px] text-accent-red hover:underline shrink-0 min-h-[44px] min-w-[44px] px-2 flex items-center justify-center"
              >
                {L4(language, { ko: '삭제', en: 'Delete', ja: '削除', zh: '删除' })}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PART 5 — 플롯 브레인스토밍 탭
// ============================================================

function PlotBrainstormPanel({ language, store, setStore }: { language: AppLanguage; store: MobileSketchStore; setStore: (s: MobileSketchStore) => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const addPlot = () => {
    const t = title.trim();
    if (!t) return;
    const next: PlotIdea = { id: generateId(), title: t, body: body.trim(), updatedAt: Date.now() };
    setStore({ ...store, plots: [next, ...store.plots].slice(0, 100) });
    setTitle(''); setBody('');
  };

  const removePlot = (id: string) => {
    setStore({ ...store, plots: store.plots.filter(p => p.id !== id) });
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-text-secondary">
        <GitBranch className="w-4 h-4 text-accent-amber" />
        <h3 className="text-sm font-bold">
          {L4(language, { ko: '플롯 브레인스토밍', en: 'Plot Brainstorming', ja: 'プロットブレスト', zh: '情节头脑风暴' })}
        </h3>
      </div>
      <p className="text-xs text-text-tertiary">
        {L4(language, {
          ko: '"만약 ~한다면?" 같은 플롯 아이디어를 자유롭게 모으세요. 정식 에피소드는 PC에서 작성합니다.',
          en: 'Collect "what if" plot ideas freely. Write proper episodes on desktop.',
          ja: '「もし〜だったら」のプロットアイデアを自由に集めてください。正式なエピソードはPCで執筆します。',
          zh: '自由收集"如果……"式情节创意。正式章节需在桌面端撰写。',
        })}
      </p>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder={L4(language, { ko: '제목 (예: 주인공이 기억을 잃는다면?)', en: 'Title (e.g. What if the hero loses memory?)', ja: 'タイトル (例: 主人公が記憶を失ったら?)', zh: '标题 (例: 如果主角失忆了?)' })}
        className="w-full px-3 py-3 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber min-h-[44px]"
      />
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder={L4(language, {
          ko: '전개/갈등/결말을 자유롭게 서술',
          en: 'Describe development / conflict / ending freely',
          ja: '展開・葛藤・結末を自由に記述',
          zh: '自由描述发展/冲突/结局',
        })}
        className="w-full min-h-[120px] p-3 text-sm bg-bg-secondary border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-amber"
      />
      <button
        onClick={addPlot}
        disabled={!title.trim()}
        className="w-full py-3 bg-accent-amber text-bg-primary font-bold text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 transition-all min-h-[44px]"
      >
        {L4(language, { ko: '아이디어 추가', en: 'Add Idea', ja: 'アイデア追加', zh: '添加创意' })}
      </button>

      <div className="flex flex-col gap-2 mt-4">
        {store.plots.length === 0 && (
          <p className="text-xs text-text-quaternary text-center py-6">
            {L4(language, { ko: '아직 아이디어가 없습니다.', en: 'No ideas yet.', ja: 'まだアイデアがありません。', zh: '暂无创意。' })}
          </p>
        )}
        {store.plots.map(p => (
          <div key={p.id} className="p-3 bg-bg-secondary rounded-xl border border-border">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-text-primary">{p.title}</h4>
                {p.body && <p className="text-xs text-text-secondary mt-1 whitespace-pre-wrap break-words">{p.body}</p>}
              </div>
              <button
                onClick={() => removePlot(p.id)}
                className="text-[11px] text-accent-red hover:underline shrink-0 min-h-[44px] min-w-[44px] px-2 flex items-center justify-center"
              >
                {L4(language, { ko: '삭제', en: 'Delete', ja: '削除', zh: '删除' })}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PART 6 — 메인 뷰 (탭 라우터 + 데스크톱 CTA)
// ============================================================

export default function MobileStudioView({ language, onDesktopCTA }: Props) {
  const [tab, setTab] = useState<MobileTab>('world');
  const [store, setStore] = useState<MobileSketchStore>(DEFAULT_STORE);

  useEffect(() => {
    setStore(loadStore());
  }, []);

  const updateStore = useCallback((s: MobileSketchStore) => {
    setStore(s);
    saveStore(s);
  }, []);

  const tabs: { id: MobileTab; icon: React.ElementType; labelKo: string; labelEn: string; labelJa: string; labelZh: string }[] = [
    { id: 'world', icon: Globe2, labelKo: '세계관', labelEn: 'World', labelJa: '世界観', labelZh: '世界观' },
    { id: 'characters', icon: Users, labelKo: '캐릭터', labelEn: 'Cast', labelJa: '人物', labelZh: '角色' },
    { id: 'plots', icon: GitBranch, labelKo: '플롯', labelEn: 'Plots', labelJa: 'プロット', labelZh: '情节' },
  ];

  return (
    <div className="flex flex-col h-[100dvh] bg-bg-primary text-text-primary">
      {/* 헤더 */}
      <header className="shrink-0 px-4 py-3 border-b border-border bg-bg-secondary/50 backdrop-blur-sm" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-accent-purple shrink-0" />
            <h1 className="text-sm font-bold truncate">
              {L4(language, { ko: '로어가드 — 모바일 스케치', en: 'Loreguard — Mobile Sketch', ja: 'ローアガード — モバイルスケッチ', zh: '洛尔加德 — 移动速写' })}
            </h1>
          </div>
          <button
            onClick={() => {
              if (typeof window === 'undefined') return;
              const confirmMsg = L4(language, {
                ko: '데스크톱 모드로 전환하면 모바일 최적화가 해제됩니다. 계속하시겠습니까?',
                en: 'Switch to desktop mode? Mobile optimization will be disabled.',
                ja: 'デスクトップモードに切り替えますか？モバイル最適化が解除されます。',
                zh: '切换到桌面模式? 移动端优化将被禁用。',
              });
              if (!window.confirm(confirmMsg)) return;
              try { localStorage.setItem('noa_force_desktop', '1'); } catch { /* quota */ }
              window.location.reload();
            }}
            className="shrink-0 flex items-center gap-1 px-2.5 py-2 min-h-[44px] rounded-lg text-[11px] font-bold bg-bg-primary/60 border border-border text-text-secondary active:bg-bg-primary active:scale-95 transition-all"
            title={L4(language, { ko: '데스크톱 모드로 강제 전환', en: 'Force desktop mode', ja: 'デスクトップモードに強制切替', zh: '强制切换到桌面模式' })}
            aria-label={L4(language, { ko: '데스크톱 모드 전환', en: 'Switch to desktop', ja: 'デスクトップに切替', zh: '切换桌面' })}
          >
            <Monitor className="w-3.5 h-3.5" />
            PC
          </button>
        </div>
        <p className="text-[11px] text-text-tertiary mt-1">
          {L4(language, {
            ko: '집필·번역·코드 스튜디오는 데스크톱에서만 이용 가능합니다.',
            en: 'Writing / Translation / Code Studio are desktop-only.',
            ja: '執筆・翻訳・コードスタジオはデスクトップ専用です。',
            zh: '写作 / 翻译 / 代码工作室仅支持桌面端。',
          })}
        </p>
      </header>

      {/* 탭 바 */}
      <nav className="shrink-0 flex border-b border-border bg-bg-secondary/30">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 min-h-[56px] transition-colors ${
                active
                  ? 'text-accent-purple border-b-2 border-accent-purple bg-bg-primary'
                  : 'text-text-tertiary border-b-2 border-transparent'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-bold">
                {L4(language, { ko: t.labelKo, en: t.labelEn, ja: t.labelJa, zh: t.labelZh })}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 콘텐츠 */}
      <main className="flex-1 overflow-y-auto">
        {tab === 'world' && <WorldMemoPanel language={language} store={store} setStore={updateStore} />}
        {tab === 'characters' && <CharacterSketchPanel language={language} store={store} setStore={updateStore} />}
        {tab === 'plots' && <PlotBrainstormPanel language={language} store={store} setStore={updateStore} />}
      </main>

      {/* 데스크톱 CTA */}
      <footer className="shrink-0 px-4 py-3 border-t border-border bg-bg-secondary/50" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <div className="flex items-start gap-2 mb-2">
          <Info className="w-3.5 h-3.5 text-accent-blue mt-0.5 shrink-0" />
          <p className="text-[10px] text-text-tertiary leading-relaxed">
            {L4(language, {
              ko: '데스크톱에서 이 아이디어를 정식 프로젝트로 발전시킬 수 있습니다.',
              en: 'Develop these ideas into full projects on desktop.',
              ja: 'デスクトップでこれらのアイデアを正式なプロジェクトに発展させられます。',
              zh: '可在桌面端将这些创意发展为正式项目。',
            })}
          </p>
        </div>
        <button
          onClick={onDesktopCTA}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent-purple/10 text-accent-purple border border-accent-purple/30 rounded-xl text-xs font-bold active:scale-98 transition-all min-h-[44px]"
        >
          <BookOpen className="w-4 h-4" />
          {L4(language, {
            ko: '데스크톱 링크 공유 (이 기기에서 확인)',
            en: 'Share Desktop Link',
            ja: 'デスクトップリンク共有',
            zh: '分享桌面端链接',
          })}
        </button>
      </footer>
    </div>
  );
}

export { MobileStudioView };

// IDENTITY_SEAL: PART-6 | role=mobile-studio-main | inputs=language,onDesktopCTA | outputs=UI(3-tab sketch view)
