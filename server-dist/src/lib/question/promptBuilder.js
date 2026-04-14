import { getGenerationRules } from "./generationRules.js";
import { getSubjectQuestionTypeMixTargets, usesNoSelector, } from "./subjectConfig.js";
const META_INSTRUCTION_PATTERNS = [
    /사용자가 입력한 주제/u,
    /기초로 하여 생성/u,
    /생성되는 문제입니다/u,
    /출제 경향을 반영/u,
    /전 범위에서 고르게/u,
    /선택한 교육과정을 기초로/u,
    /English passage generation instruction/i,
    /\[수능 문학 지문 생성 지시\]/u,
];
function isMaterialMeta(text) {
    const trimmed = text.trim();
    return !trimmed || META_INSTRUCTION_PATTERNS.some((p) => p.test(trimmed));
}
function sanitizeMaterialText(text, subject) {
    const trimmed = text.trim();
    if (isMaterialMeta(trimmed)) {
        return '';
    }
    return trimmed;
}
function buildSourceMaterialBlock(input) {
    const material = sanitizeMaterialText(input.materialText, input.subject);
    if (material) {
        return `Source material:\n${material}`;
    }
    // 자료 없음 → "Source material" 헤더 없이, 자체 지문 생성 규칙만 반환
    const isEnglish = String(input.subject).toLowerCase().includes('english');
    if (isEnglish) {
        return [
            'Compose an original English reading passage (150-250 words) yourself for each question.',
            'The passage must be realistic, self-contained prose suitable for the requested question type.',
        ].join('\n');
    }
    return '제시 자료가 없으므로, 문항에 사용할 독창적인 지문을 직접 작성하십시오.';
}
function buildFeedbackBlock(validationFeedback) {
    if (!validationFeedback || validationFeedback.length === 0) {
        return 'No previous validation failures.';
    }
    const lines = [
        '[CRITICAL] Previous validation failures that MUST be fixed. If you repeat these errors, the entire output will be discarded again:',
        ...validationFeedback.map((reason, index) => `${index + 1}. ${reason}`),
    ];
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
function buildCsatKoreanLiteratureRules(input) {
    if (input.subject !== 'korean_literature' || input.schoolLevel !== 'csat') {
        return [];
    }
    return [
        '- [CSAT KOREAN LITERATURE] Treat every item as a real CSAT literature question, not a grammar or casual dialogue question.',
        '- [CSAT KOREAN LITERATURE] Default to set-based generation: up to 3 questions may share one passage, and those questions must use the same base passage with clearly different stems.',
        '- [CSAT KOREAN LITERATURE] Keep the passage short, but never shallow: use 3-6 lines for verse-like text or 2-5 sentences for prose-like text.',
        '- [CSAT KOREAN LITERATURE] The literary passage MUST go in "stimulus" only. Do not duplicate the passage in "stem".',
        '- [CSAT KOREAN LITERATURE] Do not output a summary-only <보기> as the entire stimulus. The stimulus must contain an actual literary passage first, and <보기> may appear only as a secondary interpretive aid.',
        '- [CSAT KOREAN LITERATURE] The stem MUST ask for literary interpretation such as speaker attitude, emotional movement, expressive feature, function of imagery, function of scene, or appreciation with <보기>.',
        '- [CSAT KOREAN LITERATURE] Do NOT ask about grammar terms such as subject omission, sentence components, passive voice, parts of speech, or connective words.',
        '- [CSAT KOREAN LITERATURE] Each item must be solvable only by internal evidence from the passage. Do not rely on common sense or everyday conversation norms.',
        '- [CSAT KOREAN LITERATURE] Put at least two textual clues into the passage so that the correct answer requires combining multiple details.',
        '- [CSAT KOREAN LITERATURE] Do not state the emotion too directly with obvious words repeated in the passage. Prefer images, actions, silence, contrast, and situation so that the emotion must be inferred.',
        '- [CSAT KOREAN LITERATURE] Make at least two choices highly competitive until the final interpretation step.',
        '- [CSAT KOREAN LITERATURE] All five choices must sound like legitimate literary interpretations. Avoid throwaway distractors or obvious concept errors.',
        '- [CSAT KOREAN LITERATURE] Within one shared-passage set, do not repeat the same question role. Split roles such as speaker attitude, expression feature, scene/conflict function, and appreciation with <보기>.',
        '- [CSAT KOREAN LITERATURE] For "expression-feature" items, every choice must keep the same structure: "expression or technique + function". Do not mix in obviously unrelated options such as dialogue, plot conflict resolution, grammar terms, or spatial movement unless the passage clearly supports them.',
        '- [CSAT KOREAN LITERATURE] For conflict-analysis items, the passage must include concrete conflict signals such as opposition, hesitation, silence under pressure, refusal, or a consequential choice, and the distractors must stay on the conflict-interpretation axis.',
        '- [CSAT KOREAN LITERATURE] If <보기> is used, it must provide only an interpretive lens. It must not reveal the answer directly.',
        '- [CSAT KOREAN LITERATURE] In a shared-passage set, only the appreciation item may append <보기>. The other items should use the same base passage without adding <보기> unless absolutely necessary.',
        '- [CSAT KOREAN LITERATURE] Do not write a choice that merely paraphrases the wording of <보기> or repeats its conclusion almost verbatim.',
        '- [CSAT KOREAN LITERATURE] In the explanation, cite at least two internal expressions or images from the passage and explain why the strongest distractor is wrong.',
    ];
    if (String(input.questionType ?? '').trim() === '\uC804\uCCB4') {
        rules.push('- [ENGLISH TYPE] 전체 생성 시에도 각 문항은 하나의 유형 규칙만 따라야 합니다.', '- [ENGLISH TYPE] 어법/어휘, 빈칸 추론, 문장 삽입, 순서 배열, 심경/분위기, 관계없는 문장, 요약문 완성의 형식을 혼동하지 마십시오.');
    }
    if (isEnglishQuestionTypeSafe(input.questionType, '\uBE48\uCE78 \uCD94\uB860')) {
        rules.push(...buildBlankPrompt());
    }
    if (isEnglishQuestionTypeSafe(input.questionType, '\uC694\uC57D\uBB38 \uC644\uC131')) {
        rules.push(...buildSummaryCompletionPromptRules());
    }
    if (isEnglishQuestionTypeSafe(input.questionType, '\uC5B4\uBC95/\uC5B4\uD718')) {
        rules.push(...buildGrammarPrompt());
    }
    if (isEnglishQuestionTypeSafe(input.questionType, '\uC2EC\uACBD/\uBD84\uC704\uAE30')) {
        rules.push(...buildMoodPrompt());
    }
    if (isEnglishQuestionTypeSafe(input.questionType, '\uBB38\uC7A5 \uC0BD\uC785')) {
        rules.push(...buildInsertionPrompt());
    }
    if (isEnglishQuestionTypeSafe(input.questionType, '\uC21C\uC11C \uBC30\uC5F4')) {
        rules.push(...buildOrderPrompt());
    }
    if (isEnglishQuestionTypeSafe(input.questionType, '\uAD00\uACC4\uC5C6\uB294 \uBB38\uC7A5')) {
        rules.push(...buildOddSentencePrompt());
    }
    if (isEnglishQuestionTypeSafe(input.questionType, '\uC694\uC9C0/\uC8FC\uC81C/\uC81C\uBAA9')) {
        rules.push('- [요지/주제/제목] stem의 한국어 발문은 요지, 주제, 제목 중 요청된 하나를 직접 묻는 형태여야 합니다.', '- [요지/주제/제목] 요약문 (A)/(B), 문장 삽입용 제시문, 순서 배열용 (A)(B)(C) 구간 표시는 절대 넣지 마십시오.', '- [요지/주제/제목] choices는 모두 영어 표현으로만 작성하고, 지문의 핵심 메시지를 변별할 수 있어야 합니다.');
    }
    if (isEnglishQuestionTypeSafe(input.questionType, '\uB0B4\uC6A9 \uC77C\uCE58')) {
        rules.push('- [내용 일치] stem의 한국어 발문은 내용 일치 또는 불일치 여부를 직접 묻는 형태여야 합니다.', '- [내용 일치] 선택지는 지문 세부 정보를 바탕으로 진위를 판단할 수 있는 완결된 영어 문장으로 작성하십시오.', '- [내용 일치] 다른 유형의 형식, 예를 들어 (A)(B), 삽입문, 순서 배열 구간 표시는 섞지 마십시오.');
    }
}
function buildCsatKoreanLiteratureSetPrompt(input) {
    const feedbackBlock = buildFeedbackBlock(input.validationFeedback);
    return [
        'You are generating Korean CSAT literature question sets.',
        'Return only one JSON object.',
        'Do not return a JSON array for this task.',
        'Use exactly this schema:',
        '{',
        '  "title": "string",',
        '  "sets": [',
        '    {',
        '      "passage": "shared literary passage string",',
        '      "items": [',
        '        {',
        '          "topic": "string",',
        '          "role": "speaker|expression|scene|appreciation|other",',
        '          "type": "multiple",',
        '          "stem": "question stem only",',
        '          "choices": ["...", "...", "...", "...", "..."],',
        '          "answer": "exact choice text or 1-5 index",',
        '          "explanation": "brief explanation with textual evidence",',
        '          "view": "optional <보기> text only for appreciation items; otherwise null"',
        '        }',
        '      ]',
        '    }',
        '  ]',
        '}',
        `Create exactly ${input.count} question(s) total in exactly one set for this response.`,
        'All questions in the set must share the same passage.',
        'Do not duplicate the passage in each item.',
        'The passage must be stored only in "passage".',
        'For each flattened item, the system will combine "passage" and optional "view" into stimulus automatically.',
        'Only appreciation items may use "view".',
        'Each item must have exactly 5 choices.',
        'Each item must be solvable by internal evidence from the passage only.',
        'Each item in the set must have a different role and a different answer logic.',
        'Keep the passage short but literary: 3-6 lines for verse-like text or 2-5 sentences for prose-like text.',
        'Do not generate grammar-analysis questions.',
        'Do not include meta commentary, labels like [문제 1], or prose outside the JSON object.',
        ...buildCsatKoreanLiteratureRules(input),
        '',
        feedbackBlock,
        '',
        buildSourceMaterialBlock(input),
    ].join('\n');
}
function buildKoreanPassageRules(subject) {
    if (subject !== 'korean_literature' && subject !== 'korean_reading') {
        return [];
    }
    const isLiterature = subject === 'korean_literature';
    const label = isLiterature ? '문학' : '독서';
    const passageLabel = isLiterature ? '시/소설/수필/극 등 작품 원문 전체' : '비문학 지문 전문';
    const lengthRule = isLiterature
        ? '시는 최소 2연 이상 또는 원작의 핵심 부분을 1연 이상 인용하고, 소설/수필/극은 최소 6~10문장 이상의 장면 또는 단락을 인용하십시오.'
        : '지문은 최소 4문단(약 600자 이상)의 완결된 글로 구성하십시오.';
    return [
        `- [CRITICAL][국어 ${label} 필드 배치 규칙] 지문과 발문은 화면에서 별도 영역(박스)으로 렌더링되므로, 필드를 아래와 같이 엄격히 구분해서 채우십시오.`,
        `- [CRITICAL] "stimulus" 필드에는 반드시 문제 풀이의 근거가 되는 **지문(${passageLabel})만** 담으십시오. 발문(질문 문장)이나 선택지를 stimulus에 넣지 마십시오.`,
        '- [CRITICAL] "stem" 필드에는 **발문만** 담으십시오. 도입 발문(예: "다음 글을 읽고 물음에 답하시오.")과 세부 발문(예: "윗글에 대한 설명으로 가장 적절한 것은?")은 \\n\\n으로 구분해 함께 넣을 수 있지만, 본문 지문은 절대로 stem에 복사하지 마십시오.',
        '- [절대 금지] stimulus를 null로 비우거나 지문을 누락한 출력은 허용되지 않습니다. 반드시 stimulus에 지문을 채우십시오.',
        '- [절대 금지] 동일한 지문 텍스트를 stem과 stimulus 양쪽에 중복으로 넣지 마십시오. 지문은 오직 stimulus에만 존재해야 합니다.',
        `- [지문 분량] ${lengthRule}`,
        '- [원문 인용] 제시 자료에 원문이 주어진 경우, 요약하거나 축약하지 말고 원문을 그대로 stimulus에 인용하십시오. 원문이 없다면 작품명/주제를 바탕으로 대표 구절을 생성하여 stimulus에 넣으십시오.',
        '- [<보기> 처리] 외재적 관점·작품 해설용 <보기>가 필요한 경우, 지문 뒤에 "\\n\\n<보기>\\n[보기 내용]" 형식으로 stimulus에 이어 붙이십시오. (별도 필드 없음)',
        '- [밑줄 표기] 지문 내 특정 구절을 가리켜야 하는 경우 ㉠, ㉡, ㉢, ㉣, ㉤ 기호를 해당 구절 앞에 붙이거나 <u>태그</u>로 밑줄을 표시하십시오.',
        '- [예시] stem: "다음 글을 읽고 물음에 답하시오.\\n\\n윗글의 화자에 대한 설명으로 가장 적절한 것은?" / stimulus: "[지문 원문 전체]"',
    ];
}
function isSocialSubject(subject) {
    if (!subject)
        return false;
    const s = subject.toString();
    return ((s || '').includes('social') ||
        (s || '').includes('geography') ||
        (s || '').includes('economics') ||
        (s || '').includes('politics') ||
        (s || '').includes('ethics') ||
        (s || '').includes('social_culture') ||
        (s || '').includes('living_ethics') ||
        (s || '').includes('ethics_thought'));
}
function isScienceSubject(subject) {
    if (!subject)
        return false;
    const s = subject.toString().toLowerCase();
    return (s.includes('science') ||
        s.includes('physics') ||
        s.includes('chemistry') ||
        s.includes('biology'));
}
function buildSciencePromptRules() {
    return [
        '- [Science/Physics Rules] 모든 물리 변수는 반드시 LaTeX 형식으로 작성하십시오. 예: v_0 → \\(v_0\\), v_{A,max} → \\(v_{A,\\max}\\)',
        '- [Science/Physics Rules] absolutley NO English passage generation. All stem, choices, and stimulus (except Diagram Description variables) MUST be in Korean.',
        '- [Science/Physics Rules] 이 문항은 과학 문항입니다. "English Summary", "Blank Inference", "Sentence Insertion" 등 영어 시험 전용 형식을 절대 사용하지 마십시오.',
        '- [Science/Physics Rules] 지문(stem/stimulus)을 영문으로 작성하면 결정적 오류로 간주됩니다. 반드시 고등 교육 과정 한국어 용어를 사용하십시오.',
        '- [Science/Physics Rules] 절대 금지: v_________0 같은 형태, 수식과 밑줄을 한 문장 내에서 붙여 쓰는 구조.',
        '- [Science/Physics Rules] 빈칸(blank)은 반드시 일반 텍스트로만 생성하십시오. 예: "속력은 ______이다"',
        '- [Science/Physics Rules] 수식과 설명은 반드시 분리하십시오. 예: "초기 속력은 \\(v_0\\)이다"',
        '- [Science/Physics Rules] 문항 구조는 반드시 아래 순서를 따르십시오: (1) 상황 설명, (2) (필요 시) 그림 설명, (3) 조건 제시, (4) 마지막 줄에 질문.',
        '- [Science/Physics Rules] 핵심 질문은 반드시 마지막 줄에 배치하십시오. 예: "비는 얼마인가?"',
        '- [Science/Physics Rules] 모든 물리 문제는 반드시 stimulus에 [Diagram Description]으로 시작하는 상세한 그림 설명을 포함하십시오. (물체의 위치, 방향, 힘 또는 연결 상태 등)',
    ];
}
function isMathSubject(subject) {
    if (!subject) return false;
    return subject.toString().toLowerCase().includes('math');
}
function buildMathPromptRules() {
    return [
        '- [MATH FATAL] 수식의 평문/LaTeX 이중 출력을 절대 금지합니다. "함수 f(x)\\(f(x)\\)" 또는 "수열 {an}\\(\\{a_n\\}\\)" 처럼 같은 수식을 두 번 쓰면 즉시 폐기합니다. 반드시 LaTeX 한 번만 사용하십시오. 올바른 예: "함수 \\(f(x)\\)에 대하여"',
        '- [MATH FATAL] 선지(choices)에 "1", "2", "3", "4", "5" 같은 순번만 넣는 것을 절대 금지합니다. 각 선지는 반드시 구체적인 수학적 값이나 수식이어야 합니다. 예: "7", "\\(\\frac{3}{2}\\)", "\\(2\\sqrt{3}\\)", "\\(-1\\)", "12"',
        '- [MATH FATAL] "~에 관한 분석으로 적절한 것은?", "~에 관한 설명으로 적절한 것은?" 같이 구체적 계산 없이 서술형 해석만 묻는 발문을 금지합니다. 수학 문항의 정답은 반드시 구체적 수치, 수식, 또는 명확한 참/거짓 판별이어야 합니다.',
        '- [MATH LATEX] 모든 수식 변수, 함수명, 연산은 반드시 LaTeX 구분자 안에서만 표현하십시오. 인라인: \\(...\\), 디스플레이: \\[...\\]',
        '- [MATH LATEX] 한글 문장 안에 a>=3, f(x)=0, lim 같은 평문 수식을 쓰지 마십시오. 반드시 \\(a \\ge 3\\), \\(f(x)=0\\), \\(\\lim\\) 형태로 작성하십시오.',
        '- [MATH LATEX] JSON 내의 모든 백슬래시는 이중(\\\\)으로 작성하십시오.',
        '- [MATH FIELD] stem = 한국어 발문 + 간단한 인라인 수식. stimulus = 함수 정의, 조건식, \\begin{cases}, 점화식 등 복잡한 수식 블록.',
        '- [MATH FIELD] 수학 문항은 거의 항상 stimulus가 필요합니다. stimulus를 null로 두면 안 됩니다. 최소한 풀이 대상이 되는 수식 조건을 stimulus에 넣으십시오.',
        '- [MATH FIELD] stimulus 안의 수식은 \\[...\\]로 감싸십시오.',
        '- [MATH STEM] 발문은 반드시 "무엇을 구하는가"를 명확히 지정해야 합니다. 예: "\\(f(3)\\)의 값은?", "\\(a+b\\)의 값을 구하시오.", "\\(\\lim_{x \\to 1} f(x)\\)의 값은?"',
        '- [MATH STEM] 발문에 풀이 조건을 장황하게 나열하지 마십시오. 조건은 stimulus에 넣고, stem은 질문만 담으십시오.',
        '- [MATH CHOICE] 5개 선지는 모두 구체적 수학값이어야 합니다. 정수, 분수, 근호, 수식 등 계산으로 도달 가능한 값을 넣으십시오.',
        '- [MATH CHOICE] 오답 선지는 흔한 계산 실수(부호 오류, 공식 혼동, 조건 누락 등)에서 나올 법한 값으로 구성하십시오.',
        '- [MATH CHOICE] answer는 choices 배열의 해당 값과 글자 그대로 동일해야 합니다.',
        '- [MATH EXAMPLE] 좋은 예: stem="다항함수 \\(f(x)\\)가 다음 조건을 만족시킬 때, \\(f(2)\\)의 값은?", stimulus="\\[f\'(x) = 3x^2 - 4x + 1,\\quad f(0) = 2\\]", choices=["3","5","7","9","11"], answer="7"',
        '- [MATH EXAMPLE] 좋은 예: stem="등차수열 \\(\\{a_n\\}\\)에 대하여 \\(a_1 + a_{10}\\)의 값은?", stimulus="\\[a_3 = 7,\\quad a_7 = 19\\]", choices=["24","26","28","30","32"], answer="26"',
    ];
}
function isEnglishSubject(subject) {
    return String(subject).toLowerCase().includes('english');
}
function isEnglishQuestionType(input, type) {
    return (input.questionType === type ||
        input.questionType === '전체' ||
        (type === '요지/주제/제목' &&
            (input.questionType?.includes('요지') ||
                input.questionType?.includes('주제') ||
                input.questionType?.includes('제목'))) ||
        (type === '어법/어휘' &&
            (input.questionType?.includes('어법') ||
                input.questionType?.includes('어휘') ||
                input.questionType?.includes('문법'))));
}
function buildEnglishOutputFormatRules(isCsatMode) {
    const rules = [
        '- [OUTPUT FORMAT] 출력 형식을 절대 변경하지 마십시오. JSON 배열만 반환하십시오.',
        '- [OUTPUT FORMAT] JSON 바깥에 설명, 머리말, 꼬리말, 마크다운, 코드블록을 절대 추가하지 마십시오.',
        '- [OUTPUT FORMAT] 각 문항은 반드시 "topic", "type", "stem", "choices", "answer", "explanation", "stimulus"만 포함하십시오.',
        '- [OUTPUT FORMAT] "type"은 반드시 "multiple"이어야 합니다.',
        '- [OUTPUT FORMAT] "choices"는 반드시 5개여야 합니다.',
        '- [OUTPUT FORMAT] "answer"는 반드시 "choices" 중 하나와 완전히 동일한 문자열이어야 합니다.',
        '- [OUTPUT FORMAT] 내부적으로 [문제]는 stem, [선지]는 choices, [정답]은 answer, [해설]은 explanation에 대응합니다.',
        '- [OUTPUT FORMAT] 유형별로 [지문]은 stem 또는 stimulus 중 한 곳에만 두고, 같은 지문을 두 필드에 중복 복사하지 마십시오.',
        '- [OUTPUT FORMAT] 불필요한 설명을 추가하지 말고, 문제 풀이에 필요한 정보만 남기십시오.',
        '- [OUTPUT FORMAT] 한국어 발문과 영어 지문은 반드시 빈 줄 하나 이상으로 분리하십시오.',
    ];
    if (isCsatMode) {
        rules.push('- [CSAT OUTPUT] 수능형 문항처럼 지문, 발문, 선지, 정답, 해설이 바로 식별되도록 구성하십시오.', '- [CSAT OUTPUT] 해설은 정답 근거와 대표 오답 한 개의 오류만 짧게 설명하십시오.');
    }
    return rules;
}
function buildBlankPrompt() {
    return [
        '- [빈칸 추론] 지문 안에는 보이는 빈칸이 정확히 1개만 있어야 합니다.',
        '- [빈칸 추론] 빈칸 표기는 반드시 "_________"만 사용하십시오. (A), [A], 번호형 빈칸을 쓰지 마십시오.',
        '- [빈칸 추론] 빈칸은 지문 중간의 핵심 논리 문장에 두십시오. 결론 문장이나 마지막 절에는 두지 마십시오.',
        '- [빈칸 추론] 빈칸 앞뒤 문맥만 읽어도 논리 추론이 가능하도록 근거를 최소 2개 이상 심으십시오.',
        '- [빈칸 추론] 선지는 단어 나열이 아니라 핵심 의미 단위의 구 또는 짧은 표현으로 구성하십시오.',
        '- [빈칸 추론] <u> 밑줄, 번호 매긴 밑줄, 요약문 (A)/(B) 형식을 섞지 마십시오.',
        '- [빈칸 추론] 표준 발문은 "다음 빈칸에 들어갈 말로 가장 적절한 것은?" 계열로 유지하십시오.',
    ];
}
function buildSummaryCompletionPromptRules() {
    return [
        '- [요약문 완성] 원문 지문은 stem에 넣고, 요약문은 stimulus에만 넣으십시오.',
        '- [요약문 완성] stimulus에는 "(A)_______"와 "(B)_______"가 들어간 영어 요약문 한 문장만 두십시오.',
        '- [요약문 완성] stem의 한국어 발문은 반드시 요약문 완성 문제 형태로 쓰십시오. 요지/주제/제목 문제 발문으로 바꾸지 마십시오.',
        '- [요약문 완성] stem에는 "다음 글의 내용을 한 문장으로 요약할 때, 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?" 계열의 발문만 사용하십시오.',
        '- [요약문 완성] 선택지 5개는 모두 "word_for_A / word_for_B" 형식의 단어/구 조합이어야 합니다.',
        '- [요약문 완성] 요약문은 원문의 핵심 주장과 전개를 압축한 시험형 문장으로 작성하십시오.',
        '- [요약문 완성] 선택지는 문장 전체가 아니라 단어 또는 짧은 구 중심으로 정리하십시오.',
    ];
}
function buildGrammarPrompt() {
    return [
        '- [어법/어휘] 이 유형은 지문 속 밑줄 친 부분의 적절성을 묻는 유형입니다. 요약문 형식을 섞지 마십시오.',
        '- [어법/어휘] 지문에는 반드시 ① <u>word</u> ~ ⑤ <u>word</u> 형식의 번호 + 밑줄 표시를 사용하십시오.',
        '- [어법/어휘] 선택지는 반드시 밑줄 친 대상에 대응하는 순수 단어 또는 짧은 구(최대 3단어)만 사용하십시오.',
        '- [어법/어휘] 선택지 안에 <u> 태그나 문장 절을 넣지 마십시오.',
        '- [어법/어휘] 발문은 "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?" 또는 "문맥상 낱말의 쓰임이 적절하지 않은 것은?" 형태를 유지하십시오.',
        '- [어법/어휘] 어법 문항과 어휘 문항을 구분 가능하게 만들고, 같은 배치에서 둘 중 하나로만 쏠리지 않게 하십시오.',
    ];
}
function buildMoodPrompt() {
    return [
        '- [심경/분위기] 선택지는 모두 영어만 사용하십시오.',
        '- [심경/분위기] stem의 한국어 발문은 반드시 "심경" 또는 "분위기"를 직접 묻는 형태여야 합니다. 주제/요지 발문으로 바꾸지 마십시오.',
        '- [심경/분위기] 이 유형은 세 가지 하위 형식 중 하나를 선택하여 생성하십시오:',
        '  (A) "심경 변화" — 발문에 인물 이름 + "의 심경 변화"를 포함하고, 선택지는 "excited / disappointed"처럼 "word_A / word_B" 감정 변화 쌍으로 구성. 예: "다음 글에 드러난 Sarah의 심경 변화로 가장 적절한 것은?"',
        '  (B) "심경(단일)" — 발문에 "심경"을 포함하되 "변화"는 넣지 않고, 선택지는 "nervous", "relieved"처럼 단일 감정 영어 단어로 구성. 예: "다음 글에 드러난 \'I\'의 심경으로 가장 적절한 것은?"',
        '  (C) "분위기" — 발문에 "분위기"를 포함하고, 선택지는 "gloomy", "peaceful"처럼 단일 분위기 영어 단어로 구성. 예: "다음 글의 분위기로 가장 적절한 것은?"',
        '- [심경/분위기] 세 형식을 혼동하지 마십시오. "심경 변화"에만 "A / B" 쌍 선택지를 사용하고, 나머지는 단일 단어만 사용하십시오.',
        '- [심경/분위기] 불필요하게 긴 해설을 쓰지 말고, 정답 근거가 되는 표현만 짧게 짚으십시오.',
    ];
}
function buildInsertionPrompt() {
    return [
        '- [문장 삽입] 제시문은 stimulus에만 넣고, 본문은 stem에만 넣으십시오.',
        '- [문장 삽입] stimulus에는 삽입할 한 문장만 두십시오. 본문 전체나 요약문을 넣지 마십시오.',
        '- [문장 삽입] stem의 한국어 발문은 반드시 문장 삽입 문제 형태로 쓰십시오. 요지/요약/순서 배열 발문으로 바꾸지 마십시오.',
        '- [문장 삽입] stem에는 삽입 위치 표시 (1)~(5)를 모두 포함하십시오.',
        '- [문장 삽입] stem에는 본문 전체와 한국어 발문을 넣되, "제시문 요약", "passage summary" 같은 메타 문구를 붙이지 마십시오.',
        '- [문장 삽입] choices는 반드시 ["①", "②", "③", "④", "⑤"] 형식으로 유지하십시오.',
        '- [문장 삽입] 제시문을 본문에 중복으로 남기지 마십시오.',
        '- [문장 삽입] 제시문과 본문이 논리 연결, 지시어, 대명사, 전환 표현으로 정확히 맞물리도록 구성하십시오.',
    ];
}
function buildOrderPrompt() {
    return [
        '- [순서 배열] stimulus에는 (A) 이전에 제시되는 도입 문단 또는 공통 시작문만 넣으십시오.',
        '- [순서 배열] stem에는 반드시 (A), (B), (C) 세 구간만 넣으십시오. (D) 이상은 금지합니다.',
        '- [순서 배열] (A), (B), (C) 표시는 구간 레이블이지 빈칸이 아닙니다. "(A)_______"처럼 쓰지 마십시오.',
        '- [순서 배열] stem은 "다음 글의 흐름으로 보아, 주어진 문장 다음에 이어질 순서로 가장 적절한 것은?" 같은 한국어 발문 뒤에 (A), (B), (C) 세 구간을 제시하는 구조로 쓰십시오.',
        '- [순서 배열] 각 구간은 서로 구분되는 내용 흐름을 가져야 하며, 연결어와 논리 전개로 순서를 판단할 수 있어야 합니다.',
        '- [순서 배열] 선택지는 반드시 A-B-C 순서 조합형으로 유지하십시오. 번호 선택지만 두지 마십시오.',
        '- [순서 배열] choices는 반드시 정확히 ["A-B-C", "A-C-B", "B-A-C", "B-C-A", "C-A-B"]를 사용하십시오.',
        '- [순서 배열] answer도 반드시 위 다섯 choice 중 하나와 완전히 동일한 문자열이어야 합니다.',
        '- [순서 배열] 잘못된 예시: "(A)_______- (C) / - (B)_______", "A)_______- (B)_______- (C", "①". 이런 형식은 절대 금지합니다.',
        '- [순서 배열][EXAMPLE JSON] {"topic":"...","type":"multiple","stem":"다음 글의 흐름으로 보아, 주어진 문장 다음에 이어질 순서로 가장 적절한 것은?\\n\\n(A) First paragraph...\\n\\n(B) Second paragraph...\\n\\n(C) Third paragraph...","choices":["A-B-C","A-C-B","B-A-C","B-C-A","C-A-B"],"answer":"B-A-C","explanation":"...","stimulus":"Intro paragraph before (A)"}',
    ];
}
function buildOddSentencePrompt() {
    return [
        '- [관계없는 문장] stem에는 한국어 발문 + 번호가 붙은 영어 문장 5개만 두고, 흐름상 어색한 문장은 정확히 1개만 존재하게 하십시오.',
        '- [관계없는 문장] stem의 한국어 발문은 반드시 "다음 글에서 전체 흐름과 관계없는 문장은?" 계열로 쓰십시오.',
        '- [관계없는 문장] stem의 본문 문장 5개는 반드시 (1), (2), (3), (4), (5)로 직접 시작하게 쓰십시오.',
        '- [관계없는 문장] choices는 반드시 ["(1)", "(2)", "(3)", "(4)", "(5)"] 형식으로 유지하십시오.',
        '- [관계없는 문장] stimulus는 사용하지 마십시오 (null 또는 빈 문자열).',
        '- [관계없는 문장] 오답 문장은 억지 주제가 아니라 실제 흐름과 논리 축에서 벗어나도록 만드십시오.',
        '- [관계없는 문장] 정답 문장 하나만 명확히 고를 수 있도록 나머지 4문장은 같은 흐름을 공유하게 하십시오.',
        '- [관계없는 문장][EXAMPLE] {"topic":"English Reading","type":"multiple","stem":"다음 글에서 전체 흐름과 관계없는 문장은?\\n\\n(1) Forests play a vital role in absorbing carbon dioxide. (2) Trees convert sunlight into energy through photosynthesis. (3) The price of lumber has risen sharply this year. (4) Healthy forests support biodiversity by providing habitats. (5) Deforestation accelerates climate change by releasing stored carbon.","choices":["(1)","(2)","(3)","(4)","(5)"],"answer":"(3)","explanation":"(3)은 목재 가격에 대한 경제적 내용으로, 숲의 생태적 역할이라는 전체 흐름과 관계없다."}',
    ];
}
function buildEnglishTypePromptRules(input, isCsatMode) {
    if (!isEnglishSubject(input.subject)) {
        return [];
    }
    const rules = [
        ...buildEnglishOutputFormatRules(isCsatMode),
        '- [ENGLISH TYPE] 요청된 유형 규칙만 따르십시오. 서로 다른 유형의 형식을 섞지 마십시오.',
    ];
    if (input.questionType === '전체') {
        rules.push('- [ENGLISH TYPE] 전체 생성 시에도 각 문항은 하나의 유형 규칙만 따르십시오.', '- [ENGLISH TYPE] 어법/어휘, 빈칸 추론, 문장 삽입, 순서 배열, 심경/분위기, 관계없는 문장, 요약문 완성의 형식을 혼동하지 마십시오.');
    }
    if (isEnglishQuestionType(input, '빈칸 추론')) {
        rules.push(...buildBlankPrompt());
    }
    if (isEnglishQuestionType(input, '요약문 완성')) {
        rules.push(...buildSummaryCompletionPromptRules());
    }
    if (isEnglishQuestionType(input, '어법/어휘')) {
        rules.push(...buildGrammarPrompt());
    }
    if (isEnglishQuestionType(input, '심경/분위기')) {
        rules.push(...buildMoodPrompt());
    }
    if (isEnglishQuestionType(input, '문장 삽입')) {
        rules.push(...buildInsertionPrompt());
    }
    if (isEnglishQuestionType(input, '순서 배열')) {
        rules.push(...buildOrderPrompt());
    }
    if (isEnglishQuestionType(input, '관계없는 문장')) {
        rules.push(...buildOddSentencePrompt());
    }
    if (isEnglishQuestionType(input, '요지/주제/제목')) {
        rules.push('- [요지/주제/제목] 지문 전체는 stem에 넣고, 선택지는 핵심 메시지를 나타내는 단일 문구 또는 문장으로 구성하십시오.', '- [요지/주제/제목] <u> 밑줄, A / B 조합형, (A)/(B) 빈칸형 선택지를 쓰지 마십시오.');
    }
    if (isEnglishQuestionType(input, '내용 일치')) {
        rules.push('- [내용 일치] 지문과 발문은 모두 stem에 넣고 stimulus는 null로 두십시오.', '- [내용 일치] 다른 유형의 형식, 예를 들어 (A)(B), 삽입문, 순서 배열 구간 표시는 섞지 마십시오.');
    }
    if (isCsatMode) {
        rules.push('- [CSAT ENGLISH] 모든 영어 문항은 실제 수능 영어 독해처럼 평가 포인트가 하나로 선명해야 합니다.', '- [CSAT ENGLISH] 억지 오답보다 실제 시험처럼 매력적인 오답을 만들되, 정답 근거는 지문 내부에서 분명히 찾을 수 있어야 합니다.');
    }
    return rules;
}
function buildEnglishOrderStrictPrompt(input, isCsatMode) {
    const rules = getGenerationRules({
        subject: input.subject,
        selectionLabel: '문제유형',
        selectionValue: input.questionType ?? '순서 배열',
        difficulty: input.difficulty,
        schoolLevel: isCsatMode ? 'csat' : input.schoolLevel,
    });
    return [
        isCsatMode
            ? '당신은 대한민국 수능 영어 순서 배열 문항만 전문적으로 출제하는 평가원 스타일 출제 위원입니다.'
            : '당신은 고등학교 영어 순서 배열 문항만 전문적으로 출제하는 출제자입니다.',
        '반드시 JSON 객체 하나만 반환하십시오.',
        '반드시 정확히 1문항만 생성하십시오.',
        '이 요청은 오직 "순서 배열" 유형입니다. 다른 유형으로 바꾸지 마십시오.',
        'JSON 스키마는 정확히 다음과 같습니다.',
        '{"topic":"string","intro":"English intro paragraph before (A)","sections":{"A":"paragraph A","B":"paragraph B","C":"paragraph C"},"correct_order":"A-B-C | A-C-B | B-A-C | B-C-A | C-A-B","explanation":"string"}',
        '- [HARD FORMAT LOCK] correct_order는 반드시 "A-B-C", "A-C-B", "B-A-C", "B-C-A", "C-A-B" 중 하나만 사용하십시오.',
        '- [HARD FORMAT LOCK] sections.A, sections.B, sections.C는 정확히 세 구간만 작성하십시오.',
        '- [HARD FORMAT LOCK] "(A)_______" 같은 빈칸형 표기는 절대 금지합니다. 각 section 값은 순수 문단 텍스트만 작성하십시오.',
        '- [HARD FORMAT LOCK] intro에는 (A) 이전에 오는 영어 도입문만 넣으십시오.',
        '- [HARD FORMAT LOCK] intro 안에 (A), (B), (C)를 넣지 마십시오.',
        '- [HARD FORMAT LOCK] 관계없는 문장, 문장 삽입, 빈칸 추론, 요약문 완성 형식을 섞지 마십시오.',
        '- [STYLE] 발문은 "다음 글의 흐름으로 보아, 주어진 문장 다음에 이어질 순서로 가장 적절한 것은?" 계열의 한국어 시험 발문으로 쓰십시오.',
        '- [STYLE] 각 구간은 연결어, 지시어, 논리 전개를 통해 순서를 판단할 수 있어야 합니다.',
        '- [STYLE] explanation은 왜 정답 순서가 맞는지와 가장 강한 오답이 왜 틀리는지만 짧게 설명하십시오.',
        '- [EXAMPLE OUTPUT]',
        '{',
        '  "topic": "Climate Change and Migration",',
        '  "intro": "Intro paragraph before (A)",',
        '  "sections": {',
        '    "A": "First paragraph...",',
        '    "B": "Second paragraph...",',
        '    "C": "Third paragraph..."',
        '  },',
        '  "correct_order": "B-A-C",',
        '  "explanation": "Paragraph B introduces the problem first, A develops the social implication next, and C concludes the policy response. A-C-B is attractive but reverses the causal sequence."',
        '}',
        '',
        `Subject: ${rules.subjectLabel}`,
        `Difficulty: ${input.difficulty}`,
        `School level: ${isCsatMode ? 'csat' : input.schoolLevel}`,
        ...rules.combinedConstraints.map((rule) => `- ${rule}`),
        '',
        buildFeedbackBlock(input.validationFeedback),
        '',
        buildSourceMaterialBlock(input),
    ].join('\n');
}
function buildEnglishOrderStrictArrayPrompt(input, isCsatMode) {
    const rules = getGenerationRules({
        subject: input.subject,
        selectionLabel: '문제유형',
        selectionValue: input.questionType ?? '순서 배열',
        difficulty: input.difficulty,
        schoolLevel: isCsatMode ? 'csat' : input.schoolLevel,
    });
    return [
        isCsatMode
            ? '당신은 대한민국 수능 영어 순서 배열 문항만 전문적으로 출제하는 평가원 스타일 출제 위원입니다.'
            : '당신은 고등학교 영어 순서 배열 문항만 전문적으로 출제하는 출제자입니다.',
        '반드시 JSON 배열만 반환하십시오.',
        `반드시 정확히 ${input.count}개 문항만 생성하십시오.`,
        '이 요청은 오직 "순서 배열" 유형입니다. 다른 유형으로 바꾸지 마십시오.',
        'JSON 배열의 각 item은 정확히 다음 스키마를 따라야 합니다.',
        '{"topic":"string","intro":"English intro paragraph before (A)","sections":{"A":"paragraph A","B":"paragraph B","C":"paragraph C"},"correct_order":"A-B-C | A-C-B | B-A-C | B-C-A | C-A-B","explanation":"string"}',
        '- [HARD FORMAT LOCK] correct_order는 반드시 "A-B-C", "A-C-B", "B-A-C", "B-C-A", "C-A-B" 중 하나만 사용하십시오.',
        '- [HARD FORMAT LOCK] sections.A, sections.B, sections.C는 정확히 세 구간만 작성하십시오.',
        '- [HARD FORMAT LOCK] "(A)_______" 같은 빈칸형 표기는 절대 금지합니다. 각 section 값은 순수 문단 텍스트만 작성하십시오.',
        '- [HARD FORMAT LOCK] intro에는 (A) 이전에 오는 영어 도입문만 넣으십시오.',
        '- [HARD FORMAT LOCK] intro 안에 (A), (B), (C)를 넣지 마십시오.',
        '- [HARD FORMAT LOCK] 관계없는 문장, 문장 삽입, 빈칸 추론, 요약문 완성 형식을 섞지 마십시오.',
        '- [STYLE] 각 문항은 한국어 시험형 발문을 전제로 한 순서 배열 문항이어야 합니다.',
        '- [STYLE] 각 구간은 연결어, 지시어, 논리 전개를 통해 순서를 판단할 수 있게 하십시오.',
        '- [STYLE] explanation은 정답 순서가 맞는 이유와 가장 강한 오답 하나가 왜 틀리는지만 짧게 설명하십시오.',
        '- [EXAMPLE OUTPUT]',
        '[',
        '  {',
        '    "topic": "Climate Change and Migration",',
        '    "intro": "Intro paragraph before (A)",',
        '    "sections": {',
        '      "A": "First paragraph...",',
        '      "B": "Second paragraph...",',
        '      "C": "Third paragraph..."',
        '    },',
        '    "correct_order": "B-A-C",',
        '    "explanation": "Paragraph B introduces the problem first, A develops the social implication next, and C concludes the policy response. A-C-B is attractive but reverses the causal sequence."',
        '  }',
        ']',
        '',
        `Subject: ${rules.subjectLabel}`,
        `Difficulty: ${input.difficulty}`,
        `School level: ${isCsatMode ? 'csat' : input.schoolLevel}`,
        ...rules.combinedConstraints.map((rule) => `- ${rule}`),
        '',
        buildFeedbackBlock(input.validationFeedback),
        '',
        buildSourceMaterialBlock(input),
    ].join('\n');
}
function buildEnglishSummaryStrictPrompt(input, isCsatMode) {
    const rules = getGenerationRules({
        subject: input.subject,
        selectionLabel: '문제유형',
        selectionValue: input.questionType ?? '요약문 완성',
        difficulty: input.difficulty,
        schoolLevel: isCsatMode ? 'csat' : input.schoolLevel,
    });
    return [
        isCsatMode
            ? '당신은 대한민국 수능 영어 요약문 완성 문항만 전문적으로 출제하는 평가원 스타일 출제 위원입니다.'
            : '당신은 고등학교 영어 요약문 완성 문항만 전문적으로 출제하는 출제자입니다.',
        '반드시 JSON 배열만 반환하십시오.',
        `반드시 정확히 ${input.count}개 문항만 생성하십시오.`,
        '이 요청은 오직 "요약문 완성" 유형입니다. 요지/주제/제목 유형으로 바꾸지 마십시오.',
        '⚠️ CRITICAL: stem에는 반드시 한국어 발문과 4~6문장의 완전한 영어 읽기 지문을 함께 넣어야 합니다. 영어 지문이 없으면 문항 자체가 성립하지 않습니다.',
        '각 문항은 반드시 다음 키를 포함해야 합니다: ["topic","type","stem","choices","answer","explanation","stimulus"]',
        '- [HARD FORMAT LOCK] stem 형식: 한국어 발문(다음 글의 내용을 한 문장으로 요약할 때, 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?) + 줄바꿈 두 번 + 4~6문장 완성된 영어 읽기 지문.',
        '- [HARD FORMAT LOCK] stem의 영어 지문에는 (A), (B) 빈칸 표기를 절대 포함하지 마십시오.',
        '- [HARD FORMAT LOCK] stimulus에는 반드시 영어 요약문 한 문장만 넣으십시오.',
        '- [HARD FORMAT LOCK] stimulus에는 반드시 (A)_______ 와 (B)_______ 두 빈칸이 모두 들어 있어야 합니다.',
        '- [HARD FORMAT LOCK] choices는 반드시 5개이며, 모두 "word_A / word_B" 형식이어야 합니다.',
        '- [HARD FORMAT LOCK] answer는 반드시 choices 중 하나와 정확히 같은 문자열이어야 합니다.',
        '- [HARD FORMAT LOCK] 요약문 완성 형식 외에 빈칸 추론, 순서 배열, 문장 삽입, 주제 문제 형식을 섞지 마십시오.',
        '- [EXAMPLE JSON]',
        '[',
        '  {',
        '    "topic": "Urban Policy and Trust",',
        '    "type": "multiple",',
        '    "stem": "다음 글의 내용을 한 문장으로 요약할 때, 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?\\n\\nUrban planning has increasingly focused on efficiency metrics while neglecting social cohesion. Several studies have shown that cities with transparent governance frameworks and participatory decision-making processes tend to build stronger community bonds. In contrast, cities that prioritize rapid development without public engagement often face growing mistrust between residents and local authorities. The evidence suggests that lasting reform requires not just technical competence but also a foundation of accountability and civic involvement.",',
        '    "stimulus": "Effective urban reform must combine (A)_______ with (B)_______.",',
        '    "choices": ["technical efficiency / public trust", "rapid expansion / private control", "institutional speed / environmental decline", "economic scale / cultural uniformity", "digital access / reduced accountability"],',
        '    "answer": "technical efficiency / public trust",',
        '    "explanation": "The passage repeatedly contrasts practical performance with legitimacy and trust."',
        '  }',
        ']',
        ...rules.combinedConstraints.map((rule) => `- ${rule}`),
        '',
        buildFeedbackBlock(input.validationFeedback),
        '',
        buildSourceMaterialBlock(input),
    ].join('\n');
}
function buildEnglishInsertionStrictPrompt(input, isCsatMode) {
    const rules = getGenerationRules({
        subject: input.subject,
        selectionLabel: '문제유형',
        selectionValue: input.questionType ?? '문장 삽입',
        difficulty: input.difficulty,
        schoolLevel: isCsatMode ? 'csat' : input.schoolLevel,
    });
    return [
        isCsatMode
            ? '당신은 대한민국 수능 영어 문장 삽입 문항만 전문적으로 출제하는 평가원 스타일 출제 위원입니다.'
            : '당신은 고등학교 영어 문장 삽입 문항만 전문적으로 출제하는 출제자입니다.',
        '반드시 JSON 배열만 반환하십시오.',
        `반드시 정확히 ${input.count}개 문항만 생성하십시오.`,
        '이 요청은 오직 "문장 삽입" 유형입니다. 빈칸 추론이나 요약문 완성 유형으로 바꾸지 마십시오.',
        '각 문항은 반드시 다음 키만 포함해야 합니다: ["topic","type","stem","choices","answer","explanation","stimulus"]',
        '- [HARD FORMAT LOCK] stimulus에는 삽입할 영어 문장 한 문장만 넣으십시오.',
        '- [HARD FORMAT LOCK] stem에는 한국어 발문과 영어 본문만 넣으십시오.',
        '- [HARD FORMAT LOCK] stem의 발문은 반드시 문장 삽입 문제 형태여야 합니다.',
        '- [HARD FORMAT LOCK] stem의 본문에는 반드시 (1), (2), (3), (4), (5) 다섯 삽입 위치 표시가 모두 있어야 합니다.',
        '- [HARD FORMAT LOCK] stimulus 문장을 stem 본문에 중복으로 남기지 마십시오.',
        '- [HARD FORMAT LOCK] choices는 반드시 ["①","②","③","④","⑤"] 여야 합니다.',
        '- [HARD FORMAT LOCK] answer는 반드시 "①","②","③","④","⑤" 중 하나만 사용하십시오. 제시문 자체를 answer에 넣지 마십시오.',
        '- [HARD FORMAT LOCK] stimulus에 본문 전체, 발문, 요약문을 넣지 마십시오.',
        '- [EXAMPLE JSON]',
        '[',
        '  {',
        '    "topic": "Civic Reform and Trust",',
        '    "type": "multiple",',
        '    "stem": "다음 글의 흐름상 (1)~(5) 중 가장 적절한 곳에 들어갈 문장은?\\n\\nSentence one. (1) Sentence two. (2) Sentence three. (3) Sentence four. (4) Sentence five. (5) Sentence six.",',
        '    "stimulus": "This is the given sentence to insert.",',
        '    "choices": ["①","②","③","④","⑤"],',
        '    "answer": "③",',
        '    "explanation": "The inserted sentence bridges the policy description and the consequence discussed next."',
        '  }',
        ']',
        ...rules.combinedConstraints.map((rule) => `- ${rule}`),
        '',
        buildFeedbackBlock(input.validationFeedback),
        '',
        buildSourceMaterialBlock(input),
    ].join('\n');
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
    const basePrompt = [
        'You are generating school exam questions.',
        'Return only a JSON array.',
        'Each item must contain exactly these keys:',
        '["topic", "type", "stem", "choices", "answer", "explanation", "stimulus"]',
        'Use "type" = "multiple".',
        'choices must contain exactly 5 strings.',
        '- "stimulus": Use this field to provide additional material (e.g., a "Given Sentence" box for English sentence insertion, a diagram description, or a <보기> block). If not needed, set to null.',
        '- [CRITICAL] "answer" must be a string that matches EXACTLY one of the values in the "choices" array. Copy the choice text exactly (including all characters and spaces) into the answer field.',
        '',
        `Subject: ${rules.subjectLabel}`,
        `${selectionLabel}: ${selectionValue}`,
        `Difficulty: ${input.difficulty}`,
        `School level: ${input.schoolLevel}`,
        input.title ? `Title: ${input.title}` : 'Title: None provided',
        input.topic ? `Topic: ${input.topic}` : 'Topic: None provided',
        `Question count: ${input.count}`,
        `- [ABSOLUTE REQUIREMENT] Return exactly ${input.count} questions. If ${input.count} is 5, the JSON array must contain exactly 5 question objects, not 1 and not more than 5.`,
        '- [ABSOLUTE REQUIREMENT] Every question in the same batch must be meaningfully different. Do not repeat the same passage, stem pattern, answer logic, or choice set with superficial wording changes.',
        '',
        ...rules.combinedConstraints.map((rule) => `- ${rule}`),
        ...mixedTypeRules.map((rule) => `- ${rule}`),
        input.difficulty === 'hard'
            ? input.subject.toLowerCase().includes('english')
                ? '- [CRITICAL] For "hard" difficulty in English, use standard and natural CSAT-style stems (e.g., "다음 글의 주제로 가장 적절한 것은?") but ensure the passage, vocabulary, and distractor quality are highly challenging.'
                : '- [CRITICAL] Since the difficulty is "hard", you MUST write a longer, descriptive, and analytic stem. In Korean, use either at least 8 words or at least about 18 Korean characters of reasoning-rich text.'
            : '',
        input.difficulty === 'hard' ? '- [CRITICAL] For "hard" difficulty, provide a deep explanation (at least 10+ words) including the reasoning for the correct answer AND a brief explanation of why the major distractors are incorrect.' : '',
        '- Reflect the provided title and topic directly when they exist.',
        '- Use the source material as the factual basis.',
        '- Do not output duplicate stems or near-duplicate choices.',
    ];
    const typeRules = [
        ...buildEnglishTypePromptRules(input, false),
        ...buildKoreanPassageRules(input.subject),
        ...buildCsatKoreanLiteratureRules(input),
        ...(isScienceSubject(input.subject) ? buildSciencePromptRules() : []),
        ...(isMathSubject(input.subject) ? buildMathPromptRules() : []),
    ];
    return [
        ...basePrompt,
        ...typeRules,
        '',
        '- [CRITICAL] 모든 수학 기호와 수식은 반드시 LaTeX 형식을 사용하십시오. 수식은 반드시 \\\\( 와 \\\\) 기호로 감싸야 합니다.',
        '- [CRITICAL] JSON 결과물 내의 모든 LaTeX 명령어와 구분자는 반드시 이중 역슬래시(\\\\ )를 사용해야 합니다.',
        '- [CRITICAL] "Choice 1", "Placeholder" 등의 임시 텍스트를 절대 사용하지 마십시오.',
        '- [CRITICAL] 지문이나 발문 내에 불필요한 슬래시(/)를 사용하여 문장을 구분하지 마십시오.',
        '- [CRITICAL] 밑줄 표시가 필요한 경우, 반드시 <u>와 </u> 태그를 사용하십시오.',
        '',
        buildFeedbackBlock(input.validationFeedback),
        '',
        input.images && input.images.length > 0 ? '[OCR_CONTEXT]\nYou are provided with high-resolution images of educational material. Even if the text below is incomplete, use the visual context from the images to extract accurate terminology, diagrams, and structures.' : '',
        '',
        buildSourceMaterialBlock(input),
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
        '- [필수] "밑줄 친 부분"과 같이 강조가 필요한 텍스트는 반드시 <u>와 </u> 태그를 사용한다. (예: <u>이순신</u>)',
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
        buildSourceMaterialBlock(input),
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
        buildSourceMaterialBlock(input),
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
    const basePrompt = [
        '당신은 대한민국 수능 및 평가원 모의고사를 출제하는 전문 위원입니다.',
        '지엽적인 지식 암기가 아닌, 대학 교육에 필요한 "사고력"과 "문제 해결 능력"을 측정하는 고품질 문항을 생성하십시오.',
        '반드시 JSON 배열 형식으로만 반환하세요.',
        'JSON의 각 항목은 다음 키를 반드시 포함해야 합니다: ["topic", "type", "stem", "choices", "answer", "explanation", "stimulus"]',
        `반드시 정확히 ${input.count}문항만 생성하십시오.`,
        `요청된 문제 유형은 "${selectionValue}"입니다. 다른 유형의 형식을 섞지 마십시오.`,
        '- [CRITICAL] "stimulus" 필드는 수능 영어의 "주어진 문장", 국어의 "<보기>", 수학의 복잡한 조건 등을 담는 용도로 사용하십시오. 필요 없는 경우 null로 설정하십시오.',
        '- [CRITICAL] "answer" 필드의 텍스트는 반드시 "choices" 배열의 값 중 하나와 토씨 하나 틀리지 않고 100% 일치해야 합니다.',
        '- [CRITICAL] 한국어 발문과 영어 지문 사이에는 반드시 두 번의 줄바꿈(\\n\\n)을 넣어 구분하십시오.',
    ];
    const typeRules = [
        ...buildEnglishTypePromptRules(input, true),
        ...buildKoreanPassageRules(input.subject),
        ...(isMathSubject(input.subject) ? buildMathPromptRules() : []),
    ];
    return [
        ...basePrompt,
        ...typeRules,
        '',
        `영역: ${rules.subjectLabel}`,
        `문항 성격: ${selectionValue}`,
        `난이도: ${input.difficulty} (최신 수능 경향 반영)`,
        `문항 수: ${input.count}`,
        '',
        ...rules.combinedConstraints.map((rule) => `- ${rule}`),
        '- [발문] "가장 적절한 것은?", "적절하지 않은 것은?"과 같은 평가원 표준 발문을 사용하십시오.',
        '- [수식] 모든 수학적 표현은 반드시 LaTeX를 사용하며, \\\\( 와 \\\\) 로 감싸십시오.',
        '- [밑줄] 밑줄이 필요한 경우 <u>와 </u> 태그를 사용하십시오.',
        '- [해설] 정답의 논리적 도출 과정과 오답 매력도 분석을 포함하십시오.',
        '',
        buildFeedbackBlock(input.validationFeedback),
        '',
        input.images && input.images.length > 0 ? '[수능 특화 OCR 분석] 이미지를 분석하여 데이터 누락을 보완하고 구조를 활용하십시오.' : '',
        '',
        buildSourceMaterialBlock(input),
    ].join('\n');
}
function isEnglishQuestionTypeSafe(questionTypeValue, target) {
    const questionType = String(questionTypeValue ?? '').trim();
    if (!questionType) {
        return false;
    }
    if (questionType === target || questionType === '\uC804\uCCB4') {
        return true;
    }
    if (target === '\uC694\uC9C0/\uC8FC\uC81C/\uC81C\uBAA9') {
        return (questionType.includes('\uC694\uC9C0') ||
            questionType.includes('\uC8FC\uC81C') ||
            questionType.includes('\uC81C\uBAA9'));
    }
    if (target === '\uC5B4\uBC95/\uC5B4\uD718') {
        return (questionType.includes('\uC5B4\uBC95') ||
            questionType.includes('\uC5B4\uD718') ||
            questionType.includes('\uBB38\uBC95'));
    }
    return false;
}
function buildEnglishIrrelevantStrictPrompt(input, isCsatMode) {
    const rules = getGenerationRules({
        subject: input.subject,
        selectionLabel: '문제유형',
        selectionValue: input.questionType ?? '관계없는 문장',
        difficulty: input.difficulty,
        schoolLevel: isCsatMode ? 'csat' : input.schoolLevel,
    });
    return [
        isCsatMode
            ? '당신은 대한민국 수능 영어 "관계없는 문장" 문항만 전문적으로 출제하는 평가원 스타일 출제 위원입니다.'
            : '당신은 고등학교 영어 "관계없는 문장" 문항만 전문적으로 출제하는 출제자입니다.',
        '반드시 JSON 배열만 반환하십시오.',
        `반드시 정확히 ${input.count}개 문항만 생성하십시오.`,
        '이 요청은 오직 "관계없는 문장" 유형입니다. 다른 유형으로 바꾸지 마십시오.',
        '각 문항은 반드시 다음 키만 포함해야 합니다: ["topic","type","stem","passage","choices","answer","explanation"]',
        '',
        '- [HARD FORMAT LOCK] stem에는 한국어 발문만 넣으십시오. 예: "다음 글에서 전체 흐름과 관계없는 문장은?"',
        '- [HARD FORMAT LOCK] passage에는 반드시 (1), (2), (3), (4), (5)로 번호가 매겨진 5개의 영어 문장을 넣으십시오.',
        '- [HARD FORMAT LOCK] passage의 5개 문장은 하나의 일관된 주제를 다루되, 정확히 1개만 흐름에서 벗어나야 합니다.',
        '- [HARD FORMAT LOCK] 각 문장은 최소 15단어 이상의 완전한 영어 문장이어야 합니다.',
        '- [HARD FORMAT LOCK] choices는 반드시 ["(1)","(2)","(3)","(4)","(5)"] 여야 합니다.',
        '- [HARD FORMAT LOCK] answer는 반드시 "(1)","(2)","(3)","(4)","(5)" 중 하나여야 합니다.',
        '- [HARD FORMAT LOCK] stimulus는 사용하지 마십시오 (null 또는 생략).',
        '',
        '- [EXAMPLE JSON]',
        '[',
        '  {',
        '    "topic": "Ecosystem and Forests",',
        '    "type": "multiple",',
        '    "stem": "다음 글에서 전체 흐름과 관계없는 문장은?",',
        '    "passage": "(1) Forests play a vital role in absorbing carbon dioxide from the atmosphere. (2) Trees convert sunlight into energy through the process of photosynthesis. (3) The price of lumber has risen sharply in international markets this year. (4) Healthy forests support biodiversity by providing habitats for countless species. (5) Deforestation accelerates climate change by releasing stored carbon back into the air.",',
        '    "choices": ["(1)","(2)","(3)","(4)","(5)"],',
        '    "answer": "(3)",',
        '    "explanation": "(3)은 목재 가격이라는 경제적 내용으로, 숲의 생태적 역할이라는 전체 흐름과 관계없다."',
        '  }',
        ']',
        '',
        ...rules.combinedConstraints.map((rule) => `- ${rule}`),
        '',
        buildFeedbackBlock(input.validationFeedback),
        '',
        buildSourceMaterialBlock(input),
    ].join('\n');
}
export function buildQuestionPrompt(input, builderMode) {
    if (builderMode === 'summary') {
        return buildSummaryPrompt(input);
    }
    if (isEnglishQuestionTypeSafe(input.questionType, '\uC694\uC57D\uBB38 \uC644\uC131')) {
        return buildEnglishSummaryStrictPrompt(input, builderMode === 'csat');
    }
    if (isEnglishQuestionTypeSafe(input.questionType, '\uBB38\uC7A5 \uC0BD\uC785')) {
        return buildEnglishInsertionStrictPrompt(input, builderMode === 'csat');
    }
    if (isEnglishQuestionTypeSafe(input.questionType, '\uC21C\uC11C \uBC30\uC5F4')) {
        return buildEnglishOrderStrictArrayPrompt(input, builderMode === 'csat');
    }
    if (isEnglishQuestionTypeSafe(input.questionType, '\uAD00\uACC4\uC5C6\uB294 \uBB38\uC7A5')) {
        return buildEnglishIrrelevantStrictPrompt(input, builderMode === 'csat');
    }
    if (isEnglishQuestionType(input, '요약문 완성')) {
        return buildEnglishSummaryStrictPrompt(input, builderMode === 'csat');
    }
    if (isEnglishQuestionType(input, '문장 삽입')) {
        return buildEnglishInsertionStrictPrompt(input, builderMode === 'csat');
    }
    if (isEnglishQuestionType(input, '관계없는 문장')) {
        return buildEnglishIrrelevantStrictPrompt(input, builderMode === 'csat');
    }
    if (isEnglishQuestionType(input, '순서 배열')) {
        return buildEnglishOrderStrictArrayPrompt(input, builderMode === 'csat');
    }
    if (builderMode === 'csat' && input.subject === 'korean_literature') {
        return buildCsatKoreanLiteratureSetPrompt(input);
    }
    if (builderMode === 'csat') {
        return buildCsatPrompt(input);
    }
    if (usesNoSelector(input.subject)) {
        return buildHistoryPrompt(input);
    }
    return buildGenericPrompt(input);
}
