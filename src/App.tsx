import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { SUBJECT_CONFIG, getSubjectSelectionDefaults, type SubjectKey } from './lib/question/subjectConfig';
import { getSchoolLevelLabel, getDifficultyLabel, normalizeToSubjectKey } from './lib/examUtils';

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
import { ImageScanScreen } from './components/screens/ImageScanScreen';
import { CreateSelectionScreen } from './components/screens/CreateSelectionScreen';

// 분리된 타입 및 커스텀 훅스
import type { Screen } from './lib/examTypes';
import { useAuth } from './hooks/useAuth';
import { useExamSync } from './hooks/useExamSync';
import { useExamGenerator } from './hooks/useExamGenerator';
import { useExamSession } from './hooks/useExamSession';
import { useImageScan } from './hooks/useImageScan';

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [savedScreenSubject, setSavedScreenSubject] = useState<string>('전체');

  // --- 1. 인증 및 세션 훅 ---
  const auth = useAuth();

  // --- 2. 동기화 및 복구 훅 ---
  const sync = useExamSync(auth.sessionUserId, auth.isAnonymous);

  // --- 3. 문제 생성 훅 ---
  const generator = useExamGenerator(auth.sessionUserId, auth.isAnonymous, sync.savedExams, sync.setSavedExams);

  // --- 4. 시험 세션 훅 ---
  const imageScan = useImageScan(auth.sessionUserId, sync.savedExams, sync.setSavedExams);

  const session = useExamSession(
    auth.sessionUserId,
    sync.savedExams,
    sync.wrongNotes,
    sync.setSavedExams,
    sync.setWrongNotes
  );

  useEffect(() => {
    if (screen === 'create-selection') {
      generator.reset();
    }
  }, [screen]);

  // --- 네비게이션 엔진 ---
  const navigate = (next: Screen, replace = false) => {
    // 보호가 필요한 화면 리스트 (익명 사용자 체험을 위해 create, create-selection은 제외)
    const protectedScreens: Screen[] = ['image-scan', 'wrong', 'saved'];
    
    if (protectedScreens.includes(next) && auth.isAnonymous) {
      let message = '이 기능은 로그인 후 이용 가능한 서비스입니다. 로그인 화면으로 이동합니다.';
      if (next === 'wrong') {
        message = '오답 노트와 지능형 취약점 분석은 회원가입 후 이용하실 수 있습니다. 지금 가입하고 틀린 문제를 관리해보세요!';
      } else if (next === 'saved') {
        message = '시험지 저장 및 기기 간 동기화는 회원가입 후 이용하실 수 있습니다.';
      } else if (next === 'image-scan') {
        message = 'PDF 분석 및 문제 추출 기능은 회원가입 후 이용 가능합니다.';
      }
      
      alert(message);
      setScreen('account');
      window.history.pushState({ screen: 'account' }, '', '');
      return;
    }

    if (next === 'create-selection') {
      generator.reset();
    }

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

  useEffect(() => {
    // 새로고침 시 최상단으로 이동
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.screen) {
        setScreen(event.state.screen as Screen);
      } else {
        setScreen('landing');
      }
    };
    window.history.replaceState({ screen: 'landing' }, '', '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- 핸들러 연동 ---
  const onGenerate = async () => {
    const result = await generator.generateExam();
    
    // 만약 익명 사용자 제한에 걸렸다면 알림 후 로그인 유도
    if (!result.success && (result as any).isLimitReached) {
      alert(result.error);
      navigate('account');
      return;
    }

    if (result.success && result.record) {
      session.startExam(result.record);
      // 자동 과목 필터 동기화
      const subjectKey = normalizeToSubjectKey(result.record.subject, result.record.title, result.record.questions?.[0]?.topic, result.record.questions, result.record.exam_format);
      const label = subjectKey ? SUBJECT_CONFIG[subjectKey].label : '기타 과목';
      setSavedScreenSubject(label);
      navigate('taking');
    }
  };

  const onOpenSavedExam = (record: any) => {
    session.startExam(record);
    // 자동 과목 필터 동기화
    const subjectKey = normalizeToSubjectKey(record.subject, record.title, record.questions?.[0]?.topic, record.questions, record.exam_format);
    const label = subjectKey ? SUBJECT_CONFIG[subjectKey].label : '기타 과목';
    setSavedScreenSubject(label);
    navigate('taking');
  };

  const onContinueGenerate = (record: any) => {
    generator.setMode('ai');
    generator.handleSubjectSelect(record.subject);
    generator.setDifficulty(record.difficulty);
    generator.setSchoolLevel(record.exam_format);
    generator.setCount(record.question_count);
    generator.setGenerationTopic(record.title);
    generator.setMaterialText(record.source_text ?? '');
    navigate('create');
  };

  const onSubmitExam = async () => {
    await session.submitExam();
    navigate('result');
  };

  const onImageScan = async (params: Parameters<typeof imageScan.importPdf>[0]) => {
    const result = await imageScan.importPdf(params);
    if (result.success && result.record) {
      session.startExam(result.record);
      
      // 사용자 선택 과목을 기반으로 상단 필터 동기화 (추론 우회)
      const label = SUBJECT_CONFIG[params.subject].label;
      setSavedScreenSubject(label);
      
      navigate('taking');
    }
  };

  // --- 렌더링 로직 ---
  if (screen === 'taking' && session.questions.length > 0) {
    return (
      <>
        <TopBar
          current={screen}
          onNavigate={navigate}
          onBack={handleBack}
          isAnonymous={auth.isAnonymous}
          sessionDisplayName={auth.sessionDisplayName}
          sessionUserAvatar={auth.sessionUserAvatar}
          onSignOut={auth.handleSignOut}
        />
        <main className="min-h-screen bg-slate-50 px-4 pb-20 pt-4 text-slate-900 sm:px-6 sm:pt-6 lg:pb-10">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
            {/* 왼쪽: 메인 문제 영역 */}
            <div className="flex-1 space-y-6">
              <div className="lg:hidden">
                <ExamHeader
                  title={session.examTitle}
                  subjectLabel={SUBJECT_CONFIG[session.examMeta.subject].label}
                  schoolLevelLabel={getSchoolLevelLabel(session.examMeta.schoolLevel)}
                  difficultyLabel={getDifficultyLabel(session.examMeta.difficulty)}
                  currentIndex={session.currentQuestionIndex}
                  totalCount={session.questions.length}
                  answeredCount={session.answeredIds.size}
                />
              </div>
              
              <div className="bg-white p-2 shadow-sm ring-1 ring-slate-200/60 sm:rounded-2xl sm:p-4">
                <ExamQuestionList
                  questions={session.questions}
                  responses={session.responses}
                  currentIndex={session.currentQuestionIndex}
                  onVisibleChange={session.setCurrentQuestionIndex}
                  onSelectChoice={(id, choice) => session.setResponses(prev => ({ ...prev, [id]: choice }))}
                  onChangeText={(id, val) => session.setResponses(prev => ({ ...prev, [id]: val }))}
                />
              </div>

              <div className="bg-white p-6 shadow-sm ring-1 ring-slate-200/60 sm:rounded-2xl">
                <ExamNavigation
                  answeredCount={session.answeredIds.size}
                  totalCount={session.questions.length}
                  onSubmit={onSubmitExam}
                  onScrollTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />
              </div>
            </div>

            {/* 오른쪽: 데스크탑용 사이드바 (정보 및 OMR) */}
            <aside className="w-full space-y-6 lg:sticky lg:top-6 lg:w-[320px]">
              <div className="hidden lg:block lg:rounded-2xl lg:bg-white lg:p-6 lg:shadow-sm lg:ring-1 lg:ring-slate-200/60">
                <ExamHeader
                  title={session.examTitle}
                  subjectLabel={SUBJECT_CONFIG[session.examMeta.subject].label}
                  schoolLevelLabel={getSchoolLevelLabel(session.examMeta.schoolLevel)}
                  difficultyLabel={getDifficultyLabel(session.examMeta.difficulty)}
                  currentIndex={session.currentQuestionIndex}
                  totalCount={session.questions.length}
                  answeredCount={session.answeredIds.size}
                  isSidebar={true}
                />
              </div>

              <div className="bg-white p-6 shadow-sm ring-1 ring-slate-200/60 sm:rounded-2xl">
                <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-slate-400">문항 네비게이터 (OMR)</h3>
                <QuestionPalette
                  totalCount={session.questions.length}
                  currentIndex={session.currentQuestionIndex}
                  answeredIds={session.answeredIds}
                  onJump={(index) => {
                    session.setCurrentQuestionIndex(index);
                    document.getElementById(`exam-question-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                />
              </div>
            </aside>
          </div>
        </main>
      </>
    );
  }

  const renderContent = () => {
    return (
      <main className="min-h-screen pt-4 sm:pt-6">
        <div className="mx-auto max-w-[1280px]">
          {(() => {
            switch (screen) {
              case 'landing': return <LandingScreen onNavigate={navigate} isAnonymous={auth.isAnonymous} />;
              case 'dashboard': return <DashboardScreen exams={sync.savedExams} onOpenExam={onOpenSavedExam} />;
              case 'create-selection':
                return <CreateSelectionScreen onNavigate={navigate} />;
              case 'create':
                return (
                  <CreateScreen
                    {...{ ...generator, onSelectSubject: generator.handleSubjectSelect, onGenerate, ready: generator.readyToGenerate }}
                  />
                );
              case 'result':
                return (
                  <ResultScreen 
                    examTitle={session.examTitle} 
                    summary={session.summary} 
                    questions={session.questions} 
                    responses={session.responses} 
                    onBack={() => navigate('saved')} 
                    onWrong={() => navigate('wrong')} 
                  />
                );
              case 'saved':
                return (
                  <SavedScreen
                    exams={sync.savedExams}
                    onOpen={onOpenSavedExam}
                    onDelete={sync.removeSavedExam}
                    onDeleteMultiple={sync.removeSavedExams}
                    onContinueGenerate={onContinueGenerate}
                    onCreate={() => {
                      generator.reset();
                      navigate('create-selection');
                    }}
                    onLogin={() => navigate('account')}
                    isAnonymous={auth.isAnonymous}
                    syncMessage={auth.syncMessage}
                    selectedSubject={savedScreenSubject}
                    onSelectSubject={setSavedScreenSubject}
                  />
                );
              case 'account':
                return auth.sessionUserId && !auth.isAnonymous ? (
                  <AccountScreen 
                    userId={auth.sessionUserId}
                    email={auth.sessionUserEmail} 
                    initialDisplayName={auth.sessionDisplayName} 
                    initialAvatarUrl={auth.sessionUserAvatar}
                    syncMessage={auth.syncMessage} 
                    onDisplayNameChange={auth.setSessionDisplayName} 
                    onAvatarChange={auth.setSessionUserAvatar}
                    onSignOut={auth.handleSignOut} 
                  />
                ) : (
                  <AuthScreen onSuccess={() => navigate('dashboard')} />
                );
              case 'image-scan':
                return (
                  <ImageScanScreen
                    onImport={onImageScan}
                    isImporting={imageScan.isImporting}
                    importError={imageScan.importError}
                    importProgress={imageScan.importProgress}
                  />
                );
              case 'wrong':
                return (
                  <WrongListScreen
                    wrongNotes={sync.wrongNotes}
                    savedExams={sync.savedExams}
                    syncMessage={auth.syncMessage}
                    onBack={handleBack}
                    onRetry={async (title, notes) => {
                      const result = await generator.generateSimilarExam(title, notes);
                      if (result.success && result.record) {
                        session.startExam(result.record);
                        navigate('taking');
                      }
                    }}
                    onDelete={sync.removeWrongNote}
                  />
                );
              default: return null;
            }
          })()}
        </div>
      </main>
    );
  };

  return (
    <>
      <TopBar
        current={screen}
        onNavigate={navigate}
        onBack={handleBack}
        isAnonymous={auth.isAnonymous}
        sessionDisplayName={auth.sessionDisplayName}
        sessionUserAvatar={auth.sessionUserAvatar}
        onSignOut={auth.handleSignOut}
      />
      {renderContent()}
      <BottomNavigation current={screen} onNavigate={navigate} isAnonymous={auth.isAnonymous} className="lg:hidden" />

      {/* 글로벌 로딩 오버레이 (AI 문제 생성 및 분석 전체 적용) */}
      {(generator.isGenerating || imageScan.isImporting) && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative mb-8">
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-100 opacity-75" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
              <Sparkles className="h-10 w-10 text-blue-600 animate-pulse" />
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <h2 className="text-xl font-black text-slate-900">
              {screen === 'wrong' ? '유사 유형 문제 분석 중' : 
               screen === 'image-scan' ? '문서 분석 및 문제 추출 중' : '지능형 문제 생성 중'}
            </h2>
            <p className="max-w-[320px] text-[14px] font-bold leading-relaxed text-slate-500">
              {screen === 'wrong' 
                ? 'AI가 오답 데이터를 기반으로\n취약점 보정 문항을 설계하고 있습니다...' 
                : screen === 'image-scan'
                ? '문서의 내용을 정밀하게 스캔하여\n최적의 문제 데이터로 변환하고 있습니다...'
                : 'AI 알고리즘이 학습 최적화 데이터를 바탕으로\n고품질 문항을 실시간으로 생성하고 있습니다...'}
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-[12px] font-black text-blue-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>
                {screen === 'wrong' || screen === 'image-scan' 
                  ? '곧 새로운 시험이 시작됩니다' 
                  : '최상의 평가 품질을 위해 분석 중입니다'}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
