// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LockedScreen } from './LockedScreen';
import { useExamStore } from '@/store/examStore';
import { DEFAULT_META, DEFAULT_CONFIG } from '@/types';
import type { Question } from '@/types';
import type { SetQuestion } from '@/lib/shuffle';

function makeQuestion(n: number): Question {
  return {
    number: n,
    text: `Question ${n}?`,
    options: [
      { letter: 'A', text: 'Opt A' },
      { letter: 'B', text: 'Opt B' },
    ],
    answer: 'A',
  };
}

function makeSet(questions: Question[]): SetQuestion[] {
  return questions.map((q, i) => ({
    displayNumber: i + 1,
    origNumber: q.number,
    text: q.text,
    options: q.options.map((o) => ({ letter: o.letter, text: o.text, origLetter: o.letter })),
    answer: q.answer,
  }));
}

function resetStore() {
  const master = [makeQuestion(1), makeQuestion(2)];
  useExamStore.setState({
    screen: 'locked',
    meta: { ...DEFAULT_META },
    config: { ...DEFAULT_CONFIG, numSets: 2 },
    lockedMasterQuestions: master,
    lockedSets: [makeSet(master), makeSet(master)],
  });
}

describe('LockedScreen', () => {
  beforeEach(() => {
    resetStore();
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the locked-sets summary with question/set counts', () => {
    render(<LockedScreen />);
    expect(screen.getByText(/2 scrambled sets/)).toBeInTheDocument();
    expect(screen.getByText(/2 questions/)).toBeInTheDocument();
  });

  it('shows a not-downloaded warning until the download button is clicked', () => {
    render(<LockedScreen />);
    expect(screen.getByText(/Not downloaded yet/)).toBeInTheDocument();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('⬇ Download exam files (.zip)'));

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Not downloaded yet/)).not.toBeInTheDocument();
    expect(screen.getByText('⬇ Download again (.zip)')).toBeInTheDocument();
  });

  it('clicking download again triggers another download', () => {
    render(<LockedScreen />);
    fireEvent.click(screen.getByText('⬇ Download exam files (.zip)'));
    fireEvent.click(screen.getByText('⬇ Download again (.zip)'));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2);
  });

  it('regenerating sets resets the downloaded state', () => {
    render(<LockedScreen />);
    fireEvent.click(screen.getByRole('button', { name: /Download exam files/ }));
    expect(screen.getByText(/Download again/)).toBeInTheDocument();

    const newMaster = [makeQuestion(1), makeQuestion(2), makeQuestion(3)];
    act(() => {
      useExamStore.setState({ lockedSets: [makeSet(newMaster), makeSet(newMaster)] });
    });

    expect(screen.getByRole('button', { name: /Download exam files/ })).toBeInTheDocument();
  });

  it('"Continue →" routes to the show screen', () => {
    render(<LockedScreen />);
    fireEvent.click(screen.getByText('Continue →'));
    expect(useExamStore.getState().screen).toBe('show');
  });

  it('"Regenerate sets" calls regenerateSets', () => {
    const regenerateSets = vi.fn();
    useExamStore.setState({ regenerateSets });
    render(<LockedScreen />);
    fireEvent.click(screen.getByText(/Regenerate sets/));
    expect(regenerateSets).toHaveBeenCalledTimes(1);
  });
});