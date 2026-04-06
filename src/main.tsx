import { StrictMode, Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// Test comment
import { supabase } from './lib/supabase.ts';

void supabase;

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: Readonly<ErrorBoundaryProps>;

  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App render error:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
          <div className="mx-auto max-w-3xl border border-red-200 bg-white p-6">
            <p className="text-sm font-semibold text-red-700">앱 실행 오류</p>
            <h1 className="mt-2 text-2xl font-bold">배포 환경에서 런타임 오류가 발생했습니다.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Cloudflare Pages 미리보기에서 빈 화면이 보인다면, 브라우저 개발자 도구 콘솔과 네트워크 탭을 먼저 확인해 주세요.
              이 프로젝트는 프런트엔드와 별도 Express API(`/api`)를 함께 사용합니다.
            </p>
            <div className="mt-5 border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">오류 메시지</p>
              <pre className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                {this.state.error.message}
              </pre>
            </div>
            <div className="mt-5 space-y-2 text-sm text-slate-600">
              <p>확인할 항목:</p>
              <p>1. Cloudflare Pages 빌드 명령: `npm run build`</p>
              <p>2. 배포 출력 디렉터리: `dist`</p>
              <p>3. Pages 환경 변수: `VITE_API_BASE_URL`, `VITE_SUPABASE_*` 값 설정 여부</p>
              <p>4. `/api`는 Cloudflare Pages 정적 배포에 포함되지 않으므로 별도 서버 또는 Worker가 필요함</p>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
