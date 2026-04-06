// 정보 카드 컴포넌트
import type { ReactNode } from 'react';

export function InfoCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <section className="border border-slate-200 bg-white px-5 py-6 text-left">
      <div className="mb-4 inline-flex border border-slate-200 bg-slate-50 p-3">{icon}</div>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
    </section>
  );
}
