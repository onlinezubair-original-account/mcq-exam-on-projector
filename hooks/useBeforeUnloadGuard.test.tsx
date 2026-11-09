import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useBeforeUnloadGuard } from './useBeforeUnloadGuard';

function Harness() {
  useBeforeUnloadGuard();
  return null;
}

function dispatchBeforeUnload(): Event {
  const event = new Event('beforeunload', { cancelable: true });
  // jsdom's native Event.returnValue setter coerces assigned values to
  // boolean, so it can't hold the string '' the hook assigns (matching
  // real BeforeUnloadEvent's string-typed returnValue). Shadow it with an
  // own writable data property so assignment behaves like a plain field
  // instead of going through jsdom's boolean-coercing accessor.
  Object.defineProperty(event, 'returnValue', {
    value: true,
    writable: true,
    configurable: true,
  });
  window.dispatchEvent(event);
  return event;
}

describe('useBeforeUnloadGuard', () => {
  afterEach(() => cleanup());

  it('prevents default and sets returnValue while mounted', () => {
    render(<Harness />);
    const event = dispatchBeforeUnload() as BeforeUnloadEvent;
    expect(event.defaultPrevented).toBe(true);
    expect(event.returnValue).toBe('');
  });

  it('does nothing after unmount', () => {
    const { unmount } = render(<Harness />);
    unmount();
    const event = dispatchBeforeUnload();
    expect(event.defaultPrevented).toBe(false);
  });
});