/**
 * Unit tests for show-alert module
 */
import { showAlert } from '../show-alert';

describe('showAlert', () => {
  it('dispatches noa:alert event', () => {
    const spy = jest.fn();
    window.addEventListener('noa:alert', spy);
    showAlert('test message');
    expect(spy).toHaveBeenCalled();
    window.removeEventListener('noa:alert', spy);
  });

  it('includes message in event detail', () => {
    let detail: { message: string; variant: string } | null = null;
    const handler = (e: Event) => { detail = (e as CustomEvent).detail; };
    window.addEventListener('noa:alert', handler);
    showAlert('hello', 'error');
    expect(detail).not.toBeNull();
    expect(detail!.message).toBe('hello');
    expect(detail!.variant).toBe('error');
    window.removeEventListener('noa:alert', handler);
  });

  it('defaults to warning variant', () => {
    let detail: { variant: string } | null = null;
    const handler = (e: Event) => { detail = (e as CustomEvent).detail; };
    window.addEventListener('noa:alert', handler);
    showAlert('msg');
    expect(detail!.variant).toBe('warning');
    window.removeEventListener('noa:alert', handler);
  });
});
