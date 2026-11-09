import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CloudAuthWidget } from './CloudAuthWidget';
import { useExamStore } from '@/store/examStore';

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

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
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ login: 'testteacher' }))
      .mockResolvedValueOnce(jsonResponse({ permissions: { push: true } }))
      .mockResolvedValueOnce(jsonResponse({}, 404))
      .mockResolvedValueOnce(jsonResponse({}, 404));

    render(<CloudAuthWidget />);
    fireEvent.click(screen.getByText(/sign in/i));
    fireEvent.change(screen.getByLabelText(/personal access token/i), { target: { value: 'fake-pat' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/testteacher/i)).toBeInTheDocument();
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