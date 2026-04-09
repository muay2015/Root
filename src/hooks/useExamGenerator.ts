import { useState, useEffect } from 'react';
import { examService } from '../services/examService';
import {
  SUBJECT_CONFIG,
  getSubjectSelectionDefaults,
  getSubjectSelectionLabel,
  usesNoSelector,
  type SubjectKey,
  type SelectionFormat,
  getUploadRecommendation,
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
import type { BuilderMode, DifficultyLevel, SchoolLevel, DetailedGrade } from '../lib/examTypes';
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
  const [detailedGrade, setDetailedGrade] = useState<DetailedGrade>('1학년');
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
  const rec = SUBJECT_CONFIG[subject].uploadRecommendation;
  const hasMaterial = materialText.trim().length >= 20 || ocrPages.some(p => p.text.trim().length > 20);
  const hasTopic = generationTopic.trim().length >= 2;

  const readyToGenerate = mode === 'csat'
    ? true // 수능 모드에서는 주제 입력 없이도 전 범위 생성 가능
    : rec === 'REQUIRED'
      ? hasMaterial // 국어, 영어 등 자료 필수 과목은 자료가 있어야 함
      : (hasTopic || hasMaterial); // 수학, 사회 등은 주제만으로도 가능

  const handleSubjectSelect = (nextSubject: SubjectKey) => {
    const nextDefaults = getSubjectSelectionDefaults(nextSubject);
    setSubject(nextSubject);
    setQuestionType(nextDefaults.questionType);
    
    if (mode === 'csat') {
      setFormat('객관식');
      setSchoolLevel('high'); // 수능 모드는 항상 고등 레벨로 분류
    } else {
      setFormat(nextDefaults.format);
    }
    
    setGenerationError(null);
  };

  // 모드나 학년 변경 시 선택된 과목의 유효성 체크 및 자동 전환
  useEffect(() => {
    const availableSubjects = (Object.keys(SUBJECT_CONFIG) as SubjectKey[])
      .filter((key) => {
        const config = SUBJECT_CONFIG[key];
        if (!config || !config.supportedLevels) return false;
        
        if (mode === 'csat') {
          // 수능 모드에서는 고등 과정 지원 과목 또는 세부 과목(_ 포함) 위주로 필터링
          return (config.supportedLevels || []).includes('high') || (key || '').includes('_');
        }
        // 내신 모드에서는 현재 선택된 학교급(중등/고등)과 상세 학년(1/2/3)을 지원하는 과목만 필터링
        return (config.supportedLevels || []).includes(schoolLevel) && 
               (config.supportedGrades || []).includes(detailedGrade);
      });

    if (availableSubjects && !availableSubjects.includes(subject)) {
      const firstValid = (availableSubjects && availableSubjects[0]) || 'middle_english';
      handleSubjectSelect(firstValid);
    }
  }, [mode, schoolLevel, subject]);

  const generateExam = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const uploadMode = inferUploadMode(subject, questionType, format);
      const nextTitle = makeExamTitle(mode, subject, schoolLevel, difficulty, count, generationTopic, selectionLabel);
      
      // 구체적인 상태 메시지 설정
      const imageCount = imageData.length;
      if (imageCount > 1) {
        // 대량 이미지 처리 중임을 알림
        // 참고: 실제 UI에서 이 텍스트를 활용하려면 상태를 추가해야 하지만, 
        // 우선은 로딩 인디케이터에 반영될 수 있도록 구조를 잡습니다.
        console.log(`${imageCount}개의 문항 이미지를 병렬 분석 중입니다...`);
      }

      let nextQuestions: ExamQuestion[] = [];
      let nextQuestionMode = uploadMode;
      let resolvedTitle = nextTitle;

      if (mode === 'school' || mode === 'csat') {
        const combinedOcrText = ocrPages.map(p => p.text).join('\n\n');
        
        const finalMaterialText = (materialText.trim().length < 20 && combinedOcrText.trim().length < 20)
          ? (generationTopic.trim().length >= 2 
              ? `이 문제는 사용자가 입력한 단원명 '${generationTopic.trim()}'에 기초하여 생성되는 문제입니다.`
              : mode === 'csat'
                ? `이 문제는 수능 및 모의고사 출제 경향을 반영하여 전 범위에서 고르게 출제되는 문제입니다.`
                : `선택한 교육과정에 기초하여 생성되는 문제입니다.`)
          : `${materialText}\n\n${combinedOcrText}`.trim();

        const result = await examService.generateAIExam({
          materialText: finalMaterialText,
          subject,
          questionType: usesNoSelector(subject) ? undefined : questionType,
          format: mode === 'csat' ? '객관식' : (usesNoSelector(subject) ? undefined : format),
          difficulty,
          schoolLevel,
          detailedGrade,
          count,
          title: nextTitle,
          topic: generationTopic.trim() || selectionLabel || SUBJECT_CONFIG[subject].label,
          builderMode: mode,
          images: imageData,
        });

        if (result.error) throw new Error(result.error);
        const data = result.data;

        if (Array.isArray(data.questions) && data.questions.length > 0) {
          nextQuestions = normalizeGeneratedQuestions('multiple', data.questions) as ExamQuestion[];
          nextQuestionMode = 'multiple';
        } else {
          throw new Error('생성된 문항이 없습니다.');
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
    generateSimilarExam: async (baseTitle: string, wrongNotes: any[]) => {
      setIsGenerating(true);
      setGenerationError(null);
      try {
        // 오답 데이터를 바탕으로 요약 텍스트 생성
        const contextText = wrongNotes.map((n, i) => 
          `[오답 ${i+1}]\n문제: ${n.stem}\n정답: ${n.answer}\n해설: ${n.explanation || '없음'}`
        ).join('\n\n');

        const promptPrefix = `[유사 문항 생성 요청]\n기존 시험: ${baseTitle}\n\n사용자가 아래의 문제들을 틀렸습니다. 이 문제들의 핵심 개념과 난이도를 분석하여, 사용자가 취약점을 보완할 수 있도록 '유사한' 형태의 다른 객관식 문제를 5개 생성해 주세요. 지문은 오답 내용과 직접적으로 겹치지 않게 변형하되, 다루는 개념은 동일해야 합니다.\n\n${contextText}`;

        const result = await examService.generateAIExam({
          materialText: promptPrefix,
          subject,
          format: '객관식',
          difficulty,
          schoolLevel,
          detailedGrade,
          count: Math.min(Math.max(5, wrongNotes.length), 10),
          title: `${baseTitle} - 유사 보완 세트`,
          topic: `${baseTitle} 오답 기반 유사 학습`,
          builderMode: 'school',
        });

        if (result.error) throw new Error(result.error);
        const data = result.data;
        let nextQuestions: ExamQuestion[] = [];

        if (Array.isArray(data.questions) && data.questions.length > 0) {
          nextQuestions = normalizeGeneratedQuestions('multiple', data.questions) as ExamQuestion[];
        } else {
          throw new Error('유사 문항을 생성하지 못했습니다.');
        }

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
    },
    imageData, setImageData,
    ocrPages, setOcrPages,
    detailedGrade, setDetailedGrade,
  };
}
