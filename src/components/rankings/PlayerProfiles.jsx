import React, { useState } from "react";
import { ChevronDown, TrendingUp, TrendingDown, Crown } from "lucide-react";
import { format, isValid } from "date-fns";
import EloHistoryChart from "./EloHistoryChart";

export default function PlayerProfiles({ players, matches, snapshots = [], tournaments = [], selectedId: selectedIdProp, onSelectId }) {
  const [internalSelectedId, setInternalSelectedId] = useState("");
  const selectedId = selectedIdProp !== undefined ? selectedIdProp : internalSelectedId;
  const setSelectedId = onSelectId || setInternalSelectedId;

  const sorted = [...players].sort((a, b) => (b.elo || 1200) - (a.elo || 1200));
  const player = players.find((p) => p.id === selectedId);

  // Prefer matching by player id (set for tournaments created after entries were
  // tied to player records); fall back to name matching for older tournaments
  // that only stored a winner_name string (2v2 wins are "Alice & Bob" team names).
  const wonTournaments = player
    ? tournaments
        .filter((t) => {
          if (t.winner_player_ids && t.winner_player_ids.length > 0) {
            return t.winner_player_ids.includes(player.id);
          }
          return (t.winner_name || "")
            .split(" & ")
            .map((name) => name.trim().toLowerCase())
            .includes((player.name || "").trim().toLowerCase());
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  const playerMatches = player
    ? matches
        .filter((m) => m.winner_id === player.id || m.loser_id === player.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];

  // Derive wins/losses from match history (source of truth, avoids stale player fields)
  const derivedWins = playerMatches.filter((m) => m.winner_id === player?.id).length;
  const derivedLosses = playerMatches.filter((m) => m.loser_id === player?.id).length;

  // Head-to-head records vs each opponent
  const h2h = {};
  for (const m of playerMatches) {
    const won = m.winner_id === player?.id;
    const opponentName = won ? m.loser_name : m.winner_name;
    if (!opponentName) continue;
    if (!h2h[opponentName]) h2h[opponentName] = { wins: 0, losses: 0 };
    if (won) h2h[opponentName].wins++;
    else h2h[opponentName].losses++;
  }
  const h2hEntries = Object.entries(h2h).sort(
    (a, b) => (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses)
  );

  const winRate =
    derivedWins + derivedLosses > 0
      ? Math.round((derivedWins / (derivedWins + derivedLosses)) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Player selector */}
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full appearance-none bg-card border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 pr-10"
        >
          <option value="">Select a player…</option>
          {sorted.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.elo || 1200} ELO
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      {player && (
        <>
          {/* ELO history chart */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-3">ELO History</p>
            <EloHistoryChart player={player} snapshots={snapshots} />
          </div>

          {/* All-time record */}
          <div className="grid grid-cols-4 gap-2">
            <StatBox label="ELO" value={player.elo || 1200} color="text-foreground" />
            <StatBox label="Wins" value={derivedWins} color="text-primary" />
            <StatBox label="Losses" value={derivedLosses} color="text-destructive" />
            <StatBox label="Win %" value={`${winRate}%`} color="text-foreground" />
          </div>

          {/* Tournaments won */}
          {wonTournaments.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Tournaments Won
              </p>
              <div className="space-y-2">
                {wonTournaments.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
                      <Crown className="w-3.5 h-3.5 text-yellow-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {isValid(new Date(t.created_at)) ? format(new Date(t.created_at), "MMM d, yyyy") : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Head-to-head */}
          {h2hEntries.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                Head-to-Head
              </p>
              <div className="space-y-2">
                {h2hEntries.map(([name, record]) => {
                  const total = record.wins + record.losses;
                  const pct = Math.round((record.wins / total) * 100);
                  return (
                    <div key={name} className="bg-card border border-border rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-sm">{name}</span>
                        <span className="text-xs text-muted-foreground">
                          <span className="text-primary font-bold">{record.wins}W</span>
                          {" – "}
                          <span className="text-destructive font-bold">{record.losses}L</span>
                          {" · "}{pct}%
                        </span>
                      </div>
                      {/* Win bar */}
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Match history */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Match History ({playerMatches.length})
            </p>
            {playerMatches.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No matches yet</p>
            ) : (
              <div className="space-y-2">
                {playerMatches.map((m) => {
                  const won = m.winner_id === player.id;
                  const opponent = won ? m.loser_name : m.winner_name;
                  const eloChange = won ? m.winner_elo_change : m.loser_elo_change;
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${won ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        {won ? "W" : "L"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {won ? "Beat " : "Lost to "}<span className="font-semibold">{opponent}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(m.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1 shrink-0 text-xs font-bold ${won ? "text-primary" : "text-destructive"}`}>
                        {won ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {won ? `+${eloChange}` : `${eloChange}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <p className={`font-display text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">{label}</p>
    </div>
  );
}