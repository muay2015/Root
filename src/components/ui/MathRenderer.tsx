import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * 기존 LaTeX 블록(\(...\), \[...\])을 보호하면서 plain text에만 치환을 적용합니다.
 * 각 단계마다 호출해 새로 생성된 LaTeX 블록도 보호합니다.
 */
function replaceOutsideLatex(
  text: string,
  pattern: RegExp,
  replacer: (...args: string[]) => string,
): string {
  const LATEX_BLOCK = /(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
  const blocks: string[] = [];
  const safe = text.replace(LATEX_BLOCK, (match) => {
    blocks.push(match);
    return `\x00${blocks.length - 1}\x00`;
  });
  const replaced = safe.replace(pattern, replacer as (...args: unknown[]) => string);
  return replaced.replace(/\x00(\d+)\x00/g, (_, i) => blocks[Number(i)]);
}

/**
 * LaTeX 구분자(\(...\), \[...\]) 밖에 있는 잘못된 수식 표기를 display-time에 교정합니다.
 * - \{a_n\}, {an} → \(\{a_n\}\)
 * - a_n, a5, a---n (구분자 밖) → \(a_n\), \(a_{5}\)
 * 각 단계가 끝날 때마다 새로 생성된 LaTeX 블록도 보호합니다.
 */
function fixBareMathNotation(text: string): string {
  let result = text;

  // 0. 이전 normalizer 버그로 저장된 a_\(\{10\}\) 패턴 복구 → \(a_{10}\)
  result = result.replace(
    /([a-zA-Z])_\\\(\\?\{?(\w+)\\?\}?\\\)/g,
    (_, a, b) => `\\(${a}_{${b}}\\)`,
  );

  // 1. \{...\} 또는 {..} → \(\{...\}\)  (내부 첨자도 함께 교정)
  // (?<!_) lookbehind: _뒤의 {10}은 첨자이므로 변환하지 않음 (a_{10} 보호)
  result = replaceOutsideLatex(
    result,
    /(?<!_)\\\{([^{}]*?)\\\}|(?<!_)\{([^{}]*?)\}/g,
    (_, inner1, inner2) => {
      const inner = (inner1 ?? inner2 ?? '').trim();
      const corrected = inner
        .replace(/\b([a-zA-Z])[-_]{2,}([0-9a-zA-Z])\b/g, '$1_$2') // a---n → a_n
        .replace(/\b([a-zA-Z])([0-9])\b/g, '$1_$2')                // a5 → a_5
        .replace(/\b([a-zA-Z])n\b/g, '$1_n');                       // an → a_n
      return `\\(\\{${corrected}\\}\\)`;
    },
  );

  // 2. a---n, a_____5 → \(a_n\), \(a_{5}\)  (다중 하이픈/언더스코어)
  result = replaceOutsideLatex(
    result,
    /\b([a-zA-Z])[-_]{2,}([0-9a-zA-Z])\b/g,
    (_, a, b) => `\\(${a}_${b}\\)`,
  );

  // 3. a_{10}, a_n, a_{n+1} → \(a_{10}\), \(a_n\), \(a_{n+1}\)  (복합 첨자 표현 포함)
  result = replaceOutsideLatex(
    result,
    /\b([a-zA-Z])_(?:\\?\{([^{}]+)\\?\}|(\w+))/g,
    (_, a, b1, b2) => `\\(${a}_{${b1 ?? b2}}\\)`,
  );

  // 4. a5, S10 → \(a_{5}\), \(S_{10}\)  (붙여쓴 첨자)
  result = replaceOutsideLatex(
    result,
    /\b([a-zA-Z])(\d+)\b/g,
    (_, a, b) => `\\(${a}_{${b}}\\)`,
  );

  return result;
}

interface MathRendererProps {
  text: string;
  className?: string;
  inline?: boolean;
}

export function MathRenderer({ text, className = '', inline = true }: MathRendererProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // LaTeX 구문 추출 및 렌더링
    // \( ... \) 또는 $$ ... $$ 형태를 처리
    const renderMath = () => {
      // 1. 백슬래시 과잉 이스케이프 정규화 (\\( -> \(, \\sqrt -> \sqrt 등)
      // 특정 명령어 목록 대신 모든 LaTeX 명령어 패턴을 포괄적으로 처리
      let normalizedText = text.replace(/\\{2,}(?=[a-zA-Z(\[\]])/g, '\\');

      // 1-b. LaTeX 밖에 있는 잘못된 표기를 교정 (display-time 보정)
      // 기존 \(...\), \[...\] 블록을 보호한 뒤 plain text 부분만 처리
      normalizedText = fixBareMathNotation(normalizedText);

      // 2. 통합 정규표현식: \( ... \), \[ ... \], $$ ... $$ 만 처리
      // (자동으로 _, ^를 감지하는 로직은 이미 prompt단계와 normalizer에서 해결되므로 명시적 래퍼만 감지)
      const mathRegex = /(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$)/g;
      
      const parts = normalizedText.split(mathRegex);
      const fragment = document.createDocumentFragment();
      
      parts.forEach(part => {
        if (!part) return;

        // 명시적으로 래퍼로 감싸져 있는 경우만 수식으로 처리
        const isWrapped = (part.startsWith('\\(') && part.endsWith('\\)')) ||
                          (part.startsWith('\\[') && part.endsWith('\\]')) ||
                          (part.startsWith('$$') && part.endsWith('$$'));

        if (isWrapped) {
          const isDisplayMode = !part.startsWith('\\(');
          const span = document.createElement('span');
          if (isDisplayMode) {
            // display 수식: 블록으로 처리하여 넘치면 가로 스크롤
            span.style.display = 'block';
            span.style.width = '100%';
            span.style.overflowX = 'auto';
            span.style.overflowY = 'hidden';
            span.style.paddingBottom = '2px'; // 스크롤바 여백
          } else {
            span.style.display = 'inline-block';
            span.style.maxWidth = '100%';
            span.style.verticalAlign = 'middle';
          }

          try {
            let cleanContent = part;
            let displayMode = false;

            if (part.startsWith('\\(')) {
              cleanContent = part.slice(2, -2);
            } else {
              cleanContent = part.slice(2, -2);
              displayMode = true;
            }

            // 수식 내 불필요한 래퍼 제거 (AI의 흔한 실수 방지)
            cleanContent = cleanContent.replace(/\\\(|\\\)/g, '').trim();
            // LaTeX 내부 다중 하이픈/언더스코어 교정 (예: a_________n → a_n)
            cleanContent = cleanContent.replace(/([a-zA-Z])[-_]{2,}([0-9a-zA-Z])/g, '$1_$2');

            if (cleanContent) {
              katex.render(cleanContent, span, {
                throwOnError: false,
                displayMode
              });
              fragment.appendChild(span);
            }
          } catch (e) {
            fragment.appendChild(document.createTextNode(part));
          }
        } else {
          // 일반 텍스트 및 태그 처리
          const cleanText = part.replace(/\\\)/g, '').replace(/\\\(/g, '');
          
          // 밑줄(<u>) 태그 처리
          const underlineRegex = /(<u>[\s\S]*?<\/u>|\[u\][\s\S]*?\[\/u\])/g;
          const textParts = cleanText.split(underlineRegex);
          
          textParts.forEach(t => {
            if ((t.startsWith('<u>') && t.endsWith('</u>')) || (t.startsWith('[u]') && t.endsWith('[/u]'))) {
              const u = document.createElement('u');
              const innerText = t.startsWith('<u>') ? t.slice(3, -4) : t.slice(3, -5);
              u.textContent = innerText;
              u.style.textDecorationThickness = '1.5px';
              u.style.textUnderlineOffset = '0.2em';
              fragment.appendChild(u);
            } else if (t) {
              fragment.appendChild(document.createTextNode(t));
            }
          });
        }
      });

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(fragment);
      }
    };

    renderMath();
  }, [text]);

  return <span ref={containerRef} className={`${className} whitespace-pre-wrap`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }} />;
}
