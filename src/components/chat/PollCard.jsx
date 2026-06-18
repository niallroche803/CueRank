import React from "react";
import supabase from "@/api/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart2 } from "lucide-react";

export default function PollCard({ poll, currentPlayer, isAdmin }) {
  const queryClient = useQueryClient();
  const votes = poll.votes || {};

  const myVoteIndex = Object.entries(votes).find(([, voters]) =>
    Array.isArray(voters) && voters.includes(currentPlayer?.name)
  )?.[0];

  const totalVotes = Object.values(votes).reduce((sum, v) => sum + (Array.isArray(v) ? v.length : 0), 0);

  const voteMutation = useMutation({
    mutationFn: async (optionIndex) => {
      const newVotes = { ...votes };
      if (myVoteIndex !== undefined) {
        newVotes[myVoteIndex] = (newVotes[myVoteIndex] || []).filter((n) => n !== currentPlayer.name);
      }
      if (!newVotes[optionIndex]) newVotes[optionIndex] = [];
      newVotes[optionIndex] = [...newVotes[optionIndex], currentPlayer.name];
      const { error } = await supabase.from("polls").update({ votes: newVotes }).eq("id", poll.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["polls"] }),
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("polls").update({ is_active: false }).eq("id", poll.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["polls"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("polls").delete().eq("id", poll.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["polls"] }),
  });

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
      <div className="flex items-start gap-2">
        <BarChart2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">{poll.question}</p>
          <p className="text-[10px] text-muted-foreground">by {poll.created_by}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {(poll.options || []).map((option, i) => {
          const count = Array.isArray(votes[i]) ? votes[i].length : 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = String(i) === String(myVoteIndex);
          const canVote = !!currentPlayer && poll.is_active;

          return (
            <button
              key={i}
              disabled={!canVote || voteMutation.isPending}
              onClick={() => canVote && voteMutation.mutate(String(i))}
              className={[
                "w-full text-left rounded-lg px-3 py-2 text-xs font-medium relative overflow-hidden transition-colors",
                canVote ? "hover:bg-primary/10 cursor-pointer" : "cursor-default",
                isMyVote ? "ring-1 ring-primary" : "",
                "bg-card border border-border",
              ].join(" ")}
            >
              <div
                className="absolute inset-0 bg-primary/10 rounded-lg transition-all"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{option}</span>
                  <span className="shrink-0 text-muted-foreground">{count} · {pct}%</span>
                </div>
                {count > 0 && (
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {(Array.isArray(votes[i]) ? votes[i] : []).join(", ")}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!poll.is_active && (
        <p className="text-[10px] text-muted-foreground text-center">Poll closed</p>
      )}

      {isAdmin && poll.is_active && (
        <button
          onClick={() => closeMutation.mutate()}
          className="text-[10px] text-muted-foreground hover:text-foreground underline w-full text-center"
        >
          Close poll
        </button>
      )}
      {isAdmin && (
        <button
          onClick={() => deleteMutation.mutate()}
          className="text-[10px] text-destructive hover:text-destructive/80 underline w-full text-center"
        >
          Delete poll
        </button>
      )}
    </div>
  );
}
