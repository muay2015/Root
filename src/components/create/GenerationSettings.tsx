import React from 'react';
import { SelectorPanel } from '../ui/SelectorPanel';
import { X } from 'lucide-react';
import type { SubjectKey, SelectionFormat } from '../../lib/question/subjectConfig';
import type { DifficultyLevel, MathGrade } from '../../lib/examTypes';
import { MIDDLE_MATH_CURRICULUM } from '../../lib/question/mathCurriculum';

interface GenerationSettingsProps {
  hideSelector: boolean;
  questionTypeOptions: string[];
  questionType: string;
  setQuestionType: (val: string) => void;
  formatOptions: string[];
  format: SelectionFormat;
  setFormat: (val: SelectionFormat) => void;
  difficulty: DifficultyLevel;
  setDifficulty: (val: DifficultyLevel) => void;
  count: number;
  setCount: (val: number) => void;
  subject: SubjectKey;
  mathGrade: MathGrade;
  generationTopic: string;
  setGenerationTopic: (val: string) => void;
}

export function GenerationSettings(props: GenerationSettingsProps) {
  const {
    hideSelector,
    questionTypeOptions,
    questionType,
    setQuestionType,
    formatOptions,
    format,
    setFormat,
    difficulty,
    setDifficulty,
    count,
    setCount,
    subject,
    mathGrade,
    generationTopic,
    setGenerationTopic
  } = props;

  // 헬퍼: 현재 선택된 단원들을 배열로 가져오기
  const getSelectedTopics = () => {
    return generationTopic ? generationTopic.split(',').map(t => t.trim()).filter(Boolean) : [];
  };

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      {!hideSelector && questionTypeOptions.length > 0 && (
        <SelectorPanel
          title={subject === 'middle_math' ? "세부 영역 선택" : "문항 유형 설계"}
          options={questionTypeOptions}
          value={questionType}
          onSelect={(val) => {
            if (subject === 'middle_math') {
              if (val === '전체') {
                setQuestionType('전체');
                // '전체'를 누르면 영역 선택뿐 아니라 테마/단원 선택도 초기화할지 결정 (일단 영역만 리셋)
              } else {
                const currentAreas = (questionType && questionType !== '전체') 
                  ? questionType.split(',').map(t => t.trim()).filter(Boolean) 
                  : [];
                
                if (currentAreas.includes(val)) {
                  // 토글 해제
                  const nextAreas = currentAreas.filter(a => a !== val);
                  setQuestionType(nextAreas.length > 0 ? nextAreas.join(', ') : '전체');
                } else {
                  // 토글 추가
                  setQuestionType([...currentAreas, val].join(', '));
                }
              }
            } else {
              setQuestionType(val);
            }
          }}
        >
          {/* 중등 수학일 경우 영역 선택 시 바로 아래에 세부 단원 칩 노출 */}
          {subject === 'middle_math' && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
              {(() => {
                const gradeData = MIDDLE_MATH_CURRICULUM.find(c => c.grade === mathGrade);
                if (!gradeData) return null;

                const selectedAreaNames = (questionType && questionType !== '전체') 
                  ? questionType.split(',').map(t => t.trim()).filter(Boolean) 
                  : ['전체'];
                
                // 표시할 영역 결정 (전체일 경우 아무것도 표시하지 않음 - 사용자가 선택할 때만 나타나도록)
                const areasToDisplay = selectedAreaNames.includes('전체') 
                  ? []
                  : gradeData.areas.filter(a => 
                      selectedAreaNames.some(s => s.replace(/\s/g, '').trim() === a.areaName.replace(/\s/g, '').trim())
                    );

                const currentTopics = getSelectedTopics();

                return areasToDisplay.map(areaData => (
                  <div key={areaData.areaName} className="space-y-3 p-4 rounded-2xl bg-slate-50/50 ring-1 ring-slate-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <span className="w-1 h-3 bg-blue-400 rounded-full"></span>
                        {areaData.areaName} 세부 단원
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const currentAreas = questionType ? questionType.split(',').map(t => t.trim()).filter(Boolean) : [];
                          // 정확한 비교를 위해 trim() 적용 후 필터링
                          const nextAreas = currentAreas.filter(a => a.trim() !== areaData.areaName.trim());
                          setQuestionType(nextAreas.length > 0 ? nextAreas.join(', ') : '전체');
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all active:scale-90"
                        title="영역 닫기"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={3} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {areaData.subTopics.length > 0 ? (
                        areaData.subTopics.map(topic => {
                          const isSelected = currentTopics.includes(topic);

                          return (
                            <button
                              key={topic}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isSelected) {
                                  // 선택 해제 (제거)
                                  const nextTopics = currentTopics.filter(t => t !== topic);
                                  setGenerationTopic(nextTopics.join(', '));
                                } else {
                                  // 선택 추가
                                  const nextTopics = [...currentTopics, topic];
                                  setGenerationTopic(nextTopics.join(', '));
                                }
                              }}
                              className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 shadow-sm ring-1 ${
                                isSelected 
                                  ? 'bg-blue-600 text-white ring-blue-600 shadow-md scale-105' 
                                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:ring-blue-100'
                              }`}
                            >
                              {isSelected ? '✓' : '+'} {topic}
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-[11px] text-slate-400 font-bold italic py-1 px-1">
                          준비된 세부 단원이 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}
              {(!questionType || questionType === '전체') && (
                <p className="text-[10px] font-bold text-slate-400 pl-1">
                  * 다른 영역을 선택하면 해당 영역의 세부 단원들이 아래에 추가로 나타납니다.
                </p>
              )}
            </div>
          )}
        </SelectorPanel>
      )}

      {!hideSelector && formatOptions.length > 0 && (
        <SelectorPanel
          title="지문 구성 방식"
          options={formatOptions}
          value={format}
          onSelect={(value) => setFormat(value as SelectionFormat)}
        />
      )}

      <SelectorPanel
        title="평가 난이도"
        options={['easy', 'medium', 'hard']}
        value={difficulty}
        onSelect={(value) => setDifficulty(value as DifficultyLevel)}
        labelMap={{ easy: '기초', medium: '표준', hard: '심화' }}
      />

      <section className="premium-card p-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">평가 문항 구성</h2>
        <div className="mt-6 flex flex-col gap-6">
          <input
            type="range"
            min={5}
            max={30}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-400">최소 5문항</span>
            <div className="flex h-12 w-24 items-center justify-center rounded-2xl bg-blue-50 text-xl font-black text-blue-600 ring-1 ring-blue-100">
              {count}
            </div>
            <span className="text-sm font-bold text-slate-400">최대 30문항</span>
          </div>
        </div>
      </section>
    </section>
  );
}
