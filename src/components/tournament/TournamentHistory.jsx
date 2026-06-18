import React, { useState } from "react";
import { Crown, ChevronDown } from "lucide-react";
import { format } from "date-fns";

export default function TournamentHistory({ tournaments, onView }) {
  const [selectedPlayer, setSelectedPlayer] = useState("");

  const completed = tournaments.filter((t) => t.status === "completed");

  // Gather all unique player names from completed tournaments
  const allPlayers = [...new Set(
    completed.flatMap((t) =>
      (t.rounds || []).flatMap((r) =>
        r.flatMap((m) => [m.player1, m.player2].filter(Boolean))
      )
    )
  )].sort();

  // Get all matches for a player across all completed tournaments
  function getPlayerResults(playerName) {
    const results = [];
    for (const t of completed) {
      const rounds = t.rounds || [];
      for (let ri = 0; ri < rounds.length; ri++) {
        for (const m of rounds[ri]) {
          if (!m.winner) continue;
          if (m.player1 === playerName || m.player2 === playerName) {
            const won = m.winner === playerName;
            const opponent = m.player1 === playerName ? m.player2 : m.player1;
            let roundLabel = `Round ${ri + 1}`;
            if (rounds.length > 1 && ri === rounds.length - 1) roundLabel = "Final";
            else if (rounds[ri].length === 2) roundLabel = "Semi-Final";
            results.push({ tournament: t.name, date: t.created_at, round: roundLabel, opponent, won, isBye: !opponent });
          }
        }
      }
    }
    return results;
  }

  const playerResults = selectedPlayer ? getPlayerResults(selectedPlayer) : [];
  const wins = playerResults.filter((r) => r.won && !r.isBye).length;
  const losses = playerResults.filter((r) => !r.won).length;
  const tourneysWon = completed.filter((t) => t.winner_name === selectedPlayer).length;

  return (
    <div className="space-y-6">
      {/* Completed tournaments list */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Completed Tournaments</h3>
        {completed.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No completed tournaments yet</p>
        ) : (
          <div className="space-y-2">
            {completed.map((t) => (
              <button
                key={t.id}
                onClick={() => onView(t.id)}
                className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-xl text-left hover:border-yellow-400/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
                  <Crown className="w-4 h-4 text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Winner: <span className="text-yellow-600 font-medium">{t.winner_name}</span>
                    {t.created_at && ` · ${format(new Date(t.created_at), "MMM d, yyyy")}`}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{(t.rounds || []).length} rounds</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Player history lookup */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Player History</h3>
        <div className="relative">
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="w-full appearance-none bg-card border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 pr-10"
          >
            <option value="">Select a player…</option>
            {allPlayers.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>

        {selectedPlayer && (
          <div className="mt-4 space-y-3">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="font-display text-2xl font-bold text-yellow-500">{tourneysWon}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">Won</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="font-display text-2xl font-bold text-primary">{wins}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">Match Wins</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="font-display text-2xl font-bold text-destructive">{losses}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">Losses</p>
              </div>
            </div>

            {/* Match list */}
            {playerResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tournament matches found</p>
            ) : (
              <div className="space-y-2">
                {playerResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${r.won ? "bg-primary" : "bg-destructive"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {r.isBye ? "BYE" : r.won ? `Beat ${r.opponent}` : `Lost to ${r.opponent}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.tournament} · {r.round}</p>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${r.won ? "text-primary" : "text-destructive"}`}>
                      {r.isBye ? "BYE" : r.won ? "W" : "L"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}