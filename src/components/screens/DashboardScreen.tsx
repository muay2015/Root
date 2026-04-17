import React, { useMemo } from 'react';
import { BarChart, Trophy, Target, History, TrendingUp, Award, Calendar } from 'lucide-react';
import type { PersistedExamRecord } from '../../lib/rootPersistence';
import { SUBJECT_CONFIG } from '../../lib/question/subjectConfig';
import { getExamSubjectMeta, isSubjectKey } from '../../lib/examUtils';
import { MetricCard, Badge } from '../ui/DashboardUI';

interface DashboardScreenProps {
  exams: PersistedExamRecord[];
  onOpenExam: (record: PersistedExamRecord) => void;
}

export function DashboardScreen({ exams, onOpenExam }: DashboardScreenProps) {
  const dashboardData = useMemo(() => {
    const totalExams = submittedExams.length;
    const averageScore = totalExams > 0 
      ? Math.round(submittedExams.reduce((sum, e) => sum + (e.score || 0), 0) / totalExams) 
      : 0;
    const highestScore = totalExams > 0 
      ? Math.max(...submittedExams.map(e => e.score || 0)) 
      : 0;
    
    const recentExams = [...exams]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(exam => ({
        exam,
        subjectMeta: getExamSubjectMeta(exam)
      }));

    const subjectStats = submittedExams.reduce((acc, exam) => {
      const subject = exam.subject || 'unknown';
      if (!acc[subject]) acc[subject] = { total: 0, scoreSum: 0 };
      acc[subject].total += 1;
      acc[subject].scoreSum += (exam.score || 0);
      return acc;
    }, {} as Record<string, { total: number; scoreSum: number }>);

    return {
      totalExams,
      averageScore,
      highestScore,
      recentExams,
      subjectStats,
    };
  }, [exams]);

  const { totalExams, averageScore, highestScore, recentExams, subjectStats } = dashboardData;

  return (
    <div className="px-4 pb-28 pt-4 sm:px-6 sm:pt-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl premium-gradient text-white shadow-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">학습 성과 리포트</h1>
              <p className="text-sm font-medium text-slate-500">지표형 분석으로 추적한 최근 학습 데이터입니다.</p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="누적 응시 횟수"
            value={totalExams}
            suffix="회"
            icon={<Calendar className="h-5 w-5 text-blue-600" />}
          />
          <MetricCard
            label="평균 정답률"
            value={averageScore}
            suffix="%"
            icon={<Target className="h-5 w-5 text-emerald-600" />}
          />
          <MetricCard
            label="최고 점수"
            value={highestScore}
            suffix="점"
            icon={<Award className="h-5 w-5 text-amber-600" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="premium-card p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-slate-50 pb-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-slate-400" />
                <h2 className="text-lg font-bold text-slate-800">최근 학습 히스토리</h2>
              </div>
            </div>

            {recentExams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <BarChart className="mb-3 h-12 w-12 opacity-20" />
                <p className="text-sm font-medium">아직 생성된 학습 데이터가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentExams.map(({ exam, subjectMeta }) => (
                  <button
                    key={exam.id}
                    onClick={() => onOpenExam(exam)}
                    className="group flex w-full items-center justify-between rounded-2xl bg-slate-50/50 p-4 transition-all hover:bg-white hover:shadow-md ring-1 ring-transparent hover:ring-blue-100"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white font-bold text-blue-600 ring-1 ring-slate-200">
                        {subjectMeta.label.charAt(0)}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{exam.title}</p>
                        <p className="text-xs font-medium text-slate-500">{new Date(exam.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-black ${Number(exam.score) >= 80 ? 'text-blue-600' : 'text-slate-800'}`}>
                        {exam.score}
                      </span>
                      <div className="h-2 w-2 rounded-full bg-slate-200 group-hover:bg-blue-400 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="space-y-6">
            <section className="premium-card p-6">
              <div className="mb-6 flex items-center gap-2 border-b border-slate-50 pb-4">
                <Target className="h-5 w-5 text-slate-400" />
                <h2 className="text-lg font-bold text-slate-800">과목별 정답률 분석</h2>
              </div>

              {Object.keys(subjectStats).length === 0 ? (
                <p className="py-10 text-center text-sm font-medium text-slate-400">데이터를 수집 중입니다.</p>
              ) : (
                <div className="space-y-6">
                  {(Object.entries(subjectStats) as [string, { total: number; scoreSum: number }][]).map(([key, stat]) => {
                    const label = isSubjectKey(key) ? SUBJECT_CONFIG[key].label : '기타';
                    const avg = Math.round(stat.scoreSum / stat.total);
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-slate-600">{label}</span>
                          <span className="text-blue-600">{avg}%</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full premium-gradient transition-all duration-1000 ease-out"
                            style={{ width: `${avg}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="premium-card p-6">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-50 pb-4">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-800">나의 배지</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge label="꾸준한 학습자" theme="slate" />
                {averageScore >= 90 && <Badge label="마스터 마인드" theme="blue" />}
                {totalExams >= 10 && <Badge label="학습 여정 10회" theme="amber" />}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
