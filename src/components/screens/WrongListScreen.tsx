import React, { useMemo, useState } from 'react';
import { 
  EllipsisVertical, 
  NotebookPen, 
  Search, 
  ChevronDown, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Flame, 
  GraduationCap,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { SUBJECT_CONFIG, type SubjectCategory } from '../../lib/question/subjectConfig';
import { isSubjectKey, normalizeToSubjectKey } from '../../lib/examUtils';
import type { WrongNote } from '../../lib/examTypes';
import type { PersistedExamRecord } from '../../lib/rootPersistence';

interface WrongListScreenProps {
  wrongNotes: WrongNote[];
  savedExams: PersistedExamRecord[];
  syncMessage: string;
  onBack: () => void;
  onRetry: (examTitle: string, notes: WrongNote[]) => void;
  onDelete: (examTitle: string) => void;
}

// 카테고리별 테마 컬러 맵
const CATEGORY_THEME: Record<SubjectCategory | 'default', { bg: string; text: string; ring: string; light: string }> = {
  korean: { bg: 'bg-blue-500', text: 'text-blue-600', ring: 'ring-blue-100', light: 'bg-blue-50' },
  math: { bg: 'bg-purple-500', text: 'text-purple-600', ring: 'ring-purple-100', light: 'bg-purple-50' },
  english: { bg: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-100', light: 'bg-emerald-50' },
  history: { bg: 'bg-orange-500', text: 'text-orange-600', ring: 'ring-orange-100', light: 'bg-orange-50' },
  social: { bg: 'bg-indigo-500', text: 'text-indigo-600', ring: 'ring-indigo-100', light: 'bg-indigo-50' },
  science: { bg: 'bg-cyan-500', text: 'text-cyan-600', ring: 'ring-cyan-100', light: 'bg-cyan-50' },
  language: { bg: 'bg-rose-500', text: 'text-rose-600', ring: 'ring-rose-100', light: 'bg-rose-50' },
  tech_ethics: { bg: 'bg-slate-500', text: 'text-slate-600', ring: 'ring-slate-100', light: 'bg-slate-50' },
  default: { bg: 'bg-rose-500', text: 'text-rose-600', ring: 'ring-rose-100', light: 'bg-rose-50' }
};

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

  const getSubjectKey = (note: WrongNote) => {
    const examMatch = savedExams.find(e => e.title === note.examTitle);
    return normalizeToSubjectKey(
      note.subject || (note.id.includes('___') ? note.id.split('___')[0] : null), 
      note.examTitle,
      examMatch?.questions[0]?.topic,
      examMatch?.questions,
      examMatch?.exam_format
    );
  };

  const allSubjects = useMemo(() => {
    const list = new Set<string>(['전체']);
    for (const note of wrongNotes) {
      const sKey = getSubjectKey(note);
      const label = isSubjectKey(sKey) ? SUBJECT_CONFIG[sKey].label : '기타 과목';
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
      const sKey = getSubjectKey(note);
      const label = isSubjectKey(sKey) ? SUBJECT_CONFIG[sKey].label : '기타 과목';
      return label === selectedSubject;
    });
  }, [wrongNotes, selectedSubject]);

  const groupedBySubject = useMemo(() => {
    const subjectsMap: Record<string, { examDict: Record<string, WrongNote[]>; category: SubjectCategory | 'default' }> = {};

    for (const note of filteredNotes) {
      const sKey = getSubjectKey(note);
      const subjectLabel = isSubjectKey(sKey) ? SUBJECT_CONFIG[sKey].label : '기타 과목';
      const category = isSubjectKey(sKey) ? SUBJECT_CONFIG[sKey].category : 'default';

      if (!subjectsMap[subjectLabel]) {
        subjectsMap[subjectLabel] = { examDict: {}, category };
      }
      if (!subjectsMap[subjectLabel].examDict[note.examTitle]) {
        subjectsMap[subjectLabel].examDict[note.examTitle] = [];
      }
      subjectsMap[subjectLabel].examDict[note.examTitle].push(note);
    }
    
    return Object.entries(subjectsMap).sort(([a], [b]) => {
      if (a === '기타 과목') return 1;
      if (b === '기타 과목') return -1;
      return a.localeCompare(b);
    });
  }, [filteredNotes, savedExams]);

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-28">
      {/* Compact Premium Header */}
      <div className="relative overflow-hidden bg-white pt-10 pb-10 border-b border-slate-100">
        <div className="absolute top-0 right-0 -transe-y-1/2 translate-x-1/4 opacity-5">
          <NotebookPen className="h-48 w-48 text-slate-900" />
        </div>
        <div className="mx-auto max-w-5xl px-6 relative z-10">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-200">
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">심화 학습 저장소</h1>
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-600 uppercase tracking-wider">AI Analysis</span>
                </div>
                <p className="mt-0.5 text-[13px] font-bold text-slate-400">틀린 문제와 개념을 다시 확인하여 지식의 빈틈을 채웁니다.</p>
              </div>
            </div>
            {syncMessage && (
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 w-fit border border-slate-100">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[12px] font-bold text-slate-500">{syncMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 -mt-5">
        {/* Compact Filters */}
        <section className="sticky top-6 z-30 mb-8 overflow-hidden rounded-2xl bg-white/80 p-1.5 shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50 backdrop-blur-xl">
          <div className="flex gap-1 overflow-x-auto hide-scrollbar px-1">
            {allSubjects.map((subj) => (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-[13px] font-black transition-all duration-300 ${
                  selectedSubject === subj
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        </section>

        {groupedBySubject.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-200">
              <Search className="h-10 w-10" />
            </div>
            <p className="text-xl font-black text-slate-900">저장된 오답 데이터가 없습니다.</p>
            <p className="mt-2 font-bold text-slate-400">학습 평가를 완료하면 오답이 이곳에 차곡차곡 쌓입니다.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {groupedBySubject.map(([subjectLabel, { examDict, category }]) => {
              const theme = CATEGORY_THEME[category] || CATEGORY_THEME.default;
              return (
                <section key={subjectLabel} className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-1 w-4 rounded-full ${theme.bg}`} />
                      <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-400">{subjectLabel}</h2>
                    </div>
                    <span className={`rounded-xl ${theme.light} px-3 py-1 text-[12px] font-black ${theme.text}`}>
                      {Object.keys(examDict).length} SETS
                    </span>
                  </div>
                  
                  <div className="grid gap-4">
                    {(Object.entries(examDict) as [string, WrongNote[]][]).map(([examTitle, notes], idx) => {
                      const isOpen = openExamTitle === examTitle;
                      return (
                        <article 
                          key={idx} 
                          className={`group relative rounded-3xl bg-white transition-all duration-500 hover:scale-[1.005] ${
                            isOpen ? 'ring-2 ring-rose-500/10 shadow-xl' : 'shadow-sm shadow-slate-200/40 border border-slate-100'
                          } ${openMenuTitle === examTitle ? 'z-40' : 'z-10'}`}
                        >
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenExamTitle(isOpen ? null : examTitle)}
                              className="flex w-full items-center justify-between p-5 text-left transition-colors sm:p-6 overflow-hidden rounded-3xl"
                            >
                              <div className="flex items-center gap-5">
                                <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl overflow-hidden ${theme.bg} shadow-md shadow-${theme.bg}/20`}>
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                                  <span className="relative z-10 text-lg font-black text-white">{notes.length}</span>
                                </div>
                                <div className="space-y-1 pr-14"> 
                                  <div className="flex items-center gap-2">
                                     <span className={`rounded-md ${theme.light} px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${theme.text}`}>
                                       {subjectLabel}
                                     </span>
                                  </div>
                                  <h3 className="line-clamp-1 text-[15px] font-black text-slate-800">{examTitle}</h3>
                                  <div className="flex items-center gap-2">
                                    <div className="h-0.5 w-16 overflow-hidden rounded-full bg-slate-50">
                                      <div className="h-full w-full bg-rose-400" />
                                    </div>
                                    <p className="text-[11px] font-black text-rose-500">{notes.length}개의 오답</p>
                                  </div>
                                </div>
                              </div>
                            </button>

                            {/* Options Buttons (Vertical Aligned Right) */}
                            <div className="absolute right-5 top-5 flex flex-col items-end gap-1.5 z-20">
                               <div className="flex items-center gap-1.5">
                                 <button
                                  onClick={(e) => { e.stopPropagation(); onRetry(examTitle, notes); }}
                                  className="hidden sm:flex h-8 items-center gap-2 rounded-lg bg-slate-50 px-3 text-[11px] font-black text-slate-600 transition-colors hover:bg-slate-900 hover:text-white"
                                 >
                                   <GraduationCap className="h-3.5 w-3.5" />
                                   다시 풀기
                                 </button>
                                 <button
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuTitle((current) => current === examTitle ? null : examTitle); }}
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${openMenuTitle === examTitle ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                                >
                                  <EllipsisVertical className="h-4 w-4" />
                                </button>
                               </div>

                               <button 
                                onClick={() => setOpenExamTitle(isOpen ? null : examTitle)}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 ${isOpen ? 'bg-rose-50 text-rose-500 rotate-180' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                               >
                                <ChevronDown className="h-4 w-4" />
                               </button>
                            </div>
                            
                            {openMenuTitle === examTitle && (
                              <div className="absolute right-14 top-4 z-50 flex min-w-[150px] flex-col rounded-2xl bg-white p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.12)] ring-1 ring-slate-200/50 animate-in fade-in slide-in-from-right-2 zoom-in-95 duration-200">
                                <button
                                  onClick={(e) => { e.stopPropagation(); onRetry(examTitle, notes); setOpenMenuTitle(null); }}
                                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-bold text-slate-700 hover:bg-slate-50"
                                >
                                  <GraduationCap className="h-4 w-4 text-slate-400" />
                                  유사 유형 다시 풀기
                                </button>
                                <div className="my-1 border-t border-slate-50 mx-1.5" />
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDelete(examTitle); setOpenMenuTitle(null); }}
                                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-bold text-rose-500 hover:bg-rose-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                  리스트에서 삭제
                                </button>
                              </div>
                            )}
                          </div>

                            {isOpen && (
                            <div className="bg-slate-50/50 p-5 space-y-4 sm:p-8 border-t border-slate-50 overflow-hidden rounded-b-3xl">
                              {notes.map((note, nIdx) => {
                                const qNum = note.id.split('-').pop();
                                return (
                                  <div key={nIdx} className="group/note relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md hover:ring-rose-200/50 sm:p-6">
                                    <div className="flex flex-col gap-4">
                                      <div className="flex items-start gap-4">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[14px] font-black text-white shadow-md">
                                          {qNum}
                                        </div>
                                        <h4 className="pt-0.5 text-[15px] font-black leading-relaxed text-slate-800">
                                          {note.stem}
                                        </h4>
                                      </div>
                                      
                                      <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="relative overflow-hidden rounded-2xl bg-rose-50/30 p-4 ring-1 ring-rose-100/50">
                                          <div className="flex items-center gap-2 mb-2">
                                            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white">
                                              <XCircle className="h-2.5 w-2.5" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">나의 오답</span>
                                          </div>
                                          <p className="text-[14px] font-black text-rose-600">{note.myAnswer}</p>
                                        </div>
                                        <div className="relative overflow-hidden rounded-2xl bg-emerald-50/30 p-4 ring-1 ring-emerald-100/50">
                                          <div className="flex items-center gap-2 mb-2">
                                            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                                              <CheckCircle2 className="h-2.5 w-2.5" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">정답 데이터</span>
                                          </div>
                                          <p className="text-[14px] font-black text-emerald-700">{note.answer}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="relative rounded-2xl bg-slate-50/50 p-4 ring-1 ring-slate-100/80">
                                        <div className="absolute -top-2.5 left-5 flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-[9px] font-black text-white uppercase tracking-widest shadow-md">
                                          <Sparkles className="h-2.5 w-2.5" />
                                          AI Analysis Insight
                                        </div>
                                        <div className="mt-1">
                                           <p className="text-[13px] leading-7 text-slate-600 font-bold whitespace-pre-wrap">
                                             {note.explanation}
                                           </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              
                              <div className="flex flex-col items-center gap-3 pt-2">
                                <button
                                  onClick={onRetry}
                                  className="group flex items-center gap-2.5 rounded-full bg-slate-900 px-6 py-3.5 text-[14px] font-black text-white shadow-lg transition-all hover:bg-rose-500 hover:shadow-rose-500/30 active:scale-95"
                                >
                                  <span>이 세트의 유사 문제로 다시 학습하기</span>
                                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </button>
                                <p className="text-[11px] font-bold text-slate-400">오답 데이터를 바탕으로 AI가 새로운 문항을 구성합니다.</p>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
