"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";

interface PollOption {
  text: string;
  voters: string[];
}

interface PollData {
  _id: string;
  question: string;
  options: PollOption[];
  createdBy: { _id: string; fullName: string; username: string; avatar: string };
  isActive: boolean;
  endsAt?: string;
  createdAt: string;
}

interface PollProps {
  videoId: string;
}

export default function VideoPoll({ videoId }: PollProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const { data: pollsRes, isLoading } = useQuery({
    queryKey: ["video-polls", videoId],
    queryFn: async () => {
      const res = await api.get(`/polls/video/${videoId}`);
      return res.data;
    },
  });

  const polls: PollData[] = pollsRes?.data || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const cleanOptions = options.filter((o) => o.trim());
      await api.post("/polls", { question, options: cleanOptions, videoId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-polls", videoId] });
      setShowCreate(false);
      setQuestion("");
      setOptions(["", ""]);
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) => {
      await api.post(`/polls/${pollId}/vote`, { optionIndex });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["video-polls", videoId] });
    },
  });

  const totalVotes = (poll: PollData) =>
    poll.options.reduce((sum, opt) => sum + opt.voters.length, 0);

  const userVoted = (poll: PollData) =>
    poll.options.findIndex((opt) => opt.voters.includes(user?._id || ""));

  if (isLoading) return null;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Polls {polls.length > 0 && <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>({polls.length})</span>}
        </h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: "0.35rem 0.75rem", borderRadius: 99, fontSize: "0.78rem", fontWeight: 600,
            backgroundColor: "var(--accent-light)", color: "var(--accent)", border: "none", cursor: "pointer",
          }}
        >
          {showCreate ? "Cancel" : "+ Create Poll"}
        </button>
      </div>

      {/* Create Poll Form */}
      {showCreate && (
        <div style={{
          padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "1rem",
          backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-light)",
        }}>
          <input
            type="text"
            placeholder="Ask something..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{
              width: "100%", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-light)", backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)", fontSize: "0.85rem", marginBottom: "0.75rem",
            }}
          />
          {options.map((opt, i) => (
            <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <input
                type="text"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => {
                  const newOpts = [...options];
                  newOpts[i] = e.target.value;
                  setOptions(newOpts);
                }}
                style={{
                  flex: 1, padding: "0.4rem 0.75rem", borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-light)", backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)", fontSize: "0.82rem",
                }}
              />
              {i >= 2 && (
                <button
                  onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                  style={{
                    padding: "0.4rem 0.6rem", borderRadius: "var(--radius-sm)",
                    backgroundColor: "transparent", border: "1px solid var(--border-light)",
                    color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem",
                  }}
                >
                  x
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && (
            <button
              onClick={() => setOptions([...options, ""])}
              style={{
                padding: "0.3rem 0.6rem", borderRadius: 99, fontSize: "0.75rem",
                backgroundColor: "transparent", border: "1px dashed var(--border-light)",
                color: "var(--text-muted)", cursor: "pointer", marginBottom: "0.75rem",
              }}
            >
              + Add option
            </button>
          )}
          <button
            onClick={() => createMutation.mutate()}
            disabled={!question.trim() || options.filter((o) => o.trim()).length < 2 || createMutation.isPending}
            style={{
              width: "100%", padding: "0.5rem", borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--accent)", color: "white", border: "none",
              fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", opacity:
                !question.trim() || options.filter((o) => o.trim()).length < 2 ? 0.5 : 1,
            }}
          >
            {createMutation.isPending ? "Creating..." : "Create Poll"}
          </button>
        </div>
      )}

      {/* Poll List */}
      {polls.map((poll) => {
        const votes = totalVotes(poll);
        const votedIndex = userVoted(poll);
        const isCreator = poll.createdBy._id === user?._id;

        return (
          <div
            key={poll._id}
            style={{
              padding: "1rem", borderRadius: "var(--radius-md)", marginBottom: "0.75rem",
              backgroundColor: "var(--bg-elevated)", border: `1px solid ${!poll.isActive ? "var(--border-light)" : "var(--accent)"}`,
              opacity: poll.isActive ? 1 : 0.7,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {poll.question}
              </span>
              {!poll.isActive && (
                <span style={{
                  fontSize: "0.65rem", padding: "0.15rem 0.5rem", borderRadius: 99,
                  backgroundColor: "var(--bg-card)", color: "var(--text-muted)", fontWeight: 600,
                }}>
                  Closed
                </span>
              )}
            </div>

            {poll.options.map((opt, i) => {
              const pct = votes > 0 ? Math.round((opt.voters.length / votes) * 100) : 0;
              const isSelected = votedIndex === i;

              return (
                <button
                  key={i}
                  onClick={() => poll.isActive && voteMutation.mutate({ pollId: poll._id, optionIndex: i })}
                  disabled={!poll.isActive || voteMutation.isPending}
                  style={{
                    width: "100%", padding: "0.6rem 0.75rem", marginBottom: "0.4rem",
                    borderRadius: "var(--radius-sm)", border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border-light)"}`,
                    backgroundColor: isSelected ? "var(--accent-light)" : "var(--bg-primary)",
                    cursor: poll.isActive ? "pointer" : "default",
                    textAlign: "left", position: "relative", overflow: "hidden",
                  }}
                >
                  {/* Progress bar */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, height: "100%",
                    width: `${pct}%`, backgroundColor: isSelected ? "var(--accent)" : "var(--border-light)",
                    opacity: 0.15, transition: "width 0.3s ease",
                  }} />
                  <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: isSelected ? 600 : 400, color: "var(--text-primary)" }}>
                      {opt.text}
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>
                      {opt.voters.length} vote{opt.voters.length !== 1 ? "s" : ""} ({pct}%)
                    </span>
                  </div>
                </button>
              );
            })}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {votes} total vote{votes !== 1 ? "s" : ""}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                by {poll.createdBy.fullName}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
