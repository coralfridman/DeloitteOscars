"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, Plus, Trash2 } from "lucide-react";
import { createGameCode } from "@/lib/game-code";
import { supabase } from "@/lib/supabase";

type DraftAnswer = {
  label: string;
  isCorrect: boolean;
};

type DraftQuestion = {
  prompt: string;
  backgroundImageUrl: string;
  timeLimitSeconds: number;
  answers: DraftAnswer[];
};

const colors = ["red", "blue", "yellow", "green"] as const;
const shapes = ["triangle", "diamond", "circle", "square"] as const;
const templateHeaders = [
  "Question",
  "Correct Answer",
  "Answer 1",
  "Answer 2",
  "Answer 3",
  "Answer 4",
  "Answer 5",
  "Answer 6",
  "Answer 7",
  "Answer 8",
  "Answer 9",
  "Answer 10",
  "Background Image URL",
  "Time Limit Seconds"
];

function blankQuestion(): DraftQuestion {
  return {
    prompt: "",
    backgroundImageUrl: "",
    timeLimitSeconds: 20,
    answers: [
      { label: "", isCorrect: true },
      { label: "", isCorrect: false },
      { label: "", isCorrect: false },
      { label: "", isCorrect: false }
    ]
  };
}

export default function CreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("Deloitte Oscars");
  const [questions, setQuestions] = useState<DraftQuestion[]>([blankQuestion()]);
  const [designReview, setDesignReview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const templateRows = useMemo(() => {
    return [
      [
        "Who should win best team moment?",
        "Launch day",
        "Launch day",
        "Client save",
        "All hands",
        "Hackathon",
        "",
        "",
        "",
        "",
        "",
        "",
        "https://images.unsplash.com/photo-1511578314322-379afb476865",
        "20"
      ]
    ];
  }, []);
  const templateCsv = useMemo(() => {
    return [templateHeaders, ...templateRows].map((row) => row.map(csvCell).join(",")).join("\n");
  }, [templateRows]);

  const canSave = useMemo(() => {
    return (
      title.trim().length > 0 &&
      questions.every(
        (question) =>
          question.prompt.trim() &&
          question.answers.filter((answer) => answer.label.trim()).length >= 2 &&
          question.answers.some((answer) => answer.label.trim() && answer.isCorrect)
      )
    );
  }, [questions, title]);

  async function saveGame(event: FormEvent) {
    event.preventDefault();
    if (!canSave) {
      setError("Each question needs a prompt, at least two answers, and one correct answer.");
      return;
    }
    setIsSaving(true);
    setError("");

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({ title: title.trim() })
      .select("id")
      .single();

    if (quizError || !quiz) {
      setError(quizError?.message || "Could not create quiz.");
      setIsSaving(false);
      return;
    }

    const questionRows = questions.map((question, index) => ({
      quiz_id: quiz.id,
      prompt: question.prompt.trim(),
      background_image_url: question.backgroundImageUrl.trim() || null,
      position: index,
      time_limit_seconds: question.timeLimitSeconds
    }));

    const { data: createdQuestions, error: questionsError } = await supabase
      .from("questions")
      .insert(questionRows)
      .select("id, position");

    if (questionsError || !createdQuestions) {
      setError(questionsError?.message || "Could not create questions.");
      setIsSaving(false);
      return;
    }

    const answerRows = createdQuestions.flatMap((createdQuestion) => {
      const question = questions[createdQuestion.position];
      return question.answers
        .filter((answer) => answer.label.trim())
        .map((answer, index) => ({
          question_id: createdQuestion.id,
          label: answer.label.trim(),
          color: colors[index % colors.length],
          shape: shapes[index % shapes.length],
          is_correct: answer.isCorrect
        }));
    });

    const { error: answersError } = await supabase.from("answers").insert(answerRows);
    if (answersError) {
      setError(answersError.message);
      setIsSaving(false);
      return;
    }

    const code = createGameCode();
    const { error: gameError } = await supabase.from("games").insert({
      quiz_id: quiz.id,
      code,
      status: "lobby"
    });

    if (gameError) {
      setError(gameError.message);
      setIsSaving(false);
      return;
    }

    router.push(`/host/${code}`);
  }

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question
      )
    );
  }

  function updateAnswer(questionIndex: number, answerIndex: number, patch: Partial<DraftAnswer>) {
    setQuestions((current) =>
      current.map((question, index) => {
        if (index !== questionIndex) return question;
        return {
          ...question,
          answers: question.answers.map((answer, innerIndex) =>
            innerIndex === answerIndex ? { ...answer, ...patch } : answer
          )
        };
      })
    );
  }

  async function downloadExcelTemplate() {
    setError("");
    try {
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.aoa_to_sheet([templateHeaders, ...templateRows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
      XLSX.writeFile(workbook, "deloitte-oscars-template.xlsx");
    } catch {
      setError("Could not create the Excel template. Use the CSV template instead.");
    }
  }

  async function readQuestionRows(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "xlsx" || extension === "xls") {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json<string[]>(firstSheet, {
        header: 1,
        blankrows: false,
        defval: ""
      });
    }

    const text = await file.text();
    return parseCsv(text);
  }

  async function importQuestionsFile(file: File) {
    setError("");
    const rows = (await readQuestionRows(file)).filter((row) =>
      row.some((cell) => String(cell).trim())
    );
    if (rows.length < 2) {
      setError("Upload an Excel or CSV file with a header row and at least one question row.");
      return;
    }

    const header = rows[0].map((cell) => String(cell).trim().toLowerCase());
    const questionIndex = header.indexOf("question");
    const correctIndex = header.indexOf("correct answer");
    const timeIndex = header.indexOf("time limit seconds");
    const backgroundIndex = header.indexOf("background image url");
    const answerIndexes = Array.from({ length: 10 }, (_, index) =>
      header.indexOf(`answer ${index + 1}`)
    );

    if (questionIndex === -1 || correctIndex === -1 || answerIndexes.every((index) => index === -1)) {
      setError("Template columns must include Question, Correct Answer, and Answer 1..10.");
      return;
    }

    const imported = rows.slice(1).map((row) => {
      const prompt = String(row[questionIndex] || "").trim();
      const correct = String(row[correctIndex] || "").trim().toLowerCase();
      const answerLabels = answerIndexes
        .filter((index) => index !== -1)
        .map((index) => String(row[index] || "").trim())
        .filter(Boolean)
        .slice(0, 10);
      const timeLimitSeconds = Math.min(
        120,
        Math.max(5, Number(String(row[timeIndex] || "").trim() || 20) || 20)
      );
      const backgroundImageUrl =
        backgroundIndex === -1 ? "" : String(row[backgroundIndex] || "").trim();

      return {
        prompt,
        backgroundImageUrl,
        timeLimitSeconds,
        answers: answerLabels.map((label) => ({
          label,
          isCorrect: label.trim().toLowerCase() === correct
        }))
      };
    });

    const valid = imported.filter(
      (question) =>
        question.prompt &&
        question.answers.length >= 2 &&
        question.answers.some((answer) => answer.isCorrect)
    );

    if (!valid.length) {
      setError("No valid questions found. Make sure Correct Answer exactly matches one answer.");
      return;
    }

    setQuestions(valid);
    setDesignReview(true);
  }

  return (
    <main className="min-h-screen bg-fog px-4 py-6">
      <form onSubmit={saveGame} className="mx-auto max-w-5xl">
        <div className="rounded-[28px] bg-ink p-6 text-white shadow-soft sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-deloitteGreen">
            Create
          </p>
          <h1 className="mt-2 text-4xl font-black sm:text-6xl">Build the game</h1>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-6 h-14 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-xl font-black outline-none placeholder:text-white/40"
            placeholder="Game title"
          />
        </div>

        <div className="mt-5 grid gap-5">
          <section className="rounded-[24px] bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black">Import from Excel</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Download the template, fill it in Excel, then upload it here. After upload,
                  review backgrounds and styling before creating the game.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 font-black text-ink"
              >
                <Download size={18} />
                Download template
              </button>
            </div>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv)}`}
              download="deloitte-oscars-template.csv"
              className="mt-3 inline-flex text-sm font-black text-slate-500 underline"
            >
              Download CSV fallback
            </a>
            <label className="mt-4 flex min-h-16 cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center font-black text-slate-600">
              <FileUp size={20} />
              Upload completed Excel or CSV
              <input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) importQuestionsFile(file);
                }}
              />
            </label>
          </section>

          {designReview && (
            <section className="rounded-[24px] border-2 border-deloitteGreen bg-white p-5 shadow-soft">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-deloitteGreen">
                Design review
              </p>
              <h2 className="mt-1 text-2xl font-black">Review imported questions</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Add or replace background image URLs, tune timers, then create the game.
              </p>
            </section>
          )}

          {questions.map((question, questionIndex) => (
            <section key={questionIndex} className="rounded-[24px] bg-white p-5 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black">Question {questionIndex + 1}</h2>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setQuestions((current) =>
                        current.filter((_, index) => index !== questionIndex)
                      )
                    }
                    className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600"
                    aria-label="Remove question"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <textarea
                value={question.prompt}
                onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })}
                className="mt-4 min-h-24 w-full rounded-2xl border-2 border-slate-200 p-4 text-lg font-bold outline-none focus:border-deloitteGreen"
                placeholder="Ask a question..."
              />
              <label className="mt-3 block text-sm font-bold text-slate-500">
                Background image URL
                <input
                  value={question.backgroundImageUrl}
                  onChange={(event) =>
                    updateQuestion(questionIndex, { backgroundImageUrl: event.target.value })
                  }
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-ink"
                  placeholder="https://..."
                />
              </label>
              {question.backgroundImageUrl && (
                <div
                  className="mt-3 min-h-44 rounded-2xl bg-cover bg-center p-4 text-white shadow-inner"
                  style={{
                    backgroundImage: `linear-gradient(rgba(0,0,0,.34), rgba(0,0,0,.34)), url(${question.backgroundImageUrl})`
                  }}
                >
                  <p className="text-sm font-black uppercase tracking-[0.16em]">Preview</p>
                  <p className="mt-12 text-2xl font-black">
                    {question.prompt || "Question preview"}
                  </p>
                </div>
              )}
              <label className="mt-3 block text-sm font-bold text-slate-500">
                Time limit
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={question.timeLimitSeconds}
                  onChange={(event) =>
                    updateQuestion(questionIndex, {
                      timeLimitSeconds: Number(event.target.value)
                    })
                  }
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-ink"
                />
              </label>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {question.answers.map((answer, answerIndex) => (
                  <label
                    key={answerIndex}
                    className="rounded-2xl border-2 border-slate-100 p-3"
                  >
                    <span className="mb-2 block text-xs font-black uppercase text-slate-400">
                      Answer {answerIndex + 1}
                    </span>
                    <input
                      value={answer.label}
                      onChange={(event) =>
                        updateAnswer(questionIndex, answerIndex, { label: event.target.value })
                      }
                      className="h-12 w-full rounded-xl bg-slate-50 px-3 font-bold outline-none"
                      placeholder="Option text"
                    />
                    <label className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={answer.isCorrect}
                        onChange={(event) =>
                          updateAnswer(questionIndex, answerIndex, {
                            isCorrect: event.target.checked
                          })
                        }
                      />
                      Correct answer
                    </label>
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>

        {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}

        <div className="sticky bottom-0 mt-5 flex flex-col gap-3 border-t border-slate-200 bg-fog/90 py-4 backdrop-blur sm:flex-row">
          <button
            type="button"
            onClick={() => setQuestions((current) => [...current, blankQuestion()])}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white px-5 font-black shadow"
          >
            <Plus size={20} />
            Add question
          </button>
          <button
            disabled={isSaving}
            className="h-14 flex-1 rounded-2xl bg-deloitteGreen px-5 text-lg font-black text-ink disabled:opacity-60"
          >
            {isSaving ? "Creating..." : "Create and host"}
          </button>
        </div>
      </form>
    </main>
  );
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}
