import React, { useState } from "react";
import supabase from "@/api/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";

export default function CreatePollForm({ currentPlayer, onClose }) {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("polls").insert({
        question: question.trim(),
        options: options.map((o) => o.trim()).filter(Boolean),
        votes: {},
        created_by: currentPlayer.name,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
      onClose();
    },
  });

  const validOptions = options.map((o) => o.trim()).filter(Boolean);
  const canSubmit = question.trim() && validOptions.length >= 2;

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">Create a Poll</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <input
        className="w-full bg-muted rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
        placeholder="Poll question…"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        maxLength={200}
      />

      <div className="space-y-1">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-1">
            <input
              className="flex-1 bg-muted rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                setOptions(next);
              }}
              maxLength={100}
            />
            {options.length > 2 && (
              <button
                onClick={() => setOptions(options.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <button
            onClick={() => setOptions([...options, ""])}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-3 h-3" /> Add option
          </button>
        )}
      </div>

      <button
        disabled={!canSubmit || createMutation.isPending}
        onClick={() => createMutation.mutate()}
        className="w-full bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors"
      >
        Post Poll
      </button>
    </div>
  );
}
