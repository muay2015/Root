import OpenAI from 'openai';
import { generateValidatedQuestions, QuestionGenerationError, } from "../question/generator.js";
import { SUBJECT_CONFIG, getSubjectSelectionDefaults, usesFormat, usesQuestionType, } from "../question/subjectConfig.js";
export function normalizeDifficulty(value) {
    if (value === 'easy' || value === 'medium' || value === 'hard')
        return value;
    if (value === '기본')
        return 'easy';
    if (value === '도전')
        return 'medium';
    return 'hard';
}
export function normalizeSchoolLevel(value) {
    if (value === 'middle' || value === 'high' || value === 'csat')
        return value;
    if (value === '중학교 내신형')
        return 'middle';
    if (value === '고등학교 내신형')
        return 'high';
    return 'csat';
}
export function normalizeSubject(value) {
    if (value && value in SUBJECT_CONFIG)
        return value;
    return 'middle_english';
}
export function buildResponseTitle(payload, subject, selectionValue, schoolLevel, difficulty) {
    if (payload.title?.trim())
        return payload.title.trim();
    return [subject, selectionValue, schoolLevel, difficulty, 'cbt'].filter(Boolean).join('-');
}
export function getOpenAiErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return 'Unknown error';
}
export async function generateExamApiResponse(input) {
    const { payload, openAiApiKey, openAiModel } = input;
    const openai = openAiApiKey ? new OpenAI({ apiKey: openAiApiKey }) : null;
    try {
        const subject = normalizeSubject(payload.subject);
        const selectionDefaults = getSubjectSelectionDefaults(subject);
        const difficulty = normalizeDifficulty(payload.difficulty);
        const schoolLevel = normalizeSchoolLevel(payload.schoolLevel);
        const questionType = usesQuestionType(subject) ? (payload.questionType?.trim() || selectionDefaults.questionType) : undefined;
        const format = usesFormat(subject) ? (payload.format?.trim() || selectionDefaults.format) : undefined;
        const selectionValue = questionType ?? format ?? null;
        const generated = await generateValidatedQuestions({
            openai,
            model: openAiModel || 'gpt-5.4-mini',
            materialText: payload.materialText,
            count: Number(payload.count) || 10,
            subject,
            questionType,
            format,
            difficulty,
            schoolLevel,
            title: buildResponseTitle(payload, subject, selectionValue, schoolLevel, difficulty),
            topic: payload.topic,
            builderMode: payload.builderMode,
            images: payload.images, // 이미지 데이터(Base64) 전달
        });
        return {
            status: 200,
            body: {
                title: generated.title,
                questions: generated.questions,
                source: generated.source,
                attempts: generated.attempts,
                validation: generated.validation,
                summary: generated.summary,
                _debug: {
                    requestedCount: payload.count,
                    resolvedCount: Number(payload.count) || 10,
                    builderMode: payload.builderMode,
                    subject: subject
                }
            }
        };
    }
    catch (error) {
        console.error('API Error:', error);
        return {
            status: error instanceof QuestionGenerationError ? 422 : 502,
            body: { error: error.message || 'Error occurred' }
        };
    }
}
export async function ocrApiResponse(input) {
    const { payload, openAiApiKey, openAiModel } = input;
    const openai = openAiApiKey ? new OpenAI({ apiKey: openAiApiKey }) : null;
    if (!openai)
        return { status: 401, body: { error: 'API 키가 설정되지 않았습니다.' } };
    try {
        const resp = await openai.chat.completions.create({
            model: openAiModel || 'gpt-5.4-mini',
            messages: [
                { role: 'system', content: '입력된 이미지에서 텍스트를 고정밀도로 추출하세요. 특수기호나 구조(표 등)는 텍스트로 자연스럽게 표현하고, 불필요한 설명 없이 추출된 텍스트만 반환하세요.' },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: '이미지에서 모든 텍스트를 추출해줘.' },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${payload.image.mimeType};base64,${payload.image.data}`
                            }
                        }
                    ]
                }
            ],
        });
        const text = resp.choices[0].message.content || '';
        return {
            status: 200,
            body: { text }
        };
    }
    catch (error) {
        console.error('OCR API Error:', error);
        return {
            status: 502,
            body: { error: error.message || 'OCR 처리 중 오류가 발생했습니다.' }
        };
    }
}
