"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";

interface PollOption {
  _id: string;
  text: string;
  voters: string[];
}

interface PollData {
  _id: string;
  question: string;
  options: PollOption[];
  isActive: boolean;
  endsAt?: string;
  createdAt: string;
  createdBy?: { _id: string; fullName: string };
}

export default function CommunityPoll({ poll, channelUsername }: { poll: PollData; channelUsername: string }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.voters.length, 0);
  const userVotedIndex = poll.options.findIndex((opt) => opt.voters.includes(user?._id || ""));

  const voteMutation = useMutation({
    mutationFn: async (optionIndex: number) => {
      await api.post(`/polls/${poll._id}/vote`, { optionIndex });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-posts", channelUsername] });
    },
  });

  return (
    <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-md)" }}>
      <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>{poll.question}</p>

      {poll.options.map((opt, i) => {
        const pct = totalVotes > 0 ? Math.round((opt.voters.length / totalVotes) * 100) : 0;
        const isSelected = userVotedIndex === i;

        return (
          <button
            key={opt._id}
            onClick={() => poll.isActive && userVotedIndex === -1 && voteMutation.mutate(i)}
            disabled={!poll.isActive || userVotedIndex !== -1 || voteMutation.isPending}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.6rem 0.75rem",
              marginBottom: "0.4rem",
              borderRadius: "var(--radius-sm)",
              border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
              backgroundColor: isSelected ? "var(--accent-subtle)" : "var(--bg-primary)",
              cursor: poll.isActive && userVotedIndex === -1 ? "pointer" : "default",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.2s",
              textAlign: "left",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${pct}%`,
                backgroundColor: isSelected ? "var(--accent-glow)" : "var(--elevated)",
                transition: "width 0.5s ease",
              }}
            />
            <span
              style={{
                position: "relative",
                zIndex: 1,
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "var(--text-primary)",
                flex: 1,
              }}
            >
              {opt.text}
            </span>
            <span
              style={{
                position: "relative",
                zIndex: 1,
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--text-muted)",
              }}
            >
              {userVotedIndex !== -1 || !poll.isActive ? `${pct}%` : ""}
            </span>
          </button>
        );
      })}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          {!poll.isActive ? " · Final results" : userVotedIndex !== -1 ? "" : ""}
        </span>
        {!poll.isActive && (
          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--accent-warm)" }}>Closed</span>
        )}
      </div>
    </div>
  );
}
