/**
 * SVG 도형 다이어그램 렌더러.
 * AI가 생성한 SVG를 클라이언트 사이드에서 안전하게 렌더링합니다.
 * <script>, on* 이벤트 핸들러, 외부 URL을 제거한 뒤 삽입합니다.
 */

function sanitizeSvg(svg: string): string {
  let clean = svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on\w+="[^"]*"/gi, '')
    .replace(/\s+on\w+='[^']*'/gi, '')
    .replace(/href="javascript:[^"]*"/gi, '')
    .replace(/href='javascript:[^']*'/gi, '');

  // 외부 URL (http/https) 을 src/href/xlink:href 에서 제거
  clean = clean.replace(
    /\s+(?:xlink:href|href|src)="(?!data:)[^"]*:\/\/[^"]*"/gi,
    '',
  );

  return clean;
}

export function DiagramDisplay({ svg }: { svg: string | null | undefined }) {
  if (!svg || !svg.trim()) return null;

  const clean = sanitizeSvg(svg.trim());

  return (
    <div
      className="my-2 flex w-full items-center justify-center overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 sm:p-4 max-lg:-ml-[1.875rem] max-lg:w-[calc(100%+1.875rem)]"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
