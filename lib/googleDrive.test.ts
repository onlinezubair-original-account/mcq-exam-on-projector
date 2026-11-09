import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateGoogleToken,
  checkDriveAccess,
  loadCloudSettings,
  saveCloudSettings,
  listCloudPapers,
  saveCloudPaper,
  loadCloudPaper,
} from './googleDrive';
import type { GoogleCredentials } from '@/types';
import type { ExamMeta, AppConfig, Question } from '@/types';

const creds: GoogleCredentials = {
  accessToken: 'fake-access-token',
  expiresAt: Date.now() + 3600_000,
  email: 'teacher@example.com',
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

describe('validateGoogleToken', () => {
  it('returns valid + email on success', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ email: 'teacher@example.com' }));
    const result = await validateGoogleToken('good-token');
    expect(result).toEqual({ valid: true, email: 'teacher@example.com' });
  });

  it('returns an error on a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: 'invalid_token' }, 400));
    const result = await validateGoogleToken('bad-token');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns a network error if fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline'));
    const result = await validateGoogleToken('any-token');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/error|offline/i);
  });
});

describe('checkDriveAccess', () => {
  it('returns valid + email on success', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ user: { emailAddress: 'teacher@example.com' } }));
    const result = await checkDriveAccess('good-token');
    expect(result.valid).toBe(true);
    expect(result.email).toBe('teacher@example.com');
  });

  it('returns an error on a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'insufficient scope' } }, 403));
    const result = await checkDriveAccess('bad-token');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/scope/i);
  });
});

describe('settings sync', () => {
  it('loadCloudSettings returns null when the app folder exists but settings.json does not', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'folder-1' }] })) // findFolder -> found
      .mockResolvedValueOnce(jsonResponse({ files: [] })); // findFileByName settings.json -> not found
    global.fetch = fetchMock;

    const result = await loadCloudSettings(creds);
    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('loadCloudSettings returns parsed data when settings.json exists', async () => {
    const payload = { savedAt: 123, meta: { program: 'Pharm.D' }, config: { roomSize: 'medium' } };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'folder-1' }] })) // findFolder
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'file-1' }] })) // findFileByName -> found
      .mockResolvedValueOnce(jsonResponse(payload)); // readJsonFile (alt=media)
    global.fetch = fetchMock;

    const result = await loadCloudSettings(creds);
    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('saveCloudSettings creates the app folder and settings.json on first use', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ files: [] })) // findFolder -> not found
      .mockResolvedValueOnce(jsonResponse({ id: 'folder-1' })) // createFolder
      .mockResolvedValueOnce(jsonResponse({ files: [] })) // findFileByName settings.json -> not found
      .mockResolvedValueOnce(jsonResponse({ id: 'file-1' })); // createJsonFile (multipart POST)
    global.fetch = fetchMock;

    const meta = {
      program: 'Pharm.D', semester: 4, subject: 'Bio', subjectCode: '', subjectFullName: '',
      subjectMode: 'browse', examName: 'Quiz 1', quizNumber: 1,
    } as unknown as Omit<ExamMeta, 'date' | 'dateManuallySet'>;
    const config = {
      roomSize: 'medium', perSlide: 5, secsPerQ: 40, numSets: 2, qsize: 30, optsize: 23,
      marksCorrect: 1, marksIncorrect: 0,
    } as AppConfig;

    await saveCloudSettings(creds, meta, config);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    const createCall = fetchMock.mock.calls[3];
    expect(createCall[1].method).toBe('POST');
  });

  it('saveCloudSettings updates in place (PATCH) when settings.json already exists', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'folder-1' }] })) // findFolder -> found
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'file-1' }] })) // findFileByName -> found
      .mockResolvedValueOnce(jsonResponse({})); // updateJsonFile (PATCH)
    global.fetch = fetchMock;

    const meta = {
      program: 'Pharm.D', semester: 4, subject: 'Bio', subjectCode: '', subjectFullName: '',
      subjectMode: 'browse', examName: 'Quiz 1', quizNumber: 1,
    } as unknown as Omit<ExamMeta, 'date' | 'dateManuallySet'>;
    const config = {
      roomSize: 'medium', perSlide: 5, secsPerQ: 40, numSets: 2, qsize: 30, optsize: 23,
      marksCorrect: 1, marksIncorrect: 0,
    } as AppConfig;

    await saveCloudSettings(creds, meta, config);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const patchCall = fetchMock.mock.calls[2];
    expect(patchCall[1].method).toBe('PATCH');
  });
});

describe('paper sync', () => {
  it('listCloudPapers returns [] when papers-index.json does not exist yet', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'folder-1' }] })) // findFolder
      .mockResolvedValueOnce(jsonResponse({ files: [] })); // findFileByName -> not found
    global.fetch = fetchMock;

    const result = await listCloudPapers(creds);
    expect(result).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('saveCloudPaper writes the paper file then creates the index (first paper)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'folder-1' }] })) // findFolder
      .mockResolvedValueOnce(jsonResponse({ id: 'paper-file-1' })) // createJsonFile for paper-<id>.json
      .mockResolvedValueOnce(jsonResponse({ files: [] })) // findFileByName papers-index.json -> not found
      .mockResolvedValueOnce(jsonResponse({ id: 'index-file-1' })); // createJsonFile for papers-index.json
    global.fetch = fetchMock;

    const meta = {
      program: 'Pharm.D', semester: 4, subject: 'Bio', subjectCode: '', subjectFullName: '',
      subjectMode: 'browse', examName: 'Quiz 1', quizNumber: 1, date: '', dateManuallySet: false,
    } as ExamMeta;
    const config = {
      roomSize: 'medium', perSlide: 5, secsPerQ: 40, numSets: 2, qsize: 30, optsize: 23,
      marksCorrect: 1, marksIncorrect: 0,
    } as AppConfig;
    const questions: Question[] = [];

    const saved = await saveCloudPaper(creds, { meta, config, rawInput: 'raw text', questions });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(saved.id).toBeTruthy();
    expect(saved.meta.examName).toBe('Quiz 1');
  });

  it('loadCloudPaper returns null when the paper file is missing', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: 'folder-1' }] })) // findFolder
      .mockResolvedValueOnce(jsonResponse({ files: [] })); // findFileByName -> not found
    global.fetch = fetchMock;

    const result = await loadCloudPaper(creds, 'nonexistent-id');
    expect(result).toBeNull();
  });
});