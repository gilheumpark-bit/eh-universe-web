"use client";

/* ===========================================================
   LayoutProfileMenu — Loreguard 작업대 배치 프리셋

   현재 패널 폭/접힘/도크 상태를 저장하고, 다시 적용하거나 파일로
   내보내고 가져온다. 실 저장 코어는 lib/loreguard/layout-profile.
   =========================================================== */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Grid, Sync, X } from "@/components/loreguard/icons";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import {
  applyLayoutProfile,
  createLayoutProfileSnapshot,
  deleteLayoutProfile,
  listLayoutProfiles,
  parseLayoutProfile,
  saveLayoutProfile,
  serializeLayoutProfile,
  type LoreguardLayoutProfile,
} from "@/lib/loreguard/layout-profile";

interface LayoutProfileMenuProps {
  language: AppLanguage;
}

type Notice = { tone: "ok" | "warn"; text: string } | null;

function filenameFor(profile: LoreguardLayoutProfile): string {
  const safeName = profile.name.replace(/[\\/:*?"<>|]/g, "_").slice(0, 40) || "layout";
  return `loreguard-layout-${safeName}-${profile.updatedAt}.json`;
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function LayoutProfileMenu({ language }: LayoutProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<LoreguardLayoutProfile[]>([]);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const labels = useMemo(
    () => ({
      title: L4(language, { ko: "레이아웃 프리셋", en: "Layout presets", ja: "レイアウトプリセット", zh: "布局预设" }),
      save: L4(language, { ko: "현재 배치 저장", en: "Save current layout", ja: "現在の配置を保存", zh: "保存当前布局" }),
      apply: L4(language, { ko: "적용", en: "Apply", ja: "適用", zh: "应用" }),
      export: L4(language, { ko: "내보내기", en: "Export", ja: "書き出し", zh: "导出" }),
      import: L4(language, { ko: "가져오기", en: "Import", ja: "読み込み", zh: "导入" }),
      remove: L4(language, { ko: "삭제", en: "Delete", ja: "削除", zh: "删除" }),
      empty: L4(language, { ko: "저장된 배치가 없습니다", en: "No saved layouts", ja: "保存済み配置なし", zh: "暂无已保存布局" }),
      name: L4(language, { ko: "프리셋 이름", en: "Preset name", ja: "プリセット名", zh: "预设名称" }),
      placeholder: L4(language, { ko: "예: 집필 집중 / 설정 검수", en: "e.g. Writing focus / Lore review" }),
      saved: L4(language, { ko: "레이아웃을 저장했습니다", en: "Layout saved" }),
      applied: L4(language, { ko: "레이아웃을 적용했습니다", en: "Layout applied" }),
      imported: L4(language, { ko: "레이아웃을 가져왔습니다", en: "Layout imported" }),
      failed: L4(language, { ko: "레이아웃 파일을 읽지 못했습니다", en: "Could not read the layout file" }),
    }),
    [language],
  );

  const refresh = () => setProfiles(listLayoutProfiles());

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("loreguard:open-layout-profile", onOpen);
    return () => window.removeEventListener("loreguard:open-layout-profile", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const showNotice = (next: Notice) => {
    setNotice(next);
    window.setTimeout(() => setNotice(null), 2200);
  };

  const handleSave = () => {
    const profile = createLayoutProfileSnapshot(
      name.trim() || `${labels.title} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    );
    const saved = saveLayoutProfile(profile);
    setName("");
    refresh();
    showNotice({ tone: "ok", text: `${labels.saved}: ${saved.name}` });
  };

  const handleApply = (profile: LoreguardLayoutProfile) => {
    applyLayoutProfile(profile);
    refresh();
    showNotice({ tone: "ok", text: `${labels.applied}: ${profile.name}` });
  };

  const handleExport = (profile: LoreguardLayoutProfile) => {
    downloadText(filenameFor(profile), serializeLayoutProfile(profile));
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const imported = saveLayoutProfile(parseLayoutProfile(text));
      applyLayoutProfile(imported);
      refresh();
      showNotice({ tone: "ok", text: `${labels.imported}: ${imported.name}` });
    } catch {
      showNotice({ tone: "warn", text: labels.failed });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (profile: LoreguardLayoutProfile) => {
    deleteLayoutProfile(profile.id);
    refresh();
  };

  return (
    <div className="lg-layout-menu">
      <button
        type="button"
        className="eh-icbtn"
        title={labels.title}
        aria-label={labels.title}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Grid size={18} aria-hidden="true" />
      </button>
      {open ? (
        <div className="lg-layout-pop" role="dialog" aria-label={labels.title}>
          <div className="lg-layout-head">
            <strong>{labels.title}</strong>
            <button type="button" className="eh-icbtn" aria-label="닫기" onClick={() => setOpen(false)}>
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <label className="lg-layout-field">
            <span>{labels.name}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={labels.placeholder} />
          </label>
          <div className="lg-layout-actions">
            <button type="button" className="btn primary" onClick={handleSave}>
              <Check size={15} aria-hidden="true" />
              {labels.save}
            </button>
            <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
              <Download size={15} aria-hidden="true" />
              {labels.import}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="lg-layout-file"
              onChange={(event) => void handleImportFile(event.target.files?.[0] ?? null)}
            />
          </div>
          {notice ? (
            <div className={`lg-layout-note ${notice.tone}`} role={notice.tone === "warn" ? "alert" : "status"}>
              {notice.text}
            </div>
          ) : null}
          <div className="lg-layout-list">
            {profiles.length === 0 ? (
              <div className="lg-layout-empty">{labels.empty}</div>
            ) : (
              profiles.map((profile) => (
                <div key={profile.id} className="lg-layout-row">
                  <div className="lg-layout-row-main">
                    <b>{profile.name}</b>
                    <span>{new Date(profile.updatedAt).toLocaleString()}</span>
                  </div>
                  <button type="button" className="mini-btn ok" onClick={() => handleApply(profile)}>
                    <Sync size={13} aria-hidden="true" />
                    {labels.apply}
                  </button>
                  <button type="button" className="mini-btn" onClick={() => handleExport(profile)}>
                    {labels.export}
                  </button>
                  <button type="button" className="mini-btn no" onClick={() => handleDelete(profile)}>
                    {labels.remove}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
