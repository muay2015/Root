import { useEffect, useMemo, useState } from 'react';
import {
  completeExam,
  deleteWrongNotesByTitle,
  ensureSupabaseUser,
  fetchExamRecords,
  fetchWrongNotes,
  loadLocalExamList,
  loadLocalWrongNotes,
  saveExamDraft,
  saveWrongNotes,
  storeLocalExamList,
  storeLocalLastExam,
  storeLocalWrongNotes,
  type PersistedExamRecord,
  type PersistedWrongNote,
  saveExamRecords,
  deleteExamRecordFromServer
} from './lib/rootPersistence';
import { supabase } from './lib/supabase';
import {
  hasPlaceholderChoices,
  normalizeGeneratedQuestions,
  normalizeStoredQuestions,
  toGeneratedQuestionMode,
  type GeneratedQuestionMode,
} from './lib/examGeneration';
import {
  SUBJECT_CONFIG,
  getSubjectSelectionDefaults,
  getSubjectSelectionLabel,
  usesNoSelector,
  type SelectionFormat,
  type SubjectKey,
} from './lib/question/subjectConfig';
import { getApiUrl, parseJsonResponse } from './lib/api';

// 분리된 컴포넌트들
import { ExamHeader } from './components/exam/ExamHeader';
import { AuthScreen } from './components/auth/AuthScreen';
import { AccountScreen } from './components/account/AccountScreen';
import { ExamQuestionList } from './components/exam/ExamQuestionList';
import { ExamNavigation } from './components/exam/ExamNavigation';
import { QuestionPalette } from './components/exam/QuestionPalette';
import { TopBar } from './components/layout/TopBar';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { LandingScreen } from './components/screens/LandingScreen';
import { CreateScreen } from './components/screens/CreateScreen';
import { ResultScreen } from './components/screens/ResultScreen';
import { SavedScreen } from './components/screens/SavedScreen';
import { WrongListScreen } from './components/screens/WrongListScreen';
import { DashboardScreen } from './components/screens/DashboardScreen';

// 분리된 타입 및 유틸리티
import type { ExamQuestion } from './components/exam/types';
import type { Screen, BuilderMode, DifficultyLevel, SchoolLevel, WrongNote, ExamMeta } from './lib/examTypes';
import {
  buildQuestions,
  getDifficultyLabel,
  getSchoolLevelLabel,
  inferUploadMode,
  isDifficultyLevel,
  isSchoolLevel,
  isSubjectKey,
  inferSubjectFromTitle,
  makeExamTitle,
  mergeExamRecords,
  mergeWrongNotes,
  normalizeAnswer,
  toResponseMap,
} from './lib/examUtils';

export default function App() {
  const defaultSubject: SubjectKey = 'english';
  const defaultSelection = getSubjectSelectionDefaults(defaultSubject);

  // --- 상태 관리 ---
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
  const [savedExams, setSavedExams] = useState<PersistedExamRecord[]>([]);
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [sessionUserEmail, setSessionUserEmail] = useState<string | null>(null);
  const [sessionDisplayName, setSessionDisplayName] = useState('사용자');
  const [syncMessage, setSyncMessage] = useState('Supabase 연결 상태 확인 중...');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const selectionLabel = getSubjectSelectionLabel(subject, questionType, format);
  const readyToGenerate = mode === 'upload'
    ? questionFiles.length > 0 && answerFiles.length > 0
    : generationTopic.trim().length >= 2 || materialText.trim().length >= 20;

  // --- 초기 로드 ---
  useEffect(() => {
    const localWrong = loadLocalWrongNotes<WrongNote>();
    const localExams = loadLocalExamList<PersistedExamRecord>();
    if (localWrong.length > 0) setWrongNotes(localWrong);
    if (localExams.length > 0) setSavedExams(mergeExamRecords(localExams));

    void (async () => {
      const auth = await ensureSupabaseUser();
      if (!auth.data) {
        setSyncMessage(auth.error ?? '로컬 저장 모드');
        return;
      }

      setSessionUserId(auth.data.id);
      setIsAnonymous(auth.data.is_anonymous ?? true);
      setSessionUserEmail(auth.data.email ?? null);
      setSessionDisplayName(String(auth.data.user_metadata?.display_name ?? '사용자'));
      setSyncMessage('Supabase 세션 연결 완료');

      const [examsResult, wrongResult] = await Promise.all([
        fetchExamRecords(auth.data.id),
        fetchWrongNotes(auth.data.id),
      ]);

      if (examsResult.data) {
        const localExams = loadLocalExamList<PersistedExamRecord>();
        
        // 서버 데이터 가공 및 자가 치유 (과목 유추 포함)
        const serverExams = (examsResult.data as PersistedExamRecord[]).map(e => {
          if (!isSubjectKey(e.subject)) {
            const healedSubject = inferSubjectFromTitle(e.title);
            if (healedSubject) {
              return { ...e, subject: healedSubject, isSynced: false };
            }
          }
          return { ...e, isSynced: true };
        });

        const serverIds = new Set(serverExams.map(e => e.id));
        
        // [강제 복구] 서버에 없는데 로컬에만 있는 '고아' 데이터 구출하여 서버로 강제 재동기화
        const missingFromServer = localExams
          .filter(e => !serverIds.has(e.id))
          .map(e => ({ ...e, isSynced: false }));
        
        const healedLocals = serverExams.filter(e => !e.isSynced);
        const pendingUploads = [...missingFromServer, ...healedLocals];
        
        const merged = mergeExamRecords([...serverExams, ...missingFromServer]);
        setSavedExams(merged);
        storeLocalExamList(merged);
        
        // 구출된 데이터들을 서버로 즉시 재전송하여 100% 복구 완료
        if (pendingUploads.length > 0) {
          const result = await saveExamRecords(auth.data.id, pendingUploads);
          if (result.data) {
            const final = (result.data as PersistedExamRecord[]).map(e => ({ ...e, isSynced: true }));
            setSavedExams(final);
            storeLocalExamList(final);
          }
        }
      }

      if (wrongResult.data) {
        const localWrong = loadLocalWrongNotes<PersistedWrongNote>();
        const serverNotes = wrongResult.data as WrongNote[];
        const serverIds = new Set(serverNotes.map(n => n.id));
        const newLocalOnly = localWrong.filter(n => !serverIds.has(n.id));

        if (newLocalOnly.length > 0) {
          const merged = mergeWrongNotes([...serverNotes, ...newLocalOnly]);
          setWrongNotes(merged);
          storeLocalWrongNotes(merged);
          await saveWrongNotes(auth.data.id, merged);
        } else {
          setWrongNotes(serverNotes);
          storeLocalWrongNotes(serverNotes);
        }
      }
    })();
  }, []);

  const handleSignOut = async () => {
    try {
      setSyncMessage('로그아웃 중...');
      await supabase.auth.signOut();
      
      // 상태 초기화
      setSavedExams([]);
      setWrongNotes([]);
      setSessionUserId(null);
      setSessionUserEmail('');
      setSessionDisplayName('사용자');
      setIsAnonymous(true);
      
      setSyncMessage('로그아웃 완료');
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      console.error('로그아웃 실패:', err);
      window.location.reload();
    }
  };

  // --- 오답 통계 계산 ---
  const summary = useMemo(() => {
    const wrong = questions.flatMap((question) => {
      const myAnswer = responses[question.id] ?? '';
      return normalizeAnswer(myAnswer) === normalizeAnswer(question.answer)
        ? []
        : [{
            id: `${examMeta.subject}___${examTitle}-${question.id}`,
            examTitle,
            subject: examMeta.subject,
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
  }, [examTitle, questions, responses, examMeta.subject]);

  const answeredIds = new Set(
    Object.entries(responses)
      .filter(([, value]) => String(value).trim().length > 0)
      .map(([key]) => Number(key)),
  );

  // --- 핸들러 함수들 ---
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
        mode, subject, schoolLevel, difficulty, count, generationTopic, selectionLabel
      );

      let resolvedTitle = nextTitle;

      if (mode === 'ai') {
        const finalMaterialText = (materialText.trim().length < 20 && generationTopic.trim().length >= 2)
          ? `이 문제는 사용자가 입력한 단원명 '${generationTopic.trim()}'에 기초하여 생성되는 문제입니다. 추가 자료는 제공되지 않았습니다.`
          : materialText;

        const response = await fetch(getApiUrl('/api/ai/generate-exam'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            materialText: finalMaterialText,
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

        const data = await parseJsonResponse<{
          title?: string;
          questions?: ExamQuestion[];
          source?: 'ai' | 'mock';
          error?: string;
          reasons?: string[];
        }>(response);

        if (!response.ok) {
          throw new Error(data.error || 'AI 문제 생성에 실패했습니다.');
        }

        if (Array.isArray(data.questions) && data.questions.length > 0) {
          nextQuestions = normalizeGeneratedQuestions('multiple', data.questions) as ExamQuestion[];
          nextQuestionMode = 'multiple';

          if (nextQuestions.some(q => !q.stem?.trim() || hasPlaceholderChoices(q.choices))) {
            throw new Error('불완전한 문항이 생성되었습니다. 다시 시도해 주세요.');
          }
        } else {
          throw new Error('생성된 문항이 없습니다.');
        }

        resolvedTitle = data.title || nextTitle;
      }

      setQuestions(nextQuestions);
      setGeneratedQuestionMode(nextQuestionMode);
      setExamTitle(resolvedTitle);
      setResponses({});
      setCurrentQuestionIndex(1);
      setExamMeta({ subject, difficulty, schoolLevel, count });
      setCurrentExamId(null);

      if (sessionUserId) {
        const saved = await saveExamDraft(sessionUserId, {
          title: resolvedTitle,
          subject, // 추가된 부분: 현재 과목 키를 명시적으로 저장
          builderMode: mode,
          questionType: nextQuestionMode,
          difficulty,
          examFormat: schoolLevel,
          questionCount: count,
          sourceText: materialText,
          questionFiles,
          answerFiles,
          questions: nextQuestions as any,
        });

        if (saved.data) {
          // 서버 응답에 과목 정보가 없더라도 현재 선택된 과목 정보를 강제 병합하여 상태에 반영 (배포 환경 대비)
          const recordWithSubject = { 
            ...saved.data, 
            isSynced: true, // 즉시 동기화 완료 상태로 표시
            subject: (saved.data as any).subject || subject 
          } as PersistedExamRecord;
          
          const nextSavedExams = mergeExamRecords([recordWithSubject, ...savedExams]);
          setSavedExams(nextSavedExams);
          storeLocalExamList(nextSavedExams);
          setCurrentExamId(recordWithSubject.id);
          storeLocalLastExam(recordWithSubject);
        }
      } else {
        // [익명 사용자 지원] 로그인하지 않은 경우 로컬 전용 기록 생성 및 저장
        const localRecord: PersistedExamRecord = {
          id: `local-${Date.now()}`,
          title: resolvedTitle,
          subject, // 과목 키 저장
          builder_mode: mode,
          question_type: nextQuestionMode,
          difficulty,
          exam_format: schoolLevel,
          question_count: count,
          source_text: materialText,
          question_files: questionFiles,
          answer_files: answerFiles,
          questions: nextQuestions as any,
          responses: {},
          score: null,
          correct_count: null,
          wrong_count: null,
          submitted_at: null,
          created_at: new Date().toISOString(),
        };

        const nextSavedExams = mergeExamRecords([localRecord, ...savedExams]);
        setSavedExams(nextSavedExams);
        storeLocalExamList(nextSavedExams);
        setCurrentExamId(localRecord.id);
        storeLocalLastExam(localRecord);
      }

      navigate('taking');
      
      // 입력 필드 초기화
      setGenerationTopic('');
      setMaterialText('');
      setQuestionFiles([]);
      setAnswerFiles([]);
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
        const result = await completeExam(sessionUserId, {
          examId: currentExamId,
          responses,
          score: summary.score,
          correctCount: summary.correctCount,
          wrongCount: summary.wrongCount,
        });

        // 시험 완료 후 서버로부터 받은 최신 정보(점수 등)를 로컬 목록에 반영
        if (result.data) {
          const updatedRecord = { ...result.data, isSynced: true } as PersistedExamRecord;
          const nextSavedExams = mergeExamRecords([updatedRecord, ...savedExams]);
          setSavedExams(nextSavedExams);
          storeLocalExamList(nextSavedExams);
        }
      }
    }
    navigate('result');
  };

  const navigate = (next: Screen, replace = false) => {
    window.scrollTo(0, 0);
    if (replace) {
      window.history.replaceState({ screen: next }, '', '');
    } else {
      window.history.pushState({ screen: next }, '', '');
    }
    setScreen(next);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('landing', true);
    }
  };

  // 브라우저 뒤로 가기/앞으로 가기 연동
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.screen) {
        setScreen(event.state.screen as Screen);
      } else {
        setScreen('landing');
      }
    };

    // 초기 상태 설정
    window.history.replaceState({ screen: 'landing' }, '', '');
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleWrongNoteDelete = async (title: string) => {
    const previousNotes = [...wrongNotes];
    const filtered = wrongNotes.filter((n) => n.examTitle !== title);
    
    // 낙관적 업데이트
    setWrongNotes(filtered);
    storeLocalWrongNotes(filtered);

    if (sessionUserId) {
      const result = await deleteWrongNotesByTitle(sessionUserId, title);
      if (result.error) {
        console.error('오답 삭제 실패:', result.error);
        // 실패 시 복구
        setWrongNotes(previousNotes);
        storeLocalWrongNotes(previousNotes);
        setSyncMessage('오답 삭제에 실패하여 이전 데이터가 복구되었습니다.');
      } else {
        setSyncMessage('오답 리스트가 서버에서도 성공적으로 삭제되었습니다.');
      }
    }
  };

  const openSavedExam = (record: PersistedExamRecord) => {
    const restoredMode = toGeneratedQuestionMode(record.question_type);
    const restoredSubject = isSubjectKey(record.subject) ? record.subject : defaultSubject;

    setCurrentExamId(record.id);
    setExamTitle(record.title);
    setQuestions(normalizeStoredQuestions(record.questions as ExamQuestion[], restoredMode) as ExamQuestion[]);
    setGeneratedQuestionMode(restoredMode);
    setResponses(toResponseMap(record.responses));
    setCurrentQuestionIndex(1);
    setExamMeta({
      subject: restoredSubject,
      difficulty: isDifficultyLevel(record.difficulty) ? record.difficulty : 'hard',
      schoolLevel: isSchoolLevel(record.exam_format) ? record.exam_format : 'high',
      count: record.question_count,
    });
    storeLocalLastExam(record);
    navigate('taking');
  };

  const deleteSavedExam = async (recordId: string) => {
    if (!confirm('문제를 삭제하시겠습니까? 관련 오답 정보도 모두 삭제됩니다.')) return;

    if (sessionUserId && !isAnonymous) {
      await deleteExamRecordFromServer(sessionUserId, recordId);
    }
    
    const updated = savedExams.filter((e) => e.id !== recordId);
    setSavedExams(updated);
    storeLocalExamList(updated);
    
    const deletedRecord = savedExams.find(e => e.id === recordId);
    if (deletedRecord && sessionUserId && !isAnonymous) {
      await deleteWrongNotesByTitle(sessionUserId, deletedRecord.title);
    }
  };

  const continueGenerateFromSavedExam = (record: PersistedExamRecord) => {
    const restoredSubject = isSubjectKey(record.subject) ? record.subject : defaultSubject;
    const nextDefaults = getSubjectSelectionDefaults(restoredSubject);

    setMode('ai');
    setSubject(restoredSubject);
    setQuestionType(nextDefaults.questionType);
    setFormat(nextDefaults.format);
    setDifficulty(isDifficultyLevel(record.difficulty) ? record.difficulty : 'hard');
    setSchoolLevel(isSchoolLevel(record.exam_format) ? record.exam_format : 'high');
    setCount(record.question_count);
    setGenerationTopic(record.title);
    setMaterialText(record.source_text ?? '');
    setQuestionFiles([]);
    setAnswerFiles([]);
    setGenerationError(null);
    navigate('create');
  };

  // --- 렌더링 로직 ---
  if (screen === 'taking' && questions.length > 0) {
    return (
      <>
        <TopBar
          current={screen}
          onNavigate={navigate}
          onBack={handleBack}
          isAnonymous={isAnonymous}
          sessionDisplayName={sessionDisplayName}
          onSignOut={handleSignOut}
        />
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
                  onSelectChoice={(id, choice) => setResponses(prev => ({ ...prev, [id]: choice }))}
                  onChangeText={(id, val) => setResponses(prev => ({ ...prev, [id]: val }))}
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
                    document.getElementById(`exam-question-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                />
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  const renderContent = () => {
    switch (screen) {
      case 'landing': return <LandingScreen onNavigate={navigate} isAnonymous={isAnonymous} />;
      case 'dashboard': return <DashboardScreen exams={savedExams} onOpenExam={openSavedExam} />;
      case 'create':
        return (
          <CreateScreen
            {...{ mode, setMode, subject, onSelectSubject: handleSubjectSelect, questionType, setQuestionType, format, setFormat, difficulty, setDifficulty, schoolLevel, setSchoolLevel, count, setCount, generationTopic, setGenerationTopic, materialText, setMaterialText, questionFiles, answerFiles, setQuestionFiles, setAnswerFiles, ready: readyToGenerate, isGenerating, generationError, onGenerate: handleGenerate }}
          />
        );
      case 'result':
        return <ResultScreen examTitle={examTitle} summary={summary} questions={questions} responses={responses} onBack={() => navigate('landing')} onWrong={() => navigate('wrong')} />;
      case 'saved':
        return (
          <SavedScreen
            exams={savedExams}
            onOpen={openSavedExam}
            onDelete={deleteSavedExam}
            onContinueGenerate={continueGenerateFromSavedExam}
            onCreate={() => navigate('create')}
            onLogin={() => navigate('account')}
            isAnonymous={isAnonymous}
            syncMessage={syncMessage}
          />
        );
      case 'account':
        return sessionUserId && !isAnonymous ? (
          <AccountScreen email={sessionUserEmail} initialDisplayName={sessionDisplayName} syncMessage={syncMessage} onDisplayNameChange={setSessionDisplayName} onSignOut={handleSignOut} />
        ) : (
          <AuthScreen onSuccess={() => window.location.reload()} />
        );
      case 'wrong':
        return (
          <WrongListScreen
            wrongNotes={wrongNotes}
            savedExams={savedExams}
            syncMessage={syncMessage}
            onBack={handleBack}
            onRetry={() => {
              setCurrentQuestionIndex(1);
              navigate('taking');
            }}
            onDelete={handleWrongNoteDelete}
          />
        );
      default: return null;
    }
  };

  return (
    <>
      <TopBar
        current={screen}
        onNavigate={navigate}
        onBack={handleBack}
        isAnonymous={isAnonymous}
        sessionDisplayName={sessionDisplayName}
        onSignOut={handleSignOut}
      />
      {renderContent()}
      <BottomNavigation current={screen} onNavigate={navigate} isAnonymous={isAnonymous} />
    </>
  );
}
