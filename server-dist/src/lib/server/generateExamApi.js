import OpenAI from 'openai';
import { generateValidatedQuestions, QuestionGenerationError, } from "../question/generator.js";
import { SUBJECT_CONFIG, getSubjectSelectionDefaults, usesFormat, usesQuestionType, } from "../question/subjectConfig.js";
export function normalizeDifficulty(value) {
    if (value === 'easy' || value === 'medium' || value === 'hard') {
        return value;
    }
    if (value === '기본')
        return 'easy';
    if (value === '도전')
        return 'medium';
    return 'hard';
}
export function normalizeSchoolLevel(value) {
    if (value === 'middle' || value === 'high' || value === 'csat') {
        return value;
    }
    if (value === '중학교 내신형')
        return 'middle';
    if (value === '고등학교 내신형')
        return 'high';
    return 'csat';
}
export function normalizeSubject(value) {
    if (value && value in SUBJECT_CONFIG) {
        return value;
    }
    return 'english';
}
export function buildResponseTitle(payload, subject, selectionValue, schoolLevel, difficulty) {
    if (payload.title?.trim()) {
        return payload.title.trim();
    }
    return [subject, selectionValue, schoolLevel, difficulty, 'cbt'].filter(Boolean).join('-');
}
export function getOpenAiErrorMessage(error) {
    if (error instanceof OpenAI.APIError)
        return error.message;
    if (error instanceof Error)
        return error.message;
    return 'Unknown OpenAI error';
}
export async function generateExamApiResponse(input) {
    const payload = input.payload;
    const openAiApiKey = input.openAiApiKey?.trim() || '';
    const openAiModel = input.openAiModel?.trim() || 'gpt-5.4-mini';
    const openai = openAiApiKey ? new OpenAI({ apiKey: openAiApiKey }) : null;
    if (!payload.materialText || payload.materialText.trim().length < 20) {
        return {
            status: 400,
            body: { error: 'Study material must be at least 20 characters.' },
        };
    }
    try {
        const subject = normalizeSubject(payload.subject);
        const selectionDefaults = getSubjectSelectionDefaults(subject);
        const difficulty = normalizeDifficulty(payload.difficulty);
        const schoolLevel = normalizeSchoolLevel(payload.schoolLevel);
        const questionType = usesQuestionType(subject)
            ? (payload.questionType?.trim() || selectionDefaults.questionType)
            : undefined;
        const format = usesFormat(subject)
            ? (payload.format?.trim() || selectionDefaults.format)
            : undefined;
        const selectionValue = questionType ?? format ?? null;
        const generated = await generateValidatedQuestions({
            openai,
            model: openAiModel,
            materialText: payload.materialText,
            count: payload.count,
            subject,
            questionType,
            format,
            difficulty,
            schoolLevel,
            title: buildResponseTitle(payload, subject, selectionValue, schoolLevel, difficulty),
            topic: payload.topic,
        });
        return {
            status: 200,
            body: {
                title: generated.title,
                questions: generated.questions,
                source: generated.source,
                attempts: generated.attempts,
                validation: generated.validation,
            },
        };
    }
    catch (error) {
        if (error instanceof QuestionGenerationError) {
            console.error('Question validation failed:', error.message, error.reasons);
            return {
                status: 422,
                body: {
                    error: error.message,
                    reasons: error.reasons,
                    source: 'openai',
                    model: openAiModel,
                },
            };
        }
        const errorMessage = getOpenAiErrorMessage(error);
        console.error('OpenAI generate exam error:', errorMessage, error);
        return {
            status: 502,
            body: {
                error: errorMessage,
                source: 'openai',
                model: openAiModel,
            },
        };
    }
}
