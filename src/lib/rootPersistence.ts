import type { User } from '@supabase/supabase-js';
import { 
  PersistedQuestion, 
  PersistedWrongNote, 
  PersistedExamRecord, 
  SaveExamDraftInput, 
  CompleteExamInput, 
  Result 
} from '../types/persistence';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';
import { examService } from '../services/examService';
import { wrongNoteService } from '../services/wrongNoteService';
import { localStorageService } from '../services/localStorageService';

// Re-exporting types for backward compatibility
export type { 
  PersistedQuestion, 
  PersistedWrongNote, 
  PersistedExamRecord, 
  SaveExamDraftInput, 
  CompleteExamInput, 
  Result 
};

// --- Local Storage Proxy ---
export const loadLocalWrongNotes = localStorageService.loadWrongNotes;
export const storeLocalWrongNotes = localStorageService.storeWrongNotes;
export const loadLocalLastExam = localStorageService.loadLastExam;
export const storeLocalLastExam = localStorageService.storeLastExam;
export const loadLocalExamList = localStorageService.loadExamList;
export const storeLocalExamList = localStorageService.storeExamList;
export const getAnonymousUsageDate = localStorageService.getAnonymousUsageDate;
export const setAnonymousUsageDate = localStorageService.setAnonymousUsageDate;

// --- Auth Proxy ---
export const ensureSupabaseUser = authService.ensureSupabaseUser;
export const getSignedInUser = authService.getSignedInUser;
export const signUpWithEmail = authService.signUp;
export const signInWithEmail = authService.signIn;
export const signOutUser = authService.signOut;
export const requestPasswordReset = authService.requestPasswordReset;
export const updatePassword = authService.updatePassword;
export const updateDisplayName = authService.updateDisplayName;

// --- Storage Proxy ---
export const updateAvatar = storageService.updateAvatar;

// --- Exam Proxy ---
export const fetchExamRecords = examService.fetchRecords;
export const fetchLatestExamRecord = examService.fetchLatest;
export const saveExamDraft = examService.saveDraft;
export const completeExam = examService.complete;
export const saveExamRecords = examService.syncRecords;
export const deleteExamRecordFromServer = examService.delete;

// --- Wrong Note Proxy ---
export const fetchWrongNotes = wrongNoteService.fetch;
export const saveWrongNotes = wrongNoteService.save;
export const deleteWrongNotesByTitle = wrongNoteService.deleteByTitle;
