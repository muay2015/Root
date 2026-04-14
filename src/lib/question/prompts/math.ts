import { type SubjectKey } from '../subjectConfig';
import { type PromptBuildInput, buildFeedbackBlock, buildSourceMaterialBlock } from './core';
import { getGenerationRules } from '../generationRules';

export function isMathSubject(subject: SubjectKey): boolean {
  if (!subject) return false;
  const s = subject.toString().toLowerCase();
  return s.includes('math');
}

/**
 * 수학 과목 전용 프롬프트 규칙.
 * AI가 수학 문항을 생성할 때 LaTeX 표기, 필드 분리, 발문 형식 등의 품질을 보장합니다.
 */
export function buildMathPromptRules(): string[] {
  return [
    // ========== 절대 금지 (위반 시 문항 전체 폐기) ==========
    '- [MATH FATAL] 수식의 평문/LaTeX 이중 출력을 절대 금지합니다. "함수 f(x)\\(f(x)\\)" 또는 "수열 {an}\\(\\{a_n\\}\\)" 처럼 같은 수식을 두 번 쓰면 즉시 폐기합니다. 반드시 LaTeX 한 번만 사용하십시오. 올바른 예: "함수 \\(f(x)\\)에 대하여"',
    '- [MATH FATAL] 선지(choices)에 "1", "2", "3", "4", "5" 같은 순번만 넣는 것을 절대 금지합니다. 각 선지는 반드시 구체적인 수학적 값이나 수식이어야 합니다. 예: "7", "\\(\\frac{3}{2}\\)", "\\(2\\sqrt{3}\\)", "\\(-1\\)", "12"',
    '- [MATH FATAL] "~에 관한 분석으로 적절한 것은?", "~에 관한 설명으로 적절한 것은?" 같이 구체적 계산 없이 서술형 해석만 묻는 발문을 금지합니다. 수학 문항의 정답은 반드시 구체적 수치, 수식, 또는 명확한 참/거짓 판별이어야 합니다.',

    // ========== LaTeX 표기 규칙 ==========
    '- [MATH LATEX] 모든 수식 변수, 함수명, 연산은 반드시 LaTeX 구분자 안에서만 표현하십시오. 인라인: \\(...\\), 디스플레이: \\[...\\]',
    '- [MATH LATEX] 한글 문장 안에 a>=3, f(x)=0, lim 같은 평문 수식을 쓰지 마십시오. 반드시 \\(a \\ge 3\\), \\(f(x)=0\\), \\(\\lim\\) 형태로 작성하십시오.',
    '- [MATH LATEX] JSON 내의 모든 백슬래시는 이중(\\\\)으로 작성하십시오.',

    // ========== stem / stimulus 필드 분리 ==========
    '- [MATH FIELD] stem = 한국어 발문 + 간단한 인라인 수식. stimulus = 함수 정의, 조건식, \\begin{cases}, 점화식 등 복잡한 수식 블록.',
    '- [MATH FIELD] 수학 문항은 거의 항상 stimulus가 필요합니다. stimulus를 null로 두면 안 됩니다. 최소한 풀이 대상이 되는 수식 조건을 stimulus에 넣으십시오.',
    '- [MATH FIELD] stimulus 안의 수식은 \\[...\\]로 감싸십시오.',

    // ========== 발문(stem) 품질 ==========
    '- [MATH STEM] 발문은 반드시 "무엇을 구하는가"를 명확히 지정해야 합니다. 예: "\\(f(3)\\)의 값은?", "\\(a+b\\)의 값을 구하시오.", "\\(\\lim_{x \\to 1} f(x)\\)의 값은?"',
    '- [MATH STEM] 발문에 풀이 조건을 장황하게 나열하지 마십시오. 조건은 stimulus에 넣고, stem은 질문만 담으십시오.',

    // ========== 선지(choices) / 정답(answer) ==========
    '- [MATH CHOICE] 5개 선지는 모두 구체적 수학값이어야 합니다. 정수, 분수, 근호, 수식 등 계산으로 도달 가능한 값을 넣으십시오.',
    '- [MATH CHOICE] 오답 선지는 흔한 계산 실수(부호 오류, 공식 혼동, 조건 누락 등)에서 나올 법한 값으로 구성하십시오.',
    '- [MATH CHOICE] answer는 choices 배열의 해당 값과 글자 그대로 동일해야 합니다.',

    // ========== 올바른 문항 예시 ==========
    '- [MATH EXAMPLE] 좋은 예: stem="다항함수 \\(f(x)\\)가 다음 조건을 만족시킬 때, \\(f(2)\\)의 값은?", stimulus="\\[f\'(x) = 3x^2 - 4x + 1,\\quad f(0) = 2\\]", choices=["3","5","7","9","11"], answer="7"',
    '- [MATH EXAMPLE] 좋은 예: stem="등차수열 \\(\\{a_n\\}\\)에 대하여 \\(a_1 + a_{10}\\)의 값은?", stimulus="\\[a_3 = 7,\\quad a_7 = 19\\]", choices=["24","26","28","30","32"], answer="26"',
  ];
}

/**
 * 수능 수학 전용 프롬프트 빌더.
 * 범용 CSAT 프롬프트 대신 수학에 최적화된 구조를 제공합니다.
 */
export function buildCsatMathPrompt(input: PromptBuildInput): string {
  const rules = getGenerationRules({
    subject: input.subject,
    difficulty: input.difficulty,
    schoolLevel: 'csat',
  });

  const questionType = input.questionType ?? '전체';

  return [
    '당신은 대한민국 수능 수학 영역 출제 전문가입니다.',
    '수학적 사고력과 문제 해결 능력을 측정하는 고품질 객관식(5지선다) 문항을 생성하십시오.',
    '',
    '=== 출력 형식 (JSON 배열) ===',
    '반드시 아래 형식의 JSON 배열만 반환하십시오. 다른 텍스트를 추가하지 마십시오.',
    '```',
    '[',
    '  {',
    '    "topic": "수열",',
    '    "type": "multiple",',
    '    "stem": "등차수열 \\\\(\\\\{a_n\\\\}\\\\)에 대하여 \\\\(a_1 + a_{10}\\\\)의 값은?",',
    '    "stimulus": "\\\\[a_3 = 7, \\\\quad a_7 = 19\\\\]",',
    '    "choices": ["24", "26", "28", "30", "32"],',
    '    "answer": "26",',
    '    "explanation": "등차수열의 성질에 의해 a_1 + a_{10} = a_3 + a_7 = 7 + 19 = 26"',
    '  }',
    ']',
    '```',
    '',
    '=== 필드 규칙 ===',
    '• stem: 한국어 발문. "\\\\(f(2)\\\\)의 값은?", "\\\\(a+b\\\\)의 값을 구하시오." 등 구체적 수치를 묻는 질문만 허용.',
    '• stimulus: 수식 조건 블록. \\\\[...\\\\]로 감싼 display math. 모든 수학 문항은 반드시 stimulus를 포함해야 합니다(null 금지).',
    '• choices: 5개의 구체적 수학값. 계산 결과인 정수, 분수(\\\\(\\\\frac{a}{b}\\\\)), 근호 등. "1","2","3","4","5" 같은 순번 나열은 절대 금지.',
    '• answer: choices 중 하나와 글자 그대로 동일.',
    '',
    '=== 절대 금지 사항 ===',
    '1. 수식 이중 출력: "함수 f(x)\\\\(f(x)\\\\)" → 폐기. "함수 \\\\(f(x)\\\\)"만 허용.',
    '2. 서술형 발문: "~에 관한 분석/설명으로 적절한 것은?" → 폐기. 반드시 구체적 값을 묻는 발문.',
    '3. 순번 선지: choices=["1","2","3","4","5"] → 폐기.',
    '4. stimulus 누락: stimulus=null → 폐기.',
    '5. 평문 수식: 한글 사이에 f(x)=0, a>=3 등 LaTeX 미사용 → 폐기.',
    '',
    '=== LaTeX 규칙 ===',
    '• 인라인: \\\\(...\\\\), 디스플레이: \\\\[...\\\\]',
    '• JSON 내 백슬래시는 이중(\\\\\\\\)으로 작성. 예: "\\\\\\\\(x^2\\\\\\\\)", "\\\\\\\\frac{1}{2}"',
    '• \\\\begin{cases}, \\\\lim, \\\\frac, \\\\sqrt 등 자유롭게 사용 가능.',
    '',
    `=== 생성 조건 ===`,
    `영역: ${rules.subjectLabel}`,
    `세부 유형: ${questionType}`,
    `난이도: ${input.difficulty}`,
    `문항 수: ${input.count}`,
    `반드시 정확히 ${input.count}문항을 생성하십시오.`,
    '',
    ...rules.combinedConstraints.map((rule) => `- ${rule}`),
    '',
    buildFeedbackBlock(input.validationFeedback),
    '',
    buildSourceMaterialBlock(input),
  ].join('\n');
}
