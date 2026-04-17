import { SubjectKey } from '../subjectConfig';
import { isEnglishSubject } from './core';
/**
 * 내용 일치 유형 판별
 */
export function isEnglishContentMatchingType(params) {
    const questionType = String(params.questionType ?? '');
    const topicText = String(params.topic ?? '').toLowerCase();
    const stemText = String(params.stem ?? '').replace(/<[^>]+>/g, '').toLowerCase();
    return (isEnglishSubject(params.subject) &&
        (questionType.includes('내용 일치') ||
            questionType.includes('내용일치') ||
            topicText.includes('content match') ||
            stemText.includes('내용과 일치하는 것은') ||
            stemText.includes('내용과 일치하지 않는 것은') ||
            stemText.includes('consistent with the passage') ||
            stemText.includes('not consistent with the passage') ||
            stemText.includes('according to the passage') ||
            stemText.includes('matches the passage') ||
            stemText.includes('does not match the passage') ||
            stemText.includes('true about the passage') ||
            stemText.includes('not true about the passage')));
}
/**
 * 영어 내용 일치 문항 표준화
 */
export function standardizeEnglishContentMatching(params) {
    let stem = params.stem.replace(/\r\n/g, '\n').trim();
    stem = stem.replace(/<\/?u>/gi, '');
    const instructionPattern = /다음 글의 내용과 일치(?:하는|하지 않는) 것은\?/g;
    const matches = [...stem.matchAll(instructionPattern)];
    if (matches.length > 1 && matches[0].index !== undefined) {
        const firstEnd = (matches[0].index ?? 0) + matches[0][0].length;
        const afterFirst = stem.slice(firstEnd);
        stem = (stem.slice(0, firstEnd) + afterFirst.replace(instructionPattern, ''))
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
    return { stem, stimulus: null };
}
