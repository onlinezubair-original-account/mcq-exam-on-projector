// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SlideshowScreen } from './SlideshowScreen';
import { useExamStore } from '@/store/examStore';
import { DEFAULT_CONFIG, DEFAULT_META } from '@/types';
import type { Question } from '@/types';

// Resets the store to a clean pre-calibration state before each test, since
// Zustand state is module-level and persists across tests otherwise. Any
// new milestone's fields on examStore get added here too.
function resetStore() {
  useExamStore.setState({
    meta: { ...DEFAULT_META },
    config: { ...DEFAULT_CONFIG },
    pendingQuestions: [],
    masterQuestions: [],
    sets: [],
    calibrating: false,
    slideIndex: 0,
    slideCount: 0,
    paused: false,
    slideDuration: 0,
    timeLeft: 0,
    totalElapsed: 0,
    totalDuration: 0,
    timerId: null,
    screen: 'show',
  });
}

function makeQuestions(count: number): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    text: `Q${i + 1}?`,
    options: [
      { letter: 'A', text: 'opt A' },
      { letter: 'B', text: 'opt B' },
    ],
    answer: 'A',
  }));
}

describe('SlideshowScreen (calibration mode)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('auto-starts calibration on mount with 12 demo questions', () => {
    render(<SlideshowScreen />);
    expect(screen.getByText(/Calibration mode/i)).toBeInTheDocument();
    // DEFAULT_CONFIG.perSlide is 5 -> questions 1..5 shown, not 6.
    expect(screen.getByText(/Sample question 1 —/)).toBeInTheDocument();
    expect(screen.getByText(/Sample question 5 —/)).toBeInTheDocument();
    expect(screen.queryByText(/Sample question 6 —/)).not.toBeInTheDocument();
    expect(screen.getByText('Calibration — screen 1 of 3')).toBeInTheDocument();
  });

  it('builds one set column per numSets when numSets is 1', () => {
    useExamStore.setState({ config: { ...DEFAULT_CONFIG, numSets: 1 } });
    render(<SlideshowScreen />);
    // A single set never shows a "Set X" label (source: numSets > 1 check).
    expect(screen.queryByText(/^Set /)).not.toBeInTheDocument();
  });

  it('shows a "Set A" / "Set B" label when numSets > 1', () => {
    useExamStore.setState({ config: { ...DEFAULT_CONFIG, numSets: 2 } });
    render(<SlideshowScreen />);
    expect(screen.getByText('Set A')).toBeInTheDocument();
    expect(screen.getByText('Set B')).toBeInTheDocument();
  });

  it('Next/Prev navigate between calibration screens and stop at the edges', () => {
    render(<SlideshowScreen />);
    expect(screen.getByText('Calibration — screen 1 of 3')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Next ⟶'));
    expect(screen.getByText('Calibration — screen 2 of 3')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Next ⟶'));
    expect(screen.getByText('Calibration — screen 3 of 3')).toBeInTheDocument();

    // Already on the last calibration screen — stays put (source L1935).
    fireEvent.click(screen.getByText('Next ⟶'));
    expect(screen.getByText('Calibration — screen 3 of 3')).toBeInTheDocument();

    fireEvent.click(screen.getByText('⟵ Prev'));
    expect(screen.getByText('Calibration — screen 2 of 3')).toBeInTheDocument();
  });

  it('adjustPerSlide is clamped to 2-5 and Q+/Q- update the display', () => {
    render(<SlideshowScreen />);
    expect(screen.getByTitle('Questions currently shown per screen')).toHaveTextContent('5/screen');

    // Already at max (5) — Q+ is a no-op.
    fireEvent.click(screen.getByText('Q+'));
    expect(screen.getByTitle('Questions currently shown per screen')).toHaveTextContent('5/screen');

    fireEvent.click(screen.getByText('Q−'));
    expect(screen.getByTitle('Questions currently shown per screen')).toHaveTextContent('4/screen');
  });

  it('adjustFont is clamped 14-60 (questions) / 12-48 (options)', () => {
    render(<SlideshowScreen />);
    // Push font size down repeatedly past its floor.
    for (let i = 0; i < 20; i++) {
      fireEvent.click(screen.getByText('A-'));
    }
    const config = useExamStore.getState().config;
    expect(config.qsize).toBe(14);
    expect(config.optsize).toBe(12);
  });
});

describe('SlideshowScreen (real exam timer — Milestone 6a)', () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    useExamStore.getState().stopTimer();
    vi.useRealTimers();
  });

  it('"Start Exam →" swaps pendingQuestions in, hides the calib bar, and starts the countdown', () => {
    useExamStore.setState({
      pendingQuestions: makeQuestions(6),
      config: { ...DEFAULT_CONFIG, perSlide: 3, numSets: 1, secsPerQ: 10 },
    });
    render(<SlideshowScreen />);
    expect(screen.getByText(/Calibration mode/i)).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByText('Start Exam →'));
    });

    expect(screen.queryByText(/Calibration mode/i)).not.toBeInTheDocument();
    expect(screen.getByText('Screen 1 of 2')).toBeInTheDocument();
    // 3 questions * 10s each = 30s for the first slide.
    expect(screen.getByText('00:30')).toBeInTheDocument();

    const state = useExamStore.getState();
    expect(state.masterQuestions).toHaveLength(6);
    expect(state.calibrating).toBe(false);
    expect(state.timerId).not.toBeNull();
  });

  it('ticks the countdown down every second and updates the overall total', () => {
    useExamStore.setState({
      pendingQuestions: makeQuestions(1),
      config: { ...DEFAULT_CONFIG, perSlide: 1, numSets: 1, secsPerQ: 5 },
    });
    render(<SlideshowScreen />);
    act(() => {
      fireEvent.click(screen.getByText('Start Exam →'));
    });
    expect(screen.getByText('00:05')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('00:03')).toBeInTheDocument();
    expect(screen.getByText(/Total: 00:02 \/ 00:05/)).toBeInTheDocument();
  });

  it('pausing stops the countdown; resuming continues it', () => {
    useExamStore.setState({
      pendingQuestions: makeQuestions(3),
      config: { ...DEFAULT_CONFIG, perSlide: 1, numSets: 1, secsPerQ: 20 },
    });
    render(<SlideshowScreen />);
    act(() => {
      fireEvent.click(screen.getByText('Start Exam →'));
    });

    act(() => {
      fireEvent.click(screen.getByText('Pause'));
    });
    expect(screen.getByText('Resume')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // Paused — no change.
    expect(screen.getByText('00:20')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByText('Resume'));
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('00:19')).toBeInTheDocument();
  });

  it('auto-advances to the next slide when a slide\'s countdown reaches zero', () => {
    useExamStore.setState({
      pendingQuestions: makeQuestions(2),
      config: { ...DEFAULT_CONFIG, perSlide: 1, numSets: 1, secsPerQ: 3 },
    });
    render(<SlideshowScreen />);
    act(() => {
      fireEvent.click(screen.getByText('Start Exam →'));
    });
    expect(screen.getByText('Screen 1 of 2')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Screen 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('00:03')).toBeInTheDocument();
  });

  it('stops the timer and routes to the end screen after the last slide finishes', () => {
    useExamStore.setState({
      pendingQuestions: makeQuestions(1),
      config: { ...DEFAULT_CONFIG, perSlide: 1, numSets: 1, secsPerQ: 2 },
    });
    render(<SlideshowScreen />);
    act(() => {
      fireEvent.click(screen.getByText('Start Exam →'));
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const state = useExamStore.getState();
    expect(state.screen).toBe('end');
    expect(state.timerId).toBeNull();
  });
});