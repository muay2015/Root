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
function sanitizeEnvStyleValue(value) {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) {
        return '';
    }
    return trimmed.replace(/^['"]+|['"]+$/g, '').trim();
}
export async function generateExamApiResponse(input) {
    const startTime = Date.now();
    const { payload, openAiApiKey, openAiModel } = input;
    const apiKey = sanitizeEnvStyleValue(openAiApiKey);
    const resolvedModel = sanitizeEnvStyleValue(openAiModel) || 'gpt-4o';
    const openai = apiKey ? new OpenAI({ apiKey }) : null;
    try {
        const subject = normalizeSubject(payload.subject);
        const selectionDefaults = getSubjectSelectionDefaults(subject);
        const difficulty = normalizeDifficulty(payload.difficulty);
        const schoolLevel = normalizeSchoolLevel(payload.schoolLevel);
        const questionType = usesQuestionType(subject) ? (payload.questionType?.trim() || selectionDefaults.questionType) : undefined;
        const format = usesFormat(subject) ? (payload.format?.trim() || selectionDefaults.format) : undefined;
        const selectionValue = questionType ?? format ?? null;
        let questions = [];
        let source = 'ai';
        let attempts = 0;
        let finalTitle = buildResponseTitle(payload, subject, selectionValue, schoolLevel, difficulty);
        let summary;
        const images = payload.images;
        if (images && images.length > 1) {
            // 다중 이미지 병렬 처리 (문항별 독립 세그멘테이션)
            const results = await Promise.all(images.map((img) => generateValidatedQuestions({
                openai,
                model: resolvedModel,
                materialText: payload.materialText,
                count: 1, // 개별 이미지당 최소 1점 확보
                subject,
                questionType,
                format,
                difficulty,
                schoolLevel,
                title: payload.title,
                topic: payload.topic,
                builderMode: payload.builderMode,
                images: [img],
            })));
            // 결과 통합 및 ID 재정렬
            let globalIdx = 1;
            results.forEach((res) => {
                res.questions.forEach((q) => {
                    questions.push({ ...q, id: globalIdx++ });
                });
                if (!summary && res.summary)
                    summary = res.summary;
                attempts += res.attempts;
            });
            finalTitle = payload.topic || results[0]?.title || finalTitle;
        }
        else {
            // 단일 이미지 또는 텍스트 기반 기존 로직
            const generated = await generateValidatedQuestions({
                openai,
                model: resolvedModel,
                materialText: payload.materialText,
                count: Number(payload.count) || 5,
                subject,
                questionType,
                format,
                difficulty,
                schoolLevel,
                title: buildResponseTitle(payload, subject, selectionValue, schoolLevel, difficulty),
                topic: payload.topic,
                builderMode: payload.builderMode,
                images: images,
            });
            questions = generated.questions;
            source = generated.source;
            attempts = generated.attempts;
            finalTitle = generated.title;
            summary = generated.summary;
        }
        const duration = (Date.now() - startTime) / 1000;
        console.log(`--- [Generate API] Process COMPLETED in ${duration.toFixed(1)}s ---`);
        return {
            status: 200,
            body: {
                title: finalTitle,
                questions,
                source,
                attempts,
                validation: { isValid: true, reasons: [], warnings: [], issueCounts: {} },
                summary,
                _debug: {
                    requestedCount: payload.count,
                    resolvedCount: questions.length,
                    builderMode: payload.builderMode,
                    subject: subject,
                    imageCount: images?.length || 0,
                    durationSeconds: duration
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
