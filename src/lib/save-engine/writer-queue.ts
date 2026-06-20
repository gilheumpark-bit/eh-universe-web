// ============================================================
// PART 1 — FIFO WriterQueue (Spec 5.3)
// ============================================================
//
// 모든 저널 append는 이 큐를 통과. 단일 Writer 원칙으로 tx 인터리빙 금지.
// Leader tab에서 1개만 운영. Follower 탭은 BroadcastChannel로 Leader에 위임.

export class WriterQueue {
  private queue: (() => Promise<void>)[] = [];
  private running = false;
  private draining: Promise<void> | null = null;

  /** 현재 pending 태스크 수 (running 포함 안 함). */
  get pending(): number { return this.queue.length; }

  /** 작업 실행 중 여부. */
  get isRunning(): boolean { return this.running; }

  /**
   * 태스크 추가. 큐가 비어 있으면 즉시 시작.
   * 성공/실패 결과는 반환 Promise로 전달.
   */
  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
      void this.drain();
    });
  }

  /**
   * 내부 drain 루프. 재진입 방지.
   */
  private drain(): Promise<void> {
    if (this.running) return this.draining ?? Promise.resolve();
    this.running = true;
    this.draining = (async () => {
      while (this.queue.length > 0) {
        const task = this.queue.shift()!;
        try {
          await task();
        } catch {
          // task가 자체적으로 reject 처리함. 여기서 snapshot 저장 실패가
          // 후속 append를 막지 않도록 continue.
        }
      }
      this.running = false;
    })();
    return this.draining;
  }

  /**
   * 현재 대기 중 모든 태스크가 처리될 때까지 대기. 새 enqueue는 막지 않음.
   */
  async flush(): Promise<void> {
    if (this.running && this.draining) await this.draining;
    // flush 도중에 추가된 태스크도 소진
    while (this.queue.length > 0 || this.running) {
      if (this.draining) await this.draining;
      else break;
    }
  }

  /** 테스트 전용 — 큐 비우기 (안전한 abort 없음, 실험적). */
  clearForTests(): void {
    this.queue = [];
  }
}

// ============================================================
// PART 2 — Default singleton
// ============================================================

let defaultQueue: WriterQueue | null = null;

export function getDefaultWriterQueue(): WriterQueue {
  if (!defaultQueue) defaultQueue = new WriterQueue();
  return defaultQueue;
}

export function resetDefaultWriterQueueForTests(): void {
  defaultQueue = null;
}
