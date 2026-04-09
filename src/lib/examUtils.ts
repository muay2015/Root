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
  return '기타';
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
  return subject.includes('history') ? historySeedQuestions : genericSeedQuestions;
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
  return value === 'middle' || value === 'high';
}

// 제목 또는 저장된 데이터를 통해 과목 키(SubjectKey)를 추출하는 함수
export function normalizeToSubjectKey(
  value: string | null | undefined, 
  title?: string, 
  altText?: string,
  questions?: any[],
  schoolLevel?: string
): SubjectKey | null {
  if (!value && !title && !altText && (!questions || questions.length === 0)) return null;

  // 1. 제목의 [과목명] 태그를 통한 직접 매핑 (최우선 신뢰)
  if (title) {
    const match = title.match(/^\[([^\]]+)\]/);
    if (match) {
      const tagLabel = match[1].trim();
      const entry = Object.entries(SUBJECT_CONFIG).find(([_, config]) => config.label === tagLabel);
      if (entry) return entry[0] as SubjectKey;
    }
  }

  // 2. 이미 정확한 키인 경우 (english, social 등) 우선적으로 신뢰
  if (isSubjectKey(value)) return value;

  // 3. 라벨(영어, 사회 등)로 저장된 경우 매핑 후 반환
  if (value) {
    const entry = Object.entries(SUBJECT_CONFIG).find(([_, config]) => config.label === value);
    if (entry) return entry[0] as SubjectKey;
  }

  // 4. 자동 유추 (제목 + 토픽)
  const baseText = [title, altText].filter(Boolean).join(' ');
  if (baseText.length > 0) {
    const inferred = inferSubjectFromTitle(baseText, schoolLevel);
    if (inferred) return inferred;
  }

  // 5. 심층 유추 (문항 본문/Stem 분석) - 최후의 수단
  if (questions && questions.length > 0) {
    // 첫 3개 문항의 본문을 합쳐서 키워드 분석
    const stemSample = questions.slice(0, 3).map(q => q.stem || '').join(' ').toLowerCase();
    if (stemSample.length > 10) {
      return inferSubjectFromTitle(stemSample, schoolLevel);
    }
  }

  return null;
}

/**
 * 전 과목 제목 정밀 유추 함수 (데이터 보정 전용)
 */
export function inferSubjectFromTitle(title: string, schoolLevelHint?: string): SubjectKey | null {
  const t = title.toLowerCase();
  
  // 레벨 판별 변수 (힌트와 제목 키워드 통합)
  const isHigh = schoolLevelHint === 'high' || t.includes('고등') || t.includes('고교') || t.includes('수능') || t.includes('모의고사') || t.includes('학평') || t.includes('고1') || t.includes('고2') || t.includes('고3');
  const isMiddle = schoolLevelHint === 'middle' || t.includes('중등') || t.includes('중학') || t.includes('1학년') || t.includes('2학년') || t.includes('3학년') || t.includes('중1') || t.includes('중2') || t.includes('중3');

  // 0. 특정 상세 주제 정밀 매핑 (최우선순위)
  if (t.includes('기압') || t.includes('구름') || t.includes('날씨') || t.includes('강수')) {
    return isHigh ? 'earth_science_1' : 'middle_science';
  }
  if (t.includes('상처가 더 꽃이다')) return 'middle_korean';
  if (t.includes('여러 나라의 성장')) {
    return isHigh ? 'high_korean_history' : 'middle_history';
  }

  // 1. 수학 (수치, 연산, 도형)
  if (t.includes('수학') || t.includes('math') || t.includes('방정식') || t.includes('수열') || t.includes('극한') || t.includes('로그') || t.includes('함수') || t.includes('다항식') || t.includes('부등식') || t.includes('기하') || t.includes('도형') || t.includes('인수분해') || t.includes('삼각함수') || t.includes('벡터') || t.includes('집합') || t.includes('연산')) {
    if (t.includes('수학 i') || t.includes('수학 1') || t.includes('수학i')) return 'math_1';
    if (t.includes('수학 ii') || t.includes('수학 2') || t.includes('수학ii')) return 'math_2';
    if (t.includes('미적분')) return 'math_calculus';
    if (t.includes('확률과 통계') || t.includes('확통')) return 'math_stats';
    if (isHigh) return 'high_math';
    return 'middle_math';
  }

  // 2. 국어 (지문, 독해, 문법)
  if (t.includes('국어') || t.includes('독서') || t.includes('독해') || t.includes('문학') || t.includes('비문학') || t.includes('화법') || t.includes('작문') || t.includes('형태소') || t.includes('맞춤법') || t.includes('언어') || t.includes('지문') || t.includes('작가') || t.includes('감상')) {
    if (t.includes('독서')) return 'korean_reading';
    if (t.includes('문학')) return 'korean_literature';
    if (t.includes('화법') || t.includes('작문') || t.includes('화작')) return 'korean_writing';
    if (t.includes('언어') || t.includes('매체') || t.includes('언매')) return 'korean_media';
    if (isHigh) return 'high_korean';
    return 'middle_korean';
  }

  // 3. 역사 (한국사, 세계사)
  if (t.includes('국사') || t.includes('한국사') || t.includes('역사') || t.includes('근현대사') || t.includes('조선') || t.includes('고려') || t.includes('삼국') || t.includes('선사') || t.includes('왕조') || t.includes('전쟁') || t.includes('혁명') || t.includes('유적') || t.includes('실학') || t.includes('강화도')) {
    if (t.includes('동아시아')) return 'east_asian_history';
    if (t.includes('세계사')) return 'world_history';
    if (isHigh) return 'high_korean_history';
    return 'middle_history';
  }

  // 4. 과학 (물/화/생/지)
  if (t.includes('과학') || t.includes('science') || t.includes('물리') || t.includes('화학') || t.includes('생물') || t.includes('지구과학') || t.includes('질량') || t.includes('에너지') || t.includes('광합성') || t.includes('염색체') || t.includes('세균') || t.includes('행성') || t.includes('원소') || t.includes('화학식') || t.includes('전기')) {
    if (t.includes('물리')) return t.includes('2') || t.includes('ii') ? 'physics_2' : 'physics_1';
    if (t.includes('화학')) return t.includes('2') || t.includes('ii') ? 'chemistry_2' : 'chemistry_1';
    if (t.includes('생명') || t.includes('생물')) return t.includes('2') || t.includes('ii') ? 'biology_2' : 'biology_1';
    if (t.includes('지구과학')) return t.includes('2') || t.includes('ii') ? 'earth_science_2' : 'earth_science_1';
    if (isHigh) return 'high_science';
    return 'middle_science';
  }

  // 5. 사회 (경제, 법, 지리, 윤리)
  if (t.includes('사회') || t.includes('social') || t.includes('경제') || t.includes('정치') || t.includes('헌법') || t.includes('지리') || t.includes('윤리') || t.includes('문화') || t.includes('정의') || t.includes('인권') || t.includes('민주주의') || t.includes('복지') || t.includes('환경')) {
    if (t.includes('사회·문화') || t.includes('사문')) return 'social_culture';
    if (t.includes('생활과 윤리') || t.includes('생윤')) return 'living_ethics';
    if (t.includes('윤리와 사상') || t.includes('윤사')) return 'ethics_thought';
    if (t.includes('한국지리')) return 'korean_geography';
    if (t.includes('세계지리')) return 'world_geography';
    if (t.includes('정치와 법') || t.includes('정법')) return 'politics_law';
    if (isHigh) return 'high_social';
    return 'middle_social';
  }

  // 6. 영어
  if (t.includes('영어') || t.includes('english') || t.includes('grammar') || t.includes('vocabulary') || t.includes('reading') || t.includes('독해') || t.includes('숙어') || t.includes('영단어')) {
    if (isHigh) return 'high_english';
    return null; // 불확실할 경우 폴백하지 않음
  }

  // 7. 기타/예체능/기술가정
  if (t.includes('기술') || t.includes('가정') || t.includes('기가') || t.includes('영양') || t.includes('수송') || t.includes('제조') || t.includes('건설')) return 'middle_tech_home';
  if (t.includes('도덕') || t.includes('인성') || t.includes('시민') || t.includes('가치')) return 'middle_ethics';
  if (t.includes('체육') || t.includes('미술') || t.includes('음악')) return null; // 기타로 분류
  
  // 8. 제2외국어/한문
  if (t.includes('일본어')) return 'japanese';
  if (t.includes('중국어')) return 'chinese';
  if (t.includes('한자') || t.includes('한문')) return 'classical_chinese';
  
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
  const subjectLabel = SUBJECT_CONFIG[subject]?.label || '과목';
  const topicText = (generationTopic || '').trim();
  
  if (topicText && topicText.length > 0) {
    return topicText.includes(subjectLabel) ? topicText : `[${subjectLabel}] ${topicText}`;
  }

  const parts = [
    mode === 'school' ? '내신 대비' : '수능·모의고사',
    subjectLabel,
    selectionLabel,
    getSchoolLevelLabel(schoolLevel),
    getDifficultyLabel(difficulty),
    `${count}문항`,
  ].filter(Boolean);
  return parts.join(' ');
}
