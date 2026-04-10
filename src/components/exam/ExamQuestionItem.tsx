import { DefaultQuestionItem } from './DefaultQuestionItem';
import { EnglishQuestionItem } from './EnglishQuestionItem';
import { MathQuestionItem } from './MathQuestionItem';
import type { ExamQuestionItemProps } from './ExamQuestionItem.types';
import type { ExamQuestion } from './types';

function isEnglishQuestion(question: ExamQuestion) {
  const topic = String(question.topic ?? '');
  const stem = String(question.stem ?? '');
  const stimulus = String(question.stimulus ?? '');
  const choiceText = Array.isArray(question.choices) ? question.choices.join(' ') : '';
  const normalizedTopic = topic.toLowerCase();
  const combined = `${stem} ${stimulus} ${choiceText}`;
  const englishChars = (combined.match(/[A-Za-z]/g) || []).length;
  const koreanChars = (combined.match(/[가-힣]/g) || []).length;
  const hasLongEnglishPassage = englishChars >= 80 && englishChars > koreanChars;

  return normalizedTopic.includes('english') || topic.includes('영어') || hasLongEnglishPassage;
}

function isMathQuestion(topic: string) {
  const normalized = topic.toLowerCase();
  return (
    normalized.includes('math') ||
    topic.includes('수학') ||
    topic.includes('미적분') ||
    topic.includes('기하') ||
    topic.includes('확률과 통계') ||
    topic.includes('수학 i') ||
    topic.includes('수학 ii') ||
    topic.includes('수학I') ||
    topic.includes('수학II')
  );
}

export function ExamQuestionItem(props: ExamQuestionItemProps) {
  const topic = props.question.topic ?? '';

  if (isEnglishQuestion(props.question)) {
    return <EnglishQuestionItem {...props} />;
  }

  if (isMathQuestion(topic)) {
    return <MathQuestionItem {...props} />;
  }

  return <DefaultQuestionItem {...props} />;
}
