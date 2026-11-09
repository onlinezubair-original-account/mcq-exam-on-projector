import { zipSync, strToU8 } from 'fflate';
import type { Question, AppConfig, ExamMeta } from '../types';
import type { SetQuestion } from './shuffle';
import { buildMetaFileBase, buildMetaHeaderLine } from './meta';
import { getSetLabel } from './shuffle';

export function buildQuestionPaperHTML(
  setQuestions: SetQuestion[],
  setLetter: string,
  metaHeader: string
): string {
  const questionsHtml = setQuestions.map(q => `
    <div class="q">
      <div class="qline">${q.displayNumber}. ${q.text}</div>
      <div class="opts">
        ${q.options.map(opt => `<div>${opt.letter}. ${opt.text}</div>`).join('')}
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Question Paper — Set ${setLetter}</title>
<style>
  body { font-family: sans-serif; padding: 20px; color: #000; background: #fff; }
  .q { margin-bottom: 20px; page-break-inside: avoid; }
  .qline { font-weight: bold; margin-bottom: 8px; }
  .opts { margin-left: 20px; }
</style></head><body>
${metaHeader ? `<div style="margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px;">${metaHeader}</div>` : ''}
<h2>Question Paper — Set ${setLetter}</h2>
${questionsHtml}
</body></html>`;
}

// ZipGrade-compatible answer-key CSV. Format verified directly against
// ZipGrade's published "CSV Answer Key Import File Requirements" spec:
// 5 columns (Key, Question Number, Response/Mapping, Point Value, Tags),
// no leading comment/metadata line (ZipGrade's importer expects the
// header row's first field to literally start with "Key" -- a comment
// line above it is not part of their format and risks failing import).
// Negative/partial marking for a wrong-but-attempted response is NOT a
// column in ZipGrade's format -- it's expressed as an extra row per
// question using the literal response value "[a&i]" ("Attempted, but
// Incorrect"). That row is only emitted when marksIncorrect is non-zero,
// so the default (marksIncorrect: 0) produces output identical in shape
// to a plain single-point key.
export function buildAnswerKeyCSV(
  sets: SetQuestion[][],
  masterQuestions: Question[],
  config: AppConfig
): string {
  const header = "Key Letter,Question Number,Response/Mapping,Point Value,Tags";
  let csv = header + "\n";

  const maxQuestions = Math.max(...sets.map(s => s.length), 0);
  for (let i = 0; i < maxQuestions; i++) {
    const displayNumber = i + 1;
    sets.forEach((set, setIdx) => {
      const q = set[i];
      const letter = getSetLabel(setIdx);
      const answer = q?.answer ?? '';
      csv += `${letter},${displayNumber},${answer},${config.marksCorrect}\n`;
      if (config.marksIncorrect !== 0) {
        csv += `${letter},${displayNumber},[a&i],${config.marksIncorrect}\n`;
      }
    });
  }
  return csv;
}

export function buildExportZip(
  sets: SetQuestion[][],
  masterQuestions: Question[],
  config: AppConfig,
  meta: ExamMeta
): Uint8Array {
  const metaHeader = buildMetaHeaderLine(meta);
  const files: Record<string, Uint8Array> = {};

  sets.forEach((set, idx) => {
    const letter = getSetLabel(idx);
    const html = buildQuestionPaperHTML(set, letter, metaHeader);
    files[`QuestionPaper-Set${letter}.html`] = strToU8(html);
  });

  const csv = buildAnswerKeyCSV(sets, masterQuestions, config);
  files['AllAnswerKeys.csv'] = strToU8(csv);

  return zipSync(files);
}