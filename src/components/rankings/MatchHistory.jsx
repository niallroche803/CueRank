import React from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ArrowRight, TrendingUp, TrendingDown, Trash2 } from "lucide-react";

export default function MatchHistory({ matches, isAdmin, onDelete }) {

  if (matches.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8 text-sm">
        No matches recorded yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {matches.map((match, i) => (
        <motion.div
          key={match.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-primary text-sm truncate">{match.winner_name}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate">{match.loser_name}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {format(new Date(match.created_at), "MMM d, h:mm a")}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 text-primary">
              <TrendingUp className="w-3 h-3" />
              <span className="text-xs font-bold">+{match.winner_elo_change}</span>
            </div>
            <div className="flex items-center gap-1 text-destructive">
              <TrendingDown className="w-3 h-3" />
              <span className="text-xs font-bold">{match.loser_elo_change}</span>
            </div>
            {isAdmin && (
              <button
                onClick={() => onDelete(match)}
                className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                title="Delete match"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}