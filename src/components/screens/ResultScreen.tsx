import type { ExamQuestion } from '../exam/types';
import type { WrongNote } from '../../lib/examTypes';
import { Metric } from '../ui/Metric';
import { normalizeAnswer } from '../../lib/examUtils';

interface ResultScreenProps {
  examTitle: string;
  summary: { score: number; correctCount: number; wrongCount: number; wrong: WrongNote[] };
  questions: ExamQuestion[];
  responses: Record<number, string>;
  onBack: () => void;
  onWrong: () => void;
}

export function ResultScreen({
  examTitle,
  summary,
  questions,
  responses,
  onBack,
  onWrong,
}: ResultScreenProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8">
          <h1 className="text-3xl font-bold">결과 확인</h1>
          <p className="mt-2 text-sm text-slate-500">{examTitle}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Metric label="점수" value={`${summary.score}점`} />
            <Metric label="정답" value={`${summary.correctCount}문항`} />
            <Metric label="오답" value={`${summary.wrongCount}문항`} />
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button onClick={onWrong} className="border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
            오답노트 보기
          </button>
          <button onClick={onBack} className="bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
            홈으로 이동
          </button>
        </div>

        <section className="space-y-4">
          {questions.map((question) => {
            const myAnswer = responses[question.id] ?? '미응답';
            const isCorrect = normalizeAnswer(myAnswer) === normalizeAnswer(question.answer);
            return (
              <article key={question.id} className="border border-slate-200 bg-white px-5 py-5">
                <div className="mb-3 text-sm font-semibold text-slate-500">
                  문항 {question.id} · {isCorrect ? '정답' : '오답'}
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{question.stem}</h2>
                <div className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
                  <p><span className="font-semibold">내 답:</span> {myAnswer}</p>
                  <p><span className="font-semibold">정답:</span> {question.answer}</p>
                  <p className="border border-slate-200 bg-slate-50 px-4 py-3">{question.explanation}</p>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
