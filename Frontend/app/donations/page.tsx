"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getApiErrorMessage } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import PageNavDropdown from "@/src/components/PageNavDropdown";

interface Donation {
  _id: string;
  amount: number;
  currency: string;
  message: string;
  isAnonymous: boolean;
  sender?: { _id: string; fullName: string; username: string; avatar: string };
  recipient?: { _id: string; fullName: string; username: string; avatar: string };
  video?: { title: string; thumbnail: string };
  createdAt: string;
}

export default function DonationsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [donations, setDonations] = useState<Donation[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalDocs, setTotalDocs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    setIsLoading(true);
    const endpoint = tab === "received"
      ? `/donations/received/${user._id}?page=${page}&limit=20`
      : `/donations/sent?page=${page}&limit=20`;
    api.get(endpoint)
      .then((res) => {
        setDonations(res.data.data.docs || []);
        setTotalAmount(res.data.data.totalAmount || 0);
        setTotalDocs(res.data.data.totalDocs || 0);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, user, tab, page]);

  if (authLoading || !isAuthenticated) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-muted)", fontWeight: 500 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      <header className="glass" style={{ position: "sticky", top: 0, zIndex: 50, padding: "0.75rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <PageNavDropdown />
          <span style={{ color: "var(--border-light)", fontSize: "1.2rem", fontWeight: 300 }}>/</span>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.9rem" }}>Donations</span>
        </div>
      </header>

      <div style={{ width: "100%", padding: "2rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "1.5rem" }}>Donations</h1>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem", maxWidth: 600 }}>
          <div className="form-card" style={{ padding: "1rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Total {tab === "received" ? "Received" : "Sent"}</p>
            <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent)" }}>${totalAmount.toFixed(2)}</p>
          </div>
          <div className="form-card" style={{ padding: "1rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Transactions</p>
            <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)" }}>{totalDocs}</p>
          </div>
          <div className="form-card" style={{ padding: "1rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Average</p>
            <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)" }}>
              ${totalDocs > 0 ? (totalAmount / totalDocs).toFixed(2) : "0.00"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {(["received", "sent"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }}
              style={{ padding: "0.55rem 1.5rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: 600, backgroundColor: tab === t ? "var(--accent)" : "var(--bg-elevated)", color: tab === t ? "#fff" : "var(--text-secondary)", border: `1px solid ${tab === t ? "var(--accent)" : "var(--border-light)"}`, cursor: "pointer", transition: "all 0.2s", textTransform: "capitalize" }}>
              {t} Donations
            </button>
          ))}
        </div>

        {/* Donations List */}
        {isLoading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
        ) : donations.length === 0 ? (
          <div className="form-card" style={{ padding: "3rem", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>💰</div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>No donations yet</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {tab === "received" ? "When someone tips you, it will appear here." : "When you tip a creator, it will appear here."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {donations.map((d) => (
              <div key={d._id} className="form-card" style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #FFD700, #FFA500)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                  💰
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {tab === "received"
                        ? (d.isAnonymous ? "Anonymous" : d.sender?.fullName || "Unknown")
                        : (d.recipient?.fullName || "Unknown")
                      }
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {tab === "received" ? "sent you" : "you sent"}
                    </span>
                  </div>
                  {d.message && <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0.25rem 0 0", fontStyle: "italic" }}>&quot;{d.message}&quot;</p>}
                  {d.video && <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.2rem 0 0" }}>on {d.video.title}</p>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: "1rem", fontWeight: 800, color: "var(--accent)" }}>${d.amount.toFixed(2)}</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{new Date(d.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalDocs > 20 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: 600, backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-light)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>
              Previous
            </button>
            <span style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>Page {page}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={donations.length < 20}
              style={{ padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: 600, backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-light)", cursor: donations.length < 20 ? "not-allowed" : "pointer", opacity: donations.length < 20 ? 0.5 : 1 }}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
