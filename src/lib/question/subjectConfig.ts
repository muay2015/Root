import type { SchoolLevel } from '../examTypes';

export type SubjectKey =
  | 'english'
  | 'math'
  | 'science'
  | 'social'
  | 'korean'
  | 'korean_history'
  // 고등/수능 세분화
  | 'korean_writing' | 'korean_media' | 'korean_literature' | 'korean_reading'
  | 'math_1' | 'math_2' | 'math_calculus' | 'math_stats' | 'math_geometry'
  | 'physics_1' | 'chemistry_1' | 'biology_1' | 'earth_science_1'
  | 'social_culture' | 'living_ethics' | 'korean_geography';

export type SelectionFormat = '객관식' | 'OX' | '단답형';
export type SubjectSelectorMode = 'questionType' | 'format' | 'none';

type BaseSubjectConfig = {
  label: string;
  selectorMode: SubjectSelectorMode;
  exampleTopic: string;
  supportedLevels: SchoolLevel[];
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
  korean: {
    label: '국어(통합)',
    selectorMode: 'questionType',
    questionTypes: ['전체', '독해', '문법', '문학', '화법/작문'],
    defaultQuestionType: '독해',
    exampleTopic: '예: 중세 국어의 특징, 비문학 과학 지문 분석',
    supportedLevels: ['middle', 'high'],
  },
  korean_writing: { label: '화법과 작문', selectorMode: 'questionType', questionTypes: ['전체', '화법', '작문', '통합'], defaultQuestionType: '전체', exampleTopic: '예: 토론에서의 반론 전략, 설득하는 글쓰기', supportedLevels: ['high', 'csat'] },
  korean_media: { label: '언어와 매체', selectorMode: 'questionType', questionTypes: ['전체', '문법', '매체언어', '매체활용'], defaultQuestionType: '전체', exampleTopic: '예: 형태소의 분석, 매체 자료의 비판적 수용', supportedLevels: ['high', 'csat'] },
  korean_literature: { label: '문학', selectorMode: 'questionType', questionTypes: ['전체', '현대시', '현대소설', '고전시가', '고전소설'], defaultQuestionType: '전체', exampleTopic: '예: 윤동주의 시 세계, 판소리계 소설의 특징', supportedLevels: ['high', 'csat'] },
  korean_reading: { label: '독서', selectorMode: 'questionType', questionTypes: ['전체', '인문/예술', '사회/문화', '과학/기술'], defaultQuestionType: '전체', exampleTopic: '예: 서양 철학의 흐름, 경제학적 원리 분석', supportedLevels: ['high', 'csat'] },

  math: { label: '수학(통합)', selectorMode: 'questionType', questionTypes: ['전체', '계산', '개념', '응용'], defaultQuestionType: '개념', exampleTopic: '예: 이차함수와 그래프, 피타고라스의 정리 응용', supportedLevels: ['middle', 'high'] },
  math_1: { label: '수학 I', selectorMode: 'questionType', questionTypes: ['전체', '지수/로그', '삼각함수', '수열'], defaultQuestionType: '전체', exampleTopic: '예: 로그함수의 성질, 등차수열과 등비수열', supportedLevels: ['high', 'csat'] },
  math_2: { label: '수학 II', selectorMode: 'questionType', questionTypes: ['전체', '함수의 극한', '미분', '적분'], defaultQuestionType: '전체', exampleTopic: '예: 함수의 연속성, 정적분의 활용', supportedLevels: ['high', 'csat'] },
  math_calculus: { label: '미적분', selectorMode: 'questionType', questionTypes: ['전체', '수열의 극한', '미분법', '적분법'], defaultQuestionType: '전체', exampleTopic: '예: 초월함수의 미분, 치환적분과 부분적분', supportedLevels: ['high', 'csat'] },
  math_stats: { label: '확률과 통계', selectorMode: 'questionType', questionTypes: ['전체', '순열/조합', '확률', '통계'], defaultQuestionType: '전체', exampleTopic: '예: 조건부 확률, 정규분포의 성질', supportedLevels: ['high', 'csat'] },
  math_geometry: { label: '기하', selectorMode: 'questionType', questionTypes: ['전체', '이차곡선', '평면벡터', '공간도형/좌표'], defaultQuestionType: '전체', exampleTopic: '예: 타원의 방정식, 벡터의 내적 활용', supportedLevels: ['high', 'csat'] },

  english: {
    label: '영어',
    selectorMode: 'questionType',
    questionTypes: ['전체', '문법', '어휘', '주제', '세부정보', '추론', '순서배열', '문장삽입'],
    defaultQuestionType: '주제',
    exampleTopic: '예: 관계대명사의 활용, 2024년 수능 기출 어휘',
    supportedLevels: ['middle', 'high', 'csat'],
  },
  science: {
    label: '과학(통합)',
    selectorMode: 'format',
    formats: ['객관식', 'OX', '단답형'],
    defaultFormat: '객관식',
    exampleTopic: '예: 유전의 원리, 화학 반응의 규칙성, 태양계의 구성',
    supportedLevels: ['middle', 'high'],
  },
  physics_1: { label: '물리학 I', selectorMode: 'format', formats: ['객관식', '단답형'], defaultFormat: '객관식', exampleTopic: '예: 뉴턴의 운동 법칙, 특수 상대성 이론', supportedLevels: ['high', 'csat'] },
  chemistry_1: { label: '화학 I', selectorMode: 'format', formats: ['객관식', '단답형'], defaultFormat: '객관식', exampleTopic: '예: 화학 결합과 분자의 세계, 산화 환원 반응', supportedLevels: ['high', 'csat'] },
  biology_1: { label: '생명과학 I', selectorMode: 'format', formats: ['객관식', '단답형'], defaultFormat: '객관식', exampleTopic: '예: 신경계와 항상성 유지, 유전의 원리', supportedLevels: ['high', 'csat'] },
  earth_science_1: { label: '지구과학 I', selectorMode: 'format', formats: ['객관식', '단답형'], defaultFormat: '객관식', exampleTopic: '예: 판 구조론과 대륙 이동, 별의 진화와 태양계', supportedLevels: ['high', 'csat'] },

  social: {
    label: '사회(통합)',
    selectorMode: 'format',
    formats: ['객관식', 'OX', '단답형'],
    defaultFormat: '객관식',
    exampleTopic: '예: 근대 민주주의의 발전, 지형과 인간 생활',
    supportedLevels: ['middle', 'high'],
  },
  social_culture: { label: '사회·문화', selectorMode: 'format', formats: ['객관식', '단답형'], defaultFormat: '객관식', exampleTopic: '예: 사회 구조와 일탈 행동, 현대 사회의 변동', supportedLevels: ['high', 'csat'] },
  living_ethics: { label: '생활과 윤리', selectorMode: 'format', formats: ['객관식', '단답형'], defaultFormat: '객관식', exampleTopic: '예: 인간과 환경의 윤리, 정의로운 사회', supportedLevels: ['high', 'csat'] },
  korean_geography: { label: '한국지리', selectorMode: 'format', formats: ['객관식', '단답형'], defaultFormat: '객관식', exampleTopic: '예: 한반도의 지형적 특징, 인구 변화와 도시화', supportedLevels: ['high', 'csat'] },

  korean_history: {
    label: '한국사',
    selectorMode: 'format',
    formats: ['객관식', 'OX', '단답형'],
    defaultFormat: '객관식',
    exampleTopic: '예: 조선의 건국과 통치 체제, 일제 독립 운동의 전개',
    supportedLevels: ['middle', 'high', 'csat'],
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
