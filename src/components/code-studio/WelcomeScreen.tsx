"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================

import { useEffect, useState } from "react";
import { Code2, Play, Upload, Cpu, MessageSquare, Shield, Layers } from "lucide-react";

interface WelcomeScreenProps {
  onNewFile: () => void;
  onOpenDemo: () => void;
  onBlankProject?: () => void;
  onImportProject?: () => void;
}

// ============================================================
// PART 2 — CTA Card Component
// ============================================================

interface CTACardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentClass: string;
  glowColor: string;
  onClick: () => void;
  delay: number;
}

function CTACard({ icon, title, description, accentClass, glowColor, onClick, delay }: CTACardProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-8 py-7 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-white/[0.12] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Glow behind icon */}
      <div
        className="absolute top-6 h-12 w-12 rounded-full opacity-20 blur-xl transition-opacity duration-300 group-hover:opacity-40"
        style={{ background: glowColor }}
      />
      <div className={`relative z-10 rounded-xl border border-white/[0.08] p-3 ${accentClass}`}>
        {icon}
      </div>
      <div className="text-center">
        <div className="font-[family-name:var(--font-mono)] text-sm font-semibold text-text-primary">
          {title}
        </div>
        <div className="mt-1 font-[family-name:var(--font-mono)] text-[11px] text-text-tertiary">
          {description}
        </div>
      </div>
    </button>
  );
}

// ============================================================
// PART 3 — Feature Badge
// ============================================================

function FeatureBadge({ icon, label, delay }: { icon: React.ReactNode; label: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 backdrop-blur-sm transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      {icon}
      <span className="font-[family-name:var(--font-mono)] text-[11px] text-text-secondary">{label}</span>
    </div>
  );
}

// ============================================================
// PART 4 — Main WelcomeScreen
// ============================================================

export default function WelcomeScreen({ onNewFile, onOpenDemo, onBlankProject, onImportProject }: WelcomeScreenProps) {
  const [titleVisible, setTitleVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [shortcutsVisible, setShortcutsVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setTitleVisible(true), 100);
    const t2 = setTimeout(() => setSubtitleVisible(true), 300);
    const t3 = setTimeout(() => setShortcutsVisible(true), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {/* Background: radial gradient layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07]" style={{ background: "radial-gradient(circle, #2f9b83 0%, transparent 70%)" }} />
        <div className="absolute left-1/4 top-2/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #8d7bc3 0%, transparent 70%)" }} />
        <div className="absolute right-1/4 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #5c8fd6 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10 px-6 py-12">
        {/* Title with glow */}
        <div className="text-center">
          <div
            className={`relative transition-all duration-700 ${
              titleVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
            }`}
          >
            {/* Title glow */}
            <div className="absolute left-1/2 top-1/2 h-20 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl" style={{ background: "#2f9b83" }} />
            <h1 className="relative text-3xl font-bold tracking-tight text-text-primary" style={{ fontFamily: "var(--font-display, var(--font-mono))" }}>
              Code Studio
            </h1>
          </div>
          <p
            className={`mt-3 font-[family-name:var(--font-mono)] text-sm text-text-tertiary transition-all duration-500 ${
              subtitleVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            AI-Powered Development Environment
          </p>
        </div>

        {/* CTA Cards */}
        <div className="flex flex-wrap items-center justify-center gap-5">
          <CTACard
            icon={<Code2 className="h-6 w-6 text-accent-green" />}
            title="New File"
            description="Start coding from scratch"
            accentClass="bg-accent-green/10"
            glowColor="#2f9b83"
            onClick={onNewFile}
            delay={400}
          />
          <CTACard
            icon={<Play className="h-6 w-6 text-accent-purple" />}
            title="Open Demo"
            description="Explore with sample project"
            accentClass="bg-accent-purple/10"
            glowColor="#8d7bc3"
            onClick={onOpenDemo}
            delay={500}
          />
          {onBlankProject && (
            <CTACard
              icon={<Layers className="h-6 w-6 text-accent-amber" />}
              title="Blank Project"
              description="Empty project with README"
              accentClass="bg-accent-amber/10"
              glowColor="#d4a259"
              onClick={onBlankProject}
              delay={550}
            />
          )}
          <CTACard
            icon={<Upload className="h-6 w-6 text-accent-blue" />}
            title="Import"
            description="Load existing files"
            accentClass="bg-accent-blue/10"
            glowColor="#5c8fd6"
            onClick={onImportProject ?? onNewFile}
            delay={600}
          />
        </div>

        {/* Feature highlights */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <FeatureBadge icon={<Cpu className="h-3.5 w-3.5 text-accent-green" />} label="Monaco Editor" delay={700} />
          <FeatureBadge icon={<MessageSquare className="h-3.5 w-3.5 text-accent-purple" />} label="AI Assistant" delay={760} />
          <FeatureBadge icon={<Layers className="h-3.5 w-3.5 text-accent-blue" />} label="8-Team Pipeline" delay={820} />
          <FeatureBadge icon={<Shield className="h-3.5 w-3.5 text-accent-amber" />} label="NOA Security" delay={880} />
        </div>

        {/* Keyboard shortcuts */}
        <div
          className={`font-[family-name:var(--font-mono)] text-[10px] text-text-tertiary/60 transition-all duration-500 ${
            shortcutsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <span className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5">Ctrl+N</span>
          <span className="mx-1.5">New File</span>
          <span className="mx-2 text-white/10">|</span>
          <span className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5">Ctrl+Shift+P</span>
          <span className="mx-1.5">Commands</span>
          <span className="mx-2 text-white/10">|</span>
          <span className="rounded border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5">Ctrl+`</span>
          <span className="mx-1.5">Terminal</span>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-1 | role=Imports | inputs=none | outputs=types
// IDENTITY_SEAL: PART-2 | role=CTACard | inputs=props | outputs=card UI
// IDENTITY_SEAL: PART-3 | role=FeatureBadge | inputs=icon,label | outputs=badge UI
// IDENTITY_SEAL: PART-4 | role=WelcomeScreen | inputs=callbacks | outputs=onboarding UI
