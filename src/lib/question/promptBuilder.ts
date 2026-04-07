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

function buildGenericPrompt(input: PromptBuildInput) {
  const selectionLabel = input.subject === 'social' ? '문제방식' : '문제유형';
  const selectionValue = input.subject === 'social'
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

  return [
    'You are generating school exam questions.',
    'Return only a JSON array.',
    'Each item must contain exactly these keys:',
    '["topic", "type", "stem", "choices", "answer", "explanation"]',
    'Use "type" = "multiple".',
    'choices must contain exactly 5 strings.',
    'answer must match exactly one choice string.',
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
    '- Reflect the provided title and topic directly when they exist.',
    '- Use the source material as the factual basis.',
    '- Do not output duplicate stems or near-duplicate choices.',
    '- If a question stem asks to identify a specific person, student, or character, the generated choices or question stem MUST explicitly include their names (e.g., do not just output quotes).',
    '',
    buildFeedbackBlock(input.validationFeedback),
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
    '- 모든 문항은 객관식 5지선다형이다.',
    '- 정답은 1개만 존재하고 answer는 1~5 숫자여야 한다.',
    '- 한국 중등 및 고등 역사 평가에 맞는 자연스러운 한국어 표현만 사용한다.',
    '- 외부 지식 없이도 제시문 또는 기본 학습 범위 안에서 풀 수 있어야 한다.',
    '- 문항 간 난이도 편차가 지나치게 크지 않도록 유지한다.',
    '- 해설은 정답 근거와 오답이 왜 틀렸는지까지 간단히 설명한다.',
    '- 사람이나 학생, 사상가 등을 고르는 문항(예: "학생은 누구인가?")의 경우, 반드시 선택지나 제시문에 해당 인물의 이름을 명시한다.',
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
    '입력 자료:',
    input.materialText,
  ].join('\n');
}

export function buildQuestionPrompt(input: PromptBuildInput) {
  if (usesNoSelector(input.subject)) {
    return buildHistoryPrompt(input);
  }

  return buildGenericPrompt(input);
}
