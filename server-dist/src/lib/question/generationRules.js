import { SUBJECT_CONFIG } from "./subjectConfig.js";
export const difficultyRules = {
    easy: {
        label: 'Easy',
        promptRules: [
            'Use direct evidence and core textbook-level understanding.',
            'Keep the reasoning load light enough for a student with basic preparation.',
            'Use distractors that are plausible but clearly separable from the answer.',
        ],
    },
    medium: {
        label: 'Medium',
        promptRules: [
            'Require comparison, distinction, or two-step reasoning.',
            'Use at least two clues that must be combined.',
            'Make distractors similar enough that concept-level understanding is required.',
        ],
    },
    hard: {
        label: 'Hard',
        promptRules: [
            'Do not write direct recall questions whose answer is exposed by a single keyword.',
            'Require interpretation, comparison, causation, chronology, document reading, or policy-event linkage.',
            'Make at least two choices competitive until the final step of reasoning by using extremely plausible alternatives.',
            'Use strong distractors from the same period, institution class, or conceptual field to verify precise understanding.',
            '[CRITICAL] Stems MUST be analytic and require a minimum of 3 steps of logical deduction or interpretation of the given material.',
        ],
    },
};
export const schoolLevelRules = {
    middle: {
        label: 'Middle School',
        promptRules: [
            'Use middle-school textbook vocabulary and sentence length.',
            'Prefer highly recognizable curriculum concepts and standard classroom phrasing.',
            'Avoid overly complex academic jargon or convoluted high-school level logic.',
        ],
    },
    high: {
        label: 'High School',
        promptRules: [
            'Use high-school assessment wording and denser comparison.',
            'Allow more subtle distinctions across institutions, time periods, and policy outcomes.',
        ],
    },
    csat: {
        label: 'CSAT',
        promptRules: [
            'Use professional, assessment-grade academic vocabulary typical of Korean college entrance exams (수능/평가원 스타일).',
            'If the source material contains data, tables, or complex theory, frame the question around "evaluating validity", "inferring hidden logic", or "applying to a new scenario ( <보기> )".',
            'Strictly avoid "Correct/Incorrect" labels in stems; use "가장 적절한 것은?", "적절하지 않은 것은?" as standard phrasing.',
            'Require stable evidence tracking throughout the entire stem and passage.',
            'The explanation MUST justify the correct answer and explain why the most "attractive" distractor is wrong.',
        ],
    },
};
const defaultSubjectRule = {
    objective: 'Generate high-quality assessment items.',
    contentScope: 'Curriculum-aligned facts, concepts, and principles.',
    evidenceStyle: 'Textual, logical, or quantitative evidence from the curriculum.',
    stemGuidance: ['Ensure the question is clear and professionally phrased.'],
    choiceGuidance: ['Provide plausible alternatives to ensure validity.'],
    explanationGuidance: ['Explain the logical reasoning for the correct choice.'],
};
const subjectRules = {
    // --- 중등 전용 규칙 ---
    middle_korean: {
        objective: '중등 국어 문항 생성',
        contentScope: '중학교 국어 교과서 (독해, 문법 기초, 문학 기초)',
        evidenceStyle: '본문 텍스트 내의 직접적 근거',
        stemGuidance: ['중학교 수준의 어휘를 사용하고, 비문학의 경우 기본 독해력을 묻는 문항을 주함.', '문법은 품사, 문장 성분 등 기초 개념 중심으로 출제 요구.'],
        choiceGuidance: ['매력적인 오답을 만들되, 중등 수준을 벗어나는 지엽적 개념 배제.'],
        explanationGuidance: ['학생들이 이해하기 쉽게 교육적인 말투로 설명 제공.']
    },
    middle_math: {
        objective: '중등 수학 문항 생성',
        contentScope: '중학교 수학 (연산, 평면/공간도형 기초, 일차/이차방정식)',
        evidenceStyle: '수치 계산 및 기본 공식 적용',
        stemGuidance: ['문제의 조건(준 것)과 구해야 할 것을 명확히 구분하여 기술.', '중등 교육과정의 정의와 성질을 바탕으로 논리적 풀이 유도.'],
        choiceGuidance: ['흔히 발생하는 계산 실수나 개념 오해를 반영한 선지 구성.'],
        explanationGuidance: ['풀이 단계를 생략 없이 친절하게 설명.']
    },
    middle_english: {
        objective: '중등 영어 문항 생성',
        contentScope: '중학교 필수 어법, 기초 독해, 생활 회화',
        evidenceStyle: '본문 및 대화문 내의 언어적 단서',
        stemGuidance: ['중학교 교과서 수준의 구문과 어휘를 사용.', '대화문의 경우 상황 맥락에 맞는 표현을 찾도록 유도.'],
        choiceGuidance: ['유사한 스펠링이나 기초 문법 오류를 오답으로 활용.'],
        explanationGuidance: ['정답이 되는 주요 문법 포인트나 해석을 명확히 제시.']
    },
    high_english: {
        objective: '고난도 영어 독해 및 어법 문항 생성',
        contentScope: '고등학교 영어/영어I/영어II 교과서 및 수능 기출 수준의 외부 지문',
        evidenceStyle: '맥락적 추론, 논리적 연결성, 구문 분석',
        stemGuidance: [
            '요청된 영어 유형의 발문과 지문 형식을 정확히 유지하세요. 서로 다른 유형 형식을 섞지 마세요.',
            '영어 지문은 한 가지 핵심 평가 포인트로 수렴하도록 구성하고, 지문 내부 근거만으로 정답을 도출할 수 있게 하세요.',
            '밑줄 표시는 어법/어휘 유형에서만 사용하고, 다른 독해 유형에서는 불필요한 표시를 넣지 마세요.'
        ],
        choiceGuidance: [
            '선지는 해당 유형의 시험 관행에 맞는 형식만 사용하세요.',
            '매력적인 오답은 같은 논리 축 위에서 경쟁하게 만들고, 엉뚱한 오답은 피하세요.'
        ],
        explanationGuidance: ['글의 전체적인 흐름과 함께 결정적인 논리적 단서(지시어, 연결어 등)를 구체적으로 설명하세요.']
    },
    // --- 고등 전용 규칙 ---
    high_korean: {
        objective: '고등 국어(공통) 문항 생성',
        contentScope: '고등학교 국어 교과서 전 범위',
        evidenceStyle: '작품의 미적 구조 및 문법적 원리',
        stemGuidance: ['수능형 발문을 사용하되 고1~2 수준의 난이도 유지.', '문학 지문의 경우 내재적/외재적 접근법을 고루 활용.'],
        choiceGuidance: ['추론이 필요한 매력적 오답 구성.'],
        explanationGuidance: ['지문 내 근거와 개념적 연결 고리를 상세히 설명.']
    },
    high_math: {
        objective: '고등 수학(공통) 문항 생성',
        contentScope: '고등 수학 (다항식, 방정식, 부등식, 도형의 방정식, 집합, 명제, 함수)',
        evidenceStyle: '수학적 증명 및 복합 연산',
        stemGuidance: ['여러 개념이 융합된 문항을 출제하여 사고력 측정.', 'LaTeX을 활용하여 수식을 깔끔하게 표현.'],
        choiceGuidance: ['계산 실수가 아닌 개념적 오해를 유도하는 선지 구성.'],
        explanationGuidance: ['핵심 아이디어와 풀이 전략을 중심으로 설명.']
    },
    // --- 기존 전문 과목 규칙 (유지 및 고도화) ---
    korean_reading: {
        objective: '고난도 독서(비문학) 문항 생성',
        contentScope: '인문, 사회, 과학, 기술, 예술 복합 지문',
        evidenceStyle: '정보 확인, 비판적 이해, 추론',
        stemGuidance: ['지문 내의 핵심 정보 간의 관계나 관점의 차이를 묻는 문항을 출제하세요.', '고난도의 경우 <보기>를 통한 사례 적용 문항 필수.'],
        choiceGuidance: ['지문에 제시되지 않은 정보나 논리적 비약을 포함시키세요.'],
        explanationGuidance: ['지문의 논리 구조와 매끄럽게 연결되는 해설 제공.']
    },
    math_calculus: {
        objective: '미적분 문항 생성',
        contentScope: '수열의 극한, 여러 가지 함수의 미분법/적분법',
        evidenceStyle: '초월함수의 미적분 연산 및 추론',
        stemGuidance: ['급수의 합이나 치환/부분적분 활용 문항을 출제하세요.', '함수의 그래프 개형을 추론하는 킬러 문항 스타일 선호.'],
        choiceGuidance: ['합성함수 미분법 누락이나 적분 상수 오해를 오답으로 구성.'],
        explanationGuidance: ['수리 논술 수준의 상세하고 논리적인 풀이 제공.']
    },
    // --- 과학 탐구 전용 규칙 ---
    physics_1: {
        objective: '물리학 I 문항 생성',
        contentScope: '고등학교 물리학 I (역학과 에너지, 물질과 전자기, 파동과 정보)',
        evidenceStyle: '물리 법칙, 공식, 그래프 및 현상 분석',
        stemGuidance: [
            '뉴턴 운동 법칙, 역학적 에너지 보존, 특수 상대성 이론 등을 한국어로 정교하게 다루세요.',
            '수치 계산 문항보다는 물리적 상황의 변화나 관계를 추론하는 문항을 선호합니다.',
            '모든 텍스트는 반드시 한국어로 작성하십시오. 영어 지문이나 영어 요약문 형식을 절대 사용하지 마십시오.'
        ],
        choiceGuidance: ['물리적 오개념(misconception)을 반영한 매력적인 오답을 구성하세요.'],
        explanationGuidance: ['물리 법칙의 적용 과정과 수식 유도 과정을 단계별로 설명하세요.']
    },
    chemistry_1: {
        objective: '화학 I 문항 생성',
        contentScope: '고등학교 화학 I (화학의 첫걸음, 원자의 구조, 결합과 분자, 역동적인 화학 반응)',
        evidenceStyle: '화학적 개념, 양적 관계, 화학 반응식 분석',
        stemGuidance: [
            '몰 농도, 원자의 주기적 성질, 산화 환원, 중화 반응 등을 한국어로 다루세요.',
            '모든 텍스트는 반드시 한국어로 작성하십시오. 영어 지문이나 영어 요약문 형식을 절대 사용하지 마십시오.'
        ],
        choiceGuidance: ['양적 관계 계산 실수나 기본 개념 혼동을 오답으로 활용하세요.'],
        explanationGuidance: ['화학 반응의 원리와 계산 단계를 명확히 제시하세요.']
    },
    biology_1: {
        objective: '생명과학 I 문항 생성',
        contentScope: '고등학교 생명과학 I (생명 활동, 항상성과 조절, 유전, 생태계)',
        evidenceStyle: '생명 현상 자료, 가계도, 그래프 해석',
        stemGuidance: [
            '항상성 유지, 유전 원리, 신경계 등을 한국어로 정교하게 출제하세요.',
            '모든 텍스트는 반드시 한국어로 작성하십시오. 영어 지문이나 영어 요약문 형식을 절대 사용하지 마십시오.'
        ],
        choiceGuidance: ['유전적 확률 계산이나 자료 해석 오류를 반영한 선지를 구성하세요.'],
        explanationGuidance: ['제시된 자료의 해석 로직과 유전 원리를 구체적으로 설명하세요.']
    },
    earth_science_1: {
        objective: '지구과학 I 문항 생성',
        contentScope: '고등학교 지구과학 I (고체 지구, 대기와 해양, 우주)',
        evidenceStyle: '지구과학적 자료, 연표, 위성 사진 분석',
        stemGuidance: [
            '판 구조론, 지구 기후 변화, 외계 행성 탐사 등을 한국어로 출제하세요.',
            '모든 텍스트는 반드시 한국어로 작성하십시오. 영어 지문이나 영어 요약문 형식을 절대 사용하지 마십시오.'
        ],
        choiceGuidance: ['자료 해석의 착오나 선입견을 이용한 오답을 만드세요.'],
        explanationGuidance: ['지구과학적 현상의 원인과 자료 분석법을 친절하게 설명하세요.']
    },
    // ... (기타 과목 규칙들은 필요 시 순차적으로 확장)
};
;
export function getGenerationRules(input) {
    const subjectConfig = SUBJECT_CONFIG[input.subject];
    const difficulty = difficultyRules[input.difficulty];
    const schoolLevel = schoolLevelRules[input.schoolLevel];
    // 과목 전용 규칙이 있으면 사용하고, 없으면 기본 정책 사용
    const subjectRule = subjectRules[input.subject] || defaultSubjectRule;
    return {
        subject: input.subject,
        subjectLabel: subjectConfig.label,
        selectionLabel: input.selectionLabel,
        selectionValue: input.selectionValue,
        difficulty,
        schoolLevel,
        subjectRule,
        combinedConstraints: [
            ...difficulty.promptRules.map((rule) => `Difficulty rule: ${rule}`),
            ...schoolLevel.promptRules.map((rule) => `School-level rule: ${rule}`),
            ...(input.selectionLabel && input.selectionValue
                ? [`${input.selectionLabel} rule: ${input.selectionValue}`]
                : []),
            ...subjectRule.stemGuidance.map((rule) => `Stem rule: ${rule}`),
            ...subjectRule.choiceGuidance.map((rule) => `Choice rule: ${rule}`),
            ...subjectRule.explanationGuidance.map((rule) => `Explanation rule: ${rule}`),
        ],
    };
}
