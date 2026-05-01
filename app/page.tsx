import Link from "next/link";
import { Gamepad2, Plus } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-fog px-4 py-6">
      <section className="mx-auto flex min-h-[calc(100vh-48px)] max-w-5xl flex-col justify-center">
        <div className="rounded-[28px] bg-ink p-7 text-white shadow-soft sm:p-10">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-deloitteGreen">
            Deloitte Oscars
          </p>
          <h1 className="max-w-3xl text-5xl font-black leading-none sm:text-7xl">
            Run a live poll game.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/75">
            Create multi-question polls, share a PIN or QR code, and let players answer with
            colorful Kahoot-style buttons in real time.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/create"
              className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-deloitteGreen px-5 text-lg font-black text-ink transition hover:brightness-105"
            >
              <Plus size={24} />
              Create poll game
            </Link>
            <Link
              href="/join"
              className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-white px-5 text-lg font-black text-ink transition hover:bg-white/90"
            >
              <Gamepad2 size={24} />
              Join with PIN
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
