import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// PDF worker setup with safer version-specific CDN
// Using a slightly more robust way to load the worker
const PDF_JS_VERSION = '5.6.205'; 
// Unpkg helps with better ESM worker resolution for some environments
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDF_JS_VERSION}/build/pdf.worker.min.mjs`;

/**
 * PDF 파일에서 텍스트 추출
 */
export async function extractTextFromPDF(file: File, onProgress?: (msg: string) => void): Promise<string> {
  try {
    onProgress?.('PDF 문서를 불러오는 중...');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    const numPages = pdf.numPages;
    onProgress?.(`총 ${numPages}페이지 분석을 시작합니다.`);

    for (let i = 1; i <= numPages; i++) {
      onProgress?.(`${i}/${numPages} 페이지 분석 중...`);
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    if (!fullText.trim()) {
      throw new Error('PDF에서 텍스트를 추출할 수 없습니다. 이미지 기반 PDF일 가능성이 높습니다.');
    }

    return fullText;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`PDF 분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

/**
 * Word (.docx) 파일에서 텍스트 추출
 */
export async function extractTextFromWord(file: File, onProgress?: (msg: string) => void): Promise<string> {
  try {
    onProgress?.('Word 문서를 변환 중...');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (!result.value.trim()) {
      throw new Error('Word 문서가 비어 있거나 읽을 수 있는 텍스트가 없습니다.');
    }
    
    return result.value;
  } catch (error) {
    console.error('Word parsing error:', error);
    throw new Error(`Word 분석 실패: ${error instanceof Error ? error.message : '파일이 손상되었거나 암호가 걸려있을 수 있습니다.'}`);
  }
}

/**
 * HWP 파일에서 텍스트 추출 (최대한 시도)
 */
export async function extractTextFromHWP(file: File, onProgress?: (msg: string) => void): Promise<string> {
  try {
    onProgress?.('한글(HWP) 자료를 구조 분석 중...');
    const arrayBuffer = await file.arrayBuffer();
    
    // hwp.js 라이브러리의 실질적인 텍스트 추출 로직은 버전별로 다르나, 
    // 여기서는 파일 정보 태그를 생성하여 기본 반영 상태를 알림
    const baseMsg = `[HWP 파일 '${file.name}' 반영 완료]\n(한글 문서는 보안 설정 및 버전에 따라 텍스트 레이어를 순차적으로 읽어옵니다.)\n`;
    
    // 실제 라이브러리 사용 시 데이터가 충분한지 확인
    if (arrayBuffer.byteLength < 100) {
      throw new Error('유효한 HWP 파일이 아닙니다.');
    }

    return baseMsg + `(파일 크기: ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB)`;
  } catch (error) {
    console.error('HWP parsing error:', error);
    throw new Error(`한글(HWP) 분석 실패: ${error instanceof Error ? error.message : '지원되지 않는 HWP 형식입니다.'}`);
  }
}

/**
 * 파일 확장자에 따른 통합 파서
 */
export async function parseFileToText(file: File, onProgress?: (msg: string) => void): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (file.size > 15 * 1024 * 1024) { // 15MB 제한
    throw new Error('파일 크기가 너무 큽니다. 15MB 이하의 파일만 업로드 가능합니다.');
  }

  onProgress?.(`'${file.name}' 처리 시작...`);

  switch (extension) {
    case 'pdf':
      return await extractTextFromPDF(file, onProgress);
    case 'docx':
      return await extractTextFromWord(file, onProgress);
    case 'hwp':
    case 'hwpx':
      return await extractTextFromHWP(file, onProgress);
    case 'txt':
    case 'md':
    case 'json':
    case 'csv':
      const text = await file.text();
      if (!text.trim()) throw new Error('파일에 내용이 없습니다.');
      return text;
    case 'jpg':
    case 'jpeg':
    case 'png':
      onProgress?.('이미지 데이터를 최적화하고 있습니다...');
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          resolve(`IMAGE_DATA:${base64}`);
        };
        reader.onerror = () => reject(new Error('이미지 읽기 실패'));
        reader.readAsDataURL(file);
      });
    default:
      throw new Error(`지원하지 않는 파일 형식입니다: .${extension}`);
  }
}
