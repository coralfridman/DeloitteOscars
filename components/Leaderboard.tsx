import { Player } from "@/lib/types";

export function Leaderboard({ players }: { players: Player[] }) {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.joined_at.localeCompare(b.joined_at));

  return (
    <div className="rounded-[24px] bg-white p-5 shadow-soft">
      <h2 className="text-2xl font-black">Participation Board</h2>
      <p className="mt-1 text-sm font-bold text-slate-500">100 points for each poll vote.</p>
      <div className="mt-4 grid gap-2">
        {sorted.length === 0 && <p className="text-slate-500">Waiting for players...</p>}
        {sorted.map((player, index) => (
          <div
            key={player.id}
            className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink font-black text-white">
                {index + 1}
              </span>
              <span className="font-black">{player.name}</span>
            </div>
            <span className="font-black text-deloitteGreen">{player.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
