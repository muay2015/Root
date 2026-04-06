export const SUBJECT_CONFIG = {
    english: {
        label: '영어',
        selectorMode: 'questionType',
        questionTypes: ['전체', '문법', '어휘', '주제', '세부정보', '추론', '순서배열', '문장삽입'],
        defaultQuestionType: '주제',
    },
    math: {
        label: '수학',
        selectorMode: 'questionType',
        questionTypes: ['전체', '계산', '개념', '응용'],
        defaultQuestionType: '개념',
    },
    science: {
        label: '과학',
        selectorMode: 'questionType',
        questionTypes: ['전체', '개념', '원리이해', '자료해석', '실험분석'],
        defaultQuestionType: '개념',
    },
    social: {
        label: '사회',
        selectorMode: 'format',
        formats: ['객관식', 'OX', '단답형'],
        defaultFormat: '객관식',
    },
    korean: {
        label: '국어',
        selectorMode: 'questionType',
        questionTypes: ['전체', '독해', '문법', '문학', '화법/작문'],
        defaultQuestionType: '독해',
    },
    korean_history: {
        label: '국사',
        selectorMode: 'none',
    },
};
export function usesQuestionType(subject) {
    return SUBJECT_CONFIG[subject].selectorMode === 'questionType';
}
export function usesFormat(subject) {
    return SUBJECT_CONFIG[subject].selectorMode === 'format';
}
export function usesNoSelector(subject) {
    return SUBJECT_CONFIG[subject].selectorMode === 'none';
}
export function getSubjectSelectionDefaults(subject) {
    const config = SUBJECT_CONFIG[subject];
    if (config.selectorMode === 'questionType') {
        return {
            questionType: config.defaultQuestionType,
            format: '객관식',
        };
    }
    if (config.selectorMode === 'format') {
        return {
            questionType: '',
            format: config.defaultFormat,
        };
    }
    return {
        questionType: '',
        format: '객관식',
    };
}
export function getSubjectQuestionTypes(subject) {
    const config = SUBJECT_CONFIG[subject];
    return config.selectorMode === 'questionType' ? config.questionTypes : [];
}
export function getSubjectQuestionTypeMixTargets(subject) {
    return getSubjectQuestionTypes(subject).filter((value) => value !== '전체');
}
export function getSubjectFormats(subject) {
    const config = SUBJECT_CONFIG[subject];
    return config.selectorMode === 'format' ? config.formats : [];
}
export function getSubjectSelectionLabel(subject, questionType, format) {
    const config = SUBJECT_CONFIG[subject];
    if (config.selectorMode === 'questionType') {
        return questionType;
    }
    if (config.selectorMode === 'format') {
        return format;
    }
    return null;
}
