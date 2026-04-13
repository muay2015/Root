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
      let normalizedText = text.replace(/\\\\+(?=[(\[\]$]|sqrt|frac|pm|times|div|alpha|beta|gamma|delta|epsilon|theta|pi|sigma|phi|omega|leq|geq|neq|approx|infty|degree|angle)/g, '\\');

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
          const span = document.createElement('span');
          // 수식 내에서 가로 스크롤 방지 및 줄바꿈 허용 처리가 필요한 경우 여기에 추가 가능
          span.style.display = 'inline-block';
          span.style.maxWidth = '100%';
          span.style.verticalAlign = 'middle';

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
