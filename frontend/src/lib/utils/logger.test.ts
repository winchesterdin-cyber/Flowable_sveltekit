import { describe, expect, it, vi } from 'vitest';
import { createLogger, logger } from './logger';

describe('logger helpers', () => {
  it('logs events with the event prefix', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    logger.event('demo-action', { status: 'ok' });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(String(infoSpy.mock.calls[0][0])).toContain('event:demo-action');

    infoSpy.mockRestore();
  });

  it('adds module context for child loggers', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const moduleLogger = createLogger('LoggerTest');

    moduleLogger.event('child-event', { id: 42 });

    const message = String(infoSpy.mock.calls[0][0]);
    expect(message).toContain('"module":"LoggerTest"');
    expect(message).toContain('event:child-event');

    infoSpy.mockRestore();
  });
});
