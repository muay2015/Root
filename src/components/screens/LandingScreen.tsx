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
            중고등 내신 및 수능 대비<br />
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
                className="inline-flex h-16 items-center justify-center gap-2 rounded-2xl bg-white px-10 text-lg font-black text-primary shadow-2xl shadow-primary/20 transition-all hover:scale-105 hover:bg-blue-50 active:scale-95"
              >
                <PlusCircle className="h-6 w-6" />
                무료 문제 5개 만들기
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Feature Cards Section */}
      <section className="relative z-10 mx-auto mt-[-40px] max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard 
            title={<>난이도·문항 수,<br />내가 직접 설정</>}
            description="쉬운 문제로 개념 확인, 어려운 문제로 실전 대비 필요한 수준으로 원하는 만큼 바로 생성"
          />
          <FeatureCard 
            title={<>오답노트,<br />직접 만들 필요 없어요</>}
            description="틀린 문제는 해설과 함께 오답노트에 자동 저장되어 왜 틀렸는지 바로 확인하고, 이해되면 언제든 꺼내서 다시 풀 수 있어요"
          />
          <FeatureCard 
            title={<>기출문제,<br />나만의 맞춤 생성</>}
            description="실제 기출 모의고사나 수능 문제의 사진을 찍거나 이미지를 업로드하세요. AI가 즉시 나만의 디지털 기출 문제집으로 변환해 드립니다."
          />
        </div>
      </section>

      {/* 3. Pricing Section */}
      <section className="mx-auto mt-32 max-w-6xl px-4 sm:px-6">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">합리적인 학습 비용</h2>
          <p className="mt-4 text-lg font-medium text-slate-500">문제집 1/3 값으로 누리는 무제한 학습 경험</p>
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
              종이로 문제를 푸는 시대는<br />
              얼마 남지 않았습니다.
            </h2>
            <p className="mx-auto mt-8 max-w-2xl text-lg font-medium text-blue-100/80 leading-relaxed break-keep">
              난이도도, 문항 수도 직접 고르고 AI가 그 자리에서 시험지를 만들어줘요. <br className="hidden sm:block" />
              풀고 나서 버려야 하는 종이 문제집과는 달리, 틀린 문제는 완전히 이해할 때까지 반복돼요.
            </p>
            
            <div className="mt-12 inline-block rounded-2xl bg-white/10 px-6 py-4 backdrop-blur-md ring-1 ring-white/20">
              <p className="text-xl font-bold text-orange-200 break-keep text-balance">
                "문제집 살 돈, 아이 미래에 쓰는 건 어때요?"
              </p>
            </div>

            <div className="mt-12 flex justify-center">
              <button
                onClick={() => onNavigate(isAnonymous ? 'account' : 'create')}
                className="inline-flex h-16 items-center justify-center gap-3 rounded-2xl bg-white px-12 text-xl font-black text-slate-900 shadow-2xl transition-all hover:scale-105 hover:shadow-white/20 active:scale-95"
              >
                지금 무료로 시작하기
                <ArrowRight className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ title, description }: { title: React.ReactNode, description: string }) {
  return (
    <div className="premium-card p-8 sm:p-10 group transition-all duration-300 border-blue-100/50 shadow-sm hover:shadow-md">
      <h3 className="mb-6 text-xl sm:text-2xl font-black text-slate-900 break-keep leading-tight min-h-[3.5em] flex items-end">
        {title}
      </h3>
      <div className="mb-6 h-[1px] w-full bg-slate-100" />
      <p className="text-[15px] sm:text-[16px] font-medium leading-[1.8] text-slate-500 break-keep text-balance">
        {description}
      </p>
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
