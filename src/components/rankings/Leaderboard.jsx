import React from "react";
import { Crown } from "lucide-react";
import PlayerRow from "./PlayerRow";

export default function Leaderboard({ players, matches, snapshots = [], tournaments = [], onSelectPlayer }) {
  // Player ids linked to a tournament win. Older tournaments (created before
  // entries were tied to player records) only have a winner_name string, so
  // fall back to matching that name against the player list.
  const winnerIds = new Set(tournaments.flatMap((t) => t.winner_player_ids || []));
  const winnerNamesWithoutIds = new Set(
    tournaments
      .filter((t) => !t.winner_player_ids || t.winner_player_ids.length === 0)
      .flatMap((t) => (t.winner_name ? t.winner_name.split(" & ") : []))
      .map((name) => name.trim().toLowerCase())
  );

  // Derive wins/losses from match history to avoid stale stored values
  const enrichedPlayers = players.map((p) => {
    const wins = matches.filter((m) => m.winner_id === p.id).length;
    const losses = matches.filter((m) => m.loser_id === p.id).length;
    const hasWonTournament =
      winnerIds.has(p.id) || winnerNamesWithoutIds.has((p.name || "").trim().toLowerCase());
    return { ...p, wins, losses, hasWonTournament };
  });

  const sorted = [...enrichedPlayers].sort((a, b) => (b.elo || 1200) - (a.elo || 1200));

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Crown className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">No players yet</p>
        <p className="text-sm text-muted-foreground mt-1">Add players to start the rankings</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((player, i) => (
        <PlayerRow
          key={player.id}
          player={player}
          rank={i + 1}
          index={i}
          onClick={() => onSelectPlayer?.(player.id)}
        />
      ))}
    </div>
  );
}
