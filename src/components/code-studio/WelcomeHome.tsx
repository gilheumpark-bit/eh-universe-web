"use client";

import { Code2, Play, Plug, FolderOpen, Zap, Shield, Layers, Terminal } from "lucide-react";
import { useLocale } from "@/lib/i18n";

interface Props {
  onSkip: () => void;
  onOpenAIHub: () => void;
  onOpenFolder: () => void;
}

const featureItems = [
  { icon: Zap, colorClass: "text-[var(--accent-blue)]", key: "welcome.featureAI" as const },
  { icon: Shield, colorClass: "text-[var(--accent-green)]", key: "welcome.featurePipeline" as const },
  { icon: Layers, colorClass: "text-[var(--accent-yellow)]", key: "welcome.featureMultiModel" as const },
  { icon: Terminal, colorClass: "text-[var(--accent-purple)]", key: "welcome.featureTerminal" as const },
];

export function WelcomeHome({ onSkip, onOpenAIHub, onOpenFolder }: Props) {
  const { t } = useLocale();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0e14] ds-animate-fade-in"
      style={{ background: "linear-gradient(145deg, #0a0e14 0%, #0d1520 50%, #0a0e14 100%)" }}
    >
      <div className="w-full max-w-lg px-6">
        {/* Branding */}
        <div className="flex items-center justify-center gap-3 mb-8 ds-animate-fade-in-scale">
          <div className="relative">
            {/* Glow halo */}
            <div
              className="absolute inset-0 rounded-full blur-xl opacity-40"
              style={{ background: "radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)", transform: "scale(2.2)" }}
            />
            <Code2 size={40} className="text-[var(--accent-blue)] relative z-10" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            CSL IDE
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-center text-sm text-[var(--text-secondary)] mb-8 ds-animate-fade-in ds-delay-1">
          {t("welcome.homeSubtitle")}
        </p>

        {/* Content Card */}
        <div
          className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-6 space-y-3 ds-animate-fade-in ds-delay-2"
          style={{ boxShadow: "var(--ds-elevation-3)" }}
        >
          {/* Primary CTA: Demo */}
          <button
            onClick={onSkip}
            className="w-full py-3.5 bg-[var(--accent-blue)] text-white text-sm rounded-lg font-semibold hover:bg-[var(--accent-blue)]/80 hover:scale-[1.02] active:scale-100 transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)]"
          >
            <Play size={16} />
            {t("welcome.demo")}
          </button>
          <p className="text-[10px] text-[var(--text-secondary)] text-center">
            {t("welcome.demoHint")}
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
              {t("welcome.or")}
            </span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Secondary CTAs */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOpenAIHub}
              className="flex items-center justify-center gap-2 py-2.5 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:border-[var(--accent-blue)]/50 hover:bg-[var(--accent-blue)]/10 hover:scale-[1.02] active:scale-100 transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)]"
            >
              <Plug size={14} className="text-[var(--accent-green)]" />
              {t("welcome.connectAI")}
            </button>
            <button
              onClick={onOpenFolder}
              className="flex items-center justify-center gap-2 py-2.5 px-3 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:border-[var(--accent-blue)]/50 hover:bg-[var(--accent-blue)]/10 hover:scale-[1.02] active:scale-100 transition-all focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)]"
            >
              <FolderOpen size={14} className="text-[var(--accent-yellow)]" />
              {t("welcome.openProject")}
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 px-2">
          {featureItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className={`flex items-start gap-2 ds-animate-fade-in ds-delay-${idx + 1}`}
              >
                <Icon size={14} className={`${item.colorClass} mt-0.5 shrink-0`} />
                <span className="text-xs text-[var(--text-secondary)]">
                  {t(item.key)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
