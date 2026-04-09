import { DefaultQuestionItem } from './DefaultQuestionItem';
import { EnglishQuestionItem } from './EnglishQuestionItem';
import { MathQuestionItem } from './MathQuestionItem';
import type { ExamQuestionItemProps } from './ExamQuestionItem.types';

function isEnglishQuestion(topic: string) {
  const normalized = topic.toLowerCase();
  return normalized.includes('english') || topic.includes('영어');
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

  if (isEnglishQuestion(topic)) {
    return <EnglishQuestionItem {...props} />;
  }

  if (isMathQuestion(topic)) {
    return <MathQuestionItem {...props} />;
  }

  return <DefaultQuestionItem {...props} />;
}
