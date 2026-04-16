import React from 'react';
import type { ExamQuestion } from '../exam/types';
import type { WrongNote } from '../../lib/examTypes';
import { normalizeAnswer } from '../../lib/examUtils';
import { CheckCircle2, XCircle, Home, NotebookPen, Target, Award, BarChart2 } from 'lucide-react';
import { MathRenderer } from '../ui/MathRenderer';

interface ResultScreenProps {
  examTitle: string;
  summary: { score: number; correctCount: number; wrongCount: number; wrong: WrongNote[] };
  questions: ExamQuestion[];
  responses: Record<number, string>;
  onBack: () => void;
  onWrong: () => void;
}

export function ResultScreen({
  examTitle,
  summary,
  questions,
  responses,
  onBack,
  onWrong,
}: ResultScreenProps) {
  const isPass = summary.score >= 80;

  return (
    <main className="min-h-screen bg-surface px-4 pb-28 pt-8 sm:px-6 sm:pt-12">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Score Hero */}
        <section className="premium-card relative overflow-hidden bg-white p-8 sm:p-12 border-none shadow-2xl shadow-blue-900/5">
          <div className="absolute right-0 top-0 opacity-[0.03] scale-150 -translate-y-1/4 translate-x-1/4">
             <BarChart2 className="h-64 w-64" />
          </div>
          
          <div className="relative flex flex-col items-center text-center">
            <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-3xl ${isPass ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'} ring-1 ring-inset ${isPass ? 'ring-emerald-100' : 'ring-rose-100'}`}>
              {isPass ? <Award className="h-10 w-10" /> : <Target className="h-10 w-10" />}
            </div>
            <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Final Evaluation Score</p>
            <h1 className="text-7xl sm:text-8xl font-black tracking-tighter text-slate-900 mb-4">
              {summary.score}<span className="text-3xl text-slate-300 ml-1">pts</span>
            </h1>
            <h2 className="text-xl font-bold text-slate-800 line-clamp-1 max-w-lg">{examTitle}</h2>
            
            <div className="mt-10 grid grid-cols-2 gap-4 w-full max-w-md">
              <div className="rounded-2xl bg-emerald-50/50 p-4 ring-1 ring-emerald-100/50 flex flex-col items-center">
                <span className="text-[10px] font-black text-emerald-600 uppercase mb-1">Correct</span>
                <span className="text-2xl font-black text-emerald-700">{summary.correctCount}</span>
              </div>
              <div className="rounded-2xl bg-rose-50/50 p-4 ring-1 ring-rose-100/50 flex flex-col items-center">
                <span className="text-[10px] font-black text-rose-600 uppercase mb-1">Incorrect</span>
                <span className="text-2xl font-black text-rose-700">{summary.wrongCount}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={onWrong} 
            className="flex-1 flex h-16 items-center justify-center gap-3 rounded-2xl bg-white border border-rose-100 text-rose-500 text-base font-black shadow-lg shadow-rose-900/5 transition-all hover:bg-rose-50 active:scale-95"
          >
            <NotebookPen className="h-5 w-5" />
            틀린 문항 정밀 분석
          </button>
          <button 
            onClick={onBack} 
            className="flex-1 flex h-16 items-center justify-center gap-3 rounded-2xl bg-slate-900 text-white text-base font-black shadow-lg shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Home className="h-5 w-5" />
            홈으로 돌아가기
          </button>
        </div>

        {/* Detailed Breakdown */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Question Breakdown</h3>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
          
          <div className="grid gap-6">
            {questions.map((question) => {
              const myAns = responses[question.id] ?? '미응답';
              const isCorrect = normalizeAnswer(myAns) === normalizeAnswer(question.answer);
              return (
                <article key={question.id} className="premium-card p-6 sm:p-8 bg-white">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white text-sm font-black">
                        {question.id}
                      </span>
                      <span className={`text-[12px] font-black uppercase tracking-wider ${isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isCorrect ? 'Verified Correct' : 'Needs Review'}
                      </span>
                    </div>
                    {isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-rose-500" />}
                  </div>
                  
                  <h4 className="text-[17px] font-bold leading-relaxed text-slate-900 mb-6"><MathRenderer text={question.stem} /></h4>
                  
                  <div className="grid gap-4 sm:grid-cols-2 mb-6">
                    <div className={`rounded-xl p-4 ring-1 ${isCorrect ? 'bg-emerald-50 ring-emerald-100' : 'bg-rose-50 ring-rose-100'}`}>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">My Submission</p>
                      <p className={`text-[15px] font-black ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>{myAns}</p>
                    </div>
                    {!isCorrect && (
                      <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Correct Answer</p>
                        <p className="text-[15px] font-black text-emerald-700">{question.answer}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="rounded-2xl bg-white p-5 ring-1 ring-outline shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-widest text-accent mb-2">Expert Explanation</p>
                    <p className="text-[14px] leading-relaxed text-slate-600 font-medium"><MathRenderer text={question.explanation} /></p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
