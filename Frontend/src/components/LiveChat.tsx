"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";

interface ChatMessage {
  _id: string;
  content: string;
  type: "message" | "donation" | "system";
  sender: { _id: string; fullName: string; username: string; avatar: string };
  donationAmount?: number;
  createdAt: string;
}

interface LiveChatProps {
  streamId: string;
}

export default function LiveChat({ streamId }: LiveChatProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [lastPollTime, setLastPollTime] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Fetch messages (initial load)
  const { data: messagesRes } = useQuery({
    queryKey: ["stream-chat", streamId],
    queryFn: async () => {
      const res = await api.get(`/chat/${streamId}?limit=50`);
      return res.data;
    },
    refetchInterval: 3000, // Poll every 3 seconds
  });

  const messages: ChatMessage[] = messagesRes?.data || [];

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/chat/${streamId}/send`, { content: message });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["stream-chat", streamId] });
    },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMutation.isPending) return;
    sendMutation.mutate();
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      backgroundColor: "var(--bg-card)", borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border-light)", overflow: "hidden",
    }}>
      {/* Chat Header */}
      <div style={{
        padding: "0.6rem 1rem", borderBottom: "1px solid var(--border-light)",
        backgroundColor: "var(--bg-elevated)", display: "flex", alignItems: "center", gap: "0.5rem",
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444", animation: "pulse 2s infinite" }} />
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>Live Chat</span>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "auto" }}>
          {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        style={{
          flex: 1, overflowY: "auto", padding: "0.75rem",
          display: "flex", flexDirection: "column", gap: "0.5rem",
          maxHeight: 400,
        }}
      >
        {messages.length === 0 && (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", fontSize: "0.82rem", padding: "2rem",
          }}>
            No messages yet. Start the conversation!
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender._id === user?._id;
          const isDonation = msg.type === "donation";
          const isSystem = msg.type === "system";

          if (isSystem) {
            return (
              <div key={msg._id} style={{
                textAlign: "center", padding: "0.3rem 0.5rem",
                fontSize: "0.72rem", color: "var(--text-muted)",
                backgroundColor: "var(--bg-elevated)", borderRadius: "var(--radius-sm)",
              }}>
                {msg.content}
              </div>
            );
          }

          if (isDonation) {
            return (
              <div key={msg._id} style={{
                padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                border: "1px solid #f59e0b",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                  <span style={{ fontSize: "0.7rem" }}>💰</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#92400e" }}>
                    {msg.sender.fullName} donated ${msg.donationAmount}
                  </span>
                </div>
                <p style={{ fontSize: "0.82rem", color: "#78350f", margin: 0 }}>{msg.content}</p>
              </div>
            );
          }

          return (
            <div key={msg._id} style={{
              display: "flex", gap: "0.5rem", alignItems: "flex-start",
              padding: "0.3rem 0",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={msg.sender.avatar}
                alt={msg.sender.fullName}
                style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
                  <span style={{
                    fontSize: "0.75rem", fontWeight: 700,
                    color: isOwn ? "var(--accent)" : "var(--text-primary)",
                  }}>
                    {msg.sender.fullName}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <p style={{
                  fontSize: "0.82rem", color: "var(--text-secondary)",
                  margin: 0, wordBreak: "break-word",
                }}>
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        padding: "0.6rem", borderTop: "1px solid var(--border-light)",
        display: "flex", gap: "0.5rem",
      }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Send a message..."
          maxLength={500}
          style={{
            flex: 1, padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-light)", backgroundColor: "var(--bg-primary)",
            color: "var(--text-primary)", fontSize: "0.82rem",
          }}
        />
        <button
          type="submit"
          disabled={!message.trim() || sendMutation.isPending}
          style={{
            padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--accent)", color: "white", border: "none",
            fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
            opacity: !message.trim() || sendMutation.isPending ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
