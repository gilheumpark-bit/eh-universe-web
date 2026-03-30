import { track } from '@vercel/analytics';

// ============================================================
// Centralized analytics events for conversion funnel tracking
// ============================================================

/** Track studio session creation event with optional genre */
export function trackStudioSessionStart(genre?: string) {
  track('studio_session_start', { genre: genre || 'unknown' });
}

/** Track completed AI generation with provider, model, and writing mode */
export function trackAIGeneration(provider: string, model: string, mode: string) {
  track('ai_generation_complete', { provider, model, mode });
}

/** Track manuscript export event by format type */
export function trackExport(format: 'epub' | 'docx' | 'txt' | 'json' | 'html' | 'project-json' | 'all-episodes-txt' | 'markdown') {
  track('export', { format });
}

/** Track world-building design generation (AI-assisted or manual) */
export function trackWorldDesign(method: 'ai' | 'manual') {
  track('world_design_generated', { method });
}

/** Track Google Drive sync operation with project count */
export function trackDriveSync(action: 'sync' | 'save' | 'load', projects: number) {
  track('drive_sync', { action, projects });
}

/** Track onboarding funnel progression by step name */
export function trackOnboarding(step: string) {
  track('onboarding_step', { step });
}
