// ============================================================
// destructive-data-diff.test — T0 real project payload evidence
// ============================================================
// Role:    Prove that a destructive project mutation can be detected by
//          payload hashes and reversed from a verified full-project snapshot.
// Banned:  Treating sentinel-only navigation checks as real payload evidence.
// Input:   Project[] fixture with manuscript/world/character/style payloads.
// Output:  Hash-diff assertions before destructive mutation and after restore.
// ============================================================

import { installFakeIndexedDB, resetFakeIndexedDB } from './_fake-idb';
installFakeIndexedDB();

import type { Project } from '@/lib/studio-types';
import { Genre, PlatformType } from '@/lib/studio-types';
import {
  extractCharacters,
  extractManuscript,
  extractSceneDirection,
  extractStyle,
  extractWorldSim,
} from '@/lib/save-engine/payload-extractor';
import { canonicalJson, sha256, utf8Encode } from '@/lib/save-engine/hash';
import { appendInitEntry, resetJournalHLCForTests } from '@/lib/save-engine/journal';
import { createSnapshot, restoreSnapshot } from '@/lib/save-engine/snapshot';
import { idbListSnapshots, resetDbForTests } from '@/lib/save-engine/indexeddb-adapter';
import { resetMemoryTierForTests } from '@/lib/save-engine/storage-router';
import { TabSyncBus } from '@/lib/save-engine/tab-sync';
import { resetDefaultWriterQueueForTests } from '@/lib/save-engine/writer-queue';

type BroadcastHandler = (ev: { data: unknown }) => void;

interface BroadcastEntry {
  handler: BroadcastHandler | null;
}

const broadcastShimState: { channels: Map<string, Set<BroadcastEntry>> } = {
  channels: new Map(),
};

class BroadcastChannelShim {
  private readonly entry: BroadcastEntry = { handler: null };
  public onmessage: BroadcastHandler | null = null;

  constructor(public readonly name: string) {
    let channels = broadcastShimState.channels.get(name);
    if (!channels) {
      channels = new Set();
      broadcastShimState.channels.set(name, channels);
    }
    channels.add(this.entry);
    Object.defineProperty(this, 'onmessage', {
      get: () => this.entry.handler,
      set: (handler: BroadcastHandler | null) => {
        this.entry.handler = handler;
      },
      configurable: true,
    });
  }

  postMessage(message: unknown): void {
    const channels = broadcastShimState.channels.get(this.name);
    if (!channels) return;
    for (const other of channels) {
      if (other === this.entry) continue;
      queueMicrotask(() => other.handler?.({ data: message }));
    }
  }

  close(): void {
    broadcastShimState.channels.get(this.name)?.delete(this.entry);
  }
}

function resetBroadcastShim(): void {
  for (const channels of broadcastShimState.channels.values()) channels.clear();
  broadcastShimState.channels.clear();
}

type PayloadHashSet = {
  project: string;
  manuscript: string;
  sceneDirection: string;
  characters: string;
  worldSim: string;
  style: string;
};

const SESSION_ID = 'session-real-payload';
const originalBroadcastChannel = (globalThis as unknown as { BroadcastChannel?: unknown }).BroadcastChannel;

function makeProjectFixture(): Project[] {
  return [{
    id: 'project-real-payload',
    name: 'Loreguard 실제 payload 회귀',
    description: 'destructive workflow data-diff fixture',
    genre: Genre.SF,
    createdAt: 1_781_200_000_000,
    lastUpdate: 1_781_200_000_100,
    sessions: [{
      id: SESSION_ID,
      title: 'Episode 7',
      messages: [],
      lastUpdate: 1_781_200_000_100,
      config: {
        genre: Genre.SF,
        povCharacter: '윤서',
        setting: '궤도 엘리베이터 하부 도시',
        primaryEmotion: '불신',
        episode: 7,
        title: '하강하는 빛',
        totalEpisodes: 25,
        guardrails: { min: 3500, max: 5500 },
        platform: PlatformType.MOBILE,
        corePremise: 'AI 시대에도 지휘와 승인 기록은 남는다.',
        powerStructure: '도시 의회와 궤도 운영사가 권한을 나눠 가진다.',
        currentConflict: '삭제된 승인 기록의 책임 소재를 두고 현장이 갈라진다.',
        worldHistory: '궤도 엘리베이터 완공 이후 지상과 궤도의 기록 체계가 분리되었다.',
        socialSystem: '지상 노동자와 궤도 거주자의 계층 분리.',
        economy: '에너지 배급권 중심의 교환 경제.',
        magicTechSystem: '부분 자동화된 고밀도 도시 운영 기술.',
        survivalEnvironment: '하부 도시는 정전과 데이터 손실에 취약하다.',
        culture: '승인 로그를 남기는 것이 직업 윤리로 여겨진다.',
        truthVsBeliefs: '사람들은 운영사가 모든 기록을 보존한다고 믿지만 실제로는 권한별 삭제가 가능하다.',
        characters: [
          {
            id: 'char-yunseo',
            name: '윤서',
            role: '기록 책임자',
            traits: '차분함, 승인 로그 집착',
            appearance: '짧은 검은 머리와 낡은 현장 재킷',
            dna: 7,
          },
          {
            id: 'char-ian',
            name: '이안',
            role: '현장 승인자',
            traits: '현장 판단이 빠르고 책임 회피를 싫어함',
            appearance: '은색 작업복과 손목 단말',
            dna: 4,
          },
        ],
        charRelations: [
          { from: 'char-yunseo', to: 'char-ian', type: 'friend', desc: '승인 대기 중인 공동 책임자' },
        ],
        manuscripts: [{
          episode: 7,
          title: '하강하는 빛',
          content: '윤서는 마지막 승인 로그를 다시 열었다. 삭제된 문장은 없었다.',
          charCount: 35,
          lastUpdate: 1_781_200_000_100,
        }],
        sceneDirection: {
          writerNotes: '수동 승인 전까지 모든 변경은 HOLD로 남긴다.',
          hooks: [{ position: 'ending', hookType: 'audit-hold', desc: '복구 전까지 출고를 멈춘다.' }],
        },
        episodeSceneSheets: [{
          id: 'scene-sheet-ep7',
          episode: 7,
          title: '하강하는 빛',
          arc: '윤서가 승인 로그를 검토하고 복구를 결정한다.',
          characters: '윤서, 이안',
          lastUpdate: 1_781_200_000_100,
        }],
        worldSimData: {
          civs: [{ name: '하부 도시', era: 'near-future', color: '#4b5563', traits: ['dense', 'audited'] }],
        },
        styleProfile: {
          selectedDNA: [1, 4, 7],
          sliders: { density: 3, dialogue: 2 },
          checkedSF: [0, 2],
          checkedWeb: [1],
        },
      },
    }],
  }];
}

async function hashOf(value: unknown): Promise<string> {
  return sha256(utf8Encode(canonicalJson(value)));
}

async function hashProjectPayloads(projects: Project[]): Promise<PayloadHashSet> {
  return {
    project: await hashOf(projects),
    manuscript: await hashOf(extractManuscript(projects, SESSION_ID, 7)),
    sceneDirection: await hashOf(extractSceneDirection(projects, SESSION_ID)),
    characters: await hashOf(extractCharacters(projects, SESSION_ID)),
    worldSim: await hashOf(extractWorldSim(projects, SESSION_ID)),
    style: await hashOf(extractStyle(projects, SESSION_ID)),
  };
}

function simulateDestructiveOverwrite(projects: Project[]): Project[] {
  const next = JSON.parse(JSON.stringify(projects)) as Project[];
  const session = next[0].sessions[0];
  session.config.manuscripts = [];
  session.config.characters = [];
  session.config.corePremise = '';
  session.config.sceneDirection = undefined;
  session.config.styleProfile = undefined;
  next[0].lastUpdate += 1;
  session.lastUpdate += 1;
  return next;
}

beforeEach(() => {
  resetBroadcastShim();
  (globalThis as unknown as { BroadcastChannel?: unknown }).BroadcastChannel = BroadcastChannelShim;
  resetFakeIndexedDB();
  resetDbForTests();
  resetDefaultWriterQueueForTests();
  resetMemoryTierForTests();
  resetJournalHLCForTests();
  try { localStorage.clear(); } catch { /* noop */ }
});

afterEach(() => {
  resetBroadcastShim();
  (globalThis as unknown as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcastChannel;
});

describe('T0 destructive workflow data-diff — real Project[] payload', () => {
  it('detects destructive overwrite and restores byte-stable payload hashes from snapshot', async () => {
    await appendInitEntry();
    const original = makeProjectFixture();
    const before = await hashProjectPayloads(original);

    const snapshot = await createSnapshot({
      projects: original,
      coversUpToEntryId: 'before-destructive-overwrite',
      protect: true,
    });
    expect(snapshot.entryResult.ok).toBe(true);

    const overwritten = simulateDestructiveOverwrite(original);
    const damaged = await hashProjectPayloads(overwritten);
    expect(damaged.project).not.toBe(before.project);
    expect(damaged.manuscript).not.toBe(before.manuscript);
    expect(damaged.sceneDirection).not.toBe(before.sceneDirection);
    expect(damaged.characters).not.toBe(before.characters);
    expect(damaged.worldSim).not.toBe(before.worldSim);
    expect(damaged.style).not.toBe(before.style);

    const records = await idbListSnapshots();
    expect(records).toHaveLength(1);
    expect(records[0].meta.protected).toBe(true);

    const restored = await restoreSnapshot(records[0]);
    expect(restored.verified).toBe(true);
    const restoredProjects = restored.projects as Project[];
    const afterRestore = await hashProjectPayloads(restoredProjects);

    expect(afterRestore).toEqual(before);
    expect(restoredProjects).toEqual(original);
  });

  it('replays multi-user destructive workflow via tab-sync drift signal and restores protected payloads', async () => {
    await appendInitEntry();
    const original = makeProjectFixture();
    const before = await hashProjectPayloads(original);

    const snapshot = await createSnapshot({
      projects: original,
      coversUpToEntryId: 'before-multi-user-destructive-overwrite',
      protect: true,
    });
    expect(snapshot.entryResult.ok).toBe(true);
    const records = await idbListSnapshots();
    expect(records).toHaveLength(1);

    const leader = new TabSyncBus('tab-leader');
    const follower = new TabSyncBus('tab-follower');
    const receivedHashes: string[] = [];

    try {
      const restoredProjects = await new Promise<Project[]>((resolve, reject) => {
        const off = follower.on('state-changed', async (event) => {
          try {
            receivedHashes.push(event.payload.rawHash);
            const followerDamagedProjects = simulateDestructiveOverwrite(original);
            const followerDamaged = await hashProjectPayloads(followerDamagedProjects);
            expect(followerDamaged.project).not.toBe(event.payload.rawHash);
            expect(followerDamaged.manuscript).not.toBe(before.manuscript);
            expect(followerDamaged.characters).not.toBe(before.characters);

            const restored = await restoreSnapshot(records[0]);
            expect(restored.verified).toBe(true);
            off();
            resolve(restored.projects as Project[]);
          } catch (error) {
            off();
            reject(error);
          }
        });

        leader.emitStateChanged({
          rawHash: before.project,
          timestampMs: 1_781_200_000_200,
          leaderTabId: 'tab-leader',
        });
      });

      const afterRestore = await hashProjectPayloads(restoredProjects);
      expect(receivedHashes).toEqual([before.project]);
      expect(afterRestore).toEqual(before);
      expect(restoredProjects).toEqual(original);
    } finally {
      leader.dispose();
      follower.dispose();
    }
  });
});

// IDENTITY_SEAL: destructive-data-diff-tests | role=T0 evidence | inputs=Project[] snapshot+tab-sync destructive overwrite | outputs=hash diff+verified restore
