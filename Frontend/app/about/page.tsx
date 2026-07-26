"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageMeta } from "@/src/components/PageMeta";

const features = [
  { title: "Video Upload & Streaming", desc: "Upload videos in various formats with automatic transcoding. Stream smoothly with adaptive bitrate playback." },
  { title: "User Authentication", desc: "Secure sign-up and login with email or mobile. OTP verification for sensitive actions and session management." },
  { title: "Playlists", desc: "Create, edit, and organise playlists. Set visibility to public, unlisted, or private." },
  { title: "Comments", desc: "Engage with creators and the community through threaded comments on every video." },
  { title: "Likes", desc: "Show appreciation for videos with a simple like. Use watch later to save content for later." },
  { title: "Subscriptions", desc: "Follow your favourite creators and see their latest uploads in a dedicated feed." },
  { title: "Notifications", desc: "Get notified about new uploads, comments, and activity on your channel." },
  { title: "Creator Dashboard", desc: "Manage your content, track analytics, and customise your channel from a single panel." },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const childVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function AboutPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Please enter a valid email";
    if (!form.subject.trim()) e.subject = "Subject is required";
    if (!form.message.trim()) e.message = "Message is required";
    else if (form.message.length > 2000) e.message = "Message must be under 2000 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus("sending");
    try {
      const mailto = `mailto:videotube044.official@gmail.com?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`)}`;
      window.open(mailto, "_blank");
      await new Promise((r) => setTimeout(r, 800));
      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setStatus("error");
    }
  };

  const handleClear = () => {
    setForm({ name: "", email: "", subject: "", message: "" });
    setErrors({});
    setStatus("idle");
  };

  return (
    <div className="content-max" style={{ padding: "3rem 2rem 5rem" }}>
      <PageMeta title="About" description="Learn about VideoTube — our mission, features, and how to get in touch." />

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={childVariants} style={{ marginBottom: "3rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.4rem" }}>About</h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", maxWidth: 560, lineHeight: 1.6 }}>
            Learn about VideoTube — our mission, features, and how to get in touch.
          </p>
        </motion.div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <motion.div variants={childVariants} className="form-card" style={{ padding: "1.75rem" }}>
            <SectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </SectionIcon>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.75rem 0" }}>About VideoTube</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              VideoTube is a modern video-sharing platform built for creators and viewers alike. Whether you are here to share your work, learn something new, or just browse, VideoTube gives you the tools to do it on your terms.
            </p>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0.75rem 0 0" }}>
              No algorithmic manipulation, no unnecessary clutter — just a straight-forward experience centred around the content and the people who make it.
            </p>
          </motion.div>

          <motion.div variants={childVariants} className="form-card" style={{ padding: "1.75rem" }}>
            <SectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </SectionIcon>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.75rem 0" }}>Our Mission</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              Our goal is to provide a simple, modern, and community-driven video-sharing platform where creators have full control over their content and viewers enjoy a distraction-free experience. We believe in transparency, privacy, and putting the community first.
            </p>
          </motion.div>

          <motion.div variants={childVariants} className="form-card" style={{ padding: "1.75rem" }}>
            <SectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </SectionIcon>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 1rem 0" }}>Features</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
              {features.map((f) => (
                <div key={f.title} style={{ padding: "1rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)", marginBottom: "0.35rem" }}>{f.title}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={childVariants} className="form-card" style={{ padding: "1.75rem" }}>
            <SectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </SectionIcon>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.75rem 0" }}>Privacy & Security</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
              Your privacy matters to us. We use industry-standard encryption for all data in transit and store passwords using secure hashing algorithms. Session tokens are managed through httpOnly cookies, and sensitive actions require OTP verification. We do not sell your personal data to third parties.
            </p>
          </motion.div>

          <motion.div variants={childVariants} className="form-card" style={{ padding: "1.75rem" }}>
            <SectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </SectionIcon>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.75rem 0" }}>Contact & Support</h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1.25rem" }}>
              We value your feedback and are always looking to improve VideoTube. Whether you have a question, found a bug, have a feature suggestion, or need support, send us a message and our team will review it as soon as possible.
            </p>

            <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <FormField label="Full Name" name="name" value={form.name} onChange={handleChange} error={errors.name} placeholder="John Doe" />
                <FormField label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} placeholder="john@example.com" />
              </div>
              <FormField label="Subject" name="subject" value={form.subject} onChange={handleChange} error={errors.subject} placeholder="How can we help?" />
              <FormField label="Message" name="message" value={form.message} onChange={handleChange} error={errors.message} placeholder="Write your message here..." multiline />
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button type="submit" className="btn-primary" disabled={status === "sending"} style={{ minWidth: 140 }}>
                  {status === "sending" ? "Sending..." : "Send Message"}
                </button>
                <button type="button" className="btn-secondary" onClick={handleClear}>
                  Clear
                </button>
              </div>
              {status === "sent" && (
                <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--success-subtle)", border: "1px solid var(--success)", color: "var(--success)", fontSize: "0.88rem" }}>
                  Your message has been sent. We will get back to you as soon as possible.
                </div>
              )}
              {status === "error" && (
                <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--error-subtle)", border: "1px solid var(--error)", color: "var(--error)", fontSize: "0.88rem" }}>
                  Something went wrong. Please try again or email us directly at videotube044.official@gmail.com.
                </div>
              )}
            </form>
          </motion.div>
        </div>

        <motion.div variants={childVariants} style={{ textAlign: "center", marginTop: "3rem", padding: "1.5rem", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6 }}>&copy; {new Date().getFullYear()} VideoTube. All rights reserved.</p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>Made for people who love watching and sharing videos.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "var(--radius-sm)",
      backgroundColor: "var(--accent-subtle)", color: "var(--accent)",
      display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "0.75rem",
    }}>
      {children}
    </div>
  );
}

function FormField({
  label, name, type = "text", value, onChange, error, placeholder, multiline,
}: {
  label: string; name: string; type?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; error: string | undefined; placeholder?: string; multiline?: boolean;
}) {
  const inputClass = `input${error ? " input-error" : ""}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label htmlFor={name} style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)" }}>{label}</label>
      {multiline ? (
        <textarea
          id={name} name={name} value={value} onChange={onChange} placeholder={placeholder}
          className={inputClass}
          style={{ height: 120, padding: "0.75rem var(--sp-4)", resize: "vertical" }}
        />
      ) : (
        <input id={name} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} className={inputClass} />
      )}
      {error && <span style={{ fontSize: "0.78rem", color: "var(--error)" }}>{error}</span>}
    </div>
  );
}
