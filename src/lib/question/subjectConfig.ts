export type SubjectKey =
  | 'english'
  | 'math'
  | 'science'
  | 'social'
  | 'korean'
  | 'korean_history';

export type SelectionFormat = '객관식' | 'OX' | '단답형';
export type SubjectSelectorMode = 'questionType' | 'format' | 'none';

type BaseSubjectConfig = {
  label: string;
  selectorMode: SubjectSelectorMode;
};

type SubjectConfigWithQuestionType = BaseSubjectConfig & {
  selectorMode: 'questionType';
  questionTypes: string[];
  defaultQuestionType: string;
};

type SubjectConfigWithFormat = BaseSubjectConfig & {
  selectorMode: 'format';
  formats: SelectionFormat[];
  defaultFormat: SelectionFormat;
};

type SubjectConfigWithoutSelector = BaseSubjectConfig & {
  selectorMode: 'none';
};

export type SubjectConfig =
  | SubjectConfigWithQuestionType
  | SubjectConfigWithFormat
  | SubjectConfigWithoutSelector;

export const SUBJECT_CONFIG: Record<SubjectKey, SubjectConfig> = {
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

export function usesQuestionType(subject: SubjectKey) {
  return SUBJECT_CONFIG[subject].selectorMode === 'questionType';
}

export function usesFormat(subject: SubjectKey) {
  return SUBJECT_CONFIG[subject].selectorMode === 'format';
}

export function usesNoSelector(subject: SubjectKey) {
  return SUBJECT_CONFIG[subject].selectorMode === 'none';
}

export function getSubjectSelectionDefaults(subject: SubjectKey) {
  const config = SUBJECT_CONFIG[subject];
  if (config.selectorMode === 'questionType') {
    return {
      questionType: config.defaultQuestionType,
      format: '객관식' as const,
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
    format: '객관식' as const,
  };
}

export function getSubjectQuestionTypes(subject: SubjectKey) {
  const config = SUBJECT_CONFIG[subject];
  return config.selectorMode === 'questionType' ? config.questionTypes : [];
}

export function getSubjectQuestionTypeMixTargets(subject: SubjectKey) {
  return getSubjectQuestionTypes(subject).filter((value) => value !== '전체');
}

export function getSubjectFormats(subject: SubjectKey) {
  const config = SUBJECT_CONFIG[subject];
  return config.selectorMode === 'format' ? config.formats : [];
}

export function getSubjectSelectionLabel(
  subject: SubjectKey,
  questionType: string,
  format: SelectionFormat,
) {
  const config = SUBJECT_CONFIG[subject];
  if (config.selectorMode === 'questionType') {
    return questionType;
  }

  if (config.selectorMode === 'format') {
    return format;
  }

  return null;
}
