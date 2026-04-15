import {} from "./generationRules.js";
import { extractJson } from "./generatorParsing.js";
import { buildQuestionPrompt } from "./promptBuilder.js";
import { normalizeQuestion } from "./questionNormalizer.js";
import {} from "./subjectConfig.js";
import { validateGeneratedQuestions } from "./validator.js";
export class QuestionGenerationError extends Error {
    reasons;
    constructor(message, reasons = []) {
        super(message);
        this.name = 'QuestionGenerationError';
        this.reasons = reasons;
    }
}
const MAX_BATCH_SIZE = 5;
const CANONICAL_ORDER_CHOICES = ['A-B-C', 'A-C-B', 'B-A-C', 'B-C-A', 'C-A-B'];
const CANONICAL_IRRELEVANT_CHOICES = ['(1)', '(2)', '(3)', '(4)', '(5)'];
function autoNumberIrrelevantSentences(text) {
    // 이미 (1)~(5)가 있으면 그대로
    const existingNumbers = text.match(/\([1-5]\)/g);
    if (existingNumbers && new Set(existingNumbers).size >= 5) {
        return text;
    }
    // 한국어 발문과 영어 지문을 분리
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const instructionLines = [];
    const passageLines = [];
    for (const line of lines) {
        // 한국어가 포함된 줄은 발문으로 간주
        if (/[\u3131-\u314e\uac00-\ud7a3]/u.test(line) && passageLines.length === 0) {
            instructionLines.push(line);
        }
        else {
            passageLines.push(line);
        }
    }
    // 영어 문장 분리: 줄 단위 → 문장 단위
    const passageText = passageLines.join(' ');
    const sentences = passageText
        .split(/(?<=[.!?])\s+(?=[A-Z])/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10);
    if (sentences.length < 5) {
        return text;
    }
    // 상위 5문장에 번호 부여
    const numbered = sentences.slice(0, 5)
        .map((s, i) => `(${i + 1}) ${s.replace(/^\(\d\)\s*/, '')}`)
        .join(' ');
    return [...instructionLines, numbered].join('\n\n');
}
function normalizeEnglishIrrelevantSentence(question, input) {
    const isTargetType = String(input.subject).toLowerCase().includes('english') &&
        String(input.questionType ?? '').includes('관계없는 문장');
    if (!isTargetType) {
        return question;
    }
    let stem = String(question.stem ?? '');
    const stimulus = String(question.stimulus ?? '').trim();
    // stimulus에 지문이 있고 stem에 없으면 → stem으로 이동
    if (stimulus && /[A-Za-z]{10,}/.test(stimulus)) {
        stem = stem.trim() + '\n\n' + stimulus;
    }
    // 다양한 번호 형식을 (1)~(5)로 통일
    stem = stem
        .replace(/①/g, '(1)').replace(/②/g, '(2)').replace(/③/g, '(3)')
        .replace(/④/g, '(4)').replace(/⑤/g, '(5)')
        .replace(/(?:^|\n)\s*([1-5])\.\s+/g, (_, d) => `\n(${d}) `)
        .replace(/(?:^|\n)\s*([1-5])\)\s+/g, (_, d) => `\n(${d}) `)
        .replace(/\[\s*([1-5])\s*\]/g, '($1)');
    // 번호가 여전히 부족하면 → 문장 자동 분할 및 번호 부여
    const numberedCount = new Set((stem.match(/\([1-5]\)/g) ?? [])).size;
    if (numberedCount < 5) {
        stem = autoNumberIrrelevantSentences(stem);
    }
    // 발문이 없으면 추가
    if (!/관계\s*없는\s*문장|관계\s*없는 문장|irrelevant/iu.test(stem)) {
        stem = '다음 글에서 전체 흐름과 관계없는 문장은?\n\n' + stem;
    }
    // 선택지 정규화
    const choices = Array.isArray(question.choices) ? question.choices : [];
    const hasCanonical = choices.length === 5 &&
        choices.every((c, i) => String(c ?? '').trim() === CANONICAL_IRRELEVANT_CHOICES[i]);
    // 정답 정규화
    let answer = String(question.answer ?? '').trim();
    if (!CANONICAL_IRRELEVANT_CHOICES.includes(answer)) {
        const numMatch = answer.match(/[1-5]/);
        if (numMatch) {
            answer = `(${numMatch[0]})`;
        }
    }
    return {
        ...question,
        stem: stem.trim(),
        stimulus: '',
        choices: hasCanonical ? choices : [...CANONICAL_IRRELEVANT_CHOICES],
        answer,
    };
}
function normalizeEnglishEmotionAtmosphere(question, input) {
    const isTargetType = String(input.subject).toLowerCase().includes('english') &&
        String(input.questionType ?? '').includes('심경/분위기');
    if (!isTargetType) {
        return question;
    }
    const stem = String(question.stem ?? '');
    const choices = Array.isArray(question.choices) ? question.choices.map((c) => String(c ?? '').trim()) : [];
    const hasPairChoices = choices.filter((c) => /\s*\/\s*/.test(c)).length >= choices.length * 0.8;
    const hasStemChange = stem.includes('심경') && stem.includes('변화');
    // stem에 "심경 변화"가 있는데 선택지가 단일 단어 → stem에서 "변화" 제거
    if (hasStemChange && !hasPairChoices) {
        return {
            ...question,
            stem: stem.replace(/심경\s*변화/u, '심경'),
        };
    }
    // stem에 "심경"만 있고(변화 없음) 선택지가 pair → stem에 "변화" 추가
    if (stem.includes('심경') && !hasStemChange && hasPairChoices) {
        return {
            ...question,
            stem: stem.replace(/심경/u, '심경 변화'),
        };
    }
    return question;
}
function polishEnglishOrderQuestion(question, input) {
    const isOrderType = String(input.subject).toLowerCase().includes('english') &&
        String(input.questionType ?? '').includes('순서 배열');
    if (!isOrderType) {
        return question;
    }
    return {
        ...question,
        stem: String(question.stem ?? '')
            .replace(/\(\s*([ABC])\s*\)\s*[_\-.~]{1,}/gi, '($1) ')
            .replace(/\[\s*([ABC])\s*\]\s*[_\-.~]{1,}/gi, '[$1] ')
            .replace(/\n{3,}/g, '\n\n')
            .trim(),
        choices: [...CANONICAL_ORDER_CHOICES],
        answer: CANONICAL_ORDER_CHOICES.includes(String(question.answer ?? '').trim())
            ? String(question.answer ?? '').trim()
            : String(question.answer ?? ''),
    };
}
function normalizeFingerprintText(value) {
    return String(value ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}
function splitLiteratureStimulusParts(stimulus) {
    const raw = String(stimulus ?? '').trim();
    if (!raw) {
        return { passage: '', view: '' };
    }
    const normalized = raw.replace(/〈보기〉|\[보기\]|보기(?=\s)/g, '<보기>');
    const viewMatch = normalized.match(/([\s\S]*?)\n?\s*<보기>\s*\n?([\s\S]*)$/u);
    if (!viewMatch) {
        return { passage: normalized.trim(), view: '' };
    }
    return {
        passage: String(viewMatch[1] ?? '').trim(),
        view: String(viewMatch[2] ?? '').trim(),
    };
}
function splitLiteratureStimulusPartsSafe(stimulus) {
    const raw = String(stimulus ?? '').trim();
    if (!raw) {
        return { passage: '', view: '' };
    }
    const normalized = raw
        .replace(/〈보기〉/gu, '<보기>')
        .replace(/\[보기\]/gu, '<보기>')
        .replace(/(^|\n)\s*보기(?=\s|\n|$)/gu, '$1<보기>');
    const viewMatch = normalized.match(/([\s\S]*?)\n?\s*<보기>\s*\n?([\s\S]*)$/u);
    if (!viewMatch) {
        return { passage: normalized.trim(), view: '' };
    }
    return {
        passage: String(viewMatch[1] ?? '').trim(),
        view: String(viewMatch[2] ?? '').trim(),
    };
}
function buildGeneratedQuestionFingerprint(question) {
    const stem = normalizeFingerprintText(question.stem);
    const stimulus = normalizeFingerprintText(question.stimulus);
    const choices = (Array.isArray(question.choices) ? question.choices : [])
        .map((choice) => normalizeFingerprintText(choice))
        .filter(Boolean)
        .join(' | ');
    return [stem, stimulus, choices].filter(Boolean).join(' || ');
}
function normalizeEnglishOrderDraft(raw, input) {
    const isOrderType = String(input.subject).toLowerCase().includes('english') &&
        String(input.questionType ?? '').includes('순서 배열');
    if (!isOrderType || !raw || typeof raw !== 'object') {
        return raw;
    }
    const normalizedAnswer = String(raw.answer ?? '').trim();
    const stem = String(raw.stem ?? '')
        .replace(/\(\s*A\s*\)\s*[_\-.~]{1,}/g, '(A) ')
        .replace(/\(\s*B\s*\)\s*[_\-.~]{1,}/g, '(B) ')
        .replace(/\(\s*C\s*\)\s*[_\-.~]{1,}/g, '(C) ')
        .replace(/\[\s*A\s*\]\s*[_\-.~]{1,}/g, '[A] ')
        .replace(/\[\s*B\s*\]\s*[_\-.~]{1,}/g, '[B] ')
        .replace(/\[\s*C\s*\]\s*[_\-.~]{1,}/g, '[C] ')
        .trim();
    if (!CANONICAL_ORDER_CHOICES.includes(normalizedAnswer)) {
        return {
            ...raw,
            stem,
        };
    }
    return {
        ...raw,
        stem,
        choices: [...CANONICAL_ORDER_CHOICES],
        answer: normalizedAnswer,
    };
}
function classifyLiteratureRoleFromStem(stem) {
    const text = String(stem ?? '').replace(/\s+/g, ' ').trim();
    if (/보기|감상/u.test(text))
        return 'appreciation';
    if (/표현상 특징|표현의 효과|표현 방식|시어|심상|이미지/u.test(text))
        return 'expression';
    if (/화자|정서|태도|심경|정서 변화/u.test(text))
        return 'speaker';
    if (/상황|장면|기능|갈등|전개/u.test(text))
        return 'scene';
    return 'other';
}
function classifyLiteratureRoleFromStemSafe(stem) {
    const text = String(stem ?? '').replace(/\s+/g, ' ').trim();
    if (/(?:보기|감상)/u.test(text))
        return 'appreciation';
    if (/(?:표현상\s*특징|표현의\s*효과|표현\s*방식|시어|심상|이미지)/u.test(text))
        return 'expression';
    if (/(?:화자|정서|태도|심경|정서\s*변화)/u.test(text))
        return 'speaker';
    if (/(?:상황|장면|기능|갈등|전개)/u.test(text))
        return 'scene';
    return 'other';
}
function findOverlappingLiteratureRoles(questions) {
    const roleMap = new Map();
    questions.forEach((question, idx) => {
        const role = classifyLiteratureRoleFromStemSafe(question.stem);
        const seen = roleMap.get(role) ?? [];
        seen.push(idx + 1);
        roleMap.set(role, seen);
    });
    return [...roleMap.entries()].filter(([role, indexes]) => role !== 'other' && indexes.length >= 2);
}
function countSharedFingerprintTokens(a, b) {
    const tokensA = a.split(/\s+/).filter((token) => token.length >= 2);
    const tokensB = new Set(b.split(/\s+/).filter((token) => token.length >= 2));
    if (tokensA.length === 0 || tokensB.size === 0) {
        return 0;
    }
    let overlap = 0;
    tokensA.forEach((token) => {
        if (tokensB.has(token)) {
            overlap += 1;
        }
    });
    return overlap / Math.max(tokensA.length, tokensB.size);
}
function harmonizeLiteratureSetStimulus(questions) {
    if (questions.length <= 1) {
        return questions;
    }
    const candidates = questions
        .map((question) => splitLiteratureStimulusPartsSafe(question.stimulus).passage)
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);
    const canonicalPassage = candidates[0] ?? '';
    if (!canonicalPassage) {
        return questions;
    }
    return questions.map((question) => ({
        ...question,
        stimulus: (() => {
            const { view } = splitLiteratureStimulusPartsSafe(question.stimulus);
            return view ? `${canonicalPassage}\n\n<보기>\n${view}` : canonicalPassage;
        })(),
    }));
}
function buildFallbackQuestion(rawJson, context) {
    return normalizeQuestion({
        stem: `AI output parse failed (${rawJson.substring(0, 50)}...)`,
        answer: '확인',
        choices: ['확인', '-', '-', '-', '-'],
        explanation: 'JSON 구조를 확인하세요.',
    }, 0, context);
}
async function createModelResponse(input, prompt) {
    if (typeof input.openai?.responses?.create === 'function') {
        const response = await input.openai.responses.create({
            model: input.model,
            input: [
                { role: 'system', content: 'Return JSON only.' },
                { role: 'user', content: prompt },
            ],
            text: { verbosity: 'medium' },
        });
        return response.output_text || '';
    }
    const messages = [{ role: 'system', content: 'Return JSON only.' }];
    const userContent = [{ type: 'text', text: prompt }];
    if (input.images && input.images.length > 0) {
        input.images.forEach((img) => {
            userContent.push({
                type: 'image_url',
                image_url: {
                    url: `data:${img.mimeType};base64,${img.data}`,
                },
            });
        });
    }
    messages.push({ role: 'user', content: userContent });
    const response = await input.openai.chat.completions.create({
        model: input.model,
        messages,
    });
    return response.choices[0]?.message?.content || '';
}
async function requestQuestionsFromModel(input, feedback) {
    const prompt = buildQuestionPrompt({ ...input, validationFeedback: feedback }, input.builderMode);
    let rawJson = '';
    try {
        rawJson = await createModelResponse(input, prompt);
    }
    catch (error) {
        throw new QuestionGenerationError(`AI 호출 실패: ${error.message}`);
    }
    const parsed = JSON.parse(extractJson(rawJson));
    let rawQuestions = [];
    const flattenEnglishOrderObject = (value) => {
        if (!value ||
            typeof value !== 'object' ||
            !String(input.subject).toLowerCase().includes('english') ||
            !String(input.questionType ?? '').includes('순서 배열')) {
            return [];
        }
        const intro = String(value?.intro ?? '').trim();
        const sections = value?.sections ?? {};
        const sectionA = String(sections?.A ?? '').trim();
        const sectionB = String(sections?.B ?? '').trim();
        const sectionC = String(sections?.C ?? '').trim();
        const correctOrder = String(value?.correct_order ?? '').trim();
        if (!intro || !sectionA || !sectionB || !sectionC || !CANONICAL_ORDER_CHOICES.includes(correctOrder)) {
            return [];
        }
        return [
            {
                topic: String(value?.topic ?? 'English Reading').trim() || 'English Reading',
                type: 'multiple',
                stem: '다음 글의 흐름으로 보아, 주어진 문장 다음에 이어질 순서로 가장 적절한 것은?\n\n' +
                    `(A) ${sectionA}\n\n` +
                    `(B) ${sectionB}\n\n` +
                    `(C) ${sectionC}`,
                choices: [...CANONICAL_ORDER_CHOICES],
                answer: correctOrder,
                explanation: String(value?.explanation ?? '').trim(),
                stimulus: intro,
            },
        ];
    };
    const flattenKoreanLiteratureSets = (value) => {
        const sets = Array.isArray(value?.sets) ? value.sets : [];
        const flattened = [];
        sets.forEach((set) => {
            const passage = String(set?.passage ?? '').trim();
            const items = Array.isArray(set?.items) ? set.items : [];
            items.forEach((item) => {
                const view = item?.view == null
                    ? ''
                    : String(item.view)
                        .replace(/^(?:<보기>|〈보기〉|\[보기\]|보기)\s*/u, '')
                        .trim();
                flattened.push({
                    ...item,
                    stimulus: view ? `${passage}\n\n<보기>\n${view}` : passage,
                });
            });
        });
        return flattened;
    };
    if (Array.isArray(parsed)) {
        rawQuestions = parsed.flatMap((item) => {
            const flattened = flattenEnglishOrderObject(item);
            return flattened.length > 0 ? flattened : [item];
        });
    }
    else if (parsed && typeof parsed === 'object') {
        rawQuestions =
            flattenEnglishOrderObject(parsed).length > 0
                ? flattenEnglishOrderObject(parsed)
                :
                    flattenKoreanLiteratureSets(parsed).length > 0
                        ? flattenKoreanLiteratureSets(parsed)
                        : parsed.questions || parsed.result || parsed.data || parsed.items || [];
    }
    // 관계없는 문장: AI raw 출력 진단 및 passage/text/content/body 키 병합
    const isIrrelevantType = String(input.subject).toLowerCase().includes('english') &&
        String(input.questionType ?? '').includes('관계없는 문장');
    if (isIrrelevantType && rawQuestions.length > 0) {
        const sample = rawQuestions[0];
        console.log(`[Generator] IRRELEVANT RAW KEYS: ${Object.keys(sample).join(', ')}`);
        console.log(`[Generator] IRRELEVANT RAW stem length=${String(sample.stem ?? '').length}, passage=${String(sample.passage ?? '').length}, text=${String(sample.text ?? '').length}`);
    }
    if (isIrrelevantType) {
        rawQuestions.forEach((q, idx) => {
            const stemText = String(q.stem ?? '').trim();
            const hasPassageInStem = /\([1-5]\)/.test(stemText) || (stemText.length > 100 && /[A-Za-z]{10,}/.test(stemText));
            if (!hasPassageInStem) {
                const extraPassage = String(q.passage ?? q.text ?? q.content ?? q.body ?? '').trim();
                if (extraPassage && /[A-Za-z]{10,}/.test(extraPassage)) {
                    q.stem = stemText + '\n\n' + extraPassage;
                    if (idx === 0)
                        console.log(`[Generator] MERGE OK: stem now ${q.stem.length} chars, first 120: ${q.stem.slice(0, 120)}`);
                }
            }
        });
    }
    // 요약문 완성: AI raw 출력 진단 및 passage/text/content/body 키 병합
    const isSummaryCompletionRaw = String(input.subject).toLowerCase().includes('english') &&
        (String(input.questionType ?? '').includes('요약문') || String(input.questionType ?? '').includes('summary'));
    if (isSummaryCompletionRaw && rawQuestions.length > 0) {
        const sample = rawQuestions[0];
        console.log(`[Generator] SUMMARY RAW KEYS: ${Object.keys(sample).join(', ')}`);
        console.log(`[Generator] SUMMARY RAW stem=${String(sample.stem ?? '').length}자, stimulus=${String(sample.stimulus ?? '').length}자, passage=${String(sample.passage ?? '').length}자`);
        console.log(`[Generator] SUMMARY RAW stem preview: ${String(sample.stem ?? '').slice(0, 150)}`);
    }
    if (isSummaryCompletionRaw) {
        rawQuestions.forEach((q, idx) => {
            const stemText = String(q.stem ?? '').trim();
            const stimulusText = String(q.stimulus ?? '').trim();
            const hasEnglishInStem = /[A-Za-z]{10,}/.test(stemText) && stemText.length > 100;
            if (!hasEnglishInStem) {
                // 1) passage/text/content/body 필드에 지문이 있는 경우 병합
                const extraPassage = String(q.passage ?? q.text ?? q.content ?? q.body ?? '').trim();
                if (extraPassage && /[A-Za-z]{10,}/.test(extraPassage)) {
                    q.stem = stemText + '\n\n' + extraPassage;
                    if (idx === 0)
                        console.log(`[Generator] SUMMARY MERGE(passage field): stem now ${q.stem.length}자`);
                }
                // 2) stimulus에 지문+요약문이 섞인 경우: (A)/(B)를 포함한 문장만 stimulus로 남기고 나머지를 stem에 병합
                else if (stimulusText.length > 80 && /[A-Za-z]{10,}/.test(stimulusText)) {
                    let instruction = stemText || '다음 글의 내용을 한 문장으로 요약할 때, 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?';
                    let cleanedStimulus = stimulusText
                        .replace(/다음 글의 내용을 한 문장으로 요약할 때,[^?]*\?/g, '')
                        .replace(/윗글의 내용을 한 문장으로 요약할 때,[^?]*\?/g, '')
                        .trim();
                    const segments = cleanedStimulus.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
                    const summaryIdx = segments.findIndex(s => /\(\s*A\s*\)/i.test(s) && /\(\s*B\s*\)/i.test(s) && /[A-Za-z]{3,}/.test(s));
                    if (summaryIdx !== -1) {
                        let summaryLine = segments[summaryIdx];
                        // 혹시 분할 과정에서 summaryLine 앞에 .?!가 없어서 이전 문장과 결합된 경우를 대비 (fallback match)
                        // (보통 정상이지만, 너무 길면 비정상)
                        if (summaryLine.length > 250) {
                            const fallbackMatch = summaryLine.match(/([A-Z"'][^.!?]*\(\s*A\s*\).*?\(\s*B\s*\).*?(?:[.!?]|$))/i);
                            if (fallbackMatch) {
                                summaryLine = fallbackMatch[1].trim();
                            }
                        }
                        const passage = cleanedStimulus.replace(summaryLine, '').trim();
                        if (passage.length > 50) {
                            q.stem = instruction + '\n\n' + passage;
                            q.stimulus = summaryLine;
                            if (idx === 0)
                                console.log(`[Generator] SUMMARY MERGE(sentence split): stem now ${q.stem.length}자, stimulus=${q.stimulus.length}자`);
                        }
                    }
                    else {
                        // 완전히 못 찾은 경우 정규식으로 직접 추출 시도 (줄바꿈/온점 오류 극복)
                        const fallbackMatch = cleanedStimulus.match(/([A-Z"'].*?\(\s*A\s*\).*?\(\s*B\s*\).*?(?:[.!?]|$))/i);
                        if (fallbackMatch && fallbackMatch[1].length < 250) {
                            const summaryLine = fallbackMatch[1].trim();
                            const passage = cleanedStimulus.replace(summaryLine, '').trim();
                            if (passage.length > 50) {
                                q.stem = instruction + '\n\n' + passage;
                                q.stimulus = summaryLine;
                                if (idx === 0)
                                    console.log(`[Generator] SUMMARY MERGE(regex fallback): stem now ${q.stem.length}자, stimulus=${q.stimulus.length}자`);
                            }
                        }
                    }
                }
            }
        });
    }
    const context = {
        subject: input.subject,
        questionType: input.questionType,
        materialText: input.materialText,
    };
    const questions = rawQuestions.length > 0
        ? rawQuestions.map((question, index) => {
            const normalized = normalizeQuestion(normalizeEnglishOrderDraft(question, input), index, context);
            if (isIrrelevantType && index === 0) {
                console.log(`[Generator] AFTER normalizeQuestion: stem length=${normalized.stem.length}, first 120: ${normalized.stem.slice(0, 120)}`);
            }
            return normalized;
        })
        : [buildFallbackQuestion(rawJson, context)];
    if (input.builderMode === 'summary' && !Array.isArray(parsed)) {
        return {
            summary: parsed.summary || parsed.content || '요약 내용을 생성하지 못했습니다.',
            questions,
        };
    }
    return { questions };
}
function buildRetryFeedback(requestedCount, returnedCount, remainingCount) {
    return [
        `You returned ${returnedCount} question(s), but ${requestedCount} were requested.`,
        `Return exactly ${remainingCount} additional complete questions in the same JSON schema.`,
    ];
}
function buildEnglishTypeRetryHints(input, reasons) {
    const questionType = String(input.questionType ?? '');
    const isEnglish = String(input.subject).toLowerCase().includes('english');
    if (!isEnglish) {
        return [];
    }
    if (questionType.includes('순서 배열')) {
        return [
            'For sentence ordering, use section labels (A), (B), and (C) only. Never write (A)_______.',
            'For sentence ordering, choices must be exactly ["A-B-C","A-C-B","B-A-C","B-C-A","C-A-B"].',
            'For sentence ordering, answer must exactly equal one of those five choice strings.',
            ...reasons.filter((reason) => reason.toLowerCase().includes('sentence ordering') || reason.toLowerCase().includes('answer must match')),
        ];
    }
    if (questionType.includes('문장 삽입')) {
        return [
            'For sentence insertion, stimulus must contain only the given sentence, not the full passage.',
            'For sentence insertion, choices must be exactly ["①","②","③","④","⑤"].',
            'For sentence insertion, the passage in stem must contain all five markers (1) through (5).',
            ...reasons.filter((reason) => reason.toLowerCase().includes('sentence insertion') || reason.toLowerCase().includes('stimulus')),
        ];
    }
    if (questionType.includes('요약문 완성')) {
        return [
            'For summary completion, stem MUST contain both the Korean instruction AND the full English passage.',
            'stem format: "다음 글의 내용을 한 문장으로 요약할 때, 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?\\n\\n[English passage here]"',
            'stimulus must contain ONLY the English summary sentence with (A)_______ and (B)_______. Do NOT put the passage in stimulus.',
            'For summary completion, choices must stay in "word_A / word_B" format only.',
        ];
    }
    if (questionType.includes('심경/분위기')) {
        return [
            'For emotion/atmosphere, stem must explicitly ask about 심경 or 분위기, not the main idea.',
            'There are three valid sub-types: (A) "심경 변화" — stem contains "의 심경 변화", choices are "word_A / word_B" pairs; (B) "심경" without "변화" — choices are single emotion words; (C) "분위기" — choices are single mood words.',
            'Do NOT mix formats: only "심경 변화" uses "A / B" pair choices. Single 심경 and 분위기 must use single-word choices.',
            ...reasons.filter((reason) => reason.toLowerCase().includes('emotion') || reason.toLowerCase().includes('심경') || reason.toLowerCase().includes('분위기')),
        ];
    }
    if (questionType.includes('관계없는 문장')) {
        return [
            'For irrelevant sentence, stem must contain exactly five numbered sentences labeled (1) to (5).',
            'For irrelevant sentence, choices must be exactly ["(1)","(2)","(3)","(4)","(5)"].',
            'For irrelevant sentence, do not use stimulus.',
        ];
    }
    if (questionType.includes('빈칸')) {
        return [
            'For blank inference, include exactly one visible blank written as _________.',
            'Do not convert (A), (B), or section labels into the blank.',
        ];
    }
    return [];
}
function buildKoreanLiteratureVariationHint(slotIndex, totalCount) {
    const patterns = [
        'Generate a speaker-attitude or emotional-movement item.',
        'Generate an expression-feature or imagery-function item.',
        'Generate an appreciation item using <보기> only as an interpretive lens.',
        'Generate an item that requires combining two textual clues instead of relying on one obvious line.',
        'Generate a conflict, choice, or scene-function item if the passage is prose-like; otherwise generate a diction/tone item.',
        'Generate an item with a clearly different passage situation and answer logic from the previous items.',
    ];
    const pattern = patterns[slotIndex % patterns.length];
    return [
        `This is item slot ${slotIndex + 1} of ${totalCount}.`,
        pattern,
        'Do not reuse the same passage setup, emotional conclusion, stem pattern, or distractor logic used in other items of this batch.',
    ].join(' ');
}
function buildKoreanLiteratureSetHint(setIndex, groupSize, totalCount) {
    const rolePlans = [
        ['speaker-attitude or emotional-movement', 'expression-feature or imagery-function', 'appreciation with <보기>'],
        ['diction or tone', 'scene-function or situation development', 'two-clue interpretive inference'],
        ['conflict or choice analysis', 'narrative perspective or distance', 'appreciation with a different interpretive lens'],
    ];
    const profilePlans = [
        'a lyric poem of recollection and restrained loss in a quiet domestic or natural scene',
        'a prose-like scene with visible tension, hesitation, choice, or interpersonal conflict',
        'a poem centered on perception, seasonal change, object contemplation, or self-reflection rather than explicit loss',
    ];
    const selectedPlan = rolePlans[setIndex % rolePlans.length];
    const plannedRoles = selectedPlan.slice(0, groupSize);
    const selectedProfile = profilePlans[setIndex % profilePlans.length];
    return [
        `Generate a korean literature set with exactly ${groupSize} questions for set ${setIndex + 1}.`,
        `All ${groupSize} questions in this set MUST share the same literary passage in stimulus.`,
        `Use one shared passage and write ${groupSize} different stems against that same passage.`,
        `Use this set profile: ${selectedProfile}.`,
        `Distribute the item roles in this set exactly as follows: ${plannedRoles.join('; ')}.`,
        'Within the set, do not repeat the same stem pattern, answer logic, or distractor structure.',
        `Across the full batch of ${totalCount} questions, this set must also differ from previously accepted sets in passage situation and interpretation focus.`,
    ].join(' ');
}
async function generateValidatedQuestionBatch(input) {
    let feedback = [];
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            console.log(`\n[Generator] Batch Attempt ${attempt}/3 starting... (Count: ${input.count}, Type: ${input.questionType || 'Mixed'})`);
            const collectedQuestions = [];
            const seenFingerprints = new Set();
            let collectedSummary;
            let generationFeedback = feedback;
            const shouldGenerateLiteratureSets = input.subject === 'korean_literature' && input.count > 1;
            if (shouldGenerateLiteratureSets) {
                let setIndex = 0;
                let literatureBatchFailed = false;
                while (collectedQuestions.length < input.count) {
                    const remainingCount = input.count - collectedQuestions.length;
                    const groupSize = Math.min(3, remainingCount);
                    let accepted = false;
                    let lastSetFailureReason = '';
                    for (let subAttempt = 0; subAttempt < 3 && !accepted; subAttempt += 1) {
                        console.log(`  - Set ${setIndex + 1}, attempt ${subAttempt + 1}: Fetching ${groupSize} korean literature questions sharing one passage...`);
                        const partial = await requestQuestionsFromModel({
                            ...input,
                            count: groupSize,
                        }, [
                            ...generationFeedback,
                            buildKoreanLiteratureSetHint(setIndex, groupSize, input.count),
                            ...(collectedQuestions.length > 0
                                ? [`Already accepted ${collectedQuestions.length} unique item(s) from previous literature sets. The new set must use a different passage situation.`]
                                : []),
                        ]);
                        if (!collectedSummary && partial.summary) {
                            collectedSummary = partial.summary;
                        }
                        if (partial.questions.length !== groupSize) {
                            lastSetFailureReason = `The model did not return exactly ${groupSize} questions for one set.`;
                            generationFeedback = [
                                `Return exactly ${groupSize} complete questions for one shared-passage literature set.`,
                                `All questions in the set must share the same base passage.`,
                                buildKoreanLiteratureSetHint(setIndex, groupSize, input.count),
                            ];
                            continue;
                        }
                        const harmonizedQuestions = harmonizeLiteratureSetStimulus(partial.questions);
                        const normalizedStimuli = harmonizedQuestions
                            .map((question) => normalizeFingerprintText(splitLiteratureStimulusPartsSafe(question.stimulus).passage))
                            .filter(Boolean);
                        const uniqueStimuli = new Set(normalizedStimuli);
                        if (uniqueStimuli.size !== 1) {
                            lastSetFailureReason = 'The model did not keep one shared passage across the set.';
                            generationFeedback = [
                                `The previous response did not keep one shared passage across the set.`,
                                `Return exactly ${groupSize} questions that all use the same base passage text.`,
                                buildKoreanLiteratureSetHint(setIndex, groupSize, input.count),
                            ];
                            continue;
                        }
                        const uniqueQuestions = harmonizedQuestions.filter((question) => {
                            const fingerprint = buildGeneratedQuestionFingerprint(question);
                            if (!fingerprint) {
                                return true;
                            }
                            if (seenFingerprints.has(fingerprint)) {
                                return false;
                            }
                            seenFingerprints.add(fingerprint);
                            return true;
                        });
                        if (uniqueQuestions.length !== groupSize) {
                            lastSetFailureReason = 'The model repeated an existing item or duplicated a question inside the set.';
                            generationFeedback = [
                                `The previous response repeated an existing item or duplicated a question inside the set.`,
                                `Return exactly ${groupSize} distinct questions sharing one passage.`,
                                buildKoreanLiteratureSetHint(setIndex, groupSize, input.count),
                            ];
                            continue;
                        }
                        const overlappingRoles = findOverlappingLiteratureRoles(uniqueQuestions);
                        if (overlappingRoles.length > 0) {
                            const overlapText = overlappingRoles
                                .map(([role, indexes]) => `${role}(${indexes.join(', ')})`)
                                .join(', ');
                            lastSetFailureReason = `The set repeated the same role inside the set: ${overlapText}.`;
                            generationFeedback = [
                                `The previous shared-passage set repeated the same question role inside the set: ${overlapText}.`,
                                `Return exactly ${groupSize} questions sharing one passage, but each stem must have a different role.`,
                                `Allowed role split examples: speaker + expression; speaker + appreciation; expression + scene; speaker + expression + appreciation.`,
                                buildKoreanLiteratureSetHint(setIndex, groupSize, input.count),
                            ];
                            continue;
                        }
                        collectedQuestions.push(...uniqueQuestions);
                        accepted = true;
                        setIndex += 1;
                        console.log(`    + Accepted literature set of ${groupSize} questions. (Progress: ${collectedQuestions.length}/${input.count})`);
                    }
                    if (!accepted) {
                        feedback = [
                            `Failed to build literature set ${setIndex + 1} after 3 tries.`,
                            lastSetFailureReason || `The model did not satisfy the shared-passage set requirements.`,
                            buildKoreanLiteratureSetHint(setIndex, groupSize, input.count),
                        ];
                        literatureBatchFailed = true;
                        break;
                    }
                }
                if (literatureBatchFailed || collectedQuestions.length < input.count) {
                    console.warn(`[Generator] WARNING: Literature set generation ended with ${collectedQuestions.length}/${input.count} questions. Retrying whole batch with focused feedback...`);
                    feedback = [
                        ...feedback,
                        `You must return exactly ${input.count} questions total, arranged as shared-passage literature sets of up to 3 items.`,
                        `Do not return zero items. If one set fails, still continue producing the remaining required sets.`,
                    ];
                    continue;
                }
            }
            else {
                for (let subAttempt = 0; subAttempt < 3 && collectedQuestions.length < input.count; subAttempt += 1) {
                    const remainingCount = input.count - collectedQuestions.length;
                    console.log(`  - Sub-Attempt ${subAttempt + 1}: Fetching ${remainingCount} questions from AI...`);
                    const partial = await requestQuestionsFromModel({
                        ...input,
                        count: remainingCount,
                    }, generationFeedback);
                    if (!collectedSummary && partial.summary) {
                        collectedSummary = partial.summary;
                    }
                    if (partial.questions.length === 0) {
                        console.warn(`    ! AI returned zero questions. Retrying sub-attempt...`);
                        generationFeedback = [
                            `Return exactly ${remainingCount} complete questions in a JSON array. Do not return zero items.`,
                        ];
                        continue;
                    }
                    const uniqueQuestions = partial.questions.filter((question) => {
                        const fingerprint = buildGeneratedQuestionFingerprint(question);
                        if (!fingerprint) {
                            return true;
                        }
                        if (seenFingerprints.has(fingerprint)) {
                            return false;
                        }
                        seenFingerprints.add(fingerprint);
                        return true;
                    });
                    collectedQuestions.push(...uniqueQuestions);
                    console.log(`    + Received ${partial.questions.length} questions, accepted ${uniqueQuestions.length} unique questions. (Progress: ${collectedQuestions.length}/${input.count})`);
                    if (collectedQuestions.length < input.count) {
                        const duplicateCount = partial.questions.length - uniqueQuestions.length;
                        generationFeedback = [
                            ...buildRetryFeedback(remainingCount, uniqueQuestions.length, input.count - collectedQuestions.length),
                            ...(duplicateCount > 0
                                ? [
                                    `Do not repeat previously generated items. ${duplicateCount} duplicate question(s) were rejected in the last attempt.`,
                                    'Use a completely different topic and passage for each new question.',
                                ]
                                : []),
                        ];
                    }
                }
            }
            const result = {
                questions: (collectedQuestions.length > input.count
                    ? collectedQuestions.slice(0, input.count)
                    : collectedQuestions).map((q) => normalizeEnglishIrrelevantSentence(normalizeEnglishEmotionAtmosphere(q, input), input)),
                summary: collectedSummary,
            };
            console.log(`  - Validating ${result.questions.length} questions...`);
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
                console.log(`[Generator] SUCCESS: Batch Validation passed on attempt ${attempt}.`);
                const polishedQuestions = result.questions.map((question) => polishEnglishOrderQuestion(question, input));
                return {
                    title: input.title || 'Exam',
                    questions: polishedQuestions,
                    summary: result.summary,
                    source: 'ai',
                    attempts: attempt,
                    validation,
                };
            }
            console.warn(`[Generator] WARNING: Batch Validation failed on attempt ${attempt}. Reasons (first 2):`, validation.reasons.slice(0, 2));
            // 재시도 실패 원인 진단을 돕기 위해, 마지막 시도에서 실패한 문항의 실제 내용을 로그로 남긴다.
            // (normalizer/validator 수정 없이도 "AI가 실제로 어떤 포맷을 반환했는지"를 바로 확인할 수 있게 함.)
            // 개인정보가 아닌 문항 텍스트만 출력하고, 길이를 잘라 로그 폭주를 방지한다.
            if (attempt === 3) {
                const truncate = (value, max = 400) => {
                    const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
                    return text.length > max ? `${text.slice(0, max)}…(+${text.length - max}자)` : text;
                };
                console.warn(`[Generator] DIAGNOSTIC: Dumping failed questions (subject=${input.subject}, questionType=${input.questionType ?? 'N/A'}, difficulty=${input.difficulty})`);
                result.questions.forEach((q, i) => {
                    console.warn(`  [Q${i + 1}] topic=${truncate(q?.topic, 80)}\n       stem=${truncate(q?.stem)}\n       stimulus=${truncate(q?.stimulus)}\n       choices=${truncate(q?.choices, 200)}\n       answer=${truncate(q?.answer, 80)}`);
                });
                console.warn(`[Generator] DIAGNOSTIC: All validation reasons:`, validation.reasons);
            }
            feedback = [
                ...validation.reasons,
                ...buildEnglishTypeRetryHints(input, validation.reasons),
            ];
        }
        catch (error) {
            console.error(`[Generator] ERROR on attempt ${attempt}:`, error.message);
            if (attempt === 3) {
                throw error;
            }
        }
    }
    const suffix = feedback.length > 0 ? `\n사유: ${feedback.slice(0, 2).join(', ')}` : '';
    throw new QuestionGenerationError(`3회 시도 후에도 유효한 결과를 얻지 못했습니다.${suffix}`, feedback);
}
export async function generateValidatedQuestions(input) {
    if (input.count <= MAX_BATCH_SIZE) {
        return generateValidatedQuestionBatch(input);
    }
    const mergedQuestions = [];
    let mergedSummary;
    // 병렬 처리를 위한 배치 입력 그룹 생성
    const batchRequests = [];
    for (let offset = 0; offset < input.count; offset += MAX_BATCH_SIZE) {
        batchRequests.push(generateValidatedQuestionBatch({
            ...input,
            count: Math.min(MAX_BATCH_SIZE, input.count - offset),
        }));
    }
    console.log(`[Generator] Starting ${batchRequests.length} batches IN PARALLEL...`);
    // 모든 배치를 병렬로 실행
    const results = await Promise.all(batchRequests);
    // 결과 병합 및 ID 재할당
    results.forEach((batch, batchIdx) => {
        const offset = batchIdx * MAX_BATCH_SIZE;
        if (!mergedSummary && batch.summary) {
            mergedSummary = batch.summary;
        }
        mergedQuestions.push(...batch.questions.map((q, i) => ({ ...q, id: offset + i + 1 })));
    });
    return {
        title: input.title || 'Combined Exam',
        questions: mergedQuestions.slice(0, input.count),
        summary: mergedSummary,
        source: 'ai',
        attempts: 1, // 개별 배치는 이미 여러 번 시도했을 수 있음
        validation: { isValid: true, reasons: [], warnings: [], issueCounts: {} },
    };
}
