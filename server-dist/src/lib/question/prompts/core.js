import {} from '../generationRules';
import {} from '../subjectConfig';
export const META_INSTRUCTION_PATTERNS = [
    /사용자가 입력한 주제/u,
    /기초로 하여 생성/u,
    /생성되는 문제입니다/u,
    /출제 경향을 반영/u,
    /전 범위에서 고르게/u,
    /선택한 교육과정을 기초로/u,
    /English passage generation instruction/i,
    /\[수능 문학 지문 생성 지시\]/u,
];
export function isMaterialMeta(text) {
    const trimmed = text.trim();
    return !trimmed || META_INSTRUCTION_PATTERNS.some((p) => p.test(trimmed));
}
export function sanitizeMaterialText(text, subject) {
    const trimmed = text.trim();
    if (isMaterialMeta(trimmed)) {
        return '';
    }
    return trimmed;
}
export function buildSourceMaterialBlock(input) {
    const material = sanitizeMaterialText(input.materialText, input.subject);
    if (material) {
        return `Source material:\n${material}`;
    }
    const isEnglish = String(input.subject).toLowerCase().includes('english');
    if (isEnglish) {
        return [
            'Compose an original English reading passage (150-250 words) yourself for each question.',
            'The passage must be realistic, self-contained prose suitable for the requested question type.',
        ].join('\n');
    }
    return '제시 자료가 없으므로, 문항에 사용할 독창적인 지문을 직접 작성하십시오.';
}
export function buildFeedbackBlock(validationFeedback) {
    if (!validationFeedback || validationFeedback.length === 0) {
        return 'No previous validation failures.';
    }
    const lines = [
        '[CRITICAL] Previous validation failures that MUST be fixed. If you repeat these errors, the entire output will be discarded again:',
        ...validationFeedback.map((reason, index) => `${index + 1}. ${reason}`),
    ];
    // 수학 관련 실패가 있으면 구체적 교정 가이드 추가
    const feedbackText = validationFeedback.join(' ');
    if (feedbackText.includes('math_sequential_choices') || feedbackText.includes('sequential numbers')) {
        lines.push('', '[MATH FIX] choices가 "1","2","3","4","5"로 실패했습니다. 각 선지에 실제 수학적 계산 결과값을 넣으십시오.', '올바른 예: choices=["3","5","7","9","11"] 또는 choices=["\\(\\frac{1}{2}\\)","\\(\\frac{3}{4}\\)","1","\\(\\frac{5}{4}\\)","\\(\\frac{3}{2}\\)"]');
    }
    if (feedbackText.includes('math_vague_stem') || feedbackText.includes('vague')) {
        lines.push('', '[MATH FIX] 발문이 "~에 관한 분석/설명으로 적절한 것은?"으로 실패했습니다. 반드시 "\\(f(2)\\)의 값은?", "\\(a+b\\)의 값을 구하시오." 등 구체적 수치를 묻는 발문으로 수정하십시오.');
    }
    if (feedbackText.includes('hard_too_short') || feedbackText.includes('too short')) {
        lines.push('', '[MATH FIX] stem이 너무 짧습니다. 수학 문항에서는 반드시 stimulus 필드에 수식 조건을 넣으십시오. stimulus가 null이면 안 됩니다.', '예: stem="다항함수 \\(f(x)\\)가 다음 조건을 만족시킬 때, \\(f(2)\\)의 값은?", stimulus="\\[f\'(x) = 3x^2 - 4x + 1,\\quad f(0) = 2\\]"');
    }
    return lines.join('\n');
}
