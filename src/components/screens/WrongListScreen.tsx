import React, { useMemo, useState } from 'react';
import { EllipsisVertical, NotebookPen, Search, ChevronDown, CheckCircle2, XCircle, Info } from 'lucide-react';
import { SUBJECT_CONFIG } from '../../lib/question/subjectConfig';
import { isSubjectKey, normalizeToSubjectKey } from '../../lib/examUtils';
import type { WrongNote } from '../../lib/examTypes';
import type { PersistedExamRecord } from '../../lib/rootPersistence';

interface WrongListScreenProps {
  wrongNotes: WrongNote[];
  savedExams: PersistedExamRecord[];
  syncMessage: string;
  onBack: () => void;
  onRetry: () => void;
  onDelete: (examTitle: string) => void;
}

export function WrongListScreen({
  wrongNotes,
  savedExams,
  syncMessage,
  onBack,
  onRetry,
  onDelete,
}: WrongListScreenProps) {
  const [openExamTitle, setOpenExamTitle] = useState<string | null>(null);
  const [openMenuTitle, setOpenMenuTitle] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('전체');

  // 추출된 전체 과목 리스트
  const allSubjects = useMemo(() => {
    const list = new Set<string>(['전체']);
    for (const note of wrongNotes) {
      const subjectKey = normalizeToSubjectKey(note.subject || (note.id.includes('___') ? note.id.split('___')[0] : null), note.examTitle);
      const label = isSubjectKey(subjectKey) ? SUBJECT_CONFIG[subjectKey].label : '기타 과목';
      list.add(label);
    }
    return Array.from(list).sort((a, b) => {
      if (a === '전체') return -1;
      if (b === '전체') return 1;
      return a.localeCompare(b);
    });
  }, [wrongNotes]);

  const filteredNotes = useMemo(() => {
    if (selectedSubject === '전체') return wrongNotes;
    return wrongNotes.filter((note) => {
      const subjectKey = normalizeToSubjectKey(note.subject || (note.id.includes('___') ? note.id.split('___')[0] : null), note.examTitle);
      const label = isSubjectKey(subjectKey) ? SUBJECT_CONFIG[subjectKey].label : '기타 과목';
      return label === selectedSubject;
    });
  }, [wrongNotes, selectedSubject]);

  const groupedBySubject = useMemo(() => {
    const subjectsMap: Record<string, Record<string, WrongNote[]>> = {};

    for (const note of filteredNotes) {
      let subjectKey: string | null | undefined = note.subject;
      
      if (!subjectKey) {
        if (note.id.includes('___')) {
          subjectKey = note.id.split('___')[0];
        } else {
          const examMatch = savedExams.find(e => e.title === note.examTitle);
          subjectKey = normalizeToSubjectKey(examMatch?.subject, note.examTitle);
        }
      }
      
      const subjectLabel = isSubjectKey(subjectKey) ? SUBJECT_CONFIG[subjectKey].label : '기타 과목';

      if (!subjectsMap[subjectLabel]) {
        subjectsMap[subjectLabel] = {};
      }
      if (!subjectsMap[subjectLabel][note.examTitle]) {
        subjectsMap[subjectLabel][note.examTitle] = [];
      }
      subjectsMap[subjectLabel][note.examTitle].push(note);
    }
    
    return Object.entries(subjectsMap).sort(([a], [b]) => {
      if (a === '기타 과목') return 1;
      if (b === '기타 과목') return -1;
      return a.localeCompare(b);
    }) as [string, Record<string, WrongNote[]>][];
  }, [filteredNotes, savedExams]);

  return (
    <main className="min-h-screen bg-surface px-4 pb-28 pt-8 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-outline text-rose-500">
              <NotebookPen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">심화 학습 저장소</h1>
              <p className="text-sm font-medium text-slate-500">틀린 문제를 분석하여 완벽한 개념 완성을 지원합니다.</p>
            </div>
          </div>
          {syncMessage && (
             <p className="text-[11px] font-bold text-slate-400 mt-1 inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full w-fit">
               <Info className="h-3 w-3" />
               {syncMessage}
             </p>
          )}
        </header>

        {/* Filters */}
        <section className="sticky top-[72px] z-10 -mx-4 bg-surface/80 px-4 py-4 backdrop-blur-md sm:mx-0 sm:px-0">
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {allSubjects.map((subj) => (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-[13px] font-black transition-all ${
                  selectedSubject === subj
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-white text-slate-500 ring-1 ring-outline hover:bg-slate-50'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        </section>

        {groupedBySubject.length === 0 ? (
          <section className="premium-card flex flex-col items-center justify-center py-24 text-center">
             <Search className="mb-4 h-12 w-12 text-slate-200" />
             <p className="text-lg font-bold text-slate-400">저장된 오답 데이터가 없습니다.</p>
             <p className="mt-2 text-sm text-slate-400 font-medium">평가를 진행하면 틀린 문항이 자동으로 기록됩니다.</p>
          </section>
        ) : (
          <div className="space-y-10">
            {groupedBySubject.map(([subjectLabel, examDict]) => (
              <section key={subjectLabel} className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                  <div className="h-1 w-1 rounded-full bg-rose-500" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">{subjectLabel}</h2>
                </div>
                
                <div className="grid gap-4">
                  {(Object.entries(examDict) as [string, WrongNote[]][]).map(([examTitle, notes], idx) => {
                    const isOpen = openExamTitle === examTitle;
                    return (
                      <article key={idx} className={`premium-card overflow-hidden transition-all ${isOpen ? 'ring-2 ring-rose-500/20' : ''}`}>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenExamTitle(isOpen ? null : examTitle)}
                            className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-slate-50 sm:p-6"
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 font-bold ring-1 ring-rose-100">
                                {notes.length}
                              </div>
                              <div className="min-w-0">
                                <h3 className="line-clamp-1 text-[16px] font-black text-slate-900">{examTitle}</h3>
                                <p className="text-[12px] font-bold text-slate-400 mt-0.5">총 {notes.length}개의 오답 정밀 분석 중</p>
                              </div>
                            </div>
                            <ChevronDown className={`h-5 w-5 text-slate-300 transition-transform duration-300 ${isOpen ? 'rotate-180 text-rose-500' : ''}`} />
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuTitle((current) => current === examTitle ? null : examTitle); }}
                            className="absolute right-14 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center text-slate-400 hover:text-slate-900"
                          >
                            <EllipsisVertical className="h-4 w-4" />
                          </button>
                          {openMenuTitle === examTitle && (
                            <div className="absolute right-14 top-3/4 z-20 flex min-w-[140px] flex-col rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-outline animate-in fade-in zoom-in-95 duration-200">
                              <button
                                onClick={(e) => { e.stopPropagation(); onRetry(); setOpenMenuTitle(null); }}
                                className="rounded-xl px-3 py-2 text-left text-[13px] font-bold text-slate-600 hover:bg-slate-50"
                              >
                                유사 세트 다시 풀기
                              </button>
                              <div className="my-1 border-t border-outline" />
                              <button
                                onClick={(e) => { e.stopPropagation(); onDelete(examTitle); setOpenMenuTitle(null); }}
                                className="rounded-xl px-3 py-2 text-left text-[13px] font-bold text-red-500 hover:bg-red-50"
                              >
                                리스트에서 삭제
                              </button>
                            </div>
                          )}
                        </div>

                        {isOpen && (
                          <div className="bg-slate-50/50 p-5 space-y-4 sm:p-6 border-t border-slate-100">
                            {notes.map((note, nIdx) => {
                              const qNum = note.id.split('-').pop();
                              return (
                                <div key={nIdx} className="premium-card p-5 border-none shadow-sm ring-1 ring-slate-100 bg-white">
                                  <div className="flex items-start gap-4 mb-4">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-black text-white">
                                      {qNum}
                                    </span>
                                    <h4 className="text-[15px] font-black leading-relaxed text-slate-900">
                                      {note.stem}
                                    </h4>
                                  </div>
                                  
                                  <div className="grid gap-3 sm:grid-cols-2 mb-6">
                                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 mb-1">
                                        <XCircle className="h-3 w-3 text-rose-500" />
                                        선택한 오답
                                      </div>
                                      <p className="text-[14px] font-bold text-rose-600">{note.myAnswer}</p>
                                    </div>
                                    <div className="rounded-xl bg-emerald-50/50 p-3 ring-1 ring-emerald-100/50">
                                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 mb-1">
                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                        정답 데이터
                                      </div>
                                      <p className="text-[14px] font-bold text-emerald-700">{note.answer}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100 shadow-sm">
                                    <p className="text-[11px] font-black uppercase tracking-wider text-accent mb-2">분석 및 해설 Insight</p>
                                    <p className="text-[13px] leading-relaxed text-slate-600 font-medium whitespace-pre-wrap">{note.explanation}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
