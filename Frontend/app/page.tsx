"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageMeta } from "@/src/components/PageMeta";
import SocialLoginButtons from "@/src/components/SocialLoginButtons";
import { useAuthStore } from "@/src/store/useAuthStore";
import { useToastStore } from "@/src/store/useToastStore";
import { api } from "@/src/services/api";
import VideoCard, { type VideoCardData } from "@/src/components/VideoCard";

type VideoResult = VideoCardData;


function HomeContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const pushToast = useToastStore((s) => s.push);
  const searchParams = useSearchParams();

  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortType = searchParams.get("sortType") || "desc";

  const { data: videosResp, isLoading: videosLoading } = useQuery({
    queryKey: ["home-videos", isAuthenticated, sortBy, sortType],
    queryFn: async () => {
      const res = await api.get(
        `/videos?limit=50&sortBy=${sortBy}&sortType=${sortType}`,
      );
      return res.data;
    },
    enabled: !!isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const videos: VideoResult[] = videosResp?.data?.docs || [];

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const msg = sessionStorage.getItem("_welcome");
      if (msg === "new") {
        pushToast("Welcome! Your account has been created successfully.", "success");
      } else if (msg === "back") {
        pushToast("Welcome back!");
      }
      sessionStorage.removeItem("_welcome");
    }
  }, [authLoading, isAuthenticated, pushToast]);

  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <PageMeta
          title="Home"
          description="Watch, share, and connect on VideoTube."
        />
        <div
          className="content-max"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.5rem",
            width: "100%",
            maxWidth: 1400,
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <div
                className="skeleton"
                style={{
                  aspectRatio: "16/9",
                  borderRadius: "var(--radius-md)",
                }}
              />
              <div
                className="skeleton"
                style={{ width: "80%", height: 14, borderRadius: 6 }}
              />
              <div
                className="skeleton"
                style={{ width: "50%", height: 12, borderRadius: 6 }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-primary)",
          padding: "2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{
            scale: [0.6, 1.2, 0.9, 1.1, 0.95],
            opacity: [0, 0.08, 0.05, 0.08, 0.06],
          }}
          transition={{
            duration: 8,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "mirror",
          }}
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            backgroundColor: "var(--accent)",
            filter: "blur(120px)",
            top: "-10%",
            left: "-10%",
            pointerEvents: "none",
          }}
        />
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{
            scale: [0.6, 1.1, 0.85, 1.05, 0.9],
            opacity: [0, 0.06, 0.04, 0.06, 0.05],
          }}
          transition={{
            duration: 10,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "mirror",
            delay: 1,
          }}
            style={{
              position: "absolute",
              width: 500,
              height: 500,
              borderRadius: "50%",
              backgroundColor: "var(--accent-warm)",
              filter: "blur(100px)",
              bottom: "-15%",
              right: "-10%",
              pointerEvents: "none",
            }}
        />
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{
            scale: [0.6, 1.15, 0.8, 1.1, 0.85],
            opacity: [0, 0.05, 0.03, 0.05, 0.04],
          }}
          transition={{
            duration: 12,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "mirror",
            delay: 2,
          }}
            style={{
              position: "absolute",
              width: 400,
              height: 400,
              borderRadius: "50%",
              backgroundColor: "var(--accent-hover)",
              filter: "blur(80px)",
              top: "40%",
              left: "60%",
              pointerEvents: "none",
            }}
        />

        <motion.div
          initial={{ scale: 0, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 160,
            damping: 12,
            mass: 1.2,
          }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background:
              "linear-gradient(135deg, var(--accent) 0%, var(--accent-warm) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              "0 0 40px rgba(255,59,48,0.25), 0 8px 20px rgba(255,59,48,0.15)",
            marginBottom: "1.2rem",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: "center", marginBottom: "0.4rem" }}
        >
          <h1
            style={{
              fontSize: "clamp(1.3rem, 3.5vw, 1.8rem)",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            <span style={{ color: "var(--accent-text)" }}>Video</span>Tube
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{
            color: "var(--text-muted)",
            fontSize: "clamp(0.78rem, 1.4vw, 0.88rem)",
            maxWidth: 380,
            textAlign: "center",
            lineHeight: 1.5,
            marginBottom: "1.8rem",
          }}
        >
          Watch, share, and connect.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: "100%", maxWidth: 360 }}
        >
          <SocialLoginButtons />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: "1.2rem 0",
            }}
          >
            <div
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, var(--border), transparent)",
              }}
            />
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              or
            </span>
            <div
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, var(--border), transparent)",
              }}
            />
          </div>

          <Link
            href="/login"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: 46,
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 10,
              background:
                "linear-gradient(135deg, var(--accent) 0%, var(--accent-warm) 100%)",
              color: "#fff",
              textDecoration: "none",
              boxShadow: "0 3px 16px rgba(255,59,48,0.25)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 5px 22px rgba(255,59,48,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 3px 16px rgba(255,59,48,0.25)";
            }}
          >
            Sign in
          </Link>

          <Link
            href="/register"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: 46,
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
              textDecoration: "none",
              border: "1px solid var(--border)",
              backgroundColor: "var(--card)",
              transition:
                "border-color 0.15s ease, background-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.backgroundColor = "rgba(255,59,48,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.backgroundColor = "var(--card)";
            }}
          >
            Create account
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          style={{
            position: "absolute",
            bottom: "2rem",
            color: "var(--text-muted)",
            fontSize: 11,
            letterSpacing: "0.05em",
          }}
        >
          &copy; {new Date().getFullYear()} VideoTube
        </motion.p>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Home"
        description="Watch, share, and connect on VideoTube."
      />

      {videosLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <div
                className="skeleton"
                style={{
                  aspectRatio: "16/9",
                  borderRadius: "var(--radius-md)",
                }}
              />
              <div
                className="skeleton"
                style={{ width: "80%", height: 14, borderRadius: 6 }}
              />
              <div
                className="skeleton"
                style={{ width: "50%", height: 12, borderRadius: 6 }}
              />
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            padding: "2rem",
          }}
        >
          <p
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: "0.5rem",
            }}
          >
            No videos yet
          </p>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>
            Upload your first video to get started
          </p>
        </div>
      ) : (
        <div
          className="content-max"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {(Array.isArray(videos) ? videos : []).map((v) => (
            <div key={v._id}>
              <VideoCard video={v} variant="premium" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
