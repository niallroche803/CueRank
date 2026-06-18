import React, { useState } from "react";
import supabase from "@/api/supabaseClient";
import { calculateEloChange } from "@/lib/elo";
import { Button } from "@/components/ui/button";
import { Wrench, CheckCircle, Loader2 } from "lucide-react";

export default function RepairStats({ players, matches, onDone }) {
  const [status, setStatus] = useState("idle"); // idle | running | done
  const [log, setLog] = useState([]);

  const runRepair = async () => {
    setStatus("running");
    setLog([]);
    const newLog = [];

    // Sort matches oldest → newest — this is the replay order
    const sorted = [...matches].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Initialise every player at 1200 and zero stats
    const elo = {};
    const wins = {};
    const losses = {};
    for (const p of players) {
      elo[p.id] = 1200;
      wins[p.id] = 0;
      losses[p.id] = 0;
    }

    // Replay each match, computing correct ELO changes and updating match records where wrong
    for (const m of sorted) {
      const winnerElo = elo[m.winner_id] ?? 1200;
      const loserElo = elo[m.loser_id] ?? 1200;
      const { winnerChange, loserChange } = calculateEloChange(winnerElo, loserElo);
      const newWinnerElo = winnerElo + winnerChange;
      const newLoserElo = loserElo + loserChange;

      const eloMatchChanged =
        m.winner_elo_change !== winnerChange ||
        m.loser_elo_change !== loserChange ||
        m.winner_elo_after !== newWinnerElo ||
        m.loser_elo_after !== newLoserElo;

      if (eloMatchChanged) {
        const { error } = await supabase.from("matches").update({
          winner_elo_change: winnerChange,
          loser_elo_change: loserChange,
          winner_elo_after: newWinnerElo,
          loser_elo_after: newLoserElo,
        }).eq("id", m.id);

        if (error) {
          newLog.push(`❌ match update failed: ${error.message}`);
        } else {
          const winnerName = players.find((p) => p.id === m.winner_id)?.name ?? m.winner_name;
          const loserName = players.find((p) => p.id === m.loser_id)?.name ?? m.loser_name;
          newLog.push(`match: ${winnerName} +${winnerChange} (was +${m.winner_elo_change}), ${loserName} ${loserChange} (was ${m.loser_elo_change})`);
        }
      }

      // Advance running state regardless
      elo[m.winner_id] = newWinnerElo;
      elo[m.loser_id] = newLoserElo;
      if (wins[m.winner_id] !== undefined) wins[m.winner_id]++;
      if (losses[m.loser_id] !== undefined) losses[m.loser_id]++;
    }

    // Compute streak per player (walk newest → oldest)
    const streak = {};
    const sortedDesc = [...sorted].reverse();
    for (const p of players) {
      let s = 0;
      for (const m of sortedDesc) {
        const isWin = m.winner_id === p.id;
        const isLoss = m.loser_id === p.id;
        if (!isWin && !isLoss) continue;
        if (s === 0) {
          s = isWin ? 1 : -1;
        } else if (s > 0 && isWin) {
          s++;
        } else if (s < 0 && isLoss) {
          s--;
        } else {
          break;
        }
      }
      streak[p.id] = s;
    }

    // Update player records where anything differs
    let playerUpdates = 0;
    for (const p of players) {
      const correctElo = elo[p.id] ?? 1200;
      const correctWins = wins[p.id] ?? 0;
      const correctLosses = losses[p.id] ?? 0;
      const correctStreak = streak[p.id] ?? 0;

      const changed =
        Math.abs((p.elo || 1200) - correctElo) > 0.5 ||
        (p.wins || 0) !== correctWins ||
        (p.losses || 0) !== correctLosses ||
        (p.streak || 0) !== correctStreak;

      if (!changed) continue;

      const { error } = await supabase.from("players").update({
        elo: correctElo,
        wins: correctWins,
        losses: correctLosses,
        streak: correctStreak,
      }).eq("id", p.id);

      if (error) {
        newLog.push(`❌ ${p.name}: ${error.message}`);
      } else {
        const changes = [];
        if (Math.abs((p.elo || 1200) - correctElo) > 0.5)
          changes.push(`ELO ${Math.round(p.elo ?? 1200)}→${Math.round(correctElo)}`);
        if ((p.wins || 0) !== correctWins)
          changes.push(`wins ${p.wins ?? 0}→${correctWins}`);
        if ((p.losses || 0) !== correctLosses)
          changes.push(`losses ${p.losses ?? 0}→${correctLosses}`);
        if ((p.streak || 0) !== correctStreak)
          changes.push(`streak ${p.streak ?? 0}→${correctStreak}`);
        newLog.push(`${p.name}: ${changes.join(", ")}`);
        playerUpdates++;
      }
    }

    if (newLog.length === 0) {
      newLog.push("✅ Everything is already correct — nothing to fix.");
    } else {
      newLog.unshift(`Replayed ${sorted.length} matches · ${playerUpdates} player(s) updated`);
    }

    setLog(newLog);
    setStatus("done");
    onDone?.();
  };

  return (
    <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Wrench className="w-4 h-4 text-amber-500" />
        <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Admin: Repair Stats</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Replays all matches from ELO 1200 to recalculate wins, losses, streak, and ELO gains/losses. Writes corrections to the database. Safe to run multiple times.
      </p>
      {log.length > 0 && (
        <div className="text-xs font-mono space-y-0.5 max-h-40 overflow-y-auto">
          {log.map((l, i) => <p key={i} className="text-muted-foreground">{l}</p>)}
        </div>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={runRepair}
        disabled={status === "running"}
        className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
      >
        {status === "running" ? (
          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Repairing…</>
        ) : status === "done" ? (
          <><CheckCircle className="w-3.5 h-3.5 mr-1.5" />Done — Run Again</>
        ) : (
          <><Wrench className="w-3.5 h-3.5 mr-1.5" />Recalculate All Stats</>
        )}
      </Button>
    </div>
  );
}
