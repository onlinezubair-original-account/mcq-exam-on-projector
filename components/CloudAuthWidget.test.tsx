// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CloudAuthWidget } from './CloudAuthWidget';
import { useExamStore } from '@/store/examStore';

beforeEach(() => {
  useExamStore.setState({ cloudAuth: null, cloudStatus: 'idle', cloudError: null, cloudPapers: [] });
  vi.restoreAllMocks();
});

describe('CloudAuthWidget', () => {
  it('shows the signed-out state by default', () => {
    render(<CloudAuthWidget />);
    expect(screen.getByText(/not signed in/i)).toBeInTheDocument();
  });

  it('expands the login form and logs in on submit', async () => {
    const loginToCloud = vi.fn().mockImplementation(async (token: string, repo?: string) => {
      // Simulate successful login by setting cloudAuth directly
      useExamStore.setState({
        cloudAuth: { token, username: 'testteacher', repo: repo || 'mcq-projector-data' },
        cloudStatus: 'idle',
        cloudError: null,
      });
    });
    useExamStore.setState({ loginToCloud });

    render(<CloudAuthWidget />);
    fireEvent.click(screen.getByText(/sign in/i));
    fireEvent.change(screen.getByPlaceholderText(/github_pat_/i), { target: { value: 'fake-pat' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/Signed in as/i)).toBeInTheDocument();
    });
  });

  it('shows the signed-in state and logs out', () => {
    useExamStore.setState({
      cloudAuth: { token: 'x', username: 'testteacher', repo: 'mcq-projector-data' },
    });
    render(<CloudAuthWidget />);
    expect(screen.getByText(/testteacher/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(useExamStore.getState().cloudAuth).toBeNull();
  });
});