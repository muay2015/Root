import React from 'react';
import { type SubjectKey, SUBJECT_CONFIG, CATEGORY_CONFIG, type SubjectCategory } from '../../lib/question/subjectConfig';
import { type SchoolLevel, type BuilderMode, type DetailedGrade } from '../../lib/examTypes';

interface SubjectSelectorProps {
  mode: BuilderMode;
  schoolLevel: SchoolLevel;
  detailedGrade: DetailedGrade;
  subject: SubjectKey;
  onSelectSubject: (key: SubjectKey) => void;
}

export function SubjectSelector({ mode, schoolLevel, detailedGrade, subject, onSelectSubject }: SubjectSelectorProps) {
  // 현재 선택된 과목의 카테고리를 초기 영역으로 설정
  const initialCategory = SUBJECT_CONFIG[subject].category;
  const [activeCategory, setActiveCategory] = React.useState<SubjectCategory>(initialCategory);

  // 모드나 학년이 바뀔 때 현재 선택된 과목이 바뀔 수 있으므로 카테고리 동기화
  React.useEffect(() => {
    setActiveCategory(SUBJECT_CONFIG[subject].category);
  }, [subject]);

  // 현재 모드와 학년에서 사용 가능한 카테고리들 추출
  const availableCategories = (Object.keys(CATEGORY_CONFIG) as SubjectCategory[]).filter((cat) => {
    const subjectsInCat = (Object.keys(SUBJECT_CONFIG) as SubjectKey[]).filter(
      (key) => SUBJECT_CONFIG[key].category === cat
    );
    
    return subjectsInCat.some((key) => {
      const config = SUBJECT_CONFIG[key];
      if (mode === 'csat') {
        return config.supportedLevels.includes('high');
      }
      return config.supportedLevels.includes(schoolLevel) && config.supportedGrades.includes(detailedGrade);
    });
  });

  // 선택된 카테고리 내에서 사용 가능한 세부 과목들 추출
  const availableSubjects = (Object.keys(SUBJECT_CONFIG) as SubjectKey[])
    .filter((key) => SUBJECT_CONFIG[key].category === activeCategory)
    .filter((key) => {
      const config = SUBJECT_CONFIG[key];
      if (mode === 'csat') {
        return config.supportedLevels.includes('high');
      }
      return config.supportedLevels.includes(schoolLevel) && config.supportedGrades.includes(detailedGrade);
    });

  const handleCategoryClick = (cat: SubjectCategory) => {
    setActiveCategory(cat);
    
    // 해당 카테고리의 첫 번째 유효 과목 찾기
    const firstSubjectInCat = (Object.keys(SUBJECT_CONFIG) as SubjectKey[])
      .filter((key) => SUBJECT_CONFIG[key].category === cat)
      .find((key) => {
        const config = SUBJECT_CONFIG[key];
        if (mode === 'csat') {
          return config.supportedLevels.includes('high');
        }
        return config.supportedLevels.includes(schoolLevel) && config.supportedGrades.includes(detailedGrade);
      });

    if (firstSubjectInCat && firstSubjectInCat !== subject) {
      onSelectSubject(firstSubjectInCat);
    }
  };

  return (
    <section className="premium-card p-6 space-y-6">
      {/* 1단계: 영역(Category) 선택 */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
          영역 선택
        </h2>
        <div className="flex flex-wrap gap-2">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300 ${
                activeCategory === cat
                  ? 'bg-slate-900 text-white shadow-lg scale-105'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:ring-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>{CATEGORY_CONFIG[cat].icon}</span>
              <span>{CATEGORY_CONFIG[cat].label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2단계: 세부 과목 선택 */}
      <div className="pt-4 border-t border-slate-100">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <span className="w-1 h-3 bg-emerald-500 rounded-full"></span>
          세부 과목 선택
        </h2>
        <div className="flex flex-wrap gap-2.5">
          {availableSubjects.map((key) => (
            <button
              key={key}
              onClick={() => onSelectSubject(key)}
              className={`rounded-2xl px-6 py-3.5 text-sm font-bold transition-all duration-300 ${
                subject === key 
                  ? 'premium-gradient text-white shadow-md scale-105 active:scale-95' 
                  : 'bg-slate-50 text-slate-600 ring-1 ring-outline hover:bg-white hover:ring-slate-300 hover:shadow-sm'
              }`}
            >
              {SUBJECT_CONFIG[key].label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
