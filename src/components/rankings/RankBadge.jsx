import React from "react";
import { Trophy, Medal, Award } from "lucide-react";

export default function RankBadge({ rank }) {
  if (rank === 1) {
    return (
      <div className="w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center">
        <Trophy className="w-5 h-5 text-yellow-500" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-10 h-10 rounded-full bg-slate-400/15 flex items-center justify-center">
        <Medal className="w-5 h-5 text-slate-400" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-10 h-10 rounded-full bg-amber-700/15 flex items-center justify-center">
        <Award className="w-5 h-5 text-amber-700" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
      <span className="text-sm font-bold text-muted-foreground">{rank}</span>
    </div>
  );
}