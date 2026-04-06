import { BarChart, Trophy, Target, History } from 'lucide-react';
import type { PersistedExamRecord } from '../../lib/rootPersistence';
import { Metric } from '../ui/Metric';
import { SUBJECT_CONFIG } from '../../lib/question/subjectConfig';
import { isSubjectKey } from '../../lib/examUtils';

interface DashboardScreenProps {
  exams: PersistedExamRecord[];
  onOpenExam: (record: PersistedExamRecord) => void;
}

export function DashboardScreen({ exams, onOpenExam }: DashboardScreenProps) {
  // 데이터 분석
  const submittedExams = exams.filter(e => e.score !== null && e.score !== undefined);
  const totalExams = submittedExams.length;
  const averageScore = totalExams > 0 
    ? Math.round(submittedExams.reduce((sum, e) => sum + (e.score || 0), 0) / totalExams) 
    : 0;
  
  const recentExams = submittedExams.slice(0, 5);

  // 과목별 정답률 계산
  const subjectStats = submittedExams.reduce((acc, e) => {
    const key = isSubjectKey(e.subject) ? e.subject : 'unknown';
    if (!acc[key]) acc[key] = { total: 0, scoreSum: 0 };
    acc[key].total += 1;
    acc[key].scoreSum += (e.score || 0);
    return acc;
  }, {} as Record<string, { total: number; scoreSum: number }>);

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8">
          <div className="flex items-center gap-3">
            <BarChart className="h-6 w-6 text-slate-900" />
            <h1 className="text-3xl font-bold">학습 대시보드</h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">지금까지의 성취를 데이터로 확인하세요.</p>
        </section>

        {/* 주요 지표 */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="전체 응시" value={`${totalExams}회`} />
          <Metric label="평균 점수" value={`${averageScore}점`} />
          <Metric label="최고 점수" value={`${totalExams > 0 ? Math.max(...submittedExams.map(e => e.score || 0)) : 0}점`} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 최근 응시 기록 */}
          <section className="border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <History className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-700">최근 학습 추이</h2>
            </div>
            {recentExams.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">아직 응시 기록이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {recentExams.map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{exam.title}</p>
                      <p className="text-xs text-slate-500">{new Date(exam.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`ml-4 text-sm font-bold ${Number(exam.score) >= 80 ? 'text-blue-600' : 'text-slate-900'}`}>
                      {exam.score}점
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 과목별 분석 */}
          <section className="border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Target className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-700">과목별 성취도</h2>
            </div>
            {Object.keys(subjectStats).length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">데이터가 부족합니다.</p>
            ) : (
              <div className="space-y-5">
                {Object.entries(subjectStats).map(([key, stat]) => {
                  const label = isSubjectKey(key) ? SUBJECT_CONFIG[key].label : '기타';
                  const avg = Math.round(stat.scoreSum / stat.total);
                  return (
                    <div key={key}>
                      <div className="mb-1 flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">{label}</span>
                        <span className="text-slate-900">{avg}% 완료</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100">
                        <div 
                          className="h-full bg-slate-900 transition-all duration-500" 
                          style={{ width: `${avg}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* 하단 배지 섹션 (예시) */}
        <section className="border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-700">획득 칭호</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">성실한 학습자</span>
            {averageScore >= 90 && <span className="border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">고득점 고수</span>}
            {totalExams >= 10 && <span className="border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">열정적인 응시자</span>}
          </div>
        </section>
      </div>
    </main>
  );
}
