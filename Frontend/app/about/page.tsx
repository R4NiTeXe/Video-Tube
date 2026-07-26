"use client";

import { motion } from "framer-motion";
import { PageMeta } from "@/src/components/PageMeta";
import Link from "next/link";

const sections = [
  {
    id: "about",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    ),
    title: "About VideoTube",
    content: (
      <>
        <p>
          VideoTube is a video-sharing platform where creators upload, share, and connect with their audience.
          Whether you are here to watch, learn, or build a channel, VideoTube gives you the tools to do it your way.
        </p>
        <p>
          The platform was built for people who want more control over their content and their viewing experience.
          No algorithms pushing things you did not ask for. No clutter. Just videos, channels, and the community
          around them.
        </p>
      </>
    ),
  },
  {
    id: "features",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    title: "Features",
    content: (
      <ul style={{ paddingLeft: "1.25rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem", lineHeight: 1.6 }}>
        <li><strong>Upload and manage videos</strong> &ndash; Add titles, descriptions, thumbnails, and organise your content from the Creator Studio.</li>
        <li><strong>Community posts</strong> &ndash; Share text updates, images, and polls with your subscribers. No video required.</li>
        <li><strong>Playlists</strong> &ndash; Group videos together, keep them public, unlisted, or private.</li>
        <li><strong>Watch later and history</strong> &ndash; Save videos for later and go back to things you have watched.</li>
        <li><strong>Subscriptions</strong> &ndash; Follow channels you like and see their latest uploads in one place.</li>
        <li><strong>Video preview on hover</strong> &ndash; Hover over a thumbnail to peek at the video before clicking.</li>
        <li><strong>Multi-language support</strong> &ndash; Switch the interface to your preferred language.</li>
        <li><strong>OTP-based security</strong> &ndash; Password changes and sensitive actions require a one-time code sent to your email or phone.</li>
        <li><strong>Active session management</strong> &ndash; See which devices are logged into your account and revoke access you do not recognise.</li>
      </ul>
    ),
  },
  {
    id: "contact",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    title: "Contact & Support",
    content: (
      <>
        <p>
          If something is not working right, or if you have a question that is not answered here, send us an email.
          We read every message and try to get back to you within a day or two.
        </p>
        <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "var(--accent-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-focus)" }}>
          <p style={{ fontWeight: 600, marginBottom: "0.3rem" }}>Email</p>
          <a href="mailto:videotube044.official@gmail.com" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "underline" }}>
            videotube044.official@gmail.com
          </a>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
            This is the same address we use to send verification codes. If you email us, mention your account username so we can look things up faster.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "report",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
      </svg>
    ),
    title: "Report a Bug",
    content: (
      <>
        <p>
          Found something that does not work the way it should? Let us know and we will fix it.
        </p>
        <p style={{ marginTop: "0.75rem" }}>
          When reporting a bug, please include:
        </p>
        <ul style={{ paddingLeft: "1.25rem", margin: "0.5rem 0 0", display: "flex", flexDirection: "column", gap: "0.3rem", lineHeight: 1.6 }}>
          <li>What you were trying to do</li>
          <li>What happened instead</li>
          <li>The browser and device you are using</li>
          <li>A screenshot if possible</li>
        </ul>
        <div style={{ marginTop: "1rem" }}>
          <a href="mailto:videotube044.official@gmail.com?subject=Bug%20Report" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "underline" }}>
            videotube044.official@gmail.com
          </a>
        </div>
      </>
    ),
  },
  {
    id: "guidelines",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    title: "Community Guidelines",
    content: (
      <>
        <p>VideoTube is for everyone. Keep these simple rules in mind when you upload or post:</p>
        <ul style={{ paddingLeft: "1.25rem", margin: "0.75rem 0 0", display: "flex", flexDirection: "column", gap: "0.5rem", lineHeight: 1.6 }}>
          <li>Do not upload content you do not own or have permission to use.</li>
          <li>Harassment, hate speech, and threats are not allowed.</li>
          <li>Do not spam, mislead, or impersonate others.</li>
          <li>NSFW or violent content must be clearly marked or kept off the platform.</li>
          <li>Respect others in comments and community posts.</li>
        </ul>
      </>
    ),
  },
  {
    id: "terms",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
      </svg>
    ),
    title: "Terms & Privacy",
    content: (
      <>
        <p>
          By using VideoTube, you agree to store cookies and session data needed to keep you logged in
          and personalise your experience. We do not sell your data to third parties.
        </p>
        <p style={{ marginTop: "0.75rem" }}>
          Your uploaded content remains yours. You grant VideoTube a license to display it on the platform
          so other users can watch it. You can delete your videos or your entire account at any time.
        </p>
        <p style={{ marginTop: "0.75rem" }}>
          We use industry-standard encryption for data in transit and store passwords using hashing algorithms.
          Session tokens are stored in httpOnly cookies where possible.
        </p>
      </>
    ),
  },
  {
    id: "copyright",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M15 9.5a3.5 3.5 0 1 0 0 5"/>
      </svg>
    ),
    title: "Copyright",
    content: (
      <>
        <p>
          VideoTube and the VideoTube logo are protected trademarks. The source code, design, and platform
          infrastructure are the property of the VideoTube project contributors.
        </p>
        <p style={{ marginTop: "0.75rem" }}>
          All video content uploaded to the platform belongs to the respective creators. If you believe your
          copyright has been infringed, contact us at the email below with details of the material in question.
        </p>
        <div style={{ marginTop: "0.75rem" }}>
          <a href="mailto:videotube044.official@gmail.com?subject=Copyright%20Notice" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "underline" }}>
            videotube044.official@gmail.com
          </a>
        </div>
      </>
    ),
  },
];

export default function AboutPage() {
  return (
    <div className="content-max" style={{ padding: "3rem 2rem 5rem" }}>
      <PageMeta
        title="About"
        description="Learn more about VideoTube, its features, and how to get support."
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
            About
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", maxWidth: 560, lineHeight: 1.6 }}>
            Everything you need to know about VideoTube &ndash; from features and contact info to guidelines and legal stuff.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {sections.map((section, i) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="form-card"
              style={{ padding: "1.5rem" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.85rem" }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--accent-subtle)", color: "var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {section.icon}
                </div>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  {section.title}
                </h2>
              </div>
              <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {section.content}
              </div>
            </motion.div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "3rem", padding: "1.5rem", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            &copy; {new Date().getFullYear()} VideoTube. All rights reserved.
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
            Made for people who love watching and sharing videos.
          </p>
          <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" style={{ fontSize: "0.82rem", color: "var(--accent)", textDecoration: "underline" }}>
              Home
            </Link>
            <a href="mailto:videotube044.official@gmail.com" style={{ fontSize: "0.82rem", color: "var(--accent)", textDecoration: "underline" }}>
              Contact
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
