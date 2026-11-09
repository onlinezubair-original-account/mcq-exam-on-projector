import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateGitHubToken,
  checkRepoAccess,
  loadCloudSettings,
  saveCloudSettings,
  listCloudPapers,
  saveCloudPaper,
  loadCloudPaper,
  DEFAULT_CLOUD_REPO,
} from './github';
import type { CloudCredentials, ExamMeta, AppConfig, Question } from '@/types';

const creds: CloudCredentials = {
  token: 'fake-token',
  username: 'testteacher',
  repo: DEFAULT_CLOUD_REPO,
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('validateGitHubToken', () => {
  it('returns ok + username on success', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ login: 'testteacher' }));
    const result = await validateGitHubToken('good-token');
    expect(result).toEqual({ ok: true, username: 'testteacher' });
  });

  it('returns a clear error on 401', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 401));
    const result = await validateGitHubToken('bad-token');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid|expired/i);
  });

  it('returns a network error if fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline'));
    const result = await validateGitHubToken('any-token');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/internet|reach/i);
  });
});

describe('checkRepoAccess', () => {
  it('returns a helpful error on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 404));
    const result = await checkRepoAccess('token', 'testteacher', 'missing-repo');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it('returns ok when push permission is true', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ permissions: { push: true } }));
    const result = await checkRepoAccess('token', 'testteacher', DEFAULT_CLOUD_REPO);
    expect(result.ok).toBe(true);
  });

  it('flags an explicit lack of push permission', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ permissions: { push: false } }));
    const result = await checkRepoAccess('token', 'testteacher', DEFAULT_CLOUD_REPO);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/write access/i);
  });
});

describe('settings sync', () => {
  it('loadCloudSettings returns null when settings.json does not exist', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 404));
    const result = await loadCloudSettings(creds);
    expect(result).toBeNull();
  });

  it('saveCloudSettings PUTs without a sha when creating for the first time', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 404)) // GET settings.json -> not found
      .mockResolvedValueOnce(jsonResponse({ content: { sha: 'new-sha' } })); // PUT
    global.fetch = fetchMock;

    const meta = { program: 'Pharm.D', semester: 4, subject: 'Bio', subjectCode: '', subjectFullName: '', subjectMode: 'browse', examName: 'Quiz 1', quizNumber: 1 } as unknown as Omit<ExamMeta, 'date' | 'dateManuallySet'>;
    const config = { roomSize: 'medium', perSlide: 5, secsPerQ: 40, numSets: 2, qsize: 30, optsize: 23, marksCorrect: 1, marksIncorrect: 0 } as AppConfig;

    await saveCloudSettings(creds, meta, config);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const putCall = fetchMock.mock.calls[1];
    expect(putCall[1].method).toBe('PUT');
    const putBody = JSON.parse(putCall[1].body as string);
    expect(putBody.sha).toBeUndefined();
  });
});

describe('paper sync', () => {
  it('listCloudPapers returns [] when index.json does not exist yet', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 404));
    const result = await listCloudPapers(creds);
    expect(result).toEqual([]);
  });

  it('saveCloudPaper writes the paper file then updates the index', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ content: { sha: 'paper-sha' } })) // PUT papers/<id>.json
      .mockResolvedValueOnce(jsonResponse({}, 404)) // GET papers/index.json -> not found
      .mockResolvedValueOnce(jsonResponse({ content: { sha: 'index-sha' } })); // PUT papers/index.json
    global.fetch = fetchMock;

    const meta = { program: 'Pharm.D', semester: 4, subject: 'Bio', subjectCode: '', subjectFullName: '', subjectMode: 'browse', examName: 'Quiz 1', quizNumber: 1, date: '', dateManuallySet: false } as ExamMeta;
    const config = { roomSize: 'medium', perSlide: 5, secsPerQ: 40, numSets: 2, qsize: 30, optsize: 23, marksCorrect: 1, marksIncorrect: 0 } as AppConfig;
    const questions: Question[] = [];

    const saved = await saveCloudPaper(creds, { meta, config, rawInput: 'raw text', questions });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(saved.id).toBeTruthy();
    expect(saved.meta.examName).toBe('Quiz 1');
  });

  it('loadCloudPaper returns null when the paper file is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}, 404));
    const result = await loadCloudPaper(creds, 'nonexistent-id');
    expect(result).toBeNull();
  });
});