import type { SchoolLevel, DetailedGrade } from '../examTypes';

export type SubjectCategory = 'korean' | 'math' | 'english' | 'history' | 'social' | 'science' | 'language' | 'tech_ethics';

export type SubjectKey =
  // 중등 내신 과목 (이미지 기준 8개)
  | 'middle_korean' | 'middle_math' | 'middle_english' | 'middle_history' | 'middle_social' | 'middle_science' | 'middle_tech_home' | 'middle_ethics'
  // 고등 내신 과목 (공통/필수)
  | 'high_korean' | 'high_math' | 'high_english' | 'high_korean_history' | 'high_social' | 'high_science'
  // 고등 선택 과목 (수능/심화)
  | 'korean_writing' | 'korean_media' | 'korean_literature' | 'korean_reading'
  | 'math_1' | 'math_2' | 'math_calculus' | 'math_stats' | 'math_geometry'
  | 'social_culture' | 'living_ethics' | 'korean_geography' | 'world_geography' | 'east_asian_history' | 'world_history' | 'economics' | 'politics_law' | 'ethics_thought'
  | 'physics_1' | 'chemistry_1' | 'biology_1' | 'earth_science_1'
  | 'physics_2' | 'chemistry_2' | 'biology_2' | 'earth_science_2'
  | 'japanese' | 'chinese' | 'spanish' | 'french' | 'german' | 'russian' | 'arabic' | 'vietnamese' | 'classical_chinese';

export type SelectionFormat = '객관식' | 'OX' | '단답형';
export type SubjectSelectorMode = 'questionType' | 'format' | 'none';
export type UploadRecommendation = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';

export const CATEGORY_CONFIG: Record<SubjectCategory, { label: string; icon: string }> = {
  korean: { label: '국어', icon: '📝' },
  math: { label: '수학', icon: '🔢' },
  english: { label: '영어', icon: '🔤' },
  history: { label: '역사', icon: '🇰🇷' },
  social: { label: '사회', icon: '🌍' },
  science: { label: '과학', icon: '🧪' },
  language: { label: '제2외국어/한문', icon: '🌐' },
  tech_ethics: { label: '기술·가정/도덕', icon: '🛠️' },
};

type BaseSubjectConfig = {
  label: string;
  category: SubjectCategory;
  selectorMode: SubjectSelectorMode;
  exampleTopic: string;
  csatExampleTopic: string;
  supportedLevels: SchoolLevel[];
  supportedGrades: DetailedGrade[];
  uploadRecommendation: UploadRecommendation;
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
  middle_korean: { label: '중등 국어', category: 'korean', selectorMode: 'format', formats: ['객관식', '단답형'], defaultFormat: '객관식', exampleTopic: '예: 품사의 종류와 특성, 시의 정서와 분위기', csatExampleTopic: '예: 중학 국어 성취도 평가 대비 전 범위', supportedLevels: ['middle'], supportedGrades: ['1학년', '2학년', '3학년'], uploadRecommendation: 'REQUIRED' },
  middle_math: { label: '중등 수학', category: 'math', selectorMode: 'questionType', questionTypes: ['전체', '수와 연산', '문자와 식', '함수', '기하(도형)', '확률과 통계'], defaultQuestionType: '전체', exampleTopic: '예: 소인수분해, 일차방정식, 일차함수, 피타고라스 정리, 확률', csatExampleTopic: '예: 중등 수학 기초 학력 진단 평가 준비', supportedLevels: ['middle'], supportedGrades: ['1학년', '2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  middle_english: { label: '중등 영어', category: 'english', selectorMode: 'questionType', questionTypes: ['전체', '요지/주제/제목', '어법/어휘', '빈칸 추론', '문장 삽입', '순서 배열', '심경/분위기', '내용 일치', '관계없는 문장', '요약문 완성'], defaultQuestionType: '전체', exampleTopic: '예: 현재완료 시제의 이해, 중학교 필수 교과서 대화문', csatExampleTopic: '예: 중등 영어 내신 고득점 대비 필수 구문', supportedLevels: ['middle'], supportedGrades: ['1학년', '2학년', '3학년'], uploadRecommendation: 'REQUIRED' },
  middle_social: { label: '중등 사회', category: 'social', selectorMode: 'questionType', questionTypes: ['전체', '지리', '사회', '역사/사회', '지리/사회'], defaultQuestionType: '전체', exampleTopic: '예: 내가 사는 지역, 인권 보호와 헌법', csatExampleTopic: '예: 중등 사회 주요 개념 및 용어 정리', supportedLevels: ['middle'], supportedGrades: ['1학년', '2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  middle_history: { label: '중등 역사', category: 'history', selectorMode: 'questionType', questionTypes: ['전체', '전근대사', '중세/근세', '근현대사'], defaultQuestionType: '전체', exampleTopic: '예: 선사 시대와 국가의 형성, 조선의 사회와 문화', csatExampleTopic: '예: 중학 역사 흐름 잡기 전 범위', supportedLevels: ['middle'], supportedGrades: ['1학년', '2학년', '3학년'], uploadRecommendation: 'OPTIONAL' },
  middle_science: { label: '중등 과학', category: 'science', selectorMode: 'questionType', questionTypes: ['전체', '물리', '화학', '생명과학', '지구과학'], defaultQuestionType: '전체', exampleTopic: '예: 식물의 광합성, 물질의 상태 변화, 빛과 조명', csatExampleTopic: '예: 중학 과학 핵심 실험 및 원리 기초', supportedLevels: ['middle'], supportedGrades: ['1학년', '2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  middle_tech_home: { label: '기술·가정', category: 'tech_ethics', selectorMode: 'format', formats: ['객관식', 'OX', '단답형'], defaultFormat: '객관식', exampleTopic: '예: 청소년의 발달, 기술의 발달과 미래 환경', csatExampleTopic: '예: 중학 기술·가정 성취도 평가 대비', supportedLevels: ['middle'], supportedGrades: ['1학년', '2학년', '3학년'], uploadRecommendation: 'OPTIONAL' },
  middle_ethics: { label: '도덕', category: 'tech_ethics', selectorMode: 'format', formats: ['객관식', 'OX', '단답형'], defaultFormat: '객관식', exampleTopic: '예: 도덕적 주체로서의 나, 사회 공동체의 윤리', csatExampleTopic: '예: 중학 도덕 핵심 가치와 윤리적 판단', supportedLevels: ['middle'], supportedGrades: ['1학년', '2학년', '3학년'], uploadRecommendation: 'OPTIONAL' },

  // --- 고등 내신 영역 ---
  high_korean: { label: '고등 국어', category: 'korean', selectorMode: 'format', formats: ['객관식', '단답형'], defaultFormat: '객관식', exampleTopic: '예: 국어의 로마자 표기법, 현대 소설의 서사 구조', csatExampleTopic: '예: 고1 국어 연합학력평가 및 내신 전 범위', supportedLevels: ['high'], supportedGrades: ['1학년'], uploadRecommendation: 'REQUIRED' },
  high_math: { label: '고등 수학(공통)', category: 'math', selectorMode: 'questionType', questionTypes: ['전체', '다항식', '방정식/부등식', '도형의 방정식', '집합과 명제', '함수', '경우의 수'], defaultQuestionType: '전체', exampleTopic: '예: 집합과 명제, 함수와 그래프, 경우의 수', csatExampleTopic: '예: 고1 수학 전국연합학력평가 기출 유형', supportedLevels: ['high'], supportedGrades: ['1학년'], uploadRecommendation: 'RECOMMENDED' },
  high_english: { label: '고등 영어', category: 'english', selectorMode: 'questionType', questionTypes: ['전체', '요지/주제/제목', '어법/어휘', '빈칸 추론', '문장 삽입', '순서 배열', '심경/분위기', '내용 일치', '관계없는 문장', '요약문 완성'], defaultQuestionType: '전체', exampleTopic: '예: 관계대명사와 분사구문, 고교 필수 단어와 숙어', csatExampleTopic: '예: 모의고사 변형 문제 및 수능 대비 기초 독해', supportedLevels: ['high'], supportedGrades: ['1학년', '2학년', '3학년'], uploadRecommendation: 'REQUIRED' },
  high_korean_history: { label: '고등 한국사', category: 'history', selectorMode: 'questionType', questionTypes: ['전체', '전근대사', '근대사', '현대사'], defaultQuestionType: '전체', exampleTopic: '예: 전근대 한국사의 이해, 근현대사의 전개', csatExampleTopic: '예: 수능 한국사 및 한능검 대비 통합 역사 지식', supportedLevels: ['high'], supportedGrades: ['1학년'], uploadRecommendation: 'OPTIONAL' },
  high_social: { label: '고등 통합사회', category: 'social', selectorMode: 'questionType', questionTypes: ['전체', '인권과 정의', '문화와 변동', '시장과 경제', '환경과 지속가능성'], defaultQuestionType: '전체', exampleTopic: '예: 삶의 목적으로서의 행복, 문화 다양성과 존중', csatExampleTopic: '예: 고1 통합사회 전국모의고사 핵심 기출', supportedLevels: ['high'], supportedGrades: ['1학년'], uploadRecommendation: 'RECOMMENDED' },
  high_science: { label: '고등 통합과학', category: 'science', selectorMode: 'questionType', questionTypes: ['전체', '물질의 규칙성', '시스템과 상호작용', '변화와 다양성', '환경과 에너지'], defaultQuestionType: '전체', exampleTopic: '예: 물질의 규칙성과 결합, 생태계와 환경', csatExampleTopic: '예: 고1 통합과학 탐구 실험 및 핵심 이론', supportedLevels: ['high'], supportedGrades: ['1학년'], uploadRecommendation: 'RECOMMENDED' },

  // --- 고등 선택/수능 과목 (유지) ---
  korean_writing: { label: '화법과 작문', category: 'korean', selectorMode: 'format', formats: ['객관식', '단답형'], defaultFormat: '객관식', exampleTopic: '예: 토론에서의 반론 전략, 설득하는 글쓰기', csatExampleTopic: '예: 수능 화법과 작문 실전 모의고사 전 범위', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'REQUIRED' },
  korean_media: { label: '언어와 매체', category: 'korean', selectorMode: 'format', formats: ['객관식', '단답형'], defaultFormat: '객관식', exampleTopic: '예: 형태소의 분석, 매체 자료의 비판적 수용', csatExampleTopic: '예: 킬러 문항 대비 국어 문법/언어와 매체 전 범위', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'REQUIRED' },
  korean_literature: { label: '문학', category: 'korean', selectorMode: 'format', formats: ['객관식', '단답형'], defaultFormat: '객관식', exampleTopic: '예: 윤동주의 시 세계, 판소리계 소설의 특징', csatExampleTopic: '예: EBS 수능특강/수능완성 연계 문학 주요 작품군', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'REQUIRED' },
  korean_reading: { label: '독서', category: 'korean', selectorMode: 'format', formats: ['객관식', '단답형'], defaultFormat: '객관식', exampleTopic: '예: 서양 철학의 흐름, 경제학적 원리 분석', csatExampleTopic: '예: 고난도 비문학(과학/기술) 지문 및 추론 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'REQUIRED' },

  math_1: { label: '수학 I', category: 'math', selectorMode: 'questionType', questionTypes: ['전체', '지수/로그', '삼각함수', '수열'], defaultQuestionType: '전체', exampleTopic: '예: 로그함수의 성질, 등차수열과 등비수열', csatExampleTopic: '예: 사인법칙과 코사인법칙의 활용, 수열의 추론', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  math_2: { label: '수학 II', category: 'math', selectorMode: 'questionType', questionTypes: ['전체', '함수의 극한', '미분', '적분'], defaultQuestionType: '전체', exampleTopic: '예: 함수의 연속성, 정적분의 활용', csatExampleTopic: '예: 함수의 극대/극소와 그래프 추론 킬러 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'OPTIONAL' },
  math_calculus: { label: '미적분', category: 'math', selectorMode: 'questionType', questionTypes: ['전체', '수열의 극한', '미분법', '적분법'], defaultQuestionType: '전체', exampleTopic: '예: 초월함수의 미분, 치환적분과 부분적분', csatExampleTopic: '예: 수능 30번 스타일 미적분 고난도 응용 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'OPTIONAL' },
  math_stats: { label: '확률과 통계', category: 'math', selectorMode: 'questionType', questionTypes: ['전체', '순열/조합', '확률', '통계'], defaultQuestionType: '전체', exampleTopic: '예: 조건부 확률, 정규분포의 성질', csatExampleTopic: '예: 여러 가지 순열과 조합, 통계적 추정', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'OPTIONAL' },
  math_geometry: { label: '기하', category: 'math', selectorMode: 'questionType', questionTypes: ['전체', '이차곡선', '평면벡터', '공간도형/좌표'], defaultQuestionType: '전체', exampleTopic: '예: 타원의 방정식, 벡터의 내적 활용', csatExampleTopic: '예: 공간도형에서의 정사영과 이면각 킬러 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },

  social_culture: { label: '사회·문화', category: 'social', selectorMode: 'questionType', questionTypes: ['전체', '탐구 방법', '개인과 사회', '문화와 변동', '현대 사회'], defaultQuestionType: '전체', exampleTopic: '예: 사회 구조와 일탈 행동, 현대 사회의 변동', csatExampleTopic: '예: 수능 킬러 문항인 계층 도표 및 인구 통계 분석', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  living_ethics: { label: '생활과 윤리', category: 'social', selectorMode: 'questionType', questionTypes: ['전체', '윤리학의 종류', '생명/환경 윤리', '사회/문화 윤리', '평화 윤리'], defaultQuestionType: '전체', exampleTopic: '예: 인간과 환경의 윤리, 정의로운 사회', csatExampleTopic: '예: 환경 윤리와 사회 정의 사상가 비교(싱어/레건/롤스)', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'OPTIONAL' },
  korean_geography: { label: '한국지리', category: 'social', selectorMode: 'questionType', questionTypes: ['전체', '지표와 환경', '생활 공간', '지속 가능한 국토'], defaultQuestionType: '전체', exampleTopic: '예: 한반도의 지형적 특징, 인구 변화와 도시화', csatExampleTopic: '예: 기상 데이터 및 인구 이동 통계 해석 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  world_geography: { label: '세계지리', category: 'social', selectorMode: 'questionType', questionTypes: ['전체', '세계의 기후', '문화 지역', '현대 세계의 과제'], defaultQuestionType: '전체', exampleTopic: '예: 주요 국가의 기후 특징, 세계의 인구 이동', csatExampleTopic: '예: 세계의 기후 구분과 위치 정보 추론 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  east_asian_history: { label: '동아시아사', category: 'social', selectorMode: 'questionType', questionTypes: ['전체', '동아시아의 형성', '교류와 갈등', '근대화의 갈등'], defaultQuestionType: '전체', exampleTopic: '예: 동아시아의 국제 관계, 유교 문화권의 형성', csatExampleTopic: '예: 각국의 근대화 운동과 연표형/시기 추론 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'OPTIONAL' },
  world_history: { label: '세계사', category: 'social', selectorMode: 'questionType', questionTypes: ['전체', '인류의 기원과 문명', '유럽과 미국', '현대 세계'], defaultQuestionType: '전체', exampleTopic: '예: 서양 근대 사회의 형성, 산업 혁명과 제국주의', csatExampleTopic: '예: 고대 문명부터 제2차 세계대전까지의 정치사 전 범위', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'OPTIONAL' },
  economics: { label: '경제', category: 'social', selectorMode: 'questionType', questionTypes: ['전체', '경제 원리', '국가와 경제', '세계 경제'], defaultQuestionType: '전체', exampleTopic: '예: 시장 경제의 기본 원리, 국민 경제의 흐름과 변동', csatExampleTopic: '예: 비교 우위와 환율 변화, 탄력성 계산 킬러 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  politics_law: { label: '정치와 법', category: 'social', selectorMode: 'questionType', questionTypes: ['전체', '민주주의와 법', '개인 생활과 법', '정치 과정과 참여'], defaultQuestionType: '전체', exampleTopic: '예: 민주 정치의 발전, 헌법과 기본권의 보장', csatExampleTopic: '예: 선거제도 분석 및 형사 절차/상속법 사례 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  ethics_thought: { label: '윤리와 사상', category: 'social', selectorMode: 'questionType', questionTypes: ['전체', '동양과 한국 윤리', '서양 윤리', '사회 사상'], defaultQuestionType: '전체', exampleTopic: '예: 동서양 윤리 사상의 흐름, 현대의 도덕적 쟁점', csatExampleTopic: '예: 동서양 주요 사상가 원문 해석 및 관점 비교', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'OPTIONAL' },

  physics_1: { label: '물리학 I', category: 'science', selectorMode: 'questionType', questionTypes: ['전체', '역학과 에너지', '물질과 전자기', '파동과 정보'], defaultQuestionType: '전체', exampleTopic: '예: 뉴턴의 운동 법칙, 특수 상대성 이론', csatExampleTopic: '예: 역학적 에너지 보존과 상대성 이론 고난도 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  chemistry_1: { label: '화학 I', category: 'science', selectorMode: 'questionType', questionTypes: ['전체', '화학의 첫걸음', '원자의 구조', '결합과 분자', '역동적인 화학'], defaultQuestionType: '전체', exampleTopic: '예: 화학 결합과 분자의 세계, 산화 환원 반응', csatExampleTopic: '예: 몰 농도 계산 및 중화 반응의 양적 관계 킬러 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  biology_1: { label: '생명과학 I', category: 'science', selectorMode: 'questionType', questionTypes: ['전체', '생명 활동', '항상성과 조절', '유전', '생태계와 상호작용'], defaultQuestionType: '전체', exampleTopic: '예: 신경계와 항상성 유지, 유전의 원리', csatExampleTopic: '예: 가계도 분석 및 세포 분열 과정 추론 킬러 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  earth_science_1: { label: '지구과학 I', category: 'science', selectorMode: 'questionType', questionTypes: ['전체', '고체 지구', '대기와 해양', '우주'], defaultQuestionType: '전체', exampleTopic: '예: 판 구조론과 대륙 이동, 별의 진화와 태양계', csatExampleTopic: '예: 별의 광도 및 대기/해양 순환 자료 해석 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  physics_2: { label: '물리학 II', category: 'science', selectorMode: 'questionType', questionTypes: ['전체', '역학적 상호작용', '전기장과 자기장', '빛과 물질의 이중성'], defaultQuestionType: '전체', exampleTopic: '예: 전자기 유도, 파동의 중첩과 간섭', csatExampleTopic: '예: 평면상의 포물선 운동 및 전자기장 복합 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  chemistry_2: { label: '화학 II', category: 'science', selectorMode: 'questionType', questionTypes: ['전체', '물질의 상태', '화학 반응', '반응 속도와 촉매'], defaultQuestionType: '전체', exampleTopic: '예: 반응 속도와 화학 평형, 전지와 전기 분해', csatExampleTopic: '예: 반응 엔탈피와 화학 평형 상수 계산 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  biology_2: { label: '생명과학 II', category: 'science', selectorMode: 'questionType', questionTypes: ['전체', '세포의 특성', '세포 호흡과 광합성', '유전자 발현'], defaultQuestionType: '전체', exampleTopic: '예: 세포의 특성, 유전자의 발현과 조절', csatExampleTopic: '예: 하디-와인버그 법칙과 제한 효소 분석 킬러 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },
  earth_science_2: { label: '지구과학 II', category: 'science', selectorMode: 'questionType', questionTypes: ['전체', '지구의 구조와 지표', '대기와 해양의 운동', '우주론'], defaultQuestionType: '전체', exampleTopic: '예: 한반도의 지질, 해수의 순환과 조석', csatExampleTopic: '예: 지균풍/지형류 계산 및 천체 관측 데이터 해석', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'RECOMMENDED' },

  japanese: { label: '일본어', category: 'language', selectorMode: 'none', exampleTopic: '예: 기초 일상 표현, 일본 문화의 이해', csatExampleTopic: '예: 수능 일본어 1~30번 전 범위 실전 유형', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'REQUIRED' },
  chinese: { label: '중국어', category: 'language', selectorMode: 'none', exampleTopic: '예: 성조와 기본 회화, 중국의 사회상', csatExampleTopic: '예: 수능 중국어 핵심 문법 및 일상 대화 전문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'REQUIRED' },
  spanish: { label: '스페인어', category: 'language', selectorMode: 'none', exampleTopic: '예: 스페인어 기본 문법과 표현', csatExampleTopic: '예: 스페인어 독해 및 문화권 특징 관련 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'REQUIRED' },
  french: { label: '프랑스어', category: 'language', selectorMode: 'none', exampleTopic: '예: 프랑스어 기본 회화와 독해', csatExampleTopic: '예: 프랑스어 의사소통 전략 및 문화 정보 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'REQUIRED' },
  german: { label: '독일어', category: 'language', selectorMode: 'none', exampleTopic: '예: 독일어의 기초 구문과 표현', csatExampleTopic: '예: 독일어 텍스트 이해 및 언어 형식 확인 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'REQUIRED' },
  russian: { label: '러시아어', category: 'language', selectorMode: 'none', exampleTopic: '예: 러시아어 알파벳과 기본 문장', csatExampleTopic: '예: 러시아어 기초 회화 및 러시아 문화 개관', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'REQUIRED' },
  arabic: { label: '아랍어', category: 'language', selectorMode: 'none', exampleTopic: '예: 아랍어 문자 기초 및 상용 표현', csatExampleTopic: '예: 아랍어 문자 결합 및 기본 인사말/문화 문항', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'REQUIRED' },
  vietnamese: { label: '베트남어', category: 'language', selectorMode: 'none', exampleTopic: '예: 베트남어 성조와 일상 대화', csatExampleTopic: '예: 베트남어 성조 체계 및 기초 생활 회화', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'REQUIRED' },
  classical_chinese: { label: '한문', category: 'language', selectorMode: 'none', exampleTopic: '예: 한자 성어와 문장의 이해', csatExampleTopic: '예: 고사성어와 한문 단락 해석 능력 평가', supportedLevels: ['high'], supportedGrades: ['2학년', '3학년'], uploadRecommendation: 'REQUIRED' },
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

export function getUploadRecommendation(subject: SubjectKey): UploadRecommendation {
  return SUBJECT_CONFIG[subject].uploadRecommendation;
}
