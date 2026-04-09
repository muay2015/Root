/**
 * 이미지 처리 유틸리티
 * 브라우저에서 사진 파일을 AI 전송용 Base64로 변환하거나 압축하는 기능을 제공합니다.
 */

export interface ImageBase64 {
  mimeType: string;
  data: string; // Base64 data without prefix (data:image/png;base64,...)
}

/**
 * File 객체를 Base64 문자열로 변환합니다.
 */
export async function fileToBase64(file: File): Promise<ImageBase64> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIndex = result.indexOf(',');
      resolve({
        mimeType: file.type,
        data: result.substring(commaIndex + 1),
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * 이미지 크기를 조정하고 압축하여 토큰 비용 및 전송 시간을 절약합니다.
 */
export async function optimizeImage(file: File, maxWidth = 1600, maxHeight = 1600): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // 비율 유지하며 리사이징
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.85 // 품질 85% 정도로 압축
      );
    };
    img.onerror = (error) => reject(error);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 이미지를 압축하고 Base64 데이터 URL로 반환합니다.
 */
export async function compressImageToBase64(file: File, maxWidth = 2000, quality = 0.8): Promise<string> {
  const optimizedFile = await optimizeImage(file, maxWidth, maxWidth);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(optimizedFile);
  });
}
