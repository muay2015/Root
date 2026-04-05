import { normalizeChoiceText } from '../../lib/question/normalizeChoiceText';
import { ChoiceItem } from './ChoiceItem';

type ChoiceListProps = {
  choices: string[];
  selectedChoice: string | undefined;
  onSelect: (choice: string) => void;
};

export function ChoiceList({ choices, selectedChoice, onSelect }: ChoiceListProps) {
  const normalizedChoices = choices
    .map((choice) => normalizeChoiceText(choice))
    .filter((choice) => choice.length > 0);
  const normalizedSelectedChoice = normalizeChoiceText(selectedChoice);

  return (
    <div className="min-w-0 space-y-1.5 sm:space-y-2">
      {normalizedChoices.map((choice, index) => (
        <div key={`${index + 1}-${choice}`} className="min-w-0">
          <ChoiceItem
            number={index + 1}
            text={choice}
            selected={normalizedSelectedChoice === choice}
            onSelect={() => onSelect(choice)}
          />
        </div>
      ))}
    </div>
  );
}
