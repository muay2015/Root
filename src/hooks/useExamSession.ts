import { useState, useMemo } from 'react';
import {
  completeExam,
  saveWrongNotes,
  storeLocalExamList,
  storeLocalWrongNotes,
  storeLocalLastExam,
  type PersistedExamRecord,
} from '../lib/rootPersistence';
import { localStorageService } from '../services/localStorageService';
import {
  isSubjectKey,
  isDifficultyLevel,
  isSchoolLevel,
  normalizeAnswer,
  toResponseMap,
  mergeExamRecords,
  mergeWrongNotes,
} from '../lib/examUtils';
import { toGeneratedQuestionMode, normalizeStoredQuestions, type GeneratedQuestionMode } from '../lib/examGeneration';
import type { SubjectKey } from '../lib/question/subjectConfig';
import type { ExamQuestion } from '../components/exam/types';
import type { ExamMeta, BuilderMode, WrongNote } from '../lib/examTypes';

export function useExamSession(
  sessionUserId: string | null,
  savedExams: PersistedExamRecord[],
  wrongNotes: WrongNote[],
  onSyncExams: (next: PersistedExamRecord[]) => void,
  onSyncWrong: (next: WrongNote[]) => void
) {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [examTitle, setExamTitle] = useState('ROOT CBT');
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [generatedQuestionMode, setGeneratedQuestionMode] = useState<GeneratedQuestionMode>('mixed');
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [examMeta, setExamMeta] = useState<ExamMeta>({
    subject: 'middle_english' as SubjectKey,
    difficulty: 'hard',
    schoolLevel: 'high',
    count: 5,
  });

  const summary = useMemo(() => {
    const wrong = questions.flatMap((question) => {
      const myAnswer = responses[question.id] ?? '';
      return normalizeAnswer(myAnswer) === normalizeAnswer(question.answer)
        ? []
        : [{
            id: `${examMeta.subject}___${examTitle}-${question.id}-${Date.now()}`,
            examTitle,
            subject: examMeta.subject,
            topic: question.topic,
            stem: question.stem,
            myAnswer: myAnswer || '미응답',
            answer: question.answer,
            explanation: question.explanation,
          }];
    });

    const correctCount = questions.length - wrong.length;
    return {
      score: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0,
      correctCount,
      wrongCount: wrong.length,
      wrong,
    };
  }, [examTitle, questions, responses, examMeta.subject]);

  const answeredIds = useMemo(() => 
    new Set(Object.entries(responses)
      .filter(([, value]) => String(value).trim().length > 0)
      .map(([key]) => Number(key))
    ), [responses]);

  const startExam = (record: PersistedExamRecord) => {
    const questions = normalizeStoredQuestions(record.questions as ExamQuestion[], toGeneratedQuestionMode(record.question_type)) as ExamQuestion[];
    setQuestions(questions);
    setExamTitle(record.title);
    setGeneratedQuestionMode(toGeneratedQuestionMode(record.question_type));
    setResponses(toResponseMap(record.responses));
    setCurrentQuestionIndex(1);
    setCurrentExamId(record.id);
    setExamMeta({
      subject: isSubjectKey(record.subject) ? record.subject : 'middle_english',
      difficulty: isDifficultyLevel(record.difficulty) ? record.difficulty : 'hard',
      schoolLevel: isSchoolLevel(record.exam_format) ? record.exam_format : 'high',
      count: record.question_count,
    });
    storeLocalLastExam(record);
  };

  const submitExam = async () => {
    // 실시간 데이터 소실 방지를 위해 로컬 저장소의 최신 데이터를 가져옴
    const currentLocalWrong = localStorageService.loadWrongNotes<WrongNote>();
    const nextWrong = mergeWrongNotes([...summary.wrong, ...currentLocalWrong]);
    onSyncWrong(nextWrong);
    storeLocalWrongNotes(nextWrong);

    if (sessionUserId) {
      await saveWrongNotes(sessionUserId, nextWrong);
      if (currentExamId) {
        const result = await completeExam(sessionUserId, {
          examId: currentExamId,
          responses,
          score: summary.score,
          correctCount: summary.correctCount,
          wrongCount: summary.wrongCount,
        });

        if (result.data) {
          const updated = { ...result.data, isSynced: true } as PersistedExamRecord;
          const nextSavedExams = mergeExamRecords([updated, ...savedExams]);
          onSyncExams(nextSavedExams);
          storeLocalExamList(nextSavedExams);
        }
      }
    }
  };

  return {
    questions, examTitle, responses, currentQuestionIndex, generatedQuestionMode,
    currentExamId, examMeta, summary, answeredIds,
    setQuestions, setExamTitle, setResponses, setCurrentQuestionIndex, 
    setGeneratedQuestionMode, setCurrentExamId, setExamMeta,
    startExam, submitExam,
  };
}
