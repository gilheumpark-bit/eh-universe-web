import React from 'react';
import { Settings, Sliders, Type, Globe } from 'lucide-react';

export function SettingsPanel() {
  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2 text-text-secondary">
          <Settings className="w-4 h-4 text-accent-indigo" />
          <span className="text-[13px] font-medium">Translator Settings</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pointer-events-auto">
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-3 h-3" />
            AI Configuration
          </h3>
          <div className="space-y-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] text-text-secondary">Translation Model</span>
              <select className="bg-white/5 border border-white/10 rounded-md py-1.5 px-3 text-[13px] text-text-primary focus:outline-none focus:border-accent-indigo/50">
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
              </select>
            </label>
            
            <label className="flex flex-col gap-1.5 pt-2">
              <span className="text-[13px] text-text-secondary flex justify-between">
                Creativity (Temperature)
                <span className="text-accent-indigo">0.7</span>
              </span>
              <input type="range" min="0" max="1" step="0.1" defaultValue="0.7" className="w-full accent-accent-indigo" />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
            <Type className="w-3 h-3" />
            Editor Options
          </h3>
          <div className="space-y-2">
            <label className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer">
              <span className="text-[13px] text-text-secondary">Auto-save</span>
              <input type="checkbox" defaultChecked className="rounded border-white/20 bg-black/50 text-accent-indigo focus:ring-accent-indigo/50" />
            </label>
            <label className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer">
              <span className="text-[13px] text-text-secondary">Word Wrap</span>
              <input type="checkbox" defaultChecked className="rounded border-white/20 bg-black/50 text-accent-indigo focus:ring-accent-indigo/50" />
            </label>
            <label className="flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer">
              <span className="text-[13px] text-text-secondary">Show Glossary Highlights</span>
              <input type="checkbox" defaultChecked className="rounded border-white/20 bg-black/50 text-accent-indigo focus:ring-accent-indigo/50" />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-3 h-3" />
            Target Audience
          </h3>
          <div className="space-y-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] text-text-secondary">Formality Level</span>
              <select className="bg-white/5 border border-white/10 rounded-md py-1.5 px-3 text-[13px] text-text-primary focus:outline-none focus:border-accent-indigo/50">
                <option value="auto">Auto (Context Based)</option>
                <option value="formal">Formal</option>
                <option value="casual">Casual</option>
                <option value="literary">Literary</option>
              </select>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
