import React, { useState } from "react";
import { Crown, Check, Undo2 } from "lucide-react";

function getName(p) {
  if (!p) return null;
  return typeof p === "string" ? p : p.name;
}

function getSubPlayers(p) {
  if (typeof p !== "object" || !p) return null;
  return p.players?.filter(Boolean).map(getName) ?? null;
}

export default function TournamentBracket({ tournament, onSetWinner, onUndoWinner, isAdmin, onDelete }) {
  const { rounds, status, winner_name } = tournament;
  if (!rounds || rounds.length === 0) return null;
  const tournamentComplete = status === "completed";

  return (
    <div className="overflow-x-auto pb-4">
      {status === "completed" && (
        <div className="flex items-center justify-center gap-2 mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <Crown className="w-5 h-5 text-yellow-500" />
          <span className="font-display font-bold text-yellow-600">{winner_name} wins the tournament!</span>
        </div>
      )}

      <div className="flex gap-6 items-start min-w-max">
        {rounds.map((round, roundIdx) => {
          let label = `Round ${roundIdx + 1}`;
          if (roundIdx === rounds.length - 1 && status === "completed") label = "Final";
          else if (round.length === 1) label = "Final";
          else if (round.length === 2) label = "Semi-Final";

          return (
            <div key={roundIdx} className="flex flex-col gap-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-center mb-1">
                {label}
              </p>
              <div className="flex flex-col justify-around h-full gap-6">
                {round.map((match, matchIdx) => (
                  <MatchCard
                    key={matchIdx}
                    match={match}
                    canEdit={isAdmin || !tournamentComplete}
                    isAdmin={isAdmin}
                    onWin={(winner) => onSetWinner(roundIdx, matchIdx, winner)}
                    onUndo={() => onUndoWinner(roundIdx, matchIdx)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <button
          onClick={onDelete}
          className="mt-8 text-xs text-muted-foreground hover:text-destructive transition-colors underline"
        >
          Delete this tournament
        </button>
      )}
    </div>
  );
}

function MatchCard({ match, canEdit, isAdmin, onWin, onUndo }) {
  const { player1, player2, winner } = match;
  const name1 = getName(player1);
  const name2 = getName(player2);
  const winnerName = getName(winner);
  const isBye = player1 && !player2;
  const canClick = canEdit && player1 && player2 && !isBye;
  const canUndo = isAdmin && !isBye && !!winner;

  // Two-step confirmation: first tap proposes a winner, second tap on the
  // same slot locks it in. Tapping the other slot switches the proposal.
  const [pendingIdx, setPendingIdx] = useState(null);

  const handleSlotClick = (idx, player) => {
    if (pendingIdx === idx) {
      onWin(player);
      setPendingIdx(null);
    } else {
      setPendingIdx(idx);
    }
  };

  return (
    <div className="w-52 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <PlayerSlot
        name={name1}
        subPlayers={getSubPlayers(player1)}
        isWinner={!!winnerName && winnerName === name1}
        isLoser={!!winnerName && winnerName !== name1}
        isPending={pendingIdx === 0}
        isBye={false}
        onClick={canClick ? () => handleSlotClick(0, player1) : null}
      />
      <div className="h-px bg-border" />
      {isBye ? (
        <PlayerSlot name="BYE" subPlayers={null} isWinner={false} isLoser={false} isBye={true} onClick={null} />
      ) : (
        <PlayerSlot
          name={name2}
          subPlayers={getSubPlayers(player2)}
          isWinner={!!winnerName && winnerName === name2}
          isLoser={!!winnerName && winnerName !== name2}
          isPending={pendingIdx === 1}
          isBye={false}
          onClick={canClick ? () => handleSlotClick(1, player2) : null}
        />
      )}
      {pendingIdx !== null && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-amber-500/10 border-t border-amber-500/20">
          <span className="text-[10px] text-amber-600 font-medium">Tap again to confirm</span>
          <button
            onClick={() => setPendingIdx(null)}
            className="text-[10px] text-muted-foreground hover:text-foreground underline"
          >
            Cancel
          </button>
        </div>
      )}
      {pendingIdx === null && canUndo && (
        <button
          onClick={onUndo}
          className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] text-muted-foreground hover:text-destructive border-t border-border transition-colors"
        >
          <Undo2 className="w-3 h-3" /> Undo
        </button>
      )}
    </div>
  );
}

function PlayerSlot({ name, subPlayers, isWinner, isLoser, isPending, isBye, onClick }) {
  return (
    <button
      onClick={onClick || undefined}
      disabled={!onClick}
      className={[
        "w-full px-3 py-2.5 text-sm font-medium text-left flex items-center justify-between transition-colors",
        isBye || !name ? "text-muted-foreground/40 cursor-default" : "",
        isPending ? "bg-amber-500/15 text-amber-700 ring-1 ring-inset ring-amber-500/40" : "",
        !isPending && isWinner ? "bg-primary/10 text-primary" : "",
        !isPending && isLoser ? "text-muted-foreground line-through" : "",
        onClick ? "hover:bg-muted cursor-pointer" : "cursor-default",
      ].join(" ")}
    >
      <div className="min-w-0">
        <span className="truncate block">{name || "TBD"}</span>
        {subPlayers && subPlayers.length > 0 && (
          <span className="text-[10px] text-muted-foreground font-normal leading-tight block truncate">
            {subPlayers.join(" & ")}
          </span>
        )}
      </div>
      {isPending && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-1" />}
      {!isPending && isWinner && <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0 ml-1" />}
    </button>
  );
}
