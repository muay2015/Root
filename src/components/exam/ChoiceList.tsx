import { ChoiceItem } from './ChoiceItem';

type ChoiceListProps = {
  choices: string[];
  selectedChoice: string | undefined;
  onSelect: (choice: string) => void;
};

export function ChoiceList({ choices, selectedChoice, onSelect }: ChoiceListProps) {
  return (
    <div className="space-y-1.5 sm:space-y-2">
      {choices.map((choice, index) => (
        <div key={`${index + 1}-${choice}`}>
          <ChoiceItem
            number={index + 1}
            text={choice}
            selected={selectedChoice === choice}
            onSelect={() => onSelect(choice)}
          />
        </div>
      ))}
    </div>
  );
}
