// 선택 패널 컴포넌트
export function SelectorPanel({
  title,
  options,
  value,
  onSelect,
  labelMap,
}: {
  title: string;
  options: readonly string[];
  value: string;
  onSelect: (value: string) => void;
  labelMap?: Record<string, string>;
}) {
  return (
    <section className="border border-slate-200 bg-white px-5 py-5">
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`border px-4 py-3 text-sm font-semibold ${
              value === option ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {labelMap?.[option] ?? option}
          </button>
        ))}
      </div>
    </section>
  );
}
