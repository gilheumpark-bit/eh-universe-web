/**
 * Unit tests for logger module
 */
import { logger } from '../logger';

describe('logger', () => {
  it('has info method', () => { expect(typeof logger.info).toBe('function'); });
  it('has debug method', () => { expect(typeof logger.debug).toBe('function'); });
  it('has warn method', () => { expect(typeof logger.warn).toBe('function'); });
  it('has error method', () => { expect(typeof logger.error).toBe('function'); });

  it('warn calls console.warn', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    logger.warn('test', 'message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('error calls console.error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    logger.error('test', 'message');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
