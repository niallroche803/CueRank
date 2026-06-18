import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Swords } from "lucide-react";

export default function RecordMatchForm({ players, onRecord, isRecording }) {
  const [winnerId, setWinnerId] = useState("");
  const [loserId, setLoserId] = useState("");

  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!winnerId || !loserId || winnerId === loserId) return;
    onRecord(winnerId, loserId);
    setWinnerId("");
    setLoserId("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
            Winner
          </label>
          <Select value={winnerId} onValueChange={setWinnerId}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Select winner" />
            </SelectTrigger>
            <SelectContent>
              {sorted.map((p) => (
                <SelectItem key={p.id} value={p.id} disabled={p.id === loserId}>
                  {p.name} ({p.elo || 1200})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
            Loser
          </label>
          <Select value={loserId} onValueChange={setLoserId}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Select loser" />
            </SelectTrigger>
            <SelectContent>
              {sorted.map((p) => (
                <SelectItem key={p.id} value={p.id} disabled={p.id === winnerId}>
                  {p.name} ({p.elo || 1200})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        type="submit"
        disabled={!winnerId || !loserId || winnerId === loserId || isRecording}
        className="w-full"
      >
        <Swords className="w-4 h-4 mr-2" />
        Record Match
      </Button>
    </form>
  );
}