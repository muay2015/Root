import { normalizeChoiceText } from '../../lib/question/normalizeChoiceText';
import { ChoiceItem } from './ChoiceItem';

export type ChoiceItemData = {
  value: string;
  display: string;
};

type ChoiceListProps = {
  choices: (string | ChoiceItemData)[];
  selectedChoice: string | undefined;
  onSelect: (choice: string) => void;
};

export function ChoiceList({ choices, selectedChoice, onSelect }: ChoiceListProps) {
  const normalizedChoices = choices
    .map((choice) => {
      const isObj = typeof choice === 'object' && choice !== null;
      const value = isObj ? (choice as ChoiceItemData).value : String(choice);
      const display = isObj ? (choice as ChoiceItemData).display : String(choice);
      return {
        value,
        display: normalizeChoiceText(display),
        normalizedValue: normalizeChoiceText(value),
      };
    })
    .filter((choice) => choice.display.length > 0);
    
  const normalizedSelectedChoice = normalizeChoiceText(selectedChoice);

  return (
    <div className="w-full min-w-0 flex flex-col gap-2.5 sm:gap-3">
      {normalizedChoices.map((choice, index) => (
        <div key={`${index + 1}-${choice.normalizedValue}`} className="w-full min-w-0">
          <ChoiceItem
            number={index + 1}
            text={choice.display}
            selected={normalizedSelectedChoice === choice.normalizedValue}
            onSelect={() => onSelect(choice.value)}
          />
        </div>
      ))}
    </div>
  );
}
