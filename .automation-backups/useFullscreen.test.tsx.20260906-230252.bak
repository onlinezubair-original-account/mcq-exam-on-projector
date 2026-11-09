import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFullscreen } from './useFullscreen';

describe('useFullscreen', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
  });

  it('requests fullscreen when not currently fullscreen', () => {
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
    const requestFullscreen = vi.fn();
    document.documentElement.requestFullscreen = requestFullscreen;

    const { result } = renderHook(() => useFullscreen());
    act(() => {
      result.current.toggleFullscreen();
    });

    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it('exits fullscreen when currently fullscreen', () => {
    Object.defineProperty(document, 'fullscreenElement', { value: document.documentElement, configurable: true });
    const exitFullscreen = vi.fn();
    document.exitFullscreen = exitFullscreen;

    const { result } = renderHook(() => useFullscreen());
    act(() => {
      result.current.toggleFullscreen();
    });

    expect(exitFullscreen).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the Fullscreen API is unsupported', () => {
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
    delete (document.documentElement as unknown as { requestFullscreen?: unknown }).requestFullscreen;

    const { result } = renderHook(() => useFullscreen());
    expect(() => act(() => result.current.toggleFullscreen())).not.toThrow();
  });
});