import { type PromptBuildInput, buildFeedbackBlock, buildSourceMaterialBlock, isMaterialMeta, sanitizeMaterialText } from './core';
import { getGenerationRules, type DifficultyLevel, type SchoolLevel } from '../generationRules';
import { type SubjectKey } from '../subjectConfig';

export function isEnglishSubject(subject: SubjectKey): boolean {
  return String(subject).toLowerCase().includes('english');
}

export function isEnglishQuestionType(input: PromptBuildInput, type: string) {
  return (
    input.questionType === type ||
    input.questionType === '전체' ||
    (type === '요지/주제/제목' &&
      (input.questionType?.includes('요지') ||
        input.questionType?.includes('주제') ||
        input.questionType?.includes('제목'))) ||
    (type === '어법/어휘' &&
      (input.questionType?.includes('어법') ||
        input.questionType?.includes('어휘') ||
        input.questionType?.includes('문법')))
  );
}

export function isEnglishQuestionTypeSafe(questionTypeValue: string | undefined, target: string) {
  const questionType = String(questionTypeValue ?? '').trim();
  if (!questionType) {
    return false;
  }
  if (questionType === target || questionType === '전체') {
    return true;
  }
  if (target === '요지/주제/제목') {
    return (
      questionType.includes('요지') ||
      questionType.includes('주제') ||
      questionType.includes('제목')
    );
  }
  if (target === '어법/어휘') {
    return (
      questionType.includes('어법') ||
      questionType.includes('어휘') ||
      questionType.includes('문법')
    );
  }
  return false;
}

export function buildEnglishOutputFormatRules(isCsatMode: boolean) {
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
    rules.push(
      '- [CSAT OUTPUT] 수능형 문항처럼 지문, 발문, 선지, 정답, 해설이 바로 식별되도록 구성하십시오.',
      '- [CSAT OUTPUT] 해설은 정답 근거와 대표 오답 한 개의 오류만 짧게 설명하십시오.'
    );
  }
  return rules;
}

export function buildBlankPrompt() {
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

export function buildSummaryCompletionPromptRules() {
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

export function buildGrammarPrompt() {
  return [
    '- [어법/어휘] 이 유형은 지문 속 밑줄 친 부분의 적절성을 묻는 유형입니다. 요약문 형식을 섞지 마십시오.',
    '- [어법/어휘] 지문에는 반드시 ① <u>word</u> ~ ⑤ <u>word</u> 형식의 번호 + 밑줄 표시를 사용하십시오.',
    '- [어법/어휘] 선택지는 반드시 밑줄 친 대상에 대응하는 순수 단어 또는 짧은 구(최대 3단어)만 사용하십시오.',
    '- [어법/어휘] 선택지 안에 <u> 태그나 문장 절을 넣지 마십시오.',
    '- [어법/어휘] 발문은 "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?" 또는 "문맥상 낱말의 쓰임이 적절하지 않은 것은?" 형태를 유지하십시오.',
    '- [어법/어휘] 어법 문항과 어휘 문항을 구분 가능하게 만들고, 같은 배치에서 둘 중 하나로만 쏠리지 않게 하십시오.',
  ];
}

export function buildMoodPrompt() {
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

export function buildInsertionPrompt() {
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

export function buildOrderPrompt() {
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

export function buildOddSentencePrompt() {
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

export function buildEnglishTypePromptRules(input: PromptBuildInput, isCsatMode: boolean) {
  if (!isEnglishSubject(input.subject)) {
    return [];
  }
  const rules = [
    ...buildEnglishOutputFormatRules(isCsatMode),
    '- [ENGLISH TYPE] 요청된 유형 규칙만 따르십시오. 서로 다른 유형의 형식을 섞지 마십시오.',
  ];
  if (input.questionType === '전체') {
    rules.push(
      '- [ENGLISH TYPE] 전체 생성 시에도 각 문항은 하나의 유형 규칙만 따르십시오.',
      '- [ENGLISH TYPE] 어법/어휘, 빈칸 추론, 문장 삽입, 순서 배열, 심경/분위기, 관계없는 문장, 요약문 완성의 형식을 혼동하지 마십시오.'
    );
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
    rules.push(
      '- [요지/주제/제목] 지문 전체는 stem에 넣고, 선택지는 핵심 메시지를 나타내는 단일 문구 또는 문장으로 구성하십시오.',
      '- [요지/주제/제목] <u> 밑줄, A / B 조합형, (A)/(B) 빈칸형 선택지를 쓰지 마십시오.'
    );
  }
  if (isEnglishQuestionType(input, '내용 일치')) {
    rules.push(
      '- [내용 일치] 지문과 발문은 모두 stem에 넣고 stimulus는 null로 두십시오.',
      '- [내용 일치] 다른 유형의 형식, 예를 들어 (A)(B), 삽입문, 순서 배열 구간 표시는 섞지 마십시오.'
    );
  }
  if (isCsatMode) {
    rules.push(
      '- [CSAT ENGLISH] 모든 영어 문항은 실제 수능 영어 독해처럼 평가 포인트가 하나로 선명해야 합니다.',
      '- [CSAT ENGLISH] 억지 오답보다 실제 시험처럼 매력적인 오답을 만들되, 정답 근거는 지문 내부에서 분명히 찾을 수 있어야 합니다.'
    );
  }
  return rules;
}

export function buildEnglishOrderStrictPrompt(input: PromptBuildInput, isCsatMode: boolean) {
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

export function buildEnglishOrderStrictArrayPrompt(input: PromptBuildInput, isCsatMode: boolean) {
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

export function buildEnglishSummaryStrictPrompt(input: PromptBuildInput, isCsatMode: boolean) {
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

export function buildEnglishInsertionStrictPrompt(input: PromptBuildInput, isCsatMode: boolean) {
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

export function buildEnglishIrrelevantStrictPrompt(input: PromptBuildInput, isCsatMode: boolean) {
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
