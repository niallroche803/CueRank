import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserCircle, ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PlayerPicker({ players, currentPlayer, onSelect, onAddAndSelect, isAdding }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddAndSelect(newName.trim());
    setNewName("");
    setShowAdd(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">Who are you?</p>

      {!showAdd ? (
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 justify-between font-normal">
                <div className="flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-muted-foreground" />
                  <span className={currentPlayer ? "text-foreground" : "text-muted-foreground"}>
                    {currentPlayer ? currentPlayer.name : "Select your name..."}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {players.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => onSelect(p)} className="cursor-pointer">
                  <span className="flex-1">{p.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{p.elo || 1200} ELO</span>
                </DropdownMenuItem>
              ))}
              {players.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => setShowAdd(true)} className="cursor-pointer text-primary">
                <Plus className="w-4 h-4 mr-2" />
                I'm not on the list...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            autoFocus
            placeholder="Enter your name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={!newName.trim() || isAdding} size="default">
            Join
          </Button>
          <Button type="button" variant="ghost" size="default" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
        </form>
      )}

      {currentPlayer && (
        <p className="text-xs text-muted-foreground mt-2">
          Playing as <span className="font-semibold text-primary">{currentPlayer.name}</span> · {currentPlayer.elo || 1200} ELO · {currentPlayer.wins || 0}W {currentPlayer.losses || 0}L
        </p>
      )}
    </div>
  );
}