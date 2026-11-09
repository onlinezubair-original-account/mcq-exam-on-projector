import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useBeforeUnloadGuard } from './useBeforeUnloadGuard';

function Harness() {
  useBeforeUnloadGuard();
  return null;
}

function dispatchBeforeUnload(): Event {
  const event = new Event('beforeunload', { cancelable: true });
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