import React, { useState, useEffect } from "react";
import supabase from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Swords, History, GitBranch, User, Moon, Sun, Lock, Unlock } from "lucide-react";
import { format } from "date-fns";

import { useToast } from "@/components/ui/use-toast";
import { calculateEloChange } from "@/lib/elo";
import Leaderboard from "@/components/rankings/Leaderboard";
import RecordMatchForm from "@/components/rankings/RecordMatchForm";
import MatchHistory from "@/components/rankings/MatchHistory";
import PlayerPicker from "@/components/rankings/PlayerPicker";
import QuickMatchForm from "@/components/rankings/QuickMatchForm";
import ChatBox from "@/components/chat/ChatBox";
import PlayerProfiles from "@/components/rankings/PlayerProfiles";
import RepairStats from "@/components/admin/RepairStats";

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("rankings");
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem("cuerank_admin") === "true");

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

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

  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data, error } = await supabase.from("players").select("*").order("elo", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase.from("matches").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ["daily-snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("daily_snapshots").select("*").order("date", { ascending: false }).limit(90);
      if (error) throw error;
      return data;
    },
  });

  // Keep currentPlayer in sync if players list updates (e.g. after ELO change)
  useEffect(() => {
    if (currentPlayer) {
      const updated = players.find((p) => p.id === currentPlayer.id);
      if (updated) setCurrentPlayer(updated);
    }
  }, [players]);

  // Daily snapshot: save once every 24 hours using localStorage as the gate
  useEffect(() => {
    if (players.length === 0 || snapshots === undefined) return;
    const STORAGE_KEY = "pool_snapshot_last_saved";
    const lastSaved = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (lastSaved && now - parseInt(lastSaved, 10) < twentyFourHours) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const alreadySaved = snapshots.some((s) => s.date === todayStr);
    if (alreadySaved) {
      localStorage.setItem(STORAGE_KEY, String(now));
      return;
    }
    const sorted = [...players].sort((a, b) => (b.elo || 1200) - (a.elo || 1200));
    const top3 = sorted.slice(0, 3).map((p, i) => ({ name: p.name, elo: p.elo || 1200, rank: i + 1 }));
    const player_elos = sorted.map((p) => ({ player_id: p.id, name: p.name, elo: p.elo || 1200 }));
    supabase.from("daily_snapshots").insert({ date: todayStr, top3, player_elos }).then(() => {
      localStorage.setItem(STORAGE_KEY, String(now));
    });
  }, [players, snapshots]);

  const addPlayerMutation = useMutation({
    mutationFn: async (name) => {
      const { data, error } = await supabase
        .from("players")
        .insert({ name, elo: 1200, wins: 0, losses: 0, streak: 0 })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newPlayer) => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      setCurrentPlayer(newPlayer);
      toast({ title: `Welcome, ${newPlayer.name}! 🎱` });
    },
  });

  const recordMatchMutation = useMutation({
    mutationFn: async ({ winnerId, loserId }) => {
      const winner = players.find((p) => p.id === winnerId);
      const loser = players.find((p) => p.id === loserId);

      const { winnerChange, loserChange } = calculateEloChange(
        winner.elo || 1200,
        loser.elo || 1200
      );

      const newWinnerElo = (winner.elo || 1200) + winnerChange;
      const newLoserElo = (loser.elo || 1200) + loserChange;

      const { error: matchError } = await supabase.from("matches").insert({
        winner_id: winnerId,
        loser_id: loserId,
        winner_name: winner.name,
        loser_name: loser.name,
        winner_elo_change: winnerChange,
        loser_elo_change: loserChange,
        winner_elo_after: newWinnerElo,
        loser_elo_after: newLoserElo,
      });
      if (matchError) throw matchError;

      // Only update ELO and streak — wins/losses are derived from match history
      const { error: winnerError } = await supabase.from("players").update({
        elo: newWinnerElo,
        streak: (winner.streak || 0) > 0 ? (winner.streak || 0) + 1 : 1,
      }).eq("id", winnerId);
      if (winnerError) throw winnerError;

      const { error: loserError } = await supabase.from("players").update({
        elo: newLoserElo,
        streak: (loser.streak || 0) < 0 ? (loser.streak || 0) - 1 : -1,
      }).eq("id", loserId);
      if (loserError) throw loserError;

      return { winner, loser, winnerChange, loserChange };
    },
    onSuccess: ({ winner, loser, winnerChange, loserChange }) => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast({
        title: `${winner.name} beat ${loser.name}`,
        description: `+${winnerChange} / ${loserChange} ELO`,
      });
    },
  });

  const deleteMatchMutation = useMutation({
    mutationFn: async (match) => {
      const { error } = await supabase.from("matches").delete().eq("id", match.id);
      if (error) throw error;

      // Revert ELO only — wins/losses are derived from match history
      const winner = players.find((p) => p.id === match.winner_id);
      const loser = players.find((p) => p.id === match.loser_id);
      if (winner) {
        await supabase.from("players").update({
          elo: (winner.elo || 1200) - (match.winner_elo_change || 0),
        }).eq("id", winner.id);
      }
      if (loser) {
        await supabase.from("players").update({
          elo: (loser.elo || 1200) - (match.loser_elo_change || 0),
        }).eq("id", loser.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast({ title: "Match deleted and ELO reverted" });
    },
  });

  const totalMatches = matches.length;
  const topPlayer =
    players.length > 0
      ? [...players].sort((a, b) => (b.elo || 1200) - (a.elo || 1200))[0]
      : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-xl font-bold tracking-tight">Ericsson Pool Rankings</h1>
              <p className="text-xs text-muted-foreground">Power rankings · ELO system</p>
            </div>
            <button
              onClick={handleAdminToggle}
              className={`w-9 h-9 rounded-xl border border-border flex items-center justify-center transition-colors ${isAdmin ? "text-amber-500 border-amber-500/40 bg-amber-500/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              title={isAdmin ? "Admin unlocked — click to lock" : "Admin login"}
            >
              {isAdmin ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setDarkMode((d) => !d)}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <PlayerPicker
          players={players}
          currentPlayer={currentPlayer}
          onSelect={setCurrentPlayer}
          onAddAndSelect={(name) => addPlayerMutation.mutate(name)}
          isAdding={addPlayerMutation.isPending}
        />

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="font-display text-2xl font-bold">{players.length}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">Players</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="font-display text-2xl font-bold">{totalMatches}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">Matches</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="font-display text-2xl font-bold text-primary truncate">
              {topPlayer ? topPlayer.name.split(" ")[0] : "—"}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mt-0.5">#1 Ranked</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5 bg-muted">
            <TabsTrigger value="rankings" className="gap-1.5">
              <Trophy className="w-3.5 h-3.5" />Rankings
            </TabsTrigger>
            <TabsTrigger value="record" className="gap-1.5">
              <Swords className="w-3.5 h-3.5" />Record
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="w-3.5 h-3.5" />History
            </TabsTrigger>
            <TabsTrigger value="profiles" className="gap-1.5">
              <User className="w-3.5 h-3.5" />Profiles
            </TabsTrigger>
            <TabsTrigger value="tournament" className="gap-1.5" onClick={() => window.location.href = "/tournament"}>
              <GitBranch className="w-3.5 h-3.5" />Tourney
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rankings" className="mt-4">
            {playersLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <Leaderboard players={players} matches={matches} snapshots={snapshots} />
            )}
          </TabsContent>

          <TabsContent value="record" className="mt-4 space-y-4">
            {!currentPlayer ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Select or add your name above to record a match
              </div>
            ) : players.length < 2 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Need at least 2 players in the rankings to record a match
              </div>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-heading flex items-center gap-2">
                    <Swords className="w-4 h-4" />
                    Record a Match
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Beating a higher-ranked player earns more ELO
                  </p>
                </CardHeader>
                <CardContent>
                  <QuickMatchForm
                    currentPlayer={currentPlayer}
                    players={players}
                    onRecord={(winnerId, loserId) => recordMatchMutation.mutate({ winnerId, loserId })}
                    isRecording={recordMatchMutation.isPending}
                  />
                </CardContent>
              </Card>
            )}

            {isAdmin && (
              <RepairStats
                players={players}
                matches={matches}
                onDone={() => {
                  queryClient.invalidateQueries({ queryKey: ["players"] });
                  queryClient.invalidateQueries({ queryKey: ["matches"] });
                }}
              />
            )}

            {isAdmin && currentPlayer && players.length >= 2 && (
              <details className="group">
                <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                  Log a match between two other players ›
                </summary>
                <Card className="mt-2">
                  <CardContent className="pt-4">
                    <RecordMatchForm
                      players={players}
                      onRecord={(winnerId, loserId) => recordMatchMutation.mutate({ winnerId, loserId })}
                      isRecording={recordMatchMutation.isPending}
                    />
                  </CardContent>
                </Card>
              </details>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <MatchHistory
              matches={matches}
              isAdmin={isAdmin}
              onDelete={(match) => deleteMatchMutation.mutate(match)}
            />
          </TabsContent>

          <TabsContent value="profiles" className="mt-4">
            <PlayerProfiles players={players} matches={matches} snapshots={snapshots} />
          </TabsContent>
        </Tabs>
      </div>
      <ChatBox currentPlayer={currentPlayer} isAdmin={isAdmin} />
    </div>
  );
}
