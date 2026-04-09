import { useState } from 'react';
import { examService } from '../services/examService';
import { saveExamDraft, storeLocalExamList, storeLocalLastExam, type PersistedExamRecord } from '../lib/rootPersistence';
import { mergeExamRecords } from '../lib/examUtils';
import { normalizeGeneratedQuestions } from '../lib/examGeneration';
import type { SubjectKey } from '../lib/question/subjectConfig';

/**
 * 이미지 스캔 기반 문항 추출 및 세션 생성 훅
 */
export function useImageScan(
  sessionUserId: string | null,
  savedExams: PersistedExamRecord[],
  onSyncExams: (next: PersistedExamRecord[]) => void,
) {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<string | null>(null);

  /**
   * 이미지 데이터를 서버로 전송하여 문항을 추출합니다.
   */
  const startImageScan = async (params: {
    questionText: string; // 이미지 데이터 (IMAGE_DATA:...)가 포함된 문자열
    subject: SubjectKey;
    examTitle: string;
    questionFileName: string;
  }) => {
    setIsImporting(true);
    setImportError(null);
    setImportProgress(null);

    try {
      // 다중 이미지 데이터 분리
      const imageParts = params.questionText.split('|||FILE_BREAK|||').filter(p => p.startsWith('IMAGE_DATA:'));
      
      if (imageParts.length === 0) {
        throw new Error('처리할 이미지 데이터가 없습니다.');
      }

      const allRawQuestions: any[] = [];
      const failures: string[] = [];
      const CONCURRENCY = 5; // 한 번에 5장씩 병렬 처리

      for (let i = 0; i < imageParts.length; i += CONCURRENCY) {
        const currentBatch = imageParts.slice(i, i + CONCURRENCY);
        const batchRemaining = imageParts.length - i;
        const batchSize = Math.min(CONCURRENCY, batchRemaining);
        
        setImportProgress(`실시간 분석 중... (${i} / ${imageParts.length} 완료)`);

        const batchResults = await Promise.all(
          currentBatch.map(async (imageData, indexInBatch) => {
            const globalIndex = i + indexInBatch;
            try {
              const result = await examService.extractFromPdf({
                questionText: imageData,
                answerText: '',
                subject: params.subject,
                examTitle: params.examTitle,
              });
              return { success: !result.error && !!result.data, data: result.data, error: result.error, index: globalIndex };
            } catch (err) {
              return { success: false, data: null, error: err instanceof Error ? err.message : 'Unknown error', index: globalIndex };
            }
          })
        );

        // 결과 정렬 및 처리
        batchResults.forEach(res => {
          if (!res.success || !res.data) {
            const errMsg = res.error || '문항 추출 실패';
            console.warn(`[useImageScan] 이미지 ${res.index + 1} 처리 실패: ${errMsg}`);
            failures.push(`이미지 ${res.index + 1}: ${errMsg}`);
            return;
          }

          const { questions: rawQs } = res.data as any;
          if (Array.isArray(rawQs) && rawQs.length > 0) {
            allRawQuestions.push(...rawQs);
          } else {
            failures.push(`이미지 ${res.index + 1}: 문항을 찾을 수 없음`);
          }
        });
      }

      // 모든 분석 완료 후 일괄 ID 부여 (순서 보장)
      const offsettedQuestions = allRawQuestions.map((q, idx) => ({
        ...q,
        id: idx + 1,
      }));

      if (offsettedQuestions.length === 0 && failures.length > 0) {
        throw new Error(`모든 이미지 처리 실패:\n${failures.join('\n')}`);
      }

      const questions = normalizeGeneratedQuestions('multiple', offsettedQuestions);
      const resolvedTitle = params.examTitle || '이미지 스캔 시험';

      const createLocalRecord = (): PersistedExamRecord => ({
        id: `local-${Date.now()}`,
        title: resolvedTitle,
        subject: params.subject,
        builder_mode: 'image_scan',
        question_type: 'multiple',
        difficulty: 'hard',
        exam_format: 'high',
        question_count: questions.length,
        source_text: null,
        question_files: [params.questionFileName],
        answer_files: [],
        questions: questions as any,
        responses: {},
        score: null,
        correct_count: null,
        wrong_count: null,
        submitted_at: null,
        created_at: new Date().toISOString(),
        isSynced: false,
      });

      let finalRecord: PersistedExamRecord;

      if (sessionUserId) {
        const saved = await saveExamDraft(sessionUserId, {
          title: resolvedTitle,
          subject: params.subject,
          builderMode: 'image_scan',
          questionType: 'multiple',
          difficulty: 'hard',
          examFormat: 'high',
          questionCount: questions.length,
          sourceText: '',
          questionFiles: [params.questionFileName],
          answerFiles: [],
          questions: questions as any,
        });

        finalRecord = saved.data
          ? { ...saved.data, isSynced: true }
          : createLocalRecord();
      } else {
        finalRecord = createLocalRecord();
      }

      const nextSavedExams = mergeExamRecords([finalRecord, ...savedExams]);
      onSyncExams(nextSavedExams);
      storeLocalExamList(nextSavedExams);
      storeLocalLastExam(finalRecord);

      return { success: true, record: finalRecord };
    } catch (error) {
      const msg = error instanceof Error ? error.message : '오류가 발생했습니다.';
      setImportError(msg);
      return { success: false, error: msg };
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  return { 
    importPdf: startImageScan, // 기존 코드와의 호환성을 위해 우선 유지 
    isImporting, 
    importError, 
    importProgress 
  };
}
