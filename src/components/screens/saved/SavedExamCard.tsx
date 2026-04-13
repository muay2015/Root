import React from 'react';
import { ChevronRight, EllipsisVertical, FileText, CheckCircle2 } from 'lucide-react';
import type { PersistedExamRecord } from '../../../lib/rootPersistence';
import { SubjectTag } from '../../ui/SubjectTag';
import { formatSavedDate, getDifficultyLabel, getSchoolLevelLabel, getSourcePreview, isDifficultyLevel, isSchoolLevel } from '../../../lib/examUtils';

export interface SavedExamCardProps {
  key?: React.Key;
  exam: PersistedExamRecord;
  isSelectionMode: boolean;
  isSelected: boolean;
  openMenuId: string | null;
  previewExamId: string | null;
  onToggleSelection: (id: string) => void;
  onOpenMenu: (id: string | null) => void;
  onTogglePreview: (id: string | null) => void;
  onOpen: (exam: PersistedExamRecord) => void;
  onDelete: (id: string) => void;
  onContinueGenerate: (exam: PersistedExamRecord) => void;
}

export function SavedExamCard({
  exam,
  isSelectionMode,
  isSelected,
  openMenuId,
  previewExamId,
  onToggleSelection,
  onOpenMenu,
  onTogglePreview,
  onOpen,
  onDelete,
  onContinueGenerate,
}: SavedExamCardProps) {
  return (
    <article
      onClick={() => isSelectionMode && onToggleSelection(exam.id)}
      className={`premium-card group relative p-5 transition-all hover:ring-2 hover:ring-accent/20 ${
        isSelectionMode ? 'cursor-pointer active:scale-[0.98]' : ''
      } ${isSelected ? 'ring-2 ring-accent bg-accent/[0.02]' : ''}`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 min-w-0">
            {isSelectionMode && (
              <div
                className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all ${
                  isSelected ? 'bg-accent text-white shadow-sm' : 'bg-white ring-2 ring-slate-200'
                }`}
              >
                {isSelected && <CheckCircle2 className="h-4 w-4" />}
              </div>
            )}
            <div className="flex flex-col gap-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <SubjectTag
                  subject={exam.subject}
                  title={exam.title}
                  altText={exam.questions[0]?.topic}
                  questions={exam.questions}
                  schoolLevel={exam.exam_format}
                />
                <span className="text-[10px] font-bold text-slate-300">/</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {formatSavedDate(exam.created_at)}
                </span>
              </div>
              <h3
                className={`line-clamp-2 text-[16px] font-black leading-snug transition-colors ${
                  isSelected ? 'text-accent' : 'text-slate-900 group-hover:text-accent'
                }`}
              >
                {exam.title}
              </h3>
            </div>
          </div>

          {!isSelectionMode && (
            <div className="relative shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenMenu(openMenuId === exam.id ? null : exam.id);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all"
              >
                <EllipsisVertical className="h-3.5 w-3.5" />
              </button>
              {openMenuId === exam.id && (
                <div className="absolute right-0 top-9 z-20 flex min-w-[160px] flex-col rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-outline animate-in fade-in zoom-in-95 duration-200">
                  {exam.source_text?.trim() && (
                    <button
                      onClick={() => {
                        onTogglePreview(previewExamId === exam.id ? null : exam.id);
                        onOpenMenu(null);
                      }}
                      className="rounded-xl px-3 py-2 text-left text-[13px] font-bold text-slate-600 hover:bg-slate-50"
                    >
                      원문 텍스트 {previewExamId === exam.id ? '숨기기' : '미리보기'}
                    </button>
                  )}
                  <button
                    onClick={() => onContinueGenerate(exam)}
                    className="rounded-xl px-3 py-2 text-left text-[13px] font-bold text-slate-600 hover:bg-slate-50"
                  >
                    유사 문항 생성
                  </button>
                  <div className="my-1 border-t border-outline" />
                  <button
                    onClick={() => {
                      onDelete(exam.id);
                      onOpenMenu(null);
                    }}
                    className="rounded-xl px-3 py-2 text-left text-[13px] font-bold text-red-500 hover:bg-red-50"
                  >
                    영구 삭제
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-slate-50/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-400">
              <span className="whitespace-nowrap shrink-0">
                {isSchoolLevel(exam.exam_format) ? getSchoolLevelLabel(exam.exam_format) : exam.exam_format}
              </span>
              <span className="opacity-20 shrink-0">•</span>
              <span className="whitespace-nowrap shrink-0">
                {isDifficultyLevel(exam.difficulty) ? getDifficultyLabel(exam.difficulty) : exam.difficulty}
              </span>
              <span className="opacity-20 shrink-0">•</span>
              <span className="whitespace-nowrap shrink-0 text-slate-600">
                {exam.question_count}문항
              </span>
            </div>

            <button
              onClick={(e) => {
                if (isSelectionMode) return;
                e.stopPropagation();
                onOpen(exam);
              }}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 ${
                isSelectionMode
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                  : 'bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:scale-110'
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {(exam.question_files?.length > 0 || exam.answer_files?.length > 0) && (
            <div className="mt-4 flex flex-col gap-1.5 border-t border-slate-50/30 pt-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                첨부 자료
              </p>
              <div className="flex flex-wrap gap-1.5">
                {exam.question_files?.map((f, i) => (
                  <div
                    key={`q-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200/50 max-w-full"
                  >
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">{f}</span>
                  </div>
                ))}
                {exam.answer_files?.map((f, i) => (
                  <div
                    key={`a-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-500 ring-1 ring-blue-100/50 max-w-full"
                  >
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {previewExamId === exam.id && exam.source_text && (
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
              Source Insight
            </p>
            <p className="text-[13px] leading-relaxed text-slate-600 line-clamp-5">
              {getSourcePreview(exam.source_text, 1200)}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
