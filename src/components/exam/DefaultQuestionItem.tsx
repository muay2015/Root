import { useQuestionRepair } from '../../hooks/useQuestionRepair';
import type { ExamQuestionItemProps } from './ExamQuestionItem.types';
import {
  CommonPromptBlock,
  CommonStimulusRow,
  ExamQuestionSectionFrame,
  QuestionChoiceSection,
  QuestionImageCard,
} from './ExamQuestionItem.shared';

export function DefaultQuestionItem(props: ExamQuestionItemProps) {
  const { question, questionNumber, response, active, onSelectChoice, onChangeText } = props;
  const { prompt, stimulus, finalChoices, isEnglishReading, isOXQuestion } = useQuestionRepair(question);
  const shouldInterleaveStimulus = !!stimulus && !isEnglishReading;

  return (
    <ExamQuestionSectionFrame question={question} questionNumber={questionNumber} active={active}>
      {!question.image_url ? (
        <CommonPromptBlock
          prompt={prompt}
          stimulus={stimulus}
          shouldInterleaveStimulus={shouldInterleaveStimulus}
          isEnglishReading={isEnglishReading}
          questionHasImage={false}
        />
      ) : (
        <QuestionImageCard question={question} />
      )}

      {!shouldInterleaveStimulus ? (
        <CommonStimulusRow stimulus={stimulus} questionHasImage={!!question.image_url} />
      ) : null}

      <QuestionChoiceSection
        question={question}
        response={response}
        finalChoices={finalChoices}
        isOXQuestion={isOXQuestion}
        hideText={!!question.image_url}
        onSelectChoice={onSelectChoice}
        onChangeText={onChangeText}
      />
    </ExamQuestionSectionFrame>
  );
}
