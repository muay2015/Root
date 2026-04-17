import { SubjectKey } from '../subjectConfig';
import { resolveAnswerFromChoices } from '../answerMatching';
import { isEnglishSubject, normalizeEnglishPlainText, countEnglishWords } from './core';
export const CANONICAL_ORDER_CHOICES = [
    'A-B-C',
    'A-C-B',
    'B-A-C',
    'B-C-A',
    'C-A-B',
];
const ORDER_MARKER_REGEX = /(\(\s*([ABC])\s*\)|\[\s*([ABC])\s*\])/gi;
function sanitizeOrderMarkers(text) {
    return normalizeEnglishPlainText(text)
        .replace(/\(\s*([ABC])\s*\)\s*[_\-.~]{2,}/gi, '($1) ')
        .replace(/\[\s*([ABC])\s*\]\s*[_\-.~]{2,}/gi, '[$1] ')
        .replace(/\(\s*([ABC])\s*\)\s*_{1,}/gi, '($1) ')
        .replace(/\[\s*([ABC])\s*\]\s*_{1,}/gi, '[$1] ')
        .replace(/(\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\])\s{2,}/gi, '$1 ');
}
/**
 * 순서 배열 유형 판별
 */
export function isEnglishOrderArrangementType(params) {
    const selectionText = String(params.questionType ?? '');
    const topicText = String(params.topic ?? '');
    const stemText = String(params.stem ?? '');
    const hasAllOrderMarkers = /\(\s*A\s*\)/i.test(stemText) &&
        /\(\s*B\s*\)/i.test(stemText) &&
        /\(\s*C\s*\)/i.test(stemText);
    return (isEnglishSubject(params.subject) &&
        (selectionText.includes('순서 배열') ||
            topicText.includes('순서 배열') ||
            hasAllOrderMarkers));
}
/**
 * 지문에서 (A), (B), (C) 섹션 추출
 */
export function extractOrderArrangementSections(text) {
    const normalized = sanitizeOrderMarkers(text).replace(/([^\n])\s*(\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\])/g, '$1\n$2');
    const matches = [...normalized.matchAll(ORDER_MARKER_REGEX)];
    if (matches.length === 0)
        return [];
    return matches
        .map((match, index) => {
        const marker = match[1];
        const label = (match[2] || match[3] || '').toUpperCase();
        const start = (match.index ?? 0) + marker.length;
        const end = index + 1 < matches.length ? matches[index + 1].index ?? normalized.length : normalized.length;
        const content = normalized
            .slice(start, end)
            .replace(/^_+/g, '')
            .replace(/^\s*[:\-–—]?\s*/, '')
            .trim();
        return { label, content };
    })
        .filter((section) => ['A', 'B', 'C'].includes(section.label) && section.content.length > 0);
}
/**
 * 섹션을 지문 형태로 재구성
 */
export function reconstructOrderArrangementStem(sections, fallbackStem = '') {
    const ordered = ['A', 'B', 'C']
        .map((label) => sections.find((section) => section.label === label))
        .filter((section) => Boolean(section));
    if (ordered.length < 3)
        return sanitizeOrderMarkers(fallbackStem);
    return ordered.map((section) => `(${section.label}) ${section.content.trim()}`).join('\n\n').trim();
}
/**
 * 도입부(Stimulus) 추출
 */
export function extractOrderArrangementIntro(text) {
    const normalized = normalizeEnglishPlainText(text);
    if (!normalized)
        return null;
    const beforeMarker = normalized.replace(/\s*(\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\])[\s\S]*$/i, '').trim();
    if (!beforeMarker)
        return null;
    const lines = beforeMarker.split('\n').map((line) => line.trim()).filter((line) => {
        if (!line)
            return false;
        if (!/[A-Za-z]/.test(line))
            return false;
        if (/[\u3131-\u314E\uAC00-\uD7A3]/u.test(line))
            return false;
        if (/^\*/.test(line))
            return false;
        if (/^(?:\d+|[①-⑤])(?:\s|$)/.test(line))
            return false;
        if (/^\(?[A-C]\)?\s*[-–—]/i.test(line))
            return false;
        return true;
    });
    const intro = lines.join('\n').trim();
    if (!intro)
        return null;
    return /[A-Za-z]{12,}/.test(intro) || countEnglishWords(intro) >= 5 ? intro : null;
}
/**
 * 지문에서 누락된 경우 학습 자료에서 도입부 검색
 */
export function extractEnglishIntroFromMaterial(materialText) {
    const normalized = normalizeEnglishPlainText(materialText);
    if (!normalized)
        return null;
    const paragraphs = normalized.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    for (const paragraph of paragraphs) {
        const intro = extractOrderArrangementIntro(paragraph);
        if (intro)
            return intro;
    }
    const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
    const englishLines = lines.filter((line) => !/[\u3131-\u314E\uAC00-\uD7A3]/u.test(line) &&
        !/^\*/.test(line) &&
        !/\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\]/i.test(line) &&
        (/[A-Za-z]{12,}/.test(line) || countEnglishWords(line) >= 5));
    return englishLines.length > 0 ? englishLines.join('\n').trim() : null;
}
/**
 * (A), (B), (C) 단락 중 첫 문장을 도입부로 승격 (Heuristic)
 */
function promoteIntroFromSections(sections) {
    const nextSections = sections.map((section) => ({ ...section }));
    for (const label of ['A', 'B', 'C']) {
        const target = nextSections.find((section) => section.label === label);
        if (!target)
            continue;
        const sentenceMatch = target.content.match(/^(.+?[.!?](?=\s|$))(?:\s+|$)([\s\S]*)$/);
        if (!sentenceMatch)
            continue;
        const intro = sentenceMatch[1].trim();
        const remaining = sentenceMatch[2].trim();
        if ((countEnglishWords(intro) < 5 && !/[A-Za-z]{12,}/.test(intro)) || countEnglishWords(remaining) < 5) {
            continue;
        }
        target.content = remaining;
        return { stimulus: intro, sections: nextSections };
    }
    return { stimulus: null, sections: nextSections };
}
/**
 * 영어 순서 배열 문항 표준화
 */
export function standardizeEnglishOrderArrangement(params) {
    const normalizedStem = sanitizeOrderMarkers(params.stem);
    const normalizedStimulus = sanitizeOrderMarkers(params.stimulus);
    let sections = extractOrderArrangementSections(`${normalizedStimulus}\n${normalizedStem}`);
    let stimulus = extractOrderArrangementIntro(normalizedStimulus) ??
        extractOrderArrangementIntro(normalizedStem) ??
        extractEnglishIntroFromMaterial(params.materialText ?? '');
    if (!stimulus && sections.length > 0) {
        const promoted = promoteIntroFromSections(sections);
        stimulus = promoted.stimulus;
        sections = promoted.sections;
    }
    const choices = [...CANONICAL_ORDER_CHOICES];
    const answer = resolveAnswerFromChoices(params.answer, choices);
    return {
        stem: sanitizeOrderMarkers(reconstructOrderArrangementStem(sections, normalizedStem)),
        stimulus: stimulus || null,
        choices,
        answer,
        sections,
    };
}
/**
 * 순서 배열용 숫자 선택지(1,2,3,4,5)를 (A)-(B)-(C) 형태로 변환
 */
export function normalizeOrderArrangementChoiceDisplay(choices) {
    const isNumericOnly = choices.length === 5 &&
        choices.every((choice) => {
            const text = typeof choice === 'object' && choice !== null ? choice.display ?? choice.value : String(choice);
            return /^(?:[1-5]|[①-⑤])$/.test(text.trim());
        });
    if (!isNumericOnly)
        return choices;
    return choices.map((choice, index) => ({
        value: typeof choice === 'object' && choice !== null ? choice.value ?? String(index + 1) : String(choice),
        display: CANONICAL_ORDER_CHOICES[index] ?? String(index + 1),
    }));
}
