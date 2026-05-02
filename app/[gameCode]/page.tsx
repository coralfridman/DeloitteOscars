"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import clsx from "clsx";
import { BarChart3 } from "lucide-react";
import { AnswerButton } from "@/components/AnswerButton";
import { FinalResults } from "@/components/FinalResults";
import { normalizeGameCode } from "@/lib/game-code";
import { supabase } from "@/lib/supabase";
import { Answer, Game, Player, QuestionWithAnswers, Submission, answerStyles, shapeIcon } from "@/lib/types";

export default function PlayerPage() {
  const params = useParams<{ gameCode: string }>();
  const gameCode = normalizeGameCode(params.gameCode);
  const [game, setGame] = useState<Game | null>(null);
  const [question, setQuestion] = useState<QuestionWithAnswers | null>(null);
  const [questions, setQuestions] = useState<QuestionWithAnswers[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);

  useEffect(() => {
    async function loadGame() {
      const { data: gameRow } = await supabase
        .from("games")
        .select("*")
        .eq("code", gameCode)
        .single();
      if (gameRow) setGame(gameRow as Game);
    }

    loadGame();
    const channel = supabase
      .channel(`player-game-${gameCode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `code=eq.${gameCode}` },
        (payload) => setGame(payload.new as Game)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameCode]);

  useEffect(() => {
    async function loadQuestions() {
      if (!game?.poll_id) return;
      const { data } = await supabase
        .from("questions")
        .select("*, answers(*)")
        .eq("poll_id", game.poll_id)
        .order("position");
      setQuestions((data || []) as QuestionWithAnswers[]);
    }

    loadQuestions();
  }, [game?.poll_id]);

  useEffect(() => {
    async function loadQuestion() {
      if (!game?.current_question_id) {
        setQuestion(null);
        return;
      }
      const knownQuestion = questions.find((row) => row.id === game.current_question_id);
      if (knownQuestion) {
        setQuestion(knownQuestion);
        return;
      }
      const { data: questionRow } = await supabase
        .from("questions")
        .select("*, answers(*)")
        .eq("id", game.current_question_id)
        .single();
      setQuestion(questionRow as QuestionWithAnswers);
    }

    loadQuestion();
  }, [game?.current_question_id, questions]);

  useEffect(() => {
    if (!game?.id) return;
    const gameId = game.id;

    async function refreshPlayers() {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("game_id", gameId)
        .order("score", { ascending: false });
      const rows = (data || []) as Player[];
      setPlayers(rows);
      setPlayer((current) => rows.find((row) => row.id === current?.id) || current);
    }

    async function refreshSubmissions() {
      const { data } = await supabase.from("submissions").select("*").eq("game_id", gameId);
      setSubmissions((data || []) as Submission[]);
    }

    refreshPlayers();
    refreshSubmissions();

    const channel = supabase
      .channel(`player-room-${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `game_id=eq.${gameId}` },
        refreshPlayers
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions", filter: `game_id=eq.${gameId}` },
        refreshSubmissions
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id]);

  async function join(event: FormEvent) {
    event.preventDefault();
    if (!game || !name.trim()) return;
    setIsJoining(true);
    setError("");

    const { data, error: joinError } = await supabase
      .from("players")
      .insert({ game_id: game.id, name: name.trim() })
      .select("*")
      .single();

    setIsJoining(false);
    if (joinError) {
      setError(joinError.message);
      return;
    }
    setPlayer(data as Player);
  }

  async function submitAnswer(selected: Answer) {
    if (!game || !player || !question || isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    const { error: submitError } = await supabase.rpc("submit_answer", {
      p_game_id: game.id,
      p_player_id: player.id,
      p_question_id: question.id,
      p_answer_id: selected.id
    });
    setIsSubmitting(false);
    if (submitError) {
      setError(submitError.message);
    }
  }

  if (!game) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fog p-4">
        <div className="rounded-[28px] bg-white p-7 text-center shadow-soft">
          <h1 className="text-3xl font-black">Poll game not found</h1>
          <p className="mt-2 text-slate-500">Check the PIN and try again.</p>
        </div>
      </main>
    );
  }

  if (!player) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fog px-4 py-8">
        <form onSubmit={join} className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-soft">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-deloitteGreen">
            PIN {game.code}
          </p>
          <h1 className="mt-2 text-4xl font-black">Enter your name</h1>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-7 h-14 w-full rounded-2xl border-2 border-slate-200 px-4 text-xl font-black outline-none focus:border-deloitteGreen"
            placeholder="Name"
          />
          {error && <p className="mt-3 font-bold text-red-600">{error}</p>}
          <button
            disabled={isJoining}
            className="mt-4 h-14 w-full rounded-2xl bg-ink text-lg font-black text-white disabled:opacity-60"
          >
            {isJoining ? "Joining..." : "Join"}
          </button>
          <p className="mt-3 break-all text-xs text-slate-400">{joinUrl}</p>
        </form>
      </main>
    );
  }

  if (game.status === "lobby") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fog px-4 py-8">
        <section className="w-full max-w-xl rounded-[28px] bg-white p-7 text-center shadow-soft">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-deloitteGreen">
            You are in
          </p>
          <h1 className="mt-2 text-4xl font-black">Waiting for the host</h1>
          <p className="mt-3 text-lg text-slate-500">Hi {player.name}, get ready.</p>
          <p className="mt-4 font-black text-deloitteGreen">{players.length} joined</p>
        </section>
      </main>
    );
  }

  if (game.status === "finished") {
    return (
      <main className="min-h-screen bg-fog px-4 py-6">
        <section className="mx-auto max-w-xl">
          <div className="rounded-[28px] bg-ink p-6 text-white shadow-soft">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-deloitteGreen">
              Final
            </p>
            <h1 className="mt-2 text-4xl font-black">Thanks for playing</h1>
          </div>
          <div className="mt-5">
            <FinalResults questions={questions} submissions={submissions} />
          </div>
        </section>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fog p-4">
        <p className="text-xl font-black">Waiting for the next poll...</p>
      </main>
    );
  }

  const currentSubmissions = submissions.filter((submission) => submission.question_id === question.id);
  const playerSubmission = currentSubmissions.find((submission) => submission.player_id === player.id);
  const votedCount = new Set(currentSubmissions.map((submission) => submission.player_id)).size;

  return (
    <main className="min-h-screen bg-fog px-4 py-5">
      <section className="mx-auto max-w-4xl">
        <div
          className="flex min-h-72 flex-col justify-end rounded-[28px] bg-ink bg-cover bg-center p-5 text-white shadow-soft sm:min-h-80 sm:p-7"
          style={
            question.background_image_url
              ? {
                  backgroundImage: `linear-gradient(rgba(22,24,33,.68), rgba(22,24,33,.68)), url(${question.background_image_url})`
                }
              : undefined
          }
        >
          <p className="text-sm font-black uppercase tracking-[0.18em] text-deloitteGreen">
            {player.name} - {player.score} participation points
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            {question.prompt}
          </h1>
          {question.description && (
            <p className="mt-3 max-w-2xl text-base font-bold leading-relaxed text-white/85 sm:text-lg">
              {question.description}
            </p>
          )}
        </div>

        {game.status === "voting" && playerSubmission && (
          <div className="mt-4 rounded-[28px] bg-white p-7 text-center shadow-soft">
            <h2 className="text-4xl font-black">Vote locked</h2>
            <p className="mt-2 text-slate-500">Waiting for the host to reveal results.</p>
            <p className="mt-4 text-2xl font-black text-deloitteGreen">
              {votedCount} / {players.length} voted
            </p>
          </div>
        )}

        {game.status === "voting" && !playerSubmission && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {question.answers.map((answer) => (
              <AnswerButton
                key={answer.id}
                answer={answer}
                disabled={isSubmitting}
                onClick={() => submitAnswer(answer)}
              />
            ))}
          </div>
        )}

        {game.status === "revealed" && (
          <div className="mt-5 rounded-[28px] bg-white p-5 shadow-soft">
            <Results answers={question.answers} submissions={currentSubmissions} selectedAnswerId={playerSubmission?.answer_id} />
          </div>
        )}

        {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
      </section>
    </main>
  );
}

function Results({
  answers,
  submissions,
  selectedAnswerId
}: {
  answers: Answer[];
  submissions: Submission[];
  selectedAnswerId?: string;
}) {
  const total = submissions.length;

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 font-black text-slate-600">
        <BarChart3 size={18} />
        Results - {total} total vote{total === 1 ? "" : "s"}
      </div>
      {answers.map((answer) => {
        const count = submissions.filter((submission) => submission.answer_id === answer.id).length;
        const percent = total ? Math.round((count / total) * 100) : 0;
        const selected = selectedAnswerId === answer.id;
        return (
          <div key={answer.id} className={clsx("rounded-2xl p-4", selected ? "bg-deloitteGreen/10 ring-2 ring-deloitteGreen" : "bg-slate-50")}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={clsx("grid h-10 w-10 place-items-center rounded-xl text-xl text-white", answerStyles[answer.color])}>
                  {shapeIcon[answer.shape]}
                </span>
                <span className="font-black">{answer.label}</span>
              </div>
              <span className="font-black text-ink">{percent}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
              <div className={clsx("h-full rounded-full", answerStyles[answer.color])} style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 text-sm font-bold text-slate-500">
              {count} vote{count === 1 ? "" : "s"}
              {selected ? " - your vote" : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}
