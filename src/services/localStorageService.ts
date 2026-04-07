import { PersistedWrongNote, PersistedExamRecord } from '../types/persistence';

const LOCAL_WRONG_NOTES_KEY = 'root:wrong-notes';
const LOCAL_LAST_EXAM_KEY = 'root:last-exam';
const LOCAL_EXAM_LIST_KEY = 'root:exam-list';

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
    window.localStorage.setItem(LOCAL_LAST_EXAM_KEY, JSON.stringify(exam));
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
    window.localStorage.setItem(LOCAL_EXAM_LIST_KEY, JSON.stringify(exams));
  }
};
