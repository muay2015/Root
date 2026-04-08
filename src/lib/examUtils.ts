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
  const map = new Map<string, T>();
  
  // 1. 일차적으로 ID 기반 중복 제거
  for (const record of records) {
    if (!map.has(record.id)) {
      map.set(record.id, record);
    } else {
      const existing = map.get(record.id)!;
      if (Date.parse(record.created_at) > Date.parse(existing.created_at)) {
        map.set(record.id, record);
      }
    }
  }

  // 2. 콘텐츠 기반 중복 제거 (제목 + 문항수 + 생성시간 유사성) 및 ID 우선순위 적용
  const uniqueById = Array.from(map.values());
  const contentMap = new Map<string, T>();

  for (const r of uniqueById) {
    // 1분 단위로 생성 시간을 절광하여 기기 간 미세한 시간차만 허용 (데이터 과도 병합 방지)
    const timeKey = Math.floor(Date.parse(r.created_at) / 60000);
    // 제목 정규화 제거: 제목이 조금이라도 다르면 별개의 시험으로 취급하여 데이터 유실 방지
    const contentKey = `${r.title}___${r.question_count}___${timeKey}`;
    
    if (!contentMap.has(contentKey)) {
      contentMap.set(contentKey, r);
    } else {
      const existing = contentMap.get(contentKey)!;
      const isExistingLocal = existing.id.startsWith('local-');
      const isCurrentLocal = r.id.startsWith('local-');

      // UUID(정식 ID)를 가진 레코드를 우선 보존
      if (isExistingLocal && !isCurrentLocal) {
        contentMap.set(contentKey, r);
      } else if (isExistingLocal === isCurrentLocal) {
        // 같은 종류의 ID라면 더 최신의 데이터를 유지
        if (Date.parse(r.created_at) > Date.parse(existing.created_at)) {
          contentMap.set(contentKey, r);
        }
      }
    }
  }

  return Array.from(contentMap.values())
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

// 제목 또는 저장된 데이터를 통해 과목 키(SubjectKey)를 추출하는 함수
export function normalizeToSubjectKey(value: string | null | undefined, title?: string): SubjectKey | null {
  if (!value && !title) return null;

  // 1. 이미 정확한 키인 경우 (english, social 등) 우선적으로 신뢰
  if (isSubjectKey(value)) return value;

  // 2. 라벨(영어, 사회 등)로 저장된 경우 매핑 후 반환
  if (value) {
    const entry = Object.entries(SUBJECT_CONFIG).find(([_, config]) => config.label === value);
    if (entry) return entry[0] as SubjectKey;
  }

  // 3. 자동 유추는 신규 데이터에서는 지양하고, 기존 데이터 복원 시에만 최소한으로 사용
  if (title && !value) {
    return inferSubjectFromTitle(title);
  }

  return null;
}

/**
 * 전 과목 제목 정밀 유추 함수 (데이터 보정 전용)
 */
export function inferSubjectFromTitle(title: string): SubjectKey | null {
  const t = title.toLowerCase();
  
  // 0. 사용자 요청 전용 정밀 매핑 (최우선순위) 🛡️🎯
  if (t.includes('기압과 날씨') || t.includes('구름과 강수')) return 'science';
  if (t.includes('상처가 더 꽃이다')) return 'korean';
  if (t.includes('여러 나라의 성장')) return 'korean_history';

  // 1. 국어 관련
  if (t.includes('국어') || t.includes('독해') || t.includes('문학') || t.includes('비문학') || t.includes('논증') || t.includes('어법') || t.includes('화작') || t.includes('언매')) return 'korean';

  // 2. 수학 관련
  if (t.includes('수학') || t.includes('math') || t.includes('산수') || t.includes('기하') || t.includes('함수') || t.includes('도형') || t.includes('미적분') || t.includes('확통')) return 'math';

  // 3. 영어 관련
  if (t.includes('영어') || t.includes('english') || t.includes('grammar') || t.includes('reading') || t.includes('단어') || t.includes('토익') || t.includes('토플')) return 'english';

  // 4. 과학 관련
  if (t.includes('과학') || t.includes('science') || t.includes('물리') || t.includes('화학') || t.includes('생물') || t.includes('지구') || t.includes('생명') || t.includes('우주') || t.includes('에너지') || t.includes('실험') || t.includes('통합과학')) return 'science';

  // 5. 역사 관련 (최우선순위 역전 방지)
  if (t.includes('국사') || t.includes('역사') || t.includes('한국사') || t.includes('근현대사') || t.includes('삼국') || t.includes('고려') || t.includes('조선') || t.includes('세계사') || t.includes('동아시아')) return 'korean_history';

  // 6. 사회 관련
  if (t.includes('사회') || t.includes('경제') || t.includes('정치') || t.includes('법') || t.includes('지리') || t.includes('윤리') || t.includes('사문')) return 'social';
  
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
  const subjectLabel = SUBJECT_CONFIG[subject].label;
  const topicText = generationTopic.trim();
  
  if (topicText.length > 0) {
    return topicText.includes(subjectLabel) ? topicText : `[${subjectLabel}] ${topicText}`;
  }

  const parts = [
    mode === 'ai' ? 'AI 생성' : mode === 'summary' ? '핵심 요약' : '업로드 기반',
    subjectLabel,
    selectionLabel,
    getSchoolLevelLabel(schoolLevel),
    getDifficultyLabel(difficulty),
    `${count}문항`,
  ].filter(Boolean);
  return parts.join(' ');
}
