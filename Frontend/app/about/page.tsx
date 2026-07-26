"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageMeta } from "@/src/components/PageMeta";
import { api } from "@/src/services/api";

const features = [
  { title: "Browse Without Boundaries", desc: "Discover videos across every genre — from music and gaming to education and vlogs. Our smart feed learns what you love and brings you more of it." },
  { title: "Watch Anywhere, Anytime", desc: "Seamless streaming on desktop, tablet, or phone. Pick up right where you left off across all your devices with a single account." },
  { title: "Build Your Library", desc: "Save videos to custom playlists, queue them with Watch Later, and organise your favourites your way. Public, unlisted, or private — you decide." },
  { title: "Join the Conversation", desc: "Comment on videos, reply to others, and be part of the community. Every video is a place to share thoughts, ask questions, and connect." },
  { title: "Support Creators", desc: "Show love with a like, subscribe to channels you never want to miss, and share videos that deserve more eyes. Help great content grow." },
  { title: "Stay in the Loop", desc: "Real-time notifications keep you updated on new uploads from your favourite creators, replies to your comments, and activity across your channel." },
  { title: "Your Channel, Your Way", desc: "Customise your profile, manage your content from a single dashboard, and track how your videos perform with built-in analytics." },
  { title: "Privacy First", desc: "Full control over your data. Secure login with OTP verification, session management, and no tracking scripts. What you watch stays yours." },
];

const techStack = [
  "Node.js", "Express.js", "MongoDB", "Redis", "Cloudinary",
  "Brevo Email API", "OTP Verification", "JWT Authentication",
  "WebSockets / Server-Sent Events", "Docker", "Render", "Vercel",
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
      await api.post("/contact", {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
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
          <SectionCard variants={childVariants}>
            <SectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </SectionIcon>
            <SectionTitle>About VideoTube</SectionTitle>
            <SectionText>
              VideoTube is a modern video-sharing platform built for creators and viewers alike. Whether you are here to share your work, learn something new, or just browse, VideoTube gives you the tools to do it on your terms.
            </SectionText>
            <SectionText>
              No algorithmic manipulation, no unnecessary clutter — just a straight-forward experience centred around the content and the people who make it.
            </SectionText>
          </SectionCard>

          <SectionCard variants={childVariants}>
            <SectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </SectionIcon>
            <SectionTitle>Our Mission</SectionTitle>
            <SectionText>
              Our goal is to provide a simple, modern, and community-driven video-sharing platform where creators have full control over their content and viewers enjoy a distraction-free experience. We believe in transparency, privacy, and putting the community first.
            </SectionText>
          </SectionCard>

          <SectionCard variants={childVariants}>
            <SectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </SectionIcon>
            <SectionTitle>Features</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
              {features.map((f) => (
                <div key={f.title} style={{ padding: "1rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)", marginBottom: "0.35rem" }}>{f.title}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard variants={childVariants}>
            <SectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </SectionIcon>
            <SectionTitle>Across the Web</SectionTitle>
            <SectionText>
              VideoTube is built for the open web — no app store required. Everything works in your browser, on any operating system, whether you are on a laptop at home or on your phone during a commute.
            </SectionText>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginTop: "0.5rem" }}>
              {[
                { icon: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22", title: "Cross-Platform", desc: "Works on Windows, macOS, Linux, Android, and iOS. Log in from any device and pick up where you left off." },
                { icon: "M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1 M12 15l5-5M12 15l-5-5M12 15V3", title: "Share Freely", desc: "Share any video with a simple link. No app-specific sharing — just copy the URL and send it anywhere, on any platform." },
                { icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M12 22V12", title: "Adaptive Streaming", desc: "Smooth playback at any connection speed. Video automatically adjusts quality so you never buffer — from HD on Wi-Fi to optimised on mobile data." },
                { icon: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M4 2v20M8 2v4", title: "Content at Your Pace", desc: "Pause, rewind, replay. Speed controls let you learn faster or savour slower. Your progress is remembered across every visit." },
                { icon: "M12 2a10 10 0 1 0 10 10h-10V2z M14 2a10 10 0 0 1 8 8h-8V2z", title: "Web-Native Experience", desc: "No proprietary formats or locked-in ecosystems. Video streams in standard web formats that work with every modern browser out of the box." },
                { icon: "M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-8C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 22c-5.5 0-10-4.5-10-10S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z", title: "Global Reach", desc: "Available worldwide. No regional restrictions on content — upload and watch from anywhere, on any network." },
              ].map((item) => (
                <div key={item.title} style={{ padding: "1rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>{item.title}</div>
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard variants={childVariants}>
            <SectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </SectionIcon>
            <SectionTitle>Privacy & Security</SectionTitle>
            <SectionText>
              Your privacy matters to us. We use industry-standard encryption for all data in transit and store passwords using secure hashing algorithms. Session tokens are managed through httpOnly cookies, and sensitive actions require OTP verification. We do not sell your personal data to third parties.
            </SectionText>
          </SectionCard>

          <SectionCard variants={childVariants}>
            <SectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </SectionIcon>
            <SectionTitle>Prototype Project Notice</SectionTitle>
            <SectionText>
              VideoTube is a student-built prototype created for learning, experimentation, and portfolio purposes.
            </SectionText>
            <SectionText>
              This project demonstrates the implementation of a modern full-stack video sharing platform using technologies such as:
            </SectionText>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
              {techStack.map((tech) => (
                <span key={tech} style={{
                  padding: "0.2rem 0.6rem", borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--accent-subtle)", color: "var(--accent)",
                  fontSize: "0.78rem", fontWeight: 500,
                }}>{tech}</span>
              ))}
            </div>
            <SectionText>
              The application currently relies on several free-tier services. Because of those limitations, some resources are intentionally restricted:
            </SectionText>
            <ul style={{ paddingLeft: "1.25rem", margin: "0 0 1rem", display: "flex", flexDirection: "column", gap: "0.3rem", lineHeight: 1.6, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              <li>Limited OTP requests</li>
              <li>Limited storage</li>
              <li>Limited upload size</li>
              <li>Limited bandwidth</li>
              <li>Slower cold starts</li>
              <li>Rate limiting</li>
              <li>Limited background processing</li>
            </ul>
            <SectionText>
              These restrictions exist only because free development services are being used. Please do not upload unnecessary large files or repeatedly perform heavy operations.
            </SectionText>
            <SectionText>
              If you would like to explore how the application works, feel free to upload a few sample videos, images, or other supported files. However, please avoid excessive uploads or automated testing that could exhaust the available free resources.
            </SectionText>
            <SectionText>
              Your cooperation helps keep the project available for everyone who wants to learn and explore it. Thank you for supporting this student project.
            </SectionText>
            <div style={{
              marginTop: "1rem", padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--accent-subtle)",
              border: "1px solid var(--border-focus)",
              fontSize: "0.82rem",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              textAlign: "center",
            }}>
              This application is intended for learning, demonstration, and portfolio purposes. It is not a commercial production platform.
            </div>
          </SectionCard>

          <SectionCard variants={childVariants}>
            <SectionIcon>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </SectionIcon>
            <SectionTitle>Contact & Support</SectionTitle>
            <SectionText>
              We value your feedback and are always looking to improve VideoTube. Whether you have a question, found a bug, have a feature suggestion, or need support, send us a message and our team will review it as soon as possible.
            </SectionText>

            <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
                <FormField
                  label="Full Name" name="name" value={form.name} onChange={handleChange}
                  error={errors.name} placeholder="Enter your full name"
                />
                <FormField
                  label="Email Address" name="email" type="email" value={form.email} onChange={handleChange}
                  error={errors.email} placeholder="Enter your email address"
                />
              </div>
              <FormField
                label="Subject" name="subject" value={form.subject} onChange={handleChange}
                error={errors.subject} placeholder="How can we help you?"
              />
              <FormField
                label="Message" name="message" value={form.message} onChange={handleChange}
                error={errors.message} placeholder="Write your message here..." multiline
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={status === "sending"}
                    style={{ minWidth: 160, padding: "0 1.5rem", height: 46, fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                  >
                    {status === "sending" ? (
                      <>
                        <Spinner />
                        Sending...
                      </>
                    ) : (
                      "Send Message"
                    )}
                  </button>
                  <button type="button" className="btn-secondary" onClick={handleClear} style={{ height: 46, padding: "0 1.25rem" }}>
                    Clear
                  </button>
                </div>
                <span style={{ fontSize: "0.78rem", color: form.message.length > 2000 ? "var(--error)" : "var(--text-muted)" }}>
                  {form.message.length}/2000
                </span>
              </div>
              {status === "sent" && (
                <div style={{
                  padding: "0.85rem 1rem", borderRadius: "var(--radius-md)",
                  backgroundColor: "color-mix(in srgb, var(--success) 12%, transparent)",
                  border: "1px solid var(--success)", color: "var(--success)",
                  fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "0.5rem",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Your message has been sent successfully. We will get back to you as soon as possible.
                </div>
              )}
              {status === "error" && (
                <div style={{
                  padding: "0.85rem 1rem", borderRadius: "var(--radius-md)",
                  backgroundColor: "color-mix(in srgb, var(--error) 12%, transparent)",
                  border: "1px solid var(--error)", color: "var(--error)",
                  fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "0.5rem",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  Something went wrong. Please try again or email us directly at videotube044.official@gmail.com.
                </div>
              )}
            </form>
          </SectionCard>
        </div>

        <motion.div variants={childVariants} style={{ textAlign: "center", marginTop: "3rem", padding: "1.5rem", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6 }}>&copy; {new Date().getFullYear()} VideoTube. All rights reserved.</p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>Made for people who love watching and sharing videos.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}

function SectionCard({ variants, children }: { variants: typeof childVariants; children: React.ReactNode }) {
  return (
    <motion.div variants={variants} className="form-card" style={{ padding: "1.75rem" }}>
      {children}
    </motion.div>
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.75rem 0" }}>
      {children}
    </h2>
  );
}

function SectionText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 0.75rem 0" }}>
      {children}
    </p>
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
          style={{ height: 130, padding: "0.75rem var(--sp-4)", resize: "vertical" }}
        />
      ) : (
        <input id={name} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} className={inputClass} />
      )}
      {error && <span style={{ fontSize: "0.78rem", color: "var(--error)" }}>{error}</span>}
    </div>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.7s linear infinite" }}>
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}
