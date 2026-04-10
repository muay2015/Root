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
  hideText?: boolean;
  numberStyle?: 'numeric' | 'circle';
};

export function ChoiceList({ choices, selectedChoice, onSelect, hideText, numberStyle = 'numeric' }: ChoiceListProps) {
  const CIRCLE_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

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
    <div className={`w-full min-w-0 ${hideText ? 'grid grid-cols-5 gap-2 sm:gap-4' : 'flex flex-col gap-2.5 sm:gap-3'}`}>
      {normalizedChoices.map((choice, index) => (
        <div key={`${index + 1}-${choice.normalizedValue}`} className="w-full min-w-0">
          <ChoiceItem
            number={numberStyle === 'circle' ? (CIRCLE_NUMBERS[index] || index + 1) : index + 1}
            text={choice.display}
            selected={normalizedSelectedChoice === choice.normalizedValue}
            onSelect={() => onSelect(choice.value)}
            hideText={hideText}
          />
        </div>
      ))}
    </div>
  );
}
