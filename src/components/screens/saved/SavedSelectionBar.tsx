import React from 'react';
import { RefreshCw } from 'lucide-react';

export interface SavedSelectionBarProps {
  isSelectionMode: boolean;
  selectedCount: number;
  isDeleting: boolean;
  onCancel: () => void;
  onDelete: () => void;
}

export function SavedSelectionBar({
  isSelectionMode,
  selectedCount,
  isDeleting,
  onCancel,
  onDelete,
}: SavedSelectionBarProps) {
  if (!isSelectionMode) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 transform items-center gap-6 rounded-3xl bg-slate-900/90 px-8 py-4 text-white shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-10 duration-500 min-w-[320px] max-w-[90vw] justify-between border border-white/10">
      <div className="flex flex-col">
        <span className="text-xs font-black text-slate-400">선택된 문항</span>
        <span className="text-lg font-black">{selectedCount}개</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-[13px] font-black text-slate-300 hover:bg-white/10 transition-colors"
        >
          취소
        </button>
        <button
          disabled={selectedCount === 0 || isDeleting}
          onClick={onDelete}
          className="flex items-center gap-2 rounded-xl bg-red-500 px-6 py-2.5 text-[13px] font-black text-white shadow-lg shadow-red-900/20 transition-all hover:bg-red-600 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
        >
          {isDeleting ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              삭제 중...
            </>
          ) : (
            '삭제하기'
          )}
        </button>
      </div>
    </div>
  );
}
