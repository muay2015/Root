import React from 'react';
import { RefreshCw, FileText, Search, Plus, LogIn, CheckCircle2, Trash2 } from 'lucide-react';
import type { PersistedExamRecord } from '../../lib/rootPersistence';
import { useSavedScreenLogic } from '../../hooks/screens/useSavedScreenLogic';
import { SavedExamCard } from './saved/SavedExamCard';
import { SavedSelectionBar } from './saved/SavedSelectionBar';

interface SavedScreenProps {
  exams: PersistedExamRecord[];
  onOpen: (record: PersistedExamRecord) => void;
  onDelete: (recordId: string) => void;
  onDeleteMultiple: (recordIds: string[]) => void;
  onContinueGenerate: (record: PersistedExamRecord) => void;
  onCreate: () => void;
  onLogin: () => void;
  isAnonymous: boolean;
  syncMessage: string;
  selectedSubject: string;
  onSelectSubject: (subject: string) => void;
}

export function SavedScreen({
  exams,
  onOpen,
  onDelete,
  onDeleteMultiple,
  onContinueGenerate,
  onCreate,
  onLogin,
  isAnonymous,
  syncMessage,
  selectedSubject,
  onSelectSubject,
}: SavedScreenProps) {
  const { state, actions } = useSavedScreenLogic({
    exams,
    selectedSubject,
    onDeleteMultiple,
  });

  return (
    <main className="min-h-screen bg-surface px-4 pb-28 pt-8 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {state.openMenuId && (
          <div
            className="fixed inset-0 z-[15] bg-transparent"
            onClick={() => actions.setOpenMenuId(null)}
          />
        )}

        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-outline text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                  나의 학습 보관함
                </h1>
                <p className="text-sm font-medium text-slate-500">
                  생성된 모든 평가 데이터가 안전하게 보관 중입니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={actions.handleToggleSelectionMode}
                className={`flex h-12 items-center gap-2 rounded-2xl px-5 text-sm font-black transition-all ${
                  state.isSelectionMode
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 ring-1 ring-outline hover:bg-slate-50'
                }`}
              >
                {state.isSelectionMode ? '선택 취소' : '선택'}
              </button>
              <button
                onClick={onCreate}
                className="hidden sm:flex h-12 items-center gap-2 rounded-2xl premium-gradient px-6 text-sm font-black text-white shadow-lg shadow-blue-900/10 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="h-5 w-5" />새 문제 생성
              </button>
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-outline">
            <span className="text-slate-400">총 생성 문항</span>
            <span className="text-lg font-black text-slate-900">
              {state.totalGeneratedQuestionCount.toLocaleString()}
            </span>
            <span className="text-slate-500">문항</span>
          </div>

          {syncMessage && (
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-[11px] font-bold text-accent ring-1 ring-blue-100">
              <RefreshCw className="h-3 w-3 animate-spin" />
              {syncMessage}
            </div>
          )}

          {isAnonymous && (
            <div className="premium-card bg-accent/5 border-accent/10 p-5 flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-accent shadow-sm ring-1 ring-accent/10">
                <LogIn className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-slate-900">
                  클라우드 동기화가 활성화되지 않았습니다
                </p>
                <p className="mt-1 text-[13px] font-medium leading-relaxed text-slate-500">
                  로그인하시면 모바일과 PC를 넘나들며 모든 학습 데이터를 실시간으로 공유할 수 있습니다.
                </p>
                <button
                  onClick={onLogin}
                  className="mt-3 text-[13px] font-black text-accent hover:underline underline-offset-4"
                >
                  동기화 계정으로 로그인하기
                </button>
              </div>
            </div>
          )}
        </header>

        <section className="sticky top-[72px] z-10 -mx-4 bg-surface/80 px-4 py-4 backdrop-blur-md sm:mx-0 sm:px-0">
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {state.isSelectionMode && (
              <button
                onClick={actions.selectAll}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-[13px] font-black transition-all ${
                  state.selectedIds.size === state.filteredExams.length &&
                  state.filteredExams.length > 0
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-500 ring-1 ring-outline hover:bg-slate-50'
                }`}
              >
                {state.selectedIds.size === state.filteredExams.length &&
                state.filteredExams.length > 0 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                )}
                전체 선택
              </button>
            )}
            {state.allSubjects.map((subj) => (
              <button
                key={subj}
                onClick={() => onSelectSubject(subj)}
                className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-[13px] font-black transition-all ${
                  selectedSubject === subj
                    ? 'premium-gradient text-white shadow-md'
                    : 'bg-white text-slate-500 ring-1 ring-outline hover:bg-slate-50'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        </section>

        {state.filteredExams.length === 0 ? (
          <section className="premium-card flex flex-col items-center justify-center py-24 text-center">
            <Search className="mb-4 h-12 w-12 text-slate-200" />
            <p className="text-lg font-bold text-slate-400">
              {selectedSubject === '전체'
                ? '보관된 데이터가 없습니다.'
                : `'${selectedSubject}' 관련 자료를 찾을 수 없습니다.`}
            </p>
            <button
              onClick={onCreate}
              className="mt-6 text-sm font-black text-accent hover:underline"
            >
              첫 문제 생성 시작하기
            </button>
          </section>
        ) : (
          <div className="space-y-10">
            {state.groupedBySubject.map(([subjectLabel, examList]) => (
              <section key={subjectLabel} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {examList.map((exam) => (
                    <SavedExamCard
                      key={exam.id}
                      exam={exam}
                      isSelectionMode={state.isSelectionMode}
                      isSelected={state.selectedIds.has(exam.id)}
                      openMenuId={state.openMenuId}
                      previewExamId={state.previewExamId}
                      onToggleSelection={actions.toggleSelection}
                      onOpenMenu={actions.setOpenMenuId}
                      onTogglePreview={actions.setPreviewExamId}
                      onOpen={onOpen}
                      onDelete={onDelete}
                      onContinueGenerate={onContinueGenerate}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="sm:hidden fixed bottom-24 right-4 z-40">
          <button
            disabled={state.isDeleting}
            onClick={state.isSelectionMode ? actions.handleDeleteSelected : onCreate}
            className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-2xl transition-all active:scale-90 ${
              state.isSelectionMode ? 'bg-red-500 animate-in zoom-in-50 duration-300' : 'premium-gradient'
            } ${state.isDeleting ? 'opacity-50 cursor-wait' : ''}`}
          >
            {state.isDeleting ? (
              <RefreshCw className="h-6 w-6 animate-spin" />
            ) : state.isSelectionMode ? (
              <Trash2 className="h-6 w-6" />
            ) : (
              <Plus className="h-6 w-6" />
            )}
          </button>
        </div>

        <SavedSelectionBar
          isSelectionMode={state.isSelectionMode}
          selectedCount={state.selectedIds.size}
          isDeleting={state.isDeleting}
          onCancel={actions.handleCancelSelection}
          onDelete={actions.handleDeleteSelected}
        />
      </div>
    </main>
  );
}
