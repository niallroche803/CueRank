import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Crown } from "lucide-react";
import RankBadge from "./RankBadge";

export default function PlayerRow({ player, rank, index, onClick }) {
  const wins = player.wins || 0;
  const losses = player.losses || 0;
  const winRate = wins + losses > 0
    ? Math.round((wins / (wins + losses)) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-xl transition-colors cursor-pointer hover:border-primary/40 ${
        rank <= 3 ? "bg-primary/5 border border-primary/10" : "bg-card border border-border"
      }`}
    >
      <RankBadge rank={rank} />

      <div className="flex-1 min-w-0">
        <p className="font-heading font-semibold text-foreground truncate flex items-center gap-1.5">
          <span className="truncate">{player.name}</span>
          {player.hasWonTournament && (
            <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" aria-label="Tournament winner" />
          )}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {wins}W – {losses}L
          </span>
          {winRate > 0 && (
            <span className="text-xs text-muted-foreground">
              {winRate}% WR
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {player.streak > 0 && (
          <div className="flex items-center gap-1 text-primary">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{player.streak}W</span>
          </div>
        )}
        {player.streak < 0 && (
          <div className="flex items-center gap-1 text-destructive">
            <TrendingDown className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{Math.abs(player.streak)}L</span>
          </div>
        )}
        {player.streak === 0 && player.wins + player.losses > 0 && (
          <Minus className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </div>

      <div className="text-right">
        <p className="font-display text-xl font-bold text-foreground">{player.elo || 1200}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">ELO</p>
      </div>
    </motion.div>
  );
}