import { describe, it, expect } from 'vitest';
import { buildAnswerKeyCSV, buildQuestionPaperHTML } from './zip';
import type { Question, AppConfig, ExamMeta } from '../types';
import type { SetQuestion } from './shuffle';

describe('lib/zip', () => {
  const mockMeta: ExamMeta = { program: 'Pharm.D', semester: 4, subject: 'PHARM', subjectCode: '416', subjectFullName: 'Pharmacology', subjectMode: 'browse', examName: 'Mid Term', quizNumber: 1, date: '2026-09-06', dateManuallySet: false };
  const mockConfig: AppConfig = { roomSize: 'medium', perSlide: 5, secsPerQ: 40, numSets: 2, qsize: 30, optsize: 23, marksCorrect: 1, marksIncorrect: 0 };
  const mockMaster: Question[] = [{ number: 1, text: 'Q1', options: [{ letter: 'A', text: 'Opt A', origLetter: 'A' }], answer: 'A' }];
  const mockSets: SetQuestion[][] = [[{ displayNumber: 1, origNumber: 1, text: 'Q1', options: [{ letter: 'A', text: 'Opt A', origLetter: 'A' }], answer: 'A' }]];

  it('buildAnswerKeyCSV has ZipGrade-compatible header, no comment line', () => {
    const csv = buildAnswerKeyCSV(mockSets, mockMaster, mockConfig);
    expect(csv.split('\n')[0]).toBe('Key Letter,Question Number,Response/Mapping,Point Value,Tags');
  });

  it('buildAnswerKeyCSV uses the plain answer letter and Point Value, no [a&i] row when marksIncorrect is 0', () => {
    const csv = buildAnswerKeyCSV(mockSets, mockMaster, mockConfig);
    expect(csv).toContain('A,1,A,1');
    expect(csv).not.toContain('[a&i]');
  });

  it('buildAnswerKeyCSV adds an [a&i] row per question when marksIncorrect is non-zero', () => {
    const negConfig: AppConfig = { ...mockConfig, marksIncorrect: -0.25 };
    const csv = buildAnswerKeyCSV(mockSets, mockMaster, negConfig);
    expect(csv).toContain('A,1,A,1');
    expect(csv).toContain('A,1,[a&i],-0.25');
  });

  it('buildQuestionPaperHTML is self-contained', () => {
    const html = buildQuestionPaperHTML(mockSets[0], 'A', 'Test Header');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Question Paper — Set A');
    expect(html).toContain('page-break-inside: avoid');
  });
});