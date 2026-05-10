/**
 * codex-prompts/ja.ts — 日本ライトノベル / なろう系ドメイン.
 *
 * 定型: 異世界転生・ハーレム・チート能力・勇者・魔王・属性魔法・
 *      ステータスウィンドウ・スキル取得画面など。
 *
 * 全プロンプトは日本語で直接作成 — ユーザー決定 (2026-05-10):
 *   「各国の文法を損なわない」。韓国語からの翻訳ではなく日本語固有の指示文。
 *
 * [C] 自然な日本語命令文 (~してください / ~せよ) — LLM 信号 ↑
 * [G] テンプレートリテラルのみ — 実行時コスト 0
 * [K] 7 builder 共通 CodexDomainPrompts インターフェース実装
 */

import type {
  CodexDomainPrompts,
  CharactersPromptInput,
  ItemsPromptInput,
  SkillsPromptInput,
  MagicSystemsPromptInput,
  WorldDesignPromptInput,
  WorldSimPromptInput,
  SceneDirectionPromptInput,
} from './types';

// ============================================================
// PART 1 — キャラクター
// ============================================================

function buildCharactersPrompt(input: CharactersPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[重複禁止] 以下のキャラクターは既に存在します。名前・役割が類似しないよう、完全に新しい人物を生成してください:\n${input.existingNames.join('、')}`
    : '';

  return `あなたは日本ライトノベルのキャラクター生成器です。

ジャンル: ${input.genre}
世界観あらすじ: ${input.synopsis}

上記設定に合わせて正確に ${input.count} 名の多面的なキャラクターを JSON 配列で生成してください。

[role フィールド — 以下のうち正確に一つ]
- "protagonist" 主人公: 視点・欲望・成長を担う主役 (1〜2名)
- "antagonist" 敵役・魔王: 自身の論理・欲望を持つ反対勢力 (1〜2名)
- "ally" 仲間: パーティーメンバー・同行者
- "rival" ライバル: 主人公と同領域で競う対等な好敵手
- "mentor" 師匠: 過去・秘密を抱える導き手
- "regressor" 転生者・異世界転移者: 異世界転生・転移ジャンル限定 — 前世記憶・チート能力保持
- "extra" 端役・モブ

[必須出力フィールド]
- name: 日本ライトノベルらしい名前 (和風・洋風・ファンタジー風いずれも可)
- role: 上記 enum のいずれか
- traits: 性格キーワード 3〜5 個 (カンマ区切り)
- appearance: 外見・服装の描写 1〜2 文
- dna: 物語ポテンシャルスコア 0〜100 (整数)
- desire: 中心的欲望 — 切に望むもの (1 文)
- deficiency: 中心的欠落 — 本質的に欠けているもの (1 文)
- conflict: 中心葛藤 — 物語全体で対峙する核 (1 文)
- changeArc: 変化の方向 — 物語の終わりにどう変容するか (1 文)
- values: 価値観・禁忌 — 絶対に超えない一線 (1 文)

[ライトノベル定型]
- 主人公は転生・転移・覚醒・チート能力獲得などのトリガーを持つ
- 敵役は単なる悪ではなく、世界観の構造的存在 (魔王・女神・組織など)
- 師匠は過去の英雄・伝説の登場人物が多い
- ヒロイン・仲間は属性・役割が明確 (ツンデレ・クーデレ・ヤンデレ・おっとり等)${existing}

JSON 配列のみ出力。説明・注釈・markdown コードブロック禁止。`;
}

// ============================================================
// PART 2 — アイテム
// ============================================================

function buildItemsPrompt(input: ItemsPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[重複禁止] 既存アイテム: ${input.existingNames.join('、')}`
    : '';

  return `あなたは日本ライトノベルのアイテム生成器です。

ジャンル: ${input.genre}
世界観あらすじ: ${input.synopsis}

上記世界観に合う ${input.count} 個の固有アイテムを JSON 配列で生成してください。

[category — 以下のうち正確に一つ]
- "weapon" 武器 / "armor" 防具 / "accessory" 装飾品
- "consumable" 消耗品 (ポーション・薬草) / "material" 素材
- "quest" クエストアイテム / "misc" その他

[rarity — 以下のうち正確に一つ]
- "common" コモン / "uncommon" アンコモン / "rare" レア
- "epic" エピック / "legendary" レジェンダリー / "mythic" 神話級

[必須出力フィールド]
- name: アイテム名 (和洋折衷・カタカナ造語・古語いずれも可)
- category: 上記 enum
- rarity: 上記 enum
- description: アイテムの正体と来歴 (2〜3 文)
- effect: 作中での発揮効果 (数値・物語機能)
- obtainedFrom: 入手経路 (古代遺跡・ボスドロップ・勇者の宝箱など)
- worldConnection: 世界観 lore との繋がり (1〜2 文)
- flavorText: 作中の銘文・古文書の一節 (1 文)

[ライトノベル定型]
- レジェンダリー以上は伝説の勇者・古代神・失われた文明と関連
- ステータスウィンドウ系は数値表記を含めると自然 (攻撃力・魔力・耐性等)
- 異世界転生系は転移チートとの関連を匂わせる
- 学園系・現代系は実在風の品名 (○○製・△△ブランド) を混ぜる${existing}

JSON 配列のみ出力。説明・注釈・markdown コードブロック禁止。`;
}

// ============================================================
// PART 3 — スキル
// ============================================================

function buildSkillsPrompt(input: SkillsPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[重複禁止] 既存スキル: ${input.existingNames.join('、')}`
    : '';

  return `あなたは日本ライトノベルのスキル・能力生成器です。

ジャンル: ${input.genre}
世界観あらすじ: ${input.synopsis}

上記世界観に合う ${input.count} 個の固有スキル・必殺技・特殊能力を JSON 配列で生成してください。

[type — 以下のうち正確に一つ]
- "active" アクティブ (任意発動)
- "passive" パッシブ (常時発動)
- "ultimate" 必殺技・究極技 (長クールダウン)

[必須出力フィールド]
- name: スキル名 (漢字・カタカナ・英字混在可 — 例: 「闇影斬」「ホーリーレイ」「ゼロブレイカー」)
- type: 上記 enum
- owner: 使い手のクラス・職業・属性 (例: 「剣士」「召喚士」「勇者」「魔法剣士」)
- description: 発動方法と視覚描写 (2〜3 文)
- cost: 消費資源 (MP・HP・SP・魔力・精神力など)
- cooldown: 使用制限 (例: 「1日1回」「魔力 100 消費」「30秒クールダウン」)
- rank: ランク・階位 (例: 「Sランク」「神級」「禁呪指定」「七星級」)

[ライトノベル定型]
- 異世界転生系: スキル一覧画面風の表記 (Lv.1, Lv.99, MP 消費 等)
- 属性魔法: 火・水・風・土・光・闇・雷・氷 を活用
- バトル系: 必殺技に技名がある (叫んで発動するタイプ)
- なろう系: 「○○の極意」「△△ブレイカー」「□□スレイヤー」風命名${existing}

JSON 配列のみ出力。説明・注釈・markdown コードブロック禁止。`;
}

// ============================================================
// PART 4 — 魔法・力の体系
// ============================================================

function buildMagicSystemsPrompt(input: MagicSystemsPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[重複禁止] 既存体系: ${input.existingNames.join('、')}`
    : '';

  return `あなたは日本ライトノベルの魔法・力の体系設計者です。

ジャンル: ${input.genre}
世界観あらすじ: ${input.synopsis}

上記世界観に論理的に整合する ${input.count} 個の魔法・能力体系を JSON 配列で設計してください。

[必須出力フィールド]
- name: 体系名 (例: 「九属性魔法」「神聖魔術」「異界召喚術」「ステータス覚醒」)
- source: 力の源 (魔素・マナ・神力・チャクラ・異世界エネルギー・神々の加護など)
- rules: 修得・発動の原理 (2〜3 文)
- limitations: 致命的弱点・代償・副作用 (1〜2 文)
- ranks: 3〜5 段階の階位・ランク配列

[ライトノベル定型 — ranks 例]
- 古典魔術: ["見習い", "従者", "魔法使い", "賢者", "大賢者"]
- ステータス系: ["Fランク", "Eランク", "Dランク", "Cランク", "Bランク", "Aランク", "Sランク"]
- 属性詠唱: ["1属性", "2属性", "3属性", "4属性", "5属性以上"]
- 召喚士: ["契約者", "上級召喚士", "神獣使い", "創造神", "終焉召喚士"]
- 異世界チート: ["転生者", "覚醒者", "超越者", "神域", "創世主"]${existing}

JSON 配列のみ出力。説明・注釈・markdown コードブロック禁止。`;
}

// ============================================================
// PART 5 — 世界観設計
// ============================================================

function buildWorldDesignPrompt(input: WorldDesignPromptInput): string {
  const hints = input.hints;
  const hintParts: string[] = [];
  if (hints?.title) hintParts.push(`タイトル候補: 「${hints.title}」`);
  if (hints?.povCharacter) hintParts.push(`主人公: 「${hints.povCharacter}」`);
  if (hints?.setting) hintParts.push(`舞台: 「${hints.setting}」`);
  if (hints?.primaryEmotion) hintParts.push(`核心情動: 「${hints.primaryEmotion}」`);
  if (hints?.synopsis) hintParts.push(`あらすじ: 「${hints.synopsis}」`);
  if (hints?.subGenreTags?.length) hintParts.push(`サブジャンルタグ: ${hints.subGenreTags.join('、')}`);
  if (hints?.narrativeIntensity) hintParts.push(`物語の強度: ${hints.narrativeIntensity}`);
  if (hints?.totalEpisodes) hintParts.push(`総話数: ${hints.totalEpisodes} 話`);
  if (hints?.platform) hintParts.push(`配信プラットフォーム: ${hints.platform}`);
  const hintBlock = hintParts.length > 0 ? `\n\n[作家提供ヒント — 必ず反映]\n${hintParts.join('\n')}` : '';

  return `あなたは日本ライトノベルの世界観デザイナーです。

ジャンル: ${input.genre}

上記ジャンルに合う独創的でディテール豊かな世界観を JSON オブジェクトで設計してください。
全フィールドを空欄なしに充実させ、ライトノベル定型を踏まえつつ陳腐にしないでください。

[基本情報 — 必須]
- title: 印象的かつ独創的な作品タイトル (1 行)
- povCharacter: 主人公の名前・簡略紹介 (1〜2 文)
- setting: 時空間的舞台 (1〜2 文)
- primaryEmotion: 作品全体の情調 (一語または短いフレーズ)
- synopsis: 全体あらすじ (3〜4 文)

[Tier 1 — 核]
- corePremise: 現実とは異なる、この世界唯一の核となるルール (2〜3 文)
- powerStructure: 誰が権力を持ち、どう維持するか (2〜3 文)
- currentConflict: 現在物語を駆動する中心葛藤 (2〜3 文)

[Tier 2 — システム]
- worldHistory: 世界を形作った重要歴史的事件 (2〜3 文)
- socialSystem: 身分・文化・教育・法と秩序 (2〜3 文)
- economy: 資源・通貨・交易・日常経済 (2〜3 文)
- magicTechSystem: 魔法・技術の核 — 原理と限界 (2〜3 文)
- factionRelations: 主要勢力の対立・同盟 (2〜3 文)
- survivalEnvironment: 地理・気候・危険要素 (2〜3 文)

[Tier 3 — ディテール]
- culture: 儀礼・芸術・風習 (1〜2 文)
- religion: 信仰・神話 (1〜2 文)
- education: 知識継承の方法 (1〜2 文)
- lawOrder: 法執行・刑罰・正義 (1〜2 文)
- taboo: 絶対的禁忌 (1〜2 文)
- dailyLife: 一般人の一日 (1〜2 文)
- travelComm: 都市間移動・情報伝達速度 (1〜2 文)
- truthVsBeliefs: 人々が信じることと実際の真実 (1〜2 文)

[ライトノベル指針]
- 異世界転生系: 主人公が転移・転生する世界の独自ルール明示
- 学園バトル系: 学園組織・能力者社会・裏世界の関係
- なろう系: チート能力・ステータス画面・スキル取得を corePremise に統合
- 王道ファンタジー: 勇者・魔王・神器・予言を powerStructure に組み込む${hintBlock}

JSON オブジェクトのみ出力。説明・注釈・markdown コードブロック禁止。`;
}

// ============================================================
// PART 6 — 世界シミュレーション (文明・勢力関係)
// ============================================================

function buildWorldSimPrompt(input: WorldSimPromptInput): string {
  const ctx = input.worldContext;
  const ctxParts: string[] = [];
  if (ctx?.corePremise) ctxParts.push(`世界の前提: ${ctx.corePremise}`);
  if (ctx?.powerStructure) ctxParts.push(`権力構造: ${ctx.powerStructure}`);
  if (ctx?.currentConflict) ctxParts.push(`中心葛藤: ${ctx.currentConflict}`);
  if (ctx?.factionRelations) ctxParts.push(`既知の勢力関係: ${ctx.factionRelations}`);
  const ctxBlock = ctxParts.length > 0
    ? `\n\n[世界フレーム]\n${ctxParts.join('\n')}\n上記フレームを反映して文明・勢力を設計してください。`
    : '';

  return `あなたは日本ライトノベルの勢力・文明シミュレーターです。

ジャンル: ${input.genre}
あらすじ: ${input.synopsis}

上記あらすじを基に 3〜4 個の文明・勢力とその相互関係を JSON オブジェクトで生成してください。

[civilizations 配列 — 各オブジェクト必須フィールド]
- name: 文明・勢力・王国・組織名
- era: 時代または最盛期 (例: 「神代」「現代」「魔王軍最盛期」)
- traits: 特性キーワード配列 3〜5 個

[relations 配列 — 各オブジェクト必須フィールド]
- from: 出発勢力 (civilizations.name のいずれか)
- to: 対象勢力 (civilizations.name のいずれか)
- type: 関係タイプ (例: 「同盟」「敵対」「中立」「貢納」「裏取引」「血盟」)

[ライトノベル定型]
- 王道ファンタジー: 王国 vs 帝国 vs 教団 vs 魔王軍
- 異世界転生: 転生者ギルド vs 既存勢力 vs 神々
- 学園バトル: 各派閥 vs 学園長 vs 裏組織
- なろう系: 主人公国家 vs 敵対国 vs 中立大国 vs 古代遺物勢力${ctxBlock}

JSON オブジェクトのみ出力。説明・注釈・markdown コードブロック禁止。`;
}

// ============================================================
// PART 7 — シーン演出設計
// ============================================================

function buildSceneDirectionPrompt(input: SceneDirectionPromptInput): string {
  const ctx = input.tierContext;
  const ctxParts: string[] = [];
  if (ctx?.corePremise) ctxParts.push(`世界の前提: ${ctx.corePremise}`);
  if (ctx?.powerStructure) ctxParts.push(`権力構造: ${ctx.powerStructure}`);
  if (ctx?.currentConflict) ctxParts.push(`世界葛藤: ${ctx.currentConflict}`);
  if (ctx?.charProfiles?.length) {
    const charBlock = ctx.charProfiles.map((c) =>
      `  - ${c.name}: 欲望「${c.desire || '?'}」、葛藤「${c.conflict || '?'}」、変化方向「${c.changeArc || '?'}」、禁忌「${c.values || '?'}」`,
    ).join('\n');
    ctxParts.push(`キャラクタープロフィール:\n${charBlock}`);
  }
  const ctxBlock = ctxParts.length > 0
    ? `\n\n[物語フレーム]\n${ctxParts.join('\n')}\n\n[必須ルール]
- フックはキャラクターの欲望または世界葛藤と直接連動
- 引きはキャラクターの価値観・禁忌を脅かす
- 緊張装置はキャラクターの変化方向にエスカレートする
- 台詞トーンは各キャラクターの中心葛藤を反映する`
    : '';

  return `あなたは日本ライトノベルの話数演出デザイナーです。

あらすじ: ${input.synopsis}
主要キャラクター: ${input.characters.join('、')}

上記作品の包括的な話数演出要素を JSON オブジェクトで生成してください。
フック・緊張装置・引き・感情ターゲット・台詞トーン・伏線・ドーパミン装置・ペーシング・テンション曲線をすべて含めること。${ctxBlock}

[出力フィールド]
- hooks: フック装置配列 (各: position, hookType, desc) — 話数開始・中盤・終盤
- goguma: 緊張・解放配列 (各: type "緊張"|"解放", intensity, desc)
- cliffhanger: 話数末の決定的引きオブジェクト (cliffType, desc)
- emotionTargets: 情緒ターゲット配列 (各: emotion, intensity 0〜10)
- dialogueTones: キャラ別台詞トーン配列 (各: character, tone)
- foreshadows: 伏線配置・回収配列 (各: planted, payoff)
- dopamineDevices: ドーパミン装置配列 (各: scale "小"|"中"|"大", device, desc)
- pacings: ペーシングビート配列 (各: section, percent 0〜100, desc)
- tensionCurve: テンション曲線配列 (各: position 0〜100, level 0〜100, label)

各配列フィールドは 2〜4 項目生成。具体的かつライトノベル定型 (話数末の強い引き・中盤の転換・バトル・感情ピーク) を反映すること。

JSON オブジェクトのみ出力。説明・注釈・markdown コードブロック禁止。`;
}

// ============================================================
// PART 8 — Export
// ============================================================

export const JA_LIGHTNOVEL: CodexDomainPrompts = {
  buildCharactersPrompt,
  buildItemsPrompt,
  buildSkillsPrompt,
  buildMagicSystemsPrompt,
  buildWorldDesignPrompt,
  buildWorldSimPrompt,
  buildSceneDirectionPrompt,
};
