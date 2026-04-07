import React, { type ChangeEvent } from 'react';
import { SUBJECT_CONFIG, getSubjectFormats, getSubjectQuestionTypes, getSubjectSelectionDefaults, getSubjectSelectionLabel, usesNoSelector, type SelectionFormat, type SubjectKey } from '../../lib/question/subjectConfig';
import { getDifficultyLabel, getSchoolLevelLabel } from '../../lib/examUtils';
import type { BuilderMode, DifficultyLevel, SchoolLevel } from '../../lib/examTypes';
import { SelectorPanel } from '../ui/SelectorPanel';
import { UploadPanel } from '../ui/UploadPanel';
import { Sparkles, FileUp, Settings2, CheckCircle2 } from 'lucide-react';
import { parseFileToText } from '../../lib/fileParser';

export interface CreateScreenProps {
  mode: BuilderMode;
  setMode: (value: BuilderMode) => void;
  subject: SubjectKey;
  onSelectSubject: (value: SubjectKey) => void;
  questionType: string;
  setQuestionType: (value: string) => void;
  format: SelectionFormat;
  setFormat: (value: SelectionFormat) => void;
  difficulty: DifficultyLevel;
  setDifficulty: (value: DifficultyLevel) => void;
  schoolLevel: SchoolLevel;
  setSchoolLevel: (value: SchoolLevel) => void;
  count: number;
  setCount: (value: number) => void;
  generationTopic: string;
  setGenerationTopic: (value: string) => void;
  materialText: string;
  setMaterialText: (value: string) => void;
  parsedFiles: string[];
  setParsedFiles: React.Dispatch<React.SetStateAction<string[]>>;
  questionFiles: string[];
  answerFiles: string[];
  setQuestionFiles: (value: string[]) => void;
  setAnswerFiles: (value: string[]) => void;
  ready: boolean;
  isGenerating: boolean;
  generationError: string | null;
  onGenerate: () => void;
}

export function CreateScreen(props: CreateScreenProps) {
  const {
    mode,
    setMode,
    subject,
    onSelectSubject,
    questionType,
    setQuestionType,
    format,
    setFormat,
    difficulty,
    setDifficulty,
    schoolLevel,
    setSchoolLevel,
    count,
    setCount,
    generationTopic,
    setGenerationTopic,
    materialText,
    setMaterialText,
    parsedFiles,
    setParsedFiles,
    questionFiles,
    answerFiles,
    setQuestionFiles,
    setAnswerFiles,
    ready,
    isGenerating,
    generationError,
    onGenerate,
  } = props;

  const [isParsing, setIsParsing] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successFile, setSuccessFile] = React.useState<string | null>(null);

  const selectionLabel = getSubjectSelectionLabel(subject, questionType, format);
  const hideSelector = usesNoSelector(subject);
  const questionTypeOptions = getSubjectQuestionTypes(subject);
  const formatOptions = getSubjectFormats(subject);

  const readyHint = ready
    ? '설계가 완료되었습니다. 평가 생성을 시작할 수 있습니다.'
    : mode === 'upload'
      ? '유효한 문항 데이터와 정답지가 모두 필요합니다.'
      : '주제 또는 핵심 단원명을 입력해 주세요.';

  const handleSelectSubject = (key: SubjectKey) => {
    onSelectSubject(key);
    const defaults = getSubjectSelectionDefaults(key);
    setQuestionType(defaults.questionType);
    setFormat(defaults.format);
  };

  React.useEffect(() => {
    if (!SUBJECT_CONFIG[subject].supportedLevels.includes(schoolLevel)) {
      const firstSupported = (Object.keys(SUBJECT_CONFIG) as SubjectKey[]).find(
        (key) => SUBJECT_CONFIG[key].supportedLevels.includes(schoolLevel)
      );
      if (firstSupported) {
        handleSelectSubject(firstSupported);
      }
    }
  }, [schoolLevel]);

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
    target: 'question' | 'answer',
  ) => {
    const files = event.target.files ? Array.from<File, string>(event.target.files, (file) => file.name) : [];
    if (target === 'question') {
      setQuestionFiles(files);
    } else {
      setAnswerFiles(files);
    }
  };

  return (
    <main className="min-h-screen bg-surface px-4 pb-28 pt-8 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header Section */}
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">지능형 문제 생성</h1>
          <p className="text-sm font-medium text-slate-500">
            학습 목표에 최적화된 평가 환경을 구성합니다. 모든 문항은 정밀 파싱 로직을 거칩니다.
          </p>
        </header>

        {/* 생성 모드 선택 */}
        <section className="premium-card p-6 border-none shadow-lg shadow-blue-900/5">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">설계 방식 선택</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ModeButton 
              active={mode === 'ai'} 
              onClick={() => setMode('ai')} 
              icon={<Sparkles className="h-5 w-5" />}
              label="AI 지능형 생성" 
              sub="주제 기반 자동 출제"
            />
            <ModeButton 
              active={mode === 'upload'} 
              onClick={() => setMode('upload')} 
              icon={<FileUp className="h-5 w-5" />}
              label="데이터 업로드" 
              sub="기존 자료 디지털화"
            />
          </div>
        </section>

        {/* 대상 학년/과정 선택 */}
        <section className="premium-card p-6">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4">대상 학년/과정</h2>
          <div className="flex flex-wrap gap-2.5">
            {(['middle', 'high', 'csat'] as SchoolLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setSchoolLevel(level)}
                className={`rounded-2xl px-6 py-3.5 text-sm font-bold transition-all duration-300 ${
                  schoolLevel === level 
                    ? 'premium-gradient text-white shadow-md' 
                    : 'bg-slate-50 text-slate-600 ring-1 ring-outline hover:bg-white hover:shadow-sm'
                }`}
              >
                {{ middle: '중등 과정', high: '고등 과정', csat: '수능/대입' }[level]}
              </button>
            ))}
          </div>
        </section>

        {/* 과목 선택 */}
        <section className="premium-card p-6">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4">학습 카테고리</h2>
          <div className="flex flex-wrap gap-2.5">
            {(Object.keys(SUBJECT_CONFIG) as SubjectKey[])
              .filter((key) => SUBJECT_CONFIG[key].supportedLevels.includes(schoolLevel))
              .map((key) => (
              <button
                key={key}
                onClick={() => handleSelectSubject(key)}
                className={`rounded-2xl px-6 py-3.5 text-sm font-bold transition-all duration-300 ${
                  subject === key 
                    ? 'premium-gradient text-white shadow-md' 
                    : 'bg-slate-50 text-slate-600 ring-1 ring-outline hover:bg-white hover:shadow-sm'
                }`}
              >
                {SUBJECT_CONFIG[key].label}
              </button>
            ))}
          </div>
        </section>

        {/* 세부 구성 설정 */}
        <section className="grid gap-6 lg:grid-cols-2">
          {!hideSelector && questionTypeOptions.length > 0 && (
            <SelectorPanel
              title="문항 유형 설계"
              options={questionTypeOptions}
              value={questionType}
              onSelect={setQuestionType}
            />
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

        {/* 상세 정보 입력 */}
        {mode === 'upload' ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <UploadPanel title="평가 문항지" files={questionFiles} onChange={(event) => handleFileChange(event, 'question')} />
            <UploadPanel title="정답/해설지" files={answerFiles} onChange={(event) => handleFileChange(event, 'answer')} />
          </section>
        ) : (
          <section className="space-y-6">
            <section className="premium-card p-6">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">핵심 단원 및 주제 (필수)</h2>
              <input
                value={generationTopic}
                onChange={(event) => setGenerationTopic(event.target.value)}
                placeholder={SUBJECT_CONFIG[subject].exampleTopic}
                className="mt-4 w-full rounded-2xl bg-slate-50 border-none px-5 py-4 text-[15px] font-medium text-slate-900 outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-accent transition-all"
              />
            </section>

            <section className="premium-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">학습 내용 추가 (선택)</h2>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-600 ring-1 ring-blue-100 hover:bg-blue-100 transition-all active:scale-95 shadow-sm">
                  <FileUp className="h-4 w-4" />
                  <span>자료 업로드</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".txt,.md,.json,.csv,.pdf,.docx,.hwp,.hwpx"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log(`[FileParser] Start parsing: ${file.name}`);
                        try {
                          setIsParsing(true);
                          setSuccessFile(null);
                          setShowSuccess(false);
                          
                          const separator = materialText ? '\n\n' : '';
                          const content = await parseFileToText(file);
                          console.log(`[FileParser] Content extracted (${content.length} chars)`);
                          
                          setMaterialText(`${materialText}${separator}[자료: ${file.name}]\n${content}`);
                          setParsedFiles(prev => {
                            const next = Array.from(new Set([...prev, file.name]));
                            console.log(`[FileParser] Current parsed files: ${next.join(', ')}`);
                            return next;
                          });
                          
                          setSuccessFile(file.name);
                          setShowSuccess(true);
                          setTimeout(() => setShowSuccess(false), 4000);
                        } catch (error) {
                          console.error('[FileParser] Error:', error);
                          alert(error instanceof Error ? error.message : '파일 파싱 오류');
                        } finally {
                          setIsParsing(false);
                        }
                      }
                    }}
                  />
                </label>
              </div>
              
              {/* 파일 분석 진행/완료 표시부 (강제 노출 테스트 포함) */}
              <div className="min-h-[40px] flex flex-col gap-2 mb-2">
                {isParsing && (
                  <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-[13px] font-bold text-blue-600 animate-pulse ring-1 ring-blue-100 shadow-sm">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    <span>AI가 자료를 읽고 있습니다... (잠시만 기다려 주세요)</span>
                  </div>
                )}

                {showSuccess && (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-500 px-5 py-3 text-[13px] font-black text-white shadow-lg shadow-emerald-900/10 animate-in zoom-in-95 slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" strokeWidth={3} />
                      <span>업로드 완료: {successFile}</span>
                    </div>
                    <div className="h-1 w-12 rounded-full bg-white/30 overflow-hidden">
                      <div className="h-full bg-white animate-[progress_4s_linear_forwards]" />
                    </div>
                  </div>
                )}
                
                {parsedFiles.length > 0 ? (
                  <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1">
                    {parsedFiles.map((name, i) => (
                      <div key={i} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-600 ring-1 ring-emerald-100 shadow-sm">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>학습자료 반영됨: {name}</span>
                      </div>
                    ))}
                  </div>
                ) : !isParsing && (
                  <div className="text-[11px] font-bold text-slate-300 ml-1">
                    자료를 업로드하면 여기에 표시됩니다.
                  </div>
                )}
              </div>
              <textarea
                value={materialText}
                onChange={(event) => setMaterialText(event.target.value)}
                placeholder="특정 지문이나 학습 내용을 문제에 반영하고 싶을 때 입력하세요. 파일을 업로드하여 내용을 채울 수도 있습니다."
                className="min-h-40 w-full rounded-2xl bg-slate-50 border-none px-5 py-5 text-[15px] font-medium leading-relaxed text-slate-900 outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-accent transition-all resize-none"
              />
            </section>
          </section>
        )}

        {/* 생성 실행바 */}
        <section className={`premium-card p-6 border-none transition-all duration-500 overflow-hidden ${ready ? 'ring-2 ring-accent shadow-xl shadow-blue-900/10' : 'opacity-80'}`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${ready ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">최종 평가 구성 확인</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                  <ConfigTag label={SUBJECT_CONFIG[subject].label} />
                  {selectionLabel && <ConfigTag label={selectionLabel} />}
                  <ConfigTag label={getSchoolLevelLabel(schoolLevel)} />
                  <ConfigTag label={getDifficultyLabel(difficulty)} />
                  <ConfigTag label={`${count}문항`} />
                </div>
                <p className={`mt-2 text-xs font-bold ${ready ? 'text-blue-500' : 'text-slate-400'}`}>{readyHint}</p>
              </div>
            </div>
            
            <button
              onClick={onGenerate}
              disabled={!ready || isGenerating}
              className="relative flex h-14 items-center justify-center gap-3 rounded-2xl premium-gradient px-10 text-base font-black text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-95 disabled:scale-100 disabled:bg-slate-200 disabled:shadow-none disabled:cursor-not-allowed group overflow-hidden"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>AI 알고리즘 구동 중...</span>
                </div>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>문제 생성 시작하기</span>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                </>
              )}
            </button>
          </div>
          {generationError && (
             <div className="mt-4 rounded-xl bg-red-50 p-4 text-[13px] font-bold text-red-600 ring-1 ring-red-100">
               {generationError}
             </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ModeButton({ active, onClick, icon, label, sub }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, sub: string }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-2 rounded-2xl p-6 transition-all duration-300 ${
        active 
          ? 'bg-blue-50 ring-2 ring-accent' 
          : 'bg-white ring-1 ring-slate-100 hover:bg-slate-50'
      }`}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${active ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
        {icon}
      </div>
      <div className="text-center">
        <p className={`text-sm font-black ${active ? 'text-primary' : 'text-slate-600'}`}>{label}</p>
        <p className="text-[11px] font-bold text-slate-400 mt-0.5">{sub}</p>
      </div>
      {active && (
        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
          <CheckCircle2 className="h-3 w-3" strokeWidth={4} />
        </div>
      )}
    </button>
  );
}

function ConfigTag({ label }: { label: string }) {
  return (
    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
      {label}
    </span>
  );
}
