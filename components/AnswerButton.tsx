"use client";

import clsx from "clsx";
import { Answer, answerStyles, shapeIcon } from "@/lib/types";

export function AnswerButton({
  answer,
  disabled,
  onClick
}: {
  answer: Answer;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "flex min-h-20 w-full items-center gap-3 rounded-2xl p-3 text-left text-white shadow-soft transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70",
        answerStyles[answer.color]
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/20 text-2xl">
        {shapeIcon[answer.shape]}
      </span>
      <span className="text-xl font-black leading-tight">{answer.label}</span>
    </button>
  );
}
