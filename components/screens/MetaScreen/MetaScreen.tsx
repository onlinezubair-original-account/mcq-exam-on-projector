'use client';

import { useEffect, useMemo, useState } from 'react';
import { useExamStore } from '@/store/examStore';
import { commitLastSettings } from '@/store/persistence';
import { getCoursesFor, defaultCourseFor } from '@/lib/courses';
import { nowLocalForInput } from '@/lib/meta';
import type { Course, ExamMeta } from '@/types';
import { DEFAULT_META } from '@/types';
import { SubjectBrowse } from '@/components/subject-lookup/SubjectBrowse';
import { SubjectSearch } from '@/components/subject-lookup/SubjectSearch';
import subjStyles from '@/components/subject-lookup/SubjectLookup.module.css';
import styles from './MetaScreen.module.css';
import { CloudAuthWidget } from '@/components/CloudAuthWidget';

// Exam Metadata screen — source: #meta (mcq-projector_v8.html L337-420),
// wiring in L1032-1056. Behavior-identical port: same fields, same
// Next/Skip semantics (plan Section 2.1). "Next ->" commits to the store
// and (eventually, Milestone 7) Last-used settings; "Skip ->" resets to
// hard-coded defaults and deliberately never touches Last-used settings.
export function MetaScreen() {
  const setScreen = useExamStore((s) => s.setScreen);
  const setMetaInStore = useExamStore((s) => s.setMeta);
  const storedMeta = useExamStore((s) => s.meta);
  const syncSettingsToCloud = useExamStore((s) => s.syncSettingsToCloud);

  const [program, setProgram] = useState(storedMeta.program || 'Pharm.D');
  const [semester, setSemester] = useState<number | ''>(storedMeta.semester || 4);
  const [examName, setExamName] = useState(storedMeta.examName || '');
  const [quizNumber, setQuizNumber] = useState<number | ''>(storedMeta.quizNumber || 1);
  const [date, setDate] = useState(storedMeta.date || '');
  const [dateManuallySet, setDateManuallySet] = useState(storedMeta.dateManuallySet || false);
  const [subjectMode, setSubjectMode] = useState<'browse' | 'search'>(storedMeta.subjectMode || 'browse');
  const [freeTextSubject, setFreeTextSubject] = useState(storedMeta.subject || '');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // One-time "now" default, matching source's single load-time assignment
  // (L1052-1053) rather than a live-updating clock.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!date) setDate(nowLocalForInput());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const semesterNum = semester === '' ? NaN : Number(semester);
  const courseList = useMemo(
    () => getCoursesFor(program, semesterNum),
    [program, semesterNum]
  );

  // Mirrors source refreshSubjectField(): keep the current course if it
  // still belongs to this semester, else fall back to the semester's
  // default course (L897-923).
  useEffect(() => {
    if (!courseList) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCourse(null);
      return;
    }
    setSelectedCourse((prev) => {
      if (prev && prev.semester === semesterNum) return prev;
      return defaultCourseFor(program, semesterNum);
    });
     
  }, [courseList, program, semesterNum]);

  const showQuizNumber = examName === 'Class Quiz';

  function captureMeta(): ExamMeta {
    const usingCourses = !!courseList;
    return {
      program,
      semester: semester === '' ? '' : Number(semester),
      subject: usingCourses && selectedCourse ? selectedCourse.shortName : freeTextSubject.trim(),
      subjectCode: usingCourses && selectedCourse ? selectedCourse.code : '',
      subjectFullName: usingCourses && selectedCourse ? selectedCourse.fullName : '',
      subjectMode,
      examName,
      quizNumber: examName === 'Class Quiz' ? (quizNumber === '' ? '' : Number(quizNumber)) : '',
      date,
      dateManuallySet,
    };
  }

  function handleNext() {
    const meta = captureMeta();
    setMetaInStore(meta);
    // Source L1039: saveLastSettings() fires only from "Next ->".
    commitLastSettings(meta);
    // Milestone 11: push the same sticky settings to the cloud repo, if
    // signed in. No-ops internally (via a cloudAuth check inside the
    // action) when signed out. Deliberately fire-and-forget, matching the
    // loadSettingsFromCloud()/refreshCloudPapers() pattern already used in
    // ExamApp.tsx's mount effect, so this click never blocks on network.
    void syncSettingsToCloud();
    setScreen('setup');
  }

  function handleSkip() {
    const now = nowLocalForInput();
    setProgram(DEFAULT_META.program);
    setSemester(DEFAULT_META.semester);
    setExamName(DEFAULT_META.examName);
    setQuizNumber(DEFAULT_META.quizNumber);
    setDate(now);
    setDateManuallySet(false);
    setSubjectMode(DEFAULT_META.subjectMode);
    setFreeTextSubject('');
    setSelectedCourse(defaultCourseFor(DEFAULT_META.program, Number(DEFAULT_META.semester)));
    setMetaInStore({ ...DEFAULT_META, date: now });
    // Deliberately NO commitLastSettings() call here — source Section 2.1:
    // "Skip ->" never writes Last-used settings.
    setScreen('setup');
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <CloudAuthWidget />
        <h1 className={styles.title}>Exam details</h1>
        <p className={styles.sub}>
          Optional — fill in whatever applies, or skip straight to pasting questions.
          Every field here can be left blank.
        </p>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="metaProgram">Program</label>
            <select
              id="metaProgram"
              className={styles.control}
              value={program}
              onChange={(e) => setProgram(e.target.value)}
            >
              <option value="Pharm.D">Pharm.D</option>
              <option value="FSc">FSc</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="metaSemester">Semester / Class / Year</label>
            <input
              id="metaSemester"
              className={styles.control}
              type="number"
              min={1}
              max={12}
              value={semester}
              onChange={(e) => setSemester(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor={courseList ? undefined : 'metaSubject'}>Subject</label>
            {!courseList ? (
              <>
                <input
                  id="metaSubject"
                  className={styles.control}
                  type="text"
                  list="metaSubjectList"
                  placeholder="e.g. Microbiology"
                  value={freeTextSubject}
                  onChange={(e) => setFreeTextSubject(e.target.value)}
                />
                <datalist id="metaSubjectList" />
                <div className={styles.help}>
                  No course list available yet for this Program/Semester — type the subject.
                </div>
              </>
            ) : (
              <div>
                <div className={subjStyles.subjToggle} role="tablist">
                  <button
                    type="button"
                    className={`${subjStyles.subjToggleBtn} ${subjectMode === 'browse' ? subjStyles.active : ''}`}
                    onClick={() => setSubjectMode('browse')}
                  >
                    Browse
                  </button>
                  <button
                    type="button"
                    className={`${subjStyles.subjToggleBtn} ${subjectMode === 'search' ? subjStyles.active : ''}`}
                    onClick={() => setSubjectMode('search')}
                  >
                    Search
                  </button>
                </div>
                {subjectMode === 'browse' ? (
                  <SubjectBrowse courses={courseList} selected={selectedCourse} onSelect={setSelectedCourse} />
                ) : (
                  <SubjectSearch courses={courseList} onSelect={setSelectedCourse} />
                )}
                <div className={styles.help}>{selectedCourse ? selectedCourse.fullName : ''}</div>
              </div>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="metaExamName">Exam name</label>
            <select
              id="metaExamName"
              className={styles.control}
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
            >
              <option value="">— none —</option>
              <option value="Class Quiz">Class Quiz</option>
              <option value="Mid Term">Mid Term</option>
              <option value="Final Term">Final Term</option>
            </select>
          </div>
        </div>

        <div className={styles.row}>
          <div className={`${styles.field} ${showQuizNumber ? '' : styles.hidden}`}>
            <label className={styles.label} htmlFor="metaQuizNum">Quiz number</label>
            <input
              id="metaQuizNum"
              className={styles.control}
              type="number"
              min={1}
              max={15}
              value={quizNumber}
              onChange={(e) => setQuizNumber(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="metaDate">Date</label>
            <input
              id="metaDate"
              className={styles.control}
              type="datetime-local"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setDateManuallySet(true);
              }}
            />
            <div className={styles.help}>
              Defaults to now, and re-syncs to the moment the real exam actually starts. Edit it to override.
            </div>
          </div>
        </div>

        <div className={styles.nav}>
          <button className={styles.primaryBtn} onClick={handleNext}>Next →</button>
          <button className={styles.ghostBtn} onClick={handleSkip}>Skip →</button>
        </div>
      </div>
    </div>
  );
}