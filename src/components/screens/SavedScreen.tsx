import React, { useMemo, useState } from 'react';
import { EllipsisVertical, Info, RefreshCw, FileText, Search, Plus, LogIn, ChevronRight } from 'lucide-react';
import { SUBJECT_CONFIG } from '../../lib/question/subjectConfig';
import { 
  formatSavedDate, 
  getDifficultyLabel, 
  getSchoolLevelLabel, 
  getSourcePreview, 
  normalizeToSubjectKey, 
  isDifficultyLevel, 
  isSchoolLevel 
} from '../../lib/examUtils';
import { SubjectTag } from '../ui/SubjectTag';
import type { PersistedExamRecord } from '../../lib/rootPersistence';

interface SavedScreenProps {
  exams: PersistedExamRecord[];
  onOpen: (record: PersistedExamRecord) => void;
  onDelete: (recordId: string) => void;
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
  onContinueGenerate,
  onCreate,
  onLogin,
  isAnonymous,
  syncMessage,
  selectedSubject,
  onSelectSubject,
}: SavedScreenProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [previewExamId, setPreviewExamId] = useState<string | null>(null);

  const allSubjects = useMemo(() => {
    const list = new Set<string>(['전체']);
    for (const exam of exams) {
      const subjectKey = normalizeToSubjectKey(exam.subject, exam.title);
      const label = subjectKey ? SUBJECT_CONFIG[subjectKey].label : '기타 과목';
      list.add(label);
    }
    return Array.from(list).sort((a, b) => {
      if (a === '전체') return -1;
      if (b === '전체') return 1;
      return a.localeCompare(b);
    });
  }, [exams]);

  const filteredExams = useMemo(() => {
    if (selectedSubject === '전체') return exams;
    return exams.filter((exam) => {
      const subjectKey = normalizeToSubjectKey(exam.subject, exam.title);
      const label = subjectKey ? SUBJECT_CONFIG[subjectKey].label : '기타 과목';
      return label === selectedSubject;
    });
  }, [exams, selectedSubject]);

  const groupedBySubject = useMemo(() => {
    const subjectsMap: Record<string, PersistedExamRecord[]> = {};

    for (const exam of filteredExams) {
      const subjectKey = normalizeToSubjectKey(exam.subject, exam.title);
      const label = subjectKey ? SUBJECT_CONFIG[subjectKey].label : '기타 과목';
      if (!subjectsMap[label]) subjectsMap[label] = [];
      subjectsMap[label].push(exam);
    }

    return Object.entries(subjectsMap).sort((a, b) => {
      if (a[0] === '기타 과목') return 1;
      if (b[0] === '기타 과목') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [filteredExams]);

  return (
    <main className="min-h-screen bg-surface px-4 pb-28 pt-8 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* 메뉴 오픈 시 외부 클릭을 감지하기 위한 투명 오버레이 */}
        {openMenuId && (
          <div 
            className="fixed inset-0 z-[15] bg-transparent" 
            onClick={() => setOpenMenuId(null)}
          />
        )}
        {/* Header Area */}
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-outline text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">나의 학습 보관함</h1>
                <p className="text-sm font-medium text-slate-500">생성된 모든 평가 데이터가 안전하게 보관 중입니다.</p>
              </div>
            </div>
            
            <button 
              onClick={onCreate}
              className="hidden sm:flex h-12 items-center gap-2 rounded-2xl premium-gradient px-6 text-sm font-black text-white shadow-lg shadow-blue-900/10 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="h-5 w-5" />
              새 문제 생성
            </button>
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
                <p className="text-sm font-black text-slate-900">클라우드 동기화가 활성화되지 않았습니다</p>
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

        {/* Filters */}
        <section className="sticky top-[72px] z-10 -mx-4 bg-surface/80 px-4 py-4 backdrop-blur-md sm:mx-0 sm:px-0">
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {allSubjects.map((subj) => (
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

        {filteredExams.length === 0 ? (
          <section className="premium-card flex flex-col items-center justify-center py-24 text-center">
            <Search className="mb-4 h-12 w-12 text-slate-200" />
            <p className="text-lg font-bold text-slate-400">
              {selectedSubject === '전체' ? '보관된 데이터가 없습니다.' : `'${selectedSubject}' 관련 자료를 찾을 수 없습니다.`}
            </p>
            <button onClick={onCreate} className="mt-6 text-sm font-black text-accent hover:underline">
              첫 문제 생성 시작하기
            </button>
          </section>
        ) : (
          <div className="space-y-10">
            {groupedBySubject.map(([subjectLabel, examList]) => (
              <section key={subjectLabel} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {examList.map((exam) => (
                    <article key={exam.id} className="premium-card group relative p-5 transition-all hover:ring-2 hover:ring-accent/20">
                      <div className="flex flex-col h-full">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex flex-col gap-1.5 min-w-0">
                             <div className="flex items-center gap-2">
                               <SubjectTag subject={exam.subject} title={exam.title} />
                               <span className="text-[10px] font-bold text-slate-300">/</span>
                               <span className="text-[10px] font-bold text-slate-400">{formatSavedDate(exam.created_at)}</span>
                             </div>
                             <h3 className="line-clamp-2 text-[16px] font-black leading-snug text-slate-900 group-hover:text-accent transition-colors">
                               {exam.title}
                             </h3>
                          </div>
                          
                          <div className="relative shrink-0">
                            <button
                              onClick={() => setOpenMenuId((current) => (current === exam.id ? null : exam.id))}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all"
                            >
                              <EllipsisVertical className="h-3.5 w-3.5" />
                            </button>
                            {openMenuId === exam.id && (
                              <div className="absolute right-0 top-9 z-20 flex min-w-[160px] flex-col rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-outline animate-in fade-in zoom-in-95 duration-200">
                                {exam.source_text?.trim() && (
                                  <button
                                    onClick={() => {
                                      setPreviewExamId((current) => (current === exam.id ? null : exam.id));
                                      setOpenMenuId(null);
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
                                    setOpenMenuId(null);
                                  }}
                                  className="rounded-xl px-3 py-2 text-left text-[13px] font-bold text-red-500 hover:bg-red-50"
                                >
                                  영구 삭제
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
 
                        <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-50/50">
                          <div className="flex gap-2.5 text-[11px] font-bold text-slate-400">
                            <span>{isSchoolLevel(exam.exam_format) ? getSchoolLevelLabel(exam.exam_format) : exam.exam_format}</span>
                            <span className="opacity-30">•</span>
                            <span>{isDifficultyLevel(exam.difficulty) ? getDifficultyLabel(exam.difficulty) : exam.difficulty}</span>
                            <span className="opacity-30">•</span>
                            <span className="text-slate-600">{exam.question_count}문항</span>
                          </div>
                          
                          <button
                            onClick={() => onOpen(exam)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/10 transition-all hover:scale-110 active:scale-95"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>

                        {previewExamId === exam.id && exam.source_text && (
                          <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Source Insight</p>
                            <p className="text-[13px] leading-relaxed text-slate-600 line-clamp-5">{getSourcePreview(exam.source_text, 1200)}</p>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        
        <div className="sm:hidden fixed bottom-24 right-4 z-40">
          <button 
            onClick={onCreate}
            className="flex h-14 w-14 items-center justify-center rounded-2xl premium-gradient text-white shadow-2xl transition-all active:scale-90"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>
    </main>
  );
}
