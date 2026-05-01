"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronRight, Eye, Play, Square } from "lucide-react";
import { Leaderboard } from "@/components/Leaderboard";
import { normalizeGameCode } from "@/lib/game-code";
import { supabase } from "@/lib/supabase";
import { Answer, Game, Player, QuestionWithAnswers, Submission, answerStyles, shapeIcon } from "@/lib/types";
import clsx from "clsx";
import { useParams, useSearchParams } from "next/navigation";

export default function HostPage() {
  const params = useParams<{ gameCode: string }>();
  const searchParams = useSearchParams();
  const gameCode = normalizeGameCode(params.gameCode);
  const hostToken = searchParams.get("token") || "";
  const [game, setGame] = useState<Game | null>(null);
  const [questions, setQuestions] = useState<QuestionWithAnswers[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState("");
  const participantUrl = useMemo(() => {
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
  const nextQuestion = currentIndex === -1 ? questions[0] : questions[currentIndex + 1];
  const currentSubmissions = submissions.filter(
    (submission) => submission.question_id === currentQuestion?.id
  );
  const uniqueVotes = new Set(currentSubmissions.map((submission) => submission.player_id)).size;

  async function copyParticipantLink() {
    await navigator.clipboard.writeText(participantUrl);
  }

  async function openQuestion(question: QuestionWithAnswers | undefined) {
    if (!question) return;
    setError("");
    const { error: rpcError } = await supabase.rpc("open_question", {
      p_game_code: gameCode,
      p_host_token: hostToken,
      p_question_id: question.id
    });
    if (rpcError) setError(rpcError.message);
  }

  async function revealQuestion() {
    setError("");
    const { error: rpcError } = await supabase.rpc("reveal_question", {
      p_game_code: gameCode,
      p_host_token: hostToken
    });
    if (rpcError) setError(rpcError.message);
  }

  async function finishGame() {
    setError("");
    const { error: rpcError } = await supabase.rpc("finish_game", {
      p_game_code: gameCode,
      p_host_token: hostToken
    });
    if (rpcError) setError(rpcError.message);
  }

  if (!hostToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fog p-4">
        <div className="rounded-[28px] bg-white p-7 text-center shadow-soft">
          <h1 className="text-3xl font-black">Private host link required</h1>
          <p className="mt-2 text-slate-500">Open the host control link created with this poll game.</p>
        </div>
      </main>
    );
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
      <section className="mx-auto grid max-w-3xl gap-5">
        <div className="rounded-[28px] bg-ink p-6 text-white shadow-soft">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-deloitteGreen">
            Host controls
          </p>
          <h1 className="mt-2 text-5xl font-black tracking-[0.12em]">{game.code}</h1>
          <p className="mt-3 break-all text-sm text-white/70">{participantUrl}</p>
          <button
            onClick={copyParticipantLink}
            className="mt-4 h-12 w-full rounded-2xl bg-white font-black text-ink"
          >
            Copy participant link
          </button>
        </div>

        {game.status === "lobby" && (
          <ControlCard
            title="Lobby"
            detail={`${players.length} player${players.length === 1 ? "" : "s"} joined`}
          >
            <button
              onClick={() => openQuestion(nextQuestion)}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-deloitteGreen font-black text-ink"
            >
              <Play size={20} />
              Open first poll
            </button>
          </ControlCard>
        )}

        {game.status === "voting" && currentQuestion && (
          <QuestionCard question={currentQuestion} index={currentIndex} total={questions.length}>
            <p className="text-lg font-black text-slate-600">
              {uniqueVotes} / {players.length} voted
            </p>
            <div className="mt-5 grid gap-3">
              <button
                onClick={revealQuestion}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-deloitteGreen font-black text-ink"
              >
                <Eye size={20} />
                Reveal results
              </button>
              <button
                onClick={finishGame}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-black text-ink ring-1 ring-slate-200"
              >
                <Square size={18} />
                End poll game
              </button>
            </div>
          </QuestionCard>
        )}

        {game.status === "revealed" && currentQuestion && (
          <QuestionCard question={currentQuestion} index={currentIndex} total={questions.length}>
            <Results answers={currentQuestion.answers} submissions={currentSubmissions} />
            <div className="mt-5 grid gap-3">
              {nextQuestion ? (
                <button
                  onClick={() => openQuestion(nextQuestion)}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink font-black text-white"
                >
                  Open next poll
                  <ChevronRight size={22} />
                </button>
              ) : (
                <button
                  onClick={finishGame}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink font-black text-white"
                >
                  Finish poll game
                  <ChevronRight size={22} />
                </button>
              )}
            </div>
          </QuestionCard>
        )}

        {game.status === "finished" && (
          <ControlCard title="Finished" detail="Final participation summary">
            <Leaderboard players={players} />
          </ControlCard>
        )}

        {game.status !== "finished" && <Leaderboard players={players} />}
        {error && <p className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
      </section>
    </main>
  );
}

function ControlCard({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] bg-white p-6 shadow-soft">
      <h2 className="text-4xl font-black">{title}</h2>
      <p className="mt-2 text-slate-500">{detail}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  total,
  children
}: {
  question: QuestionWithAnswers;
  index: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[28px] bg-white bg-cover bg-center p-6 shadow-soft"
      style={
        question.background_image_url
          ? {
              backgroundImage: `linear-gradient(rgba(255,255,255,.9), rgba(255,255,255,.9)), url(${question.background_image_url})`
            }
          : undefined
      }
    >
      <p className="font-black text-deloitteGreen">
        Question {index + 1} / {total}
      </p>
      <h1 className="mt-3 text-4xl font-black leading-tight">{question.prompt}</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Results({ answers, submissions }: { answers: Answer[]; submissions: Submission[] }) {
  const total = submissions.length;

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 font-black text-slate-600">
        <BarChart3 size={18} />
        {total} total vote{total === 1 ? "" : "s"}
      </div>
      {answers.map((answer) => {
        const count = submissions.filter((submission) => submission.answer_id === answer.id).length;
        const percent = total ? Math.round((count / total) * 100) : 0;
        return (
          <div key={answer.id} className="rounded-2xl bg-slate-50 p-4">
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
            </p>
          </div>
        );
      })}
    </div>
  );
}
