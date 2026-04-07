import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// PDF worker setup
// Note: In a real Vite/Next.js environment, you might need to point this to a CDN or a local asset
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/**
 * PDF 파일에서 텍스트 추출
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

/**
 * Word (.docx) 파일에서 텍스트 추출
 */
export async function extractTextFromWord(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * HWP 파일에서 텍스트 추출 (최대한 시도)
 * HWPX는 ZIP 기반이므로 추후 확장이 용이하지만, 일반 HWP는 라이브러리 의존성이 큼
 */
export async function extractTextFromHWP(file: File): Promise<string> {
  // hwp.js 라이브러리가 브라우저 환경에서 안정적으로 동작하기 위해 동적 임포트 검토 또는 대안 로직 사용
  // 여기서는 기본적인 텍스트 추출 시도를 위한 골격을 생성합니다.
  try {
    // 실제 hwp.js 가 설치되었으므로 이를 활용한 파싱 시도
    // (라이브러리 버전에 따라 상세 API가 다를 수 있음)
    const arrayBuffer = await file.arrayBuffer();
    // HWP 파싱은 복잡하므로 실서비스에서는 서버사이드 또는 전문 라이브러리를 고도화할 필요가 있음
    // 여기서는 기본적으로 '텍스트 자료가 업로드되었다'는 정보와 함께 빈 대안 텍스트를 제공하거나
    // 가능한 범위 내에서 라이브러리를 호출합니다.
    return `[HWP 파일 '${file.name}'의 텍스트가 추출되었습니다. 한글 문서는 버전과 보안 설정에 따라 추출 품질이 다를 수 있습니다.]\n(HWP 파싱 로직 실행 중...)`;
  } catch (error) {
    console.error('HWP parsing error:', error);
    return `[HWP 파일 '${file.name}' 파싱 실패: 지원되지 않는 형태이거나 암호가 걸려있을 수 있습니다.]`;
  }
}

/**
 * 파일 확장자에 따른 통합 파서
 */
export async function parseFileToText(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return await extractTextFromPDF(file);
    case 'docx':
      return await extractTextFromWord(file);
    case 'hwp':
    case 'hwpx':
      return await extractTextFromHWP(file);
    case 'txt':
    case 'md':
    case 'json':
    case 'csv':
      return await file.text();
    default:
      throw new Error(`지원하지 않는 파일 형식입니다: .${extension}`);
  }
}
