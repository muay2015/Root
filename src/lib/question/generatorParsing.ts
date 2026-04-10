import { normalizeChoiceText } from './normalizeChoiceText.ts';

export function extractJson(text: string) {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    const match = clean.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (match) {
      clean = match[1].trim();
    }
  }

  return clean.replace(/(?<!\\)\\(?![\\"/bfnrtu])/g, '\\\\');
}

function splitChoiceStringSafely(value: string) {
  const prepared = value
    .replace(/\r\n/g, '\n')
    .replace(/\s*\|\s*/g, '\n')
    .replace(/\s\/\s/g, '\n')
    .replace(/(?:^|\s)([\u2460-\u2464])\s+/gu, '\n$1 ')
    .replace(/(?:^|\s)([1-5]|[A-Ea-e])[\.\)]\s+/g, '\n$1. ');

  return prepared
    .split(/\n+/)
    .map((part) => normalizeChoiceText(part))
    .filter((part) => part.length > 0);
}

export function extractRawChoices(raw: any): string[] {
  const candidate = raw.choices ?? raw.options ?? raw.items;

  if (Array.isArray(candidate)) {
    return candidate.flatMap((item) => {
      if (typeof item === 'string') {
        return splitChoiceStringSafely(item);
      }

      if (item && typeof item === 'object') {
        const text = item.text ?? item.label ?? item.value ?? item.content;
        return typeof text === 'string' ? splitChoiceStringSafely(text) : [];
      }

      return [];
    });
  }

  if (typeof candidate === 'string') {
    return splitChoiceStringSafely(candidate);
  }

  return [];
}
