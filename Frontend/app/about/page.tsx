"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PageMeta } from "@/src/components/PageMeta";
import { api } from "@/src/services/api";

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const features = [
  {
    title: "Browse Without Boundaries",
    desc: "Discover videos across every genre. Our smart feed learns what you love and brings you more of it.",
  },
  {
    title: "Watch Anywhere, Anytime",
    desc: "Seamless streaming on desktop, tablet, or phone. Pick up right where you left off across all devices.",
  },
  {
    title: "Build Your Library",
    desc: "Save videos to custom playlists, queue them with Watch Later, and organise your favourites your way.",
  },
  {
    title: "Join the Conversation",
    desc: "Comment on videos, reply to others, and be part of the community.",
  },
  {
    title: "Support Creators",
    desc: "Subscribe to channels, like videos, and share content that deserves more eyes.",
  },
  {
    title: "Stay in the Loop",
    desc: "Real-time notifications for new uploads, replies, and activity across your channel.",
  },
  {
    title: "Your Channel, Your Way",
    desc: "Customise your profile, manage content from a single dashboard, and track performance with analytics.",
  },
  {
    title: "Privacy First",
    desc: "Secure login with OTP verification, session management, and no tracking scripts.",
  },
];

const techStack = [
  "Node.js",
  "Express.js",
  "MongoDB",
  "Redis",
  "Cloudinary",
  "Brevo Email API",
  "OTP Verification",
  "JWT Authentication",
  "WebSockets / SSE",
  "Docker",
  "Render",
  "Vercel",
];

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={fadeUp}
      className="form-card"
      style={{ padding: "1.75rem" }}
    >
      {children}
    </motion.div>
  );
}

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "var(--radius-sm)",
        backgroundColor: "var(--accent-subtle)",
        color: "var(--accent)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "0.75rem",
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: "1.05rem",
        fontWeight: 700,
        color: "var(--text-primary)",
        margin: "0 0 0.75rem 0",
      }}
    >
      {children}
    </h2>
  );
}

function SectionText({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: "0.9rem",
        color: "var(--text-secondary)",
        lineHeight: 1.7,
        margin: "0 0 0.75rem 0",
      }}
    >
      {children}
    </p>
  );
}

function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  multiline,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  error: string | undefined;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label
        htmlFor={name}
        style={{
          fontSize: "0.85rem",
          fontWeight: 500,
          color: "var(--text-primary)",
        }}
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`input${error ? " input-error" : ""}`}
          style={{
            height: 130,
            padding: "0.75rem var(--sp-4)",
            resize: "vertical",
          }}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`input${error ? " input-error" : ""}`}
        />
      )}
      {error && (
        <span style={{ fontSize: "0.78rem", color: "var(--error)" }}>
          {error}
        </span>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: "spin 0.7s linear infinite" }}
    >
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

export default function AboutPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Please enter a valid email";
    if (!form.subject.trim()) e.subject = "Subject is required";
    if (!form.message.trim()) e.message = "Message is required";
    else if (form.message.length > 2000)
      e.message = "Message must be under 2000 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name])
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
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
    <div className="content-max" style={{ padding: "0" }}>
      <PageMeta
        title="About"
        description="Learn about VideoTube — our mission, features, and how to get in touch."
      />

      <motion.div variants={stagger} initial="hidden" animate="visible">
        {/* Hero Section */}
        <motion.div
          variants={fadeUp}
          style={{
            background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
            padding: "5rem 2rem 4rem",
            textAlign: "center",
            color: "#fff",
          }}
        >
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <h1
              style={{
                fontSize: "clamp(2rem, 5vw, 3rem)",
                fontWeight: 800,
                marginBottom: "1rem",
                lineHeight: 1.2,
              }}
            >
              VideoTube
            </h1>
            <p
              style={{
                fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
                opacity: 0.9,
                lineHeight: 1.6,
                maxWidth: 600,
                margin: "0 auto 2rem",
              }}
            >
              A modern, open video-sharing platform built for creators and
              viewers alike. No algorithmic manipulation, no unnecessary clutter
              — just content and community.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "2rem",
              }}
            >
              {[
                { label: "Users", value: "Active" },
                { label: "Tech Stack", value: "Full-Stack" },
                { label: "Status", value: "Prototype" },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      opacity: 0.75,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            {/* Mission */}
            <SectionCard>
              <SectionIcon>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </SectionIcon>
              <SectionTitle>Our Mission</SectionTitle>
              <SectionText>
                Our goal is to provide a simple, modern, and community-driven
                video-sharing platform where creators have full control over
                their content and viewers enjoy a distraction-free experience.
                We believe in transparency, privacy, and putting the community
                first.
              </SectionText>
            </SectionCard>

            {/* Features */}
            <SectionCard>
              <SectionIcon>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </SectionIcon>
              <SectionTitle>Features</SectionTitle>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {features.map((f) => (
                  <div
                    key={f.title}
                    style={{
                      padding: "1rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        color: "var(--text-primary)",
                        marginBottom: "0.35rem",
                      }}
                    >
                      {f.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                      }}
                    >
                      {f.desc}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Cross-Platform */}
            <SectionCard>
              <SectionIcon>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </SectionIcon>
              <SectionTitle>Across the Web</SectionTitle>
              <SectionText>
                VideoTube is built for the open web — no app store required.
                Everything works in your browser, on any operating system.
              </SectionText>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "1rem",
                  marginTop: "0.5rem",
                }}
              >
                {[
                  {
                    title: "Cross-Platform",
                    desc: "Works on Windows, macOS, Linux, Android, and iOS.",
                  },
                  {
                    title: "Share Freely",
                    desc: "Share any video with a simple link. No app-specific sharing.",
                  },
                  {
                    title: "Adaptive Streaming",
                    desc: "Smooth playback at any connection speed.",
                  },
                  {
                    title: "Web-Native",
                    desc: "Standard web formats that work with every modern browser.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    style={{
                      padding: "1rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        color: "var(--text-primary)",
                        marginBottom: "0.35rem",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Privacy & Security */}
            <SectionCard>
              <SectionIcon>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </SectionIcon>
              <SectionTitle>Privacy & Security</SectionTitle>
              <SectionText>
                Your privacy matters to us. We use industry-standard encryption
                for all data in transit and store passwords using secure hashing
                algorithms. Session tokens are managed through httpOnly cookies,
                and sensitive actions require OTP verification. We do not sell
                your personal data to third parties.
              </SectionText>
            </SectionCard>

            {/* Prototype Notice */}
            <SectionCard>
              <SectionIcon>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </SectionIcon>
              <SectionTitle>Prototype Project Notice</SectionTitle>
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--accent-warm-light, #fef2f2)",
                  border: "1px solid #fecaca",
                  marginBottom: "1rem",
                }}
              >
                <p
                  style={{
                    fontSize: "0.88rem",
                    color: "#991b1b",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  Student Prototype — Not a Commercial Product
                </p>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#7f1d1d",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  VideoTube is a student-built prototype created for learning,
                  experimentation, and portfolio purposes. It is not a
                  commercial production platform.
                </p>
              </div>
              <SectionText>
                This project demonstrates the implementation of a modern
                full-stack video sharing platform using these technologies:
              </SectionText>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.4rem",
                  marginBottom: "1rem",
                }}
              >
                {techStack.map((tech) => (
                  <span
                    key={tech}
                    style={{
                      padding: "0.2rem 0.6rem",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--accent-subtle)",
                      color: "var(--accent)",
                      fontSize: "0.78rem",
                      fontWeight: 500,
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
              <SectionText>
                Because this project relies on free-tier services, some
                resources are intentionally restricted:
              </SectionText>
              <ul
                style={{
                  paddingLeft: "1.25rem",
                  margin: "0 0 1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.3rem",
                  lineHeight: 1.6,
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                }}
              >
                <li>Limited OTP requests (15 per user per day)</li>
                <li>Limited storage and upload size</li>
                <li>Limited bandwidth</li>
                <li>Slower cold starts</li>
                <li>Rate limiting on API endpoints</li>
                <li>Limited background processing</li>
              </ul>
              <SectionText>
                Please avoid uploading unnecessary large files or performing
                heavy automated operations. Your cooperation helps keep the
                project available for everyone.
              </SectionText>
            </SectionCard>

            {/* Production Notice */}
            <SectionCard>
              <SectionIcon>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </SectionIcon>
              <SectionTitle>Production Readiness</SectionTitle>
              <SectionText>
                While VideoTube is functional as a prototype, a production-grade
                version would require the following improvements:
              </SectionText>
              <div
                style={{
                  display: "grid",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                {[
                  {
                    title: "Horizontal Scaling",
                    desc: "Multiple app instances behind a load balancer with proper database replication and sharding.",
                  },
                  {
                    title: "CDN Integration",
                    desc: "Global content delivery network for video streaming, with edge caching for static assets.",
                  },
                  {
                    title: "Advanced Monitoring",
                    desc: "Comprehensive observability with metrics, distributed tracing, and structured logging (e.g., Datadog, Grafana).",
                  },
                  {
                    title: "Database Optimisation",
                    desc: "Read replicas, connection pooling, query optimisation, and regular performance audits.",
                  },
                  {
                    title: "Disaster Recovery",
                    desc: "Automated backups, point-in-time recovery, multi-region failover, and incident response playbooks.",
                  },
                  {
                    title: "Security Hardening",
                    desc: "Regular penetration testing, DDoS protection, WAF, rate limiting at infrastructure level, and security audit trails.",
                  },
                  {
                    title: "CI/CD Pipeline",
                    desc: "Automated testing, staging environments, blue-green deployments, and rollback capabilities.",
                  },
                  {
                    title: "Compliance",
                    desc: "GDPR, CCPA, COPPA compliance, data processing agreements, and privacy policy enforcement.",
                  },
                  {
                    title: "Payment Integration",
                    desc: "Monetisation features including ad revenue sharing, channel memberships, and tip jar functionality.",
                  },
                  {
                    title: "Moderation Tools",
                    desc: "Automated content moderation, reporting workflows, appeals process, and community guidelines enforcement.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    style={{
                      padding: "0.85rem 1rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        color: "var(--text-primary)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: "0.5rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor:
                    "color-mix(in srgb, var(--accent) 8%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                  fontSize: "0.82rem",
                  color: "var(--accent)",
                  lineHeight: 1.6,
                  textAlign: "center",
                }}
              >
                This project demonstrates the technical foundation. Production
                deployment would require the enhancements listed above.
              </div>
            </SectionCard>

            {/* Contact */}
            <SectionCard>
              <SectionIcon>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </SectionIcon>
              <SectionTitle>Contact & Support</SectionTitle>
              <SectionText>
                We value your feedback. Whether you have a question, found a
                bug, have a feature suggestion, or need support, send us a
                message.
              </SectionText>

              <form
                onSubmit={handleSubmit}
                noValidate
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "1.25rem",
                  }}
                >
                  <FormField
                    label="Full Name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    error={errors.name}
                    placeholder="Enter your full name"
                  />
                  <FormField
                    label="Email Address"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    error={errors.email}
                    placeholder="Enter your email address"
                  />
                </div>
                <FormField
                  label="Subject"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  error={errors.subject}
                  placeholder="How can we help you?"
                />
                <FormField
                  label="Message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  error={errors.message}
                  placeholder="Write your message here..."
                  multiline
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={status === "sending"}
                      style={{
                        minWidth: 160,
                        padding: "0 1.5rem",
                        height: 46,
                        fontSize: "0.95rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                      }}
                    >
                      {status === "sending" ? (
                        <>
                          <Spinner /> Sending...
                        </>
                      ) : (
                        "Send Message"
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleClear}
                      style={{ height: 46, padding: "0 1.25rem" }}
                    >
                      Clear
                    </button>
                  </div>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      color:
                        form.message.length > 2000
                          ? "var(--error)"
                          : "var(--text-muted)",
                    }}
                  >
                    {form.message.length}/2000
                  </span>
                </div>
                {status === "sent" && (
                  <div
                    style={{
                      padding: "0.85rem 1rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor:
                        "color-mix(in srgb, var(--success) 12%, transparent)",
                      border: "1px solid var(--success)",
                      color: "var(--success)",
                      fontSize: "0.88rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Your message has been sent successfully.
                  </div>
                )}
                {status === "error" && (
                  <div
                    style={{
                      padding: "0.85rem 1rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor:
                        "color-mix(in srgb, var(--error) 12%, transparent)",
                      border: "1px solid var(--error)",
                      color: "var(--error)",
                      fontSize: "0.88rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    Something went wrong. Please try again.
                  </div>
                )}
              </form>
            </SectionCard>
          </div>

          <motion.div
            variants={fadeUp}
            style={{
              textAlign: "center",
              marginTop: "3rem",
              padding: "1.5rem",
              borderTop: "1px solid var(--border)",
            }}
          >
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}
            >
              &copy; {new Date().getFullYear()} VideoTube. All rights reserved.
            </p>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginTop: "0.3rem",
              }}
            >
              Made for people who love watching and sharing videos.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
