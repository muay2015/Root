export const MIDDLE_MATH_CURRICULUM = [
    {
        grade: '1학년',
        areas: [
            {
                areaName: '수와 연산',
                subTopics: ['소인수분해', '최대공약수와 최소공배수', '정수와 유리수', '정수와 유리수의 사칙계산']
            },
            {
                areaName: '문자와 식',
                subTopics: ['문자 사용과 식의 계산', '일차방정식의 풀이', '일차방정식의 활용']
            },
            {
                areaName: '함수',
                subTopics: ['좌표평면과 그래프', '정비례와 반비례', '변수와 그래프']
            },
            {
                areaName: '기하(도형)',
                subTopics: ['기본 도형(점, 선, 면)', '위치 관계', '평행선의 성질', '작도와 합동', '다각형의 성질', '원과 부채꼴', '입체도형의 겉넓이와 부피']
            },
            {
                areaName: '확률과 통계',
                subTopics: ['자료의 정리와 해석(도수분포표)', '줄기와 잎 그림', '상대도수']
            }
        ]
    },
    {
        grade: '2학년',
        areas: [
            {
                areaName: '수와 연산',
                subTopics: ['유리수와 순환소수']
            },
            {
                areaName: '문자와 식',
                subTopics: ['지수법칙', '다항식의 계산', '일차부등식', '연립일차방정식']
            },
            {
                areaName: '함수',
                subTopics: ['일차함수와 그래프', '일차함수와 일차방정식의 관계']
            },
            {
                areaName: '기하(도형)',
                subTopics: ['삼각형의 성질(외심, 내심)', '사각형의 성질(평행사변형 등)', '도형의 닮음', '평행선과 선분의 길이의 비', '피타고라스 정리']
            },
            {
                areaName: '확률과 통계',
                subTopics: ['경우의 수', '확률의 계산']
            }
        ]
    },
    {
        grade: '3학년',
        areas: [
            {
                areaName: '수와 연산',
                subTopics: ['제곱근과 실수', '근호를 포함한 식의 계산']
            },
            {
                areaName: '문자와 식',
                subTopics: ['다항식의 곱셈과 인수분해', '이차방정식의 풀이', '이차방정식의 활용']
            },
            {
                areaName: '함수',
                subTopics: ['이차함수와 그래프(1)', '이차함수와 그래프(2)']
            },
            {
                areaName: '기하(도형)',
                subTopics: ['삼각비', '삼각비의 활용', '원과 직선', '원주각', '원주각의 활용']
            },
            {
                areaName: '확률과 통계',
                subTopics: ['대푯값과 산포도', '상관관계(산점도)']
            }
        ]
    }
];
export const HIGH_MATH_CURRICULUM = {
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
    math_1: [
        {
            grade: '2학년',
            areas: [
                { areaName: '지수/로그', subTopics: ['지수', '로그', '지수함수', '로그함수'] },
                { areaName: '삼각함수', subTopics: ['삼각함수', '삼각함수의 그래프', '삼각함수의 활용'] },
                { areaName: '수열', subTopics: ['등차수열과 등비수열', '수열의 합', '수학적 귀납법'] }
            ]
        }
    ],
    math_2: [
        {
            grade: '2학년',
            areas: [
                { areaName: '함수의 극한', subTopics: ['함수의 극한', '함수의 연속'] },
                { areaName: '미분', subTopics: ['미분계수와 도함수', '도함수의 활용(1)', '도함수의 활용(2)', '도함수의 활용(3)'] },
                { areaName: '적분', subTopics: ['부정적분', '정적분', '정적분의 활용'] }
            ]
        }
    ],
    math_calculus: [
        {
            grade: '3학년',
            areas: [
                { areaName: '수열의 극한', subTopics: ['수열의 극한', '급수'] },
                { areaName: '미분법', subTopics: ['여러 가지 함수의 미분', '여러 가지 미분법', '도함수의 활용'] },
                { areaName: '적분법', subTopics: ['여러 가지 적분법', '정적분의 활용'] }
            ]
        }
    ],
    math_stats: [
        {
            grade: '3학년',
            areas: [
                { areaName: '순열/조합', subTopics: ['여러 가지 순열', '중복조합과 이항정리'] },
                { areaName: '확률', subTopics: ['확률의 뜻과 활용', '조건부확률'] },
                { areaName: '통계', subTopics: ['확산확률분포', '연속확률분포', '통계적 추정'] }
            ]
        }
    ],
    math_geometry: [
        {
            grade: '3학년',
            areas: [
                { areaName: '이차곡선', subTopics: ['이차곡선(포물선, 타원, 쌍곡선)', '이차곡선과 직선'] },
                { areaName: '평면벡터', subTopics: ['벡터의 연산', '평면벡터의 성분과 내적'] },
                { areaName: '공간도형/좌표', subTopics: ['공간도형', '공간좌표'] }
            ]
        }
    ]
};
