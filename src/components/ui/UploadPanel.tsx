// 파일 업로드 패널 컴포넌트
import React, { type ChangeEvent } from 'react';
import { Upload, FileCheck } from 'lucide-react';

export function UploadPanel({
  title,
  files,
  onChange,
}: {
  title: string;
  files: string[];
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const hasFiles = files.length > 0;
  
  return (
    <section className="premium-card p-5 sm:p-6 ring-1 ring-slate-100/50 bg-white">
      <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">{title}</h2>
      <div className="mt-4">
        <label className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-all cursor-pointer ${
          hasFiles ? 'border-accent/20 bg-accent/5' : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
        }`}>
          <input type="file" className="hidden" onChange={onChange} multiple />
          
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${hasFiles ? 'bg-accent/10 text-accent' : 'bg-white text-slate-400 ring-1 ring-outline'}`}>
            {hasFiles ? <FileCheck className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
          </div>
          
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700">
              {hasFiles ? `${files.length}개의 파일 선택됨` : '평가 문항 데이터 업로드'}
            </p>
            <p className="mt-1 text-[12px] text-slate-400">PDF, 이미지, HWP 등 지원</p>
          </div>
        </label>
        
        {hasFiles && (
          <div className="mt-3 space-y-1">
            {files.map((name, i) => (
              <div key={i} className="truncate text-[12px] font-medium text-slate-500">• {name}</div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
