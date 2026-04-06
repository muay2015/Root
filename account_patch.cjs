const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add imports for AuthScreen and AccountScreen if not present.
if (!code.includes('AuthScreen')) {
  code = code.replace(
    "import { ExamQuestionList } from './components/exam/ExamQuestionList';",
    "import { AuthScreen } from './components/auth/AuthScreen';\nimport { AccountScreen } from './components/account/AccountScreen';\nimport { ExamQuestionList } from './components/exam/ExamQuestionList';"
  );
}

if (!code.includes("import { AuthScreen }") && code.includes("from './components/auth/AuthScreen'") === false) {
    code = "import { AuthScreen } from './components/auth/AuthScreen';\nimport { AccountScreen } from './components/account/AccountScreen';\n" + code;
}

// 2. Add 'account' to Screen
code = code.replace(
  "type Screen = 'landing' | 'create' | 'taking' | 'result' | 'wrong' | 'saved';",
  "type Screen = 'landing' | 'create' | 'taking' | 'result' | 'wrong' | 'saved' | 'account';"
);

// 3. Update TopBar to include the account button
const topBarRegex = /function TopBar\(\{\s*current,\s*onNavigate\s*\}\s*:\s*\{\s*current:\s*Screen;\s*onNavigate:\s*\(screen:\s*Screen\)\s*=>\s*void\s*\}\)\s*\{([\s\S]*?)<\/header>\s*\);/g;

code = code.replace(topBarRegex, (match, inner) => {
  return `function TopBar({ current, onNavigate }: { current: Screen; onNavigate: (screen: Screen) => void }) {
  const currentLabel =
    current === 'landing' ? '홈' :
    current === 'create' ? 'CBT 생성' :
    current === 'taking' ? '응시' :
    current === 'result' ? '결과' :
    current === 'saved' ? '저장된 문제' :
    current === 'account' ? '내 계정' :
    '오답노트';

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (current === 'landing' ? undefined : onNavigate('landing'))}
            className={\`flex h-11 w-11 items-center justify-center border \${
              current === 'landing'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }\`}
          >
            <Bot className="h-6 w-6" />
          </button>
          <span className="text-lg font-bold tracking-tight text-slate-900">{currentLabel}</span>
        </div>
        <button
          onClick={() => onNavigate('account')}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  );`;
});

// 4. Update the render loop to include the account screen condition
const oldRenderCondition = `  } else {
    content = (
      <WrongListScreen`;

const newRenderCondition = `  } else if (screen === 'account') {
    content = sessionUserId ? (
      <AccountScreen
        email={"내 계정"}
        initialDisplayName={"사용자"}
        syncMessage={syncMessage}
        onDisplayNameChange={() => {}}
      />
    ) : (
      <AuthScreen />
    );
  } else {
    content = (
      <WrongListScreen`;

code = code.replace(oldRenderCondition, newRenderCondition);

fs.writeFileSync('src/App.tsx', code);
console.log('Account module re-activated');
