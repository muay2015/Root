import type { GeneratedQuestionDraft, ValidationInput } from './types.ts';
import {
  countKoreanCharacters,
  countWords,
  pushReason,
  tokenize,
} from './utils.ts';

const LITERATURE_INTERPRETIVE_PATTERNS = [
  /화자/u,
  /서술자/u,
  /정서/u,
  /태도/u,
  /표현상/u,
  /시어/u,
  /소재/u,
  /장면/u,
  /감상/u,
  /이해한 내용/u,
  /이해로 적절한/u,
  /감상한 내용/u,
  /표현의 효과/u,
  /서술 방식/u,
  /말하기 방식/u,
  /알맞은 것은/u,
  /이해로 가장 적절한 것은/u,
  /표현상 특징/u,
  /감상한 내용/u,
];

const GRAMMAR_DRIFT_PATTERNS = [
  /주어/u,
  /서술어/u,
  /목적어/u,
  /관형어/u,
  /부사어/u,
  /문장 성분/u,
  /피동/u,
  /사동/u,
  /품사/u,
  /문법/u,
  /접속어/u,
  /명사구/u,
];

const LITERATURE_CLUE_PATTERNS = [
  /비유/u,
  /대조/u,
  /반복/u,
  /상징/u,
  /심상/u,
  /묘사/u,
  /정경/u,
  /회상/u,
  /의인/u,
  /형상화/u,
  /어조/u,
  /분위기/u,
  /시선/u,
  /거리/u,
];

const VIEW_BLOCK_PATTERN = /<보기>|\[보기\]/u;
const DESCRIPTION_SENTENCE_PATTERNS = [
  /인물\s*[A-Z가-힣]/u,
  /내적 갈등/u,
  /외적 갈등/u,
  /영향을 준다/u,
  /결과이다/u,
  /심화된다/u,
  /드러낸다/u,
];

const META_STIMULUS_PATTERNS = [
  /이 문제는/u,
  /출제 경향/u,
  /전 범위/u,
  /고르게 출제/u,
  /생성되는 문제/u,
  /사용자가 입력한 주제/u,
  /기초로 하여 생성/u,
  /\[수능 문학 지문 생성 지시\]/u,
  /안내문/u,
  /메타 설명/u,
  /출제 취지/u,
];

const EXPRESSION_STEM_PATTERNS = [
  /표현상 특징/u,
  /표현의 효과/u,
  /표현 방식/u,
];

const CONFLICT_STEM_PATTERNS = [
  /갈등/u,
  /갈등 양상/u,
  /인적 갈등/u,
  /내적 갈등/u,
];

const DIRECT_EMOTION_WORD_PATTERNS = [
  /쓸쓸/u,
  /외롭/u,
  /슬프/u,
  /기쁘/u,
  /불안/u,
  /두렵/u,
  /괴롭/u,
  /고통/u,
  /허무/u,
  /절망/u,
];

const OBVIOUS_MISMATCH_PATTERNS = [
  /대화체/u,
  /인물 간 갈등/u,
  /갈등의 원인/u,
  /해소 과정/u,
  /사건 전개/u,
  /공간적 이동/u,
  /객관적으로 제시/u,
  /열거/u,
  /선어말어미/u,
];

function looksLikeLiteratureStem(stem: string) {
  return LITERATURE_INTERPRETIVE_PATTERNS.some((pattern) => pattern.test(stem));
}

function looksLikeLiteratureStemSafe(stem: string) {
  const normalized = String(stem ?? '').replace(/\s+/g, ' ').trim();
  return (
    looksLikeLiteratureStem(normalized) ||
    /(?:화자|정서|태도|심경|정서의 흐름|정서 변화|표현상\s*특징|표현의\s*효과|표현\s*방식|시어|심상|이미지|어조|분위기|갈등|갈등 양상|장면|상황|기능|서사\s*전개|감상한\s*내용|감상으로|이해로|설명으로)/u.test(
      normalized,
    )
  );
}

function looksLikePromptOnlyStem(stem: string) {
  const normalized = stem.replace(/\s+/g, ' ').trim();
  return (
    /다음\s+(글|작품|시|소설|대화|장면|내용)/u.test(normalized) ||
    /윗글/u.test(normalized) ||
    /<보기>/u.test(normalized)
  );
}

function looksLikeGrammarDrift(text: string) {
  return GRAMMAR_DRIFT_PATTERNS.some((pattern) => pattern.test(text));
}

function countCompetitiveChoices(choices: string[]) {
  return choices.filter((choice) => {
    const tokenCount = tokenize(choice).length;
    const koreanCount = countKoreanCharacters(choice);
    return tokenCount >= 4 || koreanCount >= 12;
  }).length;
}

function stripViewLabel(text: string) {
  return text.replace(/<보기>|\[보기\]/gu, '').trim();
}

function countDescriptionSignals(text: string) {
  return DESCRIPTION_SENTENCE_PATTERNS.filter((pattern) => pattern.test(text)).length;
}

function hasVerseLikeShape(text: string) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.length >= 3;
}

function looksLikeSummaryOnlyStimulus(text: string) {
  const normalized = stripViewLabel(text);
  if (!normalized) return false;

  const hasOnlySingleBlock = !/\n\s*\n/u.test(normalized);
  const sentenceCount = normalized.split(/[.!?]\s*|다\.\s*|다,\s*/u).filter((part) => part.trim().length >= 6).length;
  const descriptionSignals = countDescriptionSignals(normalized);

  return hasOnlySingleBlock && !hasVerseLikeShape(normalized) && sentenceCount <= 4 && descriptionSignals >= 2;
}

function choiceRestatesStimulus(choice: string, stimulus: string) {
  const choiceTokens = tokenize(choice).filter((token) => token.length >= 2);
  if (choiceTokens.length < 4) {
    return false;
  }

  const stimulusText = stripViewLabel(stimulus).replace(/\s+/g, ' ').trim().toLowerCase();
  const overlap = choiceTokens.filter((token) => stimulusText.includes(token)).length;
  return overlap >= Math.max(4, Math.ceil(choiceTokens.length * 0.7));
}

function isExpressionFeatureStem(stem: string) {
  return EXPRESSION_STEM_PATTERNS.some((pattern) => pattern.test(stem));
}

function isConflictStem(stem: string) {
  return CONFLICT_STEM_PATTERNS.some((pattern) => pattern.test(stem));
}

function hasNarrativeDialogueSignal(stimulus: string) {
  return /["'“”‘’]|:/u.test(stimulus);
}

function hasSceneShiftSignal(stimulus: string) {
  return /옮기|이동|떠나|가다|오다|길|거리|문밖|저편|건너/u.test(stimulus);
}

function hasConflictSignal(stimulus: string) {
  return /다툼|대립|비난|망설|주저|부정|반대|권유|거절|맞서|선택|침묵|흔들리|갈등/u.test(
    stimulus,
  );
}

function countDirectEmotionWords(stimulus: string) {
  return DIRECT_EMOTION_WORD_PATTERNS.filter((pattern) => pattern.test(stimulus)).length;
}

function isObviouslyMismatchedChoice(choice: string, stimulus: string) {
  if (!OBVIOUS_MISMATCH_PATTERNS.some((pattern) => pattern.test(choice))) {
    return false;
  }

  if (/대화체|인물 간 갈등|갈등의 원인|해소 과정/u.test(choice) && !hasNarrativeDialogueSignal(stimulus)) {
    return true;
  }

  if (/공간적 이동/u.test(choice) && !hasSceneShiftSignal(stimulus)) {
    return true;
  }

  if (/선어말어미/u.test(choice)) {
    return true;
  }

  return false;
}

function countPlausibleInterpretiveChoices(choices: string[], stimulus: string) {
  return choices.filter((choice) => !isObviouslyMismatchedChoice(choice, stimulus)).length;
}

function countConflictPlausibleChoices(choices: string[]) {
  return choices.filter((choice) => {
    if (/표현|화자|비유|반복|심상|문법|접속어|주어|피동/u.test(choice)) {
      return false;
    }

    return /갈등|인물|내적|외적|선택|침묵|태도|심화|오해|대립/u.test(choice);
  }).length;
}

function looksLikeMetaStimulus(text: string) {
  return META_STIMULUS_PATTERNS.some((pattern) => pattern.test(text));
}

function hasRepeatedLeadingPassage(stimulus: string) {
  const paragraphs = stimulus
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length < 2) {
    return false;
  }

  const normalized = paragraphs.map((part) => part.replace(/\s+/g, ' ').trim().toLowerCase());

  for (let i = 1; i < normalized.length; i += 1) {
    if (normalized[i] === normalized[i - 1] && normalized[i].length >= 20) {
      return true;
    }
  }

  if (normalized.length % 2 === 0) {
    const half = normalized.length / 2;
    if (normalized.slice(0, half).join('\n') === normalized.slice(half).join('\n')) {
      return true;
    }
  }

  return false;
}

function hasDanglingViewLabel(stimulus: string) {
  const normalized = stimulus.trim();
  if (!/^<보기>/u.test(normalized)) {
    return false;
  }

  const paragraphs = normalized.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  return paragraphs.length <= 2;
}

export function validateKoreanLiteratureQuality(
  question: GeneratedQuestionDraft,
  index: number,
  input: ValidationInput,
  reasons: string[],
  warnings: string[],
  issueCounts: Record<string, number>,
) {
  if (input.subject !== 'korean_literature') {
    return;
  }

  const stem = String(question.stem ?? '').trim();
  const stimulus = String(question.stimulus ?? '').trim();
  const explanation = String(question.explanation ?? '').trim();
  const choices = Array.isArray(question.choices) ? question.choices : [];
  const combinedText = [stem, stimulus, explanation, ...choices].join('\n');
  const stemAndSupportText = [stem, explanation, ...choices].join('\n');

  if (!stimulus || countKoreanCharacters(stimulus) < 18) {
    pushReason(
      reasons,
      issueCounts,
      'korean_literature_missing_stimulus',
      `Question ${index}: korean literature items must include a short but meaningful passage in stimulus.`,
    );
  }

  if (stimulus && looksLikeMetaStimulus(stimulus)) {
    pushReason(
      reasons,
      issueCounts,
      'korean_literature_meta_stimulus',
      `Question ${index}: korean literature stimulus contains generator meta text instead of an actual literary passage.`,
    );
  }

  if (stimulus && VIEW_BLOCK_PATTERN.test(stimulus) && looksLikeSummaryOnlyStimulus(stimulus)) {
    pushReason(
      reasons,
      issueCounts,
      'korean_literature_summary_only_view',
      `Question ${index}: korean literature stimulus looks like a summary-only <보기> without an actual literary passage.`,
    );
  }

  if (stimulus && hasRepeatedLeadingPassage(stimulus)) {
    pushReason(
      reasons,
      issueCounts,
      'korean_literature_repeated_passage',
      `Question ${index}: korean literature stimulus repeats the same passage block.`,
    );
  }

  if (stimulus && hasDanglingViewLabel(stimulus)) {
    pushReason(
      reasons,
      issueCounts,
      'korean_literature_dangling_view',
      `Question ${index}: korean literature stimulus starts with a dangling <보기> label or malformed view block.`,
    );
  }

  const hasInterpretiveSignal =
    looksLikeLiteratureStemSafe(stem) ||
    (looksLikePromptOnlyStem(stem) && looksLikeLiteratureStemSafe(stemAndSupportText));

  if (!hasInterpretiveSignal) {
    pushReason(
      reasons,
      issueCounts,
      'korean_literature_non_interpretive_stem',
      `Question ${index}: korean literature stem is not framed clearly enough as a literary interpretation task.`,
    );
  }

  if (looksLikeGrammarDrift(combinedText) && !/표현|시어|화자|서술자|정서|태도/u.test(stem)) {
    pushReason(
      reasons,
      issueCounts,
      'korean_literature_grammar_drift',
      `Question ${index}: korean literature item drifted into grammar-focused analysis instead of literary interpretation.`,
    );
  }

  const clueCount =
    LITERATURE_CLUE_PATTERNS.filter((pattern) => pattern.test(combinedText)).length +
    (/['"“”‘’]/u.test(explanation) ? 1 : 0);

  if (clueCount < 1 && countWords(explanation) < 12) {
    pushReason(
      reasons,
      issueCounts,
      'korean_literature_thin_explanation',
      `Question ${index}: korean literature explanation does not show enough internal textual evidence.`,
    );
  }

  if (countCompetitiveChoices(choices) < 4) {
    pushReason(
      reasons,
      issueCounts,
      'korean_literature_weak_distractors',
      `Question ${index}: korean literature choices are too short or too easy to eliminate.`,
    );
  }

  if (stimulus && choices.some((choice) => choiceRestatesStimulus(choice, stimulus))) {
    pushReason(
      reasons,
      issueCounts,
      'korean_literature_choice_restates_view',
      `Question ${index}: at least one choice restates the given <보기> too directly, making the answer too exposed.`,
    );
  }

  if (isExpressionFeatureStem(stem)) {
    const plausibleChoices = countPlausibleInterpretiveChoices(choices, stimulus);
    if (plausibleChoices < 4) {
      pushReason(
        reasons,
        issueCounts,
        'korean_literature_expression_weak_distractors',
        `Question ${index}: expression-feature item contains too many obviously mismatched distractors.`,
      );
    }
  }

  if (stimulus && countDirectEmotionWords(stimulus) >= 3) {
    warnings.push(
      `Question ${index}: korean literature passage states emotions too directly, which may lower CSAT-style inferential quality.`,
    );
  }

  if (isConflictStem(stem)) {
    if (!stimulus || !hasConflictSignal(stimulus)) {
      pushReason(
        reasons,
        issueCounts,
        'korean_literature_conflict_without_textual_basis',
        `Question ${index}: conflict item does not provide enough textual basis in the passage for conflict analysis.`,
      );
    }

    if (countConflictPlausibleChoices(choices) < 4) {
      pushReason(
        reasons,
        issueCounts,
        'korean_literature_conflict_weak_distractors',
        `Question ${index}: conflict item contains distractors that drift away from conflict interpretation.`,
      );
    }
  }

  if (stimulus && countWords(stimulus) > 120) {
    warnings.push(
      `Question ${index}: korean literature passage is longer than the intended short-passage budget.`,
    );
  }
}
