import { getGenerationRules, type DifficultyLevel, type SchoolLevel } from './generationRules';
import { getSubjectQuestionTypeMixTargets, usesNoSelector, type SubjectKey } from './subjectConfig';
import { type PromptBuildInput, buildFeedbackBlock, buildSourceMaterialBlock } from './prompts/core';
import {
  isEnglishSubject,
  isEnglishQuestionType,
  isEnglishQuestionTypeSafe,
  buildEnglishTypePromptRules,
  buildEnglishOrderStrictPrompt,
  buildEnglishOrderStrictArrayPrompt,
  buildEnglishSummaryStrictPrompt,
  buildEnglishInsertionStrictPrompt,
  buildEnglishIrrelevantStrictPrompt,
  buildEnglishGrammarStrictPrompt
} from './prompts/english';
import { buildCsatKoreanLiteratureRules, buildKoreanPassageRules, buildCsatKoreanLiteratureSetPrompt } from './prompts/korean';
import { isScienceSubject, isMiddleScienceSubject, buildSciencePromptRules, buildMiddleSciencePromptRules } from './prompts/science';
import { isMathSubject, isMiddleMathSubject, buildMathPromptRules, buildMiddleMathPromptRules, buildCsatMathPrompt } from './prompts/math';
import { isSocialSubject } from './prompts/social';

function buildGenericPrompt(input: PromptBuildInput) {
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

  const mixedTypeRules =
    input.questionType === '전체'
      ? [
          `Distribute ${input.count} questions as evenly as possible across these subtypes: ${getSubjectQuestionTypeMixTargets(input.subject).join(', ')}.`,
          'Do not concentrate most questions in one subtype.',
          'If the count is not divisible evenly, distribute the remainder from the front of the subtype list.',
        ]
      : [];

  const needsDiagramSpec = isMathSubject(input.subject) || isScienceSubject(input.subject);
  const diagramRule = needsDiagramSpec
    ? '- "diagram_svg": null by default. Generate inline SVG only when spatial layout is ESSENTIAL (positions, directions, connections). viewBox="0 0 360 260" width="100%" style="max-width:360px;display:block"; stroke="#222" stroke-width="1.5" fill="none"; no answer-revealing elements; do not highlight intersection or tangent points.'
    : '- "diagram_svg": Set to null.';

  const explanationRule = input.difficulty === 'hard'
    ? '- "explanation": 정답 근거와 주요 오답 이유를 3문장 이내로 작성하십시오.'
    : '- "explanation": 정답 이유를 1~2문장(40자 이내)으로 간결하게 작성하십시오.';

  const basePrompt = [
    'You are generating school exam questions.',
    'Return only a JSON array.',
    'Each item must contain exactly these keys:',
    '["topic", "type", "stem", "choices", "answer", "explanation", "stimulus", "diagram_svg"]',
    'Use "type" = "multiple".',
    'choices must contain exactly 5 strings.',
    '- "stimulus": Use this field to provide additional material (e.g., a "Given Sentence" box for English sentence insertion, a <보기> block, or complex math/science conditions). If not needed, set to null.',
    diagramRule,
    explanationRule,
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
      ? isEnglishSubject(input.subject)
        ? '- [CRITICAL] For "hard" difficulty in English, use standard and natural CSAT-style stems (e.g., "다음 글의 주제로 가장 적절한 것은?") but ensure the passage, vocabulary, and distractor quality are highly challenging.'
        : '- [CRITICAL] Since the difficulty is "hard", you MUST write a longer, descriptive, and analytic stem. In Korean, use either at least 8 words or at least about 18 Korean characters of reasoning-rich text.'
      : '',

    '- Reflect the provided title and topic directly when they exist.',
    '- Use the source material as the factual basis.',
    '- Do not output duplicate stems or near-duplicate choices.',
  ];

  const typeRules = [
    ...buildEnglishTypePromptRules(input, false),
    ...buildKoreanPassageRules(input.subject),
    ...buildCsatKoreanLiteratureRules(input),
    ...(isMiddleScienceSubject(input.subject)
      ? buildMiddleSciencePromptRules()
      : isScienceSubject(input.subject)
        ? buildSciencePromptRules()
        : []),
    ...(isMiddleMathSubject(input.subject)
      ? buildMiddleMathPromptRules()
      : isMathSubject(input.subject)
        ? buildMathPromptRules()
        : []),
  ];

  const mathFormatRules = isMiddleMathSubject(input.subject)
    ? [
        '- [CRITICAL] 이 문제는 중등 수학입니다. LaTeX를 절대 사용하지 마십시오. 백슬래시(\\)와 중괄호({})가 포함된 표현은 화면에 깨져 표시됩니다. 모든 수식은 유니코드 기호(∠, °, √, π, ², ³ 등)와 일반 텍스트로만 표현하십시오.',
      ]
    : [
        '- [CRITICAL] 모든 수학 기호와 수식은 반드시 LaTeX 형식을 사용하십시오. 수식은 반드시 \\( 와 \\) 기호로 감싸야 합니다.',
        '- [CRITICAL] JSON 결과물 내의 모든 LaTeX 명령어와 구분자는 반드시 이중 역슬래시(\\ )를 사용해야 합니다.',
      ];

  return [
    ...basePrompt,
    ...typeRules,
    '',
    ...mathFormatRules,
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

function buildHistoryPrompt(input: PromptBuildInput) {
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

export function buildSummaryPrompt(input: PromptBuildInput) {
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

function buildCsatPrompt(input: PromptBuildInput) {
  const selectionValue = (isSocialSubject(input.subject) || input.subject.toString().startsWith('history_'))
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
    'JSON의 각 항목은 다음 키를 반드시 포함해야 합니다: ["topic", "type", "stem", "choices", "answer", "explanation", "stimulus", "diagram_svg"]',
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
    '- [수식] 모든 수학적 표현은 반드시 LaTeX를 사용하며, \\( 와 \\) 로 감싸십시오.',
    '- [밑줄] 밑줄이 필요한 경우 <u>와 </u> 태그를 사용하십시오.',
    '- [해설] 정답 근거와 주요 오답 이유를 3문장 이내로 작성하십시오.',
    '',
    buildFeedbackBlock(input.validationFeedback),
    '',
    input.images && input.images.length > 0 ? '[수능 특화 OCR 분석] 이미지를 분석하여 데이터 누락을 보완하고 구조를 활용하십시오.' : '',
    '',
    buildSourceMaterialBlock(input),
  ].join('\n');
}

export function buildQuestionPrompt(input: PromptBuildInput & { images?: { mimeType: string; data: string }[] }, builderMode?: string) {
  if (builderMode === 'summary') {
    return buildSummaryPrompt(input);
  }

  if (isEnglishQuestionTypeSafe(input.questionType, '요약문 완성', input.subject)) {
    return buildEnglishSummaryStrictPrompt(input, builderMode === 'csat');
  }

  if (isEnglishQuestionTypeSafe(input.questionType, '문장 삽입', input.subject)) {
    return buildEnglishInsertionStrictPrompt(input, builderMode === 'csat');
  }

  if (isEnglishQuestionTypeSafe(input.questionType, '순서 배열', input.subject)) {
    return buildEnglishOrderStrictArrayPrompt(input, builderMode === 'csat');
  }

  if (isEnglishQuestionTypeSafe(input.questionType, '관계없는 문장', input.subject)) {
    return buildEnglishIrrelevantStrictPrompt(input, builderMode === 'csat');
  }

  if (isEnglishQuestionTypeSafe(input.questionType, '어법/어휘', input.subject)) {
    return buildEnglishGrammarStrictPrompt(input, builderMode === 'csat');
  }

  if (isEnglishQuestionType(input as any, '요약문 완성')) {
    return buildEnglishSummaryStrictPrompt(input, builderMode === 'csat');
  }

  if (isEnglishQuestionType(input as any, '문장 삽입')) {
    return buildEnglishInsertionStrictPrompt(input, builderMode === 'csat');
  }

  if (isEnglishQuestionType(input as any, '관계없는 문장')) {
    return buildEnglishIrrelevantStrictPrompt(input, builderMode === 'csat');
  }

  if (isEnglishQuestionType(input as any, '어법/어휘')) {
    return buildEnglishGrammarStrictPrompt(input, builderMode === 'csat');
  }

  if (isEnglishQuestionType(input as any, '순서 배열')) {
    return buildEnglishOrderStrictArrayPrompt(input, builderMode === 'csat');
  }

  if (builderMode === 'csat' && input.subject === 'korean_literature') {
    return buildCsatKoreanLiteratureSetPrompt(input);
  }

  if (builderMode === 'csat' && isMathSubject(input.subject)) {
    return buildCsatMathPrompt(input);
  }

  if (builderMode === 'csat') {
    return buildCsatPrompt(input);
  }

  if (usesNoSelector(input.subject)) {
    return buildHistoryPrompt(input);
  }

  return buildGenericPrompt(input);
}
