"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeGameCode } from "@/lib/game-code";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeGameCode(code);
    if (normalized) router.push(`/${normalized}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-fog px-4 py-8">
      <form onSubmit={submit} className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-deloitteGreen">
          Deloitte Oscars
        </p>
        <h1 className="mt-2 text-4xl font-black">Join the poll game</h1>
        <p className="mt-2 text-slate-500">Enter the PIN shared by the host.</p>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="GAME PIN"
          className="mt-7 h-16 w-full rounded-2xl border-2 border-slate-200 px-5 text-center text-3xl font-black uppercase tracking-[0.2em] outline-none focus:border-deloitteGreen"
        />
        <button className="mt-4 h-14 w-full rounded-2xl bg-ink text-lg font-black text-white">
          Enter
        </button>
      </form>
    </main>
  );
}
