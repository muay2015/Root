import { 
  CANONICAL_IRRELEVANT_SENTENCE_CHOICES,
  isEnglishIrrelevantSentenceType,
  isEnglishOrderArrangementType,
  isEnglishContentMatchingType,
  isEnglishSummaryCompletionType,
  normalizeSummaryCompletionPairText
} from '../englishStandardizer.ts';
import type { GeneratedQuestionDraft, ValidationInput } from './types.ts';
import { pushReason, normalizeText } from './utils.ts';

/**
 * 순서 배열(Order Arrangement) 유형을 검증합니다.
 */
export function validateEnglishOrderArrangement(
  question: GeneratedQuestionDraft,
  index: number,
  input: ValidationInput,
  reasons: string[],
  issueCounts: Record<string, number>,
) {
  if (!isEnglishOrderArrangementType({ subject: input.subject, questionType: input.questionType })) {
    return;
  }

  const stem = question.stem ?? '';
  const stimulus = (question as any).stimulus ?? '';
  const hasA = /\(\s*A\s*\)|\[\s*A\s*\]/i.test(stem);
  const hasB = /\(\s*B\s*\)|\[\s*B\s*\]/i.test(stem);
  const hasC = /\(\s*C\s*\)|\[\s*C\s*\]/i.test(stem);
  const hasDOrMore = /\(\s*[D-Z]\s*\)|\[\s*[D-Z]\s*\]/i.test(stem);
  const hasStimulusIntro = typeof stimulus === 'string' && /[A-Za-z]{3,}/.test(stimulus);
  const stimulusHasSections = /\(\s*[A-Z]\s*\)|\[\s*[A-Z]\s*\]/i.test(stimulus);

  if (!(hasA && hasB && hasC)) {
    pushReason(reasons, issueCounts, 'english_order_sections', `Question ${index}: sentence ordering items must contain exactly (A), (B), and (C) sections.`);
  }
  if (hasDOrMore) {
    pushReason(reasons, issueCounts, 'english_order_extra_sections', `Question ${index}: sentence ordering items must not contain (D) or later sections.`);
  }
  if (!hasStimulusIntro) {
    pushReason(reasons, issueCounts, 'english_order_missing_intro', `Question ${index}: sentence ordering items must include an English intro in stimulus.`);
  }
  if (stimulusHasSections) {
    pushReason(reasons, issueCounts, 'english_order_intro_polluted', `Question ${index}: sentence ordering stimulus must contain only the intro, not (A)/(B)/(C) sections.`);
  }
}

export function validateEnglishSentenceInsertion(
  question: GeneratedQuestionDraft,
  index: number,
  input: ValidationInput,
  reasons: string[],
  issueCounts: Record<string, number>,
) {
  const questionType = String(input.questionType ?? '');
  const isTargetType =
    String(input.subject).toLowerCase().includes('english') &&
    questionType.includes('문장 삽입');

  if (!isTargetType) {
    return;
  }

  const stem = String(question.stem ?? '');
  const stimulus = String((question as any).stimulus ?? '').trim();
  const choices = Array.isArray(question.choices) ? question.choices : [];
  const numberedMatches = stem.match(/[①-⑤]|\(\s*[1-5]\s*\)/g) ?? [];
  const uniqueNumberedCount = new Set(numberedMatches.map((m) => m.replace(/\s+/g, ''))).size;
  const canonicalChoices = ['①', '②', '③', '④', '⑤'];
  const normalizedChoices = choices.map((choice) => normalizeText(String(choice ?? '')));

  if (!stimulus || !/[A-Za-z]{8,}/.test(stimulus)) {
    pushReason(
      reasons,
      issueCounts,
      'english_insertion_missing_stimulus',
      `Question ${index}: sentence insertion items must place the given sentence in stimulus.`,
    );
  }

  if (uniqueNumberedCount < 5) {
    pushReason(
      reasons,
      issueCounts,
      'english_insertion_missing_markers',
      `Question ${index}: sentence insertion items must contain five insertion markers in the passage.`,
    );
  }

  if (
    choices.length !== 5 ||
    !canonicalChoices.every((choice, idx) => normalizedChoices[idx] === normalizeText(choice))
  ) {
    pushReason(
      reasons,
      issueCounts,
      'english_insertion_noncanonical_choices',
      `Question ${index}: sentence insertion items must use canonical choices ① to ⑤ only.`,
    );
  }

  if (stimulus) {
    const compactStem = normalizeText(stem);
    const compactStimulus = normalizeText(stimulus);
    if (compactStimulus && compactStem.includes(compactStimulus)) {
      pushReason(
        reasons,
        issueCounts,
        'english_insertion_stimulus_duplicated',
        `Question ${index}: the given sentence must not also remain inside the passage.`,
      );
    }
  }

  if (/<[\/]?u\b|\[[\/]?u\]/i.test(stem)) {
    pushReason(
      reasons,
      issueCounts,
      'english_insertion_unnecessary_underline',
      `Question ${index}: sentence insertion passages must not contain underline tags.`,
    );
  }
}

export function validateEnglishBlankInference(
  question: GeneratedQuestionDraft,
  index: number,
  input: ValidationInput,
  reasons: string[],
  issueCounts: Record<string, number>,
) {
  const questionType = String(input.questionType ?? '');
  const isTargetType =
    String(input.subject).toLowerCase().includes('english') &&
    (questionType.includes('빈칸') || questionType.includes('추론'));

  if (!isTargetType) {
    return;
  }

  const stem = String(question.stem ?? '');
  const blankCount = (stem.match(/_{2,}|\(\s*\)/g) ?? []).length;
  const blankIndex = stem.search(/_{2,}|\(\s*\)/);
  const duplicatedInstructionPatterns = [
    /다음\s+빈칸에\s+들어갈\s+말(?:로)?\s+가장\s+적절한\s+것은\?/gi,
    /빈칸에\s+들어갈\s+말(?:로)?\s+가장\s+적절한\s+것은\?/gi,
    /what\s+is\s+the\s+most\s+appropriate\s+word\s+for\s+the\s+blank\?/gi,
  ];

  if (blankCount < 1) {
    pushReason(
      reasons,
      issueCounts,
      'english_blank_inference_missing_blank',
      `Question ${index}: blank inference items must contain a visible blank in the passage.`,
    );
  }

  if (blankCount > 1) {
    pushReason(
      reasons,
      issueCounts,
      'english_blank_inference_multiple_blanks',
      `Question ${index}: blank inference items must contain exactly one visible blank in the passage.`,
    );
  }

  if (blankIndex >= 0) {
    const blankRatio = stem.length > 0 ? blankIndex / stem.length : 0;
    const sentences = [...stem.matchAll(/([A-Za-z][^.!?]{20,}?[.!?])/g)];
    const lastSentence = sentences[sentences.length - 1];
    const blankInLastSentence =
      !!lastSentence &&
      blankIndex >= (lastSentence.index ?? stem.length);

    if (blankRatio > 0.8 || blankInLastSentence) {
      pushReason(
        reasons,
        issueCounts,
        'english_blank_inference_blank_too_late',
        `Question ${index}: blank inference items must place the blank in the middle portion of the passage, not at the end.`,
      );
    }
  }

  if (/<[\/]?u\b|\[[\/]?u\]/i.test(stem)) {
    pushReason(
      reasons,
      issueCounts,
      'english_blank_inference_unnecessary_underline',
      `Question ${index}: blank inference items must not contain underline tags.`,
    );
  }

  for (const pattern of duplicatedInstructionPatterns) {
    const matches = stem.match(pattern) ?? [];
    if (matches.length > 1) {
      pushReason(
        reasons,
        issueCounts,
        'english_blank_inference_instruction_duplicated',
        `Question ${index}: blank inference items must not repeat the instruction inside the passage.`,
      );
      break;
    }
  }

  if (/\b[A-E]\s+nutrition label can help|\.?\s*가장\s+적절한\s+것은\?\s*$/i.test(stem)) {
    pushReason(
      reasons,
      issueCounts,
      'english_blank_inference_instruction_polluted_passage',
      `Question ${index}: blank inference passage contains instruction text mixed into the passage.`,
    );
  }
}

/**
 * 관계없는 문장(Irrelevant Sentence) 유형을 검증합니다.
 */
export function validateEnglishIrrelevantSentence(
  question: GeneratedQuestionDraft,
  index: number,
  input: ValidationInput,
  reasons: string[],
  issueCounts: Record<string, number>,
) {
  if (!isEnglishIrrelevantSentenceType({ subject: input.subject, questionType: input.questionType, topic: question.topic, stem: question.stem })) {
    return;
  }

  const stem = String(question.stem ?? '');
  const stimulus = (question as any).stimulus;
  const choices = Array.isArray(question.choices) ? question.choices : [];
  const instructionOk = stem.includes('관계 없는 문장은?') || stem.includes('관계없는 문장은?') || /irrelevant to the overall flow\?/i.test(stem);
  const numberedMatches = stem.match(/\([1-5]\)/g) ?? [];
  const uniqueNumberedCount = new Set(numberedMatches).size;
  const canonicalChoices = choices.length === 5 && choices.every((choice, idx) => normalizeText(choice) === normalizeText(CANONICAL_IRRELEVANT_SENTENCE_CHOICES[idx]));
  const emptyStimulus = stimulus == null || String(stimulus).trim().length === 0;

  if (!instructionOk) {
    pushReason(reasons, issueCounts, 'english_irrelevant_instruction', `Question ${index}: irrelevant sentence items must ask for the sentence unrelated to the overall flow.`);
  }
  if (uniqueNumberedCount !== 5) {
    pushReason(reasons, issueCounts, 'english_irrelevant_numbered_passage', `Question ${index}: irrelevant sentence items must contain exactly five numbered sentences in the passage.`);
  }
  if (!canonicalChoices) {
    pushReason(reasons, issueCounts, 'english_irrelevant_choices', `Question ${index}: irrelevant sentence items must use canonical choices (1) through (5).`);
  }
  if (!emptyStimulus) {
    pushReason(reasons, issueCounts, 'english_irrelevant_stimulus', `Question ${index}: irrelevant sentence items must not use stimulus.`);
  }
}

/**
 * 내용 일치(Content Matching) 유형을 검증합니다.
 */
export function validateEnglishContentMatching(
  question: GeneratedQuestionDraft,
  index: number,
  input: ValidationInput,
  reasons: string[],
  issueCounts: Record<string, number>,
) {
  if (!isEnglishContentMatchingType({ subject: input.subject, questionType: input.questionType })) {
    return;
  }

  const stem = String(question.stem ?? '').replace(/<[^>]+>/g, '');
  const stimulus = String((question as any).stimulus ?? '').trim();

  // 다른 유형이 섞여 있는지 확인
  const isWrongType = stem.includes('관계 없는 문장') || stem.includes('주어진 문장이 들어가기에') || /\(\s*A\s*\)/.test(stem);
  if (isWrongType) {
    pushReason(reasons, issueCounts, 'content_match_wrong_type', `Question ${index}: "내용 일치" type must not generate other types.`);
  }

  const hasInstruction = stem.includes('일치하는 것은') || stem.includes('일치하지 않는 것은') || /consistent with the passage/i.test(stem);
  if (!hasInstruction) {
    pushReason(reasons, issueCounts, 'content_match_missing_instruction', `Question ${index}: "내용 일치" type must use a content-matching instruction.`);
  }
  if (stimulus) {
    pushReason(reasons, issueCounts, 'content_match_stimulus_forbidden', `Question ${index}: "내용 일치" type must keep the passage in "stem" only.`);
  }

  const choices = question.choices ?? [];
  const languageKinds = new Set(choices.map(c => {
    const text = String(c ?? '').trim();
    if (!text) return null;
    const hasKorean = /[\u3131-\u314e\uac00-\ud7a3]/u.test(text);
    const hasEnglish = /[A-Za-z]/.test(text);
    if (hasKorean && !hasEnglish) return 'ko';
    if (hasEnglish && !hasKorean) return 'en';
    return 'mixed';
  }).filter(Boolean));

  if (languageKinds.has('mixed') || (languageKinds.has('ko') && languageKinds.has('en'))) {
    pushReason(reasons, issueCounts, 'content_match_choice_language_mixed', `Question ${index}: "내용 일치" choices must be in a single language.`);
  }
}

/**
 * 요약문 완성(Summary Completion) 유형을 검증합니다.
 */
export function validateEnglishSummaryCompletion(
  question: GeneratedQuestionDraft,
  index: number,
  input: ValidationInput,
  reasons: string[],
  issueCounts: Record<string, number>,
) {
  if (!isEnglishSummaryCompletionType({ subject: input.subject, questionType: input.questionType })) {
    return;
  }

  const stimulus = String((question as any).stimulus ?? '').trim();
  const stem = String(question.stem ?? '').replace(/<[^>]+>/g, '').trim();

  if (!stimulus) {
    pushReason(reasons, issueCounts, 'summary_completion_missing_stimulus', `Question ${index}: "요약문 완성" must have a summary in "stimulus".`);
    return;
  }
  if (!/(?:\(\s*A\s*\)|\[\s*A\s*\])/i.test(stimulus) || !/(?:\(\s*B\s*\)|\[\s*B\s*\])/i.test(stimulus)) {
    pushReason(reasons, issueCounts, 'summary_completion_missing_blanks', `Question ${index}: summary must contain (A) and (B) blanks.`);
  }

  const choices = question.choices ?? [];
  const invalidChoices = choices.filter(c => !/\s*\/\s*/.test(normalizeSummaryCompletionPairText(String(c))));
  if (invalidChoices.length > 0) {
    pushReason(reasons, issueCounts, 'summary_completion_choice_format', `Question ${index}: choices must use "word_A / word_B" format.`);
  }
}

/**
 * 심경/분위기(Emotion/Atmosphere) 유형을 검증합니다.
 */
export function validateEnglishEmotionAtmosphere(
  question: GeneratedQuestionDraft,
  index: number,
  input: ValidationInput,
  reasons: string[],
  issueCounts: Record<string, number>,
) {
  const isEnglish = String(input.subject).toLowerCase().includes('english');
  const questionType = String(input.questionType ?? '');
  if (!isEnglish || !questionType.includes('심경/분위기')) {
    return;
  }

  const stem = String(question.stem ?? '').replace(/<[^>]+>/g, '').trim();
  const choices = Array.isArray(question.choices) ? question.choices : [];

  // 1. 선택지 한글 포함 여부 검증
  if (choices.some((c) => /[\u3131-\u314e\uac00-\ud7a3]/u.test(String(c)))) {
    pushReason(
      reasons,
      issueCounts,
      'emotion_atmosphere_choices_not_english',
      `Question ${index}: "심경/분위기" choices must be in English only.`,
    );
  }

  const asksEmotion = stem.includes('심경');
  const asksAtmosphere = stem.includes('분위기');

  // 2. 심경 유형 검증 (이름 포함 변화)
  if (asksEmotion) {
    const hasChange = stem.includes('변화');
    const hasNamedPerson =
      /의\s*심경\s*변화/.test(stem) &&
      /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*의\s*심경\s*변화/.test(stem);

    if (!hasChange || !hasNamedPerson) {
      pushReason(
        reasons,
        issueCounts,
        'emotion_stem_not_named_change',
        `Question ${index}: "심경" items must ask about a named character's emotional change.`,
      );
    }

    if (choices.some((choice) => !/\s*\/\s*/.test(String(choice).trim()))) {
      pushReason(
        reasons,
        issueCounts,
        'emotion_choices_need_pairs',
        `Question ${index}: "심경" choices must use "word_A / word_B" emotion-change pairs.`,
      );
    }
  }

  // 3. 분위기 유형 검증
  if (asksAtmosphere) {
    if (stem.includes('변화')) {
      pushReason(
        reasons,
        issueCounts,
        'atmosphere_should_not_ask_change',
        `Question ${index}: "분위기" items must ask about the overall atmosphere, not emotional change.`,
      );
    }

    if (choices.some((choice) => /\s*\/\s*/.test(String(choice).trim()))) {
      pushReason(
        reasons,
        issueCounts,
        'atmosphere_choices_should_be_single',
        `Question ${index}: "분위기" choices must be single atmosphere words or compact phrases.`,
      );
    }
  }
}

/**
 * 요지/주제/제목(Title/Theme/Gist) 유형을 검증합니다.
 */
export function validateEnglishTitleThemeGist(
  question: GeneratedQuestionDraft,
  index: number,
  input: ValidationInput,
  reasons: string[],
  issueCounts: Record<string, number>,
) {
  const questionType = String(input.questionType ?? '');
  const isTargetType =
    questionType.includes('요지') ||
    questionType.includes('주제') ||
    questionType.includes('제목');

  if (!String(input.subject).toLowerCase().includes('english') || !isTargetType) {
    return;
  }

  const stem = String(question.stem ?? '');
  const englishWordCount = stem
    .split(/\s+/)
    .filter((word) => /[a-zA-Z]/.test(word)).length;

  // 지문이 포함되어 있다면 최소 30단어 이상의 영어 단어가 있을 것으로 예상
  if (englishWordCount < 30) {
    pushReason(
      reasons,
      issueCounts,
      'english_title_missing_passage',
      `Question ${index}: "주제/요지/제목" 유형에 영어 지문(passage)이 누락된 것으로 보입니다. (현재 영어 단어 수: ${englishWordCount})`,
    );
  }

  // 불필요한 밑줄(u 태그) 체크
  if (stem.includes('<u>') || stem.includes('</u>')) {
    pushReason(
      reasons,
      issueCounts,
      'english_title_unnecessary_underline',
      `Question ${index}: "주제/요지/제목" 유형 지문에는 밑줄(<u> 태그)을 사용할 수 없습니다.`,
    );
  }

  const choices = Array.isArray(question.choices) ? question.choices : [];

  if (choices.some((c) => /\s*\/\s*/.test(String(c)))) {
    pushReason(
      reasons,
      issueCounts,
      'english_title_choice_format',
      `Question ${index}: "주제/요지/제목" 유형의 선택지에는 "A / B" 형식을 사용할 수 없습니다.`,
    );
  }
}

/**
 * 어법/어휘(Grammar/Vocabulary) 유형을 검증합니다.
 */
export function validateEnglishGrammarVocabulary(
  question: GeneratedQuestionDraft,
  index: number,
  input: ValidationInput,
  reasons: string[],
  issueCounts: Record<string, number>,
) {
  const questionType = String(input.questionType ?? '');
  const isTargetType =
    questionType.includes('어법') ||
    questionType.includes('어휘') ||
    questionType.includes('문법');

  if (!String(input.subject).toLowerCase().includes('english') || !isTargetType) {
    return;
  }

  const stem = String(question.stem ?? '');
  
  // 밑줄 패턴 체크 (① <u>단어</u> 또는 <u>①</u> 형식 모두 허용하되, AI에게는 새로운 형식을 권장)
  const underlineMatches = stem.match(/([①-⑤]\s*<u>[^<]+<\/u>)|(<u>\s*[①-⑤]\s*<\/u>)|([①-⑤]\s*[A-Za-z]+)/g);
  
  if (!underlineMatches || underlineMatches.length < 3) {
    pushReason(
      reasons,
      issueCounts,
      'english_grammar_vocab_missing_underlines',
      `Question ${index}: "어법/어휘" 유형의 지문에는 ① <u>단어</u> 또는 <u>①</u> 형식을 사용한 밑줄이 5개 포함되어야 합니다. 현재 형식을 확인해 주세요.`,
    );
  }


  const choices = Array.isArray(question.choices) ? question.choices : [];

  // 선택지에 슬래시(/)나 A/B 형식이 포함되어 있는지 체크
  if (choices.some((c) => /\s*\/\s*/.test(String(c)))) {
    pushReason(
      reasons,
      issueCounts,
      'english_grammar_vocab_choice_format',
      `Question ${index}: "어법/어휘" 유형임에도 "요약문 완성"에서 사용하는 "A / B" 슬래시 형식을 사용했습니다. 이 유형에서는 절대 슬래시(/)를 사용하지 말고 단일 단어/구만 사용하십시오.`,
    );
  }

  // 선택지에 HTML 태그가 포함되어 있는지 체크 (이미지 제보 오류 수정)
  if (choices.some((c) => /<u|<\/u>/.test(String(c)))) {
    pushReason(
      reasons,
      issueCounts,
      'english_grammar_vocab_choice_tags',
      `Question ${index}: 선택지에 "</u>" 등 HTML 태그가 혼입되었습니다. 선택지는 순수 텍스트(단어)여야 합니다.`,
    );
  }

  // 선택지가 문장처럼 너무 긴지 체크
  if (choices.some((c) => String(c).trim().split(/\s+/).length > 4)) {
    pushReason(
      reasons,
      issueCounts,
      'english_grammar_vocab_choice_too_long',
      `Question ${index}: 선택지가 너무 깁니다. 어휘 문제의 선택지는 문장 전체가 아닌, 해당 단어/표현만(최대 3단어) 포함해야 합니다.`,
    );
  }

  // 모든 선택지가 동일한지 체크 (AI Hallucination 방지)
  const uniqueChoices = new Set(choices.map((c) => String(c).trim().toLowerCase()));
  if (choices.length > 1 && uniqueChoices.size === 1) {
    pushReason(
      reasons,
      issueCounts,
      'english_grammar_vocab_duplicate_choices',
      `Question ${index}: 모든 선택지가 동일하게 생성되었습니다. (AI 오류)`,
    );
  }
}
