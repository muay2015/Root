import { QuestionStimulusBox } from './QuestionStimulusBox';
import { useQuestionRepair } from '../../hooks/useQuestionRepair';
import { PromptRenderer } from './question/PromptRenderer';
import { QuestionRow, QuestionContent } from './question/QuestionLayout';
import type { ExamQuestionItemProps } from './ExamQuestionItem.types';
import {
  standardizeEnglishIrrelevantSentence,
  standardizeEnglishOrderArrangement,
} from '../../lib/question/englishStandardizer';
import {
  ExamQuestionSectionFrame,
  QuestionChoiceSection,
  QuestionImageCard,
} from './ExamQuestionItem.shared';

function normalizeOrderArrangementChoiceDisplay(
  choices: (string | { value: string; display: string })[],
) {
  const defaultDisplays = [
    '(A) - (C) - (B)',
    '(B) - (A) - (C)',
    '(B) - (C) - (A)',
    '(C) - (A) - (B)',
    '(C) - (B) - (A)',
  ];

  const isNumericOnly =
    choices.length === 5 &&
    choices.every((choice) => {
      const text =
        typeof choice === 'object' && choice !== null
          ? choice.display ?? choice.value
          : String(choice);
      return /^(?:[1-5]|[①-⑤])$/.test(text.trim());
    });

  if (!isNumericOnly) {
    return choices;
  }

  return choices.map((choice, index) => ({
    value:
      typeof choice === 'object' && choice !== null
        ? choice.value ?? String(index + 1)
        : String(choice),
    display: defaultDisplays[index] ?? String(index + 1),
  }));
}

function parseOrderArrangementPassages(text: string) {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const markerRegex = /(\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\])/gi;
  const matches = [...normalized.matchAll(markerRegex)];

  if (matches.length === 0) {
    return [{ label: '지문', content: normalized }];
  }

  return matches
    .map((match, index) => {
      const start = match.index ?? 0;
      const end = matches[index + 1]?.index ?? normalized.length;
      const label = match[0].replace(/[\[\]\(\)\s]/g, '').toUpperCase();
      const content = normalizePlainEnglishReadingText(normalized.slice(start + match[0].length, end).trim());

      return {
        label,
        content,
      };
    })
    .filter((section) => section.content.length > 0);
}

function hasLatinContent(text: string) {
  return /[A-Za-z]/.test(text);
}

function isKoreanText(text: string) {
  return /[\u3131-\u314E\uAC00-\uD7A3]/u.test(text);
}

function normalizePlainEnglishReadingText(text: string) {
  return text
    .replace(/<\/?u>/gi, '')
    .replace(/\[\/?u\]/gi, '')
    .trim();
}

function looksLikeIrrelevantSentenceQuestion(
  question: ExamQuestionItemProps['question'],
  prompt: string,
  choices: any[],
) {
  const topic = String(question.topic ?? '').toLowerCase();
  const stem = String(question.stem ?? '').toLowerCase();
  const promptText = String(prompt ?? '').toLowerCase();
  const choiceTexts = choices.map((choice) =>
    (typeof choice === 'object' && choice !== null
      ? choice.display ?? choice.value
      : String(choice)
    ).trim(),
  );

  const hasIrrelevantSignal =
    topic.includes('irrelevant') ||
    topic.includes('unrelated') ||
    stem.includes('overall flow') ||
    stem.includes('관계 없는 문장') ||
    stem.includes('관계없는 문장') ||
    promptText.includes('overall flow') ||
    promptText.includes('관계 없는 문장') ||
    promptText.includes('관계없는 문장');

  const numericOnlyChoices =
    choiceTexts.length === 5 &&
    choiceTexts.every((text) => /^(?:[1-5]|\([1-5]\)|[①-⑤])$/.test(text));

  return hasIrrelevantSignal || numericOnlyChoices;
}

function splitIrrelevantSentencePrompt(prompt: string) {
  const normalized = normalizePlainEnglishReadingText(prompt);
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);

  if (lines.length <= 1) {
    const singleLine = lines[0] ?? normalized;
    const questionPatterns = [
      /^(다음 글에서 전체 흐름과 관계 없는 문장은\?)\s*([\s\S]+)$/i,
      /^(다음 글의 흐름과 관계 없는 문장은\?)\s*([\s\S]+)$/i,
      /^([\s\S]*?\?)\s+([A-Z][\s\S]+)$/i,
    ];

    for (const pattern of questionPatterns) {
      const match = singleLine.match(pattern);
      if (match) {
        const instruction = (match[1] ?? '').trim();
        const passage = (match[2] ?? '').trim();
        if (instruction && passage) {
          return { instruction, passage };
        }
      }
    }

    return {
      instruction: '',
      passage: singleLine,
    };
  }

  return {
    instruction: lines[0],
    passage: lines.slice(1).join('\n').trim(),
  };
}

function IrrelevantSentencePassage({
  text,
}: {
  text: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm">
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="whitespace-pre-wrap break-words break-keep text-[16px] leading-[1.85] text-slate-900 text-justify sm:text-[17px] sm:leading-[1.9]">
          {normalizePlainEnglishReadingText(text)}
        </div>
      </div>
    </div>
  );
}

function EnglishPassageBox({
  text,
  isEnglishReading,
}: {
  text: string;
  isEnglishReading: boolean;
}) {
  if (!text.trim()) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm">
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="text-justify">
          <PromptRenderer text={text} isEnglishSentenceInsertion={isEnglishReading} />
        </div>
      </div>
    </div>
  );
}

function EnglishInstructionBlock({
  text,
  isEnglishReading,
}: {
  text: string;
  isEnglishReading: boolean;
}) {
  if (!text.trim()) {
    return null;
  }

  return (
    <div className="mb-4">
      <PromptRenderer text={text} isEnglishSentenceInsertion={isEnglishReading} />
    </div>
  );
}

function splitEnglishPrompt(prompt: string) {
  const lines = prompt.split('\n').map((line) => line.trim()).filter(Boolean);
  return {
    instruction: lines[0] ?? '',
    passage: lines.slice(1).join('\n').trim(),
    lines,
  };
}

function renderEnglishPromptWithBox(prompt: string, isEnglishReading: boolean) {
  const { instruction, passage, lines } = splitEnglishPrompt(prompt);

  if (!passage) {
    return (
      <>
        <EnglishInstructionBlock text={instruction} isEnglishReading={isEnglishReading} />
        {lines.length === 1 && instruction.trim().length > 0 ? (
          <EnglishPassageBox text={instruction} isEnglishReading={isEnglishReading} />
        ) : null}
      </>
    );
  }

  return (
    <>
      <EnglishInstructionBlock text={instruction} isEnglishReading={isEnglishReading} />
      <EnglishPassageBox text={passage} isEnglishReading={isEnglishReading} />
    </>
  );
}

function isOrderArrangementInstructionLine(line: string) {
  return /(?:다음 글|주어진 글|이어진 글|순서대로 배열|배열할 때|고르시오|고려하시오)/.test(line);
}

function isOrderArrangementChoiceLine(line: string) {
  const compact = line.replace(/\s+/g, ' ').trim();
  return (
    /^(?:[1-5]|[①-⑤])$/.test(compact) ||
    /^(?:\([ABC]\)|[ABC])(?:\s*[-–—]\s*(?:\([ABC]\)|[ABC]))+$/.test(compact) ||
    /^(?:\([ABC]\)|[ABC])(?:\s+(?:\([ABC]\)|[ABC])){2,}$/.test(compact)
  );
}

function extractOrderArrangementIntro(stem: string) {
  const normalized = stem
    .replace(/\r\n/g, '\n')
    .replace(/([^\n])\s*(\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\])/g, '$1\n$2');
  const markerMatch = normalized.match(/(?:^|\n)(\(\s*A\s*\)|\[\s*A\s*\])/i);
  if (!markerMatch || typeof markerMatch.index !== 'number') {
    return '';
  }

  const introBlock = normalized.slice(0, markerMatch.index).trim();
  if (!introBlock) {
    return '';
  }

  const intro = introBlock
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        hasLatinContent(line) &&
        !isKoreanText(line) &&
        !/^\*/.test(line) &&
        !isOrderArrangementChoiceLine(line) &&
        !isOrderArrangementInstructionLine(line),
    )
    .join('\n')
    .trim();

  if (intro) {
    return intro;
  }

  const compactIntro = introBlock
    .replace(/\s+/g, ' ')
    .replace(/\s*(\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\]).*$/i, '')
    .trim();

  return hasLatinContent(compactIntro) && !isKoreanText(compactIntro)
    ? normalizePlainEnglishReadingText(compactIntro)
    : '';
}

function stripOrderArrangementSections(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\s*(\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\])[\s\S]*$/i, '')
    .trim();
}

function extractOrderArrangementIntroFromText(text: string | null | undefined) {
  if (typeof text !== 'string') {
    return '';
  }

  const stripped = normalizePlainEnglishReadingText(stripOrderArrangementSections(text));
  if (stripped && hasLatinContent(stripped) && !isKoreanText(stripped)) {
    return stripped;
  }

  return '';
}

function resolveOrderArrangementIntro(
  stem: string,
  stimulus: string | null | undefined,
  prompt: string,
) {
  const fromStimulus = extractOrderArrangementIntroFromText(stimulus);
  if (fromStimulus) {
    return fromStimulus;
  }

  const fromStem = normalizePlainEnglishReadingText(extractOrderArrangementIntro(stem));
  if (fromStem) {
    return fromStem;
  }

  return extractOrderArrangementIntroFromText(prompt);
}

function resolveOrderArrangementInstruction(prompt: string) {
  const lines = prompt.split('\n').map((line) => line.trim()).filter(Boolean);
  const instructionLine = lines.find((line) => isOrderArrangementInstructionLine(line));
  return instructionLine ?? lines[0] ?? '';
}

function CombinedOrderPassageBox({
  sections,
}: {
  sections: { label: string; content: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm">
      <div className="border-b border-slate-200 bg-white px-5 py-2.5 text-[13px] font-bold tracking-[0.05em] text-slate-700 sm:px-6">
        본문
      </div>
      <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        {sections.map((section) => (
          <div key={`${section.label}-${section.content}`} className="space-y-2">
            <div className="text-[13px] font-bold tracking-[0.05em] text-slate-700">
              ({section.label})
            </div>
            <div className="whitespace-pre-wrap break-words break-keep text-[16px] leading-[1.8] text-slate-800 text-justify sm:text-[17px] sm:leading-[1.9]">
              {section.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EnglishQuestionItem(props: ExamQuestionItemProps) {
  const { question, questionNumber, response, active, onSelectChoice, onChangeText } = props;
  const {
    prompt,
    stimulus,
    finalChoices,
    isEnglishSentenceInsertion,
    isEnglishOrderArrangement,
    isEnglishIrrelevantSentence,
    isEnglishReading,
    isOXQuestion,
  } = useQuestionRepair(question);
  const isGuaranteedIrrelevantSentence = looksLikeIrrelevantSentenceQuestion(
    question,
    prompt,
    finalChoices,
  );

  const lines = prompt.split('\n').map((line) => line.trim()).filter(Boolean);
  const standardizedOrderQuestion = isEnglishOrderArrangement
    ? standardizeEnglishOrderArrangement({
        stem: question.stem,
        stimulus,
        materialText: prompt,
        answer: question.answer,
      })
    : null;
  const standardizedIrrelevantQuestion = isGuaranteedIrrelevantSentence
    ? standardizeEnglishIrrelevantSentence({
        stem: question.stem,
        stimulus,
        materialText: prompt,
        choices: finalChoices,
        answer: question.answer,
      })
    : null;
  const irrelevantSplit = isGuaranteedIrrelevantSentence
    ? splitIrrelevantSentencePrompt(standardizedIrrelevantQuestion?.stem ?? prompt)
    : null;
  const instruction = isEnglishOrderArrangement
    ? resolveOrderArrangementInstruction(prompt)
    : isGuaranteedIrrelevantSentence
      ? standardizedIrrelevantQuestion?.instruction ?? irrelevantSplit?.instruction ?? lines[0]
      : lines[0];
  const passage = isEnglishOrderArrangement
    ? standardizedOrderQuestion?.stem ?? lines.filter((line) => line !== instruction).join('\n').trim()
    : isGuaranteedIrrelevantSentence
      ? standardizedIrrelevantQuestion?.passage ?? irrelevantSplit?.passage ?? ''
    : lines.slice(1).join('\n').trim();
  const orderIntro = isEnglishOrderArrangement
    ? standardizedOrderQuestion?.stimulus ?? resolveOrderArrangementIntro(question.stem, stimulus, prompt)
    : stimulus?.trim() || '';
  const renderedChoices = isEnglishOrderArrangement
    ? normalizeOrderArrangementChoiceDisplay(
        standardizedOrderQuestion?.choices.length ? standardizedOrderQuestion.choices : finalChoices,
      )
    : isGuaranteedIrrelevantSentence
      ? standardizedIrrelevantQuestion?.choices ?? finalChoices
      : finalChoices;

  return (
    <ExamQuestionSectionFrame question={question} questionNumber={questionNumber} active={active}>
      {!question.image_url ? (
        <div className="mb-4">
          {isEnglishSentenceInsertion ? (
            <>
              <EnglishInstructionBlock text={instruction} isEnglishReading={isEnglishReading} />
              {orderIntro ? (
                <div className="my-5">
                  <QuestionStimulusBox content={orderIntro} renderMode="plain" />
                </div>
              ) : null}
              <EnglishPassageBox text={passage} isEnglishReading={isEnglishReading} />
            </>
          ) : isEnglishOrderArrangement ? (
            <>
              {/* Preserve this ordering UI:
                  instruction -> intro stimulus box -> combined (A)(B)(C) passage box -> text-visible choices.
                  Always render the intro box from fallback-safe orderIntro so it stays visible
                  even when generation omits or misplaces stimulus. */}
              {instruction.trim().length > 0 && (
                <PromptRenderer text={instruction} isEnglishSentenceInsertion={isEnglishReading} />
              )}
              {orderIntro ? (
                <div className="my-5">
                  <QuestionStimulusBox content={orderIntro} renderMode="plain" />
                </div>
              ) : null}
              {(() => {
                const orderSections = parseOrderArrangementPassages(passage);
                return orderSections.length > 0 ? (
                  <CombinedOrderPassageBox sections={orderSections} />
                ) : passage.length > 0 ? (
                  <QuestionStimulusBox content={passage} />
                ) : null;
              })()}
            </>
          ) : isGuaranteedIrrelevantSentence ? (
            <>
              {instruction.trim().length > 0 && (
                <div className="mb-4 text-[16px] leading-[1.7] text-slate-900 sm:text-[17px]">
                  {instruction}
                </div>
              )}
              {passage.length > 0 && <IrrelevantSentencePassage text={passage} />}
            </>
          ) : stimulus ? (
            <>
              <EnglishInstructionBlock text={instruction} isEnglishReading={isEnglishReading} />
              <div className="my-5">
                <QuestionStimulusBox content={stimulus} />
              </div>
              <EnglishPassageBox text={passage} isEnglishReading={isEnglishReading} />
            </>
          ) : (
            renderEnglishPromptWithBox(prompt, isEnglishReading)
          )}
        </div>
      ) : (
        <QuestionImageCard question={question} />
      )}

      {stimulus &&
      !question.image_url &&
      !isEnglishSentenceInsertion &&
      !isEnglishOrderArrangement &&
      !isGuaranteedIrrelevantSentence &&
      !isEnglishReading ? (
        <QuestionStimulusBox content={stimulus} />
      ) : null}

      <QuestionChoiceSection
        question={question}
        response={response}
        finalChoices={renderedChoices}
        isOXQuestion={isOXQuestion}
        hideText={!!question.image_url || isEnglishSentenceInsertion || isGuaranteedIrrelevantSentence}
        onSelectChoice={onSelectChoice}
        onChangeText={onChangeText}
      />
    </ExamQuestionSectionFrame>
  );
}
