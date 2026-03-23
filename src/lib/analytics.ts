import { track } from '@vercel/analytics';

// ============================================================
// Centralized analytics events for conversion funnel tracking
// ============================================================

export function trackStudioSessionStart(genre?: string) {
  track('studio_session_start', { genre: genre || 'unknown' });
}

export function trackAIGeneration(provider: string, model: string, mode: string) {
  track('ai_generation_complete', { provider, model, mode });
}

export function trackExport(format: 'epub' | 'docx' | 'txt' | 'json' | 'html') {
  track('export', { format });
}

export function trackWorldDesign(method: 'ai' | 'manual') {
  track('world_design_generated', { method });
}

export function trackDriveSync(action: 'sync' | 'save' | 'load', projects: number) {
  track('drive_sync', { action, projects });
}

export function trackOnboarding(step: string) {
  track('onboarding_step', { step });
}
