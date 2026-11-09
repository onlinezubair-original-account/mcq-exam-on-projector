// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SetupScreen } from './SetupScreen';
import { useExamStore } from '@/store/examStore';
import { DEFAULT_META, DEFAULT_CONFIG } from '@/types';

function resetStore() {
  useExamStore.setState({
    screen: 'setup',
    meta: { ...DEFAULT_META },
    config: { ...DEFAULT_CONFIG },
    rawInput: '',
    pendingQuestions: [],
    parseWarnings: { skipped: [], invalidAnswers: [] },
  });
}

describe('SetupScreen', () => {
  beforeEach(() => {
    resetStore();
  });

  it('renders the known field set with source defaults', () => {
    render(<SetupScreen />);
    expect(screen.getByLabelText('1. Paste your questions')).toBeInTheDocument();
    expect(screen.getByLabelText('2. Room size')).toHaveValue('medium');
    expect(screen.getByLabelText('3. Questions per screen')).toHaveValue(5);
    expect(screen.getByLabelText('4. Seconds per question')).toHaveValue(40);
    expect(screen.getByLabelText('5. Number of scrambled sets')).toHaveValue('2');
    expect(screen.getByLabelText('6. Marks for correct answer')).toHaveValue(1);
    expect(screen.getByLabelText('7. Marks for incorrect answer')).toHaveValue(0);
  });

  it('shows an error and does not advance when Build is clicked with empty input', () => {
    render(<SetupScreen />);
    fireEvent.click(screen.getByText('Build slideshow →'));
    expect(screen.getByText(/No valid questions found/)).toBeInTheDocument();
    expect(useExamStore.getState().screen).toBe('setup');
  });

  it('"Load a sample" fills the textarea with the 4-question worked example', () => {
    render(<SetupScreen />);
    fireEvent.click(screen.getByText('Load a sample to see the format →'));
    const textarea = screen.getByLabelText('1. Paste your questions') as HTMLTextAreaElement;
    expect(textarea.value).toContain('chemical symbol for water');
  });

  it('changing Number of scrambled sets always overwrites Questions per screen (no override tracking)', () => {
    render(<SetupScreen />);
    fireEvent.change(screen.getByLabelText('3. Questions per screen'), { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText('5. Number of scrambled sets'), { target: { value: '4' } });
    expect(screen.getByLabelText('3. Questions per screen')).toHaveValue(3);
  });

  it('Build slideshow with the sample loaded parses questions and advances to "show"', () => {
    render(<SetupScreen />);
    fireEvent.click(screen.getByText('Load a sample to see the format →'));
    fireEvent.click(screen.getByText('Build slideshow →'));
    expect(useExamStore.getState().screen).toBe('show');
    expect(useExamStore.getState().pendingQuestions.length).toBe(4);
  });
});