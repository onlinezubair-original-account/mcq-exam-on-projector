'use client';
import { useEffect } from 'react';
import { useExamStore } from '@/store/examStore';
import { loadLastSettings, checkAutosave } from '@/store/persistence';
import { ResumeBanner } from './ResumeBanner';
import { PrintArea } from './PrintArea';
import { EndScreen } from './screens/EndScreen/EndScreen';
import { MetaScreen } from './screens/MetaScreen/MetaScreen';
import { SetupScreen } from './screens/SetupScreen/SetupScreen';
import { LockedScreen } from './screens/LockedScreen/LockedScreen';
import { SlideshowScreen } from './screens/SlideshowScreen/SlideshowScreen';

export function ExamApp() {
  const screen = useExamStore((s) => s.screen);

  // Apply last-used settings, then check for a recoverable autosave
  // session. Order matters: last-used settings first, then checkAutosave()
  // has the final say if there is an in-progress/crash-recoverable session
  // -- same ordering as `loadLastSettings(); checkAutosave();` in
  // mcq-projector_v8.html (L2125-2126). Runs once on mount.
  useEffect(() => {
    loadLastSettings();
    checkAutosave();
    useExamStore.getState().initCloudAuth();
    if (useExamStore.getState().cloudAuth) {
      void useExamStore.getState().loadSettingsFromCloud();
      void useExamStore.getState().refreshCloudPapers();
    }
  }, []);

  let screenSwitch;
  switch (screen) {
    case 'meta':
      screenSwitch = <MetaScreen />;
      break;
    case 'setup':
      screenSwitch = (
        <>
          <SetupScreen />
          <ResumeBanner />
        </>
      );
      break;
    case 'locked':
      screenSwitch = <LockedScreen />;
      break;
    case 'show':
      screenSwitch = <SlideshowScreen />;
      break;
    case 'end':
      screenSwitch = <EndScreen />;
      break;
    default:
      screenSwitch = <div>Unknown screen</div>;
  }

  return (
    <>
      {screenSwitch}
      <PrintArea />
    </>
  );
}