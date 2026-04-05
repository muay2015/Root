import { normalizeChoiceText } from '../../lib/question/normalizeChoiceText';
import { ChoiceItem } from './ChoiceItem';

type ChoiceListProps = {
  choices: string[];
  selectedChoice: string | undefined;
  onSelect: (choice: string) => void;
};

export function ChoiceList({ choices, selectedChoice, onSelect }: ChoiceListProps) {
  const normalizedSelectedChoice = selectedChoice ? normalizeChoiceText(selectedChoice) : undefined;

  return (
    <div className="space-y-1.5 sm:space-y-2">
      {choices.map((rawChoice, index) => {
        const choice = normalizeChoiceText(rawChoice);
        return (
        <div key={`${index + 1}-${choice}`}>
          <ChoiceItem
            number={index + 1}
            text={choice}
            selected={normalizedSelectedChoice === choice}
            onSelect={() => onSelect(choice)}
          />
        </div>
        );
      })}
    </div>
  );
}
