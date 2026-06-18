import React, { useState, useEffect, useRef } from "react";
import supabase from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Trash2, MessageCircle, ChevronDown, BarChart2 } from "lucide-react";
import { format } from "date-fns";
import PollCard from "./PollCard";
import CreatePollForm from "./CreatePollForm";

export default function ChatBox({ currentPlayer, isAdmin }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [seenCount, setSeenCount] = useState(0);
  const [showPollForm, setShowPollForm] = useState(false);
  const bottomRef = useRef(null);

  const { data: polls = [] } = useQuery({
    queryKey: ["polls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (isOpen) {
      setSeenCount(messages.length);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (isOpen && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const unread = Math.max(0, messages.length - seenCount);

  const sendMutation = useMutation({
    mutationFn: async (msg) => {
      const { error } = await supabase
        .from("chat_messages")
        .insert({ player_name: currentPlayer.name, message: msg });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
      setMessage("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("chat_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-messages"] }),
  });

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || !currentPlayer) return;
    sendMutation.mutate(trimmed);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
      {isOpen && (
        <div className="bg-card border border-border rounded-2xl shadow-xl w-80 flex flex-col overflow-hidden" style={{ height: "420px" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">Pool Chat</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {polls.filter((p) => p.is_active).map((poll) => (
              <PollCard key={poll.id} poll={poll} currentPlayer={currentPlayer} isAdmin={isAdmin} />
            ))}
            {polls.filter((p) => !p.is_active).map((poll) => (
              <PollCard key={poll.id} poll={poll} currentPlayer={currentPlayer} isAdmin={isAdmin} />
            ))}
            {messages.length === 0 && polls.length === 0 && (
              <p className="text-center text-muted-foreground text-xs py-8">No messages yet. Say something! 🎱</p>
            )}
            {messages.map((msg) => {
              const isMe = currentPlayer && msg.player_name === currentPlayer.name;
              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                  <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                    {!isMe && (
                      <span className="text-[10px] text-muted-foreground font-medium px-1">{msg.player_name}</span>
                    )}
                    <div className={`px-3 py-2 rounded-xl text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      {msg.message}
                    </div>
                    <span className="text-[9px] text-muted-foreground px-1">
                      {format(new Date(msg.created_at), "h:mm a")}
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => deleteMutation.mutate(msg.id)}
                      className="self-center text-muted-foreground hover:text-destructive transition-colors shrink-0 opacity-50 hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border px-3 py-3 space-y-2">
            {showPollForm && currentPlayer && isAdmin && (
              <CreatePollForm currentPlayer={currentPlayer} onClose={() => setShowPollForm(false)} />
            )}
            {!currentPlayer ? (
              <p className="text-xs text-muted-foreground text-center py-1">Select your name above to chat</p>
            ) : (
              <div className="flex gap-2">
                {isAdmin && (
                  <button
                    onClick={() => setShowPollForm((v) => !v)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border transition-colors ${showPollForm ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:text-foreground"}`}
                    title="Create a poll"
                  >
                    <BarChart2 className="w-4 h-4" />
                  </button>
                )}
                <input
                  className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder={`Message as ${currentPlayer.name}…`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
                  maxLength={300}
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMutation.isPending}
                  className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors relative"
      >
        <MessageCircle className="w-6 h-6" />
        {!isOpen && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
