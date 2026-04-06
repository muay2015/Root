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
            'Make at least two choices competitive until the final step of reasoning.',
            'Use strong distractors from the same period, institution class, or historical context.',
        ],
    },
};
export const schoolLevelRules = {
    middle: {
        label: 'Middle School',
        promptRules: [
            'Use middle-school textbook vocabulary and sentence length.',
            'Prefer highly recognizable curriculum concepts and standard classroom phrasing.',
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
            'Use compact, assessment-like wording and non-trivial elimination.',
            'Require stable evidence tracking and careful comparison among close distractors.',
        ],
    },
};
const subjectRules = {
    english: {
        objective: 'Generate English exam questions that clearly match the selected question type.',
        contentScope: 'Use reading comprehension, grammar, vocabulary, discourse, and textual logic.',
        evidenceStyle: 'Support answers with lexical, syntactic, or discourse evidence from the source text.',
        stemGuidance: [
            'Write the stem in English unless the user explicitly asked for another language.',
            'Make the subtype visible in the question design.',
        ],
        choiceGuidance: ['Use distractors based on wording, nuance, or discourse misunderstanding.'],
        explanationGuidance: ['Explain the textual or language evidence that makes the answer correct.'],
    },
    math: {
        objective: 'Generate math questions that clearly match the selected math subtype.',
        contentScope: 'Use definitions, formulas, symbolic reasoning, quantitative relations, and application.',
        evidenceStyle: 'Support answers with calculation steps, mathematical properties, or interpretation of givens.',
        stemGuidance: [
            'State givens, conditions, and what must be solved clearly.',
            'For application items, keep the mathematical core explicit.',
        ],
        choiceGuidance: ['Use distractors that reflect realistic arithmetic, algebraic, or interpretation errors.'],
        explanationGuidance: ['Explain the solving path or key property used.'],
    },
    science: {
        objective: 'Generate science questions aligned to concept, principle, data interpretation, or experiment analysis.',
        contentScope: 'Use scientific concepts, causal reasoning, tables, observations, and experiment logic.',
        evidenceStyle: 'Support answers with scientific principles, observed data, or valid interpretation.',
        stemGuidance: [
            'Frame the item around a concept, principle, data set, or experiment depending on the selected subtype.',
            'Include variables, trends, or evidence statements where useful.',
        ],
        choiceGuidance: ['Distractors should reflect misconception, flawed inference, or misread data.'],
        explanationGuidance: ['Explain the governing principle or critical data point.'],
    },
    social: {
        objective: 'Generate social studies questions using the selected response format.',
        contentScope: 'Use historical facts, civic ideas, geography, economics, and social interpretation.',
        evidenceStyle: 'Support answers with factual grounding, cause-effect relations, or document-based reasoning.',
        stemGuidance: [
            'Reflect the selected response format explicitly in the stem.',
            'Keep context tied to social studies content and source evidence.',
        ],
        choiceGuidance: ['For multiple-choice items, use balanced plausible options.'],
        explanationGuidance: ['Explain the factual or interpretive basis for the answer.'],
    },
    korean: {
        objective: 'Generate Korean-language questions aligned to reading, grammar, literature, or speech and writing.',
        contentScope: 'Use reading comprehension, grammar knowledge, literary interpretation, and communication context.',
        evidenceStyle: 'Support answers with wording, literary features, speaker intent, or discourse function.',
        stemGuidance: [
            'Write stems and explanations in Korean.',
            'Reflect the selected Korean subtype directly in the stem.',
        ],
        choiceGuidance: ['Distractors should reflect realistic interpretation or language-use mistakes.'],
        explanationGuidance: ['Explain the textual, grammatical, or literary clue that determines the answer.'],
    },
    korean_history: {
        objective: 'Generate Korean history multiple-choice questions without relying on English question-type templates.',
        contentScope: 'Use Korean history periods, institutions, people, reforms, source interpretation, chronology, and causation.',
        evidenceStyle: 'Support answers with historical context, chronology, source evidence, policy comparison, and cause-result reasoning.',
        stemGuidance: [
            'Write all stems and explanations in natural Korean.',
            'Stay strictly within Korean history. Do not drift into exercise, health, English reading, or generic study topics.',
            'If difficulty is hard, avoid keyword-triggered direct recall questions.',
            'Use source interpretation, comparison, sequence, policy-event linkage, or cause-result reasoning where appropriate.',
        ],
        choiceGuidance: [
            'All five choices must belong to the same historical neighborhood when possible.',
            'Hard distractors must come from similar periods, institutions, or themes.',
        ],
        explanationGuidance: [
            'Explain why the answer is correct and briefly why the closest distractor choices are wrong.',
        ],
    },
};
export function getGenerationRules(input) {
    const subjectConfig = SUBJECT_CONFIG[input.subject];
    const difficulty = difficultyRules[input.difficulty];
    const schoolLevel = schoolLevelRules[input.schoolLevel];
    const subjectRule = subjectRules[input.subject];
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
