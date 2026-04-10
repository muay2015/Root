import React from 'react';
import { useQuestionRepair } from '../../hooks/useQuestionRepair';
import { QuestionStimulusBox } from './QuestionStimulusBox';
import { EnglishSummaryCompletion } from './question/EnglishSummaryCompletion';
import { EnglishReadingLayout } from './question/layouts/EnglishReadingLayout';
import { EnglishOrderLayout } from './question/layouts/EnglishOrderLayout';
import { EnglishIrrelevantLayout } from './question/layouts/EnglishIrrelevantLayout';
import type { ExamQuestionItemProps } from './ExamQuestionItem.types';
import {
  standardizeEnglishIrrelevantSentence,
  standardizeEnglishOrderArrangement,
  extractOrderArrangementSections,
} from '../../lib/question/englishStandardizer';
import {
  ExamQuestionSectionFrame,
  QuestionChoiceSection,
  QuestionImageCard,
} from './ExamQuestionItem.shared';

function stripBlankInstructionNoise(text: string) {
  return String(text ?? '')
    .replace(/^\s*다음\s+빈칸에\s+들어갈\s+말(?:로)?\s+가장\s+적절한\s+것은\?\s*/i, '')
    .replace(/\s*가장\s+적절한\s+것은\?\s*$/i, '')
    .trim();
}

function getEnglishRatio(text: string) {
  const englishChars = (String(text ?? '').match(/[A-Za-z]/g) || []).length;
  return text.length > 0 ? englishChars / text.length : 0;
}

function splitInstructionAndPassage(text: string) {
  const normalized = String(text ?? '').trim();
  if (!normalized) {
    return { instruction: '', passage: '' };
  }

  const explicitInstruction = normalized.match(
    /^(다음\s+빈칸에\s+들어갈\s+말(?:로)?\s+가장\s+적절한\s+것은\?|다음\s+글의\s+흐름으로\s+보아,\s*주어진\s+문장이\s+들어가기에\s+가장\s+적절한\s+곳은\?|다음\s+글의\s+제목으로\s+가장\s+적절한\s+것은\?|다음\s+글의\s+주제로\s+가장\s+적절한\s+것은\?)/i,
  );

  if (explicitInstruction) {
    return {
      instruction: explicitInstruction[0].trim(),
      passage: stripBlankInstructionNoise(normalized.slice(explicitInstruction[0].length).trim()),
    };
  }

  const firstQuestionIdx = normalized.indexOf('?');
  if (firstQuestionIdx >= 0) {
    const maybeInstruction = normalized.slice(0, firstQuestionIdx + 1).trim();
    const remainder = stripBlankInstructionNoise(normalized.slice(firstQuestionIdx + 1).trim());
    if (remainder.length >= 40 && getEnglishRatio(remainder) >= 0.4) {
      return { instruction: maybeInstruction, passage: remainder };
    }
  }

  if (normalized.length >= 40 && getEnglishRatio(normalized) >= 0.4) {
    return { instruction: '', passage: stripBlankInstructionNoise(normalized) };
  }

  return { instruction: normalized, passage: '' };
}

export function EnglishQuestionItem(props: ExamQuestionItemProps) {
  const { question, questionNumber, response, active, onSelectChoice, onChangeText } = props;
  const repaired = useQuestionRepair(question);
  const {
    prompt,
    stimulus,
    finalChoices,
    isEnglishSentenceInsertion,
    isEnglishOrderArrangement,
    isEnglishIrrelevantSentence,
    isEnglishSummaryCompletion,
    isEnglishReading,
    isOXQuestion,
  } = repaired;

  const rawPrompt = prompt.trim();
  let { instruction, passage } = splitInstructionAndPassage(rawPrompt);

  if (isEnglishReading) {
    passage = stripBlankInstructionNoise(passage);

    if (!passage && rawPrompt.length >= 40) {
      const firstEnglishMatch = rawPrompt.match(/[A-Za-z]{4,}/);
      const splitIdx = firstEnglishMatch?.index ?? -1;
      if (splitIdx >= 0) {
        const maybeInstruction = rawPrompt.slice(0, splitIdx).trim();
        const remainder = stripBlankInstructionNoise(rawPrompt.slice(splitIdx).trim());
        if (remainder.length >= 40) {
          instruction = maybeInstruction;
          passage = remainder;
        }
      }
    }

    if (!passage && rawPrompt.length >= 40) {
      instruction = '';
      passage = stripBlankInstructionNoise(rawPrompt);
    }
  }

  const renderContent = () => {
    if (question.image_url) {
      return <QuestionImageCard question={question} />;
    }

    if (isEnglishSummaryCompletion) {
      return (
        <EnglishSummaryCompletion
          instruction={instruction}
          passage={passage}
          summary={stimulus ?? ''}
          choices={finalChoices}
          response={response}
          isEnglishReading={isEnglishReading}
          onSelectChoice={(choice) => onSelectChoice(question.id, choice)}
        />
      );
    }

    if (isEnglishOrderArrangement) {
      const orderStandardized = standardizeEnglishOrderArrangement({
        stem: question.stem,
        stimulus,
        materialText: prompt,
        answer: question.answer,
      });
      return (
        <EnglishOrderLayout
          instruction={orderStandardized.stem.split('\n')[0] || instruction}
          intro={orderStandardized.stimulus}
          sections={extractOrderArrangementSections(orderStandardized.stem)}
          isEnglishReading={isEnglishReading}
        />
      );
    }

    if (isEnglishIrrelevantSentence) {
      const irrevStandardized = standardizeEnglishIrrelevantSentence({
        stem: question.stem,
        stimulus,
        materialText: prompt,
        choices: finalChoices,
        answer: question.answer,
      });
      return (
        <EnglishIrrelevantLayout
          instruction={irrevStandardized.instruction}
          passage={irrevStandardized.passage}
        />
      );
    }

    if (isEnglishSentenceInsertion) {
      return (
        <>
          <div className="mb-4">
            <EnglishReadingLayout instruction={instruction} passage="" isEnglishReading={isEnglishReading} />
          </div>
          {stimulus && (
            <div className="my-5">
              <QuestionStimulusBox content={stimulus} renderMode="plain" />
            </div>
          )}
          <EnglishReadingLayout instruction="" passage={passage} isEnglishReading={isEnglishReading} />
        </>
      );
    }

    return (
      <>
        <EnglishReadingLayout instruction={instruction} passage={passage} isEnglishReading={isEnglishReading} />
        {stimulus && (
          <div className="my-5">
            <QuestionStimulusBox content={stimulus} />
          </div>
        )}
      </>
    );
  };

  return (
    <ExamQuestionSectionFrame question={question} questionNumber={questionNumber} active={active}>
      <div className="mb-4">{renderContent()}</div>

      {!isEnglishSummaryCompletion && !question.image_url && (
        <QuestionChoiceSection
          question={question}
          response={response}
          finalChoices={finalChoices}
          isOXQuestion={isOXQuestion}
          hideText={isEnglishSentenceInsertion || isEnglishIrrelevantSentence}
          numberStyle="circle"
          onSelectChoice={onSelectChoice}
          onChangeText={onChangeText}
        />
      )}
    </ExamQuestionSectionFrame>
  );
}
