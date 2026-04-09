import { logger } from '@/lib/logger';
import { runAutonomousFactory } from './master-autopilot';

// ============================================================
// PART 1 — Proactive Background Daemon (Local System Watcher)
// ============================================================
// [SCOPE_START: DaemonWatcher]
// [CONTRACT: PART-01]

export class PipelineDaemon {
  private static watchUnsubscribe: (() => void) | null = null;
  private static debounceTimer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * 로컬 프로젝트 경로를 구독하여 파일이 변경(change)될 때마다 
   * 파놉티콘 파이프라인(Autopilot Factory)을 백그라운드에서 자동 가동합니다.
   */
  static async startWatching(targetDir: string) {
    if (typeof window === 'undefined' || !('cs' in window)) {
      logger.warn(`[DAEMON] 데몬 기동 실패. (Electron Native 'cs' 브릿지 접근 불가)`);
      return;
    }
    
    if (this.isRunning) {
      logger.info(`[DAEMON] 이미 감시 중입니다: ${targetDir}`);
      return;
    }

    try {
      logger.info(`[DAEMON] ${targetDir} 경로에 대한 네이티브 파일시스템 감시(Watcher)를 활성화합니다.`);

      const csApi = (window as unknown as { cs: { fs: { watch: (opts: { rootPath: string, watchId: string }, cb: (evt: { kind: string, path: string }) => void) => Promise<(() => void) | undefined> } } }).cs;
      const unwatch = await csApi.fs.watch(
        { rootPath: targetDir, watchId: `panopticon_watch_${Date.now()}` },
        // FsWatchEvent 로 콜백 수신
        (event: { kind: string; path: string }) => {
          if (event.kind === 'change' && (event.path.endsWith('.ts') || event.path.endsWith('.tsx'))) {
            this.handleFileChange(targetDir, event.path);
          }
        }
      );

      this.watchUnsubscribe = unwatch;
      this.isRunning = true;
      logger.info(`[DAEMON] 감시 데몬 기동 완료. (로컬 I/O 100% 매핑)`);
    } catch (error) {
      logger.error(`[DAEMON] 감시 데몬 기동 파탄: ${error}`);
    }
  }

  static stopWatching() {
    if (this.watchUnsubscribe) {
      this.watchUnsubscribe();
      this.watchUnsubscribe = null;
      this.isRunning = false;
      logger.info(`[DAEMON] 파이프라인 감시 데몬 연결 해제 안전하게 종료됨.`);
    }
  }

  // I/O 폭풍 방어 및 큐 콜랩스 기능 (Debounce)
  private static handleFileChange(rootDir: string, filePath: string) {
    logger.debug(`[FS-EVENT] 변경 감지됨: ${filePath}`);
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 1.5초간 추가 변경이 없으면 진단 파이프라인을 기동 (과부하 억제)
    this.debounceTimer = setTimeout(async () => {
      logger.info(`[DAEMON-TRIGGER] ${filePath} 변경 건에 대해 파놉티콘 자율 공장 검증을 개시합니다.`);
      try {
         const result = await runAutonomousFactory(rootDir);
         logger.info(`[DAEMON-FINISH] 데몬 자동 진단 결과: ${result}`);
         
         // 터미널 스트리밍 등 외부 UI와 연동하기 위해 Event Dispatch
         const isFailed = result === 'REVERT';
         if (typeof window !== 'undefined') {
           window.dispatchEvent(new CustomEvent('panopticon:daemon:result', {
             detail: { result, filePath, failed: isFailed }
           }));
         }
      } catch (e) {
         logger.error(`[DAEMON-CRASH] 자동 진단 백그라운드 구동 중 붕괴: ${e}`);
         if (typeof window !== 'undefined') {
           window.dispatchEvent(new CustomEvent('panopticon:daemon:result', {
             detail: { error: String(e), filePath, failed: true }
           }));
         }
      }
    }, 1500);
  }
}
// [SCOPE_END]
// IDENTITY_SEAL: PART-1 | role=Local_Watch_Daemon | inputs=string(Directory) | outputs=void
