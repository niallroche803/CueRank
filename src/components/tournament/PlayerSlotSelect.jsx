import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Player-select dropdown used in tournament setup. Selecting from the list
// stores { id, name } so tournament winners can be linked back to a real
// player row instead of relying on free-text name matching.
export default function PlayerSlotSelect({ players, value, onChange, onCreatePlayer, placeholder = "Select player..." }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const trimmedQuery = query.trim();
  const filtered = trimmedQuery
    ? players.filter((p) => p.name.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : players;
  const exactMatch = players.some((p) => p.name.toLowerCase() === trimmedQuery.toLowerCase());

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (!isOpen) setQuery("");
  };

  const handleSelect = (player) => {
    onChange({ id: player.id, name: player.name });
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!trimmedQuery || creating) return;
    setCreating(true);
    try {
      const newPlayer = await onCreatePlayer(trimmedQuery);
      if (newPlayer) handleSelect(newPlayer);
    } finally {
      setCreating(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          <span className={`truncate ${value ? "text-foreground" : "text-muted-foreground"}`}>
            {value ? value.name : placeholder}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 max-h-72 overflow-y-auto" onCloseAutoFocus={(e) => e.preventDefault()}>
        <div className="p-1.5">
          <Input
            autoFocus
            placeholder="Search or add player..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className="h-8"
          />
        </div>
        {filtered.length > 0 && <DropdownMenuSeparator />}
        {filtered.map((p) => (
          <DropdownMenuItem key={p.id} onClick={() => handleSelect(p)} className="cursor-pointer">
            <span className="flex-1 truncate">{p.name}</span>
            <span className="text-xs text-muted-foreground ml-2">{p.elo || 1200} ELO</span>
          </DropdownMenuItem>
        ))}
        {filtered.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted-foreground text-center">No players found</p>
        )}
        {trimmedQuery && !exactMatch && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={creating}
              onClick={handleCreate}
              className="cursor-pointer text-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add "{trimmedQuery}" as new player
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
