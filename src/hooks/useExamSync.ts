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
    const deletedRecord = savedExams.find(e => e.id === recordId);
    if (!deletedRecord) return;

    // --- [1. 낙관적 UI 업데이트: 로컬 데이터 즉시 삭제] ---
    const backupExams = [...savedExams];
    const backupWrong = [...wrongNotes];

    // --- [1. 로컬 상태 즉시 반영 및 저장소 동기화] ---
    const updatedExams = backupExams.filter((e) => e.id !== recordId);
    const updatedWrong = backupWrong.filter((n) => n.examTitle !== deletedRecord.title);
    
    // 로컬 저장소 먼저 쓰기 (안전성 확보)
    storeLocalExamList(updatedExams);
    storeLocalWrongNotes(updatedWrong);
    
    // 상태 업데이트
    setSavedExams(updatedExams);
    setWrongNotes(updatedWrong);

    // --- [2. 서버 동기화: 로그인 + 실제 UUID인 경우만 실행] ---
    // local-xxx ID는 아직 서버에 없는 레코드이므로 서버 삭제 불필요
    const isServerRecord = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recordId);

    if (sessionUserId && !isAnonymous && isServerRecord) {
      try {
        // 제약 조건 충돌 방지를 위해 오답 데이터 우선 삭제
        const wrongResult = await deleteWrongNotesByTitle(sessionUserId, deletedRecord.title);
        if (wrongResult.error) throw new Error(wrongResult.error);

        const examResult = await deleteExamRecordFromServer(sessionUserId, recordId);
        if (examResult.error) throw new Error(examResult.error);

      } catch (error) {
        console.error('Failed to delete exam from server:', error);
        alert('데이터베이스 삭제 중 오류가 발생했습니다. 데이터를 복구합니다.');

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
    removeWrongNote,
  };
}
