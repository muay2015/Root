/**
 * 문항 렌더링에 필요한 문자열 처리 유틸리티
 */

/**
 * 지문 내에 보기, 조건, 자료 등의 블록 마커를 자동으로 삽입합니다.
 */
export function injectDataBlockMarkers(text: string): string {
  if (/(<보기>|\[보기\]|<조건>|\[조건\]|<자료>|\[자료\])/.test(text)) return text;
  const CIRCLE_JAMO_REGEX = /[㉠-㉭]/;

  if (CIRCLE_JAMO_REGEX.test(text)) {
    const isQuestionPart = (s: string) =>
      /옳은 것은|바르게 설명|고른 것은|적절한 것은|맞는 것은|알맞은 것은|추론한 것은|설명한 것은/.test(s) ||
      s.trim().endsWith('?');

    const firstJamoIndex = text.search(CIRCLE_JAMO_REGEX);
    if (firstJamoIndex > 0) {
      const beforeBlock = text.substring(0, firstJamoIndex).trim();
      const dataBlock = text.substring(firstJamoIndex);

      const raw = dataBlock.replace(/\n+/g, ' ');
      const sentParts: string[] = [];
      const sr = /[^.!?。]+[.!?。]+/g;
      let sm;
      while ((sm = sr.exec(raw)) !== null) sentParts.push(sm[0].trim());
      const tail = raw.substring(raw.search(/[^.!?。]+$/)).trim();
      if (tail && !sentParts.some(s => s.includes(tail))) sentParts.push(tail);

      const lastSentence = sentParts[sentParts.length - 1] ?? '';
      const hasTrailingQuestion = isQuestionPart(lastSentence);

      let cleanDataBlock = dataBlock;
      let trailingQuestion = '';
      if (hasTrailingQuestion && sentParts.length > 1) {
        const lastIdx = dataBlock.lastIndexOf(lastSentence);
        if (lastIdx > 0) {
          cleanDataBlock = dataBlock.substring(0, lastIdx).trim();
          trailingQuestion = lastSentence;
        }
      }

      const resultParts: string[] = [];
      if (beforeBlock.length > 0) resultParts.push(beforeBlock);
      resultParts.push('<보기>');
      const formattedBlock = cleanDataBlock
        .replace(/([^\n])\s*([㉠-㉭])/g, '$1\n$2');
      resultParts.push(formattedBlock);
      if (trailingQuestion.length > 0) resultParts.push(trailingQuestion);
      return resultParts.join('\n');
    }
  }

  const raw = text.replace(/\n+/g, ' ');
  const sentenceRegex = /[^.!?。]+[.!?。]+/g;
  const sentences: string[] = [];
  let m;
  while ((m = sentenceRegex.exec(raw)) !== null) {
    const s = m[0].trim();
    if (s.length > 0) sentences.push(s);
  }
  const lastIndex = raw.search(/[^.!?。]+$/);
  if (lastIndex !== -1) {
    const tail = raw.substring(lastIndex).trim();
    if (tail.length > 0 && !sentences.some(s => s.includes(tail))) sentences.push(tail);
  }

  if (sentences.length < 3) return text;

  const isDataSentence = (s: string) =>
    /^[A-Z]\s*(지역|항목|학생|씨|국|나라|언어|문화|팀|군)?\s*(은|는|이|가|의)\s+/.test(s) ||
    /^\(가\)|\(나\)/.test(s) ||
    /^[A-Z]형|^[A-Z]안/.test(s);

  const isQuestionSentence = (s: string) =>
    /옳은 것은|바르게 설명|고른 것은|적절한 것은|맞는 것은|알맞은 것은|추론한 것은|설명한 것은/.test(s) ||
    s.trim().endsWith('?');

  let dataStart = -1;
  let dataEnd = -1;
  for (let i = 0; i < sentences.length; i++) {
    if (isDataSentence(sentences[i]) && !isQuestionSentence(sentences[i])) {
      if (dataStart === -1) dataStart = i;
      dataEnd = i;
    }
  }

  if (dataStart === -1) return text;
  const hasQuestionAfter = sentences.slice(dataEnd + 1).some(isQuestionSentence);
  if (!hasQuestionAfter) return text;

  const introParts = sentences.slice(0, dataStart);
  const dataParts = sentences.slice(dataStart, dataEnd + 1);
  const questionParts = sentences.slice(dataEnd + 1);

  const result: string[] = [];
  if (introParts.length > 0) result.push(introParts.join(' '));
  result.push('<자료>');
  result.push(dataParts.join('\n'));
  if (questionParts.length > 0) result.push(questionParts.join(' '));

  return result.join('\n');
}

/**
 * 지문에서 대화형 화자 정보를 추출하여 맵으로 만듭니다.
 */
export function buildSpeakerMapFromStem(stem: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!stem) return map;
  const pattern = /([가-힣]{1,5})\s*[:：]\s*([\s\S]*?)(?=([가-힣]{1,5})\s*[:：]|$)/g;
  let m;
  while ((m = pattern.exec(stem)) !== null) {
    const name = m[1];
    const content = m[2].trim();
    if (content.length > 0) {
      map.set(content, name);
      map.set(content.replace(/^['"“”’‘]|['"“”’‘]$/g, '').trim(), name);
    }
  }
  return map;
}

/**
 * 선택지 텍스트에 해당하는 화자 이름을 찾습니다.
 */
export function findSpeakerForChoice(choiceText: string, speakerMap: Map<string, string>): string | undefined {
  if (!choiceText || !speakerMap) return undefined;
  const clean = choiceText.replace(/^['"“”’‘]|['"“”’‘]$/g, '').trim();
  if (speakerMap.has(choiceText)) return speakerMap.get(choiceText);
  if (speakerMap.has(clean)) return speakerMap.get(clean);
  for (const [key, name] of speakerMap.entries()) {
    if (!key) continue;
    const cleanKey = key.replace(/^['"“”’‘]|['"“”’‘]$/g, '').trim();
    if (clean.length > 5 && cleanKey && (cleanKey.includes(clean.substring(0, 15)) || clean.includes(cleanKey.substring(0, 15)))) {
      return name;
    }
  }
  return undefined;
}
