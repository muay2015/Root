import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bot, Home, NotebookPen, PlusCircle, RefreshCw, Settings, Upload } from 'lucide-react';
import {
  completeExam,
  ensureSupabaseUser,
  fetchLatestExamRecord,
  fetchWrongNotes,
  loadLocalLastExam,
  loadLocalWrongNotes,
  saveExamDraft,
  saveWrongNotes,
  storeLocalLastExam,
  storeLocalWrongNotes,
  type PersistedExamRecord,
} from './lib/rootPersistence';
import {
  hasPlaceholderChoices,
  normalizeGeneratedQuestions,
  normalizeMultipleChoiceChoices,
  normalizeStoredQuestions,
  toGeneratedQuestionMode,
  type GeneratedQuestionMode,
} from './lib/examGeneration';
import {
  SUBJECT_CONFIG,
  getSubjectFormats,
  getSubjectQuestionTypes,
  getSubjectSelectionDefaults,
  getSubjectSelectionLabel,
  usesNoSelector,
  type SelectionFormat,
  type SubjectKey,
} from './lib/question/subjectConfig.ts';
import { getApiUrl } from './lib/api.ts';
import { ExamHeader } from './components/exam/ExamHeader';
import { ExamQuestionList } from './components/exam/ExamQuestionList';
import { ExamNavigation } from './components/exam/ExamNavigation';
import { QuestionPalette } from './components/exam/QuestionPalette';
import type { ExamQuestion } from './components/exam/types';

type Screen = 'landing' | 'create' | 'taking' | 'result' | 'wrong';
type BuilderMode = 'upload' | 'ai';
type DifficultyLevel = 'easy' | 'medium' | 'hard';
type SchoolLevel = 'middle' | 'high' | 'csat';

type WrongNote = {
  id: string;
  examTitle: string;
  topic: string;
  stem: string;
  myAnswer: string;
  answer: string;
  explanation: string;
};

type ExamMeta = {
  subject: SubjectKey;
  difficulty: DifficultyLevel;
  schoolLevel: SchoolLevel;
  count: number;
};

const genericSeedQuestions: ExamQuestion[] = [
  {
    id: 1,
    topic: '핵심 개념',
    type: '객관식',
    stem: '제시된 학습 자료를 바르게 이해한 설명으로 가장 적절한 것은?',
    choices: ['핵심 개념과 관련이 없다', '핵심 개념을 정리하고 적용한다', '정답 복습은 필요 없다', '자료 분석 없이 암기만 한다'],
    answer: '핵심 개념을 정리하고 적용한다',
    explanation: '자료를 바탕으로 개념을 정리하고 적용하는 태도가 가장 적절합니다.',
  },
  {
    id: 2,
    topic: '자료 해석',
    type: '객관식',
    stem: '자료를 읽을 때 가장 먼저 확인해야 할 것으로 가장 적절한 것은?',
    choices: ['개인 의견', '핵심 정보와 조건', '작성자의 이름', '문항 번호'],
    answer: '핵심 정보와 조건',
    explanation: '핵심 정보와 조건을 먼저 파악해야 정확한 판단이 가능합니다.',
  },
];

const historySeedQuestions: ExamQuestion[] = [
  {
    id: 1,
    topic: '조선 전기',
    type: '객관식',
    stem: '다음 설명에 해당하는 시기의 통치 특징으로 가장 적절한 것은?\n태종과 세종을 거치며 왕권이 강화되고, 집현전 설치와 4군 6진 개척이 이루어졌다.',
    choices: ['문벌 귀족 사회가 강화되었다', '유교 정치 질서가 정비되었다', '무신 정권이 성립하였다', '전시과 체제가 처음 실시되었다', '6두품이 정계에 진출하였다'],
    answer: '유교 정치 질서가 정비되었다',
    explanation: '태종·세종 시기는 왕권 강화와 유교 정치 질서 정비가 대표적입니다.',
  },
  {
    id: 2,
    topic: '통일 신라',
    type: '객관식',
    stem: '다음 자료를 보고 알 수 있는 사실로 가장 적절한 것은?\n국학을 설치하고 독서삼품과를 실시하여 유교적 소양을 갖춘 인재를 키우려 하였다.',
    choices: ['통일 신라가 유교 정치 이념을 강화하였다', '백제가 지방 통제를 위해 22담로를 설치하였다', '고려가 성종 때 12목을 설치하였다', '조선이 성균관을 중심으로 과거제를 운영하였다', '신라 하대에 호족 세력이 약화되었다'],
    answer: '통일 신라가 유교 정치 이념을 강화하였다',
    explanation: '국학과 독서삼품과는 통일 신라의 유교 정치 질서 강화와 연결됩니다.',
  },
];

function getDifficultyLabel(value: DifficultyLevel) {
  if (value === 'easy') return '쉬움';
  if (value === 'medium') return '보통';
  return '어려움';
}

function getSchoolLevelLabel(value: SchoolLevel) {
  if (value === 'middle') return '중등';
  if (value === 'high') return '고등';
  return '수능';
}

function normalizeAnswer(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function inferUploadMode(
  subject: SubjectKey,
  questionType: string,
  format: SelectionFormat,
): GeneratedQuestionMode {
  if (usesNoSelector(subject)) {
    return 'multiple';
  }

  if (format === '단답형') {
    return 'subjective';
  }

  if (questionType === '객관식') return 'multiple';
  if (questionType === '주관식') return 'subjective';
  return 'mixed';
}

function getSeedQuestions(subject: SubjectKey) {
  return subject === 'korean_history' ? historySeedQuestions : genericSeedQuestions;
}

function buildQuestions(
  subject: SubjectKey,
  questionMode: GeneratedQuestionMode,
  count: number,
): ExamQuestion[] {
  const seeds = getSeedQuestions(subject);
  const base = Array.from({ length: count }, (_, index) => {
    const source = seeds[index % seeds.length];
    return {
      ...source,
      id: index + 1,
    };
  });

  if (questionMode === 'multiple') {
    return base.map((question) => ({
      ...question,
      type: '객관식',
      choices: normalizeMultipleChoiceChoices(question.choices),
    }));
  }

  if (questionMode === 'subjective') {
    return base.map((question) => ({
      ...question,
      type: '주관식',
      choices: undefined,
    }));
  }

  return base.map((question, index) =>
    index % 2 === 0
      ? { ...question, type: '객관식', choices: normalizeMultipleChoiceChoices(question.choices) }
      : { ...question, type: '주관식', choices: undefined },
  );
}

function mergeWrongNotes<T extends WrongNote>(notes: T[]) {
  return Array.from(new Map(notes.map((item) => [item.id, item])).values());
}

function makeExamTitle(
  mode: BuilderMode,
  subject: SubjectKey,
  schoolLevel: SchoolLevel,
  difficulty: DifficultyLevel,
  count: number,
  generationTopic: string,
  selectionLabel: string | null,
) {
  const topicText = generationTopic.trim();
  if (topicText.length > 0) {
    return topicText;
  }

  const subjectLabel = SUBJECT_CONFIG[subject].label;
  const parts = [
    mode === 'ai' ? 'AI 생성' : '업로드 기반',
    subjectLabel,
    selectionLabel,
    getSchoolLevelLabel(schoolLevel),
    getDifficultyLabel(difficulty),
    `${count}문항`,
  ].filter(Boolean);
  return parts.join(' ');
}

export default function App() {
  const defaultSubject: SubjectKey = 'english';
  const defaultSelection = getSubjectSelectionDefaults(defaultSubject);
  const [screen, setScreen] = useState<Screen>('landing');
  const [mode, setMode] = useState<BuilderMode>('upload');
  const [subject, setSubject] = useState<SubjectKey>(defaultSubject);
  const [questionType, setQuestionType] = useState(defaultSelection.questionType);
  const [format, setFormat] = useState<SelectionFormat>(defaultSelection.format);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('hard');
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>('high');
  const [count, setCount] = useState(12);
  const [generationTopic, setGenerationTopic] = useState('');
  const [materialText, setMaterialText] = useState('');
  const [questionFiles, setQuestionFiles] = useState<string[]>([]);
  const [answerFiles, setAnswerFiles] = useState<string[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>(buildQuestions(defaultSubject, 'mixed', 12));
  const [examTitle, setExamTitle] = useState('ROOT CBT');
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [generatedQuestionMode, setGeneratedQuestionMode] = useState<GeneratedQuestionMode>('mixed');
  const [examMeta, setExamMeta] = useState<ExamMeta>({
    subject: defaultSubject,
    difficulty: 'hard',
    schoolLevel: 'high',
    count: 12,
  });
  const [wrongNotes, setWrongNotes] = useState<WrongNote[]>([]);
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState('Supabase 연결 상태 확인 중...');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const selectionLabel = getSubjectSelectionLabel(subject, questionType, format);
  const readyToGenerate = mode === 'upload'
    ? questionFiles.length > 0 && answerFiles.length > 0
    : materialText.trim().length > 20;

  useEffect(() => {
    const localWrong = loadLocalWrongNotes<WrongNote>();
    if (localWrong.length > 0) {
      setWrongNotes(localWrong);
    }

    const localExam = loadLocalLastExam<PersistedExamRecord>();
    if (localExam) {
      setExamTitle(localExam.title);
      const restoredMode = toGeneratedQuestionMode(localExam.question_type);
      if (Array.isArray(localExam.questions) && localExam.questions.length > 0) {
        setQuestions(normalizeStoredQuestions(localExam.questions as ExamQuestion[], restoredMode) as ExamQuestion[]);
      }
      setGeneratedQuestionMode(restoredMode);
    }

    void (async () => {
      const auth = await ensureSupabaseUser();
      if (!auth.data) {
        setSyncMessage(auth.error ?? '로컬 저장 모드');
        return;
      }

      setSessionUserId(auth.data.id);
      setSyncMessage('Supabase 세션 연결 완료');

      const [latest, wrong] = await Promise.all([
        fetchLatestExamRecord(auth.data.id),
        fetchWrongNotes(auth.data.id),
      ]);

      if (latest.data) {
        setCurrentExamId(latest.data.id);
        setExamTitle(latest.data.title);
        const restoredMode = toGeneratedQuestionMode(latest.data.question_type);
        if (Array.isArray(latest.data.questions) && latest.data.questions.length > 0) {
          setQuestions(normalizeStoredQuestions(latest.data.questions as ExamQuestion[], restoredMode) as ExamQuestion[]);
        }
        storeLocalLastExam(latest.data);
      }

      if (wrong.data) {
        const merged = mergeWrongNotes([...(wrong.data as WrongNote[]), ...localWrong]);
        setWrongNotes(merged);
        storeLocalWrongNotes(merged);
      }
    })();
  }, []);

  const summary = useMemo(() => {
    const wrong = questions.flatMap((question) => {
      const myAnswer = responses[question.id] ?? '';
      return normalizeAnswer(myAnswer) === normalizeAnswer(question.answer)
        ? []
        : [{
            id: `${examTitle}-${question.id}`,
            examTitle,
            topic: question.topic,
            stem: question.stem,
            myAnswer: myAnswer || '미응답',
            answer: question.answer,
            explanation: question.explanation,
          }];
    });

    const correctCount = questions.length - wrong.length;
    return {
      score: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0,
      correctCount,
      wrongCount: wrong.length,
      wrong,
    };
  }, [examTitle, questions, responses]);

  const answeredIds = new Set(
    Object.entries(responses)
      .filter(([, value]) => String(value).trim().length > 0)
      .map(([key]) => Number(key)),
  );

  const handleSubjectSelect = (nextSubject: SubjectKey) => {
    const nextDefaults = getSubjectSelectionDefaults(nextSubject);
    setSubject(nextSubject);
    setQuestionType(nextDefaults.questionType);
    setFormat(nextDefaults.format);
    setGenerationError(null);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const uploadMode = inferUploadMode(subject, questionType, format);
      let nextQuestions = buildQuestions(subject, uploadMode, count);
      let nextQuestionMode = uploadMode;
      const nextTitle = makeExamTitle(
        mode,
        subject,
        schoolLevel,
        difficulty,
        count,
        generationTopic,
        selectionLabel,
      );

      let resolvedTitle = nextTitle;

      if (mode === 'ai') {
        const response = await fetch(getApiUrl('/api/ai/generate-exam'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            materialText,
            subject,
            questionType: usesNoSelector(subject) ? undefined : questionType,
            format: usesNoSelector(subject) ? undefined : format,
            difficulty,
            schoolLevel,
            count,
            title: nextTitle,
            topic: generationTopic.trim() || selectionLabel || SUBJECT_CONFIG[subject].label,
          }),
        });

        const data = (await response.json()) as {
          title?: string;
          questions?: ExamQuestion[];
          source?: 'ai' | 'mock';
          error?: string;
          validation?: { warnings?: string[] };
        };

        if (!response.ok) {
          throw new Error(data.error || 'AI 문제 생성에 실패했습니다.');
        }

        if (Array.isArray(data.questions) && data.questions.length > 0) {
          nextQuestions = normalizeGeneratedQuestions('multiple', data.questions) as ExamQuestion[];
          nextQuestionMode = 'multiple';
        }

        if (!Array.isArray(data.questions) || data.questions.length === 0) {
          throw new Error('생성된 문항이 없습니다. 다시 시도해 주세요.');
        }

        const containsInvalidQuestion = data.questions.some((question) => {
          const stem = question.stem?.trim() ?? '';
          return stem.length === 0 || hasPlaceholderChoices(question.choices);
        });

        if (containsInvalidQuestion || data.source === 'mock') {
          throw new Error('생성된 문항이 불완전합니다. placeholder 보기 또는 빈 문항이 감지되어 생성을 중단했습니다.');
        }

        resolvedTitle = data.title || nextTitle;
        setExamTitle(resolvedTitle);
      } else {
        resolvedTitle = nextTitle;
        setExamTitle(resolvedTitle);
      }

      setQuestions(nextQuestions);
      setGeneratedQuestionMode(nextQuestionMode);
      setResponses({});
      setCurrentQuestionIndex(1);
      setExamMeta({ subject, difficulty, schoolLevel, count });

      const localRecord = {
        id: currentExamId ?? `local-${Date.now()}`,
        title: resolvedTitle,
        builder_mode: mode,
        question_type: nextQuestionMode,
        difficulty,
        exam_format: schoolLevel,
        question_count: count,
        source_text: mode === 'ai' ? materialText : null,
        question_files: questionFiles,
        answer_files: answerFiles,
        questions: nextQuestions,
        responses: null,
        score: null,
        correct_count: null,
        wrong_count: null,
        submitted_at: null,
        created_at: new Date().toISOString(),
      };
      storeLocalLastExam(localRecord);

      if (sessionUserId) {
        const saved = await saveExamDraft(sessionUserId, {
          title: localRecord.title,
          builderMode: mode,
          questionType: nextQuestionMode,
          difficulty,
          examFormat: schoolLevel,
          questionCount: count,
          sourceText: mode === 'ai' ? materialText : '',
          questionFiles,
          answerFiles,
          questions: nextQuestions,
        });
        if (saved.data) {
          setCurrentExamId(saved.data.id);
        }
      }

      setScreen('taking');
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : '생성 실패');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    const merged = mergeWrongNotes([...summary.wrong, ...wrongNotes]);
    setWrongNotes(merged);
    storeLocalWrongNotes(merged);

    if (sessionUserId) {
      await saveWrongNotes(sessionUserId, merged);
      if (currentExamId) {
        await completeExam(sessionUserId, {
          examId: currentExamId,
          responses,
          score: summary.score,
          correctCount: summary.correctCount,
          wrongCount: summary.wrongCount,
        });
      }
    }

    setScreen('result');
  };

  const navigate = (next: Screen) => {
    window.scrollTo(0, 0);
    setScreen(next);
  };

  if (screen === 'taking' && questions.length > 0) {
    return (
      <>
        <TopBar current={screen} onNavigate={navigate} />
        <main className="min-h-screen bg-slate-100 px-3 pb-24 pt-4 text-slate-900 sm:px-5 sm:pt-6">
          <div className="mx-auto flex max-w-[980px] flex-col gap-4">
            <ExamHeader
              title={examTitle}
              subjectLabel={SUBJECT_CONFIG[examMeta.subject].label}
              schoolLevelLabel={getSchoolLevelLabel(examMeta.schoolLevel)}
              difficultyLabel={getDifficultyLabel(examMeta.difficulty)}
              currentIndex={currentQuestionIndex}
              totalCount={questions.length}
              answeredCount={answeredIds.size}
            />
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-4">
                <ExamQuestionList
                  questions={questions}
                  responses={responses}
                  currentIndex={currentQuestionIndex}
                  onVisibleChange={setCurrentQuestionIndex}
                  onSelectChoice={(questionId, choice) =>
                    setResponses((current) => ({
                      ...current,
                      [questionId]: choice,
                    }))
                  }
                  onChangeText={(questionId, value) =>
                    setResponses((current) => ({
                      ...current,
                      [questionId]: value,
                    }))
                  }
                />
                <ExamNavigation
                  answeredCount={answeredIds.size}
                  totalCount={questions.length}
                  onSubmit={handleSubmit}
                  onScrollTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />
              </div>
              <div className="space-y-4 lg:sticky lg:top-6">
                <QuestionPalette
                  totalCount={questions.length}
                  currentIndex={currentQuestionIndex}
                  answeredIds={answeredIds}
                  onJump={(index) => {
                    setCurrentQuestionIndex(index);
                    document.getElementById(`exam-question-${index}`)?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  let content: ReactNode;
  if (screen === 'landing') {
    content = <LandingScreen onNavigate={navigate} />;
  } else if (screen === 'create') {
    content = (
      <CreateScreen
        mode={mode}
        setMode={setMode}
        subject={subject}
        onSelectSubject={handleSubjectSelect}
        questionType={questionType}
        setQuestionType={setQuestionType}
        format={format}
        setFormat={setFormat}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        schoolLevel={schoolLevel}
        setSchoolLevel={setSchoolLevel}
        count={count}
        setCount={setCount}
        generationTopic={generationTopic}
        setGenerationTopic={setGenerationTopic}
        materialText={materialText}
        setMaterialText={setMaterialText}
        questionFiles={questionFiles}
        answerFiles={answerFiles}
        setQuestionFiles={setQuestionFiles}
        setAnswerFiles={setAnswerFiles}
        ready={readyToGenerate}
        isGenerating={isGenerating}
        generationError={generationError}
        onGenerate={handleGenerate}
      />
    );
  } else if (screen === 'result') {
    content = (
      <ResultScreen
        examTitle={examTitle}
        summary={summary}
        questions={questions}
        responses={responses}
        onBack={() => navigate('landing')}
        onWrong={() => navigate('wrong')}
      />
    );
  } else {
    content = (
      <WrongScreen
        wrongNotes={wrongNotes}
        syncMessage={syncMessage}
        onBack={() => navigate('landing')}
        onRetry={() => {
          setCurrentQuestionIndex(1);
          navigate('taking');
        }}
      />
    );
  }

  return (
    <>
      <TopBar current={screen} onNavigate={navigate} />
      {content}
      <BottomNavigation current={screen} onNavigate={navigate} />
    </>
  );
}

type CreateScreenProps = {
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
};

function CreateScreen(props: CreateScreenProps) {
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
  const previewMode = inferUploadMode(subject, questionType, format);
  const preview = buildQuestions(subject, mode === 'ai' ? 'multiple' : previewMode, Math.min(count, 2));
  const readyHint = ready
    ? '현재 설정으로 문제 생성이 가능합니다.'
    : mode === 'upload'
      ? '문제 파일과 정답 파일을 모두 업로드해야 합니다.'
      : '자료 텍스트를 20자 이상 입력해야 합니다.';

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

        {mode === 'upload' ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <UploadPanel title="문제 파일" files={questionFiles} onChange={(event) => handleFileChange(event, 'question')} />
            <UploadPanel title="정답 파일" files={answerFiles} onChange={(event) => handleFileChange(event, 'answer')} />
          </section>
        ) : (
          <section className="grid gap-4">
            <section className="border border-slate-200 bg-white px-5 py-5">
              <h2 className="text-sm font-semibold text-slate-700">
                {subject === 'korean_history' ? '단원 / 출제 범위' : '주제 / 단원'}
              </h2>
              <input
                value={generationTopic}
                onChange={(event) => setGenerationTopic(event.target.value)}
                placeholder={subject === 'korean_history' ? '예: 조선 전기 통치 체제' : '예: 근대 사회 변화'}
                className="mt-4 w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              />
            </section>

            <section className="border border-slate-200 bg-white px-5 py-5">
              <h2 className="text-sm font-semibold text-slate-700">
                {subject === 'korean_history' ? '지문 / 사료 / 학습 자료' : '교재 / 학습 자료 텍스트'}
              </h2>
              <textarea
                value={materialText}
                onChange={(event) => setMaterialText(event.target.value)}
                placeholder={subject === 'korean_history'
                  ? '국사 문제의 범위가 되는 서술, 사료, 단원 요약을 입력하세요.'
                  : '문제 생성을 위한 본문이나 요약 자료를 입력하세요.'}
                className="mt-4 min-h-44 w-full border border-slate-300 px-4 py-4 text-sm leading-7 outline-none focus:border-slate-900"
              />
            </section>
          </section>
        )}

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

        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">미리보기</h2>
            <span className="text-xs uppercase tracking-[0.14em] text-slate-400">Preview</span>
          </div>
          <div className="space-y-4">
            {preview.map((question) => (
              <div key={question.id} className="border border-slate-200 px-4 py-4">
                <p className="text-base font-semibold text-slate-900">{question.id}. {question.stem}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SelectorPanel({
  title,
  options,
  value,
  onSelect,
  labelMap,
}: {
  title: string;
  options: readonly string[];
  value: string;
  onSelect: (value: string) => void;
  labelMap?: Record<string, string>;
}) {
  return (
    <section className="border border-slate-200 bg-white px-5 py-5">
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`border px-4 py-3 text-sm font-semibold ${
              value === option ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {labelMap?.[option] ?? option}
          </button>
        ))}
      </div>
    </section>
  );
}

function UploadPanel({
  title,
  files,
  onChange,
}: {
  title: string;
  files: string[];
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="border border-slate-200 bg-white px-5 py-5">
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      <div className="mt-4 border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        파일을 선택해 업로드하세요.
      </div>
      <input type="file" multiple className="mt-4 block w-full text-sm" onChange={onChange} />
      {files.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          {files.map((file) => (
            <li key={file}>{file}</li>
          ))}
        </ul>
      ) : null}
    </label>
  );
}

function LandingScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-20 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center border border-slate-200 bg-white text-3xl font-bold">
          R
        </div>
        <div>
          <h1 className="text-4xl font-bold">ROOT CBT</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            과목 기반 문제 생성부터 실제 시험형 응시 화면, 결과 확인과 오답노트까지 한 흐름으로 관리합니다.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard
            icon={<Upload className="h-5 w-5 text-slate-900" />}
            title="업로드형"
            description="문제 파일과 정답 파일을 기준으로 시험 세트를 구성합니다."
          />
          <InfoCard
            icon={<Bot className="h-5 w-5 text-slate-900" />}
            title="AI 생성형"
            description="과목, 학교급, 난이도, 문항 수 기준으로 문제를 자동 생성합니다."
          />
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={() => onNavigate('create')}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 px-6 py-4 text-sm font-semibold text-white"
          >
            <PlusCircle className="h-5 w-5" />
            시험 만들기
          </button>
          <button
            onClick={() => onNavigate('wrong')}
            className="inline-flex items-center justify-center gap-2 border border-slate-300 bg-white px-6 py-4 text-sm font-semibold text-slate-700"
          >
            <NotebookPen className="h-5 w-5" />
            오답노트
          </button>
        </div>
      </div>
    </main>
  );
}

function ResultScreen({
  examTitle,
  summary,
  questions,
  responses,
  onBack,
  onWrong,
}: {
  examTitle: string;
  summary: { score: number; correctCount: number; wrongCount: number; wrong: WrongNote[] };
  questions: ExamQuestion[];
  responses: Record<number, string>;
  onBack: () => void;
  onWrong: () => void;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8">
          <h1 className="text-3xl font-bold">결과 확인</h1>
          <p className="mt-2 text-sm text-slate-500">{examTitle}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Metric label="점수" value={`${summary.score}점`} />
            <Metric label="정답" value={`${summary.correctCount}문항`} />
            <Metric label="오답" value={`${summary.wrongCount}문항`} />
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button onClick={onWrong} className="border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
            오답노트 보기
          </button>
          <button onClick={onBack} className="bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
            홈으로 이동
          </button>
        </div>

        <section className="space-y-4">
          {questions.map((question) => {
            const myAnswer = responses[question.id] ?? '미응답';
            const isCorrect = normalizeAnswer(myAnswer) === normalizeAnswer(question.answer);
            return (
              <article key={question.id} className="border border-slate-200 bg-white px-5 py-5">
                <div className="mb-3 text-sm font-semibold text-slate-500">
                  문항 {question.id} · {isCorrect ? '정답' : '오답'}
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{question.stem}</h2>
                <div className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
                  <p><span className="font-semibold">내 답:</span> {myAnswer}</p>
                  <p><span className="font-semibold">정답:</span> {question.answer}</p>
                  <p className="border border-slate-200 bg-slate-50 px-4 py-3">{question.explanation}</p>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function WrongScreen({
  wrongNotes,
  syncMessage,
  onBack,
  onRetry,
}: {
  wrongNotes: WrongNote[];
  syncMessage: string;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8">
          <h1 className="text-3xl font-bold">오답노트</h1>
          <p className="mt-2 text-sm text-slate-500">{syncMessage}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={onRetry} className="inline-flex items-center gap-2 bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
              <RefreshCw className="h-4 w-4" />
              다시 풀기
            </button>
            <button onClick={onBack} className="border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              홈으로
            </button>
          </div>
        </section>

        {wrongNotes.length === 0 ? (
          <section className="border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
            저장된 오답이 없습니다.
          </section>
        ) : (
          <section className="space-y-4">
            {wrongNotes.map((note) => (
              <article key={note.id} className="border border-slate-200 bg-white px-5 py-5">
                <div className="mb-3 text-sm font-semibold text-slate-500">{note.examTitle}</div>
                <h2 className="text-lg font-semibold text-slate-900">{note.stem}</h2>
                <div className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
                  <p><span className="font-semibold">내 답:</span> {note.myAnswer}</p>
                  <p><span className="font-semibold">정답:</span> {note.answer}</p>
                  <p className="border border-slate-200 bg-slate-50 px-4 py-3">{note.explanation}</p>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function InfoCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <section className="border border-slate-200 bg-white px-5 py-6 text-left">
      <div className="mb-4 inline-flex border border-slate-200 bg-slate-50 p-3">{icon}</div>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function TopBar({ current, onNavigate }: { current: Screen; onNavigate: (screen: Screen) => void }) {
  const currentLabel =
    current === 'landing' ? '홈' :
    current === 'create' ? 'CBT 생성' :
    current === 'taking' ? '응시' :
    current === 'result' ? '결과' :
    '오답노트';

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (current === 'landing' ? undefined : onNavigate('landing'))}
            className={`flex h-11 w-11 items-center justify-center border ${
              current === 'landing' ? 'border-slate-200 bg-slate-100 text-slate-400' : 'border-slate-900 bg-slate-900 text-white'
            }`}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">ROOT</div>
            <div className="text-lg font-semibold text-slate-900">{currentLabel}</div>
          </div>
        </div>
        <button
          onClick={() => window.alert('설정 메뉴는 다음 단계에서 연결할 수 있습니다.')}
          className="flex h-11 w-11 items-center justify-center border border-slate-300 bg-white text-slate-700"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

function BottomNavigation({ current, onNavigate }: { current: Screen; onNavigate: (screen: Screen) => void }) {
  if (current === 'taking') {
    return null;
  }

  const items: Array<{ id: Screen; label: string; icon: ReactNode }> = [
    { id: 'landing', label: '홈', icon: <Home className="h-5 w-5" /> },
    { id: 'create', label: '시험 생성', icon: <PlusCircle className="h-5 w-5" /> },
    { id: 'wrong', label: '오답노트', icon: <NotebookPen className="h-5 w-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-3 px-4 py-3">
        {items.map((item) => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs font-semibold ${
                active ? 'text-slate-900' : 'text-slate-500'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
