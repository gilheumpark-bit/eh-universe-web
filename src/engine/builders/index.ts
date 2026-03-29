/**
 * Pipeline Builder Barrel
 *
 * Re-exports all builder functions from pipeline.ts.
 * Each builder can be independently tested and, in future,
 * extracted to its own file for full separation.
 *
 * Usage:
 *   import { buildGenrePreset, buildStyleDNA } from '@/engine/builders';
 */

export {
  buildGenrePreset,
  buildStyleDNA,
  buildPublishPlatformBlock,
  buildPrismBlock,
  buildPrismModeBlock,
  buildLanguagePackBlock,
  buildEHRules,
  buildSystemInstruction,
  buildUserPrompt,
  postProcessResponse,
  stripEngineArtifacts,
} from '../pipeline';
