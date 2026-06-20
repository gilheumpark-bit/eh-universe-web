/**
 * ActiveItemSelector — 아이템/스킬 선택 UI 테스트
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/lib/i18n', () => ({
  L4: (lang: string, v: { ko: string; en: string; ja?: string; zh?: string }) => {
    const raw = typeof lang === 'string' ? lang.toLowerCase() : 'ko';
    if (raw === 'en') return v.en;
    if (raw === 'ja' || raw === 'jp') return v.ja || v.ko;
    if (raw === 'zh' || raw === 'cn') return v.zh || v.ko;
    return v.ko;
  },
}));

import { ActiveItemSelector } from '../ActiveItemSelector';
import type { Item, Skill } from '@/lib/studio-types';

function fixItem(overrides?: Partial<Item>): Item {
  return {
    id: 'i1',
    name: 'Sword',
    category: 'weapon',
    rarity: 'common',
    description: '',
    effect: '',
    obtainedFrom: '',
    ...overrides,
  };
}

function fixSkill(overrides?: Partial<Skill>): Skill {
  return {
    id: 's1',
    name: 'Fireball',
    type: 'active',
    owner: 'h',
    description: '',
    cost: '',
    cooldown: '',
    rank: '',
    ...overrides,
  };
}

describe('ActiveItemSelector', () => {
  test('빈 items+skills → 안내 메시지', () => {
    render(
      <ActiveItemSelector
        language="KO"
        items={[]}
        skills={[]}
        activeItemIds={[]}
        activeSkillIds={[]}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByText('등록된 아이템/스킬이 없습니다')).toBeInTheDocument();
  });

  test('아이템 체크박스 토글', () => {
    const handleChange = jest.fn();
    render(
      <ActiveItemSelector
        language="KO"
        items={[fixItem({ id: 'i1', name: 'Sword' })]}
        skills={[]}
        activeItemIds={[]}
        activeSkillIds={[]}
        onChange={handleChange}
      />
    );
    const cb = screen.getByLabelText(/Sword \(weapon\)/);
    fireEvent.click(cb);
    expect(handleChange).toHaveBeenCalledWith({ activeItems: ['i1'], activeSkills: [] });
  });

  test('체크 해제 토글', () => {
    const handleChange = jest.fn();
    render(
      <ActiveItemSelector
        language="KO"
        items={[fixItem({ id: 'i1' })]}
        skills={[]}
        activeItemIds={['i1']}
        activeSkillIds={[]}
        onChange={handleChange}
      />
    );
    fireEvent.click(screen.getByLabelText(/Sword/));
    expect(handleChange).toHaveBeenCalledWith({ activeItems: [], activeSkills: [] });
  });

  test('스킬 체크박스 토글', () => {
    const handleChange = jest.fn();
    render(
      <ActiveItemSelector
        language="KO"
        items={[]}
        skills={[fixSkill({ id: 's1', name: 'Fireball' })]}
        activeItemIds={[]}
        activeSkillIds={[]}
        onChange={handleChange}
      />
    );
    fireEvent.click(screen.getByLabelText(/Fireball \(active\)/));
    expect(handleChange).toHaveBeenCalledWith({ activeItems: [], activeSkills: ['s1'] });
  });

  test('전체 해제 버튼', () => {
    const handleChange = jest.fn();
    render(
      <ActiveItemSelector
        language="KO"
        items={[fixItem()]}
        skills={[fixSkill()]}
        activeItemIds={['i1']}
        activeSkillIds={['s1']}
        onChange={handleChange}
      />
    );
    fireEvent.click(screen.getByText(/전체 해제/));
    expect(handleChange).toHaveBeenCalledWith({ activeItems: [], activeSkills: [] });
  });

  test('카운트 표시', () => {
    render(
      <ActiveItemSelector
        language="KO"
        items={[fixItem({ id: 'i1' }), fixItem({ id: 'i2', name: 'Bow' })]}
        skills={[]}
        activeItemIds={['i1']}
        activeSkillIds={[]}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByText('(1/2)')).toBeInTheDocument();
  });

  test('4언어 — EN', () => {
    render(
      <ActiveItemSelector
        language="EN"
        items={[fixItem()]}
        skills={[]}
        activeItemIds={[]}
        activeSkillIds={[]}
        onChange={jest.fn()}
      />
    );
    expect(screen.getByText('Items')).toBeInTheDocument();
  });
});
