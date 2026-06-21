import {
  emptySlots,
  isValidBaseUrl,
  validateSlot,
  loadLocalAISlots,
  saveLocalAISlots,
  listEnabledLocalAI,
  resolveActiveLocalAI,
  MAX_LOCAL_AI_SLOTS,
  type LocalAISlot,
} from '../local-ai-config';

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* jsdom */ }
});

describe('emptySlots', () => {
  it('정확히 3슬롯, 전부 disabled', () => {
    const s = emptySlots();
    expect(s).toHaveLength(MAX_LOCAL_AI_SLOTS);
    expect(s.map((x) => x.id)).toEqual([1, 2, 3]);
    expect(s.every((x) => !x.enabled && x.baseUrl === '' && x.model === '')).toBe(true);
  });
});

describe('isValidBaseUrl', () => {
  it.each(['http://localhost:11434/v1', 'http://127.0.0.1:8000/v1', 'https://lan.host:8000'])('valid: %s', (u) => {
    expect(isValidBaseUrl(u)).toBe(true);
  });
  it.each(['', '   ', 'ftp://x', 'notaurl', 'localhost:11434'])('invalid: %s', (u) => {
    expect(isValidBaseUrl(u)).toBe(false);
  });
});

describe('validateSlot', () => {
  it('disabled → 에러 없음', () => {
    expect(validateSlot({ id: 1, label: 'x', baseUrl: '', model: '', enabled: false })).toEqual([]);
  });
  it('enabled + 누락 → base·model 에러 2건', () => {
    const errs = validateSlot({ id: 1, label: 'x', baseUrl: '', model: '', enabled: true });
    expect(errs).toHaveLength(2);
  });
  it('enabled + 유효 → 에러 없음', () => {
    expect(validateSlot({ id: 1, label: 'x', baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5:14b', enabled: true })).toEqual([]);
  });
});

describe('save/load — 항상 3슬롯 보장', () => {
  it('저장 후 로드 = 동일 3슬롯', () => {
    const slots: LocalAISlot[] = [
      { id: 1, label: 'A', baseUrl: 'http://localhost:11434/v1', model: 'm1', enabled: true },
      { id: 2, label: 'B', baseUrl: '', model: '', enabled: false },
      { id: 3, label: 'C', baseUrl: '', model: '', enabled: false },
    ];
    saveLocalAISlots(slots);
    const loaded = loadLocalAISlots();
    expect(loaded).toHaveLength(3);
    expect(loaded[0]).toMatchObject({ id: 1, label: 'A', model: 'm1', enabled: true });
  });
  it('쓰레기 입력 → 빈 3슬롯', () => {
    window.localStorage.setItem('noa_local_ai_slots_v1', '{bad json');
    expect(loadLocalAISlots()).toHaveLength(3);
  });
  it('부분 입력(1슬롯만) → 3슬롯으로 정규화', () => {
    saveLocalAISlots([{ id: 2, label: 'only2', baseUrl: 'http://localhost:8000/v1', model: 'q', enabled: true }] as LocalAISlot[]);
    const loaded = loadLocalAISlots();
    expect(loaded).toHaveLength(3);
    expect(loaded[1]).toMatchObject({ id: 2, label: 'only2', enabled: true });
    expect(loaded[0].enabled).toBe(false);
  });
});

describe('listEnabledLocalAI / resolveActiveLocalAI', () => {
  const slots: LocalAISlot[] = [
    { id: 1, label: 'A', baseUrl: 'http://localhost:11434/v1/', model: 'm1', enabled: true },
    { id: 2, label: 'B', baseUrl: 'bad', model: 'm2', enabled: true }, // 무효 → 제외
    { id: 3, label: 'C', baseUrl: 'http://localhost:8000/v1', model: 'm3', enabled: true },
  ];
  it('enabled+유효만, 최대 3', () => {
    const en = listEnabledLocalAI(slots);
    expect(en.map((s) => s.id)).toEqual([1, 3]); // 2는 무효
  });
  it('첫 활성 유효 → {baseUrl(트레일링 슬래시 제거), model}', () => {
    expect(resolveActiveLocalAI(slots)).toEqual({ baseUrl: 'http://localhost:11434/v1', model: 'm1' });
  });
  it('활성 없음 → null', () => {
    expect(resolveActiveLocalAI(emptySlots())).toBeNull();
  });
});
