import React from 'react';
import { useTranslatorLayout, LeftPanelType } from '../core/TranslatorLayoutContext';
import { Files, BookA, Settings, History, Menu } from 'lucide-react';
import { useLang } from '@/lib/LangContext';

interface IconWrapperProps {
  type: LeftPanelType;
  icon: React.ElementType;
  title: string;
  isActive: boolean;
  onClick: () => void;
}

const IconWrapper = ({ icon: Icon, title, isActive, onClick }: IconWrapperProps) => {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-12 w-12 items-center justify-center transition-all border-l-[3px] relative cursor-pointer pointer-events-auto ${
        isActive
          ? 'border-accent-amber bg-white/8 text-accent-amber scale-105 shadow-[inset_2px_0_10px_rgba(251,191,36,0.1)]'
          : 'border-transparent text-text-tertiary hover:text-text-primary hover:bg-white/4'
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
    </button>
  );
};

export function ActivityBar() {
  const layout = useTranslatorLayout();
  const { lang } = useLang();

  const handleToggle = (type: LeftPanelType) => {
    if (layout.activeLeftPanel === type) {
      layout.setActiveLeftPanel(null); // Toggle off
    } else {
      layout.setActiveLeftPanel(type);
    }
  };

  return (
    <div className="flex h-full w-[54px] shrink-0 flex-col border-r border-[#ffffff0A] bg-[#0a0a0c]/80 backdrop-blur-xl pointer-events-auto relative z-50">
      <div className="flex flex-1 flex-col items-center py-4 gap-3">
        {/* Mobile menu toggle fallback (desktop hides usually) */}
        <button
          className="lg:hidden flex h-12 w-12 items-center justify-center text-text-tertiary hover:text-text-primary pointer-events-auto"
          onClick={() => {
            // Trigger mobile drawer if needed
          }}
        >
          <Menu className="h-5 w-5" />
        </button>

        <IconWrapper
          type="explorer"
          icon={Files}
          title={lang === 'ko' ? '파일/챕터 (Explorer)' : 'Explorer'}
          isActive={layout.activeLeftPanel === 'explorer'}
          onClick={() => handleToggle('explorer')}
        />
        <IconWrapper
          type="glossary"
          icon={BookA}
          title={lang === 'ko' ? '용어집 (Glossary)' : 'Glossary'}
          isActive={layout.activeLeftPanel === 'glossary'}
          onClick={() => handleToggle('glossary')}
        />
        <IconWrapper
          type="history"
          icon={History}
          title={lang === 'ko' ? '번역 기록 (History)' : 'History'}
          isActive={layout.activeLeftPanel === 'history'}
          onClick={() => handleToggle('history')}
        />
      </div>
      <div className="flex flex-col items-center py-2 pb-6 gap-2">
        <IconWrapper
          type="settings"
          icon={Settings}
          title={lang === 'ko' ? '설정 (Settings)' : 'Settings'}
          isActive={layout.activeLeftPanel === 'settings'}
          onClick={() => handleToggle('settings')}
        />
      </div>
    </div>
  );
}
