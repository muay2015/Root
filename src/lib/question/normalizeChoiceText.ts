function hasHangul(value: string) {
  return /[가-힣]/.test(value);
}

function isFragmentToken(value: string) {
  return /^[가-힣A-Za-z0-9]$/.test(value);
}

function joinFragmentBuffer(buffer: string[]) {
  if (buffer.length === 0) {
    return '';
  }

  const shouldJoin = buffer.length >= 3 || buffer.some(hasHangul);
  return shouldJoin ? buffer.join('') : buffer.join(' ');
}

export function normalizeChoiceText(value: string) {
  const cleaned = value
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = cleaned.split(' ').filter(Boolean);
  if (tokens.length <= 1) {
    return cleaned;
  }

  const merged: string[] = [];
  let fragmentBuffer: string[] = [];

  const flushBuffer = () => {
    if (fragmentBuffer.length === 0) {
      return;
    }

    merged.push(joinFragmentBuffer(fragmentBuffer));
    fragmentBuffer = [];
  };

  for (const token of tokens) {
    if (isFragmentToken(token)) {
      fragmentBuffer.push(token);
      continue;
    }

    flushBuffer();
    merged.push(token);
  }

  flushBuffer();

  return merged
    .join(' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([([{])\s+/g, '$1')
    .replace(/\s+([)\]}])/g, '$1')
    .trim();
}
