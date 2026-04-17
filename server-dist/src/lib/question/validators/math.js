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
    const isMiddleMath = input.subject === 'middle_math';
    const choices = Array.isArray(question.choices)
        ? question.choices.map((c) => String(c ?? '').trim())
        : [];
    // 위치 관계 서술문 선지인지 확인 (원과 직선 등 중등 기하 문항에서 허용)
    const isPositionRelationChoices = choices.length >= 3 &&
        choices.some((c) => /만난다|만나지|접한다|내부|외부|중심을 지난다/.test(c));
    // 1. 선지가 순번(1,2,3,4,5)만으로 구성된 경우
    // 단, 발문에 LaTeX 수식이 있고 특정 값을 구하는 질문이면 실제 정답이 1~5일 수 있으므로 허용
    // 또한 위치 관계 서술문 선지인 경우도 허용
    if (choices.length === 5 && !isPositionRelationChoices) {
        const isSequentialNumbers = choices.every((c, i) => c === String(i + 1));
        if (isSequentialNumbers) {
            const stem = String(question.stem ?? '');
            const hasLatexInStem = /\\\(|\\\[|\$/.test(stem) ||
                (!!question.stimulus && /\\\(|\\\[|\$/.test(String(question.stimulus)));
            // LaTeX 수식이 있는 문항이면 1-5가 실제 정답일 수 있음 → 허용
            // (개수, 최솟값, 자연수 범위, 경우의 수 등 다양한 유형에서 1~5가 유효한 정답)
            if (!hasLatexInStem) {
                pushReason(reasons, issueCounts, 'math_sequential_choices', `Question ${index}: math choices are just sequential numbers (1-5) with no mathematical content.`);
            }
        }
    }
    // 2. 수식 이중 출력 감지: "f(x)\(f(x)\)" 또는 "g(x)g(x)" 패턴
    const stem = String(question.stem ?? '');
    // 동일 표현이 LaTeX 밖과 안에서 연속으로 나타나는 패턴
    // 예: "f(x)\(f(x)\)", "수열 {an}\(\{a_n\}\)", "sqrt(2)\(\sqrt{2}\)"
    const duplicateExprPattern = /([a-zA-Z]\([a-zA-Z0-9,\s]*\))\s*\\+\(?\s*\\?\s*\1|([a-zA-Z_]\w*)\s+\\\(\s*\2\s*\\\)/;
    if (duplicateExprPattern.test(stem)) {
        pushReason(reasons, issueCounts, 'math_duplicate_expression', `Question ${index}: stem contains duplicated plain-text and LaTeX expression.`);
    }
    // 3. LaTeX 구분자 없이 쓰인 bare LaTeX 명령어 감지
    // \{...\} 또는 \[, \frac 등이 \(...\) 밖에서 쓰인 경우
    const stemWithoutLatexBlocks = stem
        .replace(/\\\([\s\S]*?\\\)/g, '')
        .replace(/\\\[[\s\S]*?\\\]/g, '');
    if (/\\\{|\\\}/.test(stemWithoutLatexBlocks)) {
        pushReason(reasons, issueCounts, 'math_bare_latex_brace', `Question ${index}: stem contains \\{...\\} outside LaTeX delimiters. Use \\(\\{a_n\\}\\) form. Bad: "수열 \\{an\\}" → Good: "수열 \\(\\{a_n\\}\\)"`);
    }
    // 4. 첨자를 잘못 표기한 패턴 감지: a4, S10, a---n, a_______5 등
    const hasBareSubscript = /\b[a-zA-Z]\d+\b/.test(stemWithoutLatexBlocks) ||
        /\b[a-zA-Z][-_]{2,}[0-9a-zA-Z]\b/.test(stemWithoutLatexBlocks);
    if (hasBareSubscript) {
        pushReason(reasons, issueCounts, 'math_bare_subscript', `Question ${index}: stem contains bare subscript notation (e.g. "a4", "a---n", "a_____5") outside LaTeX. Use \\(a_4\\), \\(a_n\\), \\(S_{10}\\) form inside \\(...\\).`);
    }
    // 4-b. LaTeX 블록 내부의 다중 하이픈/언더스코어 감지: \(a_________n\) → 재생성 유도
    const stemLatexContent = [...stem.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)]
        .map((m) => m[1] ?? m[2] ?? '')
        .join(' ');
    if (/[a-zA-Z][-_]{2,}[0-9a-zA-Z]/.test(stemLatexContent)) {
        pushReason(reasons, issueCounts, 'math_bare_subscript', `Question ${index}: stem contains multiple hyphens/underscores (e.g. "a_________n") inside LaTeX block. Use single underscore: \\(a_n\\), \\(a_5\\).`);
    }
    // 5. 발문이 구체적 계산 없이 서술형 해석만 요구하는 경우
    const vaguePattern = /(?:에 관한|에 대한)\s*(?:분석|설명|해석|결론)(?:으로|으로서)?\s*(?:가장\s*)?적절한 것은/u;
    const hasConcreteTarget = /의\s*값(?:은|을|으로)|값을\s*구하|몇\s*개|최[솟대]값|합(?:은|을)|극[대소값]|넓이|부피|기울기/u.test(stem);
    if (vaguePattern.test(stem) && !hasConcreteTarget) {
        pushReason(reasons, issueCounts, 'math_vague_stem', `Question ${index}: math stem asks for vague "analysis/description" instead of a concrete mathematical value.`);
    }
    // 6. 기하 문항에서 diagram_svg 누락 체크
    const topic = String(question.topic ?? '');
    const stimulusText = String(question.stimulus ?? '');
    const combinedText = `${topic} ${stem} ${stimulusText}`;
    // 6-a. 중등 수학 「원과 직선」 전용 체크
    if (isMiddleMath) {
        const isCircleLineQuestion = /원과\s*직선|직선과\s*원|원.*직선.*위치|직선.*원.*위치|중심.*에서.*직선.*거리|반지름.*직선/.test(combinedText);
        if (isCircleLineQuestion && !question.diagram_svg) {
            pushReason(reasons, issueCounts, 'math_missing_diagram',
                `Question ${index}: 「원과 직선」 유형은 diagram_svg가 필수입니다. ` +
                `조건(d vs r)에 따라 아래 템플릿 중 하나를 사용하십시오. ` +
                `[접선 d=r 템플릿] diagram_svg="<svg viewBox=\\"0 0 360 300\\" width=\\"100%\\" style=\\"max-width:360px;display:block\\">` +
                `<circle cx=\\"150\\" cy=\\"150\\" r=\\"90\\" fill=\\"none\\" stroke=\\"#222\\" stroke-width=\\"1.8\\"/>` +
                `<line x1=\\"240\\" y1=\\"18\\" x2=\\"240\\" y2=\\"282\\" stroke=\\"#222\\" stroke-width=\\"1.8\\"/>` +
                `<line x1=\\"150\\" y1=\\"150\\" x2=\\"240\\" y2=\\"150\\" stroke=\\"#555\\" stroke-width=\\"1.3\\" stroke-dasharray=\\"5,3\\"/>` +
                `<circle cx=\\"150\\" cy=\\"150\\" r=\\"3.5\\" fill=\\"#222\\"/>` +
                `<circle cx=\\"240\\" cy=\\"150\\" r=\\"3\\" fill=\\"#222\\"/>` +
                `<path d=\\"M240,140 L230,140 L230,150\\" fill=\\"none\\" stroke=\\"#222\\" stroke-width=\\"1.3\\"/>` +
                `<text x=\\"134\\" y=\\"143\\" font-size=\\"15\\" font-family=\\"serif\\">O</text>` +
                `<text x=\\"246\\" y=\\"30\\" font-size=\\"15\\" font-family=\\"serif\\" font-style=\\"italic\\">l</text>` +
                `<text x=\\"192\\" y=\\"143\\" font-size=\\"12\\" text-anchor=\\"middle\\">d cm</text>` +
                `</svg>" — "d cm"을 실제 거리 수치로 교체.`);
        }
    }
    // 원 관련: 원주각, 할선, 현, 내접/외접, "두 현", 이름 붙은 원(원 O, 원 C), 원과 직선/곡선 교점 등
    const isCircleQuestion =
        /원\s*위의\s*점|원\s*위에|원주각|내접각|외접각|할선|현\s*[A-Z]{2}|원에\s*내접|원에\s*외접|두\s*현|현과|원\s+[A-Z]\s*[에위를가는의와과]|원과\s*(?:직선|포물선|타원|쌍곡선|곡선)|(?:직선|포물선|타원|쌍곡선)\s*과\s*원|원의\s*접선|접선과\s*원|원\s+[A-Z]가\s*있|원\s+[A-Z]:|원\s*:\s*x/.test(combinedText);
    // 삼각형·다각형
    const isTriangleQuestion =
        /삼각형\s*[A-Z]{2,3}|△[A-Z]{2,3}|직각삼각형|이등변삼각형|정삼각형|사각형\s*[A-Z]{3,4}|평행사변형\s*[A-Z]{3,4}|마름모\s*[A-Z]{3,4}/.test(combinedText);
    // 각도 기호 + 여러 꼭짓점 — ∠ABC, \angle ABC, 각 ABC 모두 처리
    const hasAngle = /∠[A-Z]{2,3}|\\angle\s+[A-Z]|각\s*[A-Z]{2,3}/.test(combinedText);
    const hasMultiplePoints = /[A-Z],\s*[A-Z],\s*[A-Z]/.test(combinedText) || /점\s*[A-Z]/.test(combinedText);
    const isAngleQuestion = hasAngle && hasMultiplePoints;
    // 좌표평면에서 2개 이상의 기하학적 점 + 곡선/직선 배치를 파악해야 하는 문제
    const namedPoints = combinedText.match(/\b[A-HJ-Z]\b/g) ?? [];
    const isCoordGeomQuestion = namedPoints.length >= 2 &&
        /좌표평면|좌표축|x축|y축|원점/.test(combinedText) &&
        /직선|포물선|쌍곡선|타원|꺾인|곡선|원/.test(combinedText);
    const isGeometryQuestion = isCircleQuestion || isTriangleQuestion || isAngleQuestion || isCoordGeomQuestion;
    if (isGeometryQuestion && !question.diagram_svg) {
        pushReason(reasons, issueCounts, 'math_missing_diagram',
            `Question ${index}: This is a geometry question but diagram_svg is null. ` +
            `You MUST generate an SVG diagram. ` +
            `CIRCLE TEMPLATE: diagram_svg="<svg viewBox=\\"0 0 360 310\\" width=\\"100%\\" style=\\"max-width:360px;display:block\\">` +
            `<circle cx=\\"180\\" cy=\\"155\\" r=\\"110\\" fill=\\"none\\" stroke=\\"#222\\" stroke-width=\\"1.5\\"/>` +
            `<line x1=\\"102\\" y1=\\"77\\" x2=\\"258\\" y2=\\"233\\" stroke=\\"#222\\" stroke-width=\\"1.5\\"/>` +
            `<circle cx=\\"102\\" cy=\\"77\\" r=\\"3\\" fill=\\"#222\\"/><text x=\\"88\\" y=\\"70\\" font-size=\\"13\\">A</text>` +
            `<circle cx=\\"258\\" cy=\\"233\\" r=\\"3\\" fill=\\"#222\\"/><text x=\\"263\\" y=\\"240\\" font-size=\\"13\\">B</text>` +
            `</svg>". Place ALL named points on/outside the circle. Mark unknown angle as x or ?. No answer-revealing numbers.`);
    }
}
