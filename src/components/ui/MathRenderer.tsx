import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

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
      // 1. 백슬래시 과잉 이스케이프 정규화 (\\( -> \(, \\sqrt -> \sqrt)
      // AI가 JSON 응답이나 이스케이프 과정에서 백슬래시를 과하게 넣는 경우를 대비
      let normalizedText = text.replace(/\\\\+(?=[(\[\]$]|sqrt|frac|pm|times|div|alpha|beta|gamma|delta|epsilon|theta|pi|sigma|phi|omega|leq|geq|neq|approx|infty|degree|angle)/g, '\\');

      // 2. 유니코드 이스케이프 문자열(\u221a 등)을 실제 기호로 변환
      normalizedText = normalizedText.replace(/\\u221a/gi, '√')
                               .replace(/\\u03c0/gi, 'π')
                               .replace(/\\u03b1/gi, 'α')
                               .replace(/\\u03b2/gi, 'β')
                               .replace(/\\u00b1/gi, '±');

      // 2. 유니코드 기호 사전 변환 (√ -> \sqrt)
      normalizedText = normalizedText.replace(/√\s*(\d+|{[^}]*})/g, '\\sqrt{$1}')
                                     .replace(/√/g, '\\sqrt');

      // 3. 통합 정규표현식: 
      // (1) \( ... \) - 인라인 수식
      // (2) \[ ... \] - 블록 수식
      // (3) $$ ... $$ - 블록 수식 (전통적)
      // (4) \sqrt{...}, \frac{...} 등 - 감싸지지 않은 개별 명령어
      const mathRegex = /(\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\(?:sqrt|frac|pm|times|div|alpha|beta|gamma|delta|epsilon|theta|pi|sigma|phi|omega|leq|geq|neq|approx|infty|degree|angle)\s*(?:\{[^{}]*\}|[^{}\s]*)?)/g;
      
      const parts = normalizedText.split(mathRegex);
      const fragment = document.createDocumentFragment();
      
      parts.forEach(part => {
        if (!part) return;

        // 해당 파트가 수식인지 확인 (명령어로 시작하거나 래퍼로 감싸져 있는 경우)
        const isWrapped = (part.startsWith('\\(') && part.endsWith('\\)')) ||
                          (part.startsWith('\\[') && part.endsWith('\\]')) ||
                          (part.startsWith('$$') && part.endsWith('$$'));
        const isRawCommand = part.startsWith('\\') && !isWrapped;

        if (isWrapped || isRawCommand) {
          const span = document.createElement('span');
          try {
            // 래퍼 제거 및 순수 LaTeX 추출
            let cleanContent = part;
            let displayMode = false;

            if (isWrapped) {
              if (part.startsWith('\\(')) {
                cleanContent = part.slice(2, -2);
              } else {
                cleanContent = part.slice(2, -2);
                displayMode = true;
              }
            }

            // 혹시라도 내용물에 불완전한 \(\)가 섞여있다면 제거 (AI의 흔한 실수)
            cleanContent = cleanContent.replace(/\\\(|\\\)/g, '').trim();

            // \sqrtx 처럼 명령어 뒤에 공백이나 괄호를 생략한 경우 교정 (\sqrt x)
            cleanContent = cleanContent.replace(/\\(sqrt|frac|pm|times|div|alpha|beta|gamma|delta|epsilon|theta|pi|sigma|phi|omega|leq|geq|neq|approx|infty|degree|angle)([a-zA-Z0-9])/g, '\\$1 $2');

            if (cleanContent.trim()) {
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
          // 일반 텍스트의 경우 불필요하게 남은 닫는 괄호 등 정리
          const cleanText = part.replace(/\\\)/g, '').replace(/\\\(/g, '');
          
          // 밑줄(<u>) 태그 처리
          const underlineRegex = /(<u>[\s\S]*?<\/u>)/g;
          const textParts = cleanText.split(underlineRegex);
          
          textParts.forEach(t => {
            if (t.startsWith('<u>') && t.endsWith('</u>')) {
              const u = document.createElement('u');
              u.textContent = t.slice(3, -4);
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
