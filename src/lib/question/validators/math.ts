import type { GeneratedQuestionDraft, ValidationInput } from './types.ts';
import { pushReason } from './utils.ts';

/**
 * 수학 문항 전용 품질 검증.
 * - 선지가 순번(1~5)만으로 구성된 경우 차단
 * - 수식 이중 출력(평문 + LaTeX) 감지
 * - stimulus 누락 검증
 */
export function validateMathQuality(
  question: GeneratedQuestionDraft,
  index: number,
  input: ValidationInput,
  reasons: string[],
  _warnings: string[],
  issueCounts: Record<string, number>,
) {
  const subjectLower = String(input.subject).toLowerCase();
  if (!subjectLower.includes('math')) {
    return;
  }

  const choices = Array.isArray(question.choices)
    ? question.choices.map((c) => String(c ?? '').trim())
    : [];

  // 1. 선지가 순번(1,2,3,4,5)만으로 구성된 경우
  // 단, 발문에 LaTeX 수식이 있고 특정 값을 구하는 질문이면 실제 정답이 1~5일 수 있으므로 허용
  if (choices.length === 5) {
    const isSequentialNumbers = choices.every((c, i) => c === String(i + 1));
    if (isSequentialNumbers) {
      const stem = String(question.stem ?? '');
      const hasLatexInStem = /\\\(|\\\[|\$/.test(stem) ||
        (!!question.stimulus && /\\\(|\\\[|\$/.test(String(question.stimulus)));

      // LaTeX 수식이 있는 문항이면 1-5가 실제 정답일 수 있음 → 허용
      // (개수, 최솟값, 자연수 범위, 경우의 수 등 다양한 유형에서 1~5가 유효한 정답)
      if (!hasLatexInStem) {
        pushReason(
          reasons,
          issueCounts,
          'math_sequential_choices',
          `Question ${index}: math choices are just sequential numbers (1-5) with no mathematical content.`,
        );
      }
    }
  }

  // 2. 수식 이중 출력 감지: "f(x)\(f(x)\)" 또는 "g(x)g(x)" 패턴
  const stem = String(question.stem ?? '');
  // 동일 표현이 LaTeX 밖과 안에서 연속으로 나타나는 패턴
  // 예: "f(x)\(f(x)\)", "수열 {an}\(\{a_n\}\)", "sqrt(2)\(\sqrt{2}\)"
  const duplicateExprPattern =
    /([a-zA-Z]\([a-zA-Z0-9,\s]*\))\s*\\+\(?\s*\\?\s*\1|([a-zA-Z_]\w*)\s+\\\(\s*\2\s*\\\)/;
  if (duplicateExprPattern.test(stem)) {
    pushReason(
      reasons,
      issueCounts,
      'math_duplicate_expression',
      `Question ${index}: stem contains duplicated plain-text and LaTeX expression.`,
    );
  }

  // 3. LaTeX 구분자 없이 쓰인 bare LaTeX 명령어 감지
  // \{...\} 또는 \[, \frac 등이 \(...\) 밖에서 쓰인 경우
  const stemWithoutLatexBlocks = stem
    .replace(/\\\([\s\S]*?\\\)/g, '')
    .replace(/\\\[[\s\S]*?\\\]/g, '');
  if (/\\\{|\\\}/.test(stemWithoutLatexBlocks)) {
    pushReason(
      reasons,
      issueCounts,
      'math_bare_latex_brace',
      `Question ${index}: stem contains \\{...\\} outside LaTeX delimiters. Use \\(\\{a_n\\}\\) form. Bad: "수열 \\{an\\}" → Good: "수열 \\(\\{a_n\\}\\)"`,
    );
  }

  // 4. 첨자를 잘못 표기한 패턴 감지: a4, S10, a---n, a_______5 등
  const hasBareSubscript =
    /\b[a-zA-Z]\d+\b/.test(stemWithoutLatexBlocks) ||
    /\b[a-zA-Z][-_]{2,}[0-9a-zA-Z]\b/.test(stemWithoutLatexBlocks);
  if (hasBareSubscript) {
    pushReason(
      reasons,
      issueCounts,
      'math_bare_subscript',
      `Question ${index}: stem contains bare subscript notation (e.g. "a4", "a---n", "a_____5") outside LaTeX. Use \\(a_4\\), \\(a_n\\), \\(S_{10}\\) form inside \\(...\\).`,
    );
  }

  // 4-b. LaTeX 블록 내부의 다중 하이픈/언더스코어 감지: \(a_________n\) → 재생성 유도
  const stemLatexContent = [...stem.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)]
    .map((m) => m[1] ?? m[2] ?? '')
    .join(' ');
  if (/[a-zA-Z][-_]{2,}[0-9a-zA-Z]/.test(stemLatexContent)) {
    pushReason(
      reasons,
      issueCounts,
      'math_bare_subscript',
      `Question ${index}: stem contains multiple hyphens/underscores (e.g. "a_________n") inside LaTeX block. Use single underscore: \\(a_n\\), \\(a_5\\).`,
    );
  }

  // 5. 발문이 구체적 계산 없이 서술형 해석만 요구하는 경우
  const vaguePattern = /(?:에 관한|에 대한)\s*(?:분석|설명|해석|결론)(?:으로|으로서)?\s*(?:가장\s*)?적절한 것은/u;
  const hasConcreteTarget = /의\s*값(?:은|을|으로)|값을\s*구하|몇\s*개|최[솟대]값|합(?:은|을)|극[대소값]|넓이|부피|기울기/u.test(stem);
  if (vaguePattern.test(stem) && !hasConcreteTarget) {
    pushReason(
      reasons,
      issueCounts,
      'math_vague_stem',
      `Question ${index}: math stem asks for vague "analysis/description" instead of a concrete mathematical value.`,
    );
  }
}
