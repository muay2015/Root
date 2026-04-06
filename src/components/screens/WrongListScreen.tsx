import { useMemo, useState } from 'react';
import { EllipsisVertical } from 'lucide-react';
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
    const subjects: Record<string, Record<string, WrongNote[]>> = {};

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

      if (!subjects[subjectLabel]) {
        subjects[subjectLabel] = {};
      }
      if (!subjects[subjectLabel][note.examTitle]) {
        subjects[subjectLabel][note.examTitle] = [];
      }
      subjects[subjectLabel][note.examTitle].push(note);
    }
    
    return Object.entries(subjects).sort(([a], [b]) => {
      if (a === '기타 과목') return 1;
      if (b === '기타 과목') return -1;
      return a.localeCompare(b);
    }) as [string, Record<string, WrongNote[]>][];
  }, [filteredNotes, savedExams]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8">
          <h1 className="text-3xl font-bold">오답노트</h1>
          <p className="mt-2 text-sm text-slate-500">{syncMessage}</p>

          <div className="mt-6 flex flex-wrap gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {allSubjects.map((subj) => (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={`whitespace-nowrap px-4 py-2 text-sm font-semibold transition-colors ${
                  selectedSubject === subj
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        </section>

        {groupedBySubject.length === 0 ? (
          <section className="border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
            저장된 오답이 없습니다.
          </section>
        ) : (
          <div className="space-y-8">
            {groupedBySubject.map(([subjectLabel, exams]) => (
              <section key={subjectLabel}>
                {subjectLabel !== '기타 과목' && (
                  <h2 className="mb-3 text-[15px] font-bold text-slate-800 px-1 border-b border-slate-200 pb-2">{subjectLabel}</h2>
                )}
                <div className="border border-slate-200 bg-white">
                  {(Object.entries(exams) as [string, WrongNote[]][]).map(([examTitle, notes], index) => {
                    const isOpen = openExamTitle === examTitle;

                    return (
                      <article key={examTitle} className={`relative ${index > 0 ? 'border-t border-slate-200' : ''}`}>
                        <button
                          type="button"
                          onClick={() => setOpenExamTitle((current) => (current === examTitle ? null : examTitle))}
                          className="flex w-full items-start justify-between gap-4 pr-14 pl-5 py-4 text-left hover:bg-slate-50 sm:px-6"
                        >
                          <div className="min-w-0 space-y-1">
                            <h2 className="line-clamp-2 text-sm font-semibold leading-6 text-slate-900 sm:text-[15px]">
                              {examTitle}
                            </h2>
                            <p className="text-sm text-slate-500">
                              오답 {notes.length}개
                            </p>
                          </div>
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenuTitle((current) => current === examTitle ? null : examTitle); }}
                          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-slate-500 hover:text-slate-900 sm:right-4 sm:top-3"
                        >
                          <EllipsisVertical className="h-4 w-4" />
                        </button>

                        {openMenuTitle === examTitle ? (
                          <div className="absolute right-3 top-11 z-10 flex min-w-32 flex-col border border-slate-200 bg-white p-1 shadow-sm sm:right-4 sm:top-11">
                            <button
                              onClick={(e) => { e.stopPropagation(); onRetry(); setOpenMenuTitle(null); }}
                              className="px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                            >
                              다시 풀기
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onDelete(examTitle); setOpenMenuTitle(null); }}
                              className="px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                            >
                              삭제
                            </button>
                          </div>
                        ) : null}

                        {isOpen ? (
                          <div className="border-t border-slate-200 bg-slate-50/60 flex flex-col gap-4 px-5 py-4 sm:px-6">
                            {notes.map((note) => {
                              const questionNumber = note.id.split('-').pop();
                              return (
                                <div key={note.id} className="space-y-3 rounded border border-slate-200 bg-white p-4">
                                  <h3 className="font-semibold text-slate-900">문항 {questionNumber}. {note.stem}</h3>
                                  <div className="text-sm leading-7 text-slate-700">
                                    <p><span className="font-semibold text-slate-900">내 답:</span> {note.myAnswer}</p>
                                    <p><span className="font-semibold text-slate-900">정답:</span> {note.answer}</p>
                                    <div className="mt-3 border-l border-slate-300 bg-slate-50 py-2 pl-4">
                                      <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">해설</p>
                                      <p className="mt-1 whitespace-pre-wrap break-words">{note.explanation}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
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
