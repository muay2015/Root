import { type SubjectKey } from '../subjectConfig';

export function isScienceSubject(subject: SubjectKey): boolean {
  if (!subject) return false;
  const s = subject.toString().toLowerCase();
  return (
    s.includes('science') ||
    s.includes('physics') ||
    s.includes('chemistry') ||
    s.includes('biology')
  );
}

export function buildSciencePromptRules() {
  return [
    '- [Science/Physics Rules] 모든 물리 변수는 반드시 LaTeX 형식으로 작성하십시오. 예: v_0 → \\(v_0\\), v_{A,max} → \\(v_{A,\\max}\\)',
    '- [Science/Physics Rules] absolutley NO English passage generation. All stem, choices, and stimulus (except Diagram Description variables) MUST be in Korean.',
    '- [Science/Physics Rules] 이 문항은 과학 문항입니다. "English Summary", "Blank Inference", "Sentence Insertion" 등 영어 시험 전용 형식을 절대 사용하지 마십시오.',
    '- [Science/Physics Rules] 지문(stem/stimulus)을 영문으로 작성하면 결정적 오류로 간주됩니다. 반드시 고등 교육 과정 한국어 용어를 사용하십시오.',
    '- [Science/Physics Rules] 절대 금지: v_________0 같은 형태, 수식과 밑줄을 한 문장 내에서 붙여 쓰는 구조.',
    '- [Science/Physics Rules] 빈칸(blank)은 반드시 일반 텍스트로만 생성하십시오. 예: "속력은 ______이다"',
    '- [Science/Physics Rules] 수식과 설명은 반드시 분리하십시오. 예: "초기 속력은 \\(v_0\\)이다"',
    '- [Science/Physics Rules] 문항 구조는 반드시 아래 순서를 따르십시오: (1) 상황 설명, (2) (필요 시) 그림 설명, (3) 조건 제시, (4) 마지막 줄에 질문.',
    '- [Science/Physics Rules] 핵심 질문은 반드시 마지막 줄에 배치하십시오. 예: "비는 얼마인가?"',
    '- [Science/Physics Rules] 기본값은 diagram_svg=null입니다. 아래 경우에만 SVG를 생성하십시오:',
    '  ✅ 힘의 방향·작용점, 운동 방향, 도르래·용수철 연결, 광선 경로 등 배치가 문제 이해의 핵심인 경우',
    '  ✅ 회로도, 광학 경로, 파동 구조처럼 시각적 배치 파악이 필수인 경우',
    '  ✅ 생명과학/지구과학/화학의 구조도·과정도로 텍스트만으로 설명이 어려운 경우',
    '  ❌ 수치 대입·계산만으로 풀리는 문제, 텍스트로 충분한 상황 설명이 가능한 문제는 null',
    '- [Science/Physics Rules] 도형을 생성하는 경우 SVG 규격: viewBox="0 0 360 260" width="100%" style="max-width:360px;display:block". stroke="#222" stroke-width="1.5" fill="none" 기본. font-family="serif" font-size="14" fill="#222".',
    '- [Science/Physics Rules] 힘·속도 벡터는 화살표 marker 사용. 물체는 직사각형(rect) 또는 점. 지면은 두꺼운 선으로 표현.',
    '- [Science/Physics Rules] 값 레이블(거리, 힘의 크기 등)은 반드시 실제 숫자로 직접 표기. 물리량 기호(v₀, F 등) 레이블은 유니코드 첨자 사용.',
  ];
}
