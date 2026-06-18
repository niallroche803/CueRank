import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Skull } from "lucide-react";

export default function QuickMatchForm({ currentPlayer, players, onRecord, isRecording }) {
  const [opponentId, setOpponentId] = useState("");
  const [outcome, setOutcome] = useState(""); // "won" or "lost"

  const opponents = players.filter((p) => p.id !== currentPlayer.id);
  const sorted = [...opponents].sort((a, b) => a.name.localeCompare(b.name));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!opponentId || !outcome) return;
    const opponent = players.find((p) => p.id === opponentId);
    if (outcome === "won") {
      onRecord(currentPlayer.id, opponentId);
    } else {
      onRecord(opponentId, currentPlayer.id);
    }
    setOpponentId("");
    setOutcome("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
          Opponent
        </label>
        <Select value={opponentId} onValueChange={setOpponentId}>
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Who did you play?" />
          </SelectTrigger>
          <SelectContent>
            {sorted.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.elo || 1200} ELO)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
          Result
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOutcome("won")}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
              outcome === "won"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/40"
            }`}
          >
            <Trophy className="w-4 h-4" />
            I Won
          </button>
          <button
            type="button"
            onClick={() => setOutcome("lost")}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
              outcome === "lost"
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border bg-background text-muted-foreground hover:border-destructive/40"
            }`}
          >
            <Skull className="w-4 h-4" />
            I Lost
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!opponentId || !outcome || isRecording}
        className="w-full"
        size="lg"
      >
        {isRecording ? "Saving..." : "Submit Result"}
      </Button>
    </form>
  );
}