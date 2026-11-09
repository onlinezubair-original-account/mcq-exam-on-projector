import { create } from 'zustand';
import type { ExamMeta, Screen, AppConfig, Question, CloudCredentials } from '@/types';
import { DEFAULT_META, DEFAULT_CONFIG } from '@/types';
import { buildSet, type SetQuestion } from '@/lib/shuffle';
import { buildDemoQuestions } from '@/lib/demoQuestions';
import { nowLocalForInput } from '@/lib/meta';
import { clearAutosave, saveAutosave, isRecoverableExam } from '@/store/persistence';
import type { AutosavePayload, AutosaveExamState } from '@/lib/storage';
import type { GoogleCredentials, CloudSettingsPayload, PaperIndexEntry, SavedPaper } from '@/types';
import { readCloudAuth, writeCloudAuth, clearCloudAuthStorage } from '@/lib/storage';
import {
  validateGoogleToken,
  checkDriveAccess,
  loadCloudSettings,
  saveCloudSettings,
  listCloudPapers,
  saveCloudPaper,
  loadCloudPaper,
} from '@/lib/googleDrive';

function isGoogleCredentials(creds: GoogleCredentials | CloudCredentials | null): creds is GoogleCredentials {
  return !!creds && 'accessToken' in creds && 'expiresAt' in creds && 'email' in creds;
}

interface ParseWarnings {
  skipped: string[];
  invalidAnswers: string[];
}

// Live per-slide/font clamps used ONLY on the Slideshow screen (calibration
// + real exam) — deliberately different range from the Setup screen's own
// perSlide <input min=1 max=10>. Source: PER_SLIDE_MIN/MAX (L1440-1441),
// adjustFont clamps (L1431-1432).
const PER_SLIDE_MIN = 2;
const PER_SLIDE_MAX = 5;
const QSIZE_MIN = 14;
const QSIZE_MAX = 60;
const OPTSIZE_MIN = 12;
const OPTSIZE_MAX = 48;

// Source: computeTotalDuration() (L1256-1265). Sums per-slide durations,
// accounting for the last slide's possibly-smaller question count.
function computeTotalDurationFor(
  masterQuestionsLength: number,
  slideCount: number,
  perSlide: number,
  secsPerQ: number
): number {
  let total = 0;
  let remaining = masterQuestionsLength;
  for (let s = 0; s < slideCount; s++) {
    const count = Math.min(perSlide, remaining);
    total += count * secsPerQ;
    remaining -= count;
  }
  return total;
}

// Duration (in seconds) of the slide at `index`, given the ACTUAL number of
// questions on that screen (the last screen may have fewer than perSlide).
// Source: the qCountThisSlide/slideDuration lines inside renderSlide()
// (L1866-1870).
function computeSlideDurationFor(
  index: number,
  masterQuestionsLength: number,
  perSlide: number,
  secsPerQ: number
): number {
  const start = index * perSlide;
  const end = Math.min(start + perSlide, masterQuestionsLength);
  return (end - start) * secsPerQ;
}

// Source: beep() (L1888-1900). Each call makes its own fresh AudioContext —
// deliberate, avoids a shared context silently failing under iOS/Safari
// autoplay-gesture restrictions. Wrapped in try/catch exactly like source;
// in test environments (jsdom, no AudioContext) this silently no-ops.
function beep(freq: number, dur: number): void {
  try {
    const AudioCtx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {
    // Intentionally silent — matches source's empty catch(e){}.
  }
}

interface ExamStoreState {
  screen: Screen;
  meta: ExamMeta;
  config: AppConfig;
  rawInput: string;
  pendingQuestions: Question[];
  parseWarnings: ParseWarnings;

  // ---- Slideshow / calibration (Milestone 5) ----
  masterQuestions: Question[];
  sets: SetQuestion[][];
  // ---- Set generation / lock (pre-exam) ----
  // Built once by generateAndLockSets() right after Setup's "Build
  // slideshow ->", from the real pasted question bank -- NOT rebuilt by
  // beginRealExam(), which only ever reads these two fields. This
  // guarantees the exam students actually see is byte-identical to the
  // answer-key CSV / question-paper HTML already downloaded at lock time.
  locked: boolean;
  lockedMasterQuestions: Question[];
  lockedSets: SetQuestion[][];
  calibrating: boolean;
  slideIndex: number;
  slideCount: number;

  // ---- Real exam timer (Milestone 6a) ----
  paused: boolean;
  slideDuration: number; // seconds allotted to the current slide
  timeLeft: number; // seconds remaining on the current slide
  totalElapsed: number; // seconds elapsed across the whole exam
  totalDuration: number; // seconds for the whole exam
  timerId: ReturnType<typeof setInterval> | null;

  // ---- Persistence / crash-recovery (Milestone 7) ----
  resumeData: AutosavePayload | null;

  // ---- Cloud sync (Milestone 11/12) ----
  // Supports both Milestone 11 (GitHub PAT) and Milestone 12 (Google OAuth) shapes
  cloudAuth: GoogleCredentials | CloudCredentials | null;
  cloudStatus: 'idle' | 'checking' | 'syncing' | 'error';
  cloudError: string | null;
  cloudPapers: PaperIndexEntry[];

  setScreen: (screen: Screen) => void;
  setMeta: (meta: ExamMeta) => void;
  setConfig: (config: AppConfig) => void;
  setRawInput: (raw: string) => void;
  setPendingQuestions: (questions: Question[], warnings: ParseWarnings) => void;

  // Builds the 12 demo questions + `numSets` shuffled columns and switches
  // into calibration mode. Source: startCalibration() (L1713-1730).
  // Re-callable: rebuilds fresh demo sets every time, matching source.
  startCalibration: () => void;
  // Source: beginRealExam() (L1732-1759). Swaps pendingQuestions into
  // masterQuestions, builds real sets, refreshes meta.date unless it was
  // manually set, computes totalDuration, and starts the timer.
  beginRealExam: () => void;
  // Builds `config.numSets` real shuffled sets from the parsed question
  // bank and freezes them into lockedMasterQuestions/lockedSets. Called
  // once, right after Setup's "Build slideshow ->" -- NOT at "Start Exam".
  // Re-callable (see regenerateSets) -- each call overwrites both fields
  // with a fresh shuffle.
  generateAndLockSets: () => void;
  // Confirm-gated re-shuffle: warns that previously downloaded files are
  // now invalid, then calls generateAndLockSets() again. The Locked screen
  // re-triggers its auto-download effect off the new lockedSets reference.
  regenerateSets: () => void;
  // ±2px, clamped 14-60 (questions) / 12-48 (options). Source: adjustFont()
  // (L1430-1437).
  adjustFont: (delta: number) => void;
  // Clamped 2-5, preserves the approximate on-screen starting question.
  // No-op before anything has been built. During a real exam it also
  // recomputes totalDuration and the current slide's timeLeft, matching
  // source's adjustPerSlide() (L1448-1463).
  adjustPerSlide: (delta: number) => void;
  // Source: goNextSlide()/goPrevSlide() (L1926-1943). During a real exam,
  // advancing past the last slide stops the timer and moves to the end
  // screen (source: showEndScreen(), L1931-1934, L2010-2016 — the full
  // answer-key end screen itself is a later milestone, so this only routes
  // screen -> 'end' for now).
  goNextSlide: () => void;
  goPrevSlide: () => void;
  // Source: tick() (L1902-1915). One second of the countdown. No-ops while
  // paused. Warning beep at timeLeft===10, transition beep + auto-advance
  // at timeLeft<=0.
  tick: () => void;
  // Source: startTimer()/stopTimer() (L1917-1924).
  startTimer: () => void;
  stopTimer: () => void;
  // Source: the pauseBtn click handler (L1956-1960).
  togglePause: () => void;
  // Source: endExamToSetup() (L1971-1977). Confirms with the teacher,
  // stops the timer, and routes back to setup. clearAutosave() is a
  // no-op for now -- Milestone 7 adds real persistence to clear.
  endExamToSetup: () => void;
  // Milestone 7: exposes the crash-recovery banner's data + actions.
  setResumeData: (data: AutosavePayload | null) => void;
  restoreAutosave: () => void;
  discardAutosave: () => void;

  // ---- Cloud sync actions (Milestone 11) ----
  // Hydrates cloudAuth from localStorage on app mount. Does not
  // re-validate the token against GitHub -- a stale/revoked token
  // surfaces as an error on the next actual cloud action instead of
  // blocking app startup.
  initCloudAuth: () => void;
  // Validates the pasted PAT, checks write access to `repo` (defaults to
  // DEFAULT_CLOUD_REPO), and on success caches credentials + pulls cloud
  // settings and the paper list. Never throws -- failures surface via
  // cloudStatus/cloudError.
  loginToCloud: (accessToken: string, expiresInSeconds: number) => Promise<void>;
  // Clears cached credentials + in-memory cloud state. Never touches
  // local autosave/last-settings -- logging out never loses local work.
  logoutFromCloud: () => void;
  // Pushes current meta/config as this teacher's cloud-side sticky
  // defaults. No-ops if not logged in.
  syncSettingsToCloud: () => Promise<void>;
  // Pulls cloud settings (if any) and merges into meta/config, resetting
  // `date` to now and clearing dateManuallySet -- same rule as
  // loadLastSettings(). No-ops if not logged in.
  loadSettingsFromCloud: () => Promise<void>;
  // Saves pendingQuestions + current meta/config as a new cloud paper,
  // then refreshes cloudPapers. No-ops if not logged in.
  savePaperToCloud: () => Promise<void>;
  // Refreshes cloudPapers from the cloud repo's index. No-ops if not
  // logged in.
  refreshCloudPapers: () => Promise<void>;
  // Loads one saved paper by id and applies it exactly like a freshly
  // pasted + parsed bank (rawInput, pendingQuestions, meta, config),
  // routing to 'setup'. No-ops if not logged in.
  loadPaperFromCloud: (id: string) => Promise<void>;
}

export const useExamStore = create<ExamStoreState>((set, get) => ({
  screen: 'meta',
  meta: { ...DEFAULT_META },
  config: { ...DEFAULT_CONFIG },
  rawInput: '',
  pendingQuestions: [],
  parseWarnings: { skipped: [], invalidAnswers: [] },

  masterQuestions: [],
  sets: [],
  locked: false,
  lockedMasterQuestions: [],
  lockedSets: [],
  calibrating: false,
  slideIndex: 0,
  slideCount: 0,

  paused: false,
  slideDuration: 0,
  timeLeft: 0,
  totalElapsed: 0,
  totalDuration: 0,
  timerId: null,
  resumeData: null,

  cloudAuth: null,
  cloudStatus: 'idle',
  cloudError: null,
  cloudPapers: [],

  setScreen: (screen) => set({ screen }),
  setMeta: (meta) => set({ meta }),
  setConfig: (config) => set({ config }),
  setRawInput: (rawInput) => set({ rawInput }),
  setPendingQuestions: (pendingQuestions, parseWarnings) => set({ pendingQuestions, parseWarnings }),

  startCalibration: () => {
    const { config } = get();
    const demo = buildDemoQuestions();
    const sets: SetQuestion[][] = [];
    for (let s = 0; s < config.numSets; s++) sets.push(buildSet(demo));
    set({
      calibrating: true,
      masterQuestions: demo,
      sets,
      slideCount: Math.ceil(demo.length / config.perSlide),
      slideIndex: 0,
    });
  },

  generateAndLockSets: () => {
    const { config, pendingQuestions } = get();
    const masterQuestions = pendingQuestions;
    const sets: SetQuestion[][] = [];
    for (let s = 0; s < config.numSets; s++) sets.push(buildSet(masterQuestions));
    set({ lockedMasterQuestions: masterQuestions, lockedSets: sets, locked: true });
  },

  regenerateSets: () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'This will generate a brand-new shuffle and invalidate the answer key / question papers you already downloaded. You will need to re-download them. Continue?'
      )
    ) {
      return;
    }
    get().generateAndLockSets();
  },

  beginRealExam: () => {
    const { meta, config, lockedMasterQuestions, lockedSets } = get();

    // Refresh the exam date/time to the moment the real exam actually
    // starts — unless the teacher manually overrode it (source L1741-1745).
    const newMeta = meta.dateManuallySet ? meta : { ...meta, date: nowLocalForInput() };

    // Deliberately does NOT rebuild sets — generateAndLockSets() already
    // froze the real shuffle right after Setup's "Build slideshow ->", and
    // it must stay byte-identical to the already-downloaded answer key /
    // question papers. Calibration mode overwrites the working
    // masterQuestions/sets fields with demo data in the meantime; this
    // restores the real, locked ones.
    const masterQuestions = lockedMasterQuestions;
    const sets = lockedSets;
    const slideCount = Math.ceil(masterQuestions.length / config.perSlide);
    const slideIndex = 0;
    const slideDuration = computeSlideDurationFor(slideIndex, masterQuestions.length, config.perSlide, config.secsPerQ);
    const totalDuration = computeTotalDurationFor(masterQuestions.length, slideCount, config.perSlide, config.secsPerQ);

    set({
      calibrating: false,
      meta: newMeta,
      masterQuestions,
      sets,
      slideCount,
      slideIndex,
      slideDuration,
      timeLeft: slideDuration,
      totalElapsed: 0,
      totalDuration,
      paused: false,
    });

    get().startTimer();
  },

  adjustFont: (delta) => {
    const { config } = get();
    const qsize = Math.min(QSIZE_MAX, Math.max(QSIZE_MIN, config.qsize + delta));
    const optsize = Math.min(OPTSIZE_MAX, Math.max(OPTSIZE_MIN, config.optsize + delta));
    set({ config: { ...config, qsize, optsize } });
    // Milestone 7: immediate autosave trigger — HANDOFF Section 11.
    saveAutosave();
  },

  adjustPerSlide: (delta) => {
    const { config, masterQuestions, slideIndex, calibrating } = get();
    if (masterQuestions.length === 0) return; // nothing built yet — source L1449
    const newPerSlide = Math.min(PER_SLIDE_MAX, Math.max(PER_SLIDE_MIN, config.perSlide + delta));
    if (newPerSlide === config.perSlide) return;
    // Keep showing (as closely as possible) the same starting question.
    const currentStart = slideIndex * config.perSlide;
    const slideCount = Math.ceil(masterQuestions.length / newPerSlide);
    const newSlideIndex = Math.min(slideCount - 1, Math.floor(currentStart / newPerSlide));

    if (calibrating) {
      set({
        config: { ...config, perSlide: newPerSlide },
        slideCount,
        slideIndex: newSlideIndex,
      });
      // Milestone 7: immediate autosave trigger — HANDOFF Section 11.
      saveAutosave();
      return;
    }

    // Mid-exam: also recompute totalDuration and the current slide's
    // timeLeft, matching source's adjustPerSlide() (L1458, and its call
    // into renderSlide() which resets timeLeft for the new slide).
    const slideDuration = computeSlideDurationFor(newSlideIndex, masterQuestions.length, newPerSlide, config.secsPerQ);
    const totalDuration = computeTotalDurationFor(masterQuestions.length, slideCount, newPerSlide, config.secsPerQ);
    set({
      config: { ...config, perSlide: newPerSlide },
      slideCount,
      slideIndex: newSlideIndex,
      slideDuration,
      timeLeft: slideDuration,
      totalDuration,
    });
    // Milestone 7: immediate autosave trigger — HANDOFF Section 11.
    saveAutosave();
  },

  goNextSlide: () => {
    const { slideIndex, slideCount, calibrating } = get();
    if (slideIndex < slideCount - 1) {
      const newIndex = slideIndex + 1;
      if (calibrating) {
        set({ slideIndex: newIndex });
        return;
      }
      const { config, masterQuestions } = get();
      const slideDuration = computeSlideDurationFor(newIndex, masterQuestions.length, config.perSlide, config.secsPerQ);
      set({ slideIndex: newIndex, slideDuration, timeLeft: slideDuration });
      return;
    }
    if (!calibrating) {
      // End of the real exam — source: showEndScreen() (L1931-1934,
      // L2010-2016). The full answer-key end screen is a later milestone;
      // for now this just stops the timer and routes to the 'end' screen.
      get().stopTimer();
      // Milestone 7: reaching the End screen clears the autosave entry —
      // HANDOFF Section 11.
      clearAutosave();
      set({ screen: 'end' });
    }
    // calibrating + already on last demo screen: stay put (source L1935).
  },

  goPrevSlide: () => {
    const { slideIndex, calibrating } = get();
    if (slideIndex <= 0) return;
    const newIndex = slideIndex - 1;
    if (calibrating) {
      set({ slideIndex: newIndex });
      return;
    }
    const { config, masterQuestions } = get();
    const slideDuration = computeSlideDurationFor(newIndex, masterQuestions.length, config.perSlide, config.secsPerQ);
    set({ slideIndex: newIndex, slideDuration, timeLeft: slideDuration });
  },

  tick: () => {
    const { paused, timeLeft, totalElapsed } = get();
    if (paused) return;
    const newTimeLeft = timeLeft - 1;
    const newTotalElapsed = totalElapsed + 1;
    if (newTimeLeft === 10) beep(440, 0.15);
    if (newTimeLeft <= 0) {
      beep(660, 0.25);
      set({ timeLeft: newTimeLeft, totalElapsed: newTotalElapsed });
      // Milestone 7: every timer tick is an immediate (non-debounced)
      // autosave trigger — HANDOFF Section 11.
      saveAutosave();
      get().goNextSlide();
      return;
    }
    set({ timeLeft: newTimeLeft, totalElapsed: newTotalElapsed });
    saveAutosave();
  },

  startTimer: () => {
    get().stopTimer();
    const id = setInterval(() => get().tick(), 1000);
    set({ timerId: id });
  },

  stopTimer: () => {
    const { timerId } = get();
    if (timerId) clearInterval(timerId);
    set({ timerId: null });
  },

  togglePause: () => set((state) => ({ paused: !state.paused })),

  endExamToSetup: () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('This will end the current exam display and return to setup. Are you sure?')
    ) {
      return;
    }
    get().stopTimer();
    clearAutosave();
    set({ screen: 'setup' });
  },

  setResumeData: (resumeData) => set({ resumeData }),

  // Source: restoreAutosave(data) (~L1240-1250). Restores raw text +
  // config + meta always; if the saved session was a real in-progress exam
  // (not just a pasted bank), also jumps straight into a PAUSED Slideshow
  // screen with the timer started (tick() no-ops while paused, matching
  // "timer started but immediately paused").
  restoreAutosave: () => {
    const { resumeData } = get();
    if (!resumeData) return;

    if (isRecoverableExam(resumeData.exam)) {
      const exam: AutosaveExamState = resumeData.exam;
      set({
        rawInput: resumeData.raw,
        config: resumeData.config,
        meta: resumeData.meta,
        masterQuestions: exam.masterQuestions,
        sets: exam.sets,
        slideIndex: exam.slideIndex,
        slideCount: exam.slideCount,
        timeLeft: exam.timeLeft,
        slideDuration: exam.slideDuration,
        totalElapsed: exam.totalElapsed,
        totalDuration: exam.totalDuration,
        paused: true,
        calibrating: false,
        screen: 'show',
        resumeData: null,
      });
      get().startTimer();
      return;
    }

    set({
      rawInput: resumeData.raw,
      config: resumeData.config,
      meta: resumeData.meta,
      screen: 'setup',
      resumeData: null,
    });
  },

  // Source: the "Discard & start fresh" click (L1250), confirm-gated.
  // Last-used settings are left untouched by discard.
  discardAutosave: () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'This will permanently discard the recovered question bank / exam progress. Are you sure?'
      )
    ) {
      return;
    }
    clearAutosave();
    set({ resumeData: null });
  },

  initCloudAuth: () => {
    const creds = readCloudAuth();
    if (!creds) return;
    if (creds.expiresAt <= Date.now()) {
      // Google's implicit-flow token has no silent refresh -- an expired
      // cached token is useless, so drop it rather than surfacing a
      // confusing "signed in" state that fails on the first real request.
      clearCloudAuthStorage();
      return;
    }
    set({ cloudAuth: creds });
  },

  loginToCloud: async (accessToken, expiresInSeconds) => {
    set({ cloudStatus: 'checking', cloudError: null });
    const authResult = await validateGoogleToken(accessToken);
    if (!authResult.valid || !authResult.email) {
      set({ cloudStatus: 'error', cloudError: authResult.error ?? 'Login failed.' });
      return;
    }
    const driveResult = await checkDriveAccess(accessToken);
    if (!driveResult.valid) {
      set({ cloudStatus: 'error', cloudError: driveResult.error ?? 'Drive access check failed.' });
      return;
    }
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const creds: GoogleCredentials = { accessToken, expiresAt, email: authResult.email };
    writeCloudAuth(creds);
    set({ cloudAuth: creds, cloudStatus: 'idle', cloudError: null });

    try {
      await get().loadSettingsFromCloud();
      await get().refreshCloudPapers();
    } catch (err) {
      set({ cloudError: err instanceof Error ? err.message : 'Could not load cloud data.' });
    }
  },

  logoutFromCloud: () => {
    clearCloudAuthStorage();
    set({ cloudAuth: null, cloudStatus: 'idle', cloudError: null, cloudPapers: [] });
  },

  syncSettingsToCloud: async () => {
    const { cloudAuth, meta, config } = get();
    if (!cloudAuth || !isGoogleCredentials(cloudAuth)) return;
    set({ cloudStatus: 'syncing' });
    try {
      const stickyMeta: Omit<ExamMeta, 'date' | 'dateManuallySet'> = {
        program: meta.program,
        semester: meta.semester,
        subject: meta.subject,
        subjectCode: meta.subjectCode,
        subjectFullName: meta.subjectFullName,
        subjectMode: meta.subjectMode,
        examName: meta.examName,
        quizNumber: meta.quizNumber,
      };
      await saveCloudSettings(cloudAuth, stickyMeta, config);
      set({ cloudStatus: 'idle', cloudError: null });
    } catch (err) {
      set({ cloudStatus: 'error', cloudError: err instanceof Error ? err.message : 'Could not save settings to cloud.' });
    }
  },

  loadSettingsFromCloud: async () => {
    const { cloudAuth } = get();
    if (!cloudAuth || !isGoogleCredentials(cloudAuth)) return;
    set({ cloudStatus: 'syncing' });
    try {
      const payload: CloudSettingsPayload | null = await loadCloudSettings(cloudAuth);
      if (payload) {
        set((state) => ({
          meta: { ...state.meta, ...payload.meta, date: nowLocalForInput(), dateManuallySet: false },
          config: { ...state.config, ...payload.config },
        }));
      }
      set({ cloudStatus: 'idle', cloudError: null });
    } catch (err) {
      set({ cloudStatus: 'error', cloudError: err instanceof Error ? err.message : 'Could not load settings from cloud.' });
    }
  },

  savePaperToCloud: async () => {
    const { cloudAuth, meta, config, rawInput, pendingQuestions } = get();
    if (!cloudAuth || !isGoogleCredentials(cloudAuth)) return;
    set({ cloudStatus: 'syncing' });
    try {
      const saved: SavedPaper = await saveCloudPaper(cloudAuth, { meta, config, rawInput, questions: pendingQuestions });
      set((state) => ({
        cloudPapers: [
          {
            id: saved.id,
            savedAt: saved.savedAt,
            title: saved.meta.examName || 'Untitled paper',
            program: saved.meta.program,
            subject: saved.meta.subject,
            examName: saved.meta.examName,
            quizNumber: saved.meta.quizNumber,
          },
          ...state.cloudPapers,
        ],
        cloudStatus: 'idle',
        cloudError: null,
      }));
    } catch (err) {
      set({ cloudStatus: 'error', cloudError: err instanceof Error ? err.message : 'Could not save paper to cloud.' });
    }
  },

  refreshCloudPapers: async () => {
    const { cloudAuth } = get();
    if (!cloudAuth || !isGoogleCredentials(cloudAuth)) return;
    set({ cloudStatus: 'syncing' });
    try {
      const papers = await listCloudPapers(cloudAuth);
      set({ cloudPapers: papers, cloudStatus: 'idle', cloudError: null });
    } catch (err) {
      set({ cloudStatus: 'error', cloudError: err instanceof Error ? err.message : 'Could not list cloud papers.' });
    }
  },

  loadPaperFromCloud: async (id) => {
    const { cloudAuth } = get();
    if (!cloudAuth || !isGoogleCredentials(cloudAuth)) return;
    set({ cloudStatus: 'syncing' });
    try {
      const paper = await loadCloudPaper(cloudAuth, id);
      if (paper) {
        set({
          rawInput: paper.rawInput,
          pendingQuestions: paper.questions,
          parseWarnings: { skipped: [], invalidAnswers: [] },
          meta: paper.meta,
          config: paper.config,
          screen: 'setup',
        });
      }
      set({ cloudStatus: 'idle', cloudError: null });
    } catch (err) {
      set({ cloudStatus: 'error', cloudError: err instanceof Error ? err.message : 'Could not load paper from cloud.' });
    }
  },
}));
