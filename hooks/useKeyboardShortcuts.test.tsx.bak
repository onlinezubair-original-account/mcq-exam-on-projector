import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useExamStore } from '@/store/examStore';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

function Harness() {
  useKeyboardShortcuts();
  return null;
}

function fireKey(init: KeyboardEventInit) {
  document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
}

describe('useKeyboardShortcuts', () => {
  const initialState = useExamStore.getState();

  beforeEach(() => {
    useExamStore.setState(initialState, true);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('Space toggles pause unconditionally (matches source: no calibrating guard)', () => {
    render(<Harness />);
    const before = useExamStore.getState().paused;
    fireKey({ code: 'Space' });
    expect(useExamStore.getState().paused).toBe(!before);
  });

  it('ArrowRight/ArrowLeft navigate slides', () => {
    useExamStore.getState().startCalibration();
    render(<Harness />);
    const startIndex = useExamStore.getState().slideIndex;
    fireKey({ code: 'ArrowRight' });
    expect(useExamStore.getState().slideIndex).toBe(startIndex + 1);
    fireKey({ code: 'ArrowLeft' });
    expect(useExamStore.getState().slideIndex).toBe(startIndex);
  });

  it('+/- adjust font size, [ / ] adjust per-slide count', () => {
    useExamStore.getState().startCalibration();
    render(<Harness />);
    const before = useExamStore.getState().config;
    fireKey({ key: '+' });
    expect(useExamStore.getState().config.qsize).toBe(before.qsize + 2);
    fireKey({ key: '-' });
    expect(useExamStore.getState().config.qsize).toBe(before.qsize);
    fireKey({ key: ']' });
    expect(useExamStore.getState().config.perSlide).toBe(before.perSlide + 1);
    fireKey({ key: '[' });
    expect(useExamStore.getState().config.perSlide).toBe(before.perSlide);
  });

  it('F toggles fullscreen', () => {
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
    const requestFullscreen = vi.fn();
    document.documentElement.requestFullscreen = requestFullscreen;

    render(<Harness />);
    fireKey({ key: 'f' });
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it('Escape confirms then routes to setup and stops the timer', () => {
    window.confirm = vi.fn(() => true);
    useExamStore.setState({ screen: 'show' });

    render(<Harness />);
    fireKey({ key: 'Escape' });

    expect(window.confirm).toHaveBeenCalled();
    expect(useExamStore.getState().screen).toBe('setup');
  });

  it('Escape does nothing if the teacher cancels the confirm dialog', () => {
    window.confirm = vi.fn(() => false);
    useExamStore.setState({ screen: 'show' });

    render(<Harness />);
    fireKey({ key: 'Escape' });

    expect(useExamStore.getState().screen).toBe('show');
  });

  it('removes the listener on unmount', () => {
    const { unmount } = render(<Harness />);
    unmount();
    const before = useExamStore.getState().paused;
    fireKey({ code: 'Space' });
    expect(useExamStore.getState().paused).toBe(before);
  });
});