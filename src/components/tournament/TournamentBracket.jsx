import React from "react";
import { Crown } from "lucide-react";

function getName(p) {
  if (!p) return null;
  return typeof p === "string" ? p : p.name;
}

function getSubPlayers(p) {
  if (typeof p !== "object" || !p) return null;
  return p.players?.filter(Boolean).map(getName) ?? null;
}

export default function TournamentBracket({ tournament, onSetWinner, isAdmin, onDelete }) {
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
                    onWin={(winner) => onSetWinner(roundIdx, matchIdx, winner)}
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

function MatchCard({ match, canEdit, onWin }) {
  const { player1, player2, winner } = match;
  const name1 = getName(player1);
  const name2 = getName(player2);
  const winnerName = getName(winner);
  const isBye = player1 && !player2;
  const canClick = canEdit && player1 && player2 && !isBye;

  return (
    <div className="w-52 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <PlayerSlot
        name={name1}
        subPlayers={getSubPlayers(player1)}
        isWinner={!!winnerName && winnerName === name1}
        isLoser={!!winnerName && winnerName !== name1}
        isBye={false}
        onClick={canClick ? () => onWin(player1) : null}
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
          isBye={false}
          onClick={canClick ? () => onWin(player2) : null}
        />
      )}
    </div>
  );
}

function PlayerSlot({ name, subPlayers, isWinner, isLoser, isBye, onClick }) {
  return (
    <button
      onClick={onClick || undefined}
      disabled={!onClick}
      className={[
        "w-full px-3 py-2.5 text-sm font-medium text-left flex items-center justify-between transition-colors",
        isBye || !name ? "text-muted-foreground/40 cursor-default" : "",
        isWinner ? "bg-primary/10 text-primary" : "",
        isLoser ? "text-muted-foreground line-through" : "",
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
      {isWinner && <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0 ml-1" />}
    </button>
  );
}
