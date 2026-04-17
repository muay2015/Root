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
    if (feedbackText.includes('math_bare_latex_brace') || feedbackText.includes('bare_latex_brace')) {
        lines.push('', '[MATH FIX] stem에 \\{...\\}가 LaTeX 구분자 밖에 있어 실패했습니다.', '❌ 잘못된 예: "수열 \\{an\\}에 대하여" — \\{..\\}가 \\(...\\) 밖에 있음', '✅ 올바른 예: "수열 \\(\\{a_n\\}\\)에 대하여" — 반드시 \\(\\{a_n\\}\\) 형태로 감싸야 함');
    }
    if (feedbackText.includes('math_bare_subscript') || feedbackText.includes('bare_subscript')) {
        lines.push('', '[MATH FIX] stem에 첨자가 LaTeX 없이 잘못 표기되어 실패했습니다.', '❌ 잘못된 예: "a4의 값은?", "a---n", "a_____5" — 어떤 방식이든 LaTeX 밖의 첨자 표기는 금지', '✅ 올바른 예: "\\(a_4\\)의 값은?", "\\(a_n\\)" — 반드시 \\(a_4\\) 형태. 하이픈(-) 이나 여러 언더스코어(___) 사용 불가');
    }
    if (feedbackText.includes('원과 직선') || feedbackText.includes('circle-line') || feedbackText.includes('접선 d=r')) {
        lines.push('', '[MIDDLE CIRCLE-LINE FIX] 「원과 직선」 diagram_svg가 누락되었습니다.',
            '반드시 아래 중 조건에 맞는 템플릿을 선택해 diagram_svg를 채우십시오.',
            '접선(d=r): <svg viewBox="0 0 360 300" width="100%" style="max-width:360px;display:block"><circle cx="150" cy="150" r="90" fill="none" stroke="#222" stroke-width="1.8"/><line x1="240" y1="18" x2="240" y2="282" stroke="#222" stroke-width="1.8"/><line x1="150" y1="150" x2="240" y2="150" stroke="#555" stroke-width="1.3" stroke-dasharray="5,3"/><circle cx="150" cy="150" r="3.5" fill="#222"/><circle cx="240" cy="150" r="3" fill="#222"/><path d="M240,140 L230,140 L230,150" fill="none" stroke="#222" stroke-width="1.3"/><text x="134" y="143" font-size="15" font-family="serif">O</text><text x="246" y="30" font-size="15" font-family="serif" font-style="italic">l</text><text x="192" y="143" font-size="12" text-anchor="middle">d cm</text></svg>',
            '할선(d<r): <svg viewBox="0 0 360 300" width="100%" style="max-width:360px;display:block"><circle cx="150" cy="150" r="90" fill="none" stroke="#222" stroke-width="1.8"/><line x1="210" y1="18" x2="210" y2="282" stroke="#222" stroke-width="1.8"/><line x1="150" y1="150" x2="210" y2="150" stroke="#555" stroke-width="1.3" stroke-dasharray="5,3"/><circle cx="150" cy="150" r="3.5" fill="#222"/><path d="M210,140 L200,140 L200,150" fill="none" stroke="#222" stroke-width="1.3"/><text x="134" y="143" font-size="15" font-family="serif">O</text><text x="216" y="30" font-size="15" font-family="serif" font-style="italic">l</text><text x="177" y="143" font-size="12" text-anchor="middle">d cm</text></svg>',
            '외부(d>r): <svg viewBox="0 0 360 300" width="100%" style="max-width:360px;display:block"><circle cx="140" cy="150" r="80" fill="none" stroke="#222" stroke-width="1.8"/><line x1="270" y1="18" x2="270" y2="282" stroke="#222" stroke-width="1.8"/><line x1="140" y1="150" x2="270" y2="150" stroke="#555" stroke-width="1.3" stroke-dasharray="5,3"/><circle cx="140" cy="150" r="3.5" fill="#222"/><path d="M270,140 L260,140 L260,150" fill="none" stroke="#222" stroke-width="1.3"/><text x="124" y="143" font-size="15" font-family="serif">O</text><text x="276" y="30" font-size="15" font-family="serif" font-style="italic">l</text><text x="202" y="143" font-size="12" text-anchor="middle">d cm</text></svg>',
            '→ "d cm"을 실제 거리 수치로 반드시 교체하십시오. 수치 없으면 수정 실패.');
    }
    if (feedbackText.includes('math_missing_diagram') || feedbackText.includes('geometry question')) {
        lines.push('', '[MATH FIX] 기하 문항에서 diagram_svg가 null로 실패했습니다. 반드시 SVG 도형을 생성하십시오.', '원 문제 예시: <svg viewBox="0 0 360 320" width="100%" style="max-width:360px;display:block"><circle cx="180" cy="160" r="110" fill="none" stroke="#222" stroke-width="1.5"/><circle cx="290" cy="160" r="3" fill="#222"/><text x="298" y="164" font-size="13">B</text><circle cx="70" cy="160" r="3" fill="#222"/><text x="55" y="164" font-size="13">E</text></svg>', '삼각형 예시: <svg viewBox="0 0 360 300" width="100%" style="max-width:360px;display:block"><polygon points="180,30 60,260 300,260" fill="none" stroke="#222" stroke-width="1.5"/><text x="175" y="20" font-size="13">A</text><text x="45" y="275" font-size="13">B</text><text x="305" y="275" font-size="13">C</text></svg>', '좌표평면 원+직선 예시: <svg viewBox="0 0 360 320" width="100%" style="max-width:360px;display:block"><line x1="20" y1="160" x2="340" y2="160" stroke="#aaa" stroke-width="1"/><line x1="180" y1="20" x2="180" y2="300" stroke="#aaa" stroke-width="1"/><circle cx="180" cy="160" r="90" fill="none" stroke="#222" stroke-width="1.5"/><line x1="60" y1="260" x2="300" y2="60" stroke="#222" stroke-width="1.5"/><circle cx="126" cy="214" r="3" fill="#222"/><text x="108" y="228" font-size="13">A</text><circle cx="270" cy="70" r="3" fill="#222"/><text x="276" y="68" font-size="13">B</text></svg>', '- stem에서 "주어진 조건에서" → "그림과 같이"로 변경하고, 도형 배치 설명은 SVG에만 표현하십시오.');
    }
    return lines.join('\n');
}
