import { getGenerationRules } from "./generationRules.js";
import { getSubjectQuestionTypeMixTargets, usesNoSelector, } from "./subjectConfig.js";
function buildFeedbackBlock(validationFeedback) {
    if (!validationFeedback || validationFeedback.length === 0) {
        return 'No previous validation failures.';
    }
    return [
        'Previous validation failures that must be fixed in this generation:',
        ...validationFeedback.map((reason, index) => `${index + 1}. ${reason}`),
    ].join('\n');
}
function isSocialSubject(subject) {
    return subject === 'social' ||
        subject === 'middle_social' ||
        subject === 'high_social' ||
        subject.startsWith('social_') ||
        subject.startsWith('geography_') ||
        subject.startsWith('economics_') ||
        subject.startsWith('politics_') ||
        subject.startsWith('ethics_');
}
function buildGenericPrompt(input) {
    const selectionLabel = isSocialSubject(input.subject) ? '문제방식' : '문제유형';
    const selectionValue = isSocialSubject(input.subject)
        ? input.format ?? '객관식'
        : input.questionType ?? '일반';
    const rules = getGenerationRules({
        subject: input.subject,
        selectionLabel,
        selectionValue,
        difficulty: input.difficulty,
        schoolLevel: input.schoolLevel,
    });
    const mixedTypeRules = input.questionType === '전체'
        ? [
            `Distribute ${input.count} questions as evenly as possible across these subtypes: ${getSubjectQuestionTypeMixTargets(input.subject).join(', ')}.`,
            'Do not concentrate most questions in one subtype.',
            'If the count is not divisible evenly, distribute the remainder from the front of the subtype list.',
        ]
        : [];
    return [
        'You are generating school exam questions.',
        'Return only a JSON array.',
        'Each item must contain exactly these keys:',
        '["topic", "type", "stem", "choices", "answer", "explanation"]',
        'Use "type" = "multiple".',
        'choices must contain exactly 5 strings.',
        '- [CRITICAL] "answer" must be a string that matches EXACTLY one of the values in the "choices" array. Copy the choice text exactly (including all characters and spaces) into the answer field.',
        '',
        `Subject: ${rules.subjectLabel}`,
        `${selectionLabel}: ${selectionValue}`,
        `Difficulty: ${input.difficulty}`,
        `School level: ${input.schoolLevel}`,
        input.title ? `Title: ${input.title}` : 'Title: None provided',
        input.topic ? `Topic: ${input.topic}` : 'Topic: None provided',
        `Question count: ${input.count}`,
        '',
        ...rules.combinedConstraints.map((rule) => `- ${rule}`),
        ...mixedTypeRules.map((rule) => `- ${rule}`),
        input.difficulty === 'hard' ? '- [CRITICAL] Since the difficulty is "hard", you MUST write a longer, descriptive, and analytic stem. In Korean, use either at least 8 words or at least about 18 Korean characters of reasoning-rich text; in English, use at least 20 words.' : '',
        input.difficulty === 'hard' ? '- [CRITICAL] For "hard" difficulty, provide a deep explanation (at least 10+ words) including the reasoning for the correct answer AND a brief explanation of why the major distractors are incorrect.' : '',
        '- Reflect the provided title and topic directly when they exist.',
        '- Use the source material as the factual basis.',
        '- Do not output duplicate stems or near-duplicate choices.',
        '- If a question stem asks to identify a specific person, student, or character, the generated choices or question stem MUST explicitly include their names (e.g., do not just output quotes).',
        '- [CRITICAL] 모든 수학 기호와 수식은 반드시 LaTeX 형식을 사용하십시오. "루트"와 같은 한글 텍스트 대신 \\sqrt{} 등을 사용하고, 모든 수식(숫자 포함)은 반드시 \\( 와 \\) 기호로 감싸야 합니다. (예: 루트 2 -> \\(\\sqrt{2}\\))',
        '- [CRITICAL] JSON 결과물 내의 모든 LaTeX 명령어(\\\\sqrt 등)와 구분자(\\\\(, \\\\))는 반드시 JSON 규격에 맞춰 이중 역슬래시(\\\\)를 사용해야 합니다. (예: "\\(n\\)"(X) -> "\\\\(n\\\\)"(O), "\\sqrt{x}"(X) -> "\\\\sqrt{x}"(O))',
        '- [CRITICAL] "Choice 1", "Placeholder", "내용 없음" 등의 임시 텍스트(Placeholder)를 절대 사용하지 마십시오. 모든 보기는 실제 출제될 유효한 텍스트여야 합니다.',
        '- [CRITICAL] 지문이나 발문 내에 불필요한 기호(예: 문장이나 시구 사이의 슬래시 "/" 등)를 사용하여 구분하지 마십시오. 줄바꿈이 필요한 경우 반드시 실제 줄바꿈 문자(\\n)를 사용하여 가독성을 확보하십시오.',
        '',
        buildFeedbackBlock(input.validationFeedback),
        '',
        input.images && input.images.length > 0 ? '[OCR_CONTEXT]\nYou are provided with high-resolution images of educational material. Even if the text below is incomplete, use the visual context from the images to extract accurate terminology, diagrams, and structures.' : '',
        '',
        'Source material:',
        input.materialText,
    ].join('\n');
}
function buildHistoryPrompt(input) {
    const rules = getGenerationRules({
        subject: input.subject,
        difficulty: input.difficulty,
        schoolLevel: input.schoolLevel,
    });
    return [
        'You are generating Korean history exam questions for Korean students.',
        'You must generate only Korean history content.',
        'Never generate English reading comprehension, exercise, health, lifestyle, or generic study-skill questions.',
        'Return only a JSON array.',
        'Each array item must have exactly this shape:',
        '{"number":1,"question":"...","choices":["...","...","...","...","..."],"answer":2,"explanation":"..."}',
        '',
        `과목: ${rules.subjectLabel}`,
        `학교급: ${input.schoolLevel}`,
        `난이도: ${input.difficulty}`,
        `문항 수: ${input.count}`,
        input.title ? `출제 범위: ${input.title}` : '출제 범위: 입력 자료 기준',
        input.topic ? `주제: ${input.topic}` : '주제: 입력 자료 기준',
        '',
        '공통 규칙:',
        '- 모든 문항은 객관식 5지선다형이며, 선택지(choices)는 반드시 유효한 내용으로 5개를 채워야 한다.',
        '- "Choice 1", "Placeholder", "준비 중" 등의 임시 텍스트를 절대로 사용하지 않는다.',
        '- [CRITICAL] "answer"는 반드시 선택지(choices) 중 하나의 내용과 글자 한 토씨 틀리지 않고 100% 정확하게 일치해야 한다. (예: 선택지가 "3"이면 정답도 "3", "3번"이면 안 됨)',
        '- 정답은 1개만 존재하고 answer는 선택지 중 하나의 텍스트여야 한다.',
        '- 한국 중등 및 고등 역사 평가에 맞는 자연스러운 한국어 표현만 사용한다.',
        '- 외부 지식 없이도 제시문 또는 기본 학습 범위 안에서 풀 수 있어야 한다.',
        '- 문항 간 난이도 편차가 지나치게 크지 않도록 유지한다.',
        '- 해설은 정답 근거와 오답이 왜 틀렸는지까지 간단히 설명한다.',
        '- 사람이나 학생, 사상가 등을 고르는 문항(예: "학생은 누구인가?")의 경우, 반드시 선택지나 제시문에 해당 인물의 이름을 명시한다.',
        '- [필수] 모든 수학 기호와 수식은 반드시 LaTeX 형식을 사용한다. "루트"와 같은 한글 표현을 금지하고 \\sqrt{} 등을 사용하며, 모든 수식은 반드시 \\( 와 \\) 기호로 감싼다. (예: 5루트2 -> \\(5\\sqrt{2}\\))',
        '- [중요] JSON 결과물 내의 모든 LaTeX 명령어(\\\\sqrt 등)와 구분자(\\\\(, \\\\))는 반드시 JSON 규격에 따라 이중 역슬래시(\\\\)로 작성해야 한다. (예: "\\(n\\)"(X) -> "\\\\(n\\\\)"(O), "\\sqrt{x}"(X) -> "\\\\sqrt{x}"(O))',
        '',
        '난이도 규칙:',
        ...rules.difficulty.promptRules.map((rule) => `- ${rule}`),
        ...rules.schoolLevel.promptRules.map((rule) => `- ${rule}`),
        ...rules.subjectRule.stemGuidance.map((rule) => `- ${rule}`),
        ...rules.subjectRule.choiceGuidance.map((rule) => `- ${rule}`),
        ...rules.subjectRule.explanationGuidance.map((rule) => `- ${rule}`),
        '',
        input.difficulty === 'easy'
            ? '- 쉬움: 대표 사건, 인물, 제도, 유물, 시대 특징 등 기본 개념을 직접 근거 중심으로 확인한다.'
            : input.difficulty === 'medium'
                ? '- 보통: 단순 암기와 비교 판단을 섞고, 두 개 이상의 단서를 종합해야 정답을 고를 수 있어야 한다.'
                : '- 어려움: 직답형 암기 문제를 금지하고, 사료 해석, 비교, 시대 추론, 제도와 사건 연결, 원인과 결과 판단이 필요해야 한다.',
        ...(input.difficulty === 'hard'
            ? [
                '- hard에서는 정답 단서를 문제 문장에 그대로 반복하지 않는다.',
                '- hard에서는 최소 일부 문항을 사료형, 상황형, 비교형으로 구성한다.',
                '- hard에서는 보기 5개를 모두 그럴듯하게 만들고 최소 두 선택지는 끝까지 고민하게 해야 한다.',
            ]
            : []),
        '',
        buildFeedbackBlock(input.validationFeedback),
        '',
        input.images && input.images.length > 0 ? '[이미지 OCR 문맥 정보]\n당신에게는 교과서/문제집의 고해상도 이미지가 멀티모달 데이터로 제공되었습니다. 아래 텍스트가 부족하더라도 이미지의 시각적 단락, 표, 강조 아이콘 등을 분석하여 가장 정확한 학습 맥락을 파악하십시오.' : '',
        '',
        '입력 자료:',
        input.materialText,
    ].join('\n');
}
export function buildSummaryPrompt(input) {
    return [
        '당신은 대한민국 중·고등학교 시험을 완벽히 이해하는 전문 강사입니다.',
        `사용자가 입력한 "${input.topic || input.title || '주제'}"를 바탕으로, 시험 대비에 최적화된 핵심 요약을 생성하세요.`,
        '다음 규칙을 반드시 지키세요:',
        '1. 설명은 자연스럽고 사람이 직접 정리한 것처럼 작성하세요. (AI 느낌 금지)',
        '2. 불필요한 이론 설명은 제외하고, 시험에 나오는 핵심만 정리하세요.',
        '3. 초등학생도 이해할 수 있을 정도로 쉽지만, 시험 대비에 충분히 정확해야 합니다.',
        '4. 반드시 아래 형식을 유지하세요 (Markdown 지원).',
        '[핵심 요약 형식]',
        '📌 핵심 개념',
        '• 가장 중요한 개념 3~5개 정리',
        '📌 시험 포인트',
        '• 실제 시험에서 자주 출제되는 부분',
        '• 출제 유형 중심으로 작성',
        '📌 자주 틀리는 부분',
        '• 학생들이 헷갈리는 포인트',
        '• 실수하기 쉬운 부분 강조',
        '📌 한 줄 정리',
        '• 암기용 문장 1개',
        '',
        '--------------------------------------------------',
        '당신은 대한민국 시험 출제 전문가입니다.',
        '위에서 생성된 "단원 요약 내용"을 기반으로, 실제 학교 시험 스타일의 문제를 생성하세요.',
        '다음 조건을 반드시 지키세요:',
        '1. 문제는 실제 중간·기말고사 스타일로 만드세요.',
        `2. 문제 수: ${input.count}문제`,
        '3. 객관식(multiple) 또는 OX 혼합 가능',
        `4. 난이도는 "${input.difficulty === 'easy' ? '중간 이하' : '중간 이상'}"으로 설정하세요.`,
        '5. 단순 암기 문제가 아닌, 이해를 확인하는 문제로 만드세요.',
        '',
        '--------------------------------------------------',
        '당신은 오답 분석 및 약점 극복 전문가입니다.',
        '모든 결과물은 반드시 아래의 단일 JSON 객체 형식으로 반환하세요:',
        '- [CRITICAL] "answer" 필드는 반드시 "choices" 배열 중 하나의 값과 글자 하나 틀리지 않고 100% 동일하게 작성하세요.',
        'Each generated question must include exactly 5 valid strings in "choices".',
        '{',
        '  "summary": "핵심 요약 텍스트 (Markdown 포함)",',
        '  "questions": [',
        '    { "topic": "...", "type": "multiple", "stem": "...", "choices": ["...", "...", "...", "...", "..."], "answer": "...", "explanation": "..." }',
        '  ]',
        '}',
        '',
        'Source material:',
        input.materialText,
    ].join('\n');
}
function buildCsatPrompt(input) {
    const selectionValue = (isSocialSubject(input.subject) || input.subject.startsWith('history_'))
        ? input.format ?? '객관식'
        : input.questionType ?? '일반';
    const rules = getGenerationRules({
        subject: input.subject,
        difficulty: input.difficulty,
        schoolLevel: 'csat', // Force CSAT level rules
    });
    return [
        '당신은 대한민국 수능 및 평가원 모의고사를 출제하는 전문 위원입니다.',
        '지엽적인 지식 암기가 아닌, 대학 교육에 필요한 "사고력"과 "문제 해결 능력"을 측정하는 고품질 문항을 생성하십시오.',
        '반드시 JSON 배열 형식으로만 반환하세요.',
        'JSON의 각 항목은 다음 키를 반드시 포함해야 합니다: ["topic", "type", "stem", "choices", "answer", "explanation"]',
        '- [CRITICAL] "answer" 필드의 텍스트는 반드시 "choices" 배열의 값 중 하나와 토씨 하나 틀리지 않고 100% 일치해야 합니다.',
        '',
        `영역: ${rules.subjectLabel}`,
        `문항 성격: ${selectionValue}`,
        `난이도: ${input.difficulty} (최신 수능 경향 반영)`,
        input.title ? `출제 근거: ${input.title}` : '출제 근거: 해당 과목 국가 교육과정 및 수능 기출 빈출 영역',
        input.topic ? `세부 주제: ${input.topic}` : '세부 주제: 특정 주제 미지정 (과목 전 범위에서 균형 있게 출제)',
        `문항 수: ${input.count}`,
        '',
        '문항 출제 가이드라인:',
        ...rules.combinedConstraints.map((rule) => `- ${rule}`),
        '- [전 범위 출제] 주제가 명시되지 않은 경우, 해당 과목의 핵심 단원(킬러 문항 포함)을 골고루 안배하여 수능형 모의고사를 구성하십시오.',
        '- [발문] "가장 적절한 것은?", "적절하지 않은 것은?"과 같은 평가원 표준 발문을 사용하십시오.',
        '- [지문/자료] 단순 발췌가 아닌, 여러 정보가 유기적으로 연결된 지문이나 <보기> 자료를 구성하십시오.',
        '- [선지] 정답과 매우 유사하여 정밀한 개념 이해 없이는 고르기 어려운 "매력적인 오답"을 반드시 포함하십시오.',
        '- [수식] 모든 수학적 표현은 반드시 LaTeX를 사용하며, \\\\( 와 \\\\) 로 감싸십시오. (예: \\\\(\\\\sin\\\\theta\\\\))',
        '- [해설] 정답의 논리적 도출 과정뿐만 아니라, 가장 헷갈리기 쉬운 오답이 왜 정답이 될 수 없는지(오답 매력도 분석)를 반드시 포함하십시오.',
        '',
        buildFeedbackBlock(input.validationFeedback),
        '',
        input.images && input.images.length > 0 ? '[수능 특화 OCR 분석]\n멀티모달 이미지를 분석하여 텍스트 데이터의 누락된 부분을 보완하고, 이미지에 포함된 고난도 <보기> 자료나 그래프 등의 구조를 문제 출제에 정교하게 활용하십시오.' : '',
        '',
        '[제시 자료]',
        input.materialText,
    ].join('\n');
}
export function buildQuestionPrompt(input, builderMode) {
    if (builderMode === 'summary') {
        return buildSummaryPrompt(input);
    }
    if (builderMode === 'csat') {
        return buildCsatPrompt(input);
    }
    if (usesNoSelector(input.subject)) {
        return buildHistoryPrompt(input);
    }
    return buildGenericPrompt(input);
}
