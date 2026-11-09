'use client';

import { useEffect, useState } from 'react';
import { useExamStore } from '@/store/examStore';
import { buildExportZip } from '@/lib/zip';
import styles from './LockedScreen.module.css';

// LockedScreen — Milestone 13 Step 4. Shown immediately after Setup's
// "Build slideshow ->" once generateAndLockSets() has frozen the real
// scrambled sets. Exports the answer-key CSV + per-set question papers
// (lib/zip.ts's buildExportZip, same export used by EndScreen) via an
// explicit button click -- NOT an automatic useEffect-triggered download.
// A prior version tried to auto-download from useEffect on mount, one
// render-tick removed from the teacher's actual click; browsers can
// silently block downloads that aren't triggered within the same
// user-gesture call stack, with no visible error. A direct onClick
// handler is a real user gesture and reliably downloads, matching the
// already-working pattern in SetupScreen.tsx's "Export AI prompt" button.
export function LockedScreen() {
  const lockedMasterQuestions = useExamStore((s) => s.lockedMasterQuestions);
  const lockedSets = useExamStore((s) => s.lockedSets);
  const config = useExamStore((s) => s.config);
  const meta = useExamStore((s) => s.meta);
  const setScreen = useExamStore((s) => s.setScreen);
  const regenerateSets = useExamStore((s) => s.regenerateSets);

  const [downloaded, setDownloaded] = useState(false);

  // A fresh shuffle (new lockedSets array reference, from Regenerate)
  // invalidates whatever was already downloaded -- require a fresh click.
  useEffect(() => {
    setDownloaded(false);
  }, [lockedSets]);

  function handleDownload() {
    const zipBytes = buildExportZip(lockedSets, lockedMasterQuestions, config, meta);
    const blob = new Blob([zipBytes as unknown as BlobPart], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcq-projector-export.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
  }

  function handleRegenerate() {
    regenerateSets();
  }

  function handleContinue() {
    setScreen('show');
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <h1 className={styles.title}>Sets locked — download your files</h1>
        <p className={styles.sub}>
          {config.numSets} scrambled set{config.numSets === 1 ? '' : 's'} built from{' '}
          {lockedMasterQuestions.length} question{lockedMasterQuestions.length === 1 ? '' : 's'}.
          Click below to download the answer-key CSV and per-set question papers as a single .zip
          — save them somewhere safe before you continue.
        </p>
        <p className={styles.help}>
          Continuing opens the calibration screen where you can adjust font size and layout before
          starting the timed exam. The sets you download here will not change unless you
          regenerate them first.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={handleDownload}>
            ⬇ {downloaded ? 'Download again (.zip)' : 'Download exam files (.zip)'}
          </button>
          <button type="button" className={styles.ghostBtn} onClick={handleRegenerate}>
            🔀 Regenerate sets
          </button>
          <button type="button" className={styles.primaryBtn} onClick={handleContinue}>
            Continue →
          </button>
        </div>
        {!downloaded && (
          <p className={styles.help} style={{ marginTop: 12, color: 'var(--danger)' }}>
            ⚠ Not downloaded yet — click "Download exam files" above before continuing.
          </p>
        )}
      </div>
    </div>
  );
}