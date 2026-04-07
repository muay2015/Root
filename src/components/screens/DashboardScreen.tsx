import React from 'react';
import { BarChart, Trophy, Target, History, TrendingUp, Award, Calendar } from 'lucide-react';
import type { PersistedExamRecord } from '../../lib/rootPersistence';
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
    <main className="min-h-screen bg-surface px-4 pb-28 pt-8 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header Section */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl premium-gradient text-white shadow-lg">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">학습 성과 리포트</h1>
              <p className="text-sm font-medium text-slate-500">지능형 분석으로 도출된 당신의 학습 데이터입니다.</p>
            </div>
          </div>
        </header>

        {/* Highlight Metrics */}
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard 
            label="누적 평가 응시" 
            value={totalExams} 
            suffix="회" 
            icon={<Calendar className="h-5 w-5 text-blue-600" />} 
          />
          <MetricCard 
            label="평균 성취도" 
            value={averageScore} 
            suffix="점" 
            icon={<Target className="h-5 w-5 text-emerald-600" />} 
          />
          <MetricCard 
            label="역대 최고 점수" 
            value={totalExams > 0 ? Math.max(...submittedExams.map(e => e.score || 0)) : 0} 
            suffix="점" 
            icon={<Award className="h-5 w-5 text-amber-600" />} 
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* 최근 학습 추이 */}
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
                {recentExams.map((exam) => (
                  <button 
                    key={exam.id} 
                    onClick={() => onOpenExam(exam)}
                    className="group flex w-full items-center justify-between rounded-2xl bg-slate-50/50 p-4 transition-all hover:bg-white hover:shadow-md ring-1 ring-transparent hover:ring-blue-100"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white font-bold text-blue-600 ring-1 ring-slate-200">
                        {SUBJECT_CONFIG[isSubjectKey(exam.subject) ? exam.subject : 'korean_history']?.label.charAt(0)}
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

          {/* 과목별 성취도 */}
          <div className="space-y-6">
            <section className="premium-card p-6">
              <div className="mb-6 flex items-center gap-2 border-b border-slate-50 pb-4">
                <Target className="h-5 w-5 text-slate-400" />
                <h2 className="text-lg font-bold text-slate-800">과목별 성취 분석</h2>
              </div>
              
              {Object.keys(subjectStats).length === 0 ? (
                <p className="py-10 text-center text-sm font-medium text-slate-400">데이터를 수집 중입니다.</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(subjectStats).map(([key, stat]) => {
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

            {/* Achievements */}
            <section className="premium-card p-6">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-50 pb-4">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold text-slate-800">나의 배지</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge label="성실한 학습자" theme="slate" />
                {averageScore >= 90 && <Badge label="마스터 에디션" theme="blue" />}
                {totalExams >= 10 && <Badge label="학습 열정 폭발" theme="amber" />}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value, suffix, icon }: { label: string, value: number, suffix: string, icon: React.ReactNode }) {
  return (
    <div className="premium-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-500">{label}</span>
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-black tracking-tight text-slate-900">{value}</span>
        <span className="text-sm font-bold text-slate-400">{suffix}</span>
      </div>
    </div>
  );
}

function Badge({ label, theme }: { label: string, theme: 'slate' | 'blue' | 'amber' }) {
  const styles = {
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100'
  };
  return (
    <span className={`rounded-xl border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider ${styles[theme]}`}>
      {label}
    </span>
  );
}
