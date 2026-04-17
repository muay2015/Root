/**
 * 영어 문장 삽입(Sentence Insertion) 표준화 모듈
 * 수능 표준 유형: 발문 → 네모 상자(삽입 문장) → 지문(①②③④⑤ 마커 포함)
 */
/**
 * <보기> / [보기] / <주어진 문장> / [주어진 문장] 블록을 텍스트에서 추출합니다.
 */
function extractStimulusBlock(text) {
    const pattern = /(?:<보기>|\[보기\]|<주어진\s*문장>|\[주어진\s*문장\])\s*([\s\S]*?)(?=\n\n|\n\s*(?:①|②|③|④|⑤|\(\s*[1-5]\s*\))|$)/;
    const match = text.match(pattern);
    if (!match)
        return null;
    const stimulus = match[1].trim();
    if (!stimulus)
        return null;
    const cleaned = text.replace(match[0], '').trim();
    return { stimulus, cleaned };
}
/**
 * 영어 문장 삽입 유형 표준화.
 *
 * - stimulus가 비어 있으면 instruction/passage 텍스트에서 <보기>/<주어진 문장> 블록을 추출합니다.
 * - 추출 실패 시 원본 값을 그대로 반환합니다.
 */
export function standardizeEnglishSentenceInsertion(params) {
    const { instruction, passage } = params;
    const resolvedStimulus = params.stimulus?.trim() ?? '';
    // stimulus가 이미 있으면 정리만 수행
    if (resolvedStimulus) {
        return { instruction, stimulus: resolvedStimulus, passage };
    }
    // passage에서 <보기> 추출 시도
    const fromPassage = extractStimulusBlock(passage);
    if (fromPassage) {
        return { instruction, stimulus: fromPassage.stimulus, passage: fromPassage.cleaned };
    }
    // instruction에서 <보기> 추출 시도 (발문에 제시문이 섞인 경우)
    const fromInstruction = extractStimulusBlock(instruction);
    if (fromInstruction) {
        return {
            instruction: fromInstruction.cleaned,
            stimulus: fromInstruction.stimulus,
            passage,
        };
    }
    return { instruction, stimulus: '', passage };
}
