export interface CurriculumItem {
  grade: '1학년' | '2학년' | '3학년';
  areas: {
    areaName: string;
    subTopics: string[];
  }[];
}

export const MIDDLE_MATH_CURRICULUM: CurriculumItem[] = [
  {
    grade: '1학년',
    areas: [
      { areaName: '수와 연산', subTopics: ['소인수분해', '최대공약수와 최소공배수', '정수와 유리수', '정수와 유리수의 사칙계산'] },
      { areaName: '문자와 식', subTopics: ['문자 사용과 식의 계산', '일차방정식의 풀이', '일차방정식의 활용'] },
      { areaName: '함수', subTopics: ['좌표평면과 그래프', '정비례와 반비례', '변수와 그래프'] },
      { areaName: '기하(도형)', subTopics: ['기본 도형(점, 선, 면)', '위치 관계', '평행선의 성질', '작도와 합동', '다각형의 성질', '원과 부채꼴', '입체도형의 겉넓이와 부피'] },
      { areaName: '확률과 통계', subTopics: ['자료의 정리와 해석(도수분포표)', '줄기와 잎 그림', '상대도수'] }
    ]
  },
  {
    grade: '2학년',
    areas: [
      { areaName: '수와 연산', subTopics: ['유리수와 순환소수'] },
      { areaName: '문자와 식', subTopics: ['지수법칙', '다항식의 계산', '일차부등식', '연립일차방정식'] },
      { areaName: '함수', subTopics: ['일차함수와 그래프', '일차함수와 일차방정식의 관계'] },
      { areaName: '기하(도형)', subTopics: ['삼각형의 성질(외심, 내심)', '사각형의 성질(평행사변형 등)', '도형의 닮음', '평행선과 선분의 길이의 비', '피타고라스 정리'] },
      { areaName: '확률과 통계', subTopics: ['경우의 수', '확률의 계산'] }
    ]
  },
  {
    grade: '3학년',
    areas: [
      { areaName: '수와 연산', subTopics: ['제곱근과 실수', '근호를 포함한 식의 계산'] },
      { areaName: '문자와 식', subTopics: ['다항식의 곱셈과 인수분해', '이차방정식의 풀이', '이차방정식의 활용'] },
      { areaName: '함수', subTopics: ['이차함수와 그래프(1)', '이차함수와 그래프(2)'] },
      { areaName: '기하(도형)', subTopics: ['삼각비', '삼각비의 활용', '원과 직선', '원주각', '원주각의 활용'] },
      { areaName: '확률과 통계', subTopics: ['대푯값과 산포도', '상관관계(산점도)'] }
    ]
  }
];

export const MIDDLE_KOREAN_CURRICULUM: CurriculumItem[] = [
  { grade: '1학년', areas: [{ areaName: '독해', subTopics: ['내용 요약하기', '설명하는 글 읽기', '주장하는 글 읽기'] }, { areaName: '문학', subTopics: ['시의 형상화', '소설의 구성', '수필의 특성'] }, { areaName: '문법', subTopics: ['단어의 갈래(품사)', '언어의 본질', '어휘의 체계'] }] },
  { grade: '2학년', areas: [{ areaName: '독해', subTopics: ['설명 방법 파악', '논증 방법의 이해', '기사문 읽기'] }, { areaName: '문학', subTopics: ['한글의 창제 원리', '수필과 극', '문학과 개성'] }, { areaName: '문법', subTopics: ['담화의 개념', '한글 맞춤법 기초', '표준 발음법'] }] },
  { grade: '3학년', areas: [{ areaName: '독해', subTopics: ['독서의 가치', '비판적 읽기', '문제 해결하며 읽기'] }, { areaName: '문학', subTopics: ['한국 현대 문학의 흐름', '고전 소설의 이해', '비유와 상징'] }, { areaName: '문법', subTopics: ['문장의 구조', '음운의 체계와 변동', '국어의 성찰'] }] }
];

export const MIDDLE_ENGLISH_CURRICULUM: CurriculumItem[] = [
  { grade: '1학년', areas: [{ areaName: '문법', subTopics: ['Be동사와 일반동사', '현재진행형', '조동사(can, may)', '의문문과 부정문'] }, { areaName: '대화문', subTopics: ['인사하기', '허락 구하기', '제안하기'] }] },
  { grade: '2학년', areas: [{ areaName: '문법', subTopics: ['수동태', 'to부정사', '동명사', '비교급과 최상급', '관계대명사 기초'] }, { areaName: '대화문', subTopics: ['계획 말하기', '경험 묻기', '충고하기'] }] },
  { grade: '3학년', areas: [{ areaName: '문법', subTopics: ['현재완료', '분사구문', '가정법 과거', '관계부사', '접속사'] }, { areaName: '대화문', subTopics: ['관심사 표현', '동의/반대', '만족/불만족'] }] }
];

export const MIDDLE_SOCIAL_CURRICULUM: CurriculumItem[] = [
  { grade: '1학년', areas: [{ areaName: '지리', subTopics: ['내가 사는 세계', '우리 차례와 환경', '극한 지역의 생활'] }, { areaName: '사회', subTopics: ['개인과 사회 구조', '문화의 이해', '정치 과정과 참여'] }] },
  { grade: '2학년', areas: [{ areaName: '역사/사회', subTopics: ['인권 보호와 헌법', '경제 활동과 선택', '일과 삶의 조화'] }] },
  { grade: '3학년', areas: [{ areaName: '지리/사회', subTopics: ['지구촌과 지속 가능한 발전', '도시화와 인구 문제', '자연재해와 극복'] }] }
];

export const MIDDLE_HISTORY_CURRICULUM: CurriculumItem[] = [
  { grade: '1학년', areas: [{ areaName: '전근대사', subTopics: ['선사 시대와 초기 국가', '삼국의 성립과 발전', '남북국 시대'] }] },
  { grade: '2학년', areas: [{ areaName: '중세/근세', subTopics: ['고려의 성립과 변천', '조선의 건국과 발전'] }] },
  { grade: '3학년', areas: [{ areaName: '근현대사', subTopics: ['근대 사회의 전개', '일제 강점기', '현대 사회의 발전'] }] }
];

export const MIDDLE_SCIENCE_CURRICULUM: CurriculumItem[] = [
  {
    grade: '1학년',
    areas: [
      { areaName: '물리', subTopics: ['여러 가지 힘', '빛과 파동'] },
      { areaName: '화학', subTopics: ['기체의 성질', '물질의 상태 변화'] },
      { areaName: '생명과학', subTopics: ['생물의 다양성'] },
      { areaName: '지구과학', subTopics: ['지구계와 지표 변화'] }
    ]
  },
  {
    grade: '2학년',
    areas: [
      { areaName: '물리', subTopics: ['전기와 자기', '열과 우리 생활'] },
      { areaName: '화학', subTopics: ['물질의 구성'] },
      { areaName: '생명과학', subTopics: ['소화/순환/호흡/배설', '식물과 에너지'] },
      { areaName: '지구과학', subTopics: ['태양계', '대기와 해양'] }
    ]
  },
  {
    grade: '3학년',
    areas: [
      { areaName: '물리', subTopics: ['운동과 에너지'] },
      { areaName: '화학', subTopics: ['화학 반응의 규칙성', '산과 염기'] },
      { areaName: '생명과학', subTopics: ['자극과 반응', '유전과 진화'] },
      { areaName: '지구과학', subTopics: ['별과 우주'] }
    ]
  }
];

export const HIGH_CORE_CURRICULUM: Record<string, CurriculumItem[]> = {
  high_math: [
    {
      grade: '1학년',
      areas: [
        { areaName: '다항식', subTopics: ['다항식의 연산', '항등식과 나머지정리', '인수분해'] },
        { areaName: '방정식/부등식', subTopics: ['복소수와 이차방정식', '이차방정식과 이차함수', '여러 가지 방정식', '여러 가지 부등식'] },
        { areaName: '도형의 방정식', subTopics: ['평면좌표', '직선의 방정식', '원의 방정식', '도형의 이동'] },
        { areaName: '집합과 명제', subTopics: ['집합의 뜻과 표현', '집합의 연산', '명제', '절대부등식'] },
        { areaName: '함수', subTopics: ['함수', '유리함수', '무리함수'] },
        { areaName: '경우의 수', subTopics: ['순열과 조합'] }
      ]
    }
  ],
  high_science: [
    {
      grade: '1학년',
      areas: [
        { areaName: '물질의 규칙성', subTopics: ['우주의 탄생과 원소', '지각과 생명체의 구성 물질', '신소재의 개발'] },
        { areaName: '시스템과 상호작용', subTopics: ['역학적 시스템', '지구 시스템', '생명 시스템'] },
        { areaName: '변화와 다양성', subTopics: ['산화 환원 반응', '산과 염기 중화 반응', '지질 시대와 생물 다양성'] },
        { areaName: '환경과 에너지', subTopics: ['생태계와 환경', '발전과 에너지 생산', '미래 에너지 기술'] }
      ]
    }
  ],
  high_social: [
    {
      grade: '1학년',
      areas: [
        { areaName: '인권과 정의', subTopics: ['행복과 인권', '헌법과 기본권', '사회 정의와 불평등'] },
        { areaName: '문화와 변동', subTopics: ['문화 다양성과 존중', '사회 변동과 사회 문제'] },
        { areaName: '시장과 경제', subTopics: ['자본주의와 합리적 선택', '시장 경제와 금융'] },
        { areaName: '환경과 지속가능성', subTopics: ['자연환경과 인간', '지속 가능한 공간'] }
      ]
    }
  ],
  high_korean_history: [
    {
      grade: '1학년',
      areas: [
        { areaName: '전근대사', subTopics: ['고대 국가의 성격', '고려 사회의 전개', '조선 사회의 성격과 변화'] },
        { areaName: '근대사', subTopics: ['근대 국가 수립 운동', '일제의 식민 지배와 독립운동'] },
        { areaName: '현대사', subTopics: ['대한민국의 수립', '민주주의의 시련과 발전', '통일을 위한 노력'] }
      ]
    }
  ],
  high_korean: [
    {
      grade: '1학년',
      areas: [
        { areaName: '독해', subTopics: ['인문/사회 독해', '과학/기술 독해', '예술/기타 독해'] },
        { areaName: '문학', subTopics: ['현대시/현대소설', '고전시가/고전소설', '수필/극'] },
        { areaName: '문법', subTopics: ['음운의 변동', '한글 맞춤법', '중세 국어의 특징'] }
      ]
    }
  ],
  korean_writing: [
    {
      grade: '2학년',
      areas: [
        { areaName: '화법', subTopics: ['대화와 면접', '토의와 토론', '발표와 강연'] },
        { areaName: '작문', subTopics: ['글쓰기 전략', '설득하는 글쓰기', '정보 전달하는 글쓰기'] }
      ]
    }
  ],
  korean_media: [
    {
      grade: '2학년',
      areas: [
        { areaName: '언어(문법)', subTopics: ['형태와 단어', '문장 성분과 구조', '담화와 규범'] },
        { areaName: '매체', subTopics: ['매체 언어의 특성', '매체 자료의 비판적 수용', '매체 제작 실습'] }
      ]
    }
  ],
  korean_literature: [
    {
      grade: '2학년',
      areas: [
        { areaName: '서정/서사', subTopics: ['현대시의 수용', '고전시가의 이해', '현대소설의 서사', '고전소설의 특징'] },
        { areaName: '극/수필', subTopics: ['희곡과 시나리오', '수필의 미학', '한국 문학의 역사'] }
      ]
    }
  ],
  korean_reading: [
    {
      grade: '2학년',
      areas: [
        { areaName: '독서방법', subTopics: ['사실적 독해', '추론적 독해', '비판적 독해', '창의적 독해'] },
        { areaName: '독서분야', subTopics: ['인문/예술 지문', '사회/문화 지문', '과학/기술 지문', '주제 통합적 독서'] }
      ]
    }
  ],
  living_ethics: [
    {
      grade: '2학년',
      areas: [
        { areaName: '윤리학의 종류', subTopics: ['메타/규범/기술 윤리학', '현대 윤리 사상'] },
        { areaName: '생명/환경 윤리', subTopics: ['죽음과 삶의 윤리', '생명 과학과 윤리', '인간과 자연의 관계'] },
        { areaName: '사회/문화 윤리', subTopics: ['직업과 청렴', '사회 정의와 분배', '성/사랑/가족 윤리'] },
        { areaName: '평화 윤리', subTopics: ['국가와 시민', '정보화와 윤리', '민족 통합과 국제 평화'] }
      ]
    }
  ],
  social_culture: [
    {
      grade: '2학년',
      areas: [
        { areaName: '탐구 방법', subTopics: ['양적 연구와 질적 연구', '자료 수집 방법', '연구 윤리'] },
        { areaName: '개인과 사회', subTopics: ['사회적 상호작용', '사회 집단과 조직', '관료제와 탈관료제'] },
        { areaName: '문화와 변동', subTopics: ['문화의 의미와 특징', '문화 변동의 원인', '사회 불평등 현상'] },
        { areaName: '현대 사회', subTopics: ['저출산/고령화', '다문화 사회', '사회 보장 제도'] }
      ]
    }
  ],
  physics_1: [
    {
      grade: '2학년',
      areas: [
        { areaName: '역학과 에너지', subTopics: ['뉴턴 운동 법칙', '운동량과 충격량', '역학적 에너지 보존', '열역학 법칙', '특수 상대성 이론'] },
        { areaName: '물질과 전자기', subTopics: ['원자와 전기력', '에너지 준위와 밴드 이론', '반도체와 자기성', '전자기 유도'] },
        { areaName: '파동과 정보', subTopics: ['파동의 굴절과 간섭', '빛의 이중성', '물질파'] }
      ]
    }
  ],
  chemistry_1: [
    {
      grade: '2학년',
      areas: [
        { areaName: '화학의 첫걸음', subTopics: ['화학의 유용성', '몰(mole)의 이해', '화학 반응식과 용액의 농도'] },
        { areaName: '원자의 구조', subTopics: ['원자의 구성 입자', '현대적 원자 모형', '원소의 주기적 성질'] },
        { areaName: '결합과 분자', subTopics: ['이온/공유/금속 결합', '분자의 구조와 성질', '분자의 극성'] },
        { areaName: '역동적인 화학', subTopics: ['산화 환원 반응', '중화 반응', '화학 반응과 열'] }
      ]
    }
  ],
  biology_1: [
    {
      grade: '2학년',
      areas: [
        { areaName: '생명 활동', subTopics: ['생명 과학의 특성', '세포의 생명 활동', '에너지 대사와 질병'] },
        { areaName: '항상성과 조절', subTopics: ['신경계와 흥분 전달', '근수축의 원리', '호르몬과 항상성 유지', '인체의 방어 작용'] },
        { areaName: '유전', subTopics: ['세포 주기와 분열', '사람의 유전 상속', '염색체 이상과 유전자 변이'] },
        { areaName: '생태계와 상호작용', subTopics: ['생태계의 구성', '개체군과 군집', '에너지 흐름과 물질 순환'] }
      ]
    }
  ],
  earth_science_1: [
    {
      grade: '2학년',
      areas: [
        { areaName: '고체 지구', subTopics: ['판 구조론과 대륙 이동', '마그마와 화성암', '퇴적 암층과 지질 구조'] },
        { areaName: '대기와 해양', subTopics: ['날씨 변화와 기압', '해수의 성질과 순환', '대기와 해양의 상호작용', '기후 변화'] },
        { areaName: '우주', subTopics: ['별의 물리량과 진화', '외계 행성계 탐사', '외부 은하와 현대 우주론'] }
      ]
    }
  ],
  physics_2: [{ grade: '3학년', areas: [{ areaName: '역학적 상호작용', subTopics: ['포물선 운동', '원운동과 단진동', '행성의 운동', '일과 에너지'] }, { areaName: '전기장과 자기장', subTopics: ['전기장과 전위', '정전기 유도', '전류에 의한 자기장', '전자기 유도'] }, { areaName: '빛과 물질의 이중성', subTopics: ['전자기파의 발생', '볼록 렌즈', '빛의 회절과 간섭', '양자 물리'] }] }],
  chemistry_2: [{ grade: '3학년', areas: [{ areaName: '물질의 상태', subTopics: ['기체/액체/고체', '용액의 농도와 총괄성'] }, { areaName: '화학 반응', subTopics: ['반응 엔탈피', '헤스 법칙', '화학 평형'] }, { areaName: '반응 속도와 촉매', subTopics: ['반응 속도론', '활성화 에너지'] }] }],
  biology_2: [{ grade: '3학년', areas: [{ areaName: '세포의 특성', subTopics: ['세포의 구조와 기능', '세포막을 통한 물질 이동', '효소의 작용'] }, { areaName: '세포 호흡과 광합성', subTopics: ['세포 호흡', '발효', '광합성'] }, { areaName: '유전자 발현', subTopics: ['DNA 구조', '유전 부호의 해석', '유전자 발현 조절'] }] }],
  earth_science_2: [{ grade: '3학년', areas: [{ areaName: '지구의 구조와 지표', subTopics: ['지구의 내부 구조', '지권의 변동', '지각의 물질'] }, { areaName: '대기와 해양의 운동', subTopics: ['단열 변화와 구름', '기압과 바람', '해파와 조석'] }, { areaName: '우주론', subTopics: ['별의 물리량', '우리 은하', '우주의 구조'] }] }],
  korean_geography: [{ grade: '2학년', areas: [{ areaName: '지표와 환경', subTopics: ['한반도의 형성', '우리나라의 기후', '주요 산맥과 지형'] }, { areaName: '생활 공간', subTopics: ['인구 변화와 인구 이동', '도시 체계와 도시 재개발', '농촌과 공업 지역'] }, { areaName: '지속 가능한 국토', subTopics: ['지역 개발과 지역 격차', '환경 문제와 대책'] }] }],
  world_geography: [{ grade: '2학년', areas: [{ areaName: '세계의 기후', subTopics: ['열대/건조/온대 기후', '냉대/한대/고산 기후'] }, { areaName: '문화 지역', subTopics: ['세계의 종교와 문화', '주요 식량과 에너지 자원'] }, { areaName: '현대 세계의 과제', subTopics: ['국제 갈등과 분쟁', '지구촌의 지속 가능성'] }] }],
  ethics_thought: [{ grade: '2학년', areas: [{ areaName: '동양과 한국 윤리', subTopics: ['수기치인(유교)', '무위자연(도교)', '자비와 해탈(불교)'] }, { areaName: '서양 윤리', subTopics: ['행복과 덕(그리스)', '의무와 공리', '현대 실존주의'] }, { areaName: '사회 사상', subTopics: ['이상 사회', '민주주의와 자본주의', '사회 정의와 국가'] }] }],
  politics_law: [{ grade: '2학년', areas: [{ areaName: '민주주의와 법', subTopics: ['정치와 국가', '법치주의', '헌법의 기본 원리'] }, { areaName: '개인 생활과 법', subTopics: ['민법과 계약', '불법 행위와 손해 배상', '가족 관계와 법'] }, { areaName: '정치 과정과 참여', subTopics: ['선거와 정당', '국가 기관(국회/행정부/법원)'] }] }],
  economics: [{ grade: '2학년', areas: [{ areaName: '경제 원리', subTopics: ['희소성과 합리적 선택', '시장 경제의 원리', '수요와 공급'] }, { areaName: '국가와 경제', subTopics: ['국민 소득과 물가', '실업과 인플레이션', '통화 정책과 재정 정책'] }, { areaName: '세계 경제', subTopics: ['무역 원리와 환율', '국제 경제 협력'] }] }],
  east_asian_history: [{ grade: '2학년', areas: [{ areaName: '동아시아의 형성', subTopics: ['선사 시대의 문화', '인구 이동과 국가 형성'] }, { areaName: '교류와 갈등', subTopics: ['률령과 유교', '불교와 성리학', '몽골 제국과 교류'] }, { areaName: '근대화의 갈등', subTopics: ['개항과 근대화 운동', '제국주의의 침략'] }] }],
  world_history: [{ grade: '2학년', areas: [{ areaName: '인류의 기원과 문명', subTopics: ['4대 문명의 발생', '불교/힌두교 문화권', '이슬람 문화권'] }, { areaName: '유럽과 미국', subTopics: ['그리스와 로마', '르네상스와 종교 개혁', '시민 혁명과 산업 혁명'] }, { areaName: '현대 세계', subTopics: ['제1/2차 세계 대전', '냉전 체제와 탈냉전'] }] }],
  high_english: [{ grade: '1학년', areas: [{ areaName: '문법/어법', subTopics: ['동사의 시제(완료/진행)', '가정법과 법의 전환', '관계사와 선행사', '일치와 특수구문'] }, { areaName: '독해유형', subTopics: ['대의 파악(주제/제목)', '빈칸 추론', '순서 배열', '문장 삽입/삭제'] }] }],
  math_1: [{ grade: '2학년', areas: [
    { areaName: '지수/로그', subTopics: ['지수', '로그', '지수함수', '로그함수'] },
    { areaName: '삼각함수', subTopics: ['삼각함수', '삼각함수의 그래프', '삼각함수의 활용'] },
    { areaName: '수열', subTopics: ['등차수열과 등비수열', '수열의 합', '수학적 귀납법'] }
  ]}],
  math_2: [{ grade: '2학년', areas: [
    { areaName: '함수의 극한', subTopics: ['함수의 극한', '함수의 연속'] },
    { areaName: '미분', subTopics: ['미분계수와 도함수', '도함수의 활용(1)', '도함수의 활용(2)', '도함수의 활용(3)'] },
    { areaName: '적분', subTopics: ['부정적분', '정적분', '정적분의 활용'] }
  ]}],
  math_calculus: [{ grade: '3학년', areas: [
    { areaName: '수열의 극한', subTopics: ['수열의 극한', '급수'] },
    { areaName: '미분법', subTopics: ['여러 가지 함수의 미분', '여러 가지 미분법', '도함수의 활용'] },
    { areaName: '적분법', subTopics: ['여러 가지 적분법', '정적분의 활용'] }
  ]}],
  math_stats: [{ grade: '3학년', areas: [
    { areaName: '순열/조합', subTopics: ['여러 가지 순열', '중복조합과 이항정리'] },
    { areaName: '확률', subTopics: ['확률의 뜻과 활용', '조건부확률'] },
    { areaName: '통계', subTopics: ['확산확률분포', '연속확률분포', '통계적 추정'] }
  ]}],
  math_geometry: [{ grade: '3학년', areas: [
    { areaName: '이차곡선', subTopics: ['이차곡선(포물선, 타원, 쌍곡선)', '이차곡선과 직선'] },
    { areaName: '평면벡터', subTopics: ['벡터의 연산', '평면벡터의 성분과 내적'] },
    { areaName: '공간도형/좌표', subTopics: ['공간도형', '공간좌표'] }
  ]}]
};

// 모든 커리큘럼 데이터 통합 맵
export const CURRICULUM_MAP: Record<string, CurriculumItem[]> = {
  middle_math: MIDDLE_MATH_CURRICULUM,
  middle_science: MIDDLE_SCIENCE_CURRICULUM,
  middle_social: MIDDLE_SOCIAL_CURRICULUM,
  middle_history: MIDDLE_HISTORY_CURRICULUM,
  ...Object.fromEntries(
    Object.entries(HIGH_CORE_CURRICULUM).filter(([key]) => 
      !key.includes('korean') && !key.includes('english')
    )
  ),
  // 사회
  living_ethics: HIGH_CORE_CURRICULUM.living_ethics,
  social_culture: HIGH_CORE_CURRICULUM.social_culture,
  korean_geography: HIGH_CORE_CURRICULUM.korean_geography,
  world_geography: HIGH_CORE_CURRICULUM.world_geography,
  ethics_thought: HIGH_CORE_CURRICULUM.ethics_thought,
  politics_law: HIGH_CORE_CURRICULUM.politics_law,
  economics: HIGH_CORE_CURRICULUM.economics,
  east_asian_history: HIGH_CORE_CURRICULUM.east_asian_history,
  world_history: HIGH_CORE_CURRICULUM.world_history,
  // 과학
  physics_1: HIGH_CORE_CURRICULUM.physics_1,
  chemistry_1: HIGH_CORE_CURRICULUM.chemistry_1,
  biology_1: HIGH_CORE_CURRICULUM.biology_1,
  earth_science_1: HIGH_CORE_CURRICULUM.earth_science_1,
  physics_2: HIGH_CORE_CURRICULUM.physics_2,
  chemistry_2: HIGH_CORE_CURRICULUM.chemistry_2,
  biology_2: HIGH_CORE_CURRICULUM.biology_2,
  earth_science_2: HIGH_CORE_CURRICULUM.earth_science_2,
};
