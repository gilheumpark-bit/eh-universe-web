import type { PipelineStageResult } from '@/lib/studio-types';

export type ShellPipelineSnapshot = {
  id?: string;
  stages: PipelineStageResult[];
  totalDuration?: number;
  finalStatus: 'completed' | 'failed' | 'partial' | 'running';
  blockedAt?: string;
};
