// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useExamStore } from '@/store/examStore';
import {
  commitLastSettings,
  saveAutosave,
  loadLastSettings,
  checkAutosave,
} from '@/store/persistence';
import { AUTOSAVE_KEY, LAST_SETTINGS_KEY } from '@/lib/storage';
import { DEFAULT_META, DEFAULT_CONFIG } from '@/types';

const INITIAL_STATE = {
  screen: 'meta' as const,
  meta: { ...DEFAULT_META },
  config: { ...DEFAULT_CONFIG },
  rawInput: '',
  pendingQuestions: [],
  parseWarnings: { skipped: [], invalidAnswers: [] },
  masterQuestions: [],
  sets: [],
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
};

// Merge (not replace) so the store's action functions are preserved.
function resetAll() {
  window.localStorage.clear();
  useExamStore.setState(INITIAL_STATE);
}

describe('persistence — autosave calibration exclusion', () => {
  beforeEach(resetAll);

  it('never persists real exam fields while calibrating', () => {
    useExamStore.setState({
      calibrating: true,
      rawInput: 'some raw text',
      masterQuestions: [{ number: 1, text: 'Q', options: [], answer: null }],
      screen: 'show',
    });

    saveAutosave();

    const stored = JSON.parse(window.localStorage.getItem(AUTOSAVE_KEY)!);
    expect(stored.exam).toEqual({ inShow: false });
    expect(stored.raw).toBe('some raw text');
  });

  it('persists full exam state once a real (non-calibration) session is in show', () => {
    useExamStore.setState({
      calibrating: false,
      screen: 'show',
      masterQuestions: [{ number: 1, text: 'Q', options: [], answer: null }],
      sets: [[]],
      slideIndex: 1,
      slideCount: 3,
      timeLeft: 20,
      slideDuration: 40,
      totalElapsed: 60,
      totalDuration: 300,
      paused: false,
    });

    saveAutosave();

    const stored = JSON.parse(window.localStorage.getItem(AUTOSAVE_KEY)!);
    expect(stored.exam.inShow).toBe(true);
    expect(stored.exam.masterQuestions).toHaveLength(1);
    expect(stored.exam.slideIndex).toBe(1);
  });
});

describe('persistence — two-commit-point last-settings rule', () => {
  beforeEach(resetAll);

  it('writes last-used settings on commitLastSettings (Meta "Next ->")', () => {
    commitLastSettings({ ...DEFAULT_META, subject: 'Microbiology' });
    const stored = JSON.parse(window.localStorage.getItem(LAST_SETTINGS_KEY)!);
    expect(stored.meta.subject).toBe('Microbiology');
    expect(stored.meta).not.toHaveProperty('date');
    expect(stored.meta).not.toHaveProperty('dateManuallySet');
  });

  it('writes the final built config on the Setup "Build slideshow ->" commit point', () => {
    const finalConfig = { ...DEFAULT_CONFIG, numSets: 4, perSlide: 3 };
    commitLastSettings(DEFAULT_META, finalConfig);
    const stored = JSON.parse(window.localStorage.getItem(LAST_SETTINGS_KEY)!);
    expect(stored.config.numSets).toBe(4);
    expect(stored.config.perSlide).toBe(3);
  });

  it('does NOT write last-used settings from a bare field edit / autosave', () => {
    useExamStore.setState({ config: { ...DEFAULT_CONFIG, numSets: 5 } });
    saveAutosave();
    expect(window.localStorage.getItem(LAST_SETTINGS_KEY)).toBeNull();
  });
});

describe('persistence — autosave wins over last-settings on reload', () => {
  beforeEach(resetAll);

  it('checkAutosave overrides loadLastSettings and forces navigation to Setup', () => {
    commitLastSettings({ ...DEFAULT_META, subject: 'Anatomy' });

    useExamStore.setState({
      calibrating: false,
      screen: 'show',
      rawInput: 'crash recovery raw text',
      masterQuestions: [{ number: 1, text: 'Q', options: [], answer: null }],
      sets: [[]],
    });
    saveAutosave();

    // Simulate a fresh app load: reset the in-memory store but leave
    // localStorage intact, matching source's load order (L2123-2126).
    useExamStore.setState(INITIAL_STATE);

    loadLastSettings();
    expect(useExamStore.getState().meta.subject).toBe('Anatomy');
    expect(useExamStore.getState().screen).toBe('meta');

    checkAutosave();
    expect(useExamStore.getState().screen).toBe('setup');
    expect(useExamStore.getState().resumeData).not.toBeNull();
    expect(useExamStore.getState().resumeData?.raw).toBe('crash recovery raw text');
  });

  it('checkAutosave is a no-op when there is nothing recoverable', () => {
    useExamStore.setState({ screen: 'meta' });
    checkAutosave();
    expect(useExamStore.getState().screen).toBe('meta');
    expect(useExamStore.getState().resumeData).toBeNull();
  });
});

describe('persistence — clearing on end / discard', () => {
  beforeEach(resetAll);

  it('endExamToSetup() clears the autosave entry', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    useExamStore.setState({ screen: 'show', calibrating: false });
    saveAutosave();
    expect(window.localStorage.getItem(AUTOSAVE_KEY)).not.toBeNull();

    useExamStore.getState().endExamToSetup();

    expect(window.localStorage.getItem(AUTOSAVE_KEY)).toBeNull();
    vi.restoreAllMocks();
  });

  it('reaching the end screen via goNextSlide() clears the autosave entry', () => {
    useExamStore.setState({
      screen: 'show',
      calibrating: false,
      masterQuestions: [{ number: 1, text: 'Q', options: [], answer: null }],
      slideIndex: 0,
      slideCount: 1,
    });
    saveAutosave();
    expect(window.localStorage.getItem(AUTOSAVE_KEY)).not.toBeNull();

    useExamStore.getState().goNextSlide();

    expect(window.localStorage.getItem(AUTOSAVE_KEY)).toBeNull();
    expect(useExamStore.getState().screen).toBe('end');
  });

  it('discardAutosave() clears autosave but leaves last-used settings untouched', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    commitLastSettings({ ...DEFAULT_META, subject: 'Physiology' });
    useExamStore.setState({
      screen: 'show',
      resumeData: {
        savedAt: Date.now(),
        raw: 'x',
        config: { ...DEFAULT_CONFIG },
        meta: { ...DEFAULT_META },
        exam: { inShow: false },
      },
    });
    saveAutosave();

    useExamStore.getState().discardAutosave();

    expect(window.localStorage.getItem(AUTOSAVE_KEY)).toBeNull();
    expect(useExamStore.getState().resumeData).toBeNull();
    const lastSettings = JSON.parse(window.localStorage.getItem(LAST_SETTINGS_KEY)!);
    expect(lastSettings.meta.subject).toBe('Physiology');
    vi.restoreAllMocks();
  });
});