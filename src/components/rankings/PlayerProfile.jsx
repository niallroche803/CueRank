import React from "react";
import { X, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function PlayerProfile({ player, matches, onClose }) {
  const playerMatches = matches
    .filter((m) => m.winner_id === player.id || m.loser_id === player.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Derive from match history — avoids stale stored player fields
  const derivedWins = playerMatches.filter((m) => m.winner_id === player.id).length;
  const derivedLosses = playerMatches.filter((m) => m.loser_id === player.id).length;
  const winRate = derivedWins + derivedLosses > 0
    ? Math.round((derivedWins / (derivedWins + derivedLosses)) * 100)
    : 0;

  const streak = player.streak || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-lg">{player.name}</h2>
            <p className="text-xs text-muted-foreground">{player.elo || 1200} ELO</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 px-5 py-4 border-b border-border">
          <StatBox label="Wins" value={derivedWins} color="text-primary" />
          <StatBox label="Losses" value={derivedLosses} color="text-destructive" />
          <StatBox label="Win %" value={`${winRate}%`} color="text-foreground" />
          <StatBox
            label="Streak"
            value={
              streak > 0 ? `+${streak}` : streak < 0 ? `${streak}` : "—"
            }
            color={streak > 0 ? "text-primary" : streak < 0 ? "text-destructive" : "text-muted-foreground"}
          />
        </div>

        {/* Match history */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-3">Match History</p>
          {playerMatches.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6">No matches yet</p>
          ) : (
            playerMatches.map((m) => {
              const won = m.winner_id === player.id;
              const opponent = won ? m.loser_name : m.winner_name;
              const eloChange = won ? m.winner_elo_change : m.loser_elo_change;
              return (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${won ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                    {won ? "W" : "L"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {won ? "beat" : "lost to"} <span className="font-semibold">{opponent}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(m.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${won ? "text-primary" : "text-destructive"}`}>
                    {won ? `+${eloChange}` : `${eloChange}`}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="bg-muted rounded-lg px-2 py-2 text-center">
      <p className={`font-display text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">{label}</p>
    </div>
  );
}