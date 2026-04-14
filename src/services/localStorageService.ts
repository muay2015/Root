import { PersistedWrongNote, PersistedExamRecord } from '../types/persistence';

// base64 이미지 데이터는 localStorage 한도(5MB)를 빠르게 초과하므로 저장 전 제거
function stripImageDataFromExams(exams: PersistedExamRecord[], aggressive = false): PersistedExamRecord[] {
  return exams.map(exam => {
    if (!Array.isArray(exam.questions)) return exam;
    const questions = exam.questions.map((q: any) => {
      if (!q) return q;
      const { image_url, ...rest } = q;
      // aggressive 모드: stem 등 긴 텍스트도 제거 (최후 수단)
      if (aggressive) {
        return { id: rest.id, type: rest.type, topic: rest.topic, choices: rest.choices, answer: rest.answer };
      }
      return rest;
    });
    return { ...exam, questions };
  });
}

const LOCAL_WRONG_NOTES_KEY = 'root:wrong-notes';
const LOCAL_LAST_EXAM_KEY = 'root:last-exam';
const LOCAL_EXAM_LIST_KEY = 'root:exam-list';
const LOCAL_ANONYMOUS_USAGE_KEY = 'root:anon-usage-date';

export const localStorageService = {
  loadWrongNotes<T extends PersistedWrongNote>(): T[] {
    try {
      const raw = window.localStorage.getItem(LOCAL_WRONG_NOTES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  storeWrongNotes(notes: PersistedWrongNote[]) {
    window.localStorage.setItem(LOCAL_WRONG_NOTES_KEY, JSON.stringify(notes));
  },

  loadLastExam<T extends PersistedExamRecord>(): T | null {
    try {
      const raw = window.localStorage.getItem(LOCAL_LAST_EXAM_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  storeLastExam(exam: PersistedExamRecord) {
    try {
      const stripped = stripImageDataFromExams([exam])[0];
      window.localStorage.setItem(LOCAL_LAST_EXAM_KEY, JSON.stringify(stripped));
    } catch {
      // 저장 실패 시 무시 (메모리 상태는 유지됨)
    }
  },

  loadExamList<T extends PersistedExamRecord>(): T[] {
    try {
      const raw = window.localStorage.getItem(LOCAL_EXAM_LIST_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  storeExamList(exams: PersistedExamRecord[]) {
    try {
      const stripped = stripImageDataFromExams(exams);
      window.localStorage.setItem(LOCAL_EXAM_LIST_KEY, JSON.stringify(stripped));
    } catch (e) {
      console.warn('[localStorage] exam-list 저장 실패 (용량 초과). 이미지 데이터를 제외하고 재시도합니다.', e);
      try {
        const minimal = stripImageDataFromExams(exams, true);
        window.localStorage.setItem(LOCAL_EXAM_LIST_KEY, JSON.stringify(minimal));
      } catch {
        // 저장 실패 시 무시 (메모리 상태는 유지됨)
      }
    }
  },

  getAnonymousUsageDate(): string | null {
    return window.localStorage.getItem(LOCAL_ANONYMOUS_USAGE_KEY);
  },

  setAnonymousUsageDate(date: string) {
    window.localStorage.setItem(LOCAL_ANONYMOUS_USAGE_KEY, date);
  }
};
