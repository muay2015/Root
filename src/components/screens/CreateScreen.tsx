import type { ChangeEvent } from 'react';
import { SUBJECT_CONFIG, getSubjectFormats, getSubjectQuestionTypes, getSubjectSelectionLabel, usesNoSelector, type SelectionFormat, type SubjectKey } from '../../lib/question/subjectConfig';
import { getDifficultyLabel, getSchoolLevelLabel } from '../../lib/examUtils';
import type { BuilderMode, DifficultyLevel, SchoolLevel } from '../../lib/examTypes';
import { SelectorPanel } from '../ui/SelectorPanel';
import { UploadPanel } from '../ui/UploadPanel';

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
    questionFiles,
    answerFiles,
    setQuestionFiles,
    setAnswerFiles,
    ready,
    isGenerating,
    generationError,
    onGenerate,
  } = props;

  const selectionLabel = getSubjectSelectionLabel(subject, questionType, format);
  const hideSelector = usesNoSelector(subject);
  const questionTypeOptions = getSubjectQuestionTypes(subject);
  const formatOptions = getSubjectFormats(subject);

  const readyHint = ready
    ? '현재 설정으로 문제 생성이 가능합니다.'
    : mode === 'upload'
      ? '문제 파일과 정답 파일을 모두 업로드해야 합니다.'
      : '단원명 또는 추가 정보를 입력해야 합니다.';

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
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8">
          <h1 className="text-3xl font-bold">CBT 생성</h1>
          <p className="mt-2 text-sm text-slate-500">
            과목, 학교급, 난이도, 문항 수를 기준으로 실제 시험 흐름에 맞는 문제 세트를 만듭니다.
          </p>
        </section>

        {/* 모드 선택 */}
        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('upload')}
              className={`border px-4 py-3 text-sm font-semibold ${mode === 'upload' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
            >
              업로드형
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`border px-4 py-3 text-sm font-semibold ${mode === 'ai' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
            >
              AI 생성형
            </button>
          </div>
        </section>

        {/* 과목 선택 */}
        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8">
          <h2 className="text-sm font-semibold text-slate-700">과목 선택</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(SUBJECT_CONFIG) as SubjectKey[]).map((key) => (
              <button
                key={key}
                onClick={() => onSelectSubject(key)}
                className={`border px-4 py-3 text-sm font-semibold ${
                  subject === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                {SUBJECT_CONFIG[key].label}
              </button>
            ))}
          </div>
        </section>

        {/* 세부 설정 */}
        <section className="grid gap-4 lg:grid-cols-2">
          {!hideSelector && questionTypeOptions.length > 0 ? (
            <SelectorPanel
              title="문제유형"
              options={questionTypeOptions}
              value={questionType}
              onSelect={setQuestionType}
            />
          ) : null}

          {!hideSelector && formatOptions.length > 0 ? (
            <SelectorPanel
              title="문제 방식"
              options={formatOptions}
              value={format}
              onSelect={(value) => setFormat(value as SelectionFormat)}
            />
          ) : null}

          <SelectorPanel
            title="난이도"
            options={['easy', 'medium', 'hard']}
            value={difficulty}
            onSelect={(value) => setDifficulty(value as DifficultyLevel)}
            labelMap={{ easy: '쉬움', medium: '보통', hard: '어려움' }}
          />

          <SelectorPanel
            title="학교급"
            options={['middle', 'high', 'csat']}
            value={schoolLevel}
            onSelect={(value) => setSchoolLevel(value as SchoolLevel)}
            labelMap={{ middle: '중등', high: '고등', csat: '수능' }}
          />

          <section className="border border-slate-200 bg-white px-5 py-5">
            <h2 className="text-sm font-semibold text-slate-700">문항 수</h2>
            <input
              type="range"
              min={5}
              max={30}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              className="mt-4 w-full"
            />
            <div className="mt-3 text-sm font-medium text-slate-700">{count}문항</div>
          </section>
        </section>

        {/* 자료 입력 / 파일 업로드 */}
        {mode === 'upload' ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <UploadPanel title="문제 파일" files={questionFiles} onChange={(event) => handleFileChange(event, 'question')} />
            <UploadPanel title="정답 파일" files={answerFiles} onChange={(event) => handleFileChange(event, 'answer')} />
          </section>
        ) : (
          <section className="grid gap-4">
            <section className="border border-slate-200 bg-white px-5 py-5">
              <h2 className="text-sm font-semibold text-slate-700">
                {subject === 'korean_history' ? '단원명 / 시대 (필수)' : '단원명 / 주제 (필수)'}
              </h2>
              <input
                value={generationTopic}
                onChange={(event) => setGenerationTopic(event.target.value)}
                placeholder={subject === 'korean_history' ? '예: 조선 전기 통치 체제, 일제 강점기 경제' : '예: 근대 사회의 변화, 세포의 구조'}
                className="mt-4 w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              />
            </section>

            <section className="border border-slate-200 bg-white px-5 py-5">
              <h2 className="text-sm font-semibold text-slate-700">
                추가 상세 정보 (선택 사항)
              </h2>
              <textarea
                value={materialText}
                onChange={(event) => setMaterialText(event.target.value)}
                placeholder="특정 지문이나 사료를 문제에 포함하고 싶을 때만 입력하세요. 비워두시면 AI가 단원명에 맞춰 핵심 위주로 자동 생성합니다."
                className="mt-4 min-h-44 w-full border border-slate-300 px-4 py-4 text-sm leading-7 outline-none focus:border-slate-900"
              />
            </section>
          </section>
        )}

        {/* 생성 버튼 */}
        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">현재 설정</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {SUBJECT_CONFIG[subject].label}
                {selectionLabel ? ` / ${selectionLabel}` : ''}
                {' / '}
                {getSchoolLevelLabel(schoolLevel)}
                {' / '}
                {getDifficultyLabel(difficulty)}
                {' / '}
                {count}문항
              </p>
              <p className="mt-2 text-sm text-slate-500">{readyHint}</p>
              {generationError ? <p className="mt-3 text-sm text-red-700">{generationError}</p> : null}
            </div>
            <button
              onClick={onGenerate}
              disabled={!ready || isGenerating}
              className="bg-slate-900 px-6 py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isGenerating ? '생성 중...' : 'CBT 생성하기'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
