"use client";

import React, { useRef } from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Download,
  Globe,
  GripVertical,
  Move,
  Printer,
  Settings,
  Upload,
} from "lucide-react";
import type { AppLanguage, AppTab } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import { STUDIO_MANUSCRIPT_IMPORT_ACCEPT } from "@/lib/loreguard/import-classifier";

export type OSDesktopAppLink = {
  href: string;
  icon: React.FC<{ className?: string; strokeWidth?: number }>;
  label: string;
  color: string;
};

export function OSDesktopSystemMenu({
  appLinks,
  dockAnchor,
  dockToolsVisible,
  exportAllJSON,
  exportJSON,
  exportTXT,
  fileInputRef,
  handleDockReset,
  handleExportDOCX,
  handleExportEPUB,
  handleExportHWPX,
  handleImportTextFiles,
  handleTabChange,
  isSystemMenuOpen,
  language,
  setDockToolsVisible,
  setIsSystemMenuOpen,
  toggleDockAnchor,
}: {
  appLinks: OSDesktopAppLink[];
  dockAnchor: "top" | "bottom";
  dockToolsVisible: boolean;
  exportAllJSON: () => void;
  exportJSON: () => void;
  exportTXT: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleDockReset: () => void;
  handleExportDOCX: () => void;
  handleExportEPUB: () => void;
  handleExportHWPX: () => void;
  handleImportTextFiles: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleTabChange: (tab: AppTab) => void;
  isSystemMenuOpen: boolean;
  language: AppLanguage;
  setDockToolsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSystemMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleDockAnchor: () => void;
}) {
  const textFileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="relative">
      <button
        onClick={() => setIsSystemMenuOpen(!isSystemMenuOpen)}
        aria-label={L4(language, { ko: "시스템 메뉴 / 설정·내보내기·가져오기", en: "System menu — settings, export, import", ja: "システムメニュー — 設定・エクスポート・インポート", zh: "系统菜单 — 设置·导出·导入" })}
        aria-expanded={isSystemMenuOpen}
        aria-haspopup="menu"
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center bg-bg-secondary/30 hover:bg-bg-secondary/50 text-text-secondary hover:text-text-primary transition-colors border border-transparent hover:border-border/30"
      >
        <Settings className="w-6 h-6" aria-hidden="true" />
      </button>

      {isSystemMenuOpen && (
        <div className={`absolute right-0 max-h-[min(72vh,520px)] w-72 overflow-y-auto bg-bg-secondary/97 backdrop-blur-xl border border-border rounded-lg p-2 shadow-lg flex flex-col gap-1 z-[var(--z-dropdown)] ${dockAnchor === "top" ? "top-16" : "bottom-16"}`}>
          <button onClick={() => { setIsSystemMenuOpen(false); handleTabChange("settings"); }} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex items-center gap-2 font-serif transition-colors">
            <Settings className="w-4 h-4" /> {L4(language, { ko: "설정", en: "Settings", ja: "設定", zh: "设置" })}
          </button>
          <div className="h-px bg-border/30 my-1" />
          <div className="px-3 py-1.5 text-[10px] font-black text-text-tertiary uppercase tracking-widest font-serif">
            <Globe className="w-3 h-3 inline mr-1.5" />
            {L4(language, { ko: "이동", en: "Go to", ja: "移動", zh: "前往" })}
          </div>
          {appLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex items-center gap-2 font-serif transition-colors no-underline"
              onClick={() => setIsSystemMenuOpen(false)}
            >
              <link.icon className={`w-4 h-4 ${link.color}`} strokeWidth={1.8} />
              {link.label}
            </a>
          ))}
          <div className="h-px bg-border/30 my-1" />
          <div className="px-3 py-1.5 text-[10px] font-black text-text-tertiary uppercase tracking-widest font-serif">
            <Move className="w-3 h-3 inline mr-1.5" />
            {L4(language, { ko: "독", en: "Dock", ja: "ドック", zh: "停靠栏" })}
          </div>
          <button
            type="button"
            onClick={() => { setDockToolsVisible((prev) => !prev); setIsSystemMenuOpen(false); }}
            className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex items-center gap-2 font-serif transition-colors"
          >
            <GripVertical className="w-4 h-4" />
            {dockToolsVisible
              ? L4(language, { ko: "위치 조절 숨기기", en: "Hide position controls", ja: "位置調整を隠す", zh: "隐藏位置调节" })
              : L4(language, { ko: "위치 조절 켜기", en: "Show position controls", ja: "位置調整を表示", zh: "显示位置调节" })}
          </button>
          <button
            type="button"
            onClick={() => { toggleDockAnchor(); setIsSystemMenuOpen(false); }}
            className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex items-center gap-2 font-serif transition-colors"
          >
            {dockAnchor === "top" ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpToLine className="w-4 h-4" />}
            {L4(language, {
              ko: dockAnchor === "top" ? "하단으로 이동" : "상단으로 이동",
              en: dockAnchor === "top" ? "Move to bottom" : "Move to top",
              ja: dockAnchor === "top" ? "下部へ移動" : "上部へ移動",
              zh: dockAnchor === "top" ? "移至底部" : "移至顶部",
            })}
          </button>
          <button
            onClick={() => { setIsSystemMenuOpen(false); handleDockReset(); }}
            className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex items-center gap-2 font-serif transition-colors"
          >
            <Move className="w-4 h-4" /> {language === "KO" ? "독 위치 초기화" : "Reset Dock Position"}
          </button>
          <div className="h-px bg-border/30 my-1" />
          <div className="px-3 py-1.5 text-[10px] font-black text-text-tertiary uppercase tracking-widest font-serif">
            <Download className="w-3 h-3 inline mr-1.5" />
            {L4(language, { ko: "내보내기", en: "Export", ja: "エクスポート", zh: "导出" })}
          </div>
          <button onClick={() => { setIsSystemMenuOpen(false); handleExportEPUB(); }} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex flex-col gap-0.5 font-serif transition-colors pl-7">
            <span>EPUB <span className="text-text-tertiary text-[10px]">({L4(language, { ko: "전자책", en: "E-book", ja: "電子書籍", zh: "电子书" })})</span></span>
            <span className="text-[9px] text-text-tertiary">{L4(language, { ko: "전자책 리더용", en: "For e-book readers", ja: "電子書籍リーダー用", zh: "电子书阅读器用" })}</span>
          </button>
          <button onClick={() => { setIsSystemMenuOpen(false); handleExportDOCX(); }} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex flex-col gap-0.5 font-serif transition-colors pl-7">
            <span>DOCX <span className="text-text-tertiary text-[10px]">({L4(language, { ko: "워드", en: "Word", ja: "ワード", zh: "Word" })})</span></span>
            <span className="text-[9px] text-text-tertiary">{L4(language, { ko: "워드 편집용", en: "For Word editing", ja: "ワード編集用", zh: "Word编辑用" })}</span>
          </button>
          <button onClick={() => { setIsSystemMenuOpen(false); handleExportHWPX(); }} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex flex-col gap-0.5 font-serif transition-colors pl-7">
            <span>HWPX <span className="text-text-tertiary text-[10px]">({L4(language, { ko: "한글", en: "Hancom", ja: "HWPX", zh: "HWPX" })})</span></span>
            <span className="text-[9px] text-text-tertiary">{L4(language, { ko: "한글 편집용", en: "For Hancom editing", ja: "HWPX編集用", zh: "HWPX编辑用" })}</span>
          </button>
          <button onClick={() => { setIsSystemMenuOpen(false); exportTXT(); }} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex flex-col gap-0.5 font-serif transition-colors pl-7">
            <span>TXT <span className="text-text-tertiary text-[10px]">({L4(language, { ko: "텍스트", en: "Text", ja: "テキスト", zh: "文本" })})</span></span>
            <span className="text-[9px] text-text-tertiary">{L4(language, { ko: "플랫폼 등록용", en: "For platform submission", ja: "プラットフォーム登録用", zh: "平台提交用" })}</span>
          </button>
          <button onClick={() => { setIsSystemMenuOpen(false); exportJSON(); }} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex flex-col gap-0.5 font-serif transition-colors pl-7">
            <span>JSON <span className="text-text-tertiary text-[10px]">({L4(language, { ko: "데이터", en: "Data", ja: "データ", zh: "数据" })})</span></span>
            <span className="text-[9px] text-text-tertiary">{L4(language, { ko: "백업/복원용", en: "For backup/restore", ja: "バックアップ/復元用", zh: "备份/恢复用" })}</span>
          </button>
          <button onClick={() => { setIsSystemMenuOpen(false); exportAllJSON(); }} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex items-center gap-2 font-serif transition-colors pl-7">
            {L4(language, { ko: "전체 백업", en: "Full Backup", ja: "全体バックアップ", zh: "全量备份" })} (JSON)
          </button>
          <button onClick={() => { setIsSystemMenuOpen(false); window.print(); }} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex items-center gap-2 font-serif transition-colors pl-7">
            <Printer className="w-3 h-3" /> {L4(language, { ko: "인쇄", en: "Print", ja: "印刷", zh: "打印" })}
          </button>

          <div className="h-px bg-border/30 my-1" />
          <div className="px-3 py-1.5 text-[10px] font-black text-text-tertiary uppercase tracking-widest font-serif">
            <Upload className="w-3 h-3 inline mr-1.5" />
            {L4(language, { ko: "가져오기", en: "Import", ja: "インポート", zh: "导入" })}
          </div>
          <button onClick={() => fileInputRef.current?.click()} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex items-center gap-2 font-serif transition-colors pl-7">
            JSON {L4(language, { ko: "프로젝트", en: "Project", ja: "プロジェクト", zh: "项目" })}
          </button>
          <button onClick={() => textFileInputRef.current?.click()} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex items-center gap-2 font-serif transition-colors pl-7">
            {L4(language, { ko: "원고 파일 (TXT/MD/HWPX)", en: "Manuscript File (TXT/MD/HWPX)", ja: "原稿ファイル (TXT/MD/HWPX)", zh: "稿件文件 (TXT/MD/HWPX)" })}
          </button>
          <input ref={textFileInputRef} type="file" accept={STUDIO_MANUSCRIPT_IMPORT_ACCEPT} multiple className="hidden" onChange={handleImportTextFiles} />
        </div>
      )}
    </div>
  );
}
