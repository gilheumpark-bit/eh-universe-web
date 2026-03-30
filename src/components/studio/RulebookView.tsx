
import React from 'react';
import { AppLanguage } from '@/lib/studio-types';
import { FileText } from 'lucide-react';
import { TRANSLATIONS } from '@/lib/studio-constants';

interface RulebookViewProps {
  language: AppLanguage;
}

const RulebookView: React.FC<RulebookViewProps> = ({ language }) => {
  const t = TRANSLATIONS[language]?.rulebook || TRANSLATIONS['KO'].rulebook;

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-12 animate-in fade-in duration-500 pb-32">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="p-4 md:p-5 bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl">
          <FileText className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">{t.title}</h2>
          <p className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase">{t.subtitle}</p>
        </div>
      </div>
      
      <div className="prose prose-sm sm:prose-base prose-invert max-w-none text-zinc-400
        prose-h2:text-lg md:prose-h2:text-xl prose-h2:text-white prose-h2:font-black prose-h2:tracking-tighter prose-h2:uppercase prose-h2:border-b prose-h2:border-zinc-800 prose-h2:pb-3
        prose-h3:text-sm prose-h3:text-blue-400 prose-h3:font-black prose-h3:tracking-widest prose-h3:uppercase
        prose-strong:text-zinc-200 prose-strong:font-bold
        prose-blockquote:border-l-4 prose-blockquote:border-blue-700 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-zinc-500
        prose-ul:list-disc prose-ul:pl-5
        prose-li:my-1
        prose-p:font-serif prose-p:leading-relaxed
        prose-hr:border-zinc-800
      ">
        <h2>{t.whatIsEH.title}</h2>
        <p>{t.whatIsEH.p1}</p>
        <p>{t.whatIsEH.p2}</p>

        <h2>{t.coreDefinition.title}</h2>
        <blockquote>
            <p><strong>{t.coreDefinition.quote}</strong></p>
            <p>{t.coreDefinition.p1}</p>
            <ul>
                <li>{t.coreDefinition.li1}</li>
                <li>{t.coreDefinition.li2}</li>
            </ul>
        </blockquote>
        
        <h2>{t.whoShouldRead.title}</h2>
        <h3>{t.whoShouldRead.recommended.title}</h3>
        <ul>
            {t.whoShouldRead.recommended.items.map((item: string, i: number) => <li key={`rec-${i}`}>{item}</li>)}
        </ul>
        <h3>{t.whoShouldRead.notRecommended.title}</h3>
        <ul>
            {t.whoShouldRead.notRecommended.items.map((item: string, i: number) => <li key={`not-rec-${i}`}>{item}</li>)}
        </ul>
        
        <h2>{t.quickStart.title}</h2>
        <h3>{t.quickStart.nonIntervention.title}</h3>
        <p>{t.quickStart.nonIntervention.p1}</p>
        {/* SAFE: i18n-controlled content, no user input */}
        <p dangerouslySetInnerHTML={{ __html: t.quickStart.nonIntervention.p2 }} /> {/* audit:safe — i18n static content, no user input */}
        
        <h3>{t.quickStart.equivalence.title}</h3>
        <p>{t.quickStart.equivalence.p1}</p>
        {/* SAFE: i18n-controlled content, no user input */}
        <p dangerouslySetInnerHTML={{ __html: t.quickStart.equivalence.listTitle }} /> {/* audit:safe — i18n static content, no user input */}
        <ul>
            {t.quickStart.equivalence.items.map((item: string, i: number) => <li key={`equiv-${i}`}>{item}</li>)}
        </ul>

        <h3>{t.quickStart.explainability.title}</h3>
        <p>{t.quickStart.explainability.p1}</p>
        {/* SAFE: i18n-controlled content, no user input */}
        <p dangerouslySetInnerHTML={{ __html: t.quickStart.explainability.p2 }} /> {/* audit:safe — i18n static content, no user input */}

        <hr/>
        
        <h2>{t.coreSentences.title}</h2>
        <blockquote>{t.coreSentences.q1}</blockquote>
        <blockquote>{t.coreSentences.q2}</blockquote>
        <blockquote>{t.coreSentences.q3}</blockquote>

        <h2>{t.howToUse.title}</h2>
        <h3>{t.howToUse.step1.title}</h3>
        <p>{t.howToUse.step1.p1}</p>
        <ul>
            {/* SAFE: i18n-controlled content, no user input */}
            {/* audit:safe — i18n static content, no user input */}
            {t.howToUse.step1.items.map((item: string, i: number) => <li key={`s1-${i}`} dangerouslySetInnerHTML={{ __html: item }} />)}{/* audit:safe — i18n static list items */}
        </ul>
        <p>{t.howToUse.step1.p2}</p>

        <h3>{t.howToUse.step2.title}</h3>
        <p>{t.howToUse.step2.p1}</p>
        <ul>
            {t.howToUse.step2.items.map((item: string, i: number) => <li key={`s2-${i}`}>{item}</li>)}
        </ul>

        <h3>{t.howToUse.step3.title}</h3>
        <p>{t.howToUse.step3.p1}</p>

        <hr />

        <h2>{t.keyConcepts.title}</h2>
        <h3>{t.keyConcepts.worldStability.title}</h3>
        <p>{t.keyConcepts.worldStability.p1}</p>
        
        <h3>{t.keyConcepts.ehTiers.title}</h3>
        <ul>
          {/* SAFE: i18n-controlled content, no user input */}
          {/* audit:safe — i18n static content, no user input */}
          {t.keyConcepts.ehTiers.items.map((item: string, i: number) => <li key={`tier-${i}`} dangerouslySetInnerHTML={{ __html: item }} />)}{/* audit:safe — i18n static list items */}
        </ul>

        <h3>{t.keyConcepts.logFormat.title}</h3>
        <p>{t.keyConcepts.logFormat.p1}</p>

        <h2>{t.example.title}</h2>
        <h3>{t.example.scenario.title}</h3>
        {/* SAFE: i18n-controlled content, no user input */}
        <p dangerouslySetInnerHTML={{ __html: t.example.scenario.p1 }} /> {/* audit:safe — i18n static content, no user input */}
        <p dangerouslySetInnerHTML={{ __html: t.example.scenario.p2 }} /> {/* audit:safe — i18n static content, no user input */}
        <ul>
            {t.example.scenario.items.map((item: string, i: number) => <li key={`ex-${i}`}>{item}</li>)}
        </ul>
      </div>
    </div>
  );
};

export default RulebookView;

