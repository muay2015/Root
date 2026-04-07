import type { ReactNode } from 'react';
import { PenLine, Circle, X } from 'lucide-react';
import { ChoiceList, ChoiceItemData } from './ChoiceList';
import { OXChoiceList } from './OXChoiceList';
import { QuestionStimulusBox } from './QuestionStimulusBox';
import { parseExamQuestionParts, type ExamQuestion } from './types';

const QUESTION_CONTENT_WIDTH = 'max-w-[44rem]';

type ExamQuestionItemProps = {
  question: ExamQuestion;
  questionNumber: number;
  response: string | undefined;
  active: boolean;
  onSelectChoice: (questionId: number, choice: string) => void;
  onChangeText: (questionId: number, value: string) => void;
};

function PromptText({ text }: { text: string }) {
  // <조건>, [보기] 등 괄호로 둘러싸인 부분 분리
  const parts = text.split(/(<[^>]+>|\[[^\]]+\])/g).filter(Boolean);

  return (
    <>
      {parts.map((part, index) => {
        const isBracket = /^<[^>]+>$/.test(part) || /^\[[^\]]+\]$/.test(part);

        if (isBracket) {
          const innerText = part.slice(1, -1).trim();
          
          // 내용이 짧은 경우 뱃지로 표시 (예: "보기", "조건", "자료")
          if (innerText.length > 0 && innerText.length <= 15) {
            return (
              <span 
                key={`${part}-${index}`} 
                className="mx-1.5 my-1 inline-flex items-center justify-center rounded-md bg-slate-700 px-2.5 py-0.5 text-[14px] font-bold tracking-[0.1em] text-white shadow-sm align-baseline shadow-slate-200"
              >
                {innerText}
              </span>
            );
          }
          
          // 내용이 길면 진하게만 표시
          return (
            <span key={`${part}-${index}`} className="font-bold tracking-[0.01em] text-slate-900">
              {part}
            </span>
          );
        }

        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}

function QuestionRow({
  leading,
  content,
}: {
  leading?: ReactNode;
  content: ReactNode;
}) {
  return (
    <div className="flex w-full items-start gap-3 sm:gap-4">
      {leading && <div className="shrink-0 pt-[2px] sm:pt-1">{leading}</div>}
      <div className="w-full min-w-0">{content}</div>
    </div>
  );
}

function QuestionContent({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const classes = [QUESTION_CONTENT_WIDTH, className].filter(Boolean).join(' ');
  return <div className={classes}>{children}</div>;
}

/**
 * 질문 텍스트 내에 "A는/B는", "(가)/(나)" 형태로 자료가 섞여 있을 때
 * 자동으로 <자료> 마커를 삽입하여 박스로 분리될 수 있게 전처리한다.
 *
 * 예) "다음은 기상 자료이다. A 지역은 기압이 높다. B 지역은 비가 내린다. 바르게 설명한 것은?"
 *  → "다음은 기상 자료이다.\n<자료>\nA 지역은 기압이 높다.\nB 지역은 비가 내린다.\n바르게 설명한 것은?"
 */
// ㉠~㉭ 범위의 원문자 한글 자모 (U+3260~U+326E)
const CIRCLE_JAMO_REGEX = /[㉠-㉭]/;

function injectDataBlockMarkers(text: string): string {
  // 이미 <보기>, [조건] 등 명시적 박스 마커가 있으면 처리 불필요
  if (/(<보기>|\[보기\]|<조건>|\[조건\]|<자료>|\[자료\])/.test(text)) return text;

  // --- 케이스 1: ㉠/㉡/㉢ 형태의 보기 열거 감지 ---
  // 예) "여름철 날씨로 올바른 것은? ㉠ 북태평양 기단의... ㉡ 덥고 습한... ㉢ 시베리아..."
  if (CIRCLE_JAMO_REGEX.test(text)) {
    const isQuestionPart = (s: string) =>
      /옳은 것은|바르게 설명|고른 것은|적절한 것은|맞는 것은|알맞은 것은|추론한 것은|설명한 것은/.test(s) ||
      s.trim().endsWith('?');

    // ㉠ 등장 위치 기준으로 앞/뒤 분리
    const firstJamoIndex = text.search(CIRCLE_JAMO_REGEX);
    if (firstJamoIndex > 0) {
      const beforeBlock = text.substring(0, firstJamoIndex).trim();
      const dataBlock = text.substring(firstJamoIndex);

      // 보기 블록 내 마지막 질문 문장 추출 시도
      // 마침표로 분리 후 마지막이 질문인지 확인
      const raw = dataBlock.replace(/\n+/g, ' ');
      const sentParts: string[] = [];
      const sr = /[^.!?。]+[.!?。]+/g;
      let sm;
      while ((sm = sr.exec(raw)) !== null) sentParts.push(sm[0].trim());
      const tail = raw.substring(raw.search(/[^.!?。]+$/)).trim();
      if (tail && !sentParts.some(s => s.includes(tail))) sentParts.push(tail);

      const lastSentence = sentParts[sentParts.length - 1] ?? '';
      const hasTrailingQuestion = isQuestionPart(lastSentence);

      // 보기 블록에서 질문 문장을 뒤로 빼기
      let cleanDataBlock = dataBlock;
      let trailingQuestion = '';
      if (hasTrailingQuestion && sentParts.length > 1) {
        const lastIdx = dataBlock.lastIndexOf(lastSentence);
        if (lastIdx > 0) {
          cleanDataBlock = dataBlock.substring(0, lastIdx).trim();
          trailingQuestion = lastSentence;
        }
      }

      // ㉠ 앞 부분도 질문일 수 있으므로 함께 구성
      const resultParts: string[] = [];
      if (beforeBlock.length > 0) resultParts.push(beforeBlock);
      resultParts.push('<보기>');
      // ㉠/㉡/㉢ 사이에 줄바꿈 삽입
      const formattedBlock = cleanDataBlock
        .replace(/([^\n])\s*([㉠-㉭])/g, '$1\n$2');
      resultParts.push(formattedBlock);
      if (trailingQuestion.length > 0) resultParts.push(trailingQuestion);
      else if (!isQuestionPart(beforeBlock)) {
        // 앞 부분 전체가 도입부+질문인지 확인해서 질문이 없으면 경고 없이 원본 반환
      }
      return resultParts.join('\n');
    }
  }

  // --- 케이스 2: A/B 지역 또는 (가)/(나) 형태의 자료 블록 ---
  const raw = text.replace(/\n+/g, ' ');
  const sentenceRegex = /[^.!?。]+[.!?。]+/g;
  const sentences: string[] = [];
  let m;
  while ((m = sentenceRegex.exec(raw)) !== null) {
    const s = m[0].trim();
    if (s.length > 0) sentences.push(s);
  }
  const lastIndex = raw.search(/[^.!?。]+$/);
  if (lastIndex !== -1) {
    const tail = raw.substring(lastIndex).trim();
    if (tail.length > 0 && !sentences.some(s => s.includes(tail))) sentences.push(tail);
  }

  if (sentences.length < 3) return text;

  const isDataSentence = (s: string) =>
    /^[A-Z]\s*(지역|항목|학생|씨|국|나라|언어|문화|팀|군)?\s*(은|는|이|가|의)\s+/.test(s) ||
    /^\(가\)|\(나\)/.test(s) ||
    /^[A-Z]형|^[A-Z]안/.test(s);

  const isQuestionSentence = (s: string) =>
    /옳은 것은|바르게 설명|고른 것은|적절한 것은|맞는 것은|알맞은 것은|추론한 것은|설명한 것은/.test(s) ||
    s.trim().endsWith('?');

  let dataStart = -1;
  let dataEnd = -1;
  for (let i = 0; i < sentences.length; i++) {
    if (isDataSentence(sentences[i]) && !isQuestionSentence(sentences[i])) {
      if (dataStart === -1) dataStart = i;
      dataEnd = i;
    }
  }

  if (dataStart === -1) return text;
  const hasQuestionAfter = sentences.slice(dataEnd + 1).some(isQuestionSentence);
  if (!hasQuestionAfter) return text;

  const introParts = sentences.slice(0, dataStart);
  const dataParts = sentences.slice(dataStart, dataEnd + 1);
  const questionParts = sentences.slice(dataEnd + 1);

  const result: string[] = [];
  if (introParts.length > 0) result.push(introParts.join(' '));
  result.push('<자료>');
  result.push(dataParts.join('\n'));
  if (questionParts.length > 0) result.push(questionParts.join(' '));

  return result.join('\n');
}

function PromptRenderer({ text }: { text: string }) {
  // A/B 자료 블록이 섞여 있으면 먼저 <자료> 마커를 삽입
  const markedText = injectDataBlockMarkers(text);

  // 지문 텍스트 내에 뭉쳐있는 ①~⑳ 원문자나 ㄱ., ㄴ. 기호 앞에 강제 줄바꿈을 주어 가독성을 크게 높임
  const processedText = markedText
    .replace(/([^\n<])\s*([①-⑳])/g, '$1\n$2')
    // ㉠~㉭ 원문자 한글 자모 앞에도 줄바꿈 삽입 (injectDataBlockMarkers에서 미처리된 경우 보완)
    .replace(/([^\n<])\s*([㉠-㉭])/g, '$1\n$2')
    .replace(/([^\n<])\s+(ㄱ\.|ㄴ\.|ㄷ\.|ㄹ\.|ㅁ\.)(?=\s)/g, '$1\n$2');

  const lines = processedText.split('\n').map((line) => line.trim());
  const elements: { type: 'normal' | 'box'; title?: string; text: string }[] = [];

  let currentNormalLines: string[] = [];
  let currentBoxTitle: string | null = null;
  let currentBoxLines: string[] = [];

  const flushNormal = () => {
    if (currentNormalLines.length > 0) {
      elements.push({ type: 'normal', text: currentNormalLines.join('\n') });
      currentNormalLines = [];
    }
  };

  const flushBox = () => {
    if (currentBoxTitle) {
      elements.push({ type: 'box', title: currentBoxTitle, text: currentBoxLines.join('\n') });
      currentBoxTitle = null;
      currentBoxLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const boxStartMatch = line.match(/^(<보기>|\[조건\]|<조건>|\[보기\]|<자료>|\[자료\])\s*(.*)$/);

    if (boxStartMatch) {
      flushNormal();
      flushBox();
      currentBoxTitle = boxStartMatch[1].slice(1, -1);
      if (boxStartMatch[2]) {
        currentBoxLines.push(boxStartMatch[2]);
      }
    } else {
      if (currentBoxTitle) {
        currentBoxLines.push(line);
      } else {
        currentNormalLines.push(line);
      }
    }
  }

  flushNormal();
  flushBox();

  // 처리된 box 중 마지막 라인이 질문 형태이면 다시 normal로 뺌
  const lastElement = elements[elements.length - 1];
  if (lastElement && lastElement.type === 'box') {
    const boxLines = lastElement.text.split('\n');
    if (boxLines.length > 1) {
      const lastLine = boxLines[boxLines.length - 1];
      if (
        /(무엇|어떤|옳은 것은|고른 것은|추론한 것은|해석한 것은|적절한 것은|한가\?|인가\?|인가\.|할까\?|\?)$/.test(
          lastLine,
        )
      ) {
        boxLines.pop();
        lastElement.text = boxLines.join('\n');
        elements.push({ type: 'normal', text: lastLine });
      }
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5">
      {elements.map((el, index) => {
        if (el.type === 'box' && el.text.trim().length === 0) {
          return (
            <p
              key={index}
              className="whitespace-pre-wrap break-words break-keep text-[16px] leading-[1.7] text-slate-900 sm:text-[17px] sm:leading-[1.7]"
            >
              <PromptText text={`<${el.title}>`} />
            </p>
          );
        }

        if (el.type === 'box') {
          return (
            <div
              key={index}
              className="my-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5"
            >
              <div className="flex items-center gap-1.5 border-b border-slate-200/60 bg-slate-50 px-4 py-2.5 sm:px-5">
                <span className="text-[13px] font-bold tracking-[0.05em] text-slate-700">
                  {el.title}
                </span>
              </div>
              <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-slate-50/50">
                <p className="whitespace-pre-wrap break-words break-keep text-[15px] leading-[1.7] text-slate-800 sm:text-[16px] sm:leading-[1.8]">
                  <PromptText text={el.text} />
                </p>
              </div>
            </div>
          );
        }

        return (
          <p
            key={index}
            className="whitespace-pre-wrap break-words break-keep text-[16px] leading-[1.7] text-slate-900 sm:text-[17px] sm:leading-[1.7]"
          >
            <PromptText text={el.text} />
          </p>
        );
      })}
    </div>
  );
}

/**
 * stem에서 "이름: '발언'" 또는 "이름: 발언" 패턴을 파싱하여
 * { 발언내용: 이름 } 역방향 매핑을 반환한다.
 * 예) "민수: '상처는...' 지연: '상처를...'" → Map { "'상처는...'" → "민수", "'상처를...'" → "지연" }
 */
function buildSpeakerMapFromStem(stem: string): Map<string, string> {
  const map = new Map<string, string>();
  // 패턴: 1~5글자 한글 이름 + 콜론 + 임의의 텍스트 (다음 이름 패턴 전까지)
  const pattern = /([가-힣]{1,5})\s*[:：]\s*([\s\S]*?)(?=([가-힣]{1,5})\s*[:：]|$)/g;
  let m;
  while ((m = pattern.exec(stem)) !== null) {
    const name = m[1];
    const content = m[2].trim();
    if (content.length > 0) {
      // 전체 내용 및 따옴표 제거 버전 모두 등록 (매칭 유연성)
      map.set(content, name);
      map.set(content.replace(/^['"""'']|['"""'']$/g, '').trim(), name);
    }
  }
  return map;
}

/**
 * choice 텍스트와 speakerMap을 비교하여 일치하는 이름을 반환한다.
 * 완전 일치 우선 → 앞 20자 부분 일치 순으로 시도한다.
 */
function findSpeakerForChoice(choiceText: string, speakerMap: Map<string, string>): string | undefined {
  const clean = choiceText.replace(/^['"""'']|['"""'']$/g, '').trim();
  // 완전 일치
  if (speakerMap.has(choiceText)) return speakerMap.get(choiceText);
  if (speakerMap.has(clean)) return speakerMap.get(clean);
  // 부분 일치: speakerMap의 키가 choice를 포함하거나 choice가 키를 포함하는 경우
  for (const [key, name] of speakerMap.entries()) {
    const cleanKey = key.replace(/^['"""'']|['"""'']$/g, '').trim();
    if (clean.length > 5 && (cleanKey.includes(clean.substring(0, 15)) || clean.includes(cleanKey.substring(0, 15)))) {
      return name;
    }
  }
  return undefined;
}

export function ExamQuestionItem(props: ExamQuestionItemProps) {
  const { question, questionNumber, response, active, onSelectChoice, onChangeText } = props;

  let { prompt, stimulus } = parseExamQuestionParts(question.stem);
  let finalChoices: any[] = question.choices ?? [];

  const normalizeChoice = (c: string) => c.replace(/<[^>]+>/g, '').trim();
  const areChoicesJustCircledNumbers = finalChoices.length > 0 && finalChoices.every(c => /^[①-⑳]$/.test(normalizeChoice(c)));

  if (areChoicesJustCircledNumbers) {
    const fullStem = question.stem.replace(/\r\n/g, '\n');
    const keys = finalChoices.map(c => normalizeChoice(c)).filter(c => /^[①-⑳]$/.test(c)).sort();
    const minKey = keys[0];

    if (minKey) {
      const blockStart = fullStem.lastIndexOf(minKey);
      if (blockStart !== -1) {
        const optionBlock = fullStem.substring(blockStart);
        const circleRegex = /([①-⑳])\s*([\s\S]*?)(?=[①-⑳]|$)/g;

        let match;
        const optionsMap = new Map<string, string>();
        while ((match = circleRegex.exec(optionBlock)) !== null) {
          optionsMap.set(match[1], match[2].trim());
        }

        const allChoicesAreKeys = finalChoices.every(c => {
          const text = normalizeChoice(c);
          return optionsMap.has(text);
        });

        const hasMeaningfulText = Array.from(optionsMap.values()).some(text => text.length > 0);

        if (allChoicesAreKeys && hasMeaningfulText) {
          // --- 발화자 이름 매칭 로직 ---
          // 제시문(stem)에서 "이름: ① 발언내용" 또는 "이름: 발언내용" 형태를 파싱하여
          // 각 원문자에 해당하는 발화자 이름을 추출한다.
          const speakerByCircle = new Map<string, string>();

          // 패턴 1: "민수: ① '...'", "지연: ②..." → 이름과 원문자가 함께 있는 경우
          const namedCirclePattern = /([가-힣]{1,5})\s*[:：]\s*([①-⑳])/g;
          let namedMatch;
          while ((namedMatch = namedCirclePattern.exec(fullStem)) !== null) {
            speakerByCircle.set(namedMatch[2], namedMatch[1]);
          }

          // 패턴 2: 이름이 원문자보다 앞에 있는 대화 형식 → 줄 순서 기반 매칭
          // 예) "민수: '상처는...'\n지연: '상처를...'" 형태로 지문에 나열된 경우
          if (speakerByCircle.size === 0) {
            const dialogLines = fullStem
              .split('\n')
              .map(l => l.trim())
              .filter(l => /^[가-힣]{1,5}\s*[:：]/.test(l));

            const circleOrder = keys; // 이미 정렬된 원문자 배열
            dialogLines.forEach((line, lineIdx) => {
              if (lineIdx < circleOrder.length) {
                const nameMatch = line.match(/^([가-힣]{1,5})\s*[:：]/);
                if (nameMatch) {
                  speakerByCircle.set(circleOrder[lineIdx], nameMatch[1]);
                }
              }
            });
          }

          finalChoices = finalChoices.map(c => {
            const textKey = normalizeChoice(c);
            const extractedText = optionsMap.get(textKey) ?? '';
            const speakerName = speakerByCircle.get(textKey);
            // 이미 이름이 앞에 붙어있는 경우 중복 방지
            const alreadyHasName =
              speakerName && extractedText.startsWith(speakerName);
            const display = speakerName && !alreadyHasName
              ? `${speakerName}: ${extractedText}`
              : extractedText || c;
            return { value: c, display };
          });

          let cleanStem = fullStem.substring(0, blockStart).trim();
          cleanStem = cleanStem.replace(/(<보기>|\[조건\]|<조건>|\[보기\]|<자료>|\[자료\])\s*$/, '').trim();

          const parts = parseExamQuestionParts(cleanStem);
          prompt = parts.prompt;
          stimulus = parts.stimulus;
        }
      }
    }
  }

  // --- 텍스트 선택지에 대한 발화자 이름 매칭 (원문자가 아닌 경우) ---
  // choices가 이미 발언 내용 텍스트로 저장되어 있고, stem에 "이름: 발언" 패턴이 있는 경우
  if (!areChoicesJustCircledNumbers && finalChoices.length > 0) {
    const speakerMap = buildSpeakerMapFromStem(question.stem);
    if (speakerMap.size > 0) {
      const enriched = finalChoices.map(c => {
        const raw = typeof c === 'object' ? (c as any).display ?? (c as any).value : String(c);
        const value = typeof c === 'object' ? (c as any).value : String(c);
        const speaker = findSpeakerForChoice(raw, speakerMap);
        // 이미 이름이 앞에 붙어 있으면 중복 방지
        const alreadyHasName = speaker && raw.startsWith(speaker);
        const display = speaker && !alreadyHasName ? `${speaker}: ${raw}` : raw;
        return { value, display };
      });
      // 하나라도 이름을 찾은 경우에만 교체 (오탐 방지)
      const anyFound = enriched.some((c, i) => {
        const origRaw = typeof finalChoices[i] === 'object'
          ? (finalChoices[i] as any).display ?? (finalChoices[i] as any).value
          : String(finalChoices[i]);
        return c.display !== origRaw;
      });
      if (anyFound) {
        finalChoices = enriched;
      }
    }
  }

  const topicText = question.topic.trim();

  // OX 문제인지 판단하는 로직
  // 1. 표시용 선택지에 O와 X가 포함되어 있는가?
  // 2. 질문 텍스트(stem)에 "OX 문제" 또는 "O, X를 고르시오" 같은 표현이 있는가?
  const isOXQuestion = (() => {
    const choiceTexts = finalChoices.map(c => {
      const val = typeof c === 'object' ? c.display : String(c);
      return val.trim().toUpperCase();
    });
    
    const hasO = choiceTexts.some(t => t === 'O' || t === '⭕');
    const hasX = choiceTexts.some(t => t === 'X' || t === '❌');
    
    const stemHasOXMention = /OX\s*문제|맞으면\s*O|틀리면\s*X/.test(question.stem);
    
    // 선택지에 O, X가 모두 있고 개수가 적거나 공통적으로 OX 문제라고 명시된 경우
    return (hasO && hasX) || (stemHasOXMention && hasO && hasX);
  })();

  // OX 문제 지문 정제 (UI 버튼이 역할을 수행하므로 지시문은 숨김)
  let cleanPrompt = prompt;
  if (isOXQuestion) {
    cleanPrompt = prompt
      .replace(/OX\s*문제(입니다|형식|)?\.?\s*/gi, '')
      .replace(/맞으면\s*O,?\s*틀리면\s*X(를\s*고르시오|하십시오|)?\.?\s*/gi, '')
      .replace(/(\(.*?O.*?\)|\[.*?O.*?\]|O,?\s*X)\s*를\s*고르시오\.?\s*/gi, '')
      .trim();
    
    // 첫 글자가 소문자거나 어색하게 시작하면 대문자화 (선택 사항)
    if (cleanPrompt.length > 0) {
      cleanPrompt = cleanPrompt.charAt(0).toUpperCase() + cleanPrompt.slice(1);
    }
  }

  return (
    <section
      id={`exam-question-${question.id}`}
      data-exam-question={question.id}
      data-exam-layout="paper-template"
      className={`scroll-mt-28 rounded-2xl border transition-all duration-300 sm:scroll-mt-32 w-full p-5 sm:p-7 shadow-sm ${
        active 
          ? 'bg-white border-blue-300 ring-2 ring-blue-50/50 shadow-md transform -translate-y-0.5' 
          : 'bg-white border-slate-200/80 hover:border-blue-200'
      }`}
    >
      <div className="flex flex-col gap-5 sm:gap-6 w-full">
        {/* Topic Badge */}
        {topicText.length > 0 && (
          <div className="mb-1">
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-[13px] font-semibold tracking-wide text-blue-700 ring-1 ring-inset ring-blue-700/10">
              {topicText}
            </span>
          </div>
        )}

        {/* Prompt Row */}
        <QuestionRow
          leading={
            <div className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-slate-100 text-[16px] font-black text-slate-800 sm:text-[18px]">
              {questionNumber}
            </div>
          }
          content={
            <QuestionContent>
              <PromptRenderer text={cleanPrompt} />
            </QuestionContent>
          }
        />

        {/* Stimulus Box */}
        {stimulus ? (
          <QuestionRow
            leading={<div className="min-w-[1.75rem]" />}
            content={
              <QuestionContent>
                <QuestionStimulusBox content={stimulus} />
              </QuestionContent>
            }
          />
        ) : null}

        {/* Choice / Input Row */}
        <QuestionRow
          leading={<div className="min-w-[1.75rem]" />}
          content={
            <QuestionContent className="pt-1 sm:pt-2">
              {question.type === '객관식' ? (
                isOXQuestion ? (
                  <OXChoiceList
                    selectedChoice={response}
                    onSelect={(choice) => onSelectChoice(question.id, choice)}
                  />
                ) : (
                  <ChoiceList
                    choices={finalChoices}
                    selectedChoice={response}
                    onSelect={(choice) => onSelectChoice(question.id, choice)}
                  />
                )
              ) : (
                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 sm:text-[14px]">
                    <PenLine className="h-4 w-4" />
                    <span>답안을 직접 입력하세요</span>
                  </div>
                  <textarea
                    value={response ?? ''}
                    onChange={(event) => onChangeText(question.id, event.target.value)}
                    placeholder="여기에 답안을 작성해주세요..."
                    className="min-h-[140px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-[15px] leading-7 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:text-[16px] sm:leading-8 shadow-inner"
                  />
                </div>
              )}
            </QuestionContent>
          }
        />
      </div>
    </section>
  );
}
