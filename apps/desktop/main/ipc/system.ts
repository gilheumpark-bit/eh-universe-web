/**
 * apps/desktop/main/ipc/system.ts
 *
 * 로컬 머신 스펙·경로 열기 — 렌더러가 데스크톱 이점을 시인 가능하게.
 */

import os from 'node:os';
import { ipcMain, app, shell } from 'electron';

export interface LocalMachineSpec {
  platform: string;
  arch: string;
  release: string;
  hostname: string;
  cpus: number;
  totalMem: number;
  freeMem: number;
  appVersion: string;
}

export function registerSystemIpc(): void {
  ipcMain.handle('system:get-local-spec', (): LocalMachineSpec => {
    return {
      platform: process.platform,
      arch: process.arch,
      release: os.release(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      totalMem: os.totalmem(),
      freeMem: os.freemem(),
      appVersion: app.getVersion(),
    };
  });

  ipcMain.handle('system:open-path', async (_event, rawPath: unknown) => {
    const p = typeof rawPath === 'string' ? rawPath.trim() : '';
    if (!p) return { ok: false as const, error: 'empty path' };
    const err = await shell.openPath(p);
    if (err) return { ok: false as const, error: err };
    return { ok: true as const };
  });
}
