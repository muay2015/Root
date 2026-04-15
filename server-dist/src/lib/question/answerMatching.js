import { normalizeChoiceText } from "./normalizeChoiceText.js";
function stripWrappingPunctuation(value) {
    let normalized = value.trim();
    for (let i = 0; i < 4; i += 1) {
        const next = normalized
            .replace(/^[`"'“”‘’([{<]+/u, '')
            .replace(/[`"'“”‘’)\]}>.,:;!?]+$/u, '')
            .trim();
        if (next === normalized) {
            break;
        }
        normalized = next;
    }
    return normalized;
}
export function normalizeAnswerComparison(value) {
    // 0단계: 기본 정규화 (선택지 마커 제거, 공백 정규화)
    let s = normalizeChoiceText(value).toLowerCase();
    // 1단계: LaTeX 구분자 제거 (stripWrappingPunctuation보다 먼저 실행해야
    //         \) 의 ')' 나 \] 의 ']' 가 잘리는 문제를 방지)
    s = s.replace(/\\\(|\\\)|\\\[|\\\]|\$\$?/g, '');
    // 2단계: LaTeX 명령어 → 기호 변환 (공백 제거 전, word boundary 활용)
    s = s
        // 텍스트 명령어
        .replace(/\\(?:text|textbf|mathrm|mathbf)\{([^}]*)\}/g, '$1')
        // 분수
        .replace(/\\(?:frac|dfrac|tfrac)\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
        // 비교/관계 연산자
        .replace(/\\geq\b/g, '>=')
        .replace(/\\ge\b/g, '>=')
        .replace(/\\leq\b/g, '<=')
        .replace(/\\le\b/g, '<=')
        .replace(/\\neq\b/g, '!=')
        .replace(/\\ne\b/g, '!=')
        .replace(/\\approx/g, '≈')
        // 산술 연산자
        .replace(/\\sqrt/g, 'root')
        .replace(/\\times/g, '*')
        .replace(/\\cdot/g, '*')
        .replace(/\\div/g, '/')
        .replace(/\\pm/g, '+-')
        .replace(/\\mp/g, '-+')
        // 그리스 문자/상수
        .replace(/\\pi\b/g, 'pi')
        .replace(/\\alpha\b/g, 'alpha')
        .replace(/\\beta\b/g, 'beta')
        .replace(/\\theta\b/g, 'theta')
        .replace(/\\infty/g, 'inf')
        // 장식/간격 명령어 제거
        .replace(/\\(?:left|right|big|Big|bigg|Bigg|displaystyle|scriptstyle)\b/g, '')
        .replace(/\\[,;:!]/g, '')
        .replace(/\\q?quad/g, '')
        // 잔여 백슬래시 명령어 제거 (위에서 처리되지 않은 \xxx 형태)
        .replace(/\\[a-zA-Z]+/g, '');
    // 3단계: 래핑 문장부호 제거 (LaTeX 처리 후 안전하게 실행)
    s = stripWrappingPunctuation(s);
    // 4단계: 논리적 토큰 변환
    s = s
        .replace(/\s+(?:and|&)\s+/g, '/')
        .replace(/\s*\/\s*/g, '/');
    // 5단계: 중괄호, 공백 제거
    s = s.replace(/[{}]/g, '').replace(/\s+/g, '').trim();
    return s;
}
function parseLetterChoiceIndex(value) {
    const compact = value.trim().toUpperCase();
    const match = compact.match(/^(?:ANSWER[:\s]*)?([A-E])(?:[.)])?$/);
    if (!match) {
        return null;
    }
    return match[1].charCodeAt(0) - 65;
}
export function stripAnswerLabel(value) {
    return value
        .replace(/^(?:answer|correct answer|the answer is|correct option|correct choice)\s*[:\-]?\s*/i, '')
        .replace(/^(?:\uC815\uB2F5|\uC815\uB2F5\uC740|\uB2F5|\uB2F5\uC740)\s*[:\-\uFF1A]?\s*/u, '')
        .trim();
}
export function parseAnswerChoiceIndex(value) {
    const stripped = stripAnswerLabel(value);
    const compact = stripped.trim().replace(/\s+/g, '');
    const circledDigitMap = {
        '\u2460': 0,
        '\u2461': 1,
        '\u2462': 2,
        '\u2463': 3,
        '\u2464': 4,
    };
    if (compact in circledDigitMap) {
        return circledDigitMap[compact];
    }
    if (/^[1-5][.)]?$/.test(compact)) {
        return Number.parseInt(compact[0], 10) - 1;
    }
    const labeledDigit = compact.match(/^(?:[^0-9]*:)?(?:[^0-9]*)([1-5])(?:\uBC88|\uBC88\uC774\uB2E4|\uBC88\uC784|\uBC88\uC815\uB2F5|\uBC88\uC774\uC815\uB2F5)?$/u);
    if (labeledDigit) {
        return Number.parseInt(labeledDigit[1], 10) - 1;
    }
    const embeddedDigit = stripped.match(/(?:^|[\s:([{<"'`-])([1-5])(?:[.)]|\uBC88)(?:$|[\s)\]}>.,:;!?"'`])/u);
    if (embeddedDigit) {
        return Number.parseInt(embeddedDigit[1], 10) - 1;
    }
    return parseLetterChoiceIndex(compact);
}
export function resolveAnswerFromChoices(rawAnswer, choices) {
    if (rawAnswer && typeof rawAnswer === 'object') {
        const objectAnswer = rawAnswer.text ??
            rawAnswer.value ??
            rawAnswer.content ??
            rawAnswer.label;
        return resolveAnswerFromChoices(objectAnswer, choices);
    }
    if (typeof rawAnswer === 'number') {
        const idx = Math.floor(rawAnswer) - 1;
        return choices[idx] || '';
    }
    if (typeof rawAnswer !== 'string') {
        return '';
    }
    const trimmed = rawAnswer.trim();
    if (!trimmed) {
        return '';
    }
    const numericIndex = parseAnswerChoiceIndex(trimmed);
    if (numericIndex !== null) {
        return choices[numericIndex] || '';
    }
    const answerWithoutLeadingLabel = stripAnswerLabel(trimmed);
    const answerCore = answerWithoutLeadingLabel
        .replace(/\s*(?:\uC774\uB2E4|\uC785\uB2C8\uB2E4|\uC784|is)\s*\.?$/iu, '')
        .trim();
    const normalizedAnswer = normalizeAnswerComparison(answerCore);
    if (!normalizedAnswer) {
        return stripWrappingPunctuation(normalizeChoiceText(answerCore));
    }
    const exactMatches = choices.filter((choice) => normalizeAnswerComparison(choice) === normalizedAnswer);
    if (exactMatches.length === 1) {
        return exactMatches[0];
    }
    const containedMatches = normalizedAnswer.length >= 2
        ? choices.filter((choice) => {
            const normalizedChoice = normalizeAnswerComparison(choice);
            return (normalizedChoice.includes(normalizedAnswer) ||
                normalizedAnswer.includes(normalizedChoice));
        })
        : [];
    if (containedMatches.length === 1) {
        return containedMatches[0];
    }
    const rankedMatches = choices
        .map((choice) => {
        const normalizedChoice = normalizeAnswerComparison(choice);
        if (!normalizedChoice) {
            return { choice, score: 0 };
        }
        let score = 0;
        if (normalizedAnswer.includes(normalizedChoice)) {
            score += normalizedChoice.length * 3;
        }
        if (normalizedChoice.includes(normalizedAnswer)) {
            score += normalizedAnswer.length * 2;
        }
        const fragments = normalizedChoice
            .split(/[^a-z0-9\u3131-\u314e\uac00-\ud7a3]+/u)
            .filter((token) => token.length >= 2);
        for (const fragment of fragments) {
            if (normalizedAnswer.includes(fragment)) {
                score += fragment.length;
            }
        }
        return { choice, score };
    })
        .sort((a, b) => b.score - a.score);
    if (rankedMatches.length > 1 &&
        rankedMatches[0].score >= 4 &&
        rankedMatches[0].score > rankedMatches[1].score) {
        return rankedMatches[0].choice;
    }
    if (rankedMatches.length === 1 && rankedMatches[0].score >= 4) {
        return rankedMatches[0].choice;
    }
    return stripWrappingPunctuation(normalizeChoiceText(answerCore));
}
export function countAnswerMatches(rawAnswer, choices) {
    const resolvedAnswer = resolveAnswerFromChoices(rawAnswer, choices);
    const normalizedAnswer = normalizeAnswerComparison(resolvedAnswer);
    if (!normalizedAnswer) {
        return 0;
    }
    return choices.filter((choice) => normalizeAnswerComparison(choice) === normalizedAnswer).length;
}
