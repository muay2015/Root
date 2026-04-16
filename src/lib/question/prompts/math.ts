import { type SubjectKey } from '../subjectConfig';
import { type PromptBuildInput, buildFeedbackBlock, buildSourceMaterialBlock } from './core';
import { getGenerationRules } from '../generationRules';

export function isMathSubject(subject: SubjectKey): boolean {
  if (!subject) return false;
  const s = subject.toString().toLowerCase();
  return s.includes('math');
}

/**
 * 수학 과목 전용 프롬프트 규칙.
 * AI가 수학 문항을 생성할 때 LaTeX 표기, 필드 분리, 발문 형식 등의 품질을 보장합니다.
 */
export function buildMathPromptRules(): string[] {
  return [
    // ========== 절대 금지 (위반 시 문항 전체 폐기) ==========
    '- [MATH FATAL] 수식의 평문/LaTeX 이중 출력을 절대 금지합니다. "함수 f(x)\\(f(x)\\)" 또는 "수열 {an}\\(\\{a_n\\}\\)" 처럼 같은 수식을 두 번 쓰면 즉시 폐기합니다. 반드시 LaTeX 한 번만 사용하십시오. 올바른 예: "함수 \\(f(x)\\)에 대하여"',
    '- [MATH FATAL] 선지(choices)에 "1", "2", "3", "4", "5" 같은 순번만 넣는 것을 절대 금지합니다. 각 선지는 반드시 구체적인 수학적 값이나 수식이어야 합니다. 예: "7", "\\(\\frac{3}{2}\\)", "\\(2\\sqrt{3}\\)", "\\(-1\\)", "12"',
    '- [MATH FATAL] "~에 관한 분석으로 적절한 것은?", "~에 관한 설명으로 적절한 것은?" 같이 구체적 계산 없이 서술형 해석만 묻는 발문을 금지합니다. 수학 문항의 정답은 반드시 구체적 수치, 수식, 또는 명확한 참/거짓 판별이어야 합니다.',

    // ========== LaTeX 표기 규칙 ==========
    '- [MATH LATEX] 모든 수식 변수, 함수명, 연산은 반드시 LaTeX 구분자 안에서만 표현하십시오. 인라인: \\(...\\), 디스플레이: \\[...\\]',
    '- [MATH LATEX] 한글 문장 안에 a>=3, f(x)=0, lim 같은 평문 수식을 쓰지 마십시오. 반드시 \\(a \\ge 3\\), \\(f(x)=0\\), \\(\\lim\\) 형태로 작성하십시오.',
    '- [MATH LATEX] JSON 내의 모든 백슬래시는 이중(\\\\)으로 작성하십시오.',
    '- [MATH LATEX] 수열 표기 시 반드시 아래 형식을 지키십시오:',
    '  ❌ 나쁜 예: "수열 \\{an\\}의 a5의 값은?" — \\{..\\}가 구분자 밖에 있고, 첨자에 _가 없음',
    '  ✅ 좋은 예: "수열 \\(\\{a_n\\}\\)에 대하여 \\(a_5\\)의 값은?" — \\(\\{a_n\\}\\) 형태로 구분자로 감싸고, _로 첨자 표기',
    '- [MATH LATEX] 첨자(subscript)는 반드시 _ 기호 하나만 사용하십시오. "a1" → \\(a_1\\), "an" → \\(a_n\\), "S10" → \\(S_{10}\\)',
    '- [MATH LATEX] 첨자 표기 시 하이픈(-) 또는 밑줄 여러 개(______)를 절대 사용하지 마십시오. "a---n", "a_____5" 같은 표기는 즉시 폐기합니다.',

    // ========== stem / stimulus 필드 분리 ==========
    '- [MATH FIELD] stem = 한국어 발문 + 간단한 인라인 수식. stimulus = 함수 정의, 조건식, \\begin{cases}, 점화식 등 복잡한 수식 블록.',
    '- [MATH FIELD] 수학 문항은 거의 항상 stimulus가 필요합니다. stimulus를 null로 두면 안 됩니다. 최소한 풀이 대상이 되는 수식 조건을 stimulus에 넣으십시오.',
    '- [MATH FIELD] stimulus 안의 수식은 \\[...\\]로 감싸십시오.',

    // ========== 발문(stem) 품질 ==========
    '- [MATH STEM] 발문은 반드시 "무엇을 구하는가"를 명확히 지정해야 합니다. 예: "\\(f(3)\\)의 값은?", "\\(a+b\\)의 값을 구하시오.", "\\(\\lim_{x \\to 1} f(x)\\)의 값은?"',
    '- [MATH STEM] 발문에 풀이 조건을 장황하게 나열하지 마십시오. 조건은 stimulus에 넣고, stem은 질문만 담으십시오.',

    // ========== 선지(choices) / 정답(answer) ==========
    '- [MATH CHOICE] 5개 선지는 모두 구체적 수학값이어야 합니다. 정수, 분수, 근호, 수식 등 계산으로 도달 가능한 값을 넣으십시오.',
    '- [MATH CHOICE] 오답 선지는 흔한 계산 실수(부호 오류, 공식 혼동, 조건 누락 등)에서 나올 법한 값으로 구성하십시오.',
    '- [MATH CHOICE] answer는 choices 배열의 해당 값과 글자 그대로 동일해야 합니다.',
    '- [MATH CHOICE] 선지 형식을 통일하십시오. 예를 들어 "1"과 "\\\\(1\\\\)"을 함께 쓰면 중복으로 간주되어 오류가 발생합니다. 정수 선지는 모두 평문("1","2","3")으로, LaTeX가 필요한 선지는 모두 LaTeX 형식("\\\\(\\\\frac{1}{2}\\\\)")으로 일관되게 작성하십시오.',

    // ========== 도형 다이어그램 (diagram_svg) ==========
    '- [MATH DIAGRAM] 기본값은 diagram_svg=null입니다. 아래 조건을 모두 충족할 때만 SVG를 생성하십시오.',
    '- [MATH DIAGRAM 생성 조건] 다음 중 하나에 해당하는 경우에만 생성:',
    '  ✅ 도형의 위치 관계(점·선·각·원·현·접선·부채꼴 등)가 문제 이해의 핵심인 경우',
    '  ✅ 좌표평면에서 도형의 배치 또는 교점 위치를 직접 파악해야 하는 경우',
    '  ✅ 입체도형의 구조 파악이 필수인 경우',
    '- [MATH DIAGRAM 생성 금지] 다음 중 하나라도 해당하면 반드시 null:',
    '  ❌ d와 r 비교처럼 주어진 수치만 대입하면 바로 판단 가능한 문제',
    '  ❌ 그림이 정답(교점 개수, 접점 여부 등)을 직접 노출하는 경우',
    '  ❌ 공식 대입·계산만으로 해결되는 문제',
    '  ❌ 텍스트로 충분히 상황 설명이 가능한 경우',
    '  ❌ "원과 직선의 위치 관계" 문제이더라도 d, r 값 비교만으로 교점 수를 판단하는 단순형',
    '- [MATH DIAGRAM 도형 생성 시 추가 원칙]',
    '  • 정답을 직접 드러내는 요소 금지 — 교점·접점을 ●로 강조 표시하지 마십시오',
    '  • 문제 이해를 위한 최소한의 구조만 표현하십시오',
    '  • 도형은 정답 보조 도구가 아닌 상황 파악 보조 도구입니다',
    '',
    '=== 원-직선 관계 다이어그램 생성 지침 (생성이 필요하다고 판단된 경우만 적용) ===',
    '',
    '【STEP 1】 문제에서 d(중심~직선 거리)와 r(반지름) 값을 추출하십시오.',
    '【STEP 2】 비교하여 3가지 경우 중 하나를 선택하십시오:',
    '  - d > r  →  경우A: 원 밖 (교점 없음)',
    '  - d = r  →  경우B: 접함 (접점 1개)',
    '  - d < r  →  경우C: 두 점에서 만남 (교점 2개)',
    '【STEP 3】 좌표를 계산하십시오:',
    '  scale  = min(floor(60 / max(d, r)), 20)   [px/단위]',
    '  r_px   = r × scale',
    '  d_px   = d × scale',
    '  CX=180, CY=115   [원의 중심 캔버스 좌표]',
    '  foot_y = CY + d_px   [직선의 y좌표 = 수선의 발]',
    '  경우C 전용: ix_offset = round(sqrt(r_px² - d_px²))   [교점 x거리]',
    '【STEP 4】 아래 각 경우 예시를 참고하여 실제 좌표로 대입하십시오.',
    '',
    '── 공통 SVG 규격 ──',
    '  viewBox="0 0 360 220"  width="100%"  style="max-width:360px;display:block"',
    '  stroke="#222"  stroke-width="1.5"  fill="none"  (기본)',
    '  수선(점선): stroke-dasharray="5,3"  stroke-width="1.2"',
    '  직각 표시:  <path d="M CX-6,foot_y L CX-6,foot_y-6 L CX,foot_y-6" stroke="#222" stroke-width="1.2" fill="none"/>',
    '  점(중심/교점/접점): <circle r="3" fill="#222"/>',
    '  텍스트: font-family="serif"  font-size="13"  fill="#222"  — 레이블은 선에서 6-8px 오프셋',
    '  ⚠ JSON 안에서 SVG의 큰따옴표(")는 모두 \\" 로 이스케이프하십시오.',
    '',
    '━━━ 경우A: d > r  (교점 없음) ━━━',
    '예: d=5, r=3, scale=12 → d_px=60, r_px=36, foot_y=175',
    '  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 210" width="100%" style="max-width:360px;display:block">',
    '    <line x1="30" y1="175" x2="320" y2="175" stroke="#222" stroke-width="1.5"/>',
    '    <text x="326" y="180" font-family="serif" font-size="14" fill="#222" font-style="italic">l</text>',
    '    <circle cx="180" cy="115" r="36" stroke="#222" stroke-width="1.5" fill="none"/>',
    '    <circle cx="180" cy="115" r="3" fill="#222"/>',
    '    <text x="187" y="112" font-family="serif" font-size="14" fill="#222" font-style="italic">O</text>',
    '    <line x1="180" y1="115" x2="180" y2="175" stroke="#222" stroke-width="1.2" stroke-dasharray="5,3"/>',
    '    <path d="M 174,175 L 174,169 L 180,169" stroke="#222" stroke-width="1.2" fill="none"/>',
    '    <text x="185" y="150" font-family="serif" font-size="13" fill="#222">5</text>',
    '    <line x1="180" y1="115" x2="205" y2="90" stroke="#222" stroke-width="1.2"/>',
    '    <text x="198" y="96" font-family="serif" font-size="13" fill="#222">3</text>',
    '  </svg>',
    '  ※ 직선이 원보다 아래에 위치 / 수선은 원을 통과하여 직선까지 연장 / 교점·접점 표시 없음',
    '',
    '━━━ 경우B: d = r  (접점 1개) ━━━',
    '예: d=4, r=4, scale=15 → d_px=60, r_px=60, foot_y=175',
    '접점 = 수선의 발 = 원 위의 점 → 모두 (CX, foot_y) = (180, 175) 으로 일치',
    '  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 210" width="100%" style="max-width:360px;display:block">',
    '    <line x1="30" y1="175" x2="320" y2="175" stroke="#222" stroke-width="1.5"/>',
    '    <text x="326" y="180" font-family="serif" font-size="14" fill="#222" font-style="italic">l</text>',
    '    <circle cx="180" cy="115" r="60" stroke="#222" stroke-width="1.5" fill="none"/>',
    '    <circle cx="180" cy="115" r="3" fill="#222"/>',
    '    <text x="187" y="112" font-family="serif" font-size="14" fill="#222" font-style="italic">O</text>',
    '    <line x1="180" y1="115" x2="180" y2="175" stroke="#222" stroke-width="1.2" stroke-dasharray="5,3"/>',
    '    <path d="M 174,175 L 174,169 L 180,169" stroke="#222" stroke-width="1.2" fill="none"/>',
    '    <circle cx="180" cy="175" r="3.5" fill="#222"/>',
    '    <text x="185" y="150" font-family="serif" font-size="13" fill="#222">4</text>',
    '    <line x1="180" y1="115" x2="222" y2="73" stroke="#222" stroke-width="1.2"/>',
    '    <text x="207" y="87" font-family="serif" font-size="13" fill="#222">4</text>',
    '  </svg>',
    '  ※ 직선이 원의 가장 아래 점에 딱 닿음 / 접점(●)을 수선의 발에 표시 / 직각 표시 포함',
    '',
    '━━━ 경우C: d < r  (교점 2개) ━━━',
    '예: d=3, r=5, scale=15 → d_px=45, r_px=75, foot_y=160, ix_offset=sqrt(75²−45²)=60',
    '교점 좌표: (CX−60, foot_y)=(120,160)  /  (CX+60, foot_y)=(240,160)',
    '  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220" width="100%" style="max-width:360px;display:block">',
    '    <line x1="30" y1="160" x2="320" y2="160" stroke="#222" stroke-width="1.5"/>',
    '    <text x="326" y="165" font-family="serif" font-size="14" fill="#222" font-style="italic">l</text>',
    '    <circle cx="180" cy="115" r="75" stroke="#222" stroke-width="1.5" fill="none"/>',
    '    <circle cx="120" cy="160" r="3.5" fill="#222"/>',
    '    <circle cx="240" cy="160" r="3.5" fill="#222"/>',
    '    <circle cx="180" cy="115" r="3" fill="#222"/>',
    '    <text x="187" y="112" font-family="serif" font-size="14" fill="#222" font-style="italic">O</text>',
    '    <line x1="180" y1="115" x2="180" y2="160" stroke="#222" stroke-width="1.2" stroke-dasharray="5,3"/>',
    '    <path d="M 174,160 L 174,154 L 180,154" stroke="#222" stroke-width="1.2" fill="none"/>',
    '    <text x="185" y="141" font-family="serif" font-size="13" fill="#222">3</text>',
    '    <line x1="180" y1="115" x2="233" y2="62" stroke="#222" stroke-width="1.2"/>',
    '    <text x="213" y="82" font-family="serif" font-size="13" fill="#222">5</text>',
    '  </svg>',
    '  ※ 직선이 원을 관통 / 교점 2개(●)를 원 경계 위에 표시 / 교점 x = CX ± ix_offset',

    // ========== 올바른 문항 예시 ==========
    '- [MATH EXAMPLE] 좋은 예: stem="다항함수 \\(f(x)\\)가 다음 조건을 만족시킬 때, \\(f(2)\\)의 값은?", stimulus="\\[f\'(x) = 3x^2 - 4x + 1,\\quad f(0) = 2\\]", choices=["3","5","7","9","11"], answer="7", diagram_svg=null',
    '- [MATH EXAMPLE] 좋은 예: stem="등차수열 \\(\\{a_n\\}\\)에 대하여 \\(a_1 + a_{10}\\)의 값은?", stimulus="\\[a_3 = 7,\\quad a_7 = 19\\]", choices=["24","26","28","30","32"], answer="26", diagram_svg=null',
  ];
}

/**
 * 수능 수학 전용 프롬프트 빌더.
 * 범용 CSAT 프롬프트 대신 수학에 최적화된 구조를 제공합니다.
 */
export function buildCsatMathPrompt(input: PromptBuildInput): string {
  const rules = getGenerationRules({
    subject: input.subject,
    difficulty: input.difficulty,
    schoolLevel: 'csat',
  });

  const questionType = input.questionType ?? '전체';

  return [
    '당신은 대한민국 수능 수학 영역 출제 전문가입니다.',
    '수학적 사고력과 문제 해결 능력을 측정하는 고품질 객관식(5지선다) 문항을 생성하십시오.',
    '',
    '=== 출력 형식 (JSON 배열) ===',
    '반드시 아래 형식의 JSON 배열만 반환하십시오. 다른 텍스트를 추가하지 마십시오.',
    '```',
    '[',
    '  {',
    '    "topic": "수열",',
    '    "type": "multiple",',
    '    "stem": "등차수열 \\\\(\\\\{a_n\\\\}\\\\)에 대하여 \\\\(a_1 + a_{10}\\\\)의 값은?",',
    '    "stimulus": "\\\\[a_3 = 7, \\\\quad a_7 = 19\\\\]",',
    '    "choices": ["24", "26", "28", "30", "32"],',
    '    "answer": "26",',
    '    "explanation": "등차수열의 성질에 의해 a_1 + a_{10} = a_3 + a_7 = 7 + 19 = 26",',
    '    "diagram_svg": null',
    '  }',
    ']',
    '```',
    '',
    '=== 필드 규칙 ===',
    '• stem: 한국어 발문. "\\\\(f(2)\\\\)의 값은?", "\\\\(a+b\\\\)의 값을 구하시오." 등 구체적 수치를 묻는 질문만 허용.',
    '• stimulus: 수식 조건 블록. \\\\[...\\\\]로 감싼 display math. 모든 수학 문항은 반드시 stimulus를 포함해야 합니다(null 금지).',
    '• choices: 5개의 구체적 수학값. 계산 결과인 정수, 분수(\\\\(\\\\frac{a}{b}\\\\)), 근호 등. 아무 의미 없이 "1","2","3","4","5"를 순번으로만 나열하는 것은 금지. 단, "참인 것의 개수는?", "조건을 만족하는 자연수의 개수는?" 처럼 개수를 묻는 발문에서 choices=["1","2","3","4","5"]는 유효한 정답 범위이므로 허용.',
    '• answer: choices 중 하나와 글자 그대로 동일.',
    '• diagram_svg: 좌표계·원·삼각형·직선 등 기하 도형이 포함된 문항은 SVG 문자열. 순수 대수·수열·통계 문항은 null.',
    '',
    '=== 절대 금지 사항 ===',
    '1. 수식 이중 출력: "함수 f(x)\\\\(f(x)\\\\)" → 폐기. "함수 \\\\(f(x)\\\\)"만 허용.',
    '2. 서술형 발문: "~에 관한 분석/설명으로 적절한 것은?" → 폐기. 반드시 구체적 값을 묻는 발문.',
    '3. 순번만 나열한 선지: 의미 없이 choices=["1","2","3","4","5"]만 쓰는 것 → 폐기. 단, 발문이 "참인 것의 개수는?", "개수를 구하시오" 등 개수를 묻는 형식이면 choices=["1","2","3","4","5"]는 허용.',
    '4. stimulus 누락: stimulus=null → 폐기.',
    '5. 평문 수식: 한글 사이에 f(x)=0, a>=3 등 LaTeX 미사용 → 폐기.',
    '6. LaTeX 구분자 없는 명령어: "수열 \\{an\\}" 처럼 \\{, \\frac, \\sqrt 등이 \\(...\\) 밖에 나오면 폐기. 반드시 \\(\\{a_n\\}\\) 형태로.',
    '7. 첨자 생략: "a5", "an", "S10" 같이 _없이 붙여쓰기 → 폐기. 반드시 \\(a_5\\), \\(a_n\\), \\(S_{10}\\) 형태로.',
    '',
    '=== LaTeX 규칙 ===',
    '• 인라인: \\\\(...\\\\), 디스플레이: \\\\[...\\\\]',
    '• JSON 내 백슬래시는 이중(\\\\\\\\)으로 작성. 예: "\\\\\\\\(x^2\\\\\\\\)", "\\\\\\\\frac{1}{2}"',
    '• \\\\begin{cases}, \\\\lim, \\\\frac, \\\\sqrt 등 자유롭게 사용 가능.',
    '',
    `=== 생성 조건 ===`,
    `영역: ${rules.subjectLabel}`,
    `세부 유형: ${questionType}`,
    `난이도: ${input.difficulty}`,
    `문항 수: ${input.count}`,
    `반드시 정확히 ${input.count}문항을 생성하십시오.`,
    '',
    ...rules.combinedConstraints.map((rule) => `- ${rule}`),
    '',
    buildFeedbackBlock(input.validationFeedback),
    '',
    buildSourceMaterialBlock(input),
  ].join('\n');
}
