/**
 * OCR 관련 서비스
 * 이미지에서 텍스트를 추출하는 기능을 제공합니다.
 */

import { buildApiUrl } from './api';

export const ocrService = {
  async extractText(image: { mimeType: string; data: string }): Promise<{ text: string; error: string | null }> {
    try {
      const response = await fetch(buildApiUrl('/api/ai/ocr'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { text: '', error: errorData.error || `HTTP error! status: ${response.status}` };
      }

      const data = await response.json();
      return { text: data.text || '', error: null };
    } catch (error) {
      return { text: '', error: error instanceof Error ? error.message : '네트워크 오류가 발생했습니다.' };
    }
  }
};
