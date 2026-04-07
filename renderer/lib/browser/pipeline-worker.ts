// ============================================================
// Pipeline Worker Bridge — 무거운 연산을 백그라운드 스레드로
// ============================================================
// 소설 채점, 코드 검증 등 CPU-intensive 작업을 Web Worker로 분리.
// 메인 스레드 블로킹 방지 → UI 반응성 유지.

export interface WorkerTask {
  id: string;
  type: 'score-text' | 'validate-content' | 'fuzzy-match' | 'extract-terms';
  payload: unknown;
}

export interface WorkerResult {
  id: string;
  type: string;
  result: unknown;
  error?: string;
  durationMs: number;
}

type TaskResolver = {
  resolve: (result: WorkerResult) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
const pending = new Map<string, TaskResolver>();

/** Worker 코드 (인라인, 별도 파일 불필요) */
const WORKER_CODE = `
self.onmessage = function(e) {
  const task = e.data;
  const start = performance.now();
  try {
    let result;
    switch (task.type) {
      case 'score-text':
        result = scoreText(task.payload);
        break;
      case 'validate-content':
        result = validateContent(task.payload);
        break;
      case 'fuzzy-match':
        result = fuzzyMatch(task.payload);
        break;
      case 'extract-terms':
        result = extractTerms(task.payload);
        break;
      default:
        throw new Error('Unknown task type: ' + task.type);
    }
    self.postMessage({ id: task.id, type: task.type, result, durationMs: performance.now() - start });
  } catch (err) {
    self.postMessage({ id: task.id, type: task.type, result: null, error: err.message, durationMs: performance.now() - start });
  }
};

function scoreText(payload) {
  const { text } = payload;
  const sentences = text.split(/[.!?。！？]/).filter(s => s.trim());
  const avgLen = sentences.reduce((a, s) => a + s.length, 0) / (sentences.length || 1);
  const variance = sentences.reduce((a, s) => a + Math.pow(s.length - avgLen, 2), 0) / (sentences.length || 1);
  const dialogueRatio = (text.match(/[""\\"]/g) || []).length / (text.length || 1);
  const emotionWords = (text.match(/[눈물미소냄새소리향기따뜻차가운pain|tear|smile|scent|warm|cold]/gi) || []).length;
  const eos = Math.min(100, emotionWords * 5);
  const tension = Math.min(100, Math.round((sentences.filter(s => s.length < 20).length / (sentences.length || 1)) * 100));
  const pacing = Math.min(100, Math.round(Math.sqrt(variance) * 2));
  const immersion = Math.min(100, Math.round((dialogueRatio * 500 + eos) / 2));
  return { sentences: sentences.length, avgLen: Math.round(avgLen), tension, pacing, immersion, eos };
}

function validateContent(payload) {
  const { text } = payload;
  const issues = [];
  // AI 톤 감지
  const aiPatterns = ['따라서', '그러므로', '결론적으로', 'In conclusion', 'Therefore', 'As mentioned'];
  for (const p of aiPatterns) {
    if (text.includes(p)) issues.push({ type: 'ai-tone', pattern: p });
  }
  // 반복 감지
  const words = text.split(/\\s+/);
  const freq = {};
  for (const w of words) {
    if (w.length < 2) continue;
    freq[w] = (freq[w] || 0) + 1;
  }
  const repeated = Object.entries(freq).filter(([, c]) => c > 5).map(([w, c]) => ({ word: w, count: c }));
  return { issues, repeated, wordCount: words.length };
}

function fuzzyMatch(payload) {
  const { source, candidates, threshold } = payload;
  const norm = s => s.toLowerCase().replace(/\\s+/g, ' ').trim();
  const src = norm(source);
  return candidates
    .map(c => ({ ...c, similarity: jaroWinkler(src, norm(c.source)) }))
    .filter(c => c.similarity >= (threshold || 0.7))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

function jaroWinkler(s1, s2) {
  if (s1 === s2) return 1;
  const l1 = s1.length, l2 = s2.length;
  if (!l1 || !l2) return 0;
  const md = Math.floor(Math.max(l1, l2) / 2) - 1;
  const m1 = Array(l1).fill(false), m2 = Array(l2).fill(false);
  let matches = 0, trans = 0;
  for (let i = 0; i < l1; i++) {
    for (let j = Math.max(0, i - md); j < Math.min(i + md + 1, l2); j++) {
      if (m2[j] || s1[i] !== s2[j]) continue;
      m1[i] = m2[j] = true; matches++; break;
    }
  }
  if (!matches) return 0;
  let k = 0;
  for (let i = 0; i < l1; i++) { if (!m1[i]) continue; while (!m2[k]) k++; if (s1[i] !== s2[k]) trans++; k++; }
  const j = (matches/l1 + matches/l2 + (matches - trans/2)/matches) / 3;
  let p = 0;
  for (let i = 0; i < Math.min(4, l1, l2); i++) { if (s1[i] === s2[i]) p++; else break; }
  return j + p * 0.1 * (1 - j);
}

function extractTerms(payload) {
  const { text } = payload;
  const candidates = new Map();
  const koPattern = /([\\u{AC00}-\\u{D7A3}]{2,4})(?=[\\u{C740}\\u{B294}\\u{C774}\\u{AC00}\\u{C744}\\u{B97C}\\u{C758}])/gu;
  let m;
  while ((m = koPattern.exec(text)) !== null) {
    const t = m[1];
    const e = candidates.get(t);
    if (e) e.freq++; else candidates.set(t, { term: t, freq: 1 });
  }
  const enPattern = /\\b([A-Z][a-z]+(?:\\s[A-Z][a-z]+)*)\\b/g;
  while ((m = enPattern.exec(text)) !== null) {
    const t = m[1];
    const e = candidates.get(t);
    if (e) e.freq++; else candidates.set(t, { term: t, freq: 1 });
  }
  return Array.from(candidates.values()).filter(c => c.freq >= 2).sort((a, b) => b.freq - a.freq).slice(0, 30);
}
`;

function getWorker(): Worker {
  if (!worker) {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = (e: MessageEvent<WorkerResult>) => {
      const resolver = pending.get(e.data.id);
      if (resolver) {
        pending.delete(e.data.id);
        if (e.data.error) {
          resolver.reject(new Error(e.data.error));
        } else {
          resolver.resolve(e.data);
        }
      }
    };
  }
  return worker;
}

/** 백그라운드 스레드에서 작업 실행 */
export function runInWorker(task: Omit<WorkerTask, 'id'>): Promise<WorkerResult> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ ...task, id });
    // 30초 타임아웃
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('Worker task timeout'));
      }
    }, 30000);
  });
}

/** Worker 종료 */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    pending.clear();
  }
}

// ── 편의 함수 ──

export async function scoreTextInBackground(text: string) {
  const result = await runInWorker({ type: 'score-text', payload: { text } });
  return result.result as { sentences: number; avgLen: number; tension: number; pacing: number; immersion: number; eos: number };
}

export async function validateInBackground(text: string) {
  const result = await runInWorker({ type: 'validate-content', payload: { text } });
  return result.result as { issues: Array<{ type: string; pattern: string }>; repeated: Array<{ word: string; count: number }>; wordCount: number };
}

export async function fuzzyMatchInBackground(source: string, candidates: Array<{ source: string; target: string }>, threshold?: number) {
  const result = await runInWorker({ type: 'fuzzy-match', payload: { source, candidates, threshold } });
  return result.result as Array<{ source: string; target: string; similarity: number }>;
}

export async function extractTermsInBackground(text: string) {
  const result = await runInWorker({ type: 'extract-terms', payload: { text } });
  return result.result as Array<{ term: string; freq: number }>;
}
