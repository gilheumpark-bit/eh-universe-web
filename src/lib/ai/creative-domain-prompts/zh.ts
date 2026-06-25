/**
 * creative-domain-prompts/zh.ts — 中国仙侠、玄幻、都市修真领域。
 *
 * 定型: 修真境界 (炼气-筑基-金丹-元婴-化神-渡劫-大乘)、
 *      宗门、师徒、道侣、法宝、灵根、重生、穿越等。
 *
 * 全部提示词使用简体中文直接撰写 — 用户决定 (2026-05-10):
 *   "不损害各国语法"。非韩语翻译,而是中文原生指令文。
 *
 * [C] 自然中文命令式 (请~ / 必须~) — LLM 信号 ↑
 * [G] 仅模板字面量 — 运行时零成本
 * [K] 实现统一的 7 builder CreativeDomainPrompts 接口
 */

import type {
  CreativeDomainPrompts,
  CharactersPromptInput,
  ItemsPromptInput,
  SkillsPromptInput,
  MagicSystemsPromptInput,
  WorldDesignPromptInput,
  WorldSimPromptInput,
  SceneDirectionPromptInput,
} from './types';

// ============================================================
// PART 1 — 角色
// ============================================================

function buildCharactersPrompt(input: CharactersPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[禁止重复] 以下角色已存在,请生成名称、定位完全不同的新人物:\n${input.existingNames.join('、')}`
    : '';

  return `你是中国仙侠、玄幻小说的角色生成器。

体裁: ${input.genre}
世界观简介: ${input.synopsis}

请按上述设定生成正好 ${input.count} 个立体角色,以 JSON 数组输出。

[role 字段 — 以下其中之一]
- "protagonist" 主角: 视角、欲望、成长的核心 (1〜2 名)
- "antagonist" 反派: 拥有自身欲望与逻辑的对立势力 (1〜2 名)
- "ally" 同伴: 一同闯荡江湖或共修的盟友
- "rival" 道争 / 劲敌: 与主角同领域较量的对等敌手
- "mentor" 师父、前辈: 携带秘辛或前世因果的引路人
- "regressor" 重生者、穿越者: 重生、穿越类专属 — 拥有前世记忆或异界知识
- "extra" 配角: 无足轻重的过场人物

[必填字段]
- name: 仙侠、玄幻风格姓名 (双字、三字、道号、法号皆可,例如 "云无极"、"墨青衣"、"清虚道人")
- role: 上述 enum 之一
- traits: 性格关键词 3〜5 个,逗号分隔
- appearance: 外貌、服饰描述 1〜2 句
- dna: 叙事潜力分数 0〜100 (整数)
- desire: 核心欲望 — 角色最为执着之物 (1 句)
- deficiency: 核心缺陷 — 本质上的欠缺 (1 句)
- conflict: 核心冲突 — 贯穿全篇的对立 (1 句)
- changeArc: 转变方向 — 故事终篇时的蜕变 (1 句)
- values: 价值观、底线 — 绝不逾越的红线 (1 句)

[仙侠、玄幻定型]
- 主角通常拥有觉醒灵根、重生归来、继承传承等触发要素
- 反派多为大宗门长老、魔教高手、古老存在,而非简单恶人
- 师父往往隐藏前世身份、历劫旧账、宗门秘事
- 道侣关系应当与主角的修行道路相互呼应${existing}

仅输出 JSON 数组。禁止说明、注释、markdown 代码块。`;
}

// ============================================================
// PART 2 — 物品
// ============================================================

function buildItemsPrompt(input: ItemsPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[禁止重复] 既有物品: ${input.existingNames.join('、')}`
    : '';

  return `你是中国仙侠、玄幻小说的物品生成器。

体裁: ${input.genre}
世界观简介: ${input.synopsis}

请生成 ${input.count} 件契合本世界观的独特物品,以 JSON 数组输出。

[category — 以下其中之一]
- "weapon" 兵器、法宝 (剑、刀、槊、神兵)
- "armor" 护具、宝甲 / "accessory" 配饰、灵符 / "consumable" 丹药、灵草
- "material" 炼制材料 (灵石、矿脉、灵根) / "quest" 任务道具 / "misc" 其他

[rarity — 以下其中之一]
- "common" 凡品 / "uncommon" 灵品 / "rare" 法品
- "epic" 仙品 / "legendary" 神品 / "mythic" 道品、先天

[必填字段]
- name: 物品名 (古风为主,例如 "九转还魂丹"、"诛仙剑"、"太虚镜")
- category: 上述 enum
- rarity: 上述 enum
- description: 物品的来历与传说 (2〜3 句)
- effect: 在故事中发挥的功效 (数值或叙事作用)
- obtainedFrom: 获取来源 (古墓、秘境、上古战场、宗门赏赐等)
- worldConnection: 与世界观 lore 的联系 (1〜2 句)
- flavorText: 文中铭文、古谱箴言 (1 句)

[仙侠、玄幻定型]
- 神品以上必与上古大能、失落道统、封印仙人相关
- 法宝须有炼制材料、祭炼次数、主人血脉等限制
- 丹药、灵草须给出灵气浓度、火候要求、副作用
- 都市修真则可融合现代品牌外观与古法精髓${existing}

仅输出 JSON 数组。禁止说明、注释、markdown 代码块。`;
}

// ============================================================
// PART 3 — 技能、功法
// ============================================================

function buildSkillsPrompt(input: SkillsPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[禁止重复] 既有技能: ${input.existingNames.join('、')}`
    : '';

  return `你是中国仙侠、玄幻小说的技能、功法生成器。

体裁: ${input.genre}
世界观简介: ${input.synopsis}

请生成 ${input.count} 项契合本世界观的独特功法、神通、秘术,以 JSON 数组输出。

[type — 以下其中之一]
- "active" 主动技 (主动施展)
- "passive" 被动技 (常驻生效)
- "ultimate" 必杀技、禁招 (长冷却、重代价)

[必填字段]
- name: 功法、神通名称 (古风为主,例如 "九阳神功"、"太虚剑诀"、"九转玄功")
- type: 上述 enum
- owner: 修炼者职业、门派、阶位 (例如 "剑修"、"魔门弟子"、"金丹真人")
- description: 施展方式与外显场景 (2〜3 句)
- cost: 消耗资源 (灵力、真元、寿元、心血、精神等)
- cooldown: 使用限制 (例如 "三日一施"、"耗损一年寿元"、"突破方可施展")
- rank: 等级、境界 (例如 "天阶"、"地字第一"、"道品法术")

[仙侠、玄幻定型]
- 仙侠类: 剑诀、剑气、神通、禁术、御物术、阵法分门别类
- 修真都市: 灵力具象化为现代物理可视效果 (火球、雷电等)
- 玄幻类: 武魂、斗气、圣痕、混沌之力等独立体系
- 重生、穿越者: 主角因前世记忆掌握的"逆天功法"应单独标注${existing}

仅输出 JSON 数组。禁止说明、注释、markdown 代码块。`;
}

// ============================================================
// PART 4 — 修炼、力量体系
// ============================================================

function buildMagicSystemsPrompt(input: MagicSystemsPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[禁止重复] 既有体系: ${input.existingNames.join('、')}`
    : '';

  return `你是中国仙侠、玄幻小说的修炼体系设计师。

体裁: ${input.genre}
世界观简介: ${input.synopsis}

请为本世界观设计 ${input.count} 套逻辑自洽的修炼或力量体系,以 JSON 数组输出。

[必填字段]
- name: 体系名称 (例如 "九重天修真境界"、"圣阶斗气"、"九品仙道")
- source: 力量本源 (灵气、天地元气、真元、神识、混沌之力、先天道蕴等)
- rules: 修习与施展原理 (2〜3 句)
- limitations: 致命弱点、代价、副作用 (1〜2 句)
- ranks: 3〜5 个晋升境界、阶位的数组

[仙侠、玄幻定型 — ranks 示例]
- 经典修真: ["炼气期", "筑基期", "金丹期", "元婴期", "化神期", "渡劫期", "大乘期"]
- 武道境界: ["后天", "先天", "宗师", "大宗师", "武圣", "武神"]
- 斗气分阶: ["斗者", "斗师", "大斗师", "斗灵", "斗王", "斗皇", "斗宗", "斗尊", "斗圣"]
- 都市修真: ["凡人", "练气士", "筑基者", "金丹真人", "元婴老祖"]
- 玄幻天阶: ["人阶", "黄阶", "玄阶", "地阶", "天阶", "圣阶", "神阶"]${existing}

仅输出 JSON 数组。禁止说明、注释、markdown 代码块。`;
}

// ============================================================
// PART 5 — 世界观设计
// ============================================================

function buildWorldDesignPrompt(input: WorldDesignPromptInput): string {
  const hints = input.hints;
  const hintParts: string[] = [];
  if (hints?.title) hintParts.push(`标题候选: 「${hints.title}」`);
  if (hints?.povCharacter) hintParts.push(`主角: 「${hints.povCharacter}」`);
  if (hints?.setting) hintParts.push(`舞台: 「${hints.setting}」`);
  if (hints?.primaryEmotion) hintParts.push(`核心情绪: 「${hints.primaryEmotion}」`);
  if (hints?.synopsis) hintParts.push(`剧情简介: 「${hints.synopsis}」`);
  if (hints?.subGenreTags?.length) hintParts.push(`子题材标签: ${hints.subGenreTags.join('、')}`);
  if (hints?.narrativeIntensity) hintParts.push(`叙事强度: ${hints.narrativeIntensity}`);
  if (hints?.totalEpisodes) hintParts.push(`总章节数: ${hints.totalEpisodes}`);
  if (hints?.platform) hintParts.push(`目标平台: ${hints.platform}`);
  const hintBlock = hintParts.length > 0 ? `\n\n[作者提示 — 必须采纳]\n${hintParts.join('\n')}` : '';

  return `你是中国仙侠、玄幻世界观设计师。

体裁: ${input.genre}

请为上述体裁设计独创性强、细节充实的世界观,以 JSON 对象输出。
所有字段须填写完整,既要遵循仙侠、玄幻定型,又要避免陈词滥调。

[基础信息 — 必填]
- title: 富有冲击力且独创的作品标题 (1 行)
- povCharacter: 主角姓名与简要介绍 (1〜2 句)
- setting: 时空舞台 (1〜2 句)
- primaryEmotion: 全篇情绪基调 (一词或短语)
- synopsis: 整体剧情概述 (3〜4 句)

[Tier 1 — 核心]
- corePremise: 本世界与现实唯一的根本不同之处 (2〜3 句)
- powerStructure: 谁掌握权力以及如何维系 (2〜3 句)
- currentConflict: 当前驱动剧情的核心冲突 (2〜3 句)

[Tier 2 — 系统]
- worldHistory: 塑造世界的关键历史事件 (2〜3 句)
- socialSystem: 阶级、文化、教育、律法 (2〜3 句)
- economy: 资源、货币、贸易、民生 (2〜3 句)
- magicTechSystem: 修炼、法术、器物核心 — 原理与限制 (2〜3 句)
- factionRelations: 主要势力的对立、联盟 (2〜3 句)
- survivalEnvironment: 地理、气候、险地 (2〜3 句)

[Tier 3 — 细节]
- culture: 礼仪、艺术、风俗 (1〜2 句)
- religion: 信仰、神话、道统 (1〜2 句)
- education: 知识、秘法的传承方式 (1〜2 句)
- lawOrder: 律法、刑罚、宗门规矩 (1〜2 句)
- taboo: 绝对禁忌 (1〜2 句)
- dailyLife: 凡人、修士的一日生活 (1〜2 句)
- travelComm: 城市间往来、消息传递的速度 (1〜2 句)
- truthVsBeliefs: 民众所信与真实秘辛之差 (1〜2 句)

[仙侠、玄幻指引]
- 经典仙侠: 凡人界、修真界、仙界、神界的层级与穿梭规则
- 都市修真: 现代社会与隐世宗门的并存逻辑
- 玄幻大陆: 大陆地图、种族体系、神器与远古战争
- 重生、穿越类: 主角的来源世界与所穿世界的设定差异${hintBlock}

仅输出 JSON 对象。禁止说明、注释、markdown 代码块。`;
}

// ============================================================
// PART 6 — 世界模拟 (文明、势力关系)
// ============================================================

function buildWorldSimPrompt(input: WorldSimPromptInput): string {
  const ctx = input.worldContext;
  const ctxParts: string[] = [];
  if (ctx?.corePremise) ctxParts.push(`世界前提: ${ctx.corePremise}`);
  if (ctx?.powerStructure) ctxParts.push(`权力结构: ${ctx.powerStructure}`);
  if (ctx?.currentConflict) ctxParts.push(`核心冲突: ${ctx.currentConflict}`);
  if (ctx?.factionRelations) ctxParts.push(`已知势力关系: ${ctx.factionRelations}`);
  const ctxBlock = ctxParts.length > 0
    ? `\n\n[世界框架]\n${ctxParts.join('\n')}\n请按照上述框架设计文明与势力。`
    : '';

  return `你是中国仙侠、玄幻势力、文明模拟器。

体裁: ${input.genre}
剧情简介: ${input.synopsis}

请基于上述剧情设计 3〜4 个文明、势力、宗门及其相互关系,以 JSON 对象输出。

[civilizations 数组 — 各对象必填字段]
- name: 文明、宗门、王朝、世家名称
- era: 时代或鼎盛期 (例如 "上古神魔时代"、"当代盛世"、"魔劫降临前")
- traits: 特征关键词数组 3〜5 个

[relations 数组 — 各对象必填字段]
- from: 起始势力 (须与 civilizations.name 一致)
- to: 目标势力 (须与 civilizations.name 一致)
- type: 关系类型 (例如 "盟约"、"敌对"、"中立"、"血仇"、"道争"、"暗中算计")

[仙侠、玄幻定型]
- 经典仙侠: 正派 vs 魔道 vs 散修 vs 妖魔
- 玄幻大陆: 帝国 vs 王国 vs 教廷 vs 兽族 vs 古族
- 都市修真: 隐世宗门 vs 国家组织 vs 西方势力 vs 异魔
- 修真世界: 天道大派 vs 远古魔门 vs 上古遗族${ctxBlock}

仅输出 JSON 对象。禁止说明、注释、markdown 代码块。`;
}

// ============================================================
// PART 7 — 章节演出设计
// ============================================================

function buildSceneDirectionPrompt(input: SceneDirectionPromptInput): string {
  const ctx = input.tierContext;
  const ctxParts: string[] = [];
  if (ctx?.corePremise) ctxParts.push(`世界前提: ${ctx.corePremise}`);
  if (ctx?.powerStructure) ctxParts.push(`权力结构: ${ctx.powerStructure}`);
  if (ctx?.currentConflict) ctxParts.push(`世界冲突: ${ctx.currentConflict}`);
  if (ctx?.charProfiles?.length) {
    const charBlock = ctx.charProfiles.map((c) =>
      `  - ${c.name}: 欲望 "${c.desire || '?'}",冲突 "${c.conflict || '?'}",转变方向 "${c.changeArc || '?'}",底线 "${c.values || '?'}"`,
    ).join('\n');
    ctxParts.push(`角色档案:\n${charBlock}`);
  }
  const ctxBlock = ctxParts.length > 0
    ? `\n\n[叙事框架]\n${ctxParts.join('\n')}\n\n[必守规则]
- 钩子须直接关联角色欲望或世界冲突
- 章节末悬念须威胁角色价值观或撕裂其底线
- 紧张装置须随章节推进向角色转变方向 escalate
- 对白基调须呼应每位角色的核心冲突`
    : '';

  return `你是中国仙侠、玄幻章节演出设计师。

剧情简介: ${input.synopsis}
主要角色: ${input.characters.join('、')}

请为上述作品设计完整的章节演出要素,以 JSON 对象输出。
须包含钩子、紧张装置、章节末悬念、情绪靶点、对白基调、伏笔、爽点装置、节奏与紧张曲线。${ctxBlock}

[输出字段]
- hooks: 钩子装置数组 (各: position, hookType, desc) — 章首、章中、章末
- goguma: 紧张、爽快节拍数组 (各: type "紧张"|"爽快", intensity, desc)
- cliffhanger: 章节末决定性悬念对象 (cliffType, desc)
- emotionTargets: 情绪靶点数组 (各: emotion, intensity 0〜10)
- dialogueTones: 角色对白基调数组 (各: character, tone)
- foreshadows: 伏笔布置、回收数组 (各: planted, payoff)
- dopamineDevices: 爽点装置数组 (各: scale "小"|"中"|"大", device, desc)
- pacings: 节奏数组 (各: section, percent 0〜100, desc)
- tensionCurve: 紧张曲线数组 (各: position 0〜100, level 0〜100, label)

每个数组字段生成 2〜4 项。须具体且贴合仙侠、玄幻章节节律 (开篇定锚、中段反转、章末强悬念、门派冲突、悟道顿悟瞬间)。

仅输出 JSON 对象。禁止说明、注释、markdown 代码块。`;
}

// ============================================================
// PART 8 — Export
// ============================================================

export const ZH_XIANXIA: CreativeDomainPrompts = {
  buildCharactersPrompt,
  buildItemsPrompt,
  buildSkillsPrompt,
  buildMagicSystemsPrompt,
  buildWorldDesignPrompt,
  buildWorldSimPrompt,
  buildSceneDirectionPrompt,
};
