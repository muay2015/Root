import { normalizeChoiceText } from "./normalizeChoiceText.js";
export function extractJson(text) {
    let clean = text.trim();
    if (clean.startsWith('```')) {
        const match = clean.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
        if (match) {
            clean = match[1].trim();
        }
    }
    // 이스케이프되지 않은 단독 백슬래시 보정
    clean = clean.replace(/(?<!\\)\\(?![\\"/bfnrtu])/g, '\\\\');
    // trailing comma 제거 (AI가 마지막 항목 뒤에 쉼표를 넣는 흔한 실수)
    clean = clean.replace(/,\s*([}\]])/g, '$1');
    // single-quoted 키/값을 double-quote로 변환 (문자열 내부의 apostrophe는 보존)
    // JSON 문맥에서만 동작: 줄 시작 또는 { , [ 뒤의 single-quoted 키
    clean = clean.replace(/(?<=[\[{,]\s*)'((?:[^'\\]|\\.)*?)'\s*:/g, '"$1":');
    // single-quoted 값: 콜론 뒤의 single-quoted 문자열
    clean = clean.replace(/:\s*'((?:[^'\\]|\\.)*?)'\s*(?=[,\]}])/g, ': "$1"');
    return clean;
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
export function extractRawChoices(raw) {
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
