const EMPTY_STIMULUS_MARKERS = new Set(['', '-', '없음', 'null', 'undefined', 'none', 'n/a']);
export function hasStimulus(value) {
    if (typeof value !== 'string') {
        return false;
    }
    const normalized = value.trim();
    if (!normalized) {
        return false;
    }
    if (EMPTY_STIMULUS_MARKERS.has(normalized.toLowerCase())) {
        return false;
    }
    return /[가-힣a-zA-Z0-9]/.test(normalized);
}
