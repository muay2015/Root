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
    '- [Science/Physics Rules] 모든 물리 문제는 반드시 stimulus에 [Diagram Description]으로 시작하는 상세한 그림 설명을 포함하십시오. (물체의 위치, 방향, 힘 또는 연결 상태 등)',
  ];
}
