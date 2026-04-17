import { type PromptBuildInput, buildFeedbackBlock, buildSourceMaterialBlock } from './core';
import { getGenerationRules } from '../generationRules';
import { type SubjectKey } from '../subjectConfig';

export function buildCsatKoreanLiteratureRules(input: PromptBuildInput) {
  if (input.subject !== 'korean_literature' || input.schoolLevel !== 'csat') {
    return [];
  }
  return [
    '- [CSAT KOREAN LITERATURE] Treat every item as a real CSAT literature question, not a grammar or casual dialogue question.',
    '- [CSAT KOREAN LITERATURE] Default to set-based generation: up to 3 questions may share one passage, and those questions must use the same base passage with clearly different stems.',
    '- [CSAT KOREAN LITERATURE] Keep the passage substantial enough for a shared-passage set: use 10-18 lines for verse-like text or 8-14 sentences for prose-like text.',
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
}

export function buildKoreanPassageRules(subject: SubjectKey) {
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

export function buildCsatKoreanLiteratureSetPrompt(input: PromptBuildInput) {
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
    'Keep the passage substantial enough for a set: use 10-18 lines for verse-like text or 8-14 sentences for prose-like text.',
    'The passage must not feel fragmentary. Even in a set, provide enough development, imagery, situation, contrast, or narrative progression to support multiple questions from one shared passage.',
    'Do not generate grammar-analysis questions.',
    'Do not include meta commentary, labels like [문제 1], or prose outside the JSON object.',
    ...buildCsatKoreanLiteratureRules(input),
    '',
    feedbackBlock,
    '',
    buildSourceMaterialBlock(input),
  ].join('\n');
}
