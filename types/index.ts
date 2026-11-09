// Core data model for MCQ Projector.
// Ported 1:1 from mcq-projector-nextjs-plan-v3.md Section 6 (Data Model),
// cross-checked against mcq-projector_v8.html state.meta (~L594-605).
// Extend, don't restructure, across later milestones — every screen reads
// these shapes.

export interface Option {
  letter: string;
  text: string;
  origLetter?: string;
}

export interface Question {
  number: number; // position in the original pasted bank
  text: string;
  options: Option[];
  answer: string | null;
}

export interface SetQuestion {
  displayNumber: number; // 1..N, what the student sees/writes
  origNumber: number;    // which bank question this actually is
  text: string;
  options: Option[];     // re-lettered A..H for this set
  answer: string | null; // re-lettered to match this set's options
}

// Course shape is owned by lib/courses.ts (source of truth ported in
// Milestone 2, including the digit-collision _codeDisplay rule) —
// re-exported here so every screen imports the SAME Course type from
// '@/types' instead of two incompatible ones.
export type { Course } from '@/lib/courses';

export interface ExamMeta {
  program: string;
  semester: number | '';
  subject: string;
  subjectCode: string;
  subjectFullName: string;
  subjectMode: 'browse' | 'search';
  examName: string;
  quizNumber: number | '';
  date: string;
  dateManuallySet: boolean;
}

export interface AppConfig {
  roomSize: 'small' | 'medium' | 'large';
  perSlide: number;
  secsPerQ: number;
  numSets: number;
  qsize: number;
  optsize: number;
  marksCorrect: number;
  marksIncorrect: number;
}

export type Screen = 'meta' | 'setup' | 'locked' | 'show' | 'end';

// Matches source's initial state.meta shape (mcq-projector_v8.html L594-605).
// `date` is intentionally '' here; the Meta screen fills it with
// nowLocalForInput() on first mount, matching source L1052-1053.
export const DEFAULT_META: ExamMeta = {
  program: 'Pharm.D',
  semester: 4,
  subject: '',
  subjectCode: '',
  subjectFullName: '',
  subjectMode: 'browse',
  examName: '',
  quizNumber: 1,
  date: '',
  dateManuallySet: false,
};

// Matches source's initial `state` config fields (mcq-projector_v8.html
// L575-581) and the Setup screen's HTML defaults (roomSize "medium" is the
// select's default `selected` option, L457). NOTE: perSlide here is 5, not
// the Setup input's static HTML value="4" (L464) — source immediately calls
// applyPerSlideDefaultForSets() once at load (L1480), which overwrites it
// to PERSLIDE_BY_SETS[numSets=2] = 5. That is the real effective default.
export const DEFAULT_CONFIG: AppConfig = {
  roomSize: 'medium',
  perSlide: 5,
  secsPerQ: 40,
  numSets: 2,
  qsize: 30,
  optsize: 23,
  marksCorrect: 1,
  marksIncorrect: 0,
};

// ============================================================
// Milestone 11: Cloud sync (GitHub PAT-based, teacher-optional)
// ============================================================
// A teacher who opts in pastes a fine-grained GitHub Personal Access Token
// scoped to ONE private repo (Contents: Read and write). No OAuth app, no
// server, no secrets held anywhere but the browser. Login is fully
// optional; without it the app behaves exactly as before (local-only).

export interface CloudCredentials {
  token: string;
  username: string;
  repo: string;
}

// Sticky settings synced to the cloud repo's settings.json. Deliberately
// independent of LastSettingsMeta in lib/storage.ts (which is local-only
// and predates this milestone) rather than importing it, so this file
// stays the single canonical source per the project's types convention.
export interface CloudSettingsPayload {
  savedAt: number;
  meta: Omit<ExamMeta, 'date' | 'dateManuallySet'>;
  config: AppConfig;
}

// One row per paper in the cloud repo's papers/index.json — kept small so
// listing papers is one cheap file read instead of N.
export interface PaperIndexEntry {
  id: string;
  title: string;
  savedAt: number;
  program: string;
  subject: string;
  examName: string;
  quizNumber: number | '';
}

// Full saved paper content, one file per paper at papers/<id>.json. Stores
// the parsed question bank (pre-shuffle) + the meta/config used to build
// it — NOT the per-set shuffles, which are regenerated at build time via
// lib/shuffle.ts exactly like a freshly pasted bank would be.
export interface SavedPaper {
  id: string;
  savedAt: number;
  meta: ExamMeta;
  config: AppConfig;
  rawInput: string;
  questions: Question[];
}


// ============================================================
// Milestone 12: Google Sign-In (replaces Milestone 11 GitHub PAT flow)
// ============================================================
// Client-side-only OAuth via Google Identity Services' token client
// (see lib/googleAuthConfig.ts, CloudAuthWidget.tsx). No backend, no
// secret — the access token is short-lived (~1hr) and is never persisted
// server-side.

export interface GoogleAuthResult {
  valid: boolean;
  email?: string;
  error?: string;
}

export interface GoogleCredentials {
  accessToken: string;
  expiresAt: number; // epoch ms
  email: string;
  // Milestone 11 GitHub PAT shape (still used by CloudAuthWidget):
  token?: string;
  username?: string;
  repo?: string;
}