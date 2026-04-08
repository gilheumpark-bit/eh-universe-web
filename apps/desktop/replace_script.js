const fs = require('fs');
const file = 'c:/eh-universe-web/apps/desktop/renderer/components/code-studio/Toolbar.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `  const menus = useMemo(() => ({
    file: [
      { label: L4(lang, { ko: "새 파일", en: "New File", ja: "新しいファイル", zh: "新建文件" }), shortcut: "Ctrl+N", action: onNewFile },
      { label: L4(lang, { ko: "커맨드 팔레트", en: "Command Palette", ja: "コマンドパレット", zh: "命令面板" }), shortcut: "Ctrl+Shift+P", action: onOpenPalette },
      { divider: true, label: "" },
      { label: L4(lang, { ko: "설정", en: "Settings", ja: "設定", zh: "设置" }), action: onOpenSettings },
    ],
    edit: [
      { label: L4(lang, { ko: "실행 취소", en: "Undo", ja: "元に戻す", zh: "撤销" }), shortcut: "Ctrl+Z", action: onUndo },
      { label: L4(lang, { ko: "다시 실행", en: "Redo", ja: "やり直し", zh: "重做" }), shortcut: "Ctrl+Y", action: onRedo },
      { divider: true, label: "" },
      { label: L4(lang, { ko: "전역 검색", en: "Global Search", ja: "グローバル検索", zh: "全局搜索" }), shortcut: "Ctrl+Shift+F", action: onToggleSearch },
    ],
    view: [
      { label: L4(lang, { ko: "사이드바 토글", en: "Toggle Sidebar", ja: "サイドバー切替", zh: "切换侧边栏" }), shortcut: "Ctrl+B", action: onToggleSidebar },
      { label: L4(lang, { ko: "터미널 토글", en: "Toggle Terminal", ja: "ターミナル切替", zh: "切换终端" }), shortcut: "Ctrl+\`", action: onToggleTerminal },
      { label: L4(lang, { ko: "분할 보기", en: "Split View", ja: "分割表示", zh: "分屏视图" }), action: onToggleSplit },
    ],
    ai: [
      { label: L4(lang, { ko: "AI 채팅", en: "AI Chat", ja: "AIチャット", zh: "AI 聊天" }), shortcut: "Ctrl+L", action: onToggleChat },
      { label: L4(lang, { ko: "에이전트", en: "Agent", ja: "エージェント", zh: "智能体" }), shortcut: "Ctrl+I", action: onToggleAgent },
      { divider: true, label: "" },
      { label: L4(lang, { ko: "파이프라인", en: "Pipeline", ja: "パイプライン", zh: "流水线" }), shortcut: "Ctrl+Shift+Enter", action: onTogglePipeline },
      { label: L4(lang, { ko: "버그 파인더", en: "Bug Finder", ja: "バグファインダー", zh: "查找 Bug" }), action: onRunBugFinder },
    ]
  }), [lang, onNewFile, onOpenPalette, onOpenSettings, onUndo, onRedo, onToggleSearch, onToggleSidebar, onToggleTerminal, onToggleSplit, onToggleChat, onToggleAgent, onTogglePipeline, onRunBugFinder]);
`;

// Insert after `const { lang } = useLang();`
content = content.replace('const { lang } = useLang();', 'const { lang } = useLang();\n\n' + replacement);

// Replace items=[...] with items={menus.file} etc.
content = content.replace(/<ToolbarMenu label=\{L4\(lang, \{ ko: "파일"[^\}]+\} \)\} items=\{\[[^\]]+\]\} \/>/g, '<ToolbarMenu label={L4(lang, { ko: "파일", en: "File", ja: "ファイル", zh: "文件" })} items={menus.file} />');
content = content.replace(/<ToolbarMenu label=\{L4\(lang, \{ ko: "편집"[^\}]+\} \)\} items=\{\[[^\]]+\]\} \/>/g, '<ToolbarMenu label={L4(lang, { ko: "편집", en: "Edit", ja: "編集", zh: "编辑" })} items={menus.edit} />');
content = content.replace(/<ToolbarMenu label=\{L4\(lang, \{ ko: "보기"[^\}]+\} \)\} items=\{\[[^\]]+\]\} \/>/g, '<ToolbarMenu label={L4(lang, { ko: "보기", en: "View", ja: "表示", zh: "视图" })} items={menus.view} />');
content = content.replace(/<ToolbarMenu label=\{L4\(lang, \{ ko: "AI"[^\}]+\} \)\} items=\{\[[^\]]+\]\} \/>/g, '<ToolbarMenu label={L4(lang, { ko: "AI", en: "AI", ja: "AI", zh: "AI" })} items={menus.ai} />');

fs.writeFileSync(file, content);
console.log('Done!');
