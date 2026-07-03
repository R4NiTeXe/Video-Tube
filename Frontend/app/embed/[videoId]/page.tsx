"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { api } from "@/src/services/api";

interface VideoData {
  _id: string;
  videoFile: string;
  thumbnail: string;
  title: string;
  duration: number;
  owner: { fullName: string; username: string };
}

export default function EmbedPage() {
  const params = useParams();
  const videoId = params.videoId as string;
  const [video, setVideo] = useState<VideoData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoId) return;
    api.get(`/videos/${videoId}`).then((res) => setVideo(res.data.data)).catch(() => {});
  }, [videoId]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * videoRef.current.duration;
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!video) {
    return (
      <div style={{ width: "100vw", height: "100vh", backgroundColor: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#666", fontSize: "0.9rem" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", backgroundColor: "#000", position: "relative", overflow: "hidden" }}>
      <video
        ref={videoRef}
        src={video.videoFile}
        poster={video.thumbnail}
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        style={{ width: "100%", height: "100%", objectFit: "contain", cursor: "pointer" }}
      />

      {/* Play overlay */}
      {!isPlaying && (
        <div
          onClick={togglePlay}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
        padding: "1rem 0.75rem 0.5rem",
      }}>
        {/* Progress bar */}
        <div
          onClick={handleSeek}
          style={{
            width: "100%", height: 4, backgroundColor: "rgba(255,255,255,0.3)",
            borderRadius: 2, cursor: "pointer", marginBottom: "0.5rem",
          }}
        >
          <div style={{
            width: `${progress}%`, height: "100%", backgroundColor: "#FF3B30",
            borderRadius: 2, transition: "width 0.1s",
          }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button onClick={togglePlay} style={{ background: "none", border: "none", cursor: "pointer", color: "white" }}>
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            <button onClick={toggleMute} style={{ background: "none", border: "none", cursor: "pointer", color: "white" }}>
              {isMuted || volume === 0 ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
              )}
            </button>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.75rem" }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem" }}>
            {video.title}
          </span>
        </div>
      </div>
    </div>
  );
}
