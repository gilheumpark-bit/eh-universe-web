import { createWabiReceipt, validateWabiReceipt } from '../receipt';

describe('WABI Receipt', () => {
  it('creates a receipt with default HOLD decision', () => {
    const receipt = createWabiReceipt({ actionType: 'test' });
    expect(receipt.decision).toBe('HOLD');
    expect(receipt.receiptId).toBeDefined();
  });

  it('invalidates ALLOW receipt if no approvedBy is provided', () => {
    const receipt = createWabiReceipt({ decision: 'ALLOW' });
    expect(validateWabiReceipt(receipt)).toBe(false);
  });

  it('invalidates ALLOW receipt if ai-proposer is the approver', () => {
    const receipt = createWabiReceipt({ decision: 'ALLOW', approvedBy: 'ai-proposer' });
    expect(validateWabiReceipt(receipt)).toBe(false);
  });

  it('invalidates ALLOW receipt if there are missing references', () => {
    const receipt = createWabiReceipt({ decision: 'ALLOW', approvedBy: 'human-author', missingReferences: ['ref1'] });
    expect(validateWabiReceipt(receipt)).toBe(false);
  });

  it('validates ALLOW receipt with human approver and no missing references', () => {
    const receipt = createWabiReceipt({ decision: 'ALLOW', approvedBy: 'human-author' });
    expect(validateWabiReceipt(receipt)).toBe(true);
  });
});
