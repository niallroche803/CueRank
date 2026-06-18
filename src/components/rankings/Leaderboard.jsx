import React, { useState } from "react";
import { Crown } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import PlayerRow from "./PlayerRow";
import PlayerProfile from "./PlayerProfile";
import RankHistory from "./RankHistory";

export default function Leaderboard({ players, matches, snapshots = [] }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Derive wins/losses from match history to avoid stale stored values
  const enrichedPlayers = players.map((p) => {
    const wins = matches.filter((m) => m.winner_id === p.id).length;
    const losses = matches.filter((m) => m.loser_id === p.id).length;
    return { ...p, wins, losses };
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
    <>
      <div className="space-y-2">
        {sorted.map((player, i) => (
          <PlayerRow
            key={player.id}
            player={player}
            rank={i + 1}
            index={i}
            onClick={() => setSelectedPlayer(enrichedPlayers.find((p) => p.id === player.id) || player)}
          />
        ))}
      </div>



      <AnimatePresence>
        {selectedPlayer && (
          <PlayerProfile
            player={selectedPlayer}
            matches={matches || []}
            onClose={() => setSelectedPlayer(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}