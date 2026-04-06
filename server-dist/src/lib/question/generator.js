import OpenAI from 'openai';
import { getGenerationRules } from "./generationRules.js";
import { normalizeChoiceText } from "./normalizeChoiceText.js";
import { buildQuestionPrompt } from "./promptBuilder.js";
import { validateGeneratedQuestions } from "./validator.js";
import { SUBJECT_CONFIG, getSubjectSelectionDefaults, getSubjectSelectionLabel, usesNoSelector, } from "./subjectConfig.js";
export class QuestionGenerationError extends Error {
    reasons;
    constructor(message, reasons = []) {
        super(message);
        this.name = 'QuestionGenerationError';
        this.reasons = reasons;
    }
}
const MAX_BATCH_SIZE = 5;
function normalizeInlineText(value) {
    return normalizeChoiceText(value);
}
function normalizeChoices(choices) {
    const normalized = Array.isArray(choices)
        ? choices.map(normalizeInlineText).filter((choice) => choice.length > 0).slice(0, 5)
        : [];
    while (normalized.length < 5) {
        normalized.push(`Choice ${normalized.length + 1}`);
    }
    return normalized;
}
function resolveSelectionValue(input) {
    const defaults = getSubjectSelectionDefaults(input.subject);
    const config = SUBJECT_CONFIG[input.subject];
    if (config.selectorMode === 'questionType') {
        return input.questionType ?? defaults.questionType;
    }
    if (config.selectorMode === 'format') {
        return input.format ?? defaults.format;
    }
    return null;
}
function resolveQuestionTopic(raw, index, input) {
    const trimmedTopic = typeof raw.topic === 'string' ? raw.topic.trim() : '';
    if (trimmedTopic.length > 0) {
        return trimmedTopic;
    }
    if (input.subject === 'korean_history') {
        return input.topic?.trim() || input.title?.trim() || `국사 문항 ${index + 1}`;
    }
    const selectionValue = resolveSelectionValue(input);
    return selectionValue || input.topic?.trim() || `${SUBJECT_CONFIG[input.subject].label} 문항 ${index + 1}`;
}
function normalizeQuestion(raw, index, input) {
    const choices = normalizeChoices(raw.choices);
    const rawAnswer = normalizeInlineText(String(raw.answer));
    const exactChoice = choices.find((choice) => choice.trim() === rawAnswer);
    const numericAnswer = Number(rawAnswer);
    const answer = exactChoice ??
        (Number.isInteger(numericAnswer) && numericAnswer >= 1 && numericAnswer <= choices.length
            ? choices[numericAnswer - 1]
            : choices[0]);
    return {
        id: index + 1,
        topic: resolveQuestionTopic(raw, index, input),
        type: 'multiple',
        stem: (raw.stem ?? ('question' in raw ? raw.question : '') ?? '').trim(),
        choices,
        answer,
        explanation: raw.explanation.trim(),
    };
}
function buildFallbackQuestions(input) {
    const selectionLabel = getSubjectSelectionLabel(input.subject, input.questionType ?? '', (input.format ?? '객관식'));
    const selectionValue = resolveSelectionValue(input);
    const rules = getGenerationRules({
        subject: input.subject,
        selectionLabel: selectionLabel ?? undefined,
        selectionValue: selectionValue ?? undefined,
        difficulty: input.difficulty,
        schoolLevel: input.schoolLevel,
    });
    return Array.from({ length: input.count }, (_, index) => ({
        id: index + 1,
        topic: input.topic || input.title || `${rules.subjectLabel} 문항`,
        type: 'multiple',
        stem: `${rules.subjectLabel} ${selectionValue ?? ''} 문항 ${index + 1}`.trim(),
        choices: ['Choice 1', 'Choice 2', 'Choice 3', 'Choice 4', 'Choice 5'],
        answer: 'Choice 1',
        explanation: `Fallback item aligned to ${rules.subjectLabel}, ${rules.schoolLevel.label}, and ${rules.difficulty.label}.`,
    }));
}
function getDefaultTitle(input) {
    const selectionValue = resolveSelectionValue(input);
    return input.title || [input.subject, selectionValue, input.schoolLevel, input.difficulty].filter(Boolean).join('-');
}
async function requestQuestionsFromModel(input, validationFeedback) {
    if (!input.openai) {
        return null;
    }
    const prompt = buildQuestionPrompt({
        materialText: input.materialText,
        title: input.title,
        topic: input.topic,
        count: input.count,
        subject: input.subject,
        questionType: input.questionType,
        format: input.format,
        difficulty: input.difficulty,
        schoolLevel: input.schoolLevel,
        validationFeedback,
    });
    const response = await input.openai.responses.create({
        model: input.model,
        input: [
            {
                role: 'system',
                content: usesNoSelector(input.subject)
                    ? 'Generate Korean-history-only exam questions and return valid JSON only.'
                    : 'Generate subject-specific exam questions and return valid JSON only.',
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
        text: { verbosity: 'low' },
    });
    const parsed = JSON.parse(response.output_text);
    return Array.isArray(parsed) ? parsed.map((item, itemIndex) => normalizeQuestion(item, itemIndex, input)) : [];
}
async function generateValidatedQuestionBatch(input) {
    let latestQuestions = [];
    let latestValidation = {
        isValid: false,
        reasons: ['Generation did not run yet.'],
        warnings: [],
        issueCounts: {},
    };
    let validationFeedback = [];
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        latestQuestions = await requestQuestionsFromModel(input, validationFeedback);
        latestValidation = validateGeneratedQuestions({
            questions: latestQuestions,
            count: input.count,
            subject: input.subject,
            questionType: input.questionType,
            format: input.format,
            difficulty: input.difficulty,
            schoolLevel: input.schoolLevel,
            title: input.title,
            topic: input.topic,
        });
        if (latestValidation.isValid) {
            return {
                title: getDefaultTitle(input),
                questions: latestQuestions,
                source: 'ai',
                attempts: attempt,
                validation: latestValidation,
            };
        }
        validationFeedback = latestValidation.reasons;
    }
    throw new QuestionGenerationError('문제 생성 결과가 유효하지 않아 중단했습니다. placeholder 보기 또는 빈 문항이 감지되었습니다.', latestValidation.reasons);
}
export async function generateValidatedQuestions(input) {
    if (!input.openai) {
        throw new QuestionGenerationError('AI 문제 생성을 위한 OpenAI 설정이 없습니다.');
    }
    if (input.count <= MAX_BATCH_SIZE) {
        return generateValidatedQuestionBatch(input);
    }
    const mergedQuestions = [];
    const mergedWarnings = [];
    let totalAttempts = 0;
    for (let startIndex = 0; startIndex < input.count; startIndex += MAX_BATCH_SIZE) {
        const batchCount = Math.min(MAX_BATCH_SIZE, input.count - startIndex);
        const batch = await generateValidatedQuestionBatch({
            ...input,
            count: batchCount,
        });
        totalAttempts += batch.attempts;
        mergedWarnings.push(...batch.validation.warnings);
        mergedQuestions.push(...batch.questions.map((question, offset) => ({
            ...question,
            id: startIndex + offset + 1,
        })));
    }
    const mergedValidation = validateGeneratedQuestions({
        questions: mergedQuestions,
        count: input.count,
        subject: input.subject,
        questionType: input.questionType,
        format: input.format,
        difficulty: input.difficulty,
        schoolLevel: input.schoolLevel,
        title: input.title,
        topic: input.topic,
    });
    if (!mergedValidation.isValid) {
        throw new QuestionGenerationError('배치 생성 후 최종 검증에 실패했습니다.', mergedValidation.reasons);
    }
    return {
        title: getDefaultTitle(input),
        questions: mergedQuestions,
        source: 'ai',
        attempts: totalAttempts,
        validation: {
            ...mergedValidation,
            warnings: Array.from(new Set([...mergedValidation.warnings, ...mergedWarnings])),
        },
    };
}
