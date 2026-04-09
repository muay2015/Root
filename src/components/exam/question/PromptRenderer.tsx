import React, { ReactNode } from 'react';
import { MathRenderer } from '../../ui/MathRenderer';
import { injectDataBlockMarkers } from '../../../lib/question/questionUtils';

function PromptText({ text, isEnglishReading }: { text: string, isEnglishReading?: boolean }) {
  // 태그 분리 (<u>, </u>, [u], [/u] 및 기타 괄호들 포함)
  const parts = text.split(/(<[\/]?[^>]+>|\[[\/]?[^\]]+\])/g).filter(Boolean);
  
  const result: ReactNode[] = [];
  let isUnderlineActive = false;
  let currentUnderlineContent: ReactNode[] = [];

  parts.forEach((part, index) => {
    const isUStart = part === '<u>' || part === '[u]';
    const isUEnd = part === '</u>' || part === '[/u]';
    const isOtherBracket = !isUStart && !isUEnd && (/^<[^>]+>$/.test(part) || /^\[[^\]]+\]$/.test(part));

    if (isUStart) {
      isUnderlineActive = true;
      return;
    }

    if (isUEnd) {
      isUnderlineActive = false;
      if (currentUnderlineContent.length > 0) {
        // 영어 독해 유형일 경우 일반 밑줄 출력 방지 (단, 명시적인 빈칸은 별도 로직으로 처리됨)
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
      currentUnderlineContent.push(
        <React.Fragment key={`um-${index}`}>
          <MathRenderer text={part} />
        </React.Fragment>
      );
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

    // 텍스트 내부에 포함된 빈칸 처리 (2단계 분할)
    const subParts = part.split(/(_{1,}|(?:\(\s+\)))/g).filter(Boolean);
    
    subParts.forEach((subPart, subIndex) => {
      const isBlank = /_{1,}|(?:\(\s+\))/.test(subPart);
      
      if (isBlank) {
        result.push(
          <span 
            key={`blank-${index}-${subIndex}`} 
            className="mx-1.5 inline-block min-w-[120px] border-b-2 border-slate-900 align-baseline"
          />
        );
      } else {
        result.push(
          <span key={`text-${index}-${subIndex}`}>
            <MathRenderer text={subPart} />
          </span>
        );
      }
    });
  });

  return <>{result}</>;
}

export function PromptRenderer({ 
  text, 
  isEnglishSentenceInsertion 
}: { 
  text: string; 
  isEnglishSentenceInsertion?: boolean 
}) {
  // 영어 독해 유형일 경우 자동 박스 생성(보기/자료 등)을 방지하여 본문이 박스에 갇히지 않게 함
  const markedText = isEnglishSentenceInsertion ? text : injectDataBlockMarkers(text);
  
  let processedText = markedText
    .replace(/([^\n<])\s*([①-⑳])/g, '$1\n$2')
    .replace(/([^\n<])\s*([㉠-㉭])/g, '$1\n$2')
    .replace(/([^\n<])\s+(ㄱ\.|ㄴ\.|ㄷ\.|ㄹ\.|ㅁ\.)(?=\s)/g, '$1\n$2');

  // 독해 문항 번호 정규화 ( (1), 1), [1] 등을 ( ① ) 형태로 변환)
  if (isEnglishSentenceInsertion) {
    processedText = processedText
      .replace(/\(?\s*1\s*\)/g, '( ① )')
      .replace(/\(?\s*2\s*\)/g, '( ② )')
      .replace(/\(?\s*3\s*\)/g, '( ③ )')
      .replace(/\(?\s*4\s*\)/g, '( ④ )')
      .replace(/\(?\s*5\s*\)/g, '( ⑤ )');
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
              <PromptText text={`<${el.title}>`} isEnglishReading={isEnglishSentenceInsertion} />
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
                <div className="whitespace-pre-wrap break-words break-keep text-[15px] leading-[1.7] text-slate-800 sm:text-[16px] sm:leading-[1.8]">
                  <PromptText text={el.text} isEnglishReading={isEnglishSentenceInsertion} />
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={index}
            className="whitespace-pre-wrap break-words break-keep text-[16px] leading-[1.7] text-slate-900 sm:text-[17px] sm:leading-[1.7]"
          >
            <PromptText text={el.text} isEnglishReading={isEnglishSentenceInsertion} />
          </div>
        );
      })}
    </div>
  );
}
