import { useState, useEffect } from 'react';
import { examService } from '../services/examService';
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
import type { BuilderMode, DifficultyLevel, SchoolLevel, MathGrade } from '../lib/examTypes';
import type { ExamQuestion } from '../components/exam/types';

export function useExamGenerator(
  sessionUserId: string | null,
  savedExams: PersistedExamRecord[],
  onSyncExams: (next: PersistedExamRecord[]) => void
) {
  const defaultSubject: SubjectKey = 'middle_english';
  const defaultSelection = getSubjectSelectionDefaults(defaultSubject);

  const [mode, setMode] = useState<BuilderMode>('school');
  const [subject, setSubject] = useState<SubjectKey>(defaultSubject);
  const [questionType, setQuestionType] = useState(defaultSelection.questionType);
  const [format, setFormat] = useState<SelectionFormat>(defaultSelection.format);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('hard');
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>('high');
  const [mathGrade, setMathGrade] = useState<MathGrade>('1학년');
  const [count, setCount] = useState(12);
  const [generationTopic, setGenerationTopic] = useState('');
  const [materialText, setMaterialText] = useState(''); // 파일 파싱용 텍스트 (레거시/공통용)
  const [ocrPages, setOcrPages] = useState<{ id: string; text: string }[]>([]); // 이미지별 독립 페이지
  const [parsedFiles, setParsedFiles] = useState<string[]>([]);
  const [questionFiles, setQuestionFiles] = useState<string[]>([]);
  const [answerFiles, setAnswerFiles] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ mimeType: string; data: string }[]>([]);

  const selectionLabel = getSubjectSelectionLabel(subject, questionType, format);
  const readyToGenerate = mode === 'csat'
    ? true // 수능 모드에서는 주제 입력 없이도 전 범위 생성 가능
    : (generationTopic.trim().length >= 2 || materialText.trim().length >= 20);

  const handleSubjectSelect = (nextSubject: SubjectKey) => {
    const nextDefaults = getSubjectSelectionDefaults(nextSubject);
    setSubject(nextSubject);
    setQuestionType(nextDefaults.questionType);
    setFormat(nextDefaults.format);
    setGenerationError(null);
  };

  // 모드나 학년 변경 시 선택된 과목의 유효성 체크 및 자동 전환
  useEffect(() => {
    const availableSubjects = (Object.keys(SUBJECT_CONFIG) as SubjectKey[])
      .filter((key) => {
        const config = SUBJECT_CONFIG[key];
        if (mode === 'csat') {
          // 수능 모드에서는 고등 과정 지원 과목 또는 세부 과목(_ 포함) 위주로 필터링
          return config.supportedLevels.includes('high') || key.includes('_');
        }
        // 내신 모드에서는 현재 선택된 학교급(중등/고등)을 지원하는 과목만 필터링
        return config.supportedLevels.includes(schoolLevel);
      });

    if (!availableSubjects.includes(subject)) {
      const firstValid = availableSubjects[0] || 'middle_english';
      handleSubjectSelect(firstValid);
    }
  }, [mode, schoolLevel, subject]);

  const generateExam = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const uploadMode = inferUploadMode(subject, questionType, format);
      let nextQuestions = buildQuestions(subject, uploadMode, count);
      let nextQuestionMode = uploadMode;
      const nextTitle = makeExamTitle(mode, subject, schoolLevel, difficulty, count, generationTopic, selectionLabel);
      let resolvedTitle = nextTitle;

      if (mode === 'school' || mode === 'csat') {
        // 모든 OCR 페이지 텍스트 합치기
        const combinedOcrText = ocrPages.map(p => p.text).join('\n\n');
        
        const finalMaterialText = (materialText.trim().length < 20 && combinedOcrText.trim().length < 20 && generationTopic.trim().length >= 2)
          ? `이 문제는 사용자가 입력한 단원명 '${generationTopic.trim()}'에 기초하여 생성되는 문제입니다.`
          : `${materialText}\n\n${combinedOcrText}`.trim();

        const result = await examService.generateAIExam({
          materialText: finalMaterialText,
          subject,
          questionType: usesNoSelector(subject) ? undefined : questionType,
          format: usesNoSelector(subject) ? undefined : format,
          difficulty,
          schoolLevel,
          count,
          title: nextTitle,
          topic: generationTopic.trim() || selectionLabel || SUBJECT_CONFIG[subject].label,
          builderMode: mode,
          images: imageData, // 이미지 데이터 포함
        });

        if (result.error) throw new Error(result.error);
        const data = result.data;

        // 핵심 요약 모드인 경우 전달받은 요약문을 materialText에 저장하여 보관함에서 볼 수 있게 함
        if (mode === 'summary' && data.summary) {
          setMaterialText(data.summary);
        }

        if (Array.isArray(data.questions) && data.questions.length > 0) {
          nextQuestions = normalizeGeneratedQuestions('multiple', data.questions) as ExamQuestion[];
          nextQuestionMode = 'multiple';
          if (nextQuestions.some(q => !q.stem?.trim() || hasPlaceholderChoices(q.choices))) {
            throw new Error('불완전한 문항이 생성되었습니다.');
          }
        } else {
          const debugInfo = (data as any)._debug ? JSON.stringify((data as any)._debug) : '없음';
          throw new Error(`생성된 문항이 없습니다. (Debug: ${debugInfo})`);
        }
        resolvedTitle = generationTopic.trim() || data.title || nextTitle;
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
        finalRecord = { ...saved.data, isSynced: true } as PersistedExamRecord;
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
    setOcrPages([]);
    setParsedFiles([]);
    setQuestionFiles([]);
    setAnswerFiles([]);
    setImageData([]);
    
    return finalRecord;
  };

  return {
    mode, setMode, subject, handleSubjectSelect, questionType, setQuestionType,
    format, setFormat, difficulty, setDifficulty, schoolLevel, setSchoolLevel,
    count, setCount, generationTopic, setGenerationTopic, materialText, setMaterialText,
    parsedFiles, setParsedFiles,
    questionFiles, answerFiles, setQuestionFiles, setAnswerFiles,
    isGenerating, generationError, readyToGenerate, selectionLabel, generateExam,
    imageData, setImageData,
    ocrPages, setOcrPages,
    mathGrade, setMathGrade,
  };
}
