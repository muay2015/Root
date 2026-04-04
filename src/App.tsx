import { type ChangeEvent, type Dispatch, type ReactNode, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Bot, CheckCircle2, Clock, Home, Monitor, NotebookPen, PlusCircle, RefreshCw, Search, Upload, UserCircle, XCircle } from 'lucide-react';
import { completeExam, ensureSupabaseUser, fetchLatestExamRecord, fetchWrongNotes, loadLocalLastExam, loadLocalWrongNotes, saveExamDraft, saveWrongNotes, storeLocalLastExam, storeLocalWrongNotes, type PersistedExamRecord } from './lib/rootPersistence';
import { normalizeGeneratedQuestions, normalizeMultipleChoiceChoices, toGeneratedQuestionMode, type GeneratedQuestionMode } from './lib/examGeneration';

type Screen = 'landing' | 'create' | 'taking' | 'result' | 'wrong';
type BuilderMode = 'upload' | 'ai';
type QuestionType = '객관식' | '주관식' | '혼합형';
type Difficulty = '기본' | '도전' | '실전';
type ExamFormat = '중학교 내신형' | '고등학교 내신형' | '수능형';

type Question = {
  id: number;
  topic: string;
  type: '객관식' | '주관식';
  stem: string;
  choices?: string[];
  answer: string;
  explanation: string;
};

type WrongNote = {
  id: string;
  examTitle: string;
  topic: string;
  stem: string;
  myAnswer: string;
  answer: string;
  explanation: string;
};

const seedQuestions: Question[] = [
  { id: 1, topic: '개념 이해', type: '객관식', stem: '반복 학습을 문제 풀이와 함께 진행할 때 가장 기대되는 효과는 무엇인가?', choices: ['단순 암기량만 증가한다', '개념 연결과 회상력이 함께 강화된다', '문항 수가 자동으로 줄어든다', '오답 복습이 불가능해진다'], answer: '개념 연결과 회상력이 함께 강화된다', explanation: '풀이 중심 반복은 회상 연습과 개념 간 연결을 동시에 강화합니다.' },
  { id: 2, topic: '자료 업로드', type: '객관식', stem: '문제 파일과 정답 파일을 분리 업로드해야 하는 가장 큰 이유는 무엇인가?', choices: ['디자인을 화려하게 만들기 위해', '정답 매핑과 채점 정확도를 높이기 위해', '파일 이름을 짧게 만들기 위해', '서버 부하를 늘리기 위해'], answer: '정답 매핑과 채점 정확도를 높이기 위해', explanation: '분리 업로드가 파싱과 채점 안정성을 높입니다.' },
  { id: 3, topic: '오답 복습', type: '주관식', stem: '오답노트를 자동 저장해야 하는 이유를 한 문장으로 작성하세요.', answer: '취약 개념을 반복 복습하기 위해서', explanation: '오답노트는 취약 단원을 추적하는 핵심 장치입니다.' },
  { id: 4, topic: '생성 설정', type: '객관식', stem: 'AI 문제 생성에서 사용자가 직접 조정하는 항목이 아닌 것은 무엇인가?', choices: ['문항 수', '난이도', '시험 형식', '서버 지역'], answer: '서버 지역', explanation: '사용자는 학습 관련 옵션만 조정합니다.' },
];

function makeExamTitle(mode: BuilderMode, format: ExamFormat, difficulty: Difficulty, count: number) {
  return mode === 'upload' ? `업로드 기반 ${format} ${count}문항` : `AI 생성 ${format} ${difficulty} ${count}문항`;
}

function normalizeAnswer(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildQuestions(questionType: QuestionType, count: number) {
  const questions = Array.from({ length: count }, (_, index) => {
    const source = seedQuestions[index % seedQuestions.length];
    return { ...source, id: index + 1, topic: `${source.topic} ${Math.floor(index / seedQuestions.length) + 1}` };
  });
  if (questionType === '객관식') return questions.map((q) => ({ ...q, type: '객관식' as const, choices: normalizeMultipleChoiceChoices(q.choices) }));
  if (questionType === '주관식') return questions.map((q) => ({ ...q, type: '주관식' as const, choices: undefined }));
  return questions.map((q, i) => i % 2 === 0 ? { ...q, type: '객관식' as const, choices: normalizeMultipleChoiceChoices(q.choices) } : { ...q, type: '주관식' as const, choices: undefined });
}

function mergeWrongNotes<T extends WrongNote>(notes: T[]) {
  return Array.from(new Map(notes.map((item) => [item.id, item])).values());
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [mode, setMode] = useState<BuilderMode>('upload');
  const [questionType, setQuestionType] = useState<QuestionType>('혼합형');
  const [difficulty, setDifficulty] = useState<Difficulty>('실전');
  const [format, setFormat] = useState<ExamFormat>('고등학교 내신형');
  const [count, setCount] = useState(12);
  const [materialText, setMaterialText] = useState('');
  const [questionFiles, setQuestionFiles] = useState<string[]>([]);
  const [answerFiles, setAnswerFiles] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [examTitle, setExamTitle] = useState(makeExamTitle('upload', '고등학교 내신형', '실전', 12));
  const [questions, setQuestions] = useState<Question[]>(buildQuestions('혼합형', 12));
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [generatedQuestionMode, setGeneratedQuestionMode] = useState<GeneratedQuestionMode>('mixed');
  const [wrongNotes, setWrongNotes] = useState<WrongNote[]>([]);
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState('Supabase 연결 확인 중...');

  useEffect(() => {
    const localWrong = loadLocalWrongNotes<WrongNote>();
    if (localWrong.length > 0) setWrongNotes(localWrong);
    const localExam = loadLocalLastExam<PersistedExamRecord>();
    if (localExam) {
      setExamTitle(localExam.title);
      if (Array.isArray(localExam.questions) && localExam.questions.length > 0) setQuestions(localExam.questions as Question[]);
      setGeneratedQuestionMode(toGeneratedQuestionMode(localExam.question_type as QuestionType));
    }
    void (async () => {
      const auth = await ensureSupabaseUser();
      if (!auth.data) {
        setSyncMessage(auth.error ?? '로컬 저장 모드');
        return;
      }
      setSessionUserId(auth.data.id);
      setSyncMessage('Supabase 세션 연결 완료');
      const [latest, wrong] = await Promise.all([fetchLatestExamRecord(auth.data.id), fetchWrongNotes(auth.data.id)]);
      if (latest.data) {
        setCurrentExamId(latest.data.id);
        setExamTitle(latest.data.title);
        if (Array.isArray(latest.data.questions) && latest.data.questions.length > 0) setQuestions(latest.data.questions as Question[]);
        storeLocalLastExam(latest.data);
      }
      if (wrong.data) {
        const merged = mergeWrongNotes([...(wrong.data as WrongNote[]), ...localWrong]);
        setWrongNotes(merged);
        storeLocalWrongNotes(merged);
      }
    })();
  }, []);

  const readyToGenerate = mode === 'upload' ? questionFiles.length > 0 && answerFiles.length > 0 : materialText.trim().length > 20;

  const summary = useMemo(() => {
    const wrong = questions.flatMap((question) => {
      const myAnswer = responses[question.id] ?? '';
      return normalizeAnswer(myAnswer) === normalizeAnswer(question.answer) ? [] : [{ id: `${examTitle}-${question.id}`, examTitle, topic: question.topic, stem: question.stem, myAnswer: myAnswer || '미응답', answer: question.answer, explanation: question.explanation }];
    });
    const correctCount = questions.length - wrong.length;
    return { score: questions.length ? Math.round((correctCount / questions.length) * 100) : 0, correctCount, wrongCount: wrong.length, wrong };
  }, [examTitle, questions, responses]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      let nextQuestions = buildQuestions(questionType, count);
      let nextTitle = makeExamTitle(mode, format, difficulty, count);
      if (mode === 'ai') {
        const apiQuestionType = toGeneratedQuestionMode(questionType);
        const response = await fetch('/api/ai/generate-exam', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ materialText, questionType: apiQuestionType, difficulty, format, count }) });
        const data = (await response.json()) as { title?: string; questions?: Question[]; error?: string };
        if (!response.ok) throw new Error(data.error || 'AI 문제 생성에 실패했습니다.');
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          nextQuestions = normalizeGeneratedQuestions(apiQuestionType, data.questions);
          nextTitle = data.title || nextTitle;
        }
      }
      setQuestions(nextQuestions);
      setExamTitle(nextTitle);
      setGeneratedQuestionMode(toGeneratedQuestionMode(questionType));
      setResponses({});
      const localRecord = { id: currentExamId ?? `local-${Date.now()}`, title: nextTitle, builder_mode: mode, question_type: questionType, difficulty, exam_format: format, question_count: count, source_text: mode === 'ai' ? materialText : null, question_files: questionFiles, answer_files: answerFiles, questions: nextQuestions, responses: null, score: null, correct_count: null, wrong_count: null, submitted_at: null, created_at: new Date().toISOString() };
      storeLocalLastExam(localRecord);
      if (sessionUserId) {
        const saved = await saveExamDraft(sessionUserId, { title: nextTitle, builderMode: mode, questionType, difficulty, examFormat: format, questionCount: count, sourceText: mode === 'ai' ? materialText : '', questionFiles, answerFiles, questions: nextQuestions });
        if (saved.data) setCurrentExamId(saved.data.id);
      }
      setScreen('taking');
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : '생성 실패');
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
      if (currentExamId) await completeExam(sessionUserId, { examId: currentExamId, responses, score: summary.score, correctCount: summary.correctCount, wrongCount: summary.wrongCount });
    }
    setScreen('result');
  };

  const nav = (next: Screen) => { window.scrollTo(0, 0); setScreen(next); };

  if (screen === 'landing') return <LandingScreen onNavigate={nav} />;
  if (screen === 'create') return <CreateScreen mode={mode} setMode={setMode} questionType={questionType} setQuestionType={setQuestionType} difficulty={difficulty} setDifficulty={setDifficulty} format={format} setFormat={setFormat} count={count} setCount={setCount} materialText={materialText} setMaterialText={setMaterialText} questionFiles={questionFiles} answerFiles={answerFiles} setQuestionFiles={setQuestionFiles} setAnswerFiles={setAnswerFiles} ready={readyToGenerate} isGenerating={isGenerating} onGenerate={handleGenerate} onBack={() => nav('landing')} />;
  if (screen === 'taking') return <TakingScreen examTitle={examTitle} questions={questions} responses={responses} setResponses={setResponses} generatedQuestionMode={generatedQuestionMode} onBack={() => nav('create')} onSubmit={handleSubmit} />;
  if (screen === 'result') return <ResultScreen examTitle={examTitle} summary={summary} questions={questions} responses={responses} onBack={() => nav('landing')} onWrong={() => nav('wrong')} />;
  return <WrongScreen wrongNotes={wrongNotes} onBack={() => nav('landing')} onRetry={() => { setResponses({}); nav('taking'); }} syncMessage={syncMessage} />;
}

function LandingScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-6 pt-24 pb-28">
      <div className="max-w-4xl mx-auto text-center">
        <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white text-4xl font-black flex items-center justify-center mx-auto mb-6">R</div>
        <h1 className="text-5xl font-black mb-4">루트 (ROOT)</h1>
        <p className="text-slate-600 mb-10">문제 생성, CBT 응시, 결과 확인, 오답노트 복습까지 한 흐름으로 연결됩니다.</p>
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          <Card icon={<Upload className="w-6 h-6 text-blue-600" />} title="업로드형" description="문제 파일과 정답 파일로 시험 생성" />
          <Card icon={<Bot className="w-6 h-6 text-blue-600" />} title="AI 생성형" description="텍스트와 조건으로 자동 문제 생성" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => onNavigate('create')} className="px-6 py-4 rounded-2xl bg-blue-600 text-white font-bold inline-flex items-center justify-center gap-2"><PlusCircle className="w-5 h-5" />시험 만들기</button>
          <button onClick={() => onNavigate('wrong')} className="px-6 py-4 rounded-2xl bg-white border border-slate-200 font-bold inline-flex items-center justify-center gap-2"><NotebookPen className="w-5 h-5" />오답노트</button>
        </div>
      </div>
    </main>
  );
}
function CreateScreen(props: { mode: BuilderMode; setMode: (value: BuilderMode) => void; questionType: QuestionType; setQuestionType: (value: QuestionType) => void; difficulty: Difficulty; setDifficulty: (value: Difficulty) => void; format: ExamFormat; setFormat: (value: ExamFormat) => void; count: number; setCount: (value: number) => void; materialText: string; setMaterialText: (value: string) => void; questionFiles: string[]; answerFiles: string[]; setQuestionFiles: (value: string[]) => void; setAnswerFiles: (value: string[]) => void; ready: boolean; isGenerating: boolean; onGenerate: () => void; onBack: () => void }) {
  const { mode, setMode, questionType, setQuestionType, difficulty, setDifficulty, format, setFormat, count, setCount, materialText, setMaterialText, questionFiles, answerFiles, setQuestionFiles, setAnswerFiles, ready, isGenerating, onGenerate, onBack } = props;
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, target: 'question' | 'answer') => { const files = Array.from(event.target.files ?? []).map((file) => file.name); if (target === 'question') setQuestionFiles(files); else setAnswerFiles(files); };
  const preview = buildQuestions(questionType, Math.min(count, 3));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-6 pt-10 pb-32">
      <div className="max-w-3xl mx-auto">
        <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft className="w-4 h-4" />뒤로</button>
        <h2 className="text-4xl font-black mb-3">시험 생성</h2>
        <p className="text-slate-600 mb-6">옵션을 설정하고 바로 응시할 수 있습니다.</p>
        <div className="grid grid-cols-2 gap-3 bg-slate-100 p-2 rounded-2xl mb-6">
          <button onClick={() => setMode('upload')} className={`rounded-2xl py-4 font-bold ${mode === 'upload' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>업로드형</button>
          <button onClick={() => setMode('ai')} className={`rounded-2xl py-4 font-bold ${mode === 'ai' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>AI 생성형</button>
        </div>
        {mode === 'upload' ? (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <UploadBox title="문제 파일 업로드" files={questionFiles} onChange={(e) => handleFileChange(e, 'question')} />
            <UploadBox title="정답 파일 업로드" files={answerFiles} onChange={(e) => handleFileChange(e, 'answer')} />
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mb-6">
            <div className="text-sm font-bold mb-2">교재 / 교과서 텍스트</div>
            <textarea value={materialText} onChange={(e) => setMaterialText(e.target.value)} placeholder="교과서 단원 개념, 예제, 빈출 포인트를 입력하면 AI가 선택한 조건에 맞는 CBT 문제를 생성합니다." className="w-full min-h-40 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none mb-4" />
            <div className="grid md:grid-cols-2 gap-4">
              <OptionGroup title="문제 유형" options={['객관식', '주관식', '혼합형']} value={questionType} onChange={(v) => setQuestionType(v as QuestionType)} />
              <OptionGroup title="난이도" options={['기본', '도전', '실전']} value={difficulty} onChange={(v) => setDifficulty(v as Difficulty)} />
              <OptionGroup title="시험 형식" options={['중학교 내신형', '고등학교 내신형', '수능형']} value={format} onChange={(v) => setFormat(v as ExamFormat)} />
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200"><div className="text-sm font-bold mb-3">문항 수</div><input type="range" min={5} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full" /><div className="mt-3 font-semibold text-slate-600">{count}문항</div></div>
            </div>
          </div>
        )}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-bold">문항 미리보기</h3><span className="text-xs font-bold text-slate-400">PREVIEW</span></div>
          <div className="space-y-3">{preview.map((question) => <div key={question.id} className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div className="flex gap-2 flex-wrap mb-2"><Tag>{question.type}</Tag><Tag>{question.topic}</Tag></div><p className="font-semibold">{question.id}. {question.stem}</p></div>)}</div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-slate-200"><div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4"><div className={`text-sm font-medium ${ready ? 'text-blue-600' : 'text-slate-500'}`}>{ready ? '생성 준비가 완료되었습니다.' : mode === 'upload' ? '문제 파일과 정답 파일을 모두 업로드하세요.' : 'AI 생성을 위해 충분한 텍스트를 입력하세요.'}</div><button onClick={onGenerate} disabled={!ready || isGenerating} className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold disabled:bg-slate-300">{isGenerating ? '생성 중...' : '시험 생성'}</button></div></div>
      </div>
    </main>
  );
}

function TakingScreen({ examTitle, questions, responses, setResponses, generatedQuestionMode, onBack, onSubmit }: { examTitle: string; questions: Question[]; responses: Record<number, string>; setResponses: Dispatch<SetStateAction<Record<number, string>>>; generatedQuestionMode: GeneratedQuestionMode; onBack: () => void; onSubmit: () => void }) {
  const answeredCount = questions.filter((question) => typeof responses[question.id] === 'string' && responses[question.id].trim().length > 0).length;
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-4 md:px-0 pt-6 pb-28">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6"><button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft className="w-4 h-4" />설정</button><div className="px-4 py-1.5 bg-blue-600 rounded-full text-white inline-flex items-center gap-2 text-sm font-bold"><Clock className="w-4 h-4" />24:18</div></div>
        <div className="mb-6 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm"><div className="flex justify-between items-end mb-3"><span className="font-bold">{examTitle}</span><span className="text-sm text-blue-600 font-bold">{answeredCount}/{questions.length}</span></div><div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${progress}%` }} /></div></div>
        <section className="space-y-6">
          {questions.map((question) => {
            const isMultiple = generatedQuestionMode === 'multiple' || (generatedQuestionMode === 'mixed' && question.type === '객관식');
            const choices = isMultiple ? normalizeMultipleChoiceChoices(question.choices) : [];
            return (
              <article key={question.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <div className="flex flex-wrap gap-2 mb-4"><Tag>{isMultiple ? '객관식' : '주관식'}</Tag><Tag>{question.topic}</Tag></div>
                <p className="text-lg leading-relaxed font-medium"><span className="mr-2">{question.id}.</span>{question.stem}</p>
                {isMultiple ? (
                  <div className="space-y-3 mt-5">
                    {choices.map((choice, index) => <button key={`${question.id}-${index}-${choice}`} onClick={() => setResponses((prev) => ({ ...prev, [question.id]: choice }))} className={`w-full flex items-center p-5 rounded-2xl text-left border transition ${responses[question.id] === choice ? 'bg-white border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}><span className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-full font-bold text-sm mr-5 ${responses[question.id] === choice ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>{index + 1}</span><span className={responses[question.id] === choice ? 'text-blue-700 font-bold' : 'text-slate-900 font-medium'}>{choice}</span></button>)}
                  </div>
                ) : (
                  <textarea value={responses[question.id] ?? ''} onChange={(e) => setResponses((prev) => ({ ...prev, [question.id]: e.target.value }))} className="w-full mt-5 min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 outline-none" placeholder="주관식 답안을 입력하세요." />
                )}
              </article>
            );
          })}
        </section>
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-slate-200"><div className="max-w-3xl mx-auto px-6 py-4 flex justify-end"><button onClick={onSubmit} className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold inline-flex items-center gap-2">제출하기<ArrowRight className="w-4 h-4" /></button></div></div>
      </div>
    </main>
  );
}
function ResultScreen({ examTitle, summary, questions, responses, onBack, onWrong }: { examTitle: string; summary: { score: number; correctCount: number; wrongCount: number; wrong: WrongNote[] }; questions: Question[]; responses: Record<number, string>; onBack: () => void; onWrong: () => void }) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-6 pt-10 pb-20">
      <div className="max-w-4xl mx-auto">
        <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-600"><ArrowLeft className="w-4 h-4" />홈으로</button>
        <div className="grid md:grid-cols-3 gap-6 mb-8"><div className="md:col-span-2 rounded-3xl bg-blue-600 text-white p-10 text-center"><div className="text-xs font-bold tracking-[0.2em] mb-4">FINAL SCORE</div><div className="text-8xl font-black">{summary.score}</div><p className="mt-4 text-blue-100">{examTitle}</p></div><div className="rounded-3xl bg-white border border-slate-200 p-8 space-y-6"><Metric icon={<CheckCircle2 className="w-5 h-5" />} label="정답 수" value={`${summary.correctCount}문항`} tone="blue" /><Metric icon={<XCircle className="w-5 h-5" />} label="오답 수" value={`${summary.wrongCount}문항`} tone="red" /><button onClick={onWrong} className="w-full px-5 py-4 rounded-2xl bg-blue-600 text-white font-bold inline-flex items-center justify-center gap-2">오답노트 보기<ArrowRight className="w-4 h-4" /></button></div></div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6"><div className="flex items-center justify-between mb-6"><h3 className="text-2xl font-black">문항별 분석</h3><span className="text-sm text-slate-500">{questions.length}문항</span></div><div className="space-y-3">{questions.map((question) => { const myAnswer = responses[question.id] || '미응답'; const correct = normalizeAnswer(myAnswer) === normalizeAnswer(question.answer); return <div key={question.id} className="rounded-2xl bg-slate-50 border border-slate-200 p-4 grid md:grid-cols-4 gap-3 items-center"><div className="font-black text-blue-600">{String(question.id).padStart(2, '0')}</div><div className="font-medium">{question.topic}</div><div className="text-sm text-slate-600">{myAnswer}</div><div className="text-right"><span className={`px-3 py-1 rounded-full text-xs font-bold ${correct ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>{correct ? '정답' : '오답'}</span></div></div>; })}</div></div>
      </div>
    </main>
  );
}

function WrongScreen({ wrongNotes, onBack, onRetry, syncMessage }: { wrongNotes: WrongNote[]; onBack: () => void; onRetry: () => void; syncMessage: string }) {
  const [keyword, setKeyword] = useState('');
  const filtered = wrongNotes.filter((item) => { const q = keyword.trim().toLowerCase(); return q.length === 0 || item.examTitle.toLowerCase().includes(q) || item.topic.toLowerCase().includes(q) || item.stem.toLowerCase().includes(q); });
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-6 pt-10 pb-20">
      <div className="max-w-4xl mx-auto">
        <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-600"><Home className="w-4 h-4" />홈으로</button>
        <h2 className="text-3xl font-black tracking-tight mb-2">Wrong Answer Journal</h2>
        <p className="text-slate-600 mb-6">{syncMessage}</p>
        <div className="grid md:grid-cols-2 gap-4 mb-6"><Card icon={<BookOpen className="w-6 h-6 text-blue-600" />} title="누적 오답" description={`${wrongNotes.length}문항이 저장되어 있습니다.`} /><Card icon={<Monitor className="w-6 h-6 text-blue-600" />} title="다시 풀기" description="최근 세트를 다시 응시할 수 있습니다." /></div>
        <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 py-3 mb-6"><Search className="w-4 h-4 text-slate-400" /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="시험명, 주제, 문항 검색" className="bg-transparent outline-none text-sm w-full" /></div>
        <div className="space-y-4">{filtered.map((item) => <article key={item.id} className="bg-white rounded-3xl border border-slate-200 p-6"><div className="flex items-center justify-between gap-4 flex-wrap mb-4"><div><div className="flex gap-2 flex-wrap mb-2"><Tag>{item.examTitle}</Tag><Tag>{item.topic}</Tag></div><h3 className="text-lg font-bold">{item.stem}</h3></div><span className="px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700">자동 저장됨</span></div><div className="grid md:grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div className="text-xs font-bold text-slate-500 mb-2">내 답안</div><p className="text-sm">{item.myAnswer}</p></div><div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div className="text-xs font-bold text-slate-500 mb-2">정답</div><p className="text-sm">{item.answer}</p></div></div><div className="rounded-2xl bg-blue-50 p-4 mt-3"><div className="text-xs font-bold text-blue-700 mb-2">해설</div><p className="text-sm leading-relaxed">{item.explanation}</p></div></article>)}</div>
        <div className="flex justify-end mt-6"><button onClick={onRetry} className="px-4 py-2 rounded-xl bg-slate-100 font-bold inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" />최근 세트 다시 풀기</button></div>
      </div>
    </main>
  );
}

function UploadBox({ title, files, onChange }: { title: string; files: string[]; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <label className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm cursor-pointer block"><input type="file" accept=".pdf,.doc,.docx" multiple className="hidden" onChange={onChange} /><div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-6"><Upload className="w-6 h-6 text-blue-600 mb-4" /><h3 className="text-lg font-bold">{title}</h3></div><div className="mt-4 flex flex-wrap gap-2">{files.length > 0 ? files.map((file) => <Tag key={file}>{file}</Tag>) : <div className="text-sm text-slate-500">선택된 파일 없음</div>}</div></label>;
}

function OptionGroup({ title, options, value, onChange }: { title: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200"><div className="text-sm font-bold mb-3">{title}</div><div className="flex flex-wrap gap-2">{options.map((option) => <button key={option} onClick={() => onChange(option)} className={`px-3 py-2 rounded-full text-xs font-bold ${value === option ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>{option}</button>)}</div></div>;
}

function Card({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm"><div className="mb-3">{icon}</div><h3 className="text-lg font-bold">{title}</h3><p className="text-sm text-slate-600 mt-2">{description}</p></div>;
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{children}</span>;
}

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: 'blue' | 'red' }) {
  const color = tone === 'blue' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700';
  return <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className={`p-2 rounded-xl ${color}`}>{icon}</div><span className="font-medium">{label}</span></div><span className="font-bold">{value}</span></div>;
}
