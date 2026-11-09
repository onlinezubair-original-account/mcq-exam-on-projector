'use client';

import { useEffect, useRef, useState } from 'react';
import { useExamStore } from '@/store/examStore';
import { parseQuestions } from '@/lib/parser';
import { PERSLIDE_BY_SETS } from '@/lib/shuffle';
import { SAMPLE_QUESTION_TEXT } from '@/lib/demoQuestions';
import { buildAiPromptText } from '@/lib/aiPrompt';
import { ResumeBanner } from '@/components/ResumeBanner';
import { commitLastSettings, saveAutosave, scheduleAutosave } from '@/store/persistence';
import type { AppConfig } from '@/types';
import styles from './SetupScreen.module.css';

// Room presets are only ever read at "Build slideshow ->" time (source
// L1780-1782), NOT applied live on <select> change — deliberately not a
// live qsize/optsize update.
const ROOM_PRESETS: Record<AppConfig['roomSize'], { qsize: number; optsize: number }> = {
  small: { qsize: 24, optsize: 19 },
  medium: { qsize: 30, optsize: 23 },
  large: { qsize: 40, optsize: 30 },
};

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Setup screen — source: #setup (mcq-projector_v8.html L423-506), wiring at
// L1465-1611 and L1762-1804. Behavior note: numSets ALWAYS overwrites
// perSlide via PERSLIDE_BY_SETS on change (source has no "already
// overridden by teacher" tracking, despite plan Section 2.4's description —
// ground truth is the source, per project convention).
export function SetupScreen() {
  const setScreen = useExamStore((s) => s.setScreen);
  const storedConfig = useExamStore((s) => s.config);
  const storedRawInput = useExamStore((s) => s.rawInput);
  const setConfigInStore = useExamStore((s) => s.setConfig);
  const setRawInputInStore = useExamStore((s) => s.setRawInput);
  const setPendingQuestionsInStore = useExamStore((s) => s.setPendingQuestions);

  const [rawInput, setRawInput] = useState(storedRawInput);
  const [roomSize, setRoomSize] = useState<AppConfig['roomSize']>(storedConfig.roomSize);
  const [perSlide, setPerSlide] = useState(storedConfig.perSlide);
  const [secsPerQ, setSecsPerQ] = useState(storedConfig.secsPerQ);
  const [numSets, setNumSets] = useState(storedConfig.numSets);
  const [marksCorrect, setMarksCorrect] = useState(storedConfig.marksCorrect);
  const [marksIncorrect, setMarksIncorrect] = useState(storedConfig.marksIncorrect);
  const [parseMsg, setParseMsg] = useState<{ text: string; kind: 'ok' | 'err' | '' }>({ text: '', kind: '' });

  // Milestone 7: debounced autosave trigger on rawInput + every Setup
  // config field change (HANDOFF Section 11). Skips the very first run so
  // mounting this screen doesn't immediately schedule a redundant write.
  const isFirstAutosaveRun = useRef(true);
  useEffect(() => {
    if (isFirstAutosaveRun.current) {
      isFirstAutosaveRun.current = false;
      return;
    }
    persistFieldsToStore(rawInput);
    scheduleAutosave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawInput, roomSize, perSlide, secsPerQ, numSets, marksCorrect, marksIncorrect]);

  function handleNumSetsChange(value: number) {
    setNumSets(value);
    // Source L1475-1480: unconditional overwrite, every time, including no
    // check for a prior manual edit.
    setPerSlide(PERSLIDE_BY_SETS[value] ?? 2);
  }

  function persistFieldsToStore(nextRawInput: string) {
    setRawInputInStore(nextRawInput);
    setConfigInStore({
      roomSize, perSlide, secsPerQ, numSets, marksCorrect, marksIncorrect,
      qsize: storedConfig.qsize, optsize: storedConfig.optsize,
    });
  }

  function handleLoadSample() {
    setRawInput(SAMPLE_QUESTION_TEXT);
  }

  function handleExportAiPrompt() {
    downloadTextFile('mcq-format-ai-prompt.txt', buildAiPromptText());
  }

  function handleBuild() {
    const parsed = parseQuestions(rawInput);
    if (parsed.questions.length === 0) {
      setParseMsg({
        kind: 'err',
        text: 'No valid questions found. Check the format (each question needs at least 2 lettered options).',
      });
      return;
    }

    const clampedPerSlide = Math.max(1, perSlide || 4);
    const clampedSecsPerQ = Math.max(5, secsPerQ || 40);
    const preset = ROOM_PRESETS[roomSize];

    const finalConfig: AppConfig = {
      roomSize,
      perSlide: clampedPerSlide,
      secsPerQ: clampedSecsPerQ,
      numSets: numSets || 1,
      qsize: preset.qsize,
      optsize: preset.optsize,
      marksCorrect: Number.isNaN(marksCorrect) ? 1 : marksCorrect,
      marksIncorrect: Number.isNaN(marksIncorrect) ? 0 : marksIncorrect,
    };

    setConfigInStore(finalConfig);
    setRawInputInStore(rawInput);
    setPendingQuestionsInStore(parsed.questions, {
      skipped: parsed.skipped,
      invalidAnswers: parsed.invalidAnswers,
    });

    let text = `Loaded ${parsed.questions.length} questions, ${finalConfig.numSets} set(s) ready. Opening calibration screen…`;
    let hasWarning = false;
    if (parsed.skipped.length) {
      hasWarning = true;
      text += ` ⚠ Skipped ${parsed.skipped.length} block(s) with fewer than 2 options — ${parsed.skipped.slice(0, 3).join('; ')}${parsed.skipped.length > 3 ? '; …' : ''}`;
    }
    if (parsed.invalidAnswers.length) {
      hasWarning = true;
      text += ` ⚠ Answer marker didn't match any option (left blank in key) for: ${parsed.invalidAnswers.slice(0, 3).join('; ')}${parsed.invalidAnswers.length > 3 ? '; …' : ''}`;
    }
    setParseMsg({ kind: hasWarning ? 'err' : 'ok', text });

    // Milestone 7: Setup's "Build slideshow ->" is both an immediate
    // (non-debounced) autosave trigger and the second Last-used-settings
    // commit point, fired with the actual FINAL built config — HANDOFF
    // Section 11.
    saveAutosave();
    commitLastSettings(useExamStore.getState().meta, finalConfig);

    // Milestone 5 replaces the 'show' placeholder with the real
    // calibration screen; the store now holds everything it needs.
    setScreen('show');
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <span className={styles.backLink} onClick={() => setScreen('meta')}>
          ← Edit exam details
        </span>

        <ResumeBanner />

        <h1 className={styles.title}>MCQ Projector — Exam Display</h1>
        <p className={styles.sub}>
          Paste your question bank once, set a few options, then project full-screen. No printing needed.
        </p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="rawInput">1. Paste your questions</label>
          <textarea
            id="rawInput"
            className={`${styles.control} ${styles.textarea}`}
            placeholder="Paste questions here — one blank line between each question. See format below."
            value={rawInput}
            onChange={(e) => {
              setRawInput(e.target.value);
              persistFieldsToStore(e.target.value);
            }}
          />
          <div className={styles.help}>
            Format for each question (separate questions with a blank line):
            <br />
            <code>What is the capital of France?<br />A. Berlin<br />B. Madrid<br />C. Paris<br />D. Rome<br />*C</code>
            <br />
            The answer line is optional and can be written either as <code>*C</code> or <code>Answer: C</code> — include it only if you want an auto-generated answer key at the end.{' '}
            <span className={styles.sampleToggle} onClick={handleLoadSample}>
              Load a sample to see the format →
            </span>
          </div>
          <button type="button" className={styles.ghostBtn} onClick={handleExportAiPrompt}>
            📋 Export AI reformatting prompt (.txt)
          </button>
          <div className={styles.help} style={{ marginTop: 6 }}>
            Already have a finished exam paper written elsewhere (Word, a PDF you typed up, etc.)? Download this
            prompt, open an AI chat tool, paste the prompt in and also attach/upload your exam file — then paste
            the AI&apos;s reformatted output straight into the box above. No manual retyping needed.
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="roomSize">2. Room size</label>
            <select
              id="roomSize"
              className={styles.control}
              value={roomSize}
              onChange={(e) => setRoomSize(e.target.value as AppConfig['roomSize'])}
            >
              <option value="small">Small room (front rows close)</option>
              <option value="medium">Medium classroom</option>
              <option value="large">Large hall</option>
            </select>
            <div className={styles.help}>Adjusts default text size and suggested questions per screen.</div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="perSlide">3. Questions per screen</label>
            <input
              id="perSlide"
              className={styles.control}
              type="number"
              min={1}
              max={10}
              value={perSlide}
              onChange={(e) => setPerSlide(Number(e.target.value))}
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="secsPerQ">4. Seconds per question</label>
            <input
              id="secsPerQ"
              className={styles.control}
              type="number"
              min={5}
              max={600}
              value={secsPerQ}
              onChange={(e) => setSecsPerQ(Number(e.target.value))}
            />
            <div className={styles.help}>Total time per screen = questions per screen × seconds per question.</div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="numSets">5. Number of scrambled sets</label>
            <select
              id="numSets"
              className={styles.control}
              value={numSets}
              onChange={(e) => handleNumSetsChange(Number(e.target.value))}
            >
              <option value={1}>1 (no scrambling)</option>
              <option value={2}>2 sets (A, B)</option>
              <option value={3}>3 sets (A–C)</option>
              <option value={4}>4 sets (A–D)</option>
              <option value={5}>5 sets (A–E)</option>
              <option value={6}>6 sets (A–F)</option>
              <option value={7}>7 sets (A–G)</option>
              <option value={8}>8 sets (A–H)</option>
            </select>
            <div className={styles.help}>
              Each set is labeled A, B, C... and gets its own random question order AND random option order — but
              every set is numbered 1, 2, 3... sequentially on screen, just like a normal test, so students always
              answer against a clean running number. Seat neighbors on different sets to discourage copying. An
              answer key mapping each position back to your original question bank is available at the end.
            </div>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="marksCorrect">6. Marks for correct answer</label>
            <input
              id="marksCorrect"
              className={styles.control}
              type="number"
              step={0.5}
              value={marksCorrect}
              onChange={(e) => setMarksCorrect(Number(e.target.value))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="marksIncorrect">7. Marks for incorrect answer</label>
            <input
              id="marksIncorrect"
              className={styles.control}
              type="number"
              step={0.5}
              value={marksIncorrect}
              onChange={(e) => setMarksIncorrect(Number(e.target.value))}
            />
            <div className={styles.help}>
              Use a negative number for negative marking (e.g. -0.25). These are exported into the answer-key CSV.
            </div>
          </div>
        </div>

        <button className={styles.primaryBtn} onClick={handleBuild}>Build slideshow →</button>
        <div className={styles.help} style={{ marginTop: 8 }}>
          Clicking this opens a <b>calibration screen</b> with sample questions first — adjust font size and layout,
          then start the real timed exam when ready.
        </div>
        {parseMsg.text && (
          <div className={`${styles.parseMsg} ${parseMsg.kind === 'err' ? styles.err : parseMsg.kind === 'ok' ? styles.ok : ''}`}>
            {parseMsg.text}
          </div>
        )}
      </div>
    </div>
  );
}