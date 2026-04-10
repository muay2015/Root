import { getGenerationRules, type DifficultyLevel, type SchoolLevel } from './generationRules.ts';
import {
  getSubjectQuestionTypeMixTargets,
  usesNoSelector,
  type SubjectKey,
} from './subjectConfig.ts';

export type PromptBuildInput = {
  materialText: string;
  title?: string;
  topic?: string;
  count: number;
  subject: SubjectKey;
  questionType?: string;
  format?: string;
  difficulty: DifficultyLevel;
  schoolLevel: SchoolLevel;
  validationFeedback?: string[];
  images?: { mimeType: string; data: string }[];
};

function buildFeedbackBlock(validationFeedback?: string[]) {
  if (!validationFeedback || validationFeedback.length === 0) {
    return 'No previous validation failures.';
  }

  return [
    'Previous validation failures that must be fixed in this generation:',
    ...validationFeedback.map((reason, index) => `${index + 1}. ${reason}`),
  ].join('\n');
}

function isSocialSubject(subject: SubjectKey): boolean {
  if (!subject) return false;
  const s = subject.toString();
  return (
    (s || '').includes('social') ||
    (s || '').includes('geography') ||
    (s || '').includes('economics') ||
    (s || '').includes('politics') ||
    (s || '').includes('ethics') ||
    (s || '').includes('social_culture') ||
    (s || '').includes('living_ethics') ||
    (s || '').includes('ethics_thought')
  );
}

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
  const isType = (t: string) =>
    input.questionType === t ||
    input.questionType === '전체' ||
    (t === '요지/주제/제목' && (input.questionType?.includes('요지') || input.questionType?.includes('주제') || input.questionType?.includes('제목'))) ||
    (t === '어법/어휘' && (input.questionType?.includes('어법') || input.questionType?.includes('어휘') || input.questionType?.includes('문법')));
  const typeRules: string[] = [];

  if (input.subject.toLowerCase().includes('english')) {
    typeRules.push(
      '- [CRITICAL] ALWAYS separate the Korean instruction (e.g., "다음 글의 제목으로...") and the English passage content with at least TWO newlines (\\n\\n) in the "stem" field.',
      '- [CRITICAL] Identify the specific TYPE of each question and follow its rules strictly. NEVER mix "Summary" formatting with "Vocabulary/Grammar" types.',
      '- [VARIETY/RATIO] 10문항 이상 생성 시, 어법(Grammar) 최소 3문제, 어휘(Vocabulary/낱말의 쓰임) 최소 3문제, 빈칸 추론 최소 2문제를 반드시 포함하십시오.',
      '- [RATIO] "어법/어휘" 유형이 포함될 경우, 어법(Grammar)과 어휘(Vocabulary) 문항의 비율은 반드시 50:50으로 유지하십시오.'
    );

  }



  if (isType('심경/분위기')) {

    typeRules.push(
      '- [CRITICAL] For "심경/분위기" question type, all choices must be in English only.',
      '- [CRITICAL] For "심경" items, ask about a named character\'s emotional change in Korean stem form, such as "다음 글에 드러난 Sophie의 심경 변화로 가장 적절한 것은?". Choices must be in "word_A / word_B" format (e.g. "anxious / relieved").',
      '- [CRITICAL] For "분위기" items, every choice must be a single English atmosphere adjective or phrase (e.g. "somber"). Do NOT use "word_A / word_B" pairs for atmosphere.'
    );
  }

  if (isType('내용 일치')) {
    typeRules.push(
      '- [CRITICAL] For "내용 일치" question type, put the instruction and English passage together in the "stem" field only. Set "stimulus" to null.',
      '- [CRITICAL] For "내용 일치" question type, the 5 choices within a single question must all be in the SAME language (either all Korean OR all English). Assign choice language by index: 1st, 3rd, 5th -> Korean; 2nd, 4th -> English.',
      '- [ABSOLUTE PROHIBITION] When the question type is "내용 일치", you MUST NOT generate any other question type.'
    );
  } else if (input.questionType !== '전체') {
    typeRules.push('- [ABSOLUTE PROHIBITION] Do NOT generate content-matching (일치/불일치) questions if the requested type is different.');
  }

  if (isType('요약문 완성')) {
    typeRules.push(
      '- [CRITICAL] For "요약문 완성" question type, place the full English passage in "stem". In the "stimulus" field, place exactly one English summary sentence containing "(A)_______" and "(B)_______" blanks.',
      '- [CRITICAL] For "요약문 완성", the 5 choices must each follow the format "word_for_A / word_for_B" (e.g. "intentional / advanced").'
    );
  }

  if (isType('요지/주제/제목')) {
    typeRules.push(
      '- [CRITICAL] For "요지/주제/제목" question types, each choice must be a single phrase or sentence representing the core message.',
      '- [CRITICAL] You MUST include the full English passage in the "stem" field along with the Korean instruction (e.g., "다음 글의 제목으로 가장 적절한 것은?"). Do not omit the passage or put it in stimulus.',
      '- [ABSOLUTE PROHIBITION] NEVER use <u> tags or underlines in the passage for "요지/주제/제목" types. Keep the passage as clean text.',
      '- [ABSOLUTE PROHIBITION] NEVER use the "word_A / word_B" or "A / B" format (e.g. "intentional / advanced") for Title/Theme/Gist types. Each choice must be one single, clean string.',

      '- [Example for Title choices]: "The Hidden Power of Social Connections" (Correct), "Positive / Negative" (Incorrect)'
    );
  }

  if (isType('빈칸 추론')) {
    typeRules.push(
      '- [TYPE: 빈칸 추론] This type asks students to fill in a blank in the passage.',
      '- [CRITICAL] 지문 내의 빈칸은 반드시 "_________" (언더바 9자)로 표시하십시오. 번호나 알파벳(A) 등을 넣지 마십시오.',
      '- [POSITION] Place the blank in the middle portion of the passage, not in the final sentence or ending clause.',
      '- [POSITION] Prefer a key idea sentence around the middle of the passage rather than the conclusion.',
      '- [ABSOLUTE PROHIBITION] NEVER use <u> tags or numbered underlines in this type. Underlines are ONLY for grammar/vocabulary questions.',
      '- [Standard Stem]: "다음 빈칸에 들어갈 말로 가장 적절한 것은?"',
      '- [Choices]: 각 선택지는 명사구 또는 절 형태의 완전한 의미를 갖는 표현이어야 합니다. 한두 단어로 너무 짧게 구성하지 마십시오.'
    );
  }

  if (isType('빈칸 추론')) {
    typeRules.push(
      '- [TYPE: 빈칸 추론] This type asks students to infer the best phrase for one blank inside the passage.',
      '- [CRITICAL] Use exactly one visible blank in the passage, written as "_________". Do not use (A), [A], or numbered blank labels.',
      '- [POSITION] Place the blank in the middle portion of the passage.',
      '- [POSITION] Do not place the blank in the final sentence, concluding sentence, or ending clause.',
      '- [POSITION] Prefer a key reasoning sentence before the conclusion, similar to standard CSAT blank inference items.',
      '- [ABSOLUTE PROHIBITION] Never use <u> tags or grammar-style underlines in this type.'
    );
  }

  if (isType('어법/어휘')) {
    typeRules.push(
      '- [TYPE: 어법/어휘] This type is about vocabulary usage/grammar within the passage. NO (A)/(B) boxes.',
      '- [RATIO] You MUST generate Grammar(어법) and Vocabulary(어휘/낱말의 쓰임) questions in a 50:50 ratio.',
      '- [CRITICAL] 각 선택지(choices)는 반드시 해당 지문의 밑줄 부분에 대응하는 **순수 단어 또는 짧은 구(최대 3단어)**여야 합니다.',
      '- [ABSOLUTE PROHIBITION] NEVER include HTML tags like <u> or </u> within the choice strings. Prohibit sentence fragments or continuing sentences in choices.',
      '- [CRITICAL] Ensure the passage (stem) contains exactly five numbered underlines using the format ① <u>word</u> to ⑤ <u>word</u>.',
      '- [Standard Stems]: Use "다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?" for vocabulary, or "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?" for grammar.',
      '- [Example]: "He was ① <u>interested</u> in the show..." (Underline the word and place the number BEFORE it)'
    );
  }









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
    'Source material:',
    input.materialText,
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
    '입력 자료:',
    input.materialText,
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
    'Source material:',
    input.materialText,
  ].join('\n');
}

function buildCsatPrompt(input: PromptBuildInput) {
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
    '- [CRITICAL] "stimulus" 필드는 수능 영어의 "주어진 문장", 국어의 "<보기>", 수학의 복잡한 조건 등을 담는 용도로 사용하십시오. 필요 없는 경우 null로 설정하십시오.',
    '- [CRITICAL] "answer" 필드의 텍스트는 반드시 "choices" 배열의 값 중 하나와 토씨 하나 틀리지 않고 100% 일치해야 합니다.',
    '- [CRITICAL] 한국어 발문과 영어 지문 사이에는 반드시 두 번의 줄바꿈(\\n\\n)을 넣어 구분하십시오.',
  ];


  // 영어 수능 유형별 특화 규칙
  const isType = (t: string) =>
    input.questionType === t ||
    input.questionType === '전체' ||
    (t === '요지/주제/제목' && (input.questionType?.includes('요지') || input.questionType?.includes('주제') || input.questionType?.includes('제목'))) ||
    (t === '어법/어휘' && (input.questionType?.includes('어법') || input.questionType?.includes('어휘') || input.questionType?.includes('문법')));
  const typeRules: string[] = [];


  if (isType('문장 삽입')) {
    typeRules.push(
      '- [CRITICAL] "문장 삽입" 유형의 경우, 정답 문장을 지문(stem)에서 빼서 반드시 stimulus 필드에 넣으십시오. 지문(stem)에는 ①~⑤ 번호만 인라인으로 남겨두어야 합니다.',
      '- [CRITICAL] "문장 삽입"의 "choices" 필드는 반드시 ["①", "②", "③", "④", "⑤"]와 같이 번호만 포함해야 합니다.'
    );
  }

  if (isType('순서 배열')) {
    typeRules.push(
      '- [CRITICAL] "순서 배열" 유형의 경우, stimulus에는 반드시 (A) 이전의 영어 도입부 글을 넣고 stem에는 (A), (B), (C) 세 단락만 포함하십시오. (D) 이상의 추가 단락은 절대로 만들지 마십시오.'
    );
  }

  if (isType('내용 일치')) {
    typeRules.push(
      '- [CRITICAL] "내용 일치" 유형의 경우, 발문과 영어 지문을 모두 "stem" 필드에 담고 "stimulus"는 null로 설정하십시오.',
      '- [CRITICAL] "내용 일치" 2문항 이상 생성 시, 홀수 번째 문항은 한국어 선택지, 짝수 번째 문항은 영어 선택지로 출제하십시오.',
      '- [절대 금지] 문제유형이 "내용 일치"로 지정된 경우, 다른 유형을 생성하지 마십시오.'
    );
  } else if (input.questionType !== '전체') {
    typeRules.push('- [절대 금지] 지정된 유형이 "내용 일치"가 아닌 경우, 일치/불일치 문항을 생성하지 마십시오.');
  }

  if (isType('요지/주제/제목')) {
    typeRules.push(
      '- [CRITICAL] 영어 "요지/주제/제목" 유형의 경우, 글 전체의 핵심 주장이나 주제를 선지로 구성해야 합니다.',
      '- [CRITICAL] 반드시 지문 내용을 포함한 전체 영어 텍스트를 "stem" 필드에 담으십시오. 한국어 발문(예: "다음 글의 제목으로 가장 적절한 것은?")과 지문이 한 필드에 함께 포함되어야 합니다.',
      '- [절대 금지] "요지/주제/제목" 유형 지문에는 <u> 태그나 밑줄을 절대 사용하지 마십시오. 순수 텍스트로만 구성해야 합니다.',
      '- [절대 금지] 선택지에 "A / B" 형식(슬래시 구분) 또는 (A), (B) 기호를 절대 사용하지 마십시오. 각 선택지는 반드시 하나의 완성된 영어 구(phrase) 또는 문장이어야 합니다.',

      '- [예시]: 제목 선택지로는 "The Paradox of Modern Innovation"과 같이 하나의 완성된 구를 사용해야 하며, "Effective / Ineffective"와 같은 대조형이나 슬래시 형식을 절대 사용하지 마십시오.'
    );
  }


  if (isType('요약문 완성')) {
    typeRules.push(
      '- [CRITICAL] "요약문 완성" 유형의 경우, stimulus 필드에 "(A)_______"와 "(B)_______" 빈칸이 포함된 영어 요약 문장 한 개만 담으십시오.',
      '- [CRITICAL] "choices" 필드의 5개 선택지는 반드시 "word_for_A / word_for_B" 형식이어야 합니다.'
    );
  }

  if (isType('어법/어휘')) {
    typeRules.push(
      '- [유형: 어법/어휘] 이 문항은 지문 내 밑줄 친 부분의 적절성을 묻는 유형입니다. (요약문 아님)',
      '- [비율 강제] 반드시 어법(Grammar) 문항과 어휘(Vocabulary) 문항을 50:50 비율로 섞어서 생성하십시오.',
      '- [선지 구성 규칙] 각 선택지(choices)는 반드시 밑줄 친 부분의 **순수 단어 또는 짧은 표현(최대 3단어)**이어야 합니다.',
      '- [절대 금지] 선택지 내에 <u>, </u> 등 HTML 태그를 포함하지 마십시오. 문장의 나머지 부분을 선택지에 넣지 마십시오.',
      '- [CRITICAL] 반드시 지문 내에 ① <u>단어</u> ~ ⑤ <u>단어</u> 형식의 5개 밑줄을 포함하십시오.',
      '- [표준 발문]: "다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?" 또는 "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?"',
      '- [예시]: "He was ① <u>interested</u> in the show..."와 같이 지문 내에 번호와 밑줄을 삽입하십시오.'
    );
  }








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
    '[제시 자료]',
    input.materialText,
  ].join('\n');
}

export function buildQuestionPrompt(input: PromptBuildInput & { images?: { mimeType: string; data: string }[] }, builderMode?: string) {
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
