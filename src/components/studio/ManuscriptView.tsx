"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Download, BookOpen, ChevronDown, ChevronUp, Save, Trash2, Edit3, PenTool, Sparkles, GitCompare } from "lucide-react";
import type { StoryConfig, EpisodeManuscript, AppLanguage, ChapterAnalysis } from "@/lib/studio-types";
import { createT, L4 } from "@/lib/i18n";
import ChapterAnalysisView from "./ChapterAnalysisView";

// ============================================================
// PART 0 — DIFF UTILITY (line-level LCS)
// ============================================================

interface DiffLine { type: 'same' | 'add' | 'remove'; text: string }

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const m = oldLines.length, n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = oldLines[i-1] === newLines[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  let i = m, j = n;
  const stack: DiffLine[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i-1] === newLines[j-1]) { stack.push({ type: 'same', text: oldLines[i-1] }); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { stack.push({ type: 'add', text: newLines[j-1] }); j--; }
    else { stack.push({ type: 'remove', text: oldLines[i-1] }); i--; }
  }
  return stack.reverse();
}

// ============================================================
// PART 1 — TYPES & HELPERS
// ============================================================

interface ManuscriptViewProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: (c: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;
  messages: { role: string; content: string }[];
  onEditInStudio?: (content: string) => void;
}

function stripJSON(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, "").trim();
}

function generateEpub(title: string, author: string, manuscripts: EpisodeManuscript[], lang: AppLanguage = 'KO'): Blob {
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
<h3>${L4(lang, { ko: '목차', en: 'Table of Contents' })}</h3>
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

export default function ManuscriptView({ language, config, setConfig, messages, onEditInStudio }: ManuscriptViewProps) {
  const t = createT(language);
  const manuscripts = useMemo(() => config.manuscripts || [], [config.manuscripts]);
  const [expandedEp, setExpandedEp] = useState<number | null>(null);
  const [editingEp, setEditingEp] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [analysisEp, setAnalysisEp] = useState<number | null>(null);
  const [diffEp, setDiffEp] = useState<number | null>(null);

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
    const msg = t('manuscript.deleteConfirm').replace('{ep}', String(ep));
    if (!window.confirm(msg)) return;
    updateManuscripts(manuscripts.filter((m) => m.episode !== ep));
  };

  const saveAnalysis = useCallback(
    (analysis: ChapterAnalysis) => {
      const existing = config.chapterAnalyses || [];
      const idx = existing.findIndex((a) => a.episode === analysis.episode);
      const updated = idx >= 0
        ? existing.map((a, i) => (i === idx ? analysis : a))
        : [...existing, analysis];
      setConfig((prev) => ({ ...prev, chapterAnalyses: updated }));
      setAnalysisEp(null);
    },
    [config.chapterAnalyses, setConfig]
  );

  const getAnalysis = useCallback(
    (ep: number): ChapterAnalysis | null => {
      return (config.chapterAnalyses || []).find((a) => a.episode === ep) ?? null;
    },
    [config.chapterAnalyses]
  );

  const exportEpub = () => {
    if (manuscripts.length === 0) return;
    const blob = generateEpub(
      config.title || t('manuscript.untitled'),
      "NOA Studio",
      manuscripts,
      language
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.title || "noa-manuscript"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get the latest AI-generated content for diff comparison
  const getAiSourceForEp = useCallback(() => {
    const aiTexts = messages
      .filter((m) => m.role === "assistant" && m.content)
      .map((m) => stripJSON(m.content))
      .filter(Boolean);
    return aiTexts.join("\n\n---\n\n");
  }, [messages]);

  const sorted = [...manuscripts].sort((a, b) => a.episode - b.episode);
  const progressPercent = totalTarget > 0 ? Math.min(100, Math.round((totalChars / totalTarget) * 100)) : 0;

  return (
    <div className="max-w-6xl mx-auto py-4 px-3 sm:py-8 sm:px-4 md:py-12 md:px-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-accent-purple" />
          <h2 className="text-lg font-black tracking-tighter uppercase font-mono">
            {t('manuscript.manuscriptTitle')}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={collectFromMessages}
            className="px-4 py-2 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider hover:opacity-80 transition-opacity"
          >
            <Save className="w-3 h-3 inline mr-1" />
            {`EP.${config.episode} ${t('manuscript.collectEp')}`}
          </button>
          <button
            onClick={exportEpub}
            disabled={manuscripts.length === 0}
            className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-[10px] font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-mono uppercase tracking-wider transition-colors"
          >
            <Download className="w-3 h-3 inline mr-1" />
            {t('manuscript.exportAll')}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-[10px] font-bold font-mono uppercase tracking-wider">
          <span className="text-text-tertiary">
            {t('manuscript.overallProgress')}
          </span>
          <span className="text-accent-purple">
            {totalChars.toLocaleString()}{t('manuscript.charUnit')} / {totalTarget.toLocaleString()}{t('manuscript.charUnit')} ({progressPercent}%)
          </span>
        </div>
        <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-text-tertiary font-mono">
          <span>{sorted.length} / {config.totalEpisodes} {t('manuscript.eps')}</span>
          <span>{t('manuscript.target')}: {targetPerEp.toLocaleString()}{t('manuscript.charsPerEp')}</span>
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
              className={`relative h-8 rounded text-[9px] font-bold font-mono transition-all ${
                ms
                  ? pct >= 100
                    ? "bg-accent-green/20 text-accent-green border border-accent-green/30"
                    : "bg-accent-purple/10 text-accent-purple border border-accent-purple/20"
                  : "bg-bg-secondary text-text-tertiary border border-border"
              } ${isCurrent ? "ring-2 ring-accent-purple" : ""}`}
              title={ms ? `EP.${ep}: ${ms.charCount.toLocaleString()}${t('manuscript.charUnit')}` : `EP.${ep}`}
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
            {t('manuscript.noManuscripts')}
          </div>
        ) : (
          sorted.map((m) => (
            <div key={m.episode} className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedEp(expandedEp === m.episode ? null : m.episode)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-tertiary/30 transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <span className="text-xs font-black font-mono text-accent-purple shrink-0">
                    EP.{m.episode}
                  </span>
                  <span className="text-xs font-bold text-text-primary truncate min-w-0">
                    {m.title}
                  </span>
                  <span className="text-[9px] text-text-tertiary font-mono shrink-0 hidden sm:inline">
                    {m.charCount.toLocaleString()}{t('manuscript.charUnit')}
                  </span>
                  {m.charCount >= targetPerEp ? (
                    <span className="text-[10px] text-accent-green font-bold px-1.5 py-0.5 bg-accent-green/10 rounded">
                      {t('manuscript.done')}
                    </span>
                  ) : (
                    <span className="text-[10px] text-accent-amber font-bold px-1.5 py-0.5 bg-accent-amber/10 rounded">
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
                        placeholder={t('manuscript.title')}
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full min-h-[40vh] bg-bg-primary border border-border rounded-lg p-4 text-sm leading-[2] font-serif outline-none focus:border-accent-purple resize-y"
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-text-tertiary font-mono">
                          {editContent.length.toLocaleString()}{t('manuscript.charUnit')}
                        </span>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingEp(null)} className="px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-[10px] font-bold text-text-tertiary">
                            {t('manuscript.cancel')}
                          </button>
                          <button onClick={saveEdit} className="px-3 py-1.5 bg-accent-purple text-white rounded-lg text-[10px] font-bold">
                            {t('manuscript.save')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="flex flex-wrap justify-end gap-2 mb-3">
                        <button
                          onClick={() => setAnalysisEp(analysisEp === m.episode ? null : m.episode)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider transition-colors ${
                            analysisEp === m.episode
                              ? "bg-accent-amber/25 text-accent-amber border border-accent-amber/40"
                              : getAnalysis(m.episode)
                                ? "bg-accent-amber/15 text-accent-amber/80 border border-accent-amber/25 hover:bg-accent-amber/25 hover:text-accent-amber"
                                : "bg-bg-tertiary/70 text-text-secondary border border-border hover:bg-accent-amber/15 hover:text-accent-amber hover:border-accent-amber/30"
                          }`}
                          title={t('chapterAnalysis.title')}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {t('chapterAnalysis.title')}
                        </button>
                        {onEditInStudio && (
                          <button onClick={() => onEditInStudio(m.content)} className="p-1.5 bg-bg-tertiary/50 rounded text-text-tertiary hover:text-accent-green transition-colors" title={t('manuscript.title')}>
                            <PenTool className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => setDiffEp(diffEp === m.episode ? null : m.episode)}
                          className={`p-1.5 rounded transition-colors ${
                            diffEp === m.episode ? 'bg-blue-600/20 text-blue-400' : 'bg-bg-tertiary/50 text-text-tertiary hover:text-blue-400'
                          }`}
                          title={t('manuscript.aiVsCurrent')}
                        >
                          <GitCompare className="w-3 h-3" />
                        </button>
                        <button onClick={() => startEdit(m)} aria-label="편집" className="p-1.5 bg-bg-tertiary/50 rounded text-text-tertiary hover:text-accent-purple transition-colors">
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button onClick={() => deleteManuscript(m.episode)} aria-label="삭제" className="p-1.5 bg-bg-tertiary/50 rounded text-text-tertiary hover:text-accent-red transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Diff View */}
                      {diffEp === m.episode && (() => {
                        const aiSource = getAiSourceForEp();
                        if (!aiSource) return (
                          <div className="mb-4 px-4 py-3 bg-bg-primary border border-border rounded-lg text-[10px] text-text-tertiary">
                            {t('manuscript.noAiSource')}
                          </div>
                        );
                        const diff = computeDiff(aiSource, m.content);
                        const adds = diff.filter(d => d.type === 'add').length;
                        const removes = diff.filter(d => d.type === 'remove').length;
                        return (
                          <div className="mb-4 border border-blue-500/20 rounded-xl overflow-hidden">
                            <div className="px-4 py-2 bg-blue-600/10 flex items-center justify-between">
                              <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest font-mono">
                                {t('manuscript.aiVsCurrent')}
                              </span>
                              <span className="text-[9px] font-mono">
                                <span className="text-green-400">+{adds}</span>{' '}
                                <span className="text-red-400">-{removes}</span>
                              </span>
                            </div>
                            <div className="p-3 bg-bg-primary max-h-60 overflow-y-auto text-[11px] font-mono leading-relaxed custom-scrollbar">
                              {/* Cap diff rendering to 500 lines for DOM performance */}
                              {(diff.length > 500 ? diff.slice(0, 500) : diff).map((line, i) => (
                                <div key={i} className={`whitespace-pre-wrap ${
                                  line.type === 'add' ? 'text-green-400/80 bg-green-900/10' :
                                  line.type === 'remove' ? 'text-red-400/60 bg-red-900/10 line-through' : 'text-text-tertiary'
                                }`}>
                                  <span className="inline-block w-4 text-text-tertiary select-none">
                                    {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                                  </span>
                                  {line.text || '\u00A0'}
                                </div>
                              ))}
                              {diff.length > 500 && (
                                <div className="text-center py-1 text-[9px] text-text-tertiary">+{diff.length - 500} lines truncated</div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Chapter Analysis Panel */}
                      {analysisEp === m.episode && (
                        <div className="mb-4 border border-accent-amber/20 rounded-xl p-4 bg-bg-primary">
                          <ChapterAnalysisView
                            language={language}
                            episode={m.episode}
                            manuscriptContent={m.content}
                            analysis={getAnalysis(m.episode)}
                            onSaveAnalysis={saveAnalysis}
                            onClose={() => setAnalysisEp(null)}
                          />
                        </div>
                      )}

                      <div className="prose prose-sm max-w-none text-text-secondary font-serif leading-[2] max-h-[60vh] sm:max-h-[50vh] overflow-y-auto overscroll-contain whitespace-pre-wrap text-sm sm:text-sm" style={{ WebkitOverflowScrolling: 'touch' }}>
                        {m.content}
                      </div>
                      <div className="mt-3 text-[10px] text-text-tertiary font-mono">
                        {t('manuscript.lastUpdate')}: {new Date(m.lastUpdate).toLocaleString()}
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
