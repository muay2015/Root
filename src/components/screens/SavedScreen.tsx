import { useMemo, useState } from 'react';
import { EllipsisVertical, Info, RefreshCw } from 'lucide-react';
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
}: SavedScreenProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [previewExamId, setPreviewExamId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('전체');

  // 추출된 전체 과목 리스트 (기타 과목 제외)
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
    }).filter(subj => subj !== '기타 과목');
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
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">문제함</h1>
            {syncMessage && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" />
                {syncMessage}
              </div>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-500">문제가 생성되면 자동으로 이 목록에 저장됩니다.</p>

          {isAnonymous && (
            <div className="mt-4 flex items-start gap-3 bg-blue-50 p-4 border border-blue-100">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">로그인이 필요합니다</p>
                <p className="mt-1 text-xs text-blue-700 leading-relaxed">
                  로그인하시면 PC나 다른 기기에서 생성한 모든 문제를 동기화하여 볼 수 있습니다. 현재는 이 기기에 저장된 문제만 표시됩니다.
                </p>
                <button
                  onClick={() => onLogin()}
                  className="mt-2.5 text-xs font-bold text-blue-600 hover:text-blue-800 underline underline-offset-4"
                >
                  지금 로그인하기
                </button>
              </div>
            </div>
          )}
          
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

        {filteredExams.length === 0 ? (
          <section className="border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
            {selectedSubject === '전체' ? '저장된 문제가 없습니다.' : `'${selectedSubject}' 과목의 문제가 없습니다.`}
          </section>
        ) : (
          <div className="space-y-8">
            {groupedBySubject.map(([subjectLabel, examList]) => (
              <section key={subjectLabel}>
                {subjectLabel !== '기타 과목' && (
                  <h2 className="mb-3 text-[15px] font-bold text-slate-800 px-1 border-b border-slate-200 pb-2">
                    {subjectLabel}
                  </h2>
                )}
                <div className="space-y-4">
                  {examList.map((exam) => (
                    <article key={exam.id} className="relative border border-slate-200 bg-white px-5 py-5 sm:px-6">
                      <button
                        onClick={() => setOpenMenuId((current) => (current === exam.id ? null : exam.id))}
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-slate-500 hover:text-slate-900 sm:right-4 sm:top-4"
                        aria-label="문제함 메뉴"
                      >
                        <EllipsisVertical className="h-4 w-4" />
                      </button>

                      {openMenuId === exam.id ? (
                        <div className="absolute right-3 top-12 z-10 flex min-w-44 flex-col border border-slate-200 bg-white p-1 shadow-sm sm:right-4 sm:top-13">
                          {exam.source_text?.trim() ? (
                            <button
                              onClick={() => {
                                setPreviewExamId((current) => (current === exam.id ? null : exam.id));
                                setOpenMenuId(null);
                              }}
                              className="px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                            >
                              {previewExamId === exam.id ? '입력 텍스트 숨기기' : '입력 텍스트 보기'}
                            </button>
                          ) : null}
                          <button
                            onClick={() => onContinueGenerate(exam)}
                            className="px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                          >
                            추가 문제 생성
                          </button>
                          <button
                            onClick={() => {
                              onDelete(exam.id);
                              setPreviewExamId((current) => (current === exam.id ? null : current));
                              setOpenMenuId(null);
                            }}
                            className="px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                          >
                            삭제
                          </button>
                        </div>
                      ) : null}

                      <div className="space-y-4 pr-8 sm:pr-10">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                             {(() => {
                               const subjectKey = normalizeToSubjectKey(exam.subject, exam.title);
                               const label = subjectKey ? SUBJECT_CONFIG[subjectKey].label : '기타';
                               const colorClass = subjectKey === 'social' ? 'bg-amber-100 text-amber-700' : 
                                                 subjectKey === 'korean_history' ? 'bg-orange-100 text-orange-700' :
                                                 subjectKey === 'english' ? 'bg-blue-100 text-blue-700' :
                                                 subjectKey === 'math' ? 'bg-indigo-100 text-indigo-700' :
                                                 subjectKey === 'science' ? 'bg-emerald-100 text-emerald-700' :
                                                 subjectKey === 'korean' ? 'bg-rose-100 text-rose-700' :
                                                 'bg-slate-100 text-slate-600';
                               return (
                                 <span className={`px-2 py-0.5 text-[11px] font-bold rounded-sm ${colorClass}`}>
                                   {label}
                                 </span>
                               );
                             })()}
                             <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{formatSavedDate(exam.created_at)}</p>
                          </div>
                          <h2 className="text-lg font-semibold text-slate-900">{exam.title}</h2>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
                            <span>{isSchoolLevel(exam.exam_format) ? getSchoolLevelLabel(exam.exam_format) : exam.exam_format}</span>
                            <span className="text-slate-300">|</span>
                            <span>{isDifficultyLevel(exam.difficulty) ? getDifficultyLabel(exam.difficulty) : exam.difficulty}</span>
                            <span className="text-slate-300">|</span>
                            <span>{exam.question_count}문항</span>
                          </div>
                          {previewExamId === exam.id && getSourcePreview(exam.source_text, 1200) ? (
                            <div className="border-l border-slate-300 bg-slate-50/70 pl-3 pt-1">
                              <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-500">입력 텍스트</p>
                              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{getSourcePreview(exam.source_text, 1200)}</p>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => onOpen(exam)}
                            className="border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                          >
                            열기
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <button onClick={onCreate} className="bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
          새 문제 생성
        </button>
      </div>
    </main>
  );
}
