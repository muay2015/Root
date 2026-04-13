import { useMemo } from 'react';
import type { ExamQuestion } from '../../components/exam/types';
import {
  isEnglishContentMatchingType,
  isEnglishSummaryCompletionType,
  isEnglishSubject as checkEnglishSubject
} from '../../lib/question/englishStandardizer';

/**
 * 전역 문항 유형 판별 전용 Hook
 */
export function useQuestionTypeDetection(question: ExamQuestion, rawPrompt: string, rawStimulus: string | null) {
  return useMemo(() => {
    const topicLower = question.topic.toLowerCase();
    
    // 기본 유형 판별용 메타데이터
    // 1. 영어 과목 여부 판별 (토픽명 검사 + 지적 텍스트 기반 검사 병행)
    const isEnglishSubject = (() => {
      if (checkEnglishSubject(question.topic) || topicLower.includes('english') || topicLower.includes('영어')) return true;
      
      // 토픽에 키워드가 없더라도 지문/발문에 영어 문자가 압도적으로 많으면 영어 과목으로 간주
      const combinedText = (rawPrompt + (rawStimulus ?? '') + question.stem).trim();
      if (!combinedText) return false;
      const englishChars = (combinedText.match(/[a-zA-Z]/g) || []).length;
      return englishChars > 40 && (englishChars / combinedText.length) > 0.3;
    })();
    
    // 1. 문장 삽입 (Sentence Insertion)
    const isInsertionType =
      (question.topic.includes('문장 삽입') ||
      topicLower.includes('insertion') ||
      question.stem.includes('주어진 문장')) &&
      !question.topic.includes('빈칸') && 
      !question.topic.includes('추론');

    // 2. 순서 배열 (Order Arrangement)
    const isOrderType =
      question.topic.includes('순서 배열') ||
      topicLower.includes('order') ||
      question.stem.includes('이어진 글의 순서') ||
      question.stem.includes('순서대로 배열') ||
      question.stem.includes('배열할 때') ||
      (/\(\s*A\s*\)/i.test(question.stem) &&
        /\(\s*B\s*\)/i.test(question.stem) &&
        /\(\s*C\s*\)/i.test(question.stem));

    // 3. 영어 전용 유형 판별
    const isEnglishSentenceInsertion = isEnglishSubject && isInsertionType;
    
    const isEnglishIrrelevantSentence =
      isEnglishSubject &&
      (question.topic.includes('관계없는 문장') ||
        question.topic.includes('관계 없는 문장') ||
        topicLower.includes('irrelevant') ||
        topicLower.includes('unrelated sentence') ||
        question.stem.includes('전체 흐름과 관계 없는 문장'));

    const isEnglishContentMatching =
      isEnglishSubject &&
      isEnglishContentMatchingType({
        subject: 'english',
        questionType: question.topic,
        topic: question.topic,
        stem: question.stem,
      });

    const isVocabularyType = isEnglishSubject && (
      question.topic.includes('어법') || 
      question.topic.includes('어휘') || 
      question.topic.includes('문법') || 
      question.topic.includes('낱말') ||
      topicLower.includes('vocabulary') ||
      topicLower.includes('grammar') ||
      // topic에 키워드가 없는 구버전 저장 문항을 위해 stem(발문)에서 직접 탐지
      question.stem.includes('어법상 틀린 것은') ||
      question.stem.includes('문맥상 낱말의 쓰임') ||
      question.stem.includes('밑줄 친 부분 중')
    );

    const isEnglishSummaryCompletion =
      isEnglishSubject &&
      !isVocabularyType &&
      (isEnglishSummaryCompletionType({
        subject: 'english',
        questionType: question.topic,
        topic: question.topic,
        stem: question.stem,
        prompt: rawPrompt,
        choices: question.choices,
      }) ||

        (/\(A\)/i.test(question.stem) && /\(B\)/i.test(question.stem)) ||
        (/\(A\)/i.test(rawPrompt) && /\(B\)/i.test(rawPrompt)) ||
        (rawStimulus && /\(A\)/i.test(rawStimulus) && /\(B\)/i.test(rawStimulus)) ||
        (question.choices ?? []).some(c => {
          const t = typeof c === 'object' ? (c as any).display || (c as any).value : String(c);
          return t.includes('(A)') && t.includes('(B)');
        }));

    const isEnglishOrderArrangement =
      isEnglishSubject &&
      !isEnglishSummaryCompletion &&
      isOrderType;

    const isEnglishReading =
      isEnglishSentenceInsertion ||
      isEnglishOrderArrangement ||
      isEnglishIrrelevantSentence ||
      isEnglishContentMatching ||
      isEnglishSummaryCompletion ||
      (isEnglishSubject && (question.topic.includes('빈칸') || question.topic.includes('추론')));

    // 4. 기타 유형
    const isOXQuestion = (() => {
      const finalChoices = question.choices ?? [];
      const choiceTexts = finalChoices.map((choice) => {
        const value = typeof choice === 'object' ? (choice as any).display ?? (choice as any).value : String(choice);
        return value.trim().toUpperCase();
      });

      const hasO = choiceTexts.some((text) => text === 'O' || text === '⭕');
      const hasX = choiceTexts.some((text) => text === 'X' || text === '❌');
      const stemHasOXMention = /OX\s*문제|맞으면\s*O|틀리면\s*X/.test(question.stem);
      return (hasO && hasX) || (stemHasOXMention && hasO && hasX);
    })();

    // 5. 어법/어휘 문항 판별 — 번호 기호가 지문 흐름 중간에 박혀 있는 유형
    //    이 유형은 텍스트 흐름이 중요하므로 다른 독해 유형보다 우선순위를 높게 잡거나 
    //    다른 유형이 섞여있더라도 어법 패턴이 뚜렷하면 grammar 모드를 활성화한다.
    const isEnglishGrammar =
      isEnglishSubject &&
      isVocabularyType &&
      // 문장 삽입이나 순서 배열은 별도 박스 렌더링이 필요하므로 제외하되, 
      // 일반적인 독해(빈칸 등)와 어법이 겹치면 어법용 인라인 렌더링을 우선함
      !isEnglishSentenceInsertion &&
      !isEnglishOrderArrangement;

    return {
      isEnglishSubject,
      isEnglishSentenceInsertion,
      isEnglishOrderArrangement,
      isEnglishIrrelevantSentence,
      isEnglishContentMatching,
      isEnglishSummaryCompletion,
      isEnglishReading,
      isEnglishGrammar,
      isOXQuestion,
    };
  }, [question, rawPrompt, rawStimulus]);
}

