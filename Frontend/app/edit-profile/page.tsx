"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, getApiErrorMessage } from "@/src/services/api";
import { useAuthStore } from "@/src/store/useAuthStore";
import Link from "next/link";
import { motion } from "framer-motion";
import PageNavDropdown from "@/src/components/PageNavDropdown";

function isValidUrl(str: string): boolean {
  if (!str) return true;
  try { new URL(str); return true; } catch { return false; }
}

function extractHandle(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.length > 0 ? `@${parts[parts.length - 1]}` : u.hostname;
  } catch {
    return "";
  }
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, login } = useAuthStore();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [youtube, setYoutube] = useState("");
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [github, setGithub] = useState("");
  const [website, setWebsite] = useState("");

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setEmail(user.email || "");
      setAvatarPreview(user.avatar || "");
      setCoverPreview(user.coverImage || "");
      setBio(user.bio || "");
      setYoutube(user.socialLinks?.youtube || "");
      setTwitter(user.socialLinks?.twitter || "");
      setInstagram(user.socialLinks?.instagram || "");
      setGithub(user.socialLinks?.github || "");
      setWebsite(user.socialLinks?.website || "");
    }
  }, [user]);

  // Track dirty state
  useEffect(() => {
    if (!user) return;
    const dirty =
      fullName !== (user.fullName || "") ||
      email !== (user.email || "") ||
      bio !== (user.bio || "") ||
      youtube !== (user.socialLinks?.youtube || "") ||
      twitter !== (user.socialLinks?.twitter || "") ||
      instagram !== (user.socialLinks?.instagram || "") ||
      github !== (user.socialLinks?.github || "") ||
      website !== (user.socialLinks?.website || "") ||
      avatarFile !== null ||
      coverFile !== null;
    setIsDirty(dirty);
  }, [fullName, email, bio, youtube, twitter, instagram, github, website, avatarFile, coverFile, user]);

  // Unsaved changes guard
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          style={{ color: "var(--text-muted)", fontWeight: 500 }}>Loading...</motion.div>
      </div>
    );
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); markDirty(); }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); markDirty(); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      await api.patch("/users/update-account", { fullName, email });
      await api.patch("/users/profile", { bio: bio.trim(), socialLinks: { youtube, twitter, instagram, github, website } });
      if (avatarFile) { const fd = new FormData(); fd.append("avatar", avatarFile); await api.patch("/users/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } }); }
      if (coverFile) { const fd = new FormData(); fd.append("coverImage", coverFile); await api.patch("/users/cover-image", fd, { headers: { "Content-Type": "multipart/form-data" } }); }
      const res = await api.get("/users/current-user");
      login(res.data.data);
      setSuccess("Profile updated successfully!");
      setAvatarFile(null); setCoverFile(null); setIsDirty(false);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to update profile. Please try again."));
    } finally { setSaving(false); }
  };

  const bioPercent = (bio.length / 500) * 100;
  const bioColor = bioPercent > 90 ? "var(--accent-warm)" : bioPercent > 70 ? "#eab308" : "var(--text-muted)";

  const socialFields = [
    { label: "YouTube", value: youtube, setter: setYoutube, placeholder: "https://youtube.com/@yourchannel", color: "#FF0000",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
    { label: "Twitter / X", value: twitter, setter: setTwitter, placeholder: "https://x.com/yourhandle", color: "#1DA1F2",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
    { label: "Instagram", value: instagram, setter: setInstagram, placeholder: "https://instagram.com/yourhandle", color: "#E4405F",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" /></svg> },
    { label: "GitHub", value: github, setter: setGithub, placeholder: "https://github.com/yourhandle", color: "#6e40c9",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg> },
    { label: "Website", value: website, setter: setWebsite, placeholder: "https://yoursite.com", color: "var(--accent)",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg> },
  ];

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      <header className="glass" style={{ position: "sticky", top: 0, zIndex: 50, padding: "0.75rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <PageNavDropdown />
          <span style={{ color: "var(--border)", fontSize: "1.2rem", fontWeight: 300 }}>/</span>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "0.9rem" }}>Edit Profile</span>
        </div>
      </header>

      <div style={{ width: "100%", padding: "2rem" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ display: "block" }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.25rem" }}>Edit Profile</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>This is how others see you on VideoTube</p>

          {error && (
            <div style={{ padding: "0.7rem 1rem", backgroundColor: "var(--accent-warm-light)", color: "var(--accent-warm)", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem", border: "1px solid rgba(244,63,94,0.15)" }}>{error}</div>
          )}

          {success && (
            <div style={{ padding: "0.7rem 1rem", backgroundColor: "var(--accent-subtle)", color: "var(--accent)", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem", border: "1px solid var(--border-focus)" }}>{success}</div>
          )}

          {isDirty && (
            <div style={{ padding: "0.5rem 0.85rem", backgroundColor: "#fef3c7", color: "#92400e", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.82rem", border: "1px solid #fde68a", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              You have unsaved changes
            </div>
          )}

          <form onSubmit={handleSave}>
            <style dangerouslySetInnerHTML={{__html: `
              .edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
              .edit-grid .card-full { grid-column: 1 / -1; }
              @media (max-width: 768px) { .edit-grid { grid-template-columns: 1fr; } }
            `}} />

            <div className="edit-grid">
              {/* Profile Images — Full Width */}
              <div className="form-card card-full" style={{ padding: "1.5rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.3rem" }}>Profile Images</h2>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Your avatar and cover image appear on your channel page</p>

                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem", zIndex: 1, flexShrink: 0 }}>
                    <div
                      onClick={() => avatarInputRef.current?.click()}
                      style={{ width: 100, height: 100, borderRadius: "50%", backgroundColor: "var(--elevated)", border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", transition: "border-color 0.2s" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--accent)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border)")}
                    >
                      {avatarPreview ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      )}
                    </div>
                    <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Click to change avatar</span>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", opacity: 0.7 }}>200x200px, square</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div
                      onClick={() => coverInputRef.current?.click()}
                      className="upload-zone"
                      style={{ width: "100%", height: 120, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", position: "relative" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--accent)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "")}
                    >
                      {coverPreview ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={coverPreview} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "var(--radius-md)" }} />
                      ) : (
                        <>
                          <div className="upload-zone-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                          </div>
                          <p className="upload-zone-label">Cover Image</p>
                        </>
                      )}
                    </div>
                    <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} style={{ display: "none" }} />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Recommended: 1200x300px</span>
                  </div>
                </div>
              </div>

              {/* Personal Info */}
              <div className="form-card" style={{ padding: "1.5rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.3rem" }}>Personal Information</h2>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Manage your public profile details</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Full Name</label>
                    <input type="text" className="input" style={{ width: "100%", boxSizing: "border-box" }} value={fullName} onChange={(e) => { setFullName(e.target.value); markDirty(); }} required />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Username</label>
                    <input type="text" className="input" style={{ width: "100%", boxSizing: "border-box", opacity: 0.6, cursor: "not-allowed" }} value={user.username} readOnly />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Username cannot be changed</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Email</label>
                    <input type="email" className="input" style={{ width: "100%", boxSizing: "border-box" }} value={email} onChange={(e) => { setEmail(e.target.value); markDirty(); }} required />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)" }}>Bio</label>
                      <span style={{ fontSize: "0.72rem", color: bioColor, fontWeight: 500 }}>{bio.length}/500</span>
                    </div>
                    <textarea
                      className="input"
                      style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", minHeight: 80 }}
                      value={bio}
                      onChange={(e) => { if (e.target.value.length <= 500) { setBio(e.target.value); markDirty(); } }}
                      maxLength={500}
                      rows={3}
                      placeholder="About you"
                    />
                    <div style={{ width: "100%", height: 3, backgroundColor: "var(--elevated)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(bioPercent, 100)}%`, height: "100%", backgroundColor: bioColor, borderRadius: 99, transition: "width 0.2s, background-color 0.2s" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="form-card" style={{ padding: "1.5rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.3rem" }}>Social Links</h2>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Add links to your social profiles — they&apos;ll appear on your channel page</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {socialFields.map((field) => {
                    const handle = field.value ? extractHandle(field.value) : "";
                    const valid = isValidUrl(field.value);
                    return (
                      <div key={field.label} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span style={{ color: "var(--text-muted)" }}>{field.icon}</span>
                          {field.label}
                        </label>
                        <div style={{ position: "relative" }}>
                          <input
                            type="url"
                            className="input"
                            style={{ width: "100%", boxSizing: "border-box", paddingRight: field.value ? "2rem" : undefined }}
                            value={field.value}
                            onChange={(e) => { field.setter(e.target.value); markDirty(); }}
                            placeholder={field.placeholder}
                          />
                          {field.value && (
                            <span style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.85rem" }}>
                              {valid ? "✅" : "❌"}
                            </span>
                          )}
                        </div>
                        {field.value && handle && (
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Profile: {handle}</span>
                        )}
                        {field.value && !valid && (
                          <span style={{ fontSize: "0.72rem", color: "var(--accent-warm)" }}>Please enter a valid URL</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <Link href={`/channel/${user.username}`} className="btn btn-ghost" style={{ padding: "0.7rem 1.5rem", borderRadius: "var(--radius-md)", textDecoration: "none", fontSize: "0.9rem" }}
                onClick={(e) => { if (isDirty && !confirm("You have unsaved changes. Are you sure you want to leave?")) e.preventDefault(); }}>
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={saving || !isDirty} style={{ padding: "0.7rem 2rem", borderRadius: "var(--radius-md)", fontSize: "0.9rem", opacity: !isDirty ? 0.6 : 1 }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
