import { usesNoSelector } from "../subjectConfig.js";
import { pushReason, tokenize, countWords, countKoreanCharacters } from "./utils.js";
/**
 * 일반적인 난이도 규칙을 검증합니다.
 */
export function validateGenericDifficulty(question, index, input, reasons, warnings, issueCounts) {
    const difficulty = input.difficulty;
    const stemWords = countWords(question.stem);
    const stemKoreanChars = countKoreanCharacters(question.stem);
    const explanationWords = countWords(question.explanation);
    const directCuePattern = /\bwhat is stated|which is true|directly\b|다음 중 옳은 것|맞는 것/i;
    // 과목 분류 확인
    const subjectLower = String(input.subject).toLowerCase();
    const isEnglish = subjectLower.includes('english');
    const isMath = subjectLower.includes('math');
    const isKoreanLiterature = String(input.subject) === 'korean_literature';
    const isKoreanReading = String(input.subject) === 'korean_reading';
    const hasCsatLiteratureReasoningStem = isKoreanLiterature &&
        /(?:화자|정서|태도|심경|감상|표현상\s*특징|표현의\s*효과|표현\s*방식|시어|심상|이미지|어조|분위기|갈등|장면|상황|기능|서사\s*전개)/u.test(String(question.stem ?? ''));
    // 독서(비문학): 발문이 짧고 지문은 stimulus에 있는 구조가 정상이므로 stem 길이 검증 면제
    const hasCsatReadingPassage = isKoreanReading && !!question.stimulus && question.stimulus.length >= 80;
    if (difficulty === 'easy' && stemWords > 24) {
        warnings.push(`Question ${index}: easy difficulty stem is longer than expected.`);
    }
    if (difficulty === 'hard') {
        // [FIX] 영어 과목의 경우 표준 발문이 짧으므로 길이 검증을 완화하거나 건너뜁니다.
        // [FIX] 수학 과목은 stem이 짧고 stimulus에 수식 조건이 들어가는 구조가 정상이므로,
        //       stem + stimulus 합산으로 검증합니다.
        if (!isEnglish && !hasCsatLiteratureReasoningStem && !hasCsatReadingPassage) {
            let effectiveWords = stemWords;
            let effectiveKoreanChars = stemKoreanChars;
            if (isMath && question.stimulus) {
                effectiveWords += countWords(question.stimulus);
                effectiveKoreanChars += countKoreanCharacters(question.stimulus);
            }
            // 수학 과목: stem이 짧고 stimulus에 LaTeX 수식이 들어가는 구조가 정상이므로,
            // LaTeX 수식이 포함되어 있거나 stem+stimulus 원시 길이가 충분하면 통과
            const hasLatex = /\\\(|\\\[|\$/.test(question.stem) ||
                (!!question.stimulus && /\\\(|\\\[|\$/.test(question.stimulus));
            const mathContentSufficient = isMath &&
                (hasLatex || (!!question.stimulus && (question.stem.length + question.stimulus.length) >= 40));
            if (!mathContentSufficient && effectiveWords < 8 && effectiveKoreanChars < 18) {
                pushReason(reasons, issueCounts, 'hard_too_short', `Question ${index}: hard difficulty stem is too short for deep reasoning.`);
            }
        }
        if (!isEnglish && directCuePattern.test(question.stem)) {
            pushReason(reasons, issueCounts, 'hard_too_direct', `Question ${index}: hard difficulty question is too direct.`);
        }
        if (explanationWords < 5) {
            pushReason(reasons, issueCounts, 'hard_explanation', `Question ${index}: hard difficulty explanation is too thin.`);
        }
    }
}
/**
 * 문항이 요청된 제목과 주제를 반영하는지 검증합니다.
 */
export function validateTopicReflection(question, index, title, topic, warnings) {
    const text = `${question.topic} ${question.stem} ${question.explanation}`.toLowerCase();
    const titleTokens = tokenize(title ?? '');
    const topicTokens = tokenize(topic ?? '');
    if (titleTokens.length > 0 && !titleTokens.some((token) => text.includes(token))) {
        warnings.push(`Question ${index}: title reflection is weak (expected keywords from "${title}").`);
    }
    if (topicTokens.length > 0 && !topicTokens.some((token) => text.includes(token))) {
        warnings.push(`Question ${index}: topic reflection is weak (expected keywords from "${topic}").`);
    }
}
/**
 * 선택된 문항 유형이나 형식이 반영되었는지 검증합니다.
 */
export function validateSelectionReflection(question, index, input, warnings) {
    if (usesNoSelector(input.subject)) {
        return;
    }
    const selectionValue = String(input.subject) === 'social' ? input.format : input.questionType;
    if (!selectionValue || selectionValue === '전체') {
        return;
    }
    const text = `${question.topic} ${question.stem} ${question.explanation}`.toLowerCase();
    const tokens = tokenize(selectionValue);
    const subject = String(input.subject);
    // 사회나 과학 과목은 유연하게 처리
    if (subject === 'social' ||
        subject.includes('social_') ||
        subject === 'science') {
        return;
    }
    if (tokens.length > 0 && !tokens.some((token) => text.includes(token))) {
        warnings.push(`Question ${index}: selected ${subject === 'social' ? 'format' : 'question type'} is weakly reflected.`);
    }
}
