// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetaScreen } from './MetaScreen';
import { useExamStore } from '@/store/examStore';
import { DEFAULT_META } from '@/types';

function resetStore() {
  useExamStore.setState({ screen: 'meta', meta: { ...DEFAULT_META } });
}

describe('MetaScreen', () => {
  beforeEach(() => {
    resetStore();
    window.localStorage.clear();
  });

  it('renders the known field set with source defaults', () => {
    render(<MetaScreen />);
    expect(screen.getByText('Exam details')).toBeInTheDocument();
    expect(screen.getByLabelText('Program')).toHaveValue('Pharm.D');
    expect(screen.getByLabelText('Semester / Class / Year')).toHaveValue(4);
    expect(screen.getByLabelText('Exam name')).toHaveValue('');
    expect(screen.getByText('Next →')).toBeInTheDocument();
    expect(screen.getByText('Skip →')).toBeInTheDocument();
  });

  it('shows Quiz number only when Exam name is "Class Quiz"', () => {
    render(<MetaScreen />);
    expect(screen.getByLabelText('Quiz number').closest('div')).not.toBeVisible();
    fireEvent.change(screen.getByLabelText('Exam name'), { target: { value: 'Class Quiz' } });
    expect(screen.getByLabelText('Quiz number').closest('div')).toBeVisible();
  });

  it('"Skip →" resets fields to defaults, never writes Last-used settings, advances to setup', () => {
    render(<MetaScreen />);
    fireEvent.change(screen.getByLabelText('Semester / Class / Year'), { target: { value: '9' } });
    fireEvent.click(screen.getByText('Skip →'));
    expect(useExamStore.getState().screen).toBe('setup');
    expect(useExamStore.getState().meta.semester).toBe(4);
    expect(window.localStorage.getItem('mcqProjectorLastSettings_v1')).toBeNull();
  });

  it('"Next →" commits current fields to the store and advances to setup', () => {
    render(<MetaScreen />);
    fireEvent.change(screen.getByLabelText('Semester / Class / Year'), { target: { value: '7' } });
    fireEvent.click(screen.getByText('Next →'));
    expect(useExamStore.getState().screen).toBe('setup');
    expect(useExamStore.getState().meta.semester).toBe(7);
  });
});