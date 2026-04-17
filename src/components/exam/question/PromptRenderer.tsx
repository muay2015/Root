import React, { ReactNode } from 'react';
import { MathRenderer } from '../../ui/MathRenderer';
import { injectDataBlockMarkers } from '../../../lib/question/questionUtils';

/**
 * LaTeX 블록(\(...\), \[...\])을 보호하면서 빈칸 구분자(2+ 언더스코어, "( )")로만 분할합니다.
 * 기존 _{1,} 분할은 \(a_{n+1}\) 같은 LaTeX 내부 _까지 잘라내는 버그가 있었습니다.
 */
function splitTextAndBlanks(text: string): Array<{ content: string; isBlank: boolean }> {
  const LATEX_BLOCK = /(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
  const blocks: string[] = [];
  const safe = text.replace(LATEX_BLOCK, (match) => {
    blocks.push(match);
    return `\x00${blocks.length - 1}\x00`;
  });

  const parts = safe.split(/(_{2,}|(?:\(\s+\)))/g).filter(Boolean);

  return parts.map(part => ({
    content: part.replace(/\x00(\d+)\x00/g, (_, i) => blocks[Number(i)]),
    isBlank: /^(?:_{2,}|\(\s+\))$/.test(part),
  }));
}

function PromptText({ text, isEnglishReading }: { text: string, isEnglishReading?: boolean }) {
  const normalizedText = isEnglishReading
    ? text
        .replace(/<[\/]?[uU][^>]*>|\[[\/]?[uU][^\]]*\]/g, '')
        .replace(/((?:\(\s*[A-Z]\s*\)|\[\s*[A-Z]\s*\])\s*)_{2,}/gi, '$1_________')
        .replace(/_{2,}(?:\s*_{2,})+/g, '_________')
    : text;
  const parts = normalizedText.split(/(<[\/]?[^>]+>|\[[\/]?[^\]]+\])/g).filter(Boolean);

  const result: ReactNode[] = [];
  let isUnderlineActive = false;
  let currentUnderlineContent: ReactNode[] = [];

  parts.forEach((part, index) => {
    const isUStart = /^<u\s*>|^\[u\s*\]/i.test(part);
    const isUEnd = /^<\/u\s*>|^\[\/u\s*\]/i.test(part);
    const isOtherBracket = !isUStart && !isUEnd && (/^<[^>]+>$/.test(part) || /^\[[^\]]+\]$/.test(part));

    if (isUStart) {
      isUnderlineActive = true;
      return;
    }

    if (isUEnd) {
      isUnderlineActive = false;
      if (currentUnderlineContent.length > 0) {
        if (isEnglishReading) {
          result.push(...currentUnderlineContent);
        } else {
          result.push(
            <span key={`u-${index}`} className="underline decoration-slate-400/80 decoration-2 underline-offset-[6px] font-medium text-slate-900">
              {currentUnderlineContent}
            </span>
          );
        }
        currentUnderlineContent = [];
      }
      return;
    }

    if (isUnderlineActive) {
      if (isEnglishReading) {
        currentUnderlineContent.push(
          <React.Fragment key={`um-${index}`}>
            <MathRenderer text={part} />
          </React.Fragment>
        );
      } else {
        currentUnderlineContent.push(
          <React.Fragment key={`um-${index}`}>
            <MathRenderer text={part} />
          </React.Fragment>
        );
      }
      return;
    }

    if (isOtherBracket) {
      const innerText = part.slice(1, -1).trim();
      if (innerText.length > 0 && innerText.length <= 15) {
        result.push(
          <span
            key={`${part}-${index}`}
            className="mx-1.5 my-1 inline-flex items-center justify-center rounded-md bg-slate-700 px-2.5 py-0.5 text-[14px] font-bold tracking-[0.1em] text-white shadow-sm align-baseline shadow-slate-200"
          >
            {innerText}
          </span>
        );
      } else {
        result.push(
          <span key={`${part}-${index}`} className="font-bold tracking-[0.01em] text-slate-900">
            <MathRenderer text={part} />
          </span>
        );
      }
      return;
    }

    const subParts = splitTextAndBlanks(part);

    subParts.forEach(({ content, isBlank }, subIndex) => {
      if (isBlank) {
        result.push(
          <span
            key={`blank-${index}-${subIndex}`}
            className="mx-1.5 inline-block min-w-[130px] border-b-2 border-slate-900 align-baseline h-[2px] mb-[3px]"
            title="빈칸"
          />
        );
      } else if (content) {
        result.push(
          <span key={`text-${index}-${subIndex}`}>
            <MathRenderer text={content} />
          </span>
        );
      }
    });
  });

  return <>{result}</>;
}

export function PromptRenderer({
  text,
  isEnglishSentenceInsertion,
  isEnglishGrammar,
}: {
  text: string;
  isEnglishSentenceInsertion?: boolean;
  isEnglishGrammar?: boolean;
}) {
  // 어법/어휘 문항이거나 문장 삽입 문항인 경우 지문 가공 마커 주입을 건너뜁니다.
  const markedText = (isEnglishSentenceInsertion || isEnglishGrammar) ? text : injectDataBlockMarkers(text);

  // 어법/어휘 문항에서는 ①~⑤가 문장 흐름 중간에 인라인으로 사용되므로
  // 강제 줄바꿈을 삽입하면 텍스트가 끊겨 보인다. grammar 모드에서는 건너뜀.
  // 또한 지문 내 기존 \n도 공백으로 유지시켜 한 덩어리 흐름으로 렌더링한다.
  let processedText = markedText;
  if (isEnglishGrammar) {
    // 발문(한국어)과 지문(영어)을 구분하는 이중 줄바꿈은 그대로 두고
    // 지문 내부의 단순 줄바꿈은 공백으로 치환하여 텍스트 흐름을 유지
    processedText = processedText
      .replace(/\r\n/g, '\n')        // CRLF -> LF 통일
      .replace(/\n{2,}/g, '\u0000') // 이중 줄바꿈을 임시 마커로 치환
      .replace(/\n/g, ' ')           // 모든 단일 줄바꿈 -> 공백
      .replace(/\u0000/g, '\n\n')    // 이중 줄바꿈 복원
      .replace(/\s+/g, ' ')          // 모든 연속 공백(탭, 줄바꿈 등) -> 단일 공백
      .replace(/\s*(\n\n)\s*/g, '$1') // 이중 줄바꿈 주변 공백 정리
      .trim();
  } else if (isEnglishSentenceInsertion) {
    // 문장 삽입 유형: 삽입 위치 마커를 수능 표준 인라인 원형 번호로 치환 (줄바꿈 없이 흐름 유지)
    // (1) → ①, ( ① ) → ① 형태로 괄호를 제거하고 원형 번호만 표시
    processedText = processedText
      .replace(/\(\s*([1-5])\s*\)/g, (_, n) => (['①', '②', '③', '④', '⑤'] as const)[parseInt(n, 10) - 1])
      .replace(/\(\s*(①|②|③|④|⑤)\s*\)/g, '$1');
  } else {
    processedText = processedText
      .replace(/([^\n<])\s*(\([1-5]\))/g, '$1\n$2')
      .replace(/([^\n<])\s*(①|②|③|④|⑤)/g, '$1\n$2')
      .replace(/([^\n<])\s+(①|②|③|④|⑤)(?=\s)/g, '$1\n$2');
  }

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

  const lastElement = elements[elements.length - 1];
  if (lastElement && lastElement.type === 'box') {
    const boxLines = lastElement.text.split('\n');
    if (boxLines.length > 1) {
      const lastLine = boxLines[boxLines.length - 1];
      if (/(무엇|어떤|옳은 것은|고른 것은|추론한 것은|해석한 것은|적절한 것은|\?)$/.test(lastLine)) {
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
              className="whitespace-pre-wrap break-words text-[16px] leading-[1.7] text-slate-900 sm:text-[17px] sm:leading-[1.7]"
            >
              <PromptText text={`<${el.title}>`} isEnglishReading={isEnglishSentenceInsertion} />
            </p>
          );
        }

        if (el.type === 'box') {
          return (
            <div
              key={index}
              className="my-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5 lg:rounded-xl lg:border-slate-200 max-lg:rounded-2xl max-lg:border-blue-100 max-lg:shadow-blue-900/5 max-lg:-ml-[1.875rem] max-lg:w-[calc(100%+1.875rem)]"
            >
              <div className="flex items-center gap-1.5 border-b border-slate-200/60 bg-slate-50 px-4 py-2.5 sm:px-5 max-lg:bg-blue-50/20 max-lg:border-blue-100/30">
                <span className="text-[13px] font-bold tracking-[0.05em] text-slate-700 max-lg:text-blue-800/70">
                  {el.title}
                </span>
              </div>
              <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-slate-50/50 max-lg:bg-white max-lg:px-1.5 max-lg:py-5">
                <div className={`whitespace-pre-wrap break-words text-[15px] leading-[1.7] text-slate-800 sm:text-[16px] sm:leading-[1.8] max-lg:leading-[1.8] sm:max-lg:leading-[1.9]${isEnglishSentenceInsertion ? ' text-justify' : ''}`}>
                  <PromptText text={el.text} isEnglishReading={isEnglishSentenceInsertion} />
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={index}
            className="w-full min-w-0 whitespace-pre-wrap break-words text-[15px] leading-[1.75] text-slate-900 sm:text-[16px] sm:leading-[1.8] max-lg:leading-[1.8] sm:max-lg:leading-[1.9]"
          >
            <PromptText text={el.text} isEnglishReading={isEnglishSentenceInsertion} />
          </div>
        );
      })}
    </div>
  );
}
