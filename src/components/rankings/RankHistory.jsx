import React from "react";
import { Crown } from "lucide-react";
import { format } from "date-fns";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function RankHistory({ snapshots }) {
  const sorted = [...snapshots].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No daily snapshots yet — snapshots are taken automatically each day
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((snap) => (
        <div key={snap.id} className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            {format(new Date(snap.date), "EEEE, MMM d yyyy")}
          </p>
          <div className="space-y-1.5">
            {(snap.top3 || []).map((entry, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg w-6 text-center">{MEDALS[i] || `#${i + 1}`}</span>
                <span className="font-semibold text-sm flex-1">{entry.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{entry.elo} ELO</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}