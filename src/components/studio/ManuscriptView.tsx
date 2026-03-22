"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Download, BookOpen, ChevronDown, ChevronUp, Save, Trash2, Edit3 } from "lucide-react";
import type { StoryConfig, EpisodeManuscript, AppLanguage } from "@/lib/studio-types";

// ============================================================
// PART 1 — TYPES & HELPERS
// ============================================================

interface ManuscriptViewProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: (c: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;
  messages: { role: string; content: string }[];
}

function stripJSON(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, "").trim();
}

function generateEpub(title: string, author: string, manuscripts: EpisodeManuscript[]): Blob {
  const mimetype = "application/epub+zip";
  const container = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  const chapters = manuscripts
    .sort((a, b) => a.episode - b.episode)
    .map((m, i) => {
      const chId = `ch${i + 1}`;
      const body = m.content
        .split("\n")
        .filter(Boolean)
        .map((p) => `<p>${p.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
        .join("\n    ");
      const html = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${m.title || `EP.${m.episode}`}</title>
<style>body{font-family:serif;line-height:1.8;padding:1em;}h1{font-size:1.4em;margin-bottom:1em;}</style>
</head>
<body>
  <h1>${m.title || `EP.${m.episode}`}</h1>
  ${body}
</body>
</html>`;
      return { id: chId, filename: `${chId}.xhtml`, html, title: m.title || `EP.${m.episode}` };
    });

  const spine = chapters.map((c) => `<itemref idref="${c.id}"/>`).join("\n    ");
  const manifest = chapters.map((c) => `<item id="${c.id}" href="${c.filename}" media-type="application/xhtml+xml"/>`).join("\n    ");
  const navPoints = chapters
    .map(
      (c, i) => `<navPoint id="nav-${c.id}" playOrder="${i + 1}">
      <navLabel><text>${c.title}</text></navLabel>
      <content src="${c.filename}"/>
    </navPoint>`
    )
    .join("\n    ");

  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:language>ko</dc:language>
    <dc:identifier id="bookid">noa-${Date.now()}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifest}
  </manifest>
  <spine toc="ncx">
    ${spine}
  </spine>
</package>`;

  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="noa-${Date.now()}"/></head>
  <docTitle><text>${title}</text></docTitle>
  <navMap>
    ${navPoints}
  </navMap>
</ncx>`;

  // Build a simple EPUB as concatenated XML (valid for most readers)
  // For a proper zip we'd need JSZip, but we keep it dependency-free
  const files: Record<string, string> = {
    "mimetype": mimetype,
    "META-INF/container.xml": container,
    "OEBPS/content.opf": opf,
    "OEBPS/toc.ncx": ncx,
  };
  chapters.forEach((c) => {
    files[`OEBPS/${c.filename}`] = c.html;
  });

  // Fallback: output as HTML bundle since we can't create a proper ZIP without a library
  const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  body { font-family: serif; max-width: 700px; margin: 40px auto; padding: 0 20px; line-height: 1.8; color: #222; }
  h1 { font-size: 2em; margin-bottom: 0.5em; }
  h2 { font-size: 1.4em; margin-top: 2em; border-bottom: 1px solid #ccc; padding-bottom: 0.3em; }
  .toc { margin: 2em 0; }
  .toc a { display: block; padding: 4px 0; color: #555; text-decoration: none; }
  .toc a:hover { color: #000; }
  .chapter { page-break-before: always; margin-top: 3em; }
  @media print { body { margin: 0; } .chapter { page-break-before: always; } }
</style>
</head>
<body>
<h1>${title}</h1>
<p style="color:#888;">${author} | ${manuscripts.length} episodes | ${new Date().toLocaleDateString()}</p>
<div class="toc">
<h3>목차</h3>
${chapters.map((c, i) => `<a href="#ch${i}">${c.title}</a>`).join("\n")}
</div>
${chapters
  .map(
    (c, i) => `<div class="chapter" id="ch${i}">
<h2>${c.title}</h2>
${manuscripts
  .sort((a, b) => a.episode - b.episode)[i]
  .content.split("\n")
  .filter(Boolean)
  .map((p) => `<p>${p.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
  .join("\n")}
</div>`
  )
  .join("\n")}
</body>
</html>`;

  return new Blob([fullHtml], { type: "text/html;charset=utf-8" });
}

// ============================================================
// PART 2 — COMPONENT
// ============================================================

export default function ManuscriptView({ language, config, setConfig, messages }: ManuscriptViewProps) {
  const isKO = language === "KO";
  const manuscripts = config.manuscripts || [];
  const [expandedEp, setExpandedEp] = useState<number | null>(null);
  const [editingEp, setEditingEp] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");

  const totalChars = useMemo(() => manuscripts.reduce((sum, m) => sum + m.charCount, 0), [manuscripts]);
  const targetPerEp = config.guardrails.min;
  const totalTarget = targetPerEp * config.totalEpisodes;

  const updateManuscripts = useCallback(
    (updated: EpisodeManuscript[]) => {
      setConfig((prev) => ({ ...prev, manuscripts: updated }));
    },
    [setConfig]
  );

  // Collect AI-generated content from the current episode's messages
  const collectFromMessages = useCallback(() => {
    const aiTexts = messages
      .filter((m) => m.role === "assistant" && m.content)
      .map((m) => stripJSON(m.content))
      .filter(Boolean);
    if (aiTexts.length === 0) return;

    const combined = aiTexts.join("\n\n---\n\n");
    const ep = config.episode;
    const existing = manuscripts.find((m) => m.episode === ep);

    if (existing) {
      const updated = manuscripts.map((m) =>
        m.episode === ep
          ? { ...m, content: combined, charCount: combined.length, lastUpdate: Date.now() }
          : m
      );
      updateManuscripts(updated);
    } else {
      updateManuscripts([
        ...manuscripts,
        {
          episode: ep,
          title: config.title ? `${config.title} EP.${ep}` : `EP.${ep}`,
          content: combined,
          charCount: combined.length,
          lastUpdate: Date.now(),
        },
      ]);
    }
  }, [messages, config.episode, config.title, manuscripts, updateManuscripts]);

  const startEdit = (m: EpisodeManuscript) => {
    setEditingEp(m.episode);
    setEditContent(m.content);
    setEditTitle(m.title);
  };

  const saveEdit = () => {
    if (editingEp == null) return;
    const updated = manuscripts.map((m) =>
      m.episode === editingEp
        ? { ...m, content: editContent, title: editTitle, charCount: editContent.length, lastUpdate: Date.now() }
        : m
    );
    updateManuscripts(updated);
    setEditingEp(null);
  };

  const deleteManuscript = (ep: number) => {
    const msg = isKO ? `EP.${ep} 원고를 삭제하시겠습니까?` : `Delete EP.${ep} manuscript?`;
    if (!window.confirm(msg)) return;
    updateManuscripts(manuscripts.filter((m) => m.episode !== ep));
  };

  const exportEpub = () => {
    if (manuscripts.length === 0) return;
    const blob = generateEpub(
      config.title || (isKO ? "무제" : "Untitled"),
      isKO ? "NOA Studio" : "NOA Studio",
      manuscripts
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.title || "noa-manuscript"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sorted = [...manuscripts].sort((a, b) => a.episode - b.episode);
  const progressPercent = totalTarget > 0 ? Math.min(100, Math.round((totalChars / totalTarget) * 100)) : 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 md:py-12 md:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-accent-purple" />
          <h2 className="text-lg font-black tracking-tighter uppercase font-[family-name:var(--font-mono)]">
            {isKO ? "원고 관리" : "Manuscript"}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={collectFromMessages}
            className="px-4 py-2 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity"
          >
            <Save className="w-3 h-3 inline mr-1" />
            {isKO ? `EP.${config.episode} 수집` : `Collect EP.${config.episode}`}
          </button>
          <button
            onClick={exportEpub}
            disabled={manuscripts.length === 0}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-[10px] font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors"
          >
            <Download className="w-3 h-3 inline mr-1" />
            {isKO ? "전체 내보내기 (HTML)" : "Export All (HTML)"}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider">
          <span className="text-text-tertiary">
            {isKO ? "전체 진행률" : "Overall Progress"}
          </span>
          <span className="text-accent-purple">
            {totalChars.toLocaleString()}{isKO ? "자" : " chars"} / {totalTarget.toLocaleString()}{isKO ? "자" : " chars"} ({progressPercent}%)
          </span>
        </div>
        <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-text-tertiary font-[family-name:var(--font-mono)]">
          <span>{sorted.length} / {config.totalEpisodes} {isKO ? "화" : "eps"}</span>
          <span>{isKO ? "목표" : "Target"}: {targetPerEp.toLocaleString()}{isKO ? "자/화" : " chars/ep"}</span>
        </div>
      </div>

      {/* Episode Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
        {Array.from({ length: config.totalEpisodes }, (_, i) => {
          const ep = i + 1;
          const ms = manuscripts.find((m) => m.episode === ep);
          const pct = ms ? Math.min(100, Math.round((ms.charCount / targetPerEp) * 100)) : 0;
          const isCurrent = ep === config.episode;
          return (
            <button
              key={ep}
              onClick={() => ms && setExpandedEp(expandedEp === ep ? null : ep)}
              className={`relative h-8 rounded text-[9px] font-bold font-[family-name:var(--font-mono)] transition-all ${
                ms
                  ? pct >= 100
                    ? "bg-accent-green/20 text-accent-green border border-accent-green/30"
                    : "bg-accent-purple/10 text-accent-purple border border-accent-purple/20"
                  : "bg-bg-secondary text-text-tertiary border border-border"
              } ${isCurrent ? "ring-2 ring-accent-purple" : ""}`}
              title={ms ? `EP.${ep}: ${ms.charCount.toLocaleString()}${isKO ? "자" : " chars"}` : `EP.${ep}`}
            >
              {ep}
              {ms && (
                <div
                  className="absolute bottom-0 left-0 h-0.5 bg-accent-purple/50 rounded-b"
                  style={{ width: `${pct}%` }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Episode List */}
      <div className="space-y-2">
        {sorted.length === 0 ? (
          <div className="py-12 text-center text-text-tertiary text-sm">
            {isKO
              ? "아직 수집된 원고가 없습니다. 집필 후 \"수집\" 버튼을 눌러주세요."
              : "No manuscripts yet. Write in AI mode then click \"Collect\"."}
          </div>
        ) : (
          sorted.map((m) => (
            <div key={m.episode} className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedEp(expandedEp === m.episode ? null : m.episode)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-tertiary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black font-[family-name:var(--font-mono)] text-accent-purple">
                    EP.{m.episode}
                  </span>
                  <span className="text-xs font-bold text-text-primary truncate max-w-[200px]">
                    {m.title}
                  </span>
                  <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)]">
                    {m.charCount.toLocaleString()}{isKO ? "자" : " chars"}
                  </span>
                  {m.charCount >= targetPerEp ? (
                    <span className="text-[8px] text-accent-green font-bold px-1.5 py-0.5 bg-accent-green/10 rounded">
                      {isKO ? "달성" : "Done"}
                    </span>
                  ) : (
                    <span className="text-[8px] text-accent-amber font-bold px-1.5 py-0.5 bg-accent-amber/10 rounded">
                      {Math.round((m.charCount / targetPerEp) * 100)}%
                    </span>
                  )}
                </div>
                {expandedEp === m.episode ? <ChevronUp className="w-4 h-4 text-text-tertiary" /> : <ChevronDown className="w-4 h-4 text-text-tertiary" />}
              </button>
              {expandedEp === m.episode && (
                <div className="border-t border-border">
                  {editingEp === m.episode ? (
                    <div className="p-4 space-y-3">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-accent-purple"
                        placeholder={isKO ? "제목" : "Title"}
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full min-h-[40vh] bg-bg-primary border border-border rounded-lg p-4 text-sm leading-[2] font-serif outline-none focus:border-accent-purple resize-y"
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)]">
                          {editContent.length.toLocaleString()}{isKO ? "자" : " chars"}
                        </span>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingEp(null)} className="px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-[10px] font-bold text-text-tertiary">
                            {isKO ? "취소" : "Cancel"}
                          </button>
                          <button onClick={saveEdit} className="px-3 py-1.5 bg-accent-purple text-white rounded-lg text-[10px] font-bold">
                            {isKO ? "저장" : "Save"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flex justify-end gap-2 mb-3">
                        <button onClick={() => startEdit(m)} className="p-1.5 bg-bg-tertiary/50 rounded text-text-tertiary hover:text-accent-purple transition-colors">
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button onClick={() => deleteManuscript(m.episode)} className="p-1.5 bg-bg-tertiary/50 rounded text-text-tertiary hover:text-accent-red transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="prose prose-sm max-w-none text-text-secondary font-serif leading-[2] max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-sm">
                        {m.content}
                      </div>
                      <div className="mt-3 text-[8px] text-text-tertiary font-[family-name:var(--font-mono)]">
                        {isKO ? "최종 수정" : "Last update"}: {new Date(m.lastUpdate).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
