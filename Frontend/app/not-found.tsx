import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          backgroundColor: "var(--accent-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1.5rem",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 800,
          color: "var(--text-primary)",
          marginBottom: "0.5rem",
        }}
      >
        404
      </h1>
      <p
        style={{
          fontSize: "0.95rem",
          color: "var(--text-muted)",
          marginBottom: "2rem",
          maxWidth: 400,
        }}
      >
        This page could not be found.
      </p>
      <Link
        href="/"
        style={{
          padding: "0.65rem 1.75rem",
          borderRadius: 99,
          fontWeight: 600,
          fontSize: "0.85rem",
          backgroundColor: "var(--accent)",
          color: "white",
          textDecoration: "none",
        }}
      >
        Go Home
      </Link>
    </div>
  );
}
