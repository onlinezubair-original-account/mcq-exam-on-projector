// GitHub REST API wrapper + cloud save/load orchestration (Milestone 11).
// Pure network layer: no localStorage here (that lives in lib/storage.ts's
// readCloudAuth/writeCloudAuth) and no Zustand store access (that's wired
// in a later script). Every exported function takes CloudCredentials
// explicitly so this file stays trivially testable with a mocked fetch.

import type {
  CloudCredentials,
  CloudSettingsPayload,
  PaperIndexEntry,
  SavedPaper,
  ExamMeta,
  AppConfig,
} from '@/types';

const GITHUB_API = 'https://api.github.com';

// Default name suggested to the teacher when they set up their data repo.
// They create this (empty, private) themselves on GitHub — the app never
// creates repos on their behalf, to keep the PAT's required scope minimal
// (Contents: Read and write on one named repo, nothing broader).
export const DEFAULT_CLOUD_REPO = 'mcq-projector-data';

export interface GitHubAuthResult {
  ok: boolean;
  username?: string;
  error?: string;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// UTF-8-safe base64 helpers — plain btoa/atob mishandle non-Latin1 text
// (e.g. Urdu subject names), which GitHub's Contents API content otherwise
// requires as base64 of raw UTF-8 bytes.
function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function fromBase64(b64: string): string {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function generatePaperId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `paper-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---- Login-time checks ------------------------------------------------

export async function validateGitHubToken(token: string): Promise<GitHubAuthResult> {
  try {
    const res = await fetch(`${GITHUB_API}/user`, { headers: authHeaders(token) });
    if (res.status === 401) return { ok: false, error: 'Invalid or expired token.' };
    if (!res.ok) return { ok: false, error: `GitHub API error (${res.status}).` };
    const data = (await res.json()) as { login: string };
    return { ok: true, username: data.login };
  } catch {
    return { ok: false, error: 'Could not reach GitHub. Check your internet connection.' };
  }
}

export async function checkRepoAccess(
  token: string,
  owner: string,
  repo: string
): Promise<GitHubAuthResult> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: authHeaders(token) });
    if (res.status === 404) {
      return {
        ok: false,
        error: `Repo "${owner}/${repo}" not found or not visible to this token. Create an empty private repo with this exact name on GitHub first, then try again.`,
      };
    }
    if (res.status === 401) return { ok: false, error: 'Invalid or expired token.' };
    if (!res.ok) return { ok: false, error: `GitHub API error (${res.status}).` };
    const data = (await res.json()) as { permissions?: { push?: boolean } };
    if (data.permissions?.push === false) {
      return {
        ok: false,
        error: 'This token does not have write access to that repo. Check the PAT\'s "Contents" permission is set to Read and write.',
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach GitHub. Check your internet connection.' };
  }
}

// ---- Low-level file read/write ------------------------------------------

interface GitHubFile<T> {
  data: T;
  sha: string;
}

async function getJsonFile<T>(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<GitHubFile<T> | null> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    headers: authHeaders(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API error reading ${path} (${res.status}).`);
  const json = (await res.json()) as { content: string; sha: string };
  const text = fromBase64(json.content);
  return { data: JSON.parse(text) as T, sha: json.sha };
}

async function putJsonFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  data: unknown,
  message: string,
  sha?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    message,
    content: toBase64(JSON.stringify(data, null, 2)),
  };
  if (sha) body.sha = sha;

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(`GitHub API error writing ${path} (${res.status}): ${errBody.message ?? 'unknown error'}`);
  }
  const json = (await res.json()) as { content: { sha: string } };
  return json.content.sha;
}

// ---- Settings sync --------------------------------------------------------

export async function loadCloudSettings(creds: CloudCredentials): Promise<CloudSettingsPayload | null> {
  const file = await getJsonFile<CloudSettingsPayload>(creds.token, creds.username, creds.repo, 'settings.json');
  return file?.data ?? null;
}

export async function saveCloudSettings(
  creds: CloudCredentials,
  meta: Omit<ExamMeta, 'date' | 'dateManuallySet'>,
  config: AppConfig
): Promise<void> {
  const existing = await getJsonFile<CloudSettingsPayload>(creds.token, creds.username, creds.repo, 'settings.json');
  const payload: CloudSettingsPayload = { savedAt: Date.now(), meta, config };
  await putJsonFile(
    creds.token, creds.username, creds.repo,
    'settings.json', payload, 'Update last-used settings',
    existing?.sha
  );
}

// ---- Paper sync ------------------------------------------------------------

export async function listCloudPapers(creds: CloudCredentials): Promise<PaperIndexEntry[]> {
  const file = await getJsonFile<PaperIndexEntry[]>(creds.token, creds.username, creds.repo, 'papers/index.json');
  return file?.data ?? [];
}

export async function loadCloudPaper(creds: CloudCredentials, id: string): Promise<SavedPaper | null> {
  const file = await getJsonFile<SavedPaper>(creds.token, creds.username, creds.repo, `papers/${id}.json`);
  return file?.data ?? null;
}

export async function saveCloudPaper(
  creds: CloudCredentials,
  paper: Omit<SavedPaper, 'id' | 'savedAt'>
): Promise<SavedPaper> {
  const id = generatePaperId();
  const savedAt = Date.now();
  const fullPaper: SavedPaper = { ...paper, id, savedAt };

  await putJsonFile(
    creds.token, creds.username, creds.repo,
    `papers/${id}.json`, fullPaper,
    `Save paper: ${paper.meta.examName || 'Untitled'}`
  );

  const indexFile = await getJsonFile<PaperIndexEntry[]>(creds.token, creds.username, creds.repo, 'papers/index.json');
  const index = indexFile?.data ?? [];
  const entry: PaperIndexEntry = {
    id,
    savedAt,
    title: paper.meta.examName || 'Untitled paper',
    program: paper.meta.program,
    subject: paper.meta.subject,
    examName: paper.meta.examName,
    quizNumber: paper.meta.quizNumber,
  };
  const newIndex = [entry, ...index];

  await putJsonFile(
    creds.token, creds.username, creds.repo,
    'papers/index.json', newIndex,
    `Index: add ${entry.title}`,
    indexFile?.sha
  );

  return fullPaper;
}