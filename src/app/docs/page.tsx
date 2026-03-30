"use client";

import Header from "@/components/Header";
import { useLang, L2A } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { useState, useEffect } from "react";

// ============================================================
// PART 1 — Section data (KO)
// ============================================================

const sectionsKo = [
  { id: "getting-started", title: "1. \uc2dc\uc791\ud558\uae30", content:
`\uc811\uc18d: https://ehuniverse.com
BYOK(Bring Your Own Key): Gemini, OpenAI, Claude, Groq, Mistral \uc9c0\uc6d0
\ud504\ub85c\uc81d\ud2b8 \uc0dd\uc131: \uc81c\ubaa9\uc744 \uc785\ub825\ud558\uba74 AI\uac00 \ucd08\uae30 \uc124\uc815\uc744 \uc81c\uc548\ud569\ub2c8\ub2e4.

\uc628\ubcf4\ub529 \uac00\uc774\ub4dc \ud22c\uc5b4 (5\ub2e8\uacc4)
\ucc98\uc74c \uc811\uc18d \uc2dc 5\ub2e8\uacc4 \uc548\ub0b4 \ud22c\uc5b4\uac00 \uc790\ub3d9 \uc2dc\uc791\ub429\ub2c8\ub2e4.
\ud504\ub85c\uc81d\ud2b8 \uc0dd\uc131 \u2192 \uc138\uacc4\uad00 \uc124\uacc4 \u2192 \uce90\ub9ad\ud130 \uc2a4\ud29c\ub514\uc624 \u2192 \uc9d1\ud544 \uc2a4\ud29c\ub514\uc624 \u2192 \ub0b4\ubcf4\ub0b4\uae30

Google \ub85c\uadf8\uc778 + Drive \ub3d9\uae30\ud654
Google \uacc4\uc815\uc73c\ub85c \ub85c\uadf8\uc778\ud558\uba74 \ubaa8\ub4e0 \ud504\ub85c\uc81d\ud2b8\uac00 Google Drive\uc5d0 \uc790\ub3d9 \ub3d9\uae30\ud654\ub429\ub2c8\ub2e4.` },

  { id: "world-design", title: "2. \uc138\uacc4\uad00 \uc124\uacc4", content:
`\uc7a5\ub974 7\uc885 \u00d7 \ud504\ub9ac\uc14b 2\uac1c = \ucd1d 14\uac1c \ud504\ub9ac\uc14b
\uc2dc\ub18d\uc2dc\uc2a4, \uce90\ub9ad\ud130, \uc2dc\ub300 \ubc30\uacbd \uc124\uc815
\ud150\uc158 \ucee4\ube0c \ucc28\ud2b8: \ud68c\ucc28\ubcc4 \uae34\uc7a5\uac10 \uc2dc\uac01\ud654

\ucd1d \ud68c\ucc28 \ucd5c\ub300 300\ud654
\uc7a5\ud3b8 \uc5f0\uc7ac\ub97c \uc704\ud574 \ucd5c\ub300 300\ud68c\ucc28\uae4c\uc9c0 \uacc4\ud68d \uac00\ub2a5

\ud50c\ub7ab\ud3fc \ud504\ub9ac\uc14b 4\uc885
\ubb38\ud53c\uc544 / \ub178\ubca8\ud53c\uc544 / \uce74\uce74\uc624\ud398\uc774\uc9c0 / \ub124\uc774\ubc84 \uc2dc\ub9ac\uc988
\uac01 \ud50c\ub7ab\ud3fc\uc5d0 \ub9de\ub294 \uae00\uc790 \uc218\u00b7\ud68c\ucc28 \uad6c\uc131\uc744 \uc790\ub3d9 \uc124\uc815

NOL AI \ucc44\ud305: \uc138\uacc4\uad00 \uc124\uacc4 \uc804\uc6a9 AI \uc5b4\uc2dc\uc2a4\ud134\ud2b8` },

  { id: "world-simulator", title: "3. \uc138\uacc4\uad00 \uc2dc\ubbac\ub808\uc774\ud130", content:
`\uc7a5\ub974\ubcc4 \uc644\uc131\ub3c4 \uac80\uc0ac: \uc124\uc815 \uc77c\uad00\uc131\u00b7\ubb38\ub9e5 \uc624\ub958 \uc790\ub3d9 \uac10\uc9c0
\ubb38\uba85/\uc138\ub825 \uad00\uacc4 \uc2dc\uac01\ud654: \uc138\ub825 \uad00\uacc4\ub3c4 \uc790\ub3d9 \uc0dd\uc131
\ud5e5\uc2a4 \ub9f5 \ud398\uc778\ud305: \uc9c0\ub3c4 \uc704\uc5d0 \uc601\uc5ed\u00b7\uc138\ub825 \ubc30\uce58

EH \uc5d4\uc9c4 9\ub2e8\uacc4 \uc801\uc6a9\ub960
\ubbf8\uc801\uc6a9(0%) ~ \ud480EH(100%)\uae4c\uc9c0 9\ub2e8\uacc4\ub85c \uc870\uc808
\uac01 \ub2e8\uacc4\ub9c8\ub2e4 \ud65c\uc131\ud654\ub418\ub294 \ubaa8\ub4c8\uc774 \ub2e4\ub984

\uc7a5\ub974\ubcc4 \uad8c\uc7a5 \uad6c\uac04
\uba3c\uce58\ud0a8 15% / \ud310\ud0c0\uc9c0 30% / SF 60% / \uc21c\ubb38\ud559 100%
\uc7a5\ub974\uc5d0 \ub9de\ub294 \ucd5c\uc801 \uc5d4\uc9c4 \uc801\uc6a9\ub960\uc744 \uac00\uc774\ub4dc\ud569\ub2c8\ub2e4.` },

  { id: "character-studio", title: "4. \uce90\ub9ad\ud130 \uc2a4\ud29c\ub514\uc624", content:
`\uce90\ub9ad\ud130 \uad00\uacc4\ub3c4: \uc778\ubb3c \uac04 \uad00\uacc4\ub97c \uc2dc\uac01\uc801\uc73c\ub85c \ud45c\uc2dc
3-Tier \ud504\ub808\uc784\uc6cc\ud06c
  \ubf08\ub300: \uc774\ub984, \ub098\uc774, \uc131\ubcc4, \uc5ed\ud560
  \uc791\ub3d9: \ub3d9\uae30, \uac08\ub4f1, \uc131\uc7a5 \uace1\uc120
  \ub514\ud14c\uc77c: \ubc84\ub987, \ub9d0\ubc84\ub987, \ud2b8\ub77c\uc6b0\ub9c8
AI \uce90\ub9ad\ud130 \uc0dd\uc131: \ucd5c\uc18c \uc815\ubcf4\ub9cc \uc785\ub825\ud558\uba74 \uc804\uccb4 \ud504\ub85c\ud544 \uc790\ub3d9 \uc0dd\uc131

NOC AI \ucc44\ud305: \uce90\ub9ad\ud130 \uc124\uacc4 \uc804\uc6a9 AI \uc5b4\uc2dc\uc2a4\ud134\ud2b8` },

  { id: "direction-studio", title: "5. \uc5f0\ucd9c \uc2a4\ud29c\ub514\uc624", content:
`13\uac1c \ud0ed \uad6c\uc131:
\ud50c\ub86f / \ud150\uc158 / \ud398\uc774\uc2f1 / \uace0\uad6c\ub9c8 / \ud6c5 / \ud074\ub9ac\ud504\ud589\uc5b4 / \ub3c4\ud30c\ubbfc / \uc804\ud658 / \uac10\uc815 / \ub300\ud654 / \uce90\ub17c / \ubcf5\uc120 / \uba54\ubaa8

4\uc885 \ud50c\ub86f \uad6c\uc870:
3\ub9c9 \uad6c\uc870 / \uc601\uc6c5\uc5ec\uc815 / \uae30\uc2b9\uc804\uacb0 / \ud53c\ud788\ud150 \uace1\uc120

\uc5d0\ud53c\uc18c\ub4dc \uc52c\uc2dc\ud2b8 \uc800\uc7a5/\uc870\ud68c
\ud68c\ucc28\ubcc4 \uc52c \uad6c\uc131\uc744 \uc800\uc7a5\ud558\uace0 \uc5b8\uc81c\ub4e0 \uc870\ud68c \uac00\ub2a5
\uc52c \ub2e8\uc704\ub85c \ud50c\ub86f \ud750\ub984\uc744 \uc138\ubc00\ud558\uac8c \uad00\ub9ac\ud569\ub2c8\ub2e4.` },

  { id: "writing-studio", title: "6. \uc9d1\ud544 \uc2a4\ud29c\ub514\uc624", content:
`4\uac00\uc9c0 \uc9d1\ud544 \ubaa8\ub4dc:
  \ucd08\uc548 \uc0dd\uc131: AI\uac00 \uc804\uccb4 \ucd08\uace0 \uc791\uc131
  \uc9c1\uc811 \ud3b8\uc9d1: \uc0ac\uc6a9\uc790\uac00 \uc9c1\uc811 \uc791\uc131
  3\ub2e8\uacc4 \uc791\uc131: \uac1c\uc694 \u2192 \ud655\uc7a5 \u2192 \ub2e4\ub4ec\uae30
  AUTO 30%: 30% \uc790\ub3d9 \uc0dd\uc131 + 70% \uc0ac\uc6a9\uc790 \ud3b8\uc9d1

3\ud328\uc2a4 \uce94\ubc84\uc2a4: \ucd08\uace0 \u2192 \uad6c\uc870\uac80\uc99d \u2192 \ubb38\uccb4\uc218\uc815
\uc778\ub77c\uc778 \ub9ac\ub77c\uc774\ud130: \uc120\ud0dd \uc601\uc5ed \uc989\uc2dc \ub9ac\ub77c\uc774\ud2b8

Engine Report \uc778\ub77c\uc778 \ud45c\uc2dc
Grade / Tension / Pacing / EOS \uc810\uc218\uac00 \uc6d0\uace0 \uc606\uc5d0 \uc2e4\uc2dc\uac04 \ud45c\uc2dc

\uc790\ub3d9 \uc218\uc815 \ubc84\ud2bc
\uc5d4\uc9c4 \ub9ac\ud3ec\ud2b8 \uae30\ubc18\uc73c\ub85c \ubb38\uc81c \uad6c\uac04 \uc790\ub3d9 \uc218\uc815

NOD \uac10\ub3c5 \uc2e4\uc2dc\uac04 \ubd84\uc11d
\uc791\uc131 \uc911 \uc2e4\uc2dc\uac04 \ud53c\ub4dc\ubc31 \uc81c\uacf5

\ud560\ub8e8\uc2dc\ub124\uc774\uc158 \ud0d0\uc9c0
\uc138\uacc4\uad00 \uc124\uc815\uacfc \ubaa8\uc21c\ub418\ub294 \ub0b4\uc6a9 \uc790\ub3d9 \uac10\uc9c0

NOW AI \ucc44\ud305: \uc9d1\ud544 \uc804\uc6a9 AI \uc5b4\uc2dc\uc2a4\ud134\ud2b8` },

  { id: "style-studio", title: "7. \ubb38\uccb4 \uc2a4\ud29c\ub514\uc624", content:
`4\uac00\uc9c0 DNA:
  \ud558\ub4dcSF / \uc6f9\uc18c\uc124 / \ubb38\ud559 / \uba40\ud2f0\uc7a5\ub974

5\uac1c \uc2ac\ub77c\uc774\ub354:
  \ubb38\uc7a5\uae38\uc774 / \uac10\uc815\ubc00\ub3c4 / \ubb18\uc0ac\ubc29\uc2dd / \uc11c\uc220\uc2dc\uc810 / \uc5b4\ud718\uc218\uc900

10\uac1c \uc2a4\ud0c0\uc77c \ud504\ub9ac\uc14b: \uc6f9\uc18c\uc124 \ub300\ud654\uccb4, \ubb38\ud559 \ub0b4\ub808\uc774\uc158 \ub4f1

\ubb38\uccb4 \uc2e4\ud5d8\uc2e4:
\uc0d8\ud50c \ud14d\uc2a4\ud2b8\ub97c \uc785\ub825\ud558\uace0 \uc2ac\ub77c\uc774\ub354\ub97c \uc870\uc808\ud558\uba70 \uc2e4\uc2dc\uac04 \ubcc0\ud658 \ud655\uc778

NOE AI \ucc44\ud305: \ubb38\uccb4 \uc124\uacc4 \uc804\uc6a9 AI \uc5b4\uc2dc\uc2a4\ud134\ud2b8` },

  { id: "manuscript", title: "8. \uc6d0\uace0 \uad00\ub9ac", content:
`\ud68c\ucc28\ubcc4 \uc6d0\uace0 \uc800\uc7a5: \uc790\ub3d9 \uc800\uc7a5 + \uc218\ub3d9 \uc800\uc7a5

\ub0b4\ubcf4\ub0b4\uae30 \ud3ec\ub9f7:
  EPUB / DOCX / TXT / JSON / HTML

\uc9c4\ud589\ub960 \ub300\uc2dc\ubcf4\ub4dc:
\uc804\uccb4 \ud68c\ucc28 \ub300\ube44 \uc9d1\ud544 \uc644\ub8cc\uc728\uc744 \uc2dc\uac01\uc801\uc73c\ub85c \ud655\uc778` },

  { id: "engine-system", title: "9. \uc5d4\uc9c4 \uc2dc\uc2a4\ud15c", content:
`EH \uc5d4\uc9c4 9\ub2e8\uacc4 \uc7a5\ub974\ubcc4 \uc801\uc6a9\ub960
0% \ubbf8\uc801\uc6a9\ubd80\ud130 100% \ud480EH\uae4c\uc9c0 \uc7a5\ub974\ubcc4 \ucd5c\uc801 \uad6c\uac04 \uc81c\uacf5

\ub300\uac00 \uc2b9\uc218 \uacf5\uc2dd:
costMultiplier = max(0, (R-25)/75)
R: \uc5d4\uc9c4 \uc801\uc6a9\ub960(%). 25% \uc774\ud558\ub294 \ucd94\uac00 \ube44\uc6a9 \uc5c6\uc74c.

\ubaa8\ub4c8\ubcc4 \ud65c\uc131\ud654 \uc784\uacc4\uac12:
\uac01 \ubaa8\ub4c8\uc774 \ud65c\uc131\ud654\ub418\ub294 \ucd5c\uc18c \uc801\uc6a9\ub960\uc774 \uc815\uc758\ub418\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.

AdaptiveLearner: \uc624\ud0d0 \uc790\ub3d9 \ubcf4\uc815
\ubc18\ubcf5\ub418\ub294 \uc624\ud0d0\uc744 \ud559\uc2b5\ud558\uc5ec \uc790\ub3d9\uc73c\ub85c \ubcf4\uc815\ud569\ub2c8\ub2e4.

Session EMA: \uc7a5\ud3b8 \ub9e5\ub77d \ucd94\uc801
\uc9c0\uc218\uc774\ub3d9\ud3c9\uade0\uc73c\ub85c \uc7a5\ud3b8 \uc5f0\uc7ac \uc804\uccb4 \ub9e5\ub77d\uc744 \ucd94\uc801\ud569\ub2c8\ub2e4.

P0 \ubcf4\uc548:
ReDoS \ubc29\uc9c0 / XSS \ubc29\uc5b4 / IP \ud544\ud130` },

  { id: "common-features", title: "10. \uacf5\ud1b5 \uae30\ub2a5", content:
`\uc790\ub3d9 \uc800\uc7a5: localStorage \uae30\ubc18 \uc790\ub3d9 \uc800\uc7a5
Google Drive \ub3d9\uae30\ud654: \ub85c\uadf8\uc778 \uc2dc \ud074\ub77c\uc6b0\ub4dc \uc790\ub3d9 \ub3d9\uae30\ud654
4\uac1c\uad6d\uc5b4 \uc9c0\uc6d0: KO / EN / JP / CN
API \ud0a4 \ubc30\ub108 \ub2eb\uae30: \uc548\ub0b4 \ubc30\ub108\ub97c \uc6d0\ud074\ub9ad\uc73c\ub85c \ub2eb\uae30 \uac00\ub2a5
WCAG AA \uc811\uadfc\uc131: \ud0a4\ubcf4\ub4dc \ub124\ube44\uac8c\uc774\uc158, \uc2a4\ud06c\ub9b0 \ub9ac\ub354 \uc9c0\uc6d0` },
];

// ============================================================
// PART 2 — Section data (EN)
// ============================================================

const sectionsEn = [
  { id: "getting-started", title: "1. Getting Started", content:
`Access: https://ehuniverse.com
BYOK (Bring Your Own Key): Gemini, OpenAI, Claude, Groq, Mistral supported
Project creation: Enter a title and AI suggests initial settings.

Onboarding Guide Tour (5 steps)
A 5-step guided tour starts automatically on first visit.
Create project > World design > Character studio > Writing studio > Export

Google Login + Drive Sync
Sign in with Google to auto-sync all projects to Google Drive.` },

  { id: "world-design", title: "2. World Design", content:
`7 genres x 2 presets = 14 total presets
Synopsis, characters, and era settings
Tension curve chart: visualize tension per episode

Up to 300 episodes
Plan up to 300 episodes for long-running series.

4 Platform Presets
Munpia / Novelpia / KakaoPage / Naver Series
Auto-configures word count and episode structure per platform.

NOL AI Chat: AI assistant dedicated to world design` },

  { id: "world-simulator", title: "3. World Simulator", content:
`Genre-based completeness check: auto-detect setting inconsistencies
Civilization/faction relationship visualization: auto-generated relation maps
Hex map painting: place territories and factions on a map

EH Engine 9-Level Application Rate
Adjustable from 0% (none) to 100% (full EH) in 9 levels.
Different modules activate at each level.

Genre-Recommended Ranges
Munchkin 15% / Fantasy 30% / SF 60% / Literary Fiction 100%
Guides you to the optimal engine rate for your genre.` },

  { id: "character-studio", title: "4. Character Studio", content:
`Character relationship map: visual display of character connections
3-Tier Framework:
  Skeleton: name, age, gender, role
  Mechanics: motivation, conflict, growth arc
  Detail: habits, speech patterns, trauma
AI character generation: enter minimal info for full profile auto-generation

NOC AI Chat: AI assistant dedicated to character design` },

  { id: "direction-studio", title: "5. Direction Studio", content:
`13 Tabs:
Plot / Tension / Pacing / Sweet Potato / Hook / Cliffhanger / Dopamine / Transition / Emotion / Dialogue / Canon / Foreshadowing / Memo

4 Plot Structures:
3-Act / Hero's Journey / Ki-Seung-Jeon-Gyeol / Fichtean Curve

Episode Scene Sheet Save/View
Save per-episode scene compositions and review them anytime.
Manage plot flow at the scene level with fine granularity.` },

  { id: "writing-studio", title: "6. Writing Studio", content:
`4 Writing Modes:
  Draft generation: AI writes the full first draft
  Direct edit: user writes manually
  3-Step writing: outline > expand > polish
  AUTO 30%: 30% auto-generated + 70% user editing

3-Pass Canvas: draft > structure validation > style refinement
Inline Rewriter: instantly rewrite selected text

Engine Report Inline Display
Grade / Tension / Pacing / EOS scores shown in real-time next to the manuscript.

Auto-Fix Button
Automatically fix problem areas based on engine report.

NOD Director Real-time Analysis
Real-time feedback while writing.

Hallucination Detection
Auto-detect content that contradicts world settings.

NOW AI Chat: AI assistant dedicated to writing` },

  { id: "style-studio", title: "7. Style Studio", content:
`4 DNA Types:
  Hard SF / Web Novel / Literary / Multi-genre

5 Sliders:
  Sentence length / Emotional density / Description style / Narrative POV / Vocabulary level

10 Style Presets: Web novel dialogue style, literary narration, etc.

Style Lab:
Enter sample text, adjust sliders, and see real-time transformations.

NOE AI Chat: AI assistant dedicated to style design` },

  { id: "manuscript", title: "8. Manuscript", content:
`Per-episode manuscript saving: auto-save + manual save

Export Formats:
  EPUB / DOCX / TXT / JSON / HTML

Progress Dashboard:
Visually track completion rate across all episodes.` },

  { id: "engine-system", title: "9. Engine System", content:
`EH Engine 9-Level Genre Application Rate
From 0% (none) to 100% (full EH) with optimal ranges per genre.

Cost Multiplier Formula:
costMultiplier = max(0, (R-25)/75)
R: engine application rate (%). No extra cost below 25%.

Per-Module Activation Thresholds:
Each module has a defined minimum application rate for activation.

AdaptiveLearner: Auto False-Positive Correction
Learns from repeated false positives and auto-corrects.

Session EMA: Long-form Context Tracking
Tracks full context across long-running series via exponential moving average.

P0 Security:
ReDoS prevention / XSS defense / IP filtering` },

  { id: "common-features", title: "10. Common Features", content:
`Auto-save: localStorage-based automatic saving
Google Drive Sync: cloud sync on login
4 Languages: KO / EN / JP / CN
API Key Banner: dismissible with one click
WCAG AA Accessibility: keyboard navigation, screen reader support` },
];

// ============================================================
// PART 3 — Component
// ============================================================

const sectionMap = { ko: sectionsKo, en: sectionsEn };

export default function DocsPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; jp?: string; cn?: string }) => L4(lang, v);
  const secs = L2A(sectionMap, lang);
  const [activeId, setActiveId] = useState(secs[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    secs.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [secs]);

  return (
    <>
      <Header />
      <main className="pt-24">
        <div className="site-shell py-16 md:py-20">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar TOC */}
            <aside className="lg:w-56 shrink-0">
              <div className="premium-panel-soft motion-rise rounded-[24px] p-4 lg:sticky lg:top-24">
                <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold text-text-tertiary tracking-[0.2em] uppercase mb-4">
                  {T({ ko: "목차", en: "Contents", jp: "目次", cn: "目录" })}
                </h2>
                <nav className="space-y-1" role="navigation" aria-label={T({ ko: "목차", en: "Table of contents", jp: "目次", cn: "目录" })}>
                  {secs.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      aria-label={s.title}
                      aria-current={activeId === s.id ? "location" : undefined}
                      className={`block py-1.5 px-3 rounded text-xs transition-colors font-[family-name:var(--font-mono)] ${
                        activeId === s.id
                          ? "text-accent-amber bg-accent-amber/10 font-bold"
                          : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
                      }`}
                    >
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <div className="doc-header motion-rise motion-rise-delay-1 rounded-t-[24px] mb-0">
                <span className="badge badge-classified mr-2">PUBLIC</span>
                {T({ ko: "문서 등급: PUBLIC | 버전: 2.0 | NOA Studio 사용자 매뉴얼", en: "Document Level: PUBLIC | Version: 2.0 | NOA Studio User Manual" })}
              </div>
              <div className="premium-panel motion-rise motion-rise-delay-2 rounded-b-[30px] rounded-t-none border-t-0 p-8 sm:p-12">
                <h1 className="site-title text-3xl font-bold tracking-tight mb-2">
                  NOA STUDIO MANUAL
                </h1>
                <p className="text-text-tertiary text-sm font-[family-name:var(--font-document)] mb-12">
                  {T({ ko: "AI 기반 소설 집필 플랫폼 — 전체 기능 가이드", en: "AI-Powered Novel Writing Platform \u2014 Complete Feature Guide" })}
                </p>

                {secs.map((s) => (
                  <section key={s.id} id={s.id} className="mb-12 scroll-mt-24">
                    <h2 className="font-[family-name:var(--font-mono)] text-lg font-bold text-accent-purple tracking-wider uppercase mb-4 pb-2 border-b border-border">
                      {s.title}
                    </h2>
                    <div className="whitespace-pre-line text-text-secondary leading-relaxed text-sm">
                      {s.content}
                    </div>
                  </section>
                ))}

                <div className="mt-16 border-t border-border pt-6">
                  <p className="font-[family-name:var(--font-document)] text-xs text-text-tertiary italic text-center">
                    {T({ ko: "NOA Studio는 오픈소스 AI 소설 집필 플랫폼입니다. GitHub에서 기여를 환영합니다.", en: "NOA Studio is an open-source AI novel writing platform. Contributions welcome on GitHub." })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
