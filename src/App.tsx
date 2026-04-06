import { useEffect, useState } from 'react';
import { SUBJECT_CONFIG, getSubjectSelectionDefaults } from './lib/question/subjectConfig';
import { getSchoolLevelLabel, getDifficultyLabel } from './lib/examUtils';

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

// 분리된 타입 및 커스텀 훅스
import type { Screen } from './lib/examTypes';
import { useAuth } from './hooks/useAuth';
import { useExamSync } from './hooks/useExamSync';
import { useExamGenerator } from './hooks/useExamGenerator';
import { useExamSession } from './hooks/useExamSession';

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');

  // --- 1. 인증 및 세션 훅 ---
  const auth = useAuth();

  // --- 2. 동기화 및 복구 훅 ---
  const sync = useExamSync(auth.sessionUserId, auth.isAnonymous);

  // --- 3. 문제 생성 훅 ---
  const generator = useExamGenerator(auth.sessionUserId, sync.savedExams, sync.setSavedExams);

  // --- 4. 시험 세션 훅 ---
  const session = useExamSession(
    auth.sessionUserId,
    sync.savedExams,
    sync.wrongNotes,
    sync.setSavedExams,
    sync.setWrongNotes
  );

  // --- 네비게이션 엔진 ---
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

  useEffect(() => {
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
    if (result.success && result.record) {
      session.startExam(result.record);
      navigate('taking');
    }
  };

  const onOpenSavedExam = (record: any) => {
    session.startExam(record);
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
          onSignOut={auth.handleSignOut}
        />
        <main className="min-h-screen bg-slate-100 px-3 pb-24 pt-4 text-slate-900 sm:px-5 sm:pt-6">
          <div className="mx-auto flex max-w-[980px] flex-col gap-4">
            <ExamHeader
              title={session.examTitle}
              subjectLabel={SUBJECT_CONFIG[session.examMeta.subject].label}
              schoolLevelLabel={getSchoolLevelLabel(session.examMeta.schoolLevel)}
              difficultyLabel={getDifficultyLabel(session.examMeta.difficulty)}
              currentIndex={session.currentQuestionIndex}
              totalCount={session.questions.length}
              answeredCount={session.answeredIds.size}
            />
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-4">
                <ExamQuestionList
                  questions={session.questions}
                  responses={session.responses}
                  currentIndex={session.currentQuestionIndex}
                  onVisibleChange={session.setCurrentQuestionIndex}
                  onSelectChoice={(id, choice) => session.setResponses(prev => ({ ...prev, [id]: choice }))}
                  onChangeText={(id, val) => session.setResponses(prev => ({ ...prev, [id]: val }))}
                />
                <ExamNavigation
                  answeredCount={session.answeredIds.size}
                  totalCount={session.questions.length}
                  onSubmit={onSubmitExam}
                  onScrollTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />
              </div>
              <div className="space-y-4 lg:sticky lg:top-6">
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
            </div>
          </div>
        </main>
      </>
    );
  }

  const renderContent = () => {
    switch (screen) {
      case 'landing': return <LandingScreen onNavigate={navigate} isAnonymous={auth.isAnonymous} />;
      case 'dashboard': return <DashboardScreen exams={sync.savedExams} onOpenExam={onOpenSavedExam} />;
      case 'create':
        return (
          <CreateScreen
            {...{ ...generator, onSelectSubject: generator.handleSubjectSelect, onGenerate, ready: generator.readyToGenerate }}
          />
        );
      case 'result':
        return <ResultScreen examTitle={session.examTitle} summary={session.summary} questions={session.questions} responses={session.responses} onBack={() => navigate('landing')} onWrong={() => navigate('wrong')} />;
      case 'saved':
        return (
          <SavedScreen
            exams={sync.savedExams}
            onOpen={onOpenSavedExam}
            onDelete={sync.removeSavedExam}
            onContinueGenerate={onContinueGenerate}
            onCreate={() => navigate('create')}
            onLogin={() => navigate('account')}
            isAnonymous={auth.isAnonymous}
            syncMessage={auth.syncMessage}
          />
        );
      case 'account':
        return auth.sessionUserId && !auth.isAnonymous ? (
          <AccountScreen email={auth.sessionUserEmail} initialDisplayName={auth.sessionDisplayName} syncMessage={auth.syncMessage} onDisplayNameChange={auth.setSessionDisplayName} onSignOut={auth.handleSignOut} />
        ) : (
          <AuthScreen onSuccess={() => window.location.reload()} />
        );
      case 'wrong':
        return (
          <WrongListScreen
            wrongNotes={sync.wrongNotes}
            savedExams={sync.savedExams}
            syncMessage={auth.syncMessage}
            onBack={handleBack}
            onRetry={() => {
              session.setCurrentQuestionIndex(1);
              navigate('taking');
            }}
            onDelete={sync.removeWrongNote}
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
        isAnonymous={auth.isAnonymous}
        sessionDisplayName={auth.sessionDisplayName}
        onSignOut={auth.handleSignOut}
      />
      {renderContent()}
      <BottomNavigation current={screen} onNavigate={navigate} isAnonymous={auth.isAnonymous} />
    </>
  );
}
