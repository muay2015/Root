const ZERO_WIDTH_PATTERN = /[\u200B-\u200D\u2060\uFEFF]/g;
const CHOICE_MARKER_PATTERN = /^(?:(?:\(?\d+\)?|[A-Za-z]|[\u3131-\u314E\uAC00-\uD7A3])[\.\)]|[\u2460-\u2473\u2022\u00B7\u25AA-])\s*/u;
const EMPTY_LATEX_PATTERN = /\\\(\s*\\\)|\\\[\s*\\\]/g;
export function isSingleFragment(value) {
    return /^[\p{L}\p{N}]$/u.test(value);
}
function isHangulOrDigitFragment(value) {
    return /^[\u3131-\u314E\uAC00-\uD7A3\p{N}]$/u.test(value);
}
export function isMeaninglessPlaceholder(value) {
    const normalized = value.trim().toLowerCase();
    return (normalized.length === 0 ||
        normalized === 'null' ||
        normalized === 'undefined' ||
        normalized === 'nan' ||
        /^choice\s*\d*$/i.test(normalized) ||
        /^option\s*\d*$/i.test(normalized) ||
        /^\uBCF4\uAE30\s*\d*$/u.test(normalized));
}
export function normalizeWhitespace(value) {
    return value
        .replace(ZERO_WIDTH_PATTERN, '')
        .replace(/\r\n/g, '\n')
        .replace(/[\t\f\v]+/g, ' ')
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
export function stripLeadingChoiceMarker(value) {
    let normalized = value.trim();
    while (CHOICE_MARKER_PATTERN.test(normalized)) {
        normalized = normalized.replace(CHOICE_MARKER_PATTERN, '').trimStart();
    }
    return normalized;
}
export function looksFullyFragmented(tokens) {
    if (tokens.length < 6) {
        return false;
    }
    const singleFragmentCount = tokens.filter(isSingleFragment).length;
    const singleFragmentRatio = singleFragmentCount / tokens.length;
    return singleFragmentRatio >= 0.85 && singleFragmentCount >= 6;
}
function looksMostlyFragmentedKorean(tokens) {
    if (tokens.length < 5) {
        return false;
    }
    const singleFragmentCount = tokens.filter(isSingleFragment).length;
    const hangulFragmentCount = tokens.filter(isHangulOrDigitFragment).length;
    const averageTokenLength = tokens.reduce((sum, token) => sum + token.length, 0) / tokens.length;
    return (singleFragmentCount / tokens.length >= 0.65 &&
        hangulFragmentCount >= Math.ceil(tokens.length * 0.5) &&
        averageTokenLength <= 1.6);
}
function mergeFragmentRuns(tokens) {
    const merged = [];
    let fragmentRun = [];
    const flushFragmentRun = () => {
        if (fragmentRun.length === 0) {
            return;
        }
        if (fragmentRun.length >= 2) {
            merged.push(fragmentRun.join(''));
        }
        else {
            merged.push(fragmentRun[0]);
        }
        fragmentRun = [];
    };
    for (const token of tokens) {
        if (isSingleFragment(token)) {
            fragmentRun.push(token);
            continue;
        }
        flushFragmentRun();
        merged.push(token);
    }
    flushFragmentRun();
    return merged;
}
export function normalizeChoiceText(value) {
    if (typeof value !== 'string') {
        return '';
    }
    const raw = value.trim();
    if (/^(?:\(?[1-5]\)?|[\u2460-\u2464])$/.test(raw)) {
        return raw;
    }
    // 0. 불필요한 빈 수식 기호 제거
    let normalized = (typeof value === 'string' ? value : '').replace(EMPTY_LATEX_PATTERN, '');
    // 0.1. 지문 내의 불필요한 슬래시(/) 구분자 줄바꿈 변환 (가독성 개선)
    // 양쪽에 공백이 있는 슬래시만 대상으로 하여 수학적 분수와 구분
    normalized = normalized.replace(/\s\/\s/g, '\n');
    // 1. 유니코드 이스케이프 및 수식 기호 정규화 (UI 렌더러와 동일하게)
    normalized = normalized
        .replace(/\\u221a/gi, '√')
        .replace(/\\u03c0/gi, 'π')
        .replace(/\\u03b1/gi, 'α')
        .replace(/\\u03b2/gi, 'β')
        .replace(/\\u00b1/gi, '±');
    // √ 기호와 명령어 사이의 일관성 유지
    normalized = normalized.replace(/√\s*(\d+|{[^}]*})/g, '\\sqrt{$1}')
        .replace(/√/g, '\\sqrt');
    const normalizedWhitespace = normalizeWhitespace(normalized);
    if (isMeaninglessPlaceholder(normalizedWhitespace)) {
        return '';
    }
    const strippedMarker = stripLeadingChoiceMarker(normalizedWhitespace);
    if (isMeaninglessPlaceholder(strippedMarker)) {
        return '';
    }
    const tokens = strippedMarker.split(' ').filter(Boolean);
    if (looksFullyFragmented(tokens) || looksMostlyFragmentedKorean(tokens)) {
        return tokens.join('');
    }
    return mergeFragmentRuns(tokens).join(' ').trim();
}
