import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import type { AppLanguage, Character, SocialProfile } from '@/lib/studio-types';
import { AGE_LABELS, EXPLICIT_LABELS, PROFANITY_LABELS, RELATION_LABELS } from '@/engine/social-register';

type ResourceLabels = {
  socialProfile?: string;
  socialAdvanced?: string;
  socialRelation?: string;
  socialAge?: string;
  socialProfession?: string;
  socialProfessionPH?: string;
  socialExplicitness?: string;
  socialProfanity?: string;
};

interface SocialProfilePanelProps {
  appLanguage: AppLanguage;
  character: Character;
  isExpanded: boolean;
  labels: ResourceLabels;
  onToggle: () => void;
  onChange: (socialProfile: SocialProfile) => void;
}

function buildSocialProfile(character: Character, patch: Partial<SocialProfile>): SocialProfile {
  return {
    relationDistance: character.socialProfile?.relationDistance ?? 'colleague',
    ageRegister: character.socialProfile?.ageRegister ?? 'adult',
    explicitness: character.socialProfile?.explicitness ?? 'none',
    profanityLevel: character.socialProfile?.profanityLevel ?? 'none',
    professionRegister: character.socialProfile?.professionRegister,
    ...patch,
  };
}

export function SocialProfilePanel({
  appLanguage,
  character,
  isExpanded,
  labels,
  onToggle,
  onChange,
}: SocialProfilePanelProps) {
  const panelId = `social-${character.id}`;

  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        aria-controls={panelId}
        aria-expanded={isExpanded}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-tertiary hover:text-text-secondary transition-colors mb-2"
      >
        <Users className="w-3 h-3" />
        {labels.socialProfile ?? 'Social Profile'} ({labels.socialAdvanced ?? 'Advanced'})
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      <div
        id={panelId}
        hidden={!isExpanded}
        className="resource-social-panel space-y-3 p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-text-tertiary uppercase">{labels.socialRelation ?? 'Relation'}</label>
            <select
              value={character.socialProfile?.relationDistance ?? 'colleague'}
              onChange={(event) => onChange(buildSocialProfile(character, {
                relationDistance: event.target.value as SocialProfile['relationDistance'],
              }))}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 cursor-pointer"
            >
              {Object.entries(RELATION_LABELS[appLanguage] ?? RELATION_LABELS.KO).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-text-tertiary uppercase">{labels.socialAge ?? 'Age'}</label>
            <select
              value={character.socialProfile?.ageRegister ?? 'adult'}
              onChange={(event) => onChange(buildSocialProfile(character, {
                ageRegister: event.target.value as SocialProfile['ageRegister'],
              }))}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 cursor-pointer"
            >
              {Object.entries(AGE_LABELS[appLanguage] ?? AGE_LABELS.KO).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-text-tertiary uppercase">{labels.socialProfession ?? 'Profession'}</label>
            <input
              value={character.socialProfile?.professionRegister ?? ''}
              onChange={(event) => onChange(buildSocialProfile(character, { professionRegister: event.target.value }))}
              placeholder={labels.socialProfessionPH ?? 'Soldier, doctor...'}
              maxLength={100}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-cyan-500 transition-colors placeholder:text-text-tertiary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-text-tertiary uppercase">{labels.socialExplicitness ?? 'Explicitness'}</label>
            <select
              value={character.socialProfile?.explicitness ?? 'none'}
              onChange={(event) => onChange(buildSocialProfile(character, {
                explicitness: event.target.value as SocialProfile['explicitness'],
              }))}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 cursor-pointer"
            >
              {Object.entries(EXPLICIT_LABELS[appLanguage] ?? EXPLICIT_LABELS.KO).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-text-tertiary uppercase">{labels.socialProfanity ?? 'Profanity'}</label>
            <select
              value={character.socialProfile?.profanityLevel ?? 'none'}
              onChange={(event) => onChange(buildSocialProfile(character, {
                profanityLevel: event.target.value as SocialProfile['profanityLevel'],
              }))}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-2 py-1.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 cursor-pointer"
            >
              {Object.entries(PROFANITY_LABELS[appLanguage] ?? PROFANITY_LABELS.KO).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
