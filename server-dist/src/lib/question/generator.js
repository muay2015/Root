import {} from "./generationRules.js";
import { buildQuestionPrompt } from "./promptBuilder.js";
import { validateGeneratedQuestions } from "./validator.js";
import {} from "./subjectConfig.js";
import { normalizeChoiceText } from "./normalizeChoiceText.js";
import { resolveAnswerFromChoices as resolveAnswerFromChoicesLoose } from "./answerMatching.js";
export class QuestionGenerationError extends Error {
    reasons;
    constructor(message, reasons = []) {
        super(message);
        this.name = 'QuestionGenerationError';
        this.reasons = reasons;
    }
}
const MAX_BATCH_SIZE = 5;
function extractJson(text) {
    let clean = text.trim();
    if (clean.startsWith('```')) {
        const match = clean.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
        if (match)
            clean = match[1].trim();
    }
    return clean.replace(/(?<!\\)\\(?![\\"/bfnrtu])/g, '\\\\');
}
function splitChoiceString(value) {
    return value
        .split(/\r?\n|(?=\s*[①-⑤])|(?=\s*[1-5][\.\)])|(?=\s*[A-E][\.\)])|(?:\s*\/\s*)|(?:\s*\|\s*)/)
        .map((part) => normalizeChoiceText(part))
        .filter((part) => part.length > 0);
}
function splitChoiceStringSafely(value) {
    const prepared = value
        .replace(/\r\n/g, '\n')
        .replace(/\s*\|\s*/g, '\n')
        .replace(/\s\/\s/g, '\n')
        .replace(/(?:^|\s)([\u2460-\u2464])\s+/gu, '\n$1 ')
        .replace(/(?:^|\s)([1-5]|[A-Ea-e])[\.\)]\s+/g, '\n$1. ');
    return prepared
        .split(/\n+/)
        .map((part) => normalizeChoiceText(part))
        .filter((part) => part.length > 0);
}
function normalizeAnswerComparison(value) {
    return normalizeChoiceText(value)
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/\\\(|\\\)|\\\[|\\\]|\$|\{|\}/g, '')
        .replace(/\\text\{([^}]*)\}/g, '$1')
        .replace(/\\sqrt/g, 'root')
        .replace(/\\times/g, '*')
        .replace(/\\div/g, '/')
        .trim();
}
function parseLetterChoiceIndex(value) {
    const compact = value.trim().toUpperCase();
    const match = compact.match(/^(?:ANSWER[:\s]*)?([A-E])(?:[.)])?$/);
    if (!match) {
        return null;
    }
    return match[1].charCodeAt(0) - 65;
}
function parseAnswerChoiceIndex(value) {
    const compact = value.trim().replace(/\s+/g, '');
    const circledDigitMap = {
        '①': 0,
        '②': 1,
        '③': 2,
        '④': 3,
        '⑤': 4,
    };
    if (compact in circledDigitMap) {
        return circledDigitMap[compact];
    }
    if (/^[1-5][.)]?$/.test(compact)) {
        return Number.parseInt(compact[0], 10) - 1;
    }
    const labeledDigit = compact.match(/^(?:[^0-9]*:)?[^0-9]*([1-5])(?:번|번이다|번임|번정답|번이정답)?$/u);
    if (labeledDigit) {
        return Number.parseInt(labeledDigit[1], 10) - 1;
    }
    return parseLetterChoiceIndex(compact);
}
function resolveAnswerFromChoices(rawAnswer, choices) {
    if (typeof rawAnswer === 'number') {
        const idx = Math.floor(rawAnswer) - 1;
        return choices[idx] || '';
    }
    if (typeof rawAnswer !== 'string') {
        return '';
    }
    const trimmed = rawAnswer.trim();
    if (!trimmed) {
        return '';
    }
    const numericIndex = parseAnswerChoiceIndex(trimmed);
    if (numericIndex !== null) {
        return choices[numericIndex] || '';
    }
    const answerWithoutLeadingLabel = trimmed
        .replace(/^(?:answer|correct answer)\s*[:\-]?\s*/i, '')
        .replace(/^(?:정답|답)\s*[:：\-]?\s*/u, '')
        .trim();
    const labeledIndex = parseAnswerChoiceIndex(answerWithoutLeadingLabel);
    if (labeledIndex !== null) {
        return choices[labeledIndex] || '';
    }
    const normalizedAnswer = normalizeAnswerComparison(answerWithoutLeadingLabel);
    if (!normalizedAnswer) {
        return normalizeChoiceText(answerWithoutLeadingLabel);
    }
    const exactMatches = choices.filter((choice) => normalizeAnswerComparison(choice) === normalizedAnswer);
    if (exactMatches.length === 1) {
        return exactMatches[0];
    }
    const containedMatches = normalizedAnswer.length >= 2
        ? choices.filter((choice) => {
            const normalizedChoice = normalizeAnswerComparison(choice);
            return (normalizedChoice.includes(normalizedAnswer) ||
                normalizedAnswer.includes(normalizedChoice));
        })
        : [];
    if (containedMatches.length === 1) {
        return containedMatches[0];
    }
    return normalizeChoiceText(answerWithoutLeadingLabel);
}
function extractRawChoices(raw) {
    const candidate = raw.choices ?? raw.options ?? raw.items;
    if (Array.isArray(candidate)) {
        return candidate.flatMap((item) => {
            if (typeof item === 'string') {
                return splitChoiceStringSafely(item);
            }
            if (item && typeof item === 'object') {
                const text = item.text ?? item.label ?? item.value ?? item.content;
                return typeof text === 'string' ? splitChoiceStringSafely(text) : [];
            }
            return [];
        });
    }
    if (typeof candidate === 'string') {
        return splitChoiceStringSafely(candidate);
    }
    return [];
}
function normalizeQuestion(raw, index) {
    // Keep only real options from the model; validation should fail on missing choices,
    // not on placeholders we injected ourselves.
    const choices = extractRawChoices(raw)
        .filter((choice) => choice.length > 0)
        .slice(0, 5);
    const answerStr = resolveAnswerFromChoicesLoose(raw.answer, choices);
    return {
        id: index + 1,
        topic: raw.topic || '문항',
        type: 'multiple',
        stem: raw.stem || raw.question || '',
        choices,
        answer: answerStr,
        explanation: raw.explanation || '',
    };
}
async function requestQuestionsFromModel(input, feedback) {
    const prompt = buildQuestionPrompt({ ...input, validationFeedback: feedback }, input.builderMode);
    let rawJson = '';
    try {
        if (typeof input.openai?.responses?.create === 'function') {
            const resp = await input.openai.responses.create({
                model: input.model,
                input: [
                    { role: 'system', content: 'JSON 리스트만 반환하세요.' },
                    { role: 'user', content: prompt },
                ],
                text: { verbosity: 'low' },
            });
            rawJson = resp.output_text || '';
        }
        else {
            // Build messages for Chat Completion
            const messages = [
                { role: 'system', content: 'JSON 리스트만 반환하세요.' },
            ];
            const userContent = [{ type: 'text', text: prompt }];
            // 이미지 데이터가 있으면 멀티모달 형식으로 추가
            if (input.images && input.images.length > 0) {
                input.images.forEach((img) => {
                    userContent.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:${img.mimeType};base64,${img.data}`
                        }
                    });
                });
            }
            messages.push({ role: 'user', content: userContent });
            const resp = await input.openai.chat.completions.create({
                model: input.model,
                messages: messages,
            });
            rawJson = resp.choices[0].message.content || '';
        }
    }
    catch (err) {
        throw new Error(`AI 호출 실패: ${err.message}`);
    }
    const parsed = JSON.parse(extractJson(rawJson));
    let rawQuestions = [];
    if (Array.isArray(parsed)) {
        rawQuestions = parsed;
    }
    else if (parsed && typeof parsed === 'object') {
        rawQuestions = parsed.questions || parsed.result || parsed.data || parsed.items || [];
    }
    const questions = rawQuestions.length > 0
        ? rawQuestions.map((q, i) => normalizeQuestion(q, i))
        : [normalizeQuestion({
                stem: `AI 응답 파싱 실패 (내용: ${rawJson.substring(0, 50)}...)`,
                answer: '확인',
                choices: ['확인', '-', '-', '-', '-'],
                explanation: 'JSON 구조를 확인하세요.',
            }, 0)];
    if (input.builderMode === 'summary' && !Array.isArray(parsed)) {
        return {
            summary: parsed.summary || parsed.content || '요약 내용을 생성하지 못했습니다.',
            questions,
        };
    }
    return { questions };
}
async function generateValidatedQuestionBatch(input) {
    let feedback = [];
    for (let i = 1; i <= 3; i++) {
        try {
            const result = await requestQuestionsFromModel(input, feedback);
            const validation = validateGeneratedQuestions({
                questions: result.questions,
                count: input.count,
                subject: input.subject,
                difficulty: input.difficulty,
                schoolLevel: input.schoolLevel,
                format: input.format,
                questionType: input.questionType,
                title: input.title,
                topic: input.topic,
            });
            if (validation.isValid) {
                return {
                    title: input.title || 'Exam',
                    questions: result.questions,
                    summary: result.summary,
                    source: 'ai',
                    attempts: i,
                    validation,
                };
            }
            feedback = validation.reasons;
        }
        catch (e) {
            if (i === 3)
                throw e;
        }
    }
    const lastErrorMsg = feedback.length > 0 ? `\n사유: ${feedback.slice(0, 2).join(', ')}` : '';
    throw new Error(`3회 시도 후에도 유효한 결과를 얻지 못했습니다.${lastErrorMsg}`);
}
export async function generateValidatedQuestions(input) {
    if (input.count <= MAX_BATCH_SIZE) {
        return generateValidatedQuestionBatch(input);
    }
    const mergedQuestions = [];
    let mergedSummary;
    for (let i = 0; i < input.count; i += MAX_BATCH_SIZE) {
        const batch = await generateValidatedQuestionBatch({
            ...input,
            count: Math.min(MAX_BATCH_SIZE, input.count - i),
        });
        if (!mergedSummary)
            mergedSummary = batch.summary;
        mergedQuestions.push(...batch.questions.map((q, j) => ({ ...q, id: i + j + 1 })));
    }
    return {
        title: input.title || 'Combined Exam',
        questions: mergedQuestions,
        summary: mergedSummary,
        source: 'ai',
        attempts: 1,
        validation: { isValid: true, reasons: [], warnings: [], issueCounts: {} },
    };
}
