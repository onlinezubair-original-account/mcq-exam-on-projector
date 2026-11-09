'use client';

import { useExamStore } from '@/store/examStore';
import { useFullscreen } from '@/hooks/useFullscreen';
import { usePrintBackup } from '@/hooks/usePrintBackup';
import styles from './SlideshowScreen.module.css';

export function Bottombar() {
  const { calibrating, adjustFont, adjustPerSlide, paused, togglePause, goPrevSlide, goNextSlide, endExamToSetup, config } = useExamStore();
  const { toggleFullscreen } = useFullscreen();
  const triggerPrint = usePrintBackup();


  return (
    <div className={styles.bottombar}>
      <button title="Previous screen  (←)" onClick={goPrevSlide}>⟵ Prev</button>
      {!calibrating && (
        <button title="Pause / Resume  (Space) — Space shortcut lands in Milestone 6b" onClick={togglePause}>
          {paused ? 'Resume' : 'Pause'}
        </button>
      )}
      <button title="Next screen  (→)" onClick={goNextSlide}>Next ⟶</button>
      <button onClick={toggleFullscreen} title="Toggle full screen (F)">Full screen</button>
      <button title="Zoom out  (-)" onClick={() => adjustFont(-2)}>A-</button>
      <button title="Zoom in  (+ or =)" onClick={() => adjustFont(2)}>A+</button>
      <span className={styles.perSlideWrap}>
        <button title="Fewer questions per screen, min 2  ([)" onClick={() => adjustPerSlide(-1)}>Q−</button>
        <span className={styles.perSlideDisplay} title="Questions currently shown per screen">
          {config.perSlide}/screen
        </span>
        <button title="More questions per screen, max 5  (])" onClick={() => adjustPerSlide(1)}>Q+</button>
      </span>
      <button onClick={triggerPrint} title="Emergency paper backup (P)">Print backup</button>
      <button onClick={endExamToSetup} title="End exam and return to setup (Esc)">Back to setup</button>
      <span className={styles.hint}>
        Space=pause · ←/→=navigate · +/-=zoom · [ ]=Qs/screen · F=fullscreen · P=print backup · Esc=end
      </span>
    </div>
  );
}