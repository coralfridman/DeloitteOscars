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
        "flex min-h-28 w-full items-center gap-4 rounded-[24px] p-5 text-left text-white shadow-soft transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70",
        answerStyles[answer.color]
      )}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 text-3xl">
        {shapeIcon[answer.shape]}
      </span>
      <span className="text-2xl font-black leading-tight">{answer.label}</span>
    </button>
  );
}
