import React from 'react';
import { 
  PlusCircle, 
  NotebookPen, 
  Sparkles, 
  Zap, 
  History, 
  Monitor, 
  CheckCircle2, 
  ArrowRight,
  Target,
  Check,
  ChevronDown
} from 'lucide-react';
import type { Screen } from '../../lib/examTypes';

interface LandingScreenProps {
  onNavigate: (screen: Screen) => void;
  isAnonymous: boolean;
}

export function LandingScreen({ onNavigate, isAnonymous }: LandingScreenProps) {
  return (
    <main className="min-h-screen bg-surface pb-16 pt-0">
      {/* 1. Hero Section */}
      <section className="premium-gradient relative overflow-hidden px-4 pb-12 pt-20 text-white sm:px-6 sm:pb-20 sm:pt-32">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-10 -top-10 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute -right-10 bottom-10 h-96 w-96 rounded-full bg-blue-400 blur-3xl" />
        </div>
        
        <div className="relative mx-auto max-w-5xl text-center">
          {/* Badge */}
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black backdrop-blur-md ring-1 ring-white/20">
              <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
              <span>맞춤형 문제 생성 전문 AI</span>
            </span>
          </div>

          <h1 className="font-headline text-3xl font-black tracking-tight sm:text-6xl text-balance break-keep leading-[1.15]">
            중·고등 내신 및 수능 대비<br />
            <span className="text-blue-300">AI 문제은행</span>
          </h1>

          <p className="mt-10 text-lg font-bold text-orange-200 sm:text-2xl break-keep">
            한 번 풀고 버릴 문제집에 15,000원이 아깝지 않으세요?
          </p>
          
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="flex flex-col items-center gap-3">
              <p className="text-base leading-relaxed text-blue-100 sm:text-2xl break-keep text-balance font-black">
                지금 바로 과목, 난이도 설정만 하면 문제가 생성이 됩니다.
              </p>
              <div className="flex flex-col items-center gap-1 py-1">
                <ChevronDown className="h-5 w-5 text-blue-400/40 animate-arrow-down" style={{ animationDelay: '0s' }} strokeWidth={2.5} />
                <ChevronDown className="h-6 w-6 text-blue-300/70 animate-arrow-down" style={{ animationDelay: '0.15s' }} strokeWidth={2.5} />
                <ChevronDown className="h-7 w-7 text-blue-200 animate-arrow-down" style={{ animationDelay: '0.3s' }} strokeWidth={2.5} />
              </div>
            </div>

            <div className="flex flex-col justify-center gap-4 sm:flex-row w-full px-4 sm:px-0">
              <button
                onClick={() => onNavigate('create-selection')}
                className="inline-flex h-14 sm:h-16 items-center justify-center gap-2 rounded-2xl bg-white px-6 sm:px-10 text-base sm:text-lg font-black text-primary shadow-2xl shadow-primary/20 transition-all hover:scale-105 hover:bg-blue-50 active:scale-95"
              >
                <PlusCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                무료 문제 5개 만들기
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-[-40px] max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard 
            titleMain="난이도 · 문항 수"
            titleSub="내가 직접 설정"
            items={[
              "쉬운 문제로 개념 확인",
              "어려운 문제로 실전 대비",
              "원하는 만큼 실시간 생성"
            ]}
          />
          <FeatureCard 
            titleMain="오답노트"
            titleSub="자동 저장"
            items={[
              "해설과 함께 자동 저장",
              "오답 원인 즉시 확인",
              "언제든 취약점 보완 풀기"
            ]}
          />
          <FeatureCard 
            titleMain="기출문제"
            titleSub="하이브리드 문제 생성"
            items={[
              "사진 촬영 및 이미지 업로드",
              "AI가 디지털 문제로 변환",
              "나만의 맞춤 기출 완성"
            ]}
          />
        </div>
      </section>

      {/* 3. Pricing Section */}
      <section className="mx-auto mt-32 max-w-6xl px-4 sm:px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">합리적인 학습 비용</h2>
          <p className="mt-4 text-lg font-medium text-slate-500">문제집 1/3 값으로 누리는<br className="sm:hidden" /> 무제한 학습 경험</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* FREE Plan */}
          <PricingCard 
            title="무료"
            price="0"
            description="영원히 무료"
            features={[
              '매일 문제 5개 생성',
              '한 달 총 150문제 무료',
              '난이도 설정 (문항 수 5개 고정)',
              '오답노트 자동 생성'
            ]}
            onAction={() => onNavigate('create')}
            actionText="시작하기"
          />

          {/* STANDARD Plan */}
          <PricingCard 
            title="스탠다드"
            price="5,000"
            description="보너스 300개"
            badge="문제집 1/3 값으로 450문제"
            features={[
              '매달 총 450문제 이용',
              '무료 150 + 보너스 300개',
              '매일 무료 5개 우선 소진',
              '난이도·문항 수 자유 설정',
              '개인별 오답 분석'
            ]}
            onAction={() => onNavigate(isAnonymous ? 'account' : 'create')}
            actionText="구입하기"
          />

          {/* PREMIUM Plan */}
          <PricingCard 
            title="인기·베스트"
            price="10,000"
            description="보너스 700개"
            badge="문제집 2/3 값으로 850문제"
            isPopular
            features={[
              '매달 총 850문제 이용',
              '무료 150 + 보너스 700개',
              '매일 무료 5개 우선 소진',
              '난이도·문항 수 자유 설정',
              '문제집 구매 완전히 대체'
            ]}
            footerText="문제당 약 11원, 문제집보다 99% 저렴"
            onAction={() => onNavigate(isAnonymous ? 'account' : 'create')}
            actionText="선택하기"
          />
        </div>
      </section>

      {/* 4. Bottom Final CTA Section */}
      <section className="mx-auto mt-40 max-w-5xl px-4 sm:px-6 pb-20">
        <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 sm:p-16 text-center text-white shadow-3xl ring-1 ring-white/10">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-500 blur-[100px]" />
            <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-indigo-500 blur-[100px]" />
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl font-black sm:text-5xl leading-tight break-keep text-white">
              가방 속 무거운 짐은 들어내고,<br />
              공부는 더 가볍게.
            </h2>
            <p className="mx-auto mt-8 max-w-2xl text-lg font-medium text-blue-100/80 leading-relaxed break-keep">
              필요한 문제만, 필요한 만큼.<br />
              AI가 바로 만들어주는 나만의 시험지.
            </p>
            
            <div className="mt-12 inline-block rounded-2xl bg-white/10 px-6 py-4 backdrop-blur-md ring-1 ring-white/20">
              <p className="text-xl font-bold text-orange-200 break-keep text-balance">
                "문제집 살 돈, 아이 미래에 쓰는 건 어때요?"
              </p>
            </div>

            <div className="mt-12 flex justify-center">
              <button
                onClick={() => onNavigate(isAnonymous ? 'account' : 'create')}
                className="inline-flex h-14 sm:h-16 items-center justify-center gap-3 rounded-2xl bg-white px-8 sm:px-12 text-lg sm:text-xl font-black text-slate-900 shadow-2xl transition-all hover:scale-105 hover:shadow-white/20 active:scale-95"
              >
                무료로 시작하기
                <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 animate-arrow-right" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ titleMain, titleSub, items }: { titleMain: string, titleSub: string, items: string[] }) {
  return (
    <div className="premium-card p-8 sm:p-10 group transition-all duration-300 border-blue-100/50 shadow-sm hover:shadow-md">
      <div className="mb-6 min-h-[4.5em] flex flex-col justify-end">
        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
          {titleMain}
        </h3>
        <div className="mt-1 flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-700">
          <span className="text-slate-900 shrink-0">→</span>
          <span className="whitespace-nowrap">{titleSub}</span>
        </div>
      </div>
      <div className="mb-6 h-[1px] w-full bg-slate-100" />
      <ul className="space-y-4">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <div className="mt-1 flex-shrink-0">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </div>
            </div>
            <span className="text-[15px] sm:text-[16px] font-bold leading-relaxed text-slate-600 break-keep">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricingCard({ 
  title, 
  price, 
  description, 
  features, 
  onAction, 
  actionText,
  badge,
  isPopular,
  footerText
}: { 
  title: string;
  price: string;
  description: string;
  features: string[];
  onAction: () => void;
  actionText: string;
  badge?: string;
  isPopular?: boolean;
  footerText?: string;
}) {
  return (
    <div className={`premium-card p-8 flex flex-col h-full relative ${isPopular ? 'ring-2 ring-primary shadow-2xl z-10' : ''}`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-[11px] font-black text-white uppercase tracking-widest">
          인기 · 베스트
        </div>
      )}
      
      <div className="mb-8">
        <h3 className={`text-sm font-black uppercase tracking-widest ${isPopular ? 'text-primary' : 'text-slate-400'}`}>{title}</h3>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-2xl font-black text-slate-900">₩</span>
          <span className="text-5xl font-black text-slate-900">{price}</span>
        </div>
        <p className="mt-2 text-sm font-bold text-slate-500">{description}</p>
        {badge && (
          <div className="mt-4 inline-block rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-600 ring-1 ring-blue-100">
            {badge}
          </div>
        )}
      </div>

      <div className="mb-10 flex-1 space-y-4">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <CheckCircle2 className={`h-5 w-5 ${isPopular ? 'text-primary' : 'text-slate-300'}`} />
            <span className="text-sm font-bold text-slate-600">{feature}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onAction}
        className={`w-full py-4 rounded-2xl text-base font-black transition-all active:scale-95 ${
          isPopular 
            ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-container' 
            : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
        }`}
      >
        {actionText}
      </button>

      {footerText && (
        <p className="mt-4 text-center text-[11px] font-black text-blue-600">
          → {footerText}
        </p>
      )}
    </div>
  );
}
