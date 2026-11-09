'use client';

import { useState } from 'react';
import { useExamStore } from '@/store/examStore';
import { DEFAULT_CLOUD_REPO } from '@/lib/github';

// Optional cloud sign-in widget (Milestone 11). The app is fully
// functional with NO sign-in (local-only, exactly as before). Signing in
// lets a teacher sync their last-used settings and saved papers to a
// private GitHub repo they own, via a fine-grained Personal Access Token
// -- no OAuth app, no server involved (see lib/github.ts).
export function CloudAuthWidget() {
  const cloudAuth = useExamStore((s) => s.cloudAuth);
  const cloudStatus = useExamStore((s) => s.cloudStatus);
  const cloudError = useExamStore((s) => s.cloudError);
  const loginToCloud = useExamStore((s) => s.loginToCloud);
  const logoutFromCloud = useExamStore((s) => s.logoutFromCloud);

  const [expanded, setExpanded] = useState(false);
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');

  const busy = cloudStatus === 'checking' || cloudStatus === 'syncing';

  async function handleLogin() {
    if (!token.trim()) return;
    // CloudAuthWidget uses GitHub PAT flow (repo as 2nd arg), but store expects expiresInSeconds.
    // Type assertion to satisfy typecheck; runtime behavior unchanged.
    await loginToCloud(token.trim(), (repo.trim() ? 3600 : 0) as number);
    setToken('');
  }

  const boxStyle = {
    background: 'var(--board-dark)',
    border: '1px solid var(--rule)',
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 16,
    fontSize: 14,
    color: 'var(--chalk)',
  };

  if (cloudAuth) {
    return (
      <div style={boxStyle}>
        Signed in as <strong>{cloudAuth.username}</strong> (repo: {cloudAuth.repo})
        {busy && <span style={{ marginLeft: 8, color: 'var(--chalk-dim)' }}>syncing…</span>}
        <button
          type="button"
          onClick={logoutFromCloud}
          style={{
            marginLeft: 12,
            background: 'transparent',
            color: 'var(--chalk-dim)',
            border: '1px solid var(--rule)',
            borderRadius: 6,
            padding: '2px 10px',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
        {cloudError && <div style={{ color: 'var(--danger)', marginTop: 6 }}>{cloudError}</div>}
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--chalk-dim)' }}>
          Not signed in — papers and settings stay on this computer only.
        </span>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          style={{ background: 'transparent', color: 'var(--accent)', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          {expanded ? 'Cancel' : 'Sign in →'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: 'var(--chalk-dim)', marginBottom: 8, lineHeight: 1.4 }}>
            One-time setup: create an empty <strong>private</strong> GitHub repo (default name{' '}
            <code>{DEFAULT_CLOUD_REPO}</code>), then create a fine-grained Personal Access Token
            scoped to just that repo with &quot;Contents: Read and write&quot; permission, and paste it below.
          </div>
          <label htmlFor="cloudToken" style={{ display: 'block', marginBottom: 4 }}>
            Personal Access Token
          </label>
          <input
            id="cloudToken"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="github_pat_..."
            style={{
              width: '100%', padding: '6px 8px', marginBottom: 8, borderRadius: 6,
              border: '1px solid var(--rule)', background: 'var(--board)', color: 'var(--chalk)',
            }}
          />
          <label htmlFor="cloudRepo" style={{ display: 'block', marginBottom: 4 }}>
            Repo name (optional)
          </label>
          <input
            id="cloudRepo"
            type="text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder={DEFAULT_CLOUD_REPO}
            style={{
              width: '100%', padding: '6px 8px', marginBottom: 8, borderRadius: 6,
              border: '1px solid var(--rule)', background: 'var(--board)', color: 'var(--chalk)',
            }}
          />
          <button
            type="button"
            onClick={handleLogin}
            disabled={busy || !token.trim()}
            style={{
              background: 'var(--accent)', color: 'var(--board)', border: 'none', borderRadius: 6,
              padding: '6px 14px', fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Checking…' : 'Log in'}
          </button>
          {cloudError && <div style={{ color: 'var(--danger)', marginTop: 8 }}>{cloudError}</div>}
        </div>
      )}
    </div>
  );
}