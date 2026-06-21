import { buildNoaContinuationContext } from '../noa-continuity-context';

describe('buildNoaContinuationContext', () => {
  it('저장 근거가 없으면 빈 블록을 반환한다', () => {
    const context = buildNoaContinuationContext({
      tabKey: 'world',
      projectId: 'project-1',
      sessionMessages: [],
      workJournalText: '',
    });

    expect(context.block).toBe('');
    expect(context.sourceCount).toBe(0);
    expect(context.hasStoredBasis).toBe(false);
  });

  it('작업노트와 저장 대화 노트를 이어가기 블록으로 묶는다', () => {
    const context = buildNoaContinuationContext({
      tabKey: 'plot',
      projectId: 'project-1',
      workJournalText: '이번 주: 구상 1건 · 초고 2건',
      sessionMessages: [
        { role: 'user', content: '주인공의 동기를 바꾸자', timestamp: 1 },
        { role: 'assistant', content: '복수보다 생존 동기가 더 자연스럽습니다.', timestamp: 2 },
      ],
    });

    expect(context.hasStoredBasis).toBe(true);
    expect(context.block).toContain('[저장된 작업노트 기반 이어가기]');
    expect(context.block).toContain('작업노트: 이번 주: 구상 1건 · 초고 2건');
    expect(context.block).toContain('사용자: 주인공의 동기를 바꾸자');
    expect(context.block).toContain('노아: 복수보다 생존 동기가 더 자연스럽습니다.');
    expect(context.block).toContain('기억으로 단정하지 말고');
  });

  it('저장 대화 노트는 최신 maxMessages개만 사용한다', () => {
    const context = buildNoaContinuationContext({
      tabKey: 'direction',
      maxMessages: 2,
      sessionMessages: [
        { role: 'user', content: '오래된 말', timestamp: 1 },
        { role: 'assistant', content: '중간 말', timestamp: 2 },
        { role: 'user', content: '최신 말', timestamp: 3 },
      ],
    });

    expect(context.block).not.toContain('오래된 말');
    expect(context.block).toContain('중간 말');
    expect(context.block).toContain('최신 말');
  });

  it('긴 메시지는 잘라서 넣는다', () => {
    const long = '가'.repeat(260);
    const context = buildNoaContinuationContext({
      tabKey: 'character',
      sessionMessages: [{ role: 'user', content: long, timestamp: 1 }],
    });

    expect(context.block.length).toBeLessThan(long.length + 220);
    expect(context.block).toContain('...');
  });
});
