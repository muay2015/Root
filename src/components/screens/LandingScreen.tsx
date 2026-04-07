import React from 'react';
import { Bot, NotebookPen, PlusCircle, Sparkles, ShieldCheck, Zap, BookOpen } from 'lucide-react';
import type { Screen } from '../../lib/examTypes';

interface LandingScreenProps {
  onNavigate: (screen: Screen) => void;
  isAnonymous: boolean;
}

export function LandingScreen({ onNavigate, isAnonymous }: LandingScreenProps) {
  return (
    <main className="min-h-screen bg-surface pb-28 pt-0">
      {/* Hero Section */}
      <section className="premium-gradient relative overflow-hidden px-4 pb-16 pt-28 text-white sm:px-6 sm:pb-24 sm:pt-40">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-10 -top-10 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute -right-10 bottom-10 h-96 w-96 rounded-full bg-blue-400 blur-3xl" />
        </div>
        
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur-md ring-1 ring-white/20">
            <Sparkles className="h-4 w-4 text-blue-300" />
            <span className="break-keep">문제집, 이제 그만 사세요</span>
          </div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight sm:text-6xl text-balance break-keep">
            시험 문제, <span className="text-blue-400">직접 만들어</span> 푸세요
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-blue-100/80 sm:text-xl break-keep text-balance">
            <span className="block sm:inline">단원이나 소제목만 입력하면</span>
            <span className="hidden sm:inline"> </span>
            <span className="block sm:inline">문제를 만들고, 풀고, 복습까지 이어집니다</span>
          </p>
          
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row px-4 sm:px-0">
            <button
              onClick={() => onNavigate('create')}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-white px-8 text-base font-bold text-primary shadow-xl transition-all hover:scale-105 hover:bg-blue-50 active:scale-95"
            >
              <PlusCircle className="h-5 w-5" />
              시험 만들기
            </button>
            <button
              onClick={() => onNavigate('saved')}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-white/10 px-8 text-base font-bold text-white backdrop-blur-md ring-1 ring-white/30 transition-all hover:bg-white/20 active:scale-95"
            >
              <NotebookPen className="h-5 w-5" />
              바로 풀어보기
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 mx-auto mt-[-40px] max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard 
            icon={<Zap className="text-amber-500" />}
            title="내 수준에 맞게 문제 생성"
            description="단원만 입력하면 난이도와 유형에 맞게 문제를 만들어줍니다"
          />
          <FeatureCard 
            icon={<ShieldCheck className="text-emerald-500" />}
            title="틀린 문제는 자동 정리"
            description="틀린 문제는 오답노트로 정리되고 다시 풀면서 자연스럽게 복습합니다"
          />
          <FeatureCard 
            icon={<BookOpen className="text-blue-500" />}
            title="필요한 만큼만 계속 연습"
            description="부족한 단원은 반복해서 풀고 문제집 구매를 줄일 수 있습니다"
          />
        </div>
      </section>

      {/* Identity Section */}
      <section className="mx-auto mt-24 max-w-4xl px-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-4xl break-keep">결과로 확인되는 공부</h2>
        <div className="mt-8 space-y-3 text-slate-600 text-base sm:text-lg leading-relaxed break-keep text-balance">
          <p>어떤 단원을 얼마나 이해했는지 확인하고</p>
          <p>부족한 부분은 반복해서 보완할 수 있습니다</p>
          <p className="mt-6 font-semibold text-slate-900 border-t border-slate-100 pt-6">
            스스로 학습하고, 부모는 결과를 확인할 수 있습니다
          </p>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="premium-card flex flex-col items-center p-8 text-center ring-1 ring-slate-100 hover:shadow-2xl transition-all duration-300">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100 group-hover:bg-white transition-colors">
        {icon}
      </div>
      <h3 className="mb-3 text-lg font-bold text-slate-900 break-keep">{title}</h3>
      <p className="text-sm leading-6 text-slate-500 break-keep text-balance">{description}</p>
    </div>
  );
}
