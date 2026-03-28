// ============================================================
// Code Studio — Composer Hook
// Multi-file edit session, AI instruction, preview changes,
// apply/reject per file.
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { streamChat } from '@/lib/ai-providers';
import type { FileNode } from '@/lib/code-studio-types';

export interface ComposerChange {
  fileId: string;
  fileName: string;
  original: string;
  modified: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface UseCodeStudioComposerReturn {
  changes: ComposerChange[];
  composing: boolean;
  compose: (fileIds: string[], instruction: string, getContent: (id: string) => string | null, getFileName: (id: string) => string) => Promise<void>;
  accept: (fileId: string) => void;
  reject: (fileId: string) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  getAccepted: () => ComposerChange[];
  abort: () => void;
  reset: () => void;
}

export function useCodeStudioComposer(): UseCodeStudioComposerReturn {
  const [changes, setChanges] = useState<ComposerChange[]>([]);
  const [composing, setComposing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const compose = useCallback(async (
    fileIds: string[],
    instruction: string,
    getContent: (id: string) => string | null,
    getFileName: (id: string) => string,
  ) => {
    if (composing) return;
    setComposing(true);
    setChanges([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const results: ComposerChange[] = [];

      for (const fileId of fileIds) {
        if (controller.signal.aborted) break;

        const original = getContent(fileId);
        if (original == null) continue;

        const fileName = getFileName(fileId);
        let modified = '';

        const systemPrompt = [
          'You are a code editor. Apply the user\'s instruction to the provided file.',
          'Output ONLY the modified file content, nothing else.',
          `File: ${fileName}`,
        ].join('\n');

        await streamChat({
          systemInstruction: systemPrompt,
          messages: [
            { role: 'user', content: `Instruction: ${instruction}\n\n---\n\n${original}` },
          ],
          signal: controller.signal,
          onChunk: (chunk) => {
            modified += chunk;
          },
        });

        results.push({
          fileId,
          fileName,
          original,
          modified: modified.trim(),
          status: 'pending',
        });

        setChanges([...results]);
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        // Non-abort error - keep whatever changes we have so far
      }
    } finally {
      setComposing(false);
      abortRef.current = null;
    }
  }, [composing]);

  const updateStatus = useCallback((fileId: string, status: 'accepted' | 'rejected') => {
    setChanges((prev) => prev.map((c) => (c.fileId === fileId ? { ...c, status } : c)));
  }, []);

  const accept = useCallback((fileId: string) => updateStatus(fileId, 'accepted'), [updateStatus]);
  const reject = useCallback((fileId: string) => updateStatus(fileId, 'rejected'), [updateStatus]);

  const acceptAll = useCallback(() => {
    setChanges((prev) => prev.map((c) => (c.status === 'pending' ? { ...c, status: 'accepted' } : c)));
  }, []);

  const rejectAll = useCallback(() => {
    setChanges((prev) => prev.map((c) => (c.status === 'pending' ? { ...c, status: 'rejected' } : c)));
  }, []);

  const getAccepted = useCallback((): ComposerChange[] => {
    return changes.filter((c) => c.status === 'accepted');
  }, [changes]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setChanges([]);
    setComposing(false);
  }, []);

  return {
    changes,
    composing,
    compose,
    accept,
    reject,
    acceptAll,
    rejectAll,
    getAccepted,
    abort,
    reset,
  };
}
