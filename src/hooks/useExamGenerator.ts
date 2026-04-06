import { useState } from 'react';
import { getApiUrl, parseJsonResponse } from '../lib/api';
import {
  SUBJECT_CONFIG,
  getSubjectSelectionDefaults,
  getSubjectSelectionLabel,
  usesNoSelector,
  type SubjectKey,
  type SelectionFormat,
} from '../lib/question/subjectConfig';
import {
  buildQuestions,
  inferUploadMode,
  makeExamTitle,
} from '../lib/examUtils';
import {
  hasPlaceholderChoices,
  normalizeGeneratedQuestions,
  type GeneratedQuestionMode,
} from '../lib/examGeneration';
import {
  saveExamDraft,
  storeLocalExamList,
  storeLocalLastExam,
  type PersistedExamRecord,
} from '../lib/rootPersistence';
import { mergeExamRecords } from '../lib/examUtils';
import type { BuilderMode, DifficultyLevel, SchoolLevel } from '../lib/examTypes';
import type { ExamQuestion } from '../components/exam/types';

export function useExamGenerator(
  sessionUserId: string | null,
  savedExams: PersistedExamRecord[],
  onSyncExams: (next: PersistedExamRecord[]) => void
) {
  const defaultSubject: SubjectKey = 'english';
  const defaultSelection = getSubjectSelectionDefaults(defaultSubject);

  const [mode, setMode] = useState<BuilderMode>('upload');
  const [subject, setSubject] = useState<SubjectKey>(defaultSubject);
  const [questionType, setQuestionType] = useState(defaultSelection.questionType);
  const [format, setFormat] = useState<SelectionFormat>(defaultSelection.format);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('hard');
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>('high');
  const [count, setCount] = useState(12);
  const [generationTopic, setGenerationTopic] = useState('');
  const [materialText, setMaterialText] = useState('');
  const [questionFiles, setQuestionFiles] = useState<string[]>([]);
  const [answerFiles, setAnswerFiles] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const selectionLabel = getSubjectSelectionLabel(subject, questionType, format);
  const readyToGenerate = mode === 'upload'
    ? questionFiles.length > 0 && answerFiles.length > 0
    : generationTopic.trim().length >= 2 || materialText.trim().length >= 20;

  const handleSubjectSelect = (nextSubject: SubjectKey) => {
    const nextDefaults = getSubjectSelectionDefaults(nextSubject);
    setSubject(nextSubject);
    setQuestionType(nextDefaults.questionType);
    setFormat(nextDefaults.format);
    setGenerationError(null);
  };

  const generateExam = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const uploadMode = inferUploadMode(subject, questionType, format);
      let nextQuestions = buildQuestions(subject, uploadMode, count);
      let nextQuestionMode = uploadMode;
      const nextTitle = makeExamTitle(mode, subject, schoolLevel, difficulty, count, generationTopic, selectionLabel);
      let resolvedTitle = nextTitle;

      if (mode === 'ai') {
        const finalMaterialText = (materialText.trim().length < 20 && generationTopic.trim().length >= 2)
          ? `이 문제는 사용자가 입력한 단원명 '${generationTopic.trim()}'에 기초하여 생성되는 문제입니다.`
          : materialText;

        const response = await fetch(getApiUrl('/api/ai/generate-exam'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            materialText: finalMaterialText,
            subject,
            questionType: usesNoSelector(subject) ? undefined : questionType,
            format: usesNoSelector(subject) ? undefined : format,
            difficulty,
            schoolLevel,
            count,
            title: nextTitle,
            topic: generationTopic.trim() || selectionLabel || SUBJECT_CONFIG[subject].label,
          }),
        });

        const data = await parseJsonResponse<any>(response);
        if (!response.ok) throw new Error(data.error || 'AI 문제 생성 실패');

        if (Array.isArray(data.questions) && data.questions.length > 0) {
          nextQuestions = normalizeGeneratedQuestions('multiple', data.questions) as ExamQuestion[];
          nextQuestionMode = 'multiple';
          if (nextQuestions.some(q => !q.stem?.trim() || hasPlaceholderChoices(q.choices))) {
            throw new Error('불완전한 문항이 생성되었습니다.');
          }
        } else {
          throw new Error('생성된 문항이 없습니다.');
        }
        resolvedTitle = data.title || nextTitle;
      }

      const newRecord = await finalizeGeneration(resolvedTitle, subject, nextQuestions, nextQuestionMode);
      return { success: true, record: newRecord };
    } catch (error) {
      const msg = error instanceof Error ? error.message : '생성 중 오류 발생';
      setGenerationError(msg);
      return { success: false, error: msg };
    } finally {
      setIsGenerating(false);
    }
  };

  const finalizeGeneration = async (title: string, sub: SubjectKey, qs: ExamQuestion[], qMode: GeneratedQuestionMode) => {
    let finalRecord: PersistedExamRecord;

    const createLocalRecord = (): PersistedExamRecord => ({
      id: `local-${Date.now()}`, title, subject: sub, builder_mode: mode, question_type: qMode,
      difficulty, exam_format: schoolLevel, question_count: count, source_text: materialText,
      question_files: questionFiles, answer_files: answerFiles, questions: qs as any,
      responses: {}, score: null, correct_count: null, wrong_count: null, submitted_at: null,
      created_at: new Date().toISOString(),
      isSynced: false,
    });

    if (sessionUserId) {
      const saved = await saveExamDraft(sessionUserId, {
        title, subject: sub, builderMode: mode, questionType: qMode,
        difficulty, examFormat: schoolLevel, questionCount: count,
        sourceText: materialText, questionFiles, answerFiles, questions: qs as any,
      });

      if (saved.data) {
        finalRecord = { ...saved.data, isSynced: true, subject: (saved.data as any).subject || sub } as PersistedExamRecord;
      } else {
        console.error('서버 저장 실패. 로컬 환경으로 폴백합니다.', saved.error);
        finalRecord = createLocalRecord();
      }
    } else {
      finalRecord = createLocalRecord();
    }

    const nextSavedExams = mergeExamRecords([finalRecord, ...savedExams]);
    onSyncExams(nextSavedExams);
    storeLocalExamList(nextSavedExams);
    storeLocalLastExam(finalRecord);
    
    // 필드 초기화
    setGenerationTopic('');
    setMaterialText('');
    setQuestionFiles([]);
    setAnswerFiles([]);
    
    return finalRecord;
  };

  return {
    mode, setMode, subject, handleSubjectSelect, questionType, setQuestionType,
    format, setFormat, difficulty, setDifficulty, schoolLevel, setSchoolLevel,
    count, setCount, generationTopic, setGenerationTopic, materialText, setMaterialText,
    questionFiles, answerFiles, setQuestionFiles, setAnswerFiles,
    isGenerating, generationError, readyToGenerate, selectionLabel, generateExam,
  };
}
