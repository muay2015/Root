import { SUBJECT_CONFIG, type SubjectKey } from './subjectConfig.ts';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type SchoolLevel = 'middle' | 'high' | 'csat';

export type DifficultyRule = {
  label: string;
  promptRules: string[];
};

export type SchoolLevelRule = {
  label: string;
  promptRules: string[];
};

export type SubjectRule = {
  objective: string;
  contentScope: string;
  evidenceStyle: string;
  stemGuidance: string[];
  choiceGuidance: string[];
  explanationGuidance: string[];
};

export type GenerationRuleBundle = {
  subject: SubjectKey;
  subjectLabel: string;
  selectionLabel?: string;
  selectionValue?: string;
  difficulty: DifficultyRule;
  schoolLevel: SchoolLevelRule;
  subjectRule: SubjectRule;
  combinedConstraints: string[];
};

export const difficultyRules: Record<DifficultyLevel, DifficultyRule> = {
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

export const schoolLevelRules: Record<SchoolLevel, SchoolLevelRule> = {
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

const defaultSubjectRule: SubjectRule = {
  objective: 'Generate high-quality assessment items.',
  contentScope: 'Curriculum-aligned facts, concepts, and principles.',
  evidenceStyle: 'Textual, logical, or quantitative evidence from the curriculum.',
  stemGuidance: ['Ensure the question is clear and professionally phrased.'],
  choiceGuidance: ['Provide plausible alternatives to ensure validity.'],
  explanationGuidance: ['Explain the logical reasoning for the correct choice.'],
};

const subjectRules: Partial<Record<SubjectKey, SubjectRule>> = {
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
  // ... (기타 과목 규칙들은 필요 시 순차적으로 확장)
};

export function getGenerationRules(input: {
  subject: SubjectKey;
  selectionLabel?: string;
  selectionValue?: string;
  difficulty: DifficultyLevel;
  schoolLevel: SchoolLevel;
}): GenerationRuleBundle {
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
