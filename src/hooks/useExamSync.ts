import { useState, useEffect } from 'react';
import {
  fetchExamRecords,
  fetchWrongNotes,
  loadLocalExamList,
  loadLocalWrongNotes,
  saveExamRecords,
  saveWrongNotes,
  deleteExamRecordFromServer,
  deleteWrongNotesByTitle,
  storeLocalExamList,
  storeLocalWrongNotes,
} from '../lib/rootPersistence';
import {
  isSubjectKey,
  inferSubjectFromTitle,
  mergeExamRecords,
  mergeWrongNotes,
} from '../lib/examUtils';
import type { PersistedExamRecord, PersistedWrongNote } from '../lib/rootPersistence';
import type { WrongNote } from '../lib/examTypes';

export function useExamSync(sessionUserId: string | null, isAnonymous: boolean) {
  const [savedExams, setSavedExams] = useState<PersistedExamRecord[]>([]);
  const [wrongNotes, setWrongNotes] = useState<WrongNote[]>([]);

  // 1. 초기 로드 (로컬 데이터 우선 가시화)
  useEffect(() => {
    const localExams = loadLocalExamList<PersistedExamRecord>();
    const localWrong = loadLocalWrongNotes<WrongNote>();
    if (localExams.length > 0) setSavedExams(mergeExamRecords(localExams));
    if (localWrong.length > 0) setWrongNotes(localWrong);
  }, []);

  // 2. 서버 동기화 및 자가 치유(복구) 엔진 가동
  useEffect(() => {
    if (!sessionUserId) return;

    void (async () => {
      const [examsResult, wrongResult] = await Promise.all([
        fetchExamRecords(sessionUserId),
        fetchWrongNotes(sessionUserId),
      ]);

      // --- [시험 기록 복구 및 자가 치유] ---
      if (examsResult.data) {
        const localExams = loadLocalExamList<PersistedExamRecord>();
        const serverExams = (examsResult.data as PersistedExamRecord[]).map(e => ({ ...e, isSynced: true }));
        const serverIds = new Set(serverExams.map(e => e.id));
        // local-xxx ID를 가진 레코드만 업로드 대상으로 제한
        const missingFromServer = localExams
          .filter(e => !serverIds.has(e.id) && e.id.startsWith('local-'))
          .map(e => ({ ...e, isSynced: false }));
        
        const merged = mergeExamRecords([...serverExams, ...missingFromServer]);
        setSavedExams(merged);
        storeLocalExamList(merged);
        
        if (missingFromServer.length > 0) {
          // local-xxx ID를 가진 레코드들을 서버에 올리고 서버에서 새 UUID를 받아온다
          const result = await saveExamRecords(sessionUserId, missingFromServer);
          if (result.data) {
            // 서버에서 받아온 최신 목록(진짜 UUID만 가짐)으로 로컬 저장소 교체
            const finalFromServer = (result.data as PersistedExamRecord[]).map(e => ({ ...e, isSynced: true }));
            setSavedExams(finalFromServer);
            storeLocalExamList(finalFromServer);
          }
        }
      }

      // --- [오답 노트 동기화] ---
      if (wrongResult.data) {
        const localWrong = loadLocalWrongNotes<PersistedWrongNote>();
        const serverNotes = wrongResult.data as WrongNote[];
        const serverIds = new Set(serverNotes.map(n => n.id));
        const newLocalOnly = localWrong.filter(n => !serverIds.has(n.id));

        if (newLocalOnly.length > 0) {
          const merged = mergeWrongNotes([...serverNotes, ...newLocalOnly]);
          setWrongNotes(merged);
          storeLocalWrongNotes(merged);
          await saveWrongNotes(sessionUserId, merged);
        } else {
          setWrongNotes(serverNotes);
          storeLocalWrongNotes(serverNotes);
        }
      }
    })();
  }, [sessionUserId]);

  const removeSavedExam = async (recordId: string) => {
    await removeSavedExams([recordId]);
  };

  const removeSavedExams = async (recordIds: string[]) => {
    if (recordIds.length === 0) return;

    // --- [1. 로컬 상태 즉시 반영 (낙관적 업데이트)] ---
    const backupExams = [...savedExams];
    const backupWrong = [...wrongNotes];

    const deletedRecords = savedExams.filter(e => recordIds.includes(e.id));
    if (deletedRecords.length === 0) {
      console.warn('[useExamSync] No matching records found for deletion:', recordIds);
      return;
    }

    const deletedTitles = new Set(deletedRecords.map(r => r.title));
    const nextSavedExams = savedExams.filter((exam) => !recordIds.includes(exam.id));
    const nextWrongNotes = wrongNotes.filter((note) => !deletedTitles.has(note.examTitle));
    
    // 상태 업데이트 (functional update를 사용하여 레이스 컨디션 방지 시도)
    setSavedExams(nextSavedExams);
    setWrongNotes(nextWrongNotes);

    // 로컬 저장소 즉시 반영
    storeLocalExamList(nextSavedExams);
    storeLocalWrongNotes(nextWrongNotes);

    // --- [2. 서버 동기화: 로그인 + 실제 UUID인 경우만 실행] ---
    const serverIdsToDelete = recordIds.filter(id => 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    );

    if (sessionUserId && !isAnonymous && serverIdsToDelete.length > 0) {
      try {
        console.log(`[useExamSync] Starting server deletion for ${serverIdsToDelete.length} records...`);

        // 병렬 삭제 처리 및 개별 에러 확인
        const results = await Promise.all(serverIdsToDelete.map(async (id) => {
          const record = deletedRecords.find(r => r.id === id);
          if (record) {
            // 제약 조건 충돌 방지를 위해 오답 데이터 우선 삭제
            await deleteWrongNotesByTitle(sessionUserId, record.title);
            const { error } = await deleteExamRecordFromServer(sessionUserId, id);
            if (error) throw new Error(error);
            return id;
          }
          return null;
        }));

        console.log('[useExamSync] Successfully deleted records from server:', results.filter(Boolean));

      } catch (error) {
        console.error('[useExamSync] Failed to delete exams from server:', error);
        alert('데이터베이스 동기화 중 오류가 발생하여 목록을 복구했습니다.');

        // --- [3. 롤백: 서버 삭제 실패 시 이전 상태로 복구] ---
        setSavedExams(backupExams);
        setWrongNotes(backupWrong);
        storeLocalExamList(backupExams);
        storeLocalWrongNotes(backupWrong);
      }
    }
  };

  const removeWrongNote = async (title: string) => {
    const previousNotes = [...wrongNotes];
    const filtered = wrongNotes.filter((n) => n.examTitle !== title);
    
    setWrongNotes(filtered);
    storeLocalWrongNotes(filtered);

    if (sessionUserId) {
      const result = await deleteWrongNotesByTitle(sessionUserId, title);
      if (result.error) {
        setWrongNotes(previousNotes);
        storeLocalWrongNotes(previousNotes);
        return { success: false, error: result.error };
      }
    }
    return { success: true };
  };

  return {
    savedExams,
    wrongNotes,
    setSavedExams,
    setWrongNotes,
    removeSavedExam,
    removeSavedExams,
    removeWrongNote,
  };
}
