import { ReactNode } from 'react';

export const QUESTION_CONTENT_WIDTH = 'max-w-[44rem]';

export function QuestionRow({
  leading,
  content,
}: {
  leading?: ReactNode;
  content: ReactNode;
}) {
  return (
    <div className="flex w-full items-start gap-3 sm:gap-4">
      {leading && <div className="shrink-0 pt-[2px] sm:pt-1">{leading}</div>}
      <div className="w-full min-w-0">{content}</div>
    </div>
  );
}

export function QuestionContent({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const classes = [QUESTION_CONTENT_WIDTH, className].filter(Boolean).join(' ');
  return <div className={classes}>{children}</div>;
}
