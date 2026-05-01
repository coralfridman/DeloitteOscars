import { Trophy } from "lucide-react";
import { QuestionWithAnswers, Submission } from "@/lib/types";

export function FinalResults({
  questions,
  submissions
}: {
  questions: QuestionWithAnswers[];
  submissions: Submission[];
}) {
  return (
    <div className="rounded-[24px] bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-deloitteGreen">
        <Trophy size={22} />
        <h2 className="text-2xl font-black text-ink">Final Results</h2>
      </div>
      <div className="mt-4 grid gap-3">
        {questions.length === 0 && <p className="font-bold text-slate-500">Loading final results...</p>}
        {questions.map((question, index) => {
          const answerCounts = question.answers.map((answer) => ({
            answer,
            count: submissions.filter(
              (submission) => submission.question_id === question.id && submission.answer_id === answer.id
            ).length
          }));
          const topCount = Math.max(0, ...answerCounts.map((result) => result.count));
          const winners = answerCounts.filter((result) => result.count === topCount && topCount > 0);

          return (
            <div key={question.id} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                Poll {index + 1}
              </p>
              <h3 className="mt-1 text-xl font-black leading-tight text-ink">{question.prompt}</h3>
              {winners.length > 0 ? (
                <p className="mt-3 text-2xl font-black text-deloitteGreen">
                  {winners.map((winner) => winner.answer.label).join(" / ")}
                  <span className="block text-sm font-bold text-slate-500">
                    {topCount} vote{topCount === 1 ? "" : "s"}{winners.length > 1 ? " each" : ""}
                  </span>
                </p>
              ) : (
                <p className="mt-3 text-lg font-black text-slate-500">No votes</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
