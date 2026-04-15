import { pushReason } from "./utils.js";
/**
 * 수학 문항 전용 품질 검증.
 * - 선지가 순번(1~5)만으로 구성된 경우 차단
 * - 수식 이중 출력(평문 + LaTeX) 감지
 * - stimulus 누락 검증
 */
export function validateMathQuality(question, index, input, reasons, _warnings, issueCounts) {
    const subjectLower = String(input.subject).toLowerCase();
    if (!subjectLower.includes('math')) {
        return;
    }
    const choices = Array.isArray(question.choices)
        ? question.choices.map((c) => String(c ?? '').trim())
        : [];
    // 1. 선지가 순번(1,2,3,4,5)만으로 구성된 경우
    if (choices.length === 5) {
        const isSequentialNumbers = choices.every((c, i) => c === String(i + 1));
        if (isSequentialNumbers) {
            pushReason(reasons, issueCounts, 'math_sequential_choices', `Question ${index}: math choices are just sequential numbers (1-5) with no mathematical content.`);
        }
    }
    // 2. 수식 이중 출력 감지: "f(x)\(f(x)\)" 또는 "g(x)g(x)" 패턴
    const stem = String(question.stem ?? '');
    // 동일 표현이 LaTeX 밖과 안에서 연속으로 나타나는 패턴
    const duplicateExprPattern = /([a-zA-Z]\([a-zA-Z0-9,\s]*\))\s*\\?\(?\\?\(?\1/;
    if (duplicateExprPattern.test(stem)) {
        pushReason(reasons, issueCounts, 'math_duplicate_expression', `Question ${index}: stem contains duplicated plain-text and LaTeX expression.`);
    }
    // 3. 발문이 구체적 계산 없이 서술형 해석만 요구하는 경우
    const vaguePattern = /(?:에 관한|에 대한)\s*(?:분석|설명|해석|결론)(?:으로|으로서)?\s*(?:가장\s*)?적절한 것은/u;
    const hasConcreteTarget = /의\s*값(?:은|을|으로)|값을\s*구하|몇\s*개|최[솟대]값|합(?:은|을)|극[대소값]|넓이|부피|기울기/u.test(stem);
    if (vaguePattern.test(stem) && !hasConcreteTarget) {
        pushReason(reasons, issueCounts, 'math_vague_stem', `Question ${index}: math stem asks for vague "analysis/description" instead of a concrete mathematical value.`);
    }
}
