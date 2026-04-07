import { SUBJECT_CONFIG } from '../../lib/question/subjectConfig';
import { normalizeToSubjectKey } from '../../lib/examUtils';

interface SubjectTagProps {
  subject?: string | null;
  title: string;
}

export function SubjectTag({ subject, title }: SubjectTagProps) {
  const subjectKey = normalizeToSubjectKey(subject, title);
  if (!subjectKey) return null;
  
  const label = SUBJECT_CONFIG[subjectKey].label;
  const colors = {
    social: 'bg-amber-100 text-amber-700 ring-amber-200/50',
    korean_history: 'bg-orange-100 text-orange-700 ring-orange-200/50',
    english: 'bg-blue-100 text-blue-700 ring-blue-200/50',
    math: 'bg-indigo-100 text-indigo-700 ring-indigo-200/50',
    science: 'bg-emerald-100 text-emerald-700 ring-emerald-200/50',
    korean: 'bg-rose-100 text-rose-700 ring-rose-200/50',
    general: 'bg-slate-100 text-slate-600 ring-slate-200/50'
  } as Record<string, string>;
  
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ring-1 ${colors[subjectKey] || colors.general}`}>
      {label}
    </span>
  );
}
