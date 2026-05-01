"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Play, Square } from "lucide-react";
import { Leaderboard } from "@/components/Leaderboard";
import { QRCode } from "@/components/QRCode";
import { normalizeGameCode } from "@/lib/game-code";
import { supabase } from "@/lib/supabase";
import { Answer, Game, Player, QuestionWithAnswers, Submission, answerStyles, shapeIcon } from "@/lib/types";
import clsx from "clsx";
import { useParams } from "next/navigation";

export default function HostPage() {
  const params = useParams<{ gameCode: string }>();
  const gameCode = normalizeGameCode(params.gameCode);
  const [game, setGame] = useState<Game | null>(null);
  const [questions, setQuestions] = useState<QuestionWithAnswers[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/${gameCode}`;
  }, [gameCode]);

  useEffect(() => {
    async function load() {
      const { data: gameRow } = await supabase
        .from("games")
        .select("*")
        .eq("code", gameCode)
        .single();
      if (!gameRow) return;
      setGame(gameRow as Game);

      const [{ data: questionRows }, { data: playerRows }, { data: submissionRows }] =
        await Promise.all([
          supabase
            .from("questions")
            .select("*, answers(*)")
            .eq("poll_id", gameRow.poll_id)
            .order("position"),
          supabase.from("players").select("*").eq("game_id", gameRow.id).order("score", { ascending: false }),
          supabase.from("submissions").select("*").eq("game_id", gameRow.id)
        ]);

      setQuestions((questionRows || []) as QuestionWithAnswers[]);
      setPlayers((playerRows || []) as Player[]);
      setSubmissions((submissionRows || []) as Submission[]);
    }

    load();
  }, [gameCode]);

  useEffect(() => {
    if (!game?.id) return;
    const channel = supabase
      .channel(`host-${game.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${game.id}` },
        (payload) => setGame(payload.new as Game)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `game_id=eq.${game.id}` },
        async () => {
          const { data } = await supabase
            .from("players")
            .select("*")
            .eq("game_id", game.id)
            .order("score", { ascending: false });
          setPlayers((data || []) as Player[]);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions", filter: `game_id=eq.${game.id}` },
        async () => {
          const { data } = await supabase.from("submissions").select("*").eq("game_id", game.id);
          setSubmissions((data || []) as Submission[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [game?.id]);

  const currentQuestion = questions.find((question) => question.id === game?.current_question_id);
  const currentIndex = currentQuestion ? questions.findIndex((question) => question.id === currentQuestion.id) : -1;
  const currentSubmissions = submissions.filter(
    (submission) => submission.question_id === currentQuestion?.id
  );

  async function startGame() {
    if (!game || questions.length === 0) return;
    await supabase
      .from("games")
      .update({
        status: "live",
        current_question_id: questions[0].id,
        question_started_at: new Date().toISOString()
      })
      .eq("id", game.id);
  }

  async function nextQuestion() {
    if (!game) return;
    const next = questions[currentIndex + 1];
    if (!next) {
      await supabase.from("games").update({ status: "finished" }).eq("id", game.id);
      return;
    }
    await supabase
      .from("games")
      .update({
        status: "live",
        current_question_id: next.id,
        question_started_at: new Date().toISOString()
      })
      .eq("id", game.id);
  }

  async function finishGame() {
    if (!game) return;
    await supabase.from("games").update({ status: "finished" }).eq("id", game.id);
  }

  if (!game) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fog p-4">
        <div className="rounded-[28px] bg-white p-7 text-center shadow-soft">
          <h1 className="text-3xl font-black">Host screen not found</h1>
          <Link href="/create" className="mt-4 inline-block font-black text-deloitteGreen">
            Create a poll game
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-fog px-4 py-5">
      <section className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-5">
          <div className="rounded-[28px] bg-ink p-6 text-white shadow-soft">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-deloitteGreen">
                  Join at
                </p>
                <p className="mt-2 text-6xl font-black tracking-[0.18em] sm:text-8xl">
                  {game.code}
                </p>
              </div>
              <QRCode value={joinUrl} />
            </div>
          </div>

          {game.status === "lobby" && (
            <div className="rounded-[28px] bg-white p-7 shadow-soft">
              <h1 className="text-4xl font-black sm:text-6xl">Lobby</h1>
              <p className="mt-2 text-lg text-slate-500">Players can join now. Start when ready.</p>
              <button
                onClick={startGame}
                className="mt-6 flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-deloitteGreen text-xl font-black text-ink sm:w-72"
              >
                <Play size={24} />
                Start game
              </button>
            </div>
          )}

          {game.status === "live" && currentQuestion && (
            <div
              className="rounded-[28px] bg-white bg-cover bg-center p-6 shadow-soft"
              style={
                currentQuestion.background_image_url
                  ? {
                      backgroundImage: `linear-gradient(rgba(255,255,255,.9), rgba(255,255,255,.9)), url(${currentQuestion.background_image_url})`
                    }
                  : undefined
              }
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-black text-deloitteGreen">
                  Question {currentIndex + 1} / {questions.length}
                </p>
                <p className="font-bold text-slate-500">
                  {currentSubmissions.length} / {players.length} answered
                </p>
              </div>
              <h1 className="mt-4 text-4xl font-black leading-tight sm:text-6xl">
                {currentQuestion.prompt}
              </h1>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {currentQuestion.answers.map((answer) => (
                  <HostAnswerTile
                    key={answer.id}
                    answer={answer}
                    count={currentSubmissions.filter((submission) => submission.answer_id === answer.id).length}
                  />
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={nextQuestion}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink font-black text-white"
                >
                  {currentIndex === questions.length - 1 ? "Show final leaderboard" : "Next question"}
                  <ChevronRight size={22} />
                </button>
                <button
                  onClick={finishGame}
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white px-5 font-black text-ink ring-1 ring-slate-200"
                >
                  <Square size={18} />
                  End
                </button>
              </div>
            </div>
          )}

          {game.status === "finished" && (
            <div className="rounded-[28px] bg-white p-7 text-center shadow-soft">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-deloitteGreen">
                Final
              </p>
              <h1 className="mt-2 text-5xl font-black sm:text-7xl">Winners</h1>
            </div>
          )}
        </div>

        <Leaderboard players={players} />
      </section>
    </main>
  );
}

function HostAnswerTile({ answer, count }: { answer: Answer; count: number }) {
  return (
    <div className={clsx("rounded-[24px] p-5 text-white shadow-soft", answerStyles[answer.color])}>
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-3xl">
          {shapeIcon[answer.shape]}
        </span>
        <span className="text-4xl font-black">{count}</span>
      </div>
      <p className="mt-4 text-2xl font-black">{answer.label}</p>
    </div>
  );
}
