export type FeatureFlagKey =
  | 'IMAGE_GENERATION'
  | 'GOOGLE_DRIVE_BACKUP'
  | 'NETWORK_COMMUNITY'
  | 'OFFLINE_CACHE'
  | 'CODE_STUDIO'
  | 'EPISODE_COMPARE';

const DEFAULT_FLAGS: Record<FeatureFlagKey, boolean> = {
  IMAGE_GENERATION: true,
  GOOGLE_DRIVE_BACKUP: true,
  NETWORK_COMMUNITY: true,
  OFFLINE_CACHE: false,
  CODE_STUDIO: true,
  EPISODE_COMPARE: true,
};

function parseEnvBoolean(value: string | undefined): boolean | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
  if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  return null;
}

export function isFeatureEnabledServer(key: FeatureFlagKey): boolean {
  const envKey = `NEXT_PUBLIC_FF_${key}`;
  const fromEnv = parseEnvBoolean(process.env[envKey]);
  if (fromEnv !== null) return fromEnv;
  return DEFAULT_FLAGS[key];
}