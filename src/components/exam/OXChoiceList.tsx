import React from 'react';
import { Circle, X } from 'lucide-react';

type OXChoiceListProps = {
  selectedChoice: string | undefined;
  onSelect: (choice: string) => void;
};

export function OXChoiceList({ selectedChoice, onSelect }: OXChoiceListProps) {
  const choices = [
    { 
      value: 'O', 
      label: '그렇다', 
      icon: Circle, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50/50', 
      border: 'border-blue-100', 
      activeBorder: 'border-blue-500', 
      activeBg: 'bg-blue-600',
      activeShadow: 'shadow-[0_4px_20px_rgb(37,99,235,0.12)]'
    },
    { 
      value: 'X', 
      label: '아니다', 
      icon: X, 
      color: 'text-red-500', 
      bg: 'bg-red-50/50', 
      border: 'border-red-100', 
      activeBorder: 'border-red-500', 
      activeBg: 'bg-red-500',
      activeShadow: 'shadow-[0_4px_20px_rgb(239,68,68,0.12)]'
    },
  ];

  return (
    <div className="flex w-full gap-3 sm:gap-4 mt-4 max-w-[32rem] max-lg:-ml-[1.875rem] max-lg:w-[calc(100%+1.875rem)]">
      {choices.map((choice) => {
        const isSelected = selectedChoice === choice.value;
        const Icon = choice.icon;

        return (
          <button
            key={choice.value}
            type="button"
            onClick={() => onSelect(choice.value)}
            className={`group relative flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 p-4 transition-all duration-300 sm:p-6 ${
              isSelected
                ? `${choice.activeBorder} ${choice.bg} ${choice.activeShadow} transform -translate-y-1`
                : `${choice.border} bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm`
            }`}
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-all duration-500 sm:h-16 sm:w-16 ${
                isSelected
                  ? `${choice.activeBg} text-white scale-110 shadow-lg ring-2 ring-white/50`
                  : `bg-slate-50 ${choice.color} group-hover:scale-105 group-hover:bg-white group-hover:shadow-sm`
              }`}
            >
              <Icon className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={3.5} />
            </div>
            
            <div className="flex flex-col items-center">
              <span className={`text-[16px] font-black tracking-tight sm:text-[18px] ${isSelected ? choice.color : 'text-slate-800'}`}>
                {choice.label}
              </span>
            </div>

            {isSelected && (
              <div className={`absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full ${choice.activeBg} text-white shadow-md ring-2 ring-white z-20 animate-in zoom-in-50 duration-300`}>
                <Circle className="h-3.5 w-3.5 fill-current" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
