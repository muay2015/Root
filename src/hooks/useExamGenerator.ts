import { useEffect, useState } from 'react';
import type { ExamQuestion } from '../components/exam/types';
import type { BuilderMode, DetailedGrade, DifficultyLevel, SchoolLevel } from '../lib/examTypes';
import {
  buildQuestions,
  inferUploadMode,
  makeExamTitle,
  mergeExamRecords,
} from '../lib/examUtils';
import {
  hasPlaceholderChoices,
  normalizeGeneratedQuestions,
  type GeneratedQuestionMode,
} from '../lib/examGeneration';
import {
  SUBJECT_CONFIG,
  getSubjectSelectionDefaults,
  getSubjectSelectionLabel,
  type SelectionFormat,
  type SubjectKey,
  usesNoSelector,
} from '../lib/question/subjectConfig';
import {
  saveExamDraft,
  storeLocalExamList,
  storeLocalLastExam,
  getAnonymousUsageDate,
  setAnonymousUsageDate,
  type PersistedExamRecord,
} from '../lib/rootPersistence';
import { examService } from '../services/examService';

function buildFallbackMaterialText(_params: {
  subject: SubjectKey;
  mode: BuilderMode;
  topic: string;
}) {
  // 자료가 없을 때는 빈 문자열을 반환한다.
  // 지문 자체 생성 지시는 서버 프롬프트 빌더(buildSourceMaterialBlock)가 담당한다.
  // 이전에 여기서 메타 설명/지시문을 생성하면 AI가 그대로 stem에 복사하는 문제가 있었다.
  return '';
}

export function useExamGenerator(
  sessionUserId: string | null,
  isAnonymous: boolean,
  savedExams: PersistedExamRecord[],
  onSyncExams: (next: PersistedExamRecord[]) => void,
) {
  const defaultSubject: SubjectKey = 'middle_english';
  const defaultSelection = getSubjectSelectionDefaults(defaultSubject);

  const [mode, setMode] = useState<BuilderMode>('school');
  const [subject, setSubject] = useState<SubjectKey>(defaultSubject);
  const [questionType, setQuestionType] = useState(defaultSelection.questionType);
  const [format, setFormat] = useState<SelectionFormat>(defaultSelection.format);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('hard');
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>('high');
  const [detailedGrade, setDetailedGrade] = useState<DetailedGrade>('1학년' as DetailedGrade);
  const [count, setCount] = useState(5);
  const [generationTopic, setGenerationTopic] = useState('');
  const [materialText, setMaterialText] = useState('');
  const [ocrPages, setOcrPages] = useState<{ id: string; text: string }[]>([]);
  const [parsedFiles, setParsedFiles] = useState<string[]>([]);
  const [questionFiles, setQuestionFiles] = useState<string[]>([]);
  const [answerFiles, setAnswerFiles] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ mimeType: string; data: string }[]>([]);

  const selectionLabel = getSubjectSelectionLabel(subject, questionType, format);
  const rec = SUBJECT_CONFIG[subject].uploadRecommendation;
  const hasMaterial = materialText.trim().length >= 20 || ocrPages.some((page) => page.text.trim().length > 20);
  const hasTopic = generationTopic.trim().length >= 2;

  const readyToGenerate =
    mode === 'csat' ? true : rec === 'REQUIRED' ? hasMaterial : hasTopic || hasMaterial;

  const handleSubjectSelect = (nextSubject: SubjectKey) => {
    const nextDefaults = getSubjectSelectionDefaults(nextSubject);
    setSubject(nextSubject);
    setQuestionType(nextDefaults.questionType);

    if (mode === 'csat') {
      setFormat('객관식');
      setSchoolLevel('high');
    } else {
      setFormat(nextDefaults.format);
    }

    setGenerationError(null);
  };

  useEffect(() => {
    if (mode === 'csat' && schoolLevel !== 'high') {
      setSchoolLevel('high');
    }

    const availableSubjects = (Object.keys(SUBJECT_CONFIG) as SubjectKey[]).filter((key) => {
      const config = SUBJECT_CONFIG[key];
      if (!config) return false;

      if (mode === 'csat') {
        return config.supportedLevels.includes('high');
      }

      return config.supportedLevels.includes(schoolLevel) && config.supportedGrades.includes(detailedGrade);
    });

    if (availableSubjects.length > 0 && !availableSubjects.includes(subject)) {
      // 현재 과목과 카테고리가 같은 과목이 있으면 우선 선택 (예: 중등 영어 -> 고등 영어)
      const currentCategory = SUBJECT_CONFIG[subject]?.category;
      const matchingSubject = availableSubjects.find(s => SUBJECT_CONFIG[s]?.category === currentCategory);
      
      if (matchingSubject) {
        handleSubjectSelect(matchingSubject);
      } else {
        handleSubjectSelect(availableSubjects[0]);
      }
    }
  }, [mode, schoolLevel, detailedGrade, subject]);

  // 익명 사용자는 문항 수를 항상 5개로 고정
  useEffect(() => {
    if (isAnonymous && count !== 5) {
      setCount(5);
    }
  }, [isAnonymous, count]);

  const checkAnonymousLimit = (): boolean => {
    if (!isAnonymous) return false;
    const today = new Date().toISOString().split('T')[0];
    const lastDate = getAnonymousUsageDate();
    return lastDate === today;
  };

  const reset = () => {
    const nextDefaults = getSubjectSelectionDefaults(defaultSubject);
    setMode('school');
    setSubject(defaultSubject);
    setQuestionType(nextDefaults.questionType);
    setFormat(nextDefaults.format);
    setDifficulty('hard');
    setSchoolLevel('high');
    setDetailedGrade('1학년' as DetailedGrade);
    setCount(5);
    setGenerationTopic('');
    setMaterialText('');
    setOcrPages([]);
    setParsedFiles([]);
    setQuestionFiles([]);
    setAnswerFiles([]);
    setIsGenerating(false);
    setGenerationError(null);
    setImageData([]);
  };

  const finalizeGeneration = async (
    title: string,
    sub: SubjectKey,
    qs: ExamQuestion[],
    qMode: GeneratedQuestionMode,
  ) => {
    let finalRecord: PersistedExamRecord;

    const createLocalRecord = (): PersistedExamRecord => ({
      id: `local-${Date.now()}`,
      title,
      subject: sub,
      builder_mode: mode,
      question_type: qMode,
      difficulty,
      exam_format: schoolLevel,
      question_count: count,
      source_text: materialText,
      question_files: questionFiles,
      answer_files: answerFiles,
      questions: qs as any,
      responses: {},
      score: null,
      correct_count: null,
      wrong_count: null,
      submitted_at: null,
      created_at: new Date().toISOString(),
      isSynced: false,
    });

    if (sessionUserId) {
      const saved = await saveExamDraft(sessionUserId, {
        title,
        subject: sub,
        builderMode: mode,
        questionType: qMode,
        difficulty,
        examFormat: schoolLevel,
        questionCount: count,
        sourceText: materialText,
        questionFiles,
        answerFiles,
        questions: qs as any,
      });

      finalRecord = saved.data ? ({ ...saved.data, isSynced: true } as PersistedExamRecord) : createLocalRecord();
    } else {
      finalRecord = createLocalRecord();
    }

    const nextSavedExams = mergeExamRecords([finalRecord, ...savedExams]);
    onSyncExams(nextSavedExams);
    storeLocalExamList(nextSavedExams);
    storeLocalLastExam(finalRecord);

    setGenerationTopic('');
    setMaterialText('');
    setOcrPages([]);
    setParsedFiles([]);
    setQuestionFiles([]);
    setAnswerFiles([]);
    setImageData([]);

    return finalRecord;
  };

  const generateExam = async () => {
    if (checkAnonymousLimit()) {
      const msg = '오늘의 무료 체험을 모두 사용하셨습니다. 로그인을 통해 더 많은 문제를 이용해 주세요.';
      setGenerationError(msg);
      return { success: false, error: msg, isLimitReached: true };
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const uploadMode = inferUploadMode(subject, questionType, format);
      const nextTitle = makeExamTitle(mode, subject, schoolLevel, difficulty, count, generationTopic, selectionLabel);

      const combinedOcrText = ocrPages.map((page) => page.text).join('\n\n');
      const finalMaterialText =
        materialText.trim().length < 20 && combinedOcrText.trim().length < 20
          ? buildFallbackMaterialText({
              subject,
              mode,
              topic: generationTopic,
            })
          : `${materialText}\n\n${combinedOcrText}`.trim();

      const result = await examService.generateAIExam({
        materialText: finalMaterialText,
        subject,
        questionType: usesNoSelector(subject) ? undefined : questionType,
        format: mode === 'csat' ? '객관식' : usesNoSelector(subject) ? undefined : format,
        difficulty,
        schoolLevel,
        detailedGrade,
        count,
        title: nextTitle,
        topic: generationTopic.trim() || selectionLabel || SUBJECT_CONFIG[subject].label,
        builderMode: mode,
        images: imageData,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      const data = result.data;
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('생성된 문항이 없습니다.');
      }

      let nextQuestions = normalizeGeneratedQuestions('multiple', data.questions) as ExamQuestion[];
      if (hasPlaceholderChoices(nextQuestions)) {
        nextQuestions = buildQuestions(subject, uploadMode, count);
      }

      let resolvedTitle = generationTopic.trim() || data.title || nextTitle;
      
      // 제목에 과목 태그가 없는 경우 강제로 추가 (보관함 분류 정확도 향상)
      const subjectLabel = SUBJECT_CONFIG[subject]?.label;
      if (subjectLabel && !resolvedTitle.includes(`[${subjectLabel}]`)) {
        // 이미 제목에 과목명이 포함되어 있다면 해당 텍스트를 제거하여 [태그]와의 중복 방지
        const cleanedTitle = resolvedTitle.replace(subjectLabel, '').trim();
        resolvedTitle = `[${subjectLabel}] ${cleanedTitle}`.replace(/\s+/g, ' ').trim();
      }

      const newRecord = await finalizeGeneration(resolvedTitle, subject, nextQuestions, 'multiple');

      // 익명 사용자일 경우 사용 일자 기록
      if (isAnonymous) {
        setAnonymousUsageDate(new Date().toISOString().split('T')[0]);
      }

      return { success: true, record: newRecord };
    } catch (error) {
      const msg = error instanceof Error ? error.message : '생성 중 오류 발생';
      setGenerationError(msg);
      return { success: false, error: msg };
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSimilarExam = async (baseTitle: string, wrongNotes: any[]) => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const contextText = wrongNotes
        .map(
          (note, index) =>
            `[오답 ${index + 1}]\n문제: ${note.stem}\n정답: ${note.answer}\n해설: ${note.explanation || '없음'}`,
        )
        .join('\n\n');

      const promptPrefix = `[유사 문항 생성 요청]\n기존 시험: ${baseTitle}\n\n사용자가 아래의 문제들을 틀렸습니다. 이 문제들의 핵심 개념과 난이도를 분석하여, 사용자가 취약점을 보완할 수 있도록 유사한 형태의 다른 객관식 문제를 생성해 주세요.\n\n${contextText}`;

      const result = await examService.generateAIExam({
        materialText: promptPrefix,
        subject,
        format: '객관식',
        difficulty,
        schoolLevel,
        detailedGrade,
        count: Math.min(Math.max(5, wrongNotes.length), 5),
        title: `${baseTitle} - 유사 보완 세트`,
        topic: `${baseTitle} 오답 기반 유사 학습`,
        builderMode: 'school',
      });

      if (result.error) {
        throw new Error(result.error);
      }

      const data = result.data;
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('유사 문항을 생성하지 못했습니다.');
      }

      const nextQuestions = normalizeGeneratedQuestions('multiple', data.questions) as ExamQuestion[];
      const resolvedTitle = `${baseTitle} - 유사 보완 세트`;
      const newRecord = await finalizeGeneration(resolvedTitle, subject, nextQuestions, 'multiple');
      return { success: true, record: newRecord };
    } catch (error) {
      const msg = error instanceof Error ? error.message : '유사 문항 생성 오류';
      setGenerationError(msg);
      return { success: false, error: msg };
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    mode,
    setMode,
    subject,
    handleSubjectSelect,
    questionType,
    setQuestionType,
    format,
    setFormat,
    difficulty,
    setDifficulty,
    schoolLevel,
    setSchoolLevel,
    count,
    setCount,
    generationTopic,
    setGenerationTopic,
    materialText,
    setMaterialText,
    parsedFiles,
    setParsedFiles,
    questionFiles,
    answerFiles,
    setQuestionFiles,
    setAnswerFiles,
    isGenerating,
    generationError,
    readyToGenerate,
    selectionLabel,
    generateExam,
    generateSimilarExam,
    imageData,
    setImageData,
    ocrPages,
    setOcrPages,
    detailedGrade,
    setDetailedGrade,
    isAnonymous,
    reset,
  };
}
