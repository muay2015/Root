import React from 'react';
import { Sparkles, Upload, ArrowRight } from 'lucide-react';
import type { Screen } from '../../lib/examTypes';

interface CreateSelectionScreenProps {
  onNavigate: (screen: Screen) => void;
}

export function CreateSelectionScreen({ onNavigate }: CreateSelectionScreenProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
          문제 생성 방식을 <br className="sm:hidden" />선택하세요
        </h1>
        <p className="mt-4 text-lg font-medium text-slate-500">
          AI와 함께 새로운 문제를 만들거나, <br className="sm:hidden" />보유한 자료를 디지털로 전환하세요.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-6">
        {/* 지능형 생성 카드 */}
        <button
          onClick={() => onNavigate('create')}
          className="group relative flex flex-col items-start overflow-hidden rounded-[2rem] bg-white p-6 text-left shadow-premium transition-all hover:-translate-y-1 hover:shadow-2xl sm:p-8"
        >
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-blue-50 opacity-0 transition-opacity group-hover:opacity-100" />
          
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition-colors group-hover:bg-blue-600 group-hover:text-white sm:mb-6 sm:h-14 sm:w-14">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>

          <h3 className="text-lg font-black text-slate-900 sm:text-xl">지능형 생성</h3>
          <p className="mt-2 text-[14px] font-medium leading-relaxed text-slate-500 break-keep sm:mt-4 sm:text-base">
            학습 목표에 맞춰 문제를 자동으로 구성합니다.
          </p>

          <div className="mt-auto pt-6 flex items-center font-black text-blue-600 sm:pt-8">
            <span>시작하기</span>
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </button>

        {/* 이미지 업로드 카드 (NEW) */}
        <button
          onClick={() => onNavigate('image-scan')}
          className="group relative flex flex-col items-start overflow-hidden rounded-[2rem] bg-white p-6 text-left shadow-premium transition-all hover:-translate-y-1 hover:shadow-2xl border-2 border-transparent hover:border-purple-200 sm:p-8"
        >
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-purple-50 opacity-0 transition-opacity group-hover:opacity-100" />

          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 ring-1 ring-purple-100 transition-colors group-hover:bg-purple-600 group-hover:text-white sm:mb-6 sm:h-14 sm:w-14">
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <h3 className="text-lg font-black text-slate-900 sm:text-xl">기출문제 맞춤 생성</h3>
          <p className="mt-2 text-[14px] font-medium leading-relaxed text-slate-500 break-keep sm:mt-4 sm:text-base">
            실제 기출 모의고사나 수능 문제의 사진을 찍거나 이미지를 업로드하세요. AI가 즉시 나만의 디지털 기출 문제집으로 변환해 드립니다.
          </p>

          <div className="mt-auto pt-6 flex items-center font-black text-purple-600 sm:pt-8">
            <span>바로 만들기</span>
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </button>
      </div>

      <div className="mt-20 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-6 py-3 text-sm font-bold text-slate-400 ring-1 ring-slate-100">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          초정밀 AI 문항 추출 엔진 가동 중
        </div>
      </div>
    </div>
  );
}
