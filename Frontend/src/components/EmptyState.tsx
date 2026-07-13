import React from "react";
import Link from "next/link";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  const content = (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <p style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: description ? "0.5rem" : 0 }}>
        {title}
      </p>
      {description && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: actionLabel || onAction ? "1.5rem" : 0 }}>
          {description}
        </p>
      )}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn btn-primary" style={{ borderRadius: 99, padding: "0.7rem 1.75rem", textDecoration: "none" }}>
          {actionLabel}
        </Link>
      )}
      {onAction && (
        <button className="btn btn-primary" onClick={onAction} style={{ borderRadius: 99, padding: "0.7rem 1.75rem", border: "none", cursor: "pointer" }}>
          {actionLabel}
        </button>
      )}
    </div>
  );

  return content;
}
