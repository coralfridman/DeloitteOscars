"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AnswerButton } from "@/components/AnswerButton";
import { normalizeGameCode } from "@/lib/game-code";
import { supabase } from "@/lib/supabase";
import { Answer, Game, Player, QuestionWithAnswers } from "@/lib/types";

export default function PlayerPage() {
  const params = useParams<{ gameCode: string }>();
  const gameCode = normalizeGameCode(params.gameCode);
  const [game, setGame] = useState<Game | null>(null);
  const [question, setQuestion] = useState<QuestionWithAnswers | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [name, setName] = useState("");
  const [hasAnswered, setHasAnswered] = useState(false);
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
        (payload) => {
          setGame(payload.new as Game);
          setHasAnswered(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameCode]);

  useEffect(() => {
    async function loadQuestion() {
      if (!game?.current_question_id) {
        setQuestion(null);
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
  }, [game?.current_question_id]);

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
      return;
    }
    setHasAnswered(true);
  }

  if (!game) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fog p-4">
        <div className="rounded-[28px] bg-white p-7 text-center shadow-soft">
          <h1 className="text-3xl font-black">Game not found</h1>
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
            Join
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
        </section>
      </main>
    );
  }

  if (game.status === "finished") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fog px-4 py-8">
        <section className="w-full max-w-xl rounded-[28px] bg-white p-7 text-center shadow-soft">
          <h1 className="text-5xl font-black">Game over</h1>
          <p className="mt-3 text-2xl font-black text-deloitteGreen">{player.score} points</p>
        </section>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fog p-4">
        <p className="text-xl font-black">Waiting for the next question...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-fog px-4 py-5">
      <section className="mx-auto max-w-4xl">
        <div
          className="rounded-[28px] bg-ink bg-cover bg-center p-5 text-white shadow-soft sm:p-7"
          style={
            question.background_image_url
              ? {
                  backgroundImage: `linear-gradient(rgba(22,24,33,.72), rgba(22,24,33,.72)), url(${question.background_image_url})`
                }
              : undefined
          }
        >
          <p className="text-sm font-black uppercase tracking-[0.18em] text-deloitteGreen">
            {player.name} · {player.score} points
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
            {question.prompt}
          </h1>
        </div>

        {hasAnswered ? (
          <div className="mt-5 rounded-[28px] bg-white p-7 text-center shadow-soft">
            <h2 className="text-4xl font-black">Answer locked</h2>
            <p className="mt-2 text-slate-500">Waiting for the host...</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
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

        {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
      </section>
    </main>
  );
}
