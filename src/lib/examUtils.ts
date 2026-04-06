// 시험 관련 유틸리티 함수 및 시드 데이터
import type { ExamQuestion } from '../components/exam/types';
import type { PersistedExamRecord } from './rootPersistence';
import { normalizeMultipleChoiceChoices, type GeneratedQuestionMode } from './examGeneration';
import { SUBJECT_CONFIG, usesNoSelector, type SelectionFormat, type SubjectKey } from './question/subjectConfig';
import type { BuilderMode, DifficultyLevel, SchoolLevel, WrongNote } from './examTypes';

// 시드 문항 데이터 (기본 과목용)
const genericSeedQuestions: ExamQuestion[] = [
  {
    id: 1,
    topic: '핵심 개념',
    type: '객관식',
    stem: '제시된 학습 자료를 바르게 이해한 설명으로 가장 적절한 것은?',
    choices: ['핵심 개념과 관련이 없다', '핵심 개념을 정리하고 적용한다', '정답 복습은 필요 없다', '자료 분석 없이 암기만 한다'],
    answer: '핵심 개념을 정리하고 적용한다',
    explanation: '자료를 바탕으로 개념을 정리하고 적용하는 태도가 가장 적절합니다.',
  },
  {
    id: 2,
    topic: '자료 해석',
    type: '객관식',
    stem: '자료를 읽을 때 가장 먼저 확인해야 할 것으로 가장 적절한 것은?',
    choices: ['개인 의견', '핵심 정보와 조건', '작성자의 이름', '문항 번호'],
    answer: '핵심 정보와 조건',
    explanation: '핵심 정보와 조건을 먼저 파악해야 정확한 판단이 가능합니다.',
  },
];

// 시드 문항 데이터 (한국사용)
const historySeedQuestions: ExamQuestion[] = [
  {
    id: 1,
    topic: '조선 전기',
    type: '객관식',
    stem: '다음 설명에 해당하는 시기의 통치 특징으로 가장 적절한 것은?\n태종과 세종을 거치며 왕권이 강화되고, 집현전 설치와 4군 6진 개척이 이루어졌다.',
    choices: ['문벌 귀족 사회가 강화되었다', '유교 정치 질서가 정비되었다', '무신 정권이 성립하였다', '전시과 체제가 처음 실시되었다', '6두품이 정계에 진출하였다'],
    answer: '유교 정치 질서가 정비되었다',
    explanation: '태종·세종 시기는 왕권 강화와 유교 정치 질서 정비가 대표적입니다.',
  },
  {
    id: 2,
    topic: '통일 신라',
    type: '객관식',
    stem: '다음 자료를 보고 알 수 있는 사실로 가장 적절한 것은?\n국학을 설치하고 독서삼품과를 실시하여 유교적 소양을 갖춘 인재를 키우려 하였다.',
    choices: ['통일 신라가 유교 정치 이념을 강화하였다', '백제가 지방 통제를 위해 22담로를 설치하였다', '고려가 성종 때 12목을 설치하였다', '조선이 성균관을 중심으로 과거제를 운영하였다', '신라 하대에 호족 세력이 약화되었다'],
    answer: '통일 신라가 유교 정치 이념을 강화하였다',
    explanation: '국학과 독서삼품과는 통일 신라의 유교 정치 질서 강화와 연결됩니다.',
  },
];

// --- 라벨 변환 함수 ---

export function getDifficultyLabel(value: DifficultyLevel) {
  if (value === 'easy') return '쉬움';
  if (value === 'medium') return '보통';
  return '어려움';
}

export function getSchoolLevelLabel(value: SchoolLevel) {
  if (value === 'middle') return '중등';
  if (value === 'high') return '고등';
  return '수능';
}

// --- 문자열 정규화 ---

export function normalizeAnswer(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

// --- 문제 생성 모드 추론 ---

export function inferUploadMode(
  subject: SubjectKey,
  questionType: string,
  format: SelectionFormat,
): GeneratedQuestionMode {
  if (usesNoSelector(subject)) {
    return 'multiple';
  }
  if (format === '단답형') {
    return 'subjective';
  }
  if (questionType === '객관식') return 'multiple';
  if (questionType === '주관식') return 'subjective';
  return 'mixed';
}

// --- 시드 문항 빌드 ---

function getSeedQuestions(subject: SubjectKey) {
  return subject === 'korean_history' ? historySeedQuestions : genericSeedQuestions;
}

export function buildQuestions(
  subject: SubjectKey,
  questionMode: GeneratedQuestionMode,
  count: number,
): ExamQuestion[] {
  const seeds = getSeedQuestions(subject);
  const base = Array.from({ length: count }, (_, index) => {
    const source = seeds[index % seeds.length];
    return { ...source, id: index + 1 };
  });

  if (questionMode === 'multiple') {
    return base.map((q) => ({ ...q, type: '객관식', choices: normalizeMultipleChoiceChoices(q.choices) }));
  }
  if (questionMode === 'subjective') {
    return base.map((q) => ({ ...q, type: '주관식', choices: undefined }));
  }
  return base.map((q, i) =>
    i % 2 === 0
      ? { ...q, type: '객관식', choices: normalizeMultipleChoiceChoices(q.choices) }
      : { ...q, type: '주관식', choices: undefined },
  );
}

// --- 병합 함수 ---

export function mergeWrongNotes<T extends WrongNote>(notes: T[]) {
  return Array.from(new Map(notes.map((item) => [item.id, item])).values());
}

export function mergeExamRecords<T extends PersistedExamRecord>(records: T[]) {
  return Array.from(new Map(records.map((item) => [item.id, item])).values())
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
}

// --- 타입 가드 ---

export function isSubjectKey(value: string | null | undefined): value is SubjectKey {
  return typeof value === 'string' && value in SUBJECT_CONFIG;
}

export function isDifficultyLevel(value: string): value is DifficultyLevel {
  return value === 'easy' || value === 'medium' || value === 'hard';
}

export function isSchoolLevel(value: string): value is SchoolLevel {
  return value === 'middle' || value === 'high' || value === 'csat';
}

// 제목 또는 저장된 데이터를 통해 과목 키(SubjectKey)를 정확하게 추출하는 함수
export function normalizeToSubjectKey(value: string | null | undefined, title?: string): SubjectKey | null {
  if (!value && !title) return null;

  // 1. 이미 정확한 키인 경우 (english, social 등)
  if (isSubjectKey(value)) return value;

  // 2. 라벨(영어, 사회 등)로 저장된 경우 처리
  if (value) {
    const entry = Object.entries(SUBJECT_CONFIG).find(([_, config]) => config.label === value);
    if (entry) return entry[0] as SubjectKey;
  }

  // 3. 제목을 통해 유추
  if (title) {
    const inferred = inferSubjectFromTitle(title);
    if (inferred) return inferred;
  }

  return null;
}

// 제목을 통해 과목을 유추하는 함수 (기존 데이터 구제용)
export function inferSubjectFromTitle(title: string): SubjectKey | null {
  const t = title.toLowerCase();
  // 사회 관련 키워드 대폭 확장
  if (t.includes('사회') || t.includes('경제') || t.includes('정치') || t.includes('법') || t.includes('지리') || t.includes('문화') || t.includes('시민') || t.includes('도덕') || t.includes('윤리')) return 'social';
  
  // 국사/역사 관련
  if (t.includes('국사') || t.includes('역사') || t.includes('한국사') || t.includes('근현대사') || t.includes('삼국') || t.includes('고려') || t.includes('조선')) return 'korean_history';
  
  // 기타 과목들
  if (t.includes('영어') || t.includes('english') || t.includes('grammar') || t.includes('reading')) return 'english';
  if (t.includes('수학') || t.includes('math') || t.includes('산수') || t.includes('기하') || t.includes('함수')) return 'math';
  if (t.includes('과학') || t.includes('science') || t.includes('실험') || t.includes('관찰') || t.includes('물리') || t.includes('화학') || t.includes('생물') || t.includes('지구')) return 'science';
  if (t.includes('국어') || t.includes('독해') || t.includes('문학') || t.includes('비문학')) return 'korean';
  
  return null;
}

// --- 응답 데이터 변환 ---

export function toResponseMap(value: PersistedExamRecord['responses']) {
  if (!value) {
    return {} as Record<number, string>;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, answer]) => typeof answer === 'string')
      .map(([key, answer]) => [Number(key), answer]),
  ) as Record<number, string>;
}

// --- 날짜/텍스트 포맷 ---

export function formatSavedDate(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(parsed));
}

export function getSourcePreview(value: string | null | undefined, maxLength = 220) {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

// --- 시험 제목 생성 ---

export function makeExamTitle(
  mode: BuilderMode,
  subject: SubjectKey,
  schoolLevel: SchoolLevel,
  difficulty: DifficultyLevel,
  count: number,
  generationTopic: string,
  selectionLabel: string | null,
) {
  const topicText = generationTopic.trim();
  if (topicText.length > 0) return topicText;

  const subjectLabel = SUBJECT_CONFIG[subject].label;
  const parts = [
    mode === 'ai' ? 'AI 생성' : '업로드 기반',
    subjectLabel,
    selectionLabel,
    getSchoolLevelLabel(schoolLevel),
    getDifficultyLabel(difficulty),
    `${count}문항`,
  ].filter(Boolean);
  return parts.join(' ');
}
