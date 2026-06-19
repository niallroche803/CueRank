import React, { useState } from "react";
import supabase from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, Plus, X, ChevronRight, Crown, Trash2, History, Lock, Unlock, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import TournamentBracket from "@/components/tournament/TournamentBracket";
import TournamentHistory from "@/components/tournament/TournamentHistory";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildFirstRound(names) {
  const shuffled = shuffle(names);
  let size = 1;
  while (size < shuffled.length) size *= 2;
  while (shuffled.length < size) shuffled.push(null);
  const matches = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({ player1: shuffled[i], player2: shuffled[i + 1], winner: null });
  }
  return matches;
}

function autoResolveByes(round) {
  return round.map((m) => {
    if (m.player1 && !m.player2 && !m.winner) return { ...m, winner: m.player1 };
    return m;
  });
}

export default function Tournament() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tournamentName, setTournamentName] = useState("");
  const [playerNames, setPlayerNames] = useState([""]);
  const [view, setView] = useState("list");
  const [listTab, setListTab] = useState("active");
  const [activeTournamentId, setActiveTournamentId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem("cuerank_admin") === "true");

  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
      localStorage.removeItem("cuerank_admin");
      return;
    }
    const code = window.prompt("Enter admin passcode:");
    if (code === import.meta.env.VITE_ADMIN_PASSCODE) {
      setIsAdmin(true);
      localStorage.setItem("cuerank_admin", "true");
    } else if (code !== null) {
      toast({ title: "Incorrect passcode", variant: "destructive" });
    }
  };

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, names }) => {
      let firstRound = buildFirstRound(names);
      firstRound = autoResolveByes(firstRound);
      const { data, error } = await supabase
        .from("tournaments")
        .insert({ name, status: "active", rounds: [firstRound] })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (t) => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      setActiveTournamentId(t.id);
      setView("bracket");
      toast({ title: "Tournament started!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, rounds, status, winner_name }) => {
      const patch = { rounds, status };
      if (winner_name) patch.winner_name = winner_name;
      const { error } = await supabase.from("tournaments").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tournaments"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("tournaments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      setView("list");
      toast({ title: "Tournament deleted" });
    },
  });

  const handleCreate = () => {
    const valid = playerNames.map((n) => n.trim()).filter(Boolean);
    if (valid.length < 2) return toast({ title: "Add at least 2 players", variant: "destructive" });
    if (!tournamentName.trim()) return toast({ title: "Enter a tournament name", variant: "destructive" });
    createMutation.mutate({ name: tournamentName.trim(), names: valid });
  };

  const handleSetWinner = (tournament, roundIdx, matchIdx, winner) => {
    let rounds = tournament.rounds.map((r) => r.map((m) => ({ ...m })));

    if (roundIdx < rounds.length - 1) {
      rounds = rounds.slice(0, roundIdx + 1);
    }

    rounds[roundIdx][matchIdx].winner = winner;

    const resolvedRound = autoResolveByes(rounds[roundIdx]);
    rounds[roundIdx] = resolvedRound;
    const allDone = resolvedRound.every((m) => m.winner !== null);

    if (allDone) {
      const winners = resolvedRound.map((m) => m.winner);
      if (winners.length === 1) {
        updateMutation.mutate({ id: tournament.id, rounds, status: "completed", winner_name: winners[0] });
        toast({ title: `🏆 ${winners[0]} wins the tournament!` });
        return;
      }
      const nextMatches = [];
      for (let i = 0; i < winners.length; i += 2) {
        nextMatches.push({ player1: winners[i], player2: winners[i + 1] || null, winner: null });
      }
      const resolvedNext = autoResolveByes(nextMatches);
      rounds.push(resolvedNext);
      if (resolvedNext.length === 1 && resolvedNext[0].winner) {
        updateMutation.mutate({ id: tournament.id, rounds, status: "completed", winner_name: resolvedNext[0].winner });
        toast({ title: `🏆 ${resolvedNext[0].winner} wins the tournament!` });
        return;
      }
    }
    updateMutation.mutate({ id: tournament.id, rounds, status: "active" });
  };

  const activeTournament = activeTournamentId
    ? tournaments.find((t) => t.id === activeTournamentId)
    : null;

  const AdminLockButton = () => (
    <button
      onClick={handleAdminToggle}
      className={`w-9 h-9 rounded-xl border border-border flex items-center justify-center transition-colors ${isAdmin ? "text-amber-500 border-amber-500/40 bg-amber-500/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
      title={isAdmin ? "Admin unlocked — click to lock" : "Admin login"}
    >
      {isAdmin ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
    </button>
  );

  if (view === "bracket" && activeTournament) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setView("list")}>← Back</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}><Home className="w-4 h-4" /></Button>
            <h2 className="font-display font-bold text-lg flex-1">{activeTournament.name}</h2>
            {activeTournament.status === "completed" && (
              <span className="flex items-center gap-1 text-yellow-500 font-semibold text-sm">
                <Crown className="w-4 h-4" /> {activeTournament.winner_name}
              </span>
            )}
            <AdminLockButton />
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <TournamentBracket
            tournament={activeTournament}
            onSetWinner={(roundIdx, matchIdx, winner) =>
              handleSetWinner(activeTournament, roundIdx, matchIdx, winner)
            }
            isAdmin={isAdmin}
            onDelete={() => deleteMutation.mutate(activeTournament.id)}
          />
        </div>
      </div>
    );
  }

  if (view === "create") {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/50 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setView("list")}>← Back</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}><Home className="w-4 h-4" /></Button>
            <h2 className="font-display font-bold text-lg flex-1">New Tournament</h2>
            <AdminLockButton />
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tournament Name</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="e.g. Friday Showdown"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Players</CardTitle>
              <p className="text-xs text-muted-foreground">Add all participants. Byes are handled automatically.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {playerNames.map((name, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Player ${i + 1}`}
                    value={name}
                    onChange={(e) => {
                      const updated = [...playerNames];
                      updated[i] = e.target.value;
                      setPlayerNames(updated);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setPlayerNames([...playerNames, ""]);
                      }
                    }}
                  />
                  {playerNames.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => setPlayerNames(playerNames.filter((_, idx) => idx !== i))}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => setPlayerNames([...playerNames, ""])}>
                <Plus className="w-4 h-4 mr-1" /> Add Player
              </Button>
            </CardContent>
          </Card>

          <Button className="w-full" size="lg" onClick={handleCreate} disabled={createMutation.isPending}>
            <Trophy className="w-4 h-4 mr-2" />
            Generate Bracket
          </Button>
        </div>
      </div>
    );
  }

  const activeTournaments = tournaments.filter((t) => t.status === "active");

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}><Home className="w-4 h-4" /></Button>
            <h2 className="font-display font-bold text-lg">Tournaments</h2>
          </div>
          <div className="flex items-center gap-2">
            <AdminLockButton />
            {isAdmin && (
              <Button size="sm" onClick={() => { setTournamentName(""); setPlayerNames([""]); setView("create"); }}>
                <Plus className="w-4 h-4 mr-1" /> New
              </Button>
            )}
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-0 flex gap-1">
          <button
            onClick={() => setListTab("active")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${listTab === "active" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Trophy className="w-3.5 h-3.5" /> Active
            {activeTournaments.length > 0 && (
              <span className="ml-1 bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeTournaments.length}</span>
            )}
          </button>
          <button
            onClick={() => setListTab("history")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${listTab === "history" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <History className="w-3.5 h-3.5" /> History
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : listTab === "history" ? (
          <TournamentHistory
            tournaments={tournaments}
            onView={(id) => { setActiveTournamentId(id); setView("bracket"); }}
          />
        ) : activeTournaments.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No active tournaments</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => { setTournamentName(""); setPlayerNames([""]); setView("create"); }}>
                <Plus className="w-4 h-4 mr-1" /> Create one
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activeTournaments.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <button
                  onClick={() => { setActiveTournamentId(t.id); setView("bracket"); }}
                  className="flex-1 flex items-center gap-4 p-4 bg-card border border-border rounded-xl text-left hover:border-primary/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Round {t.rounds?.length || 1} · In progress
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteMutation.mutate(t.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
