import { ImageResponse } from "next/og";

export const alt = "VideoTube";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            boxShadow: "0 0 60px rgba(255,59,48,0.3)",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            margin: 0,
            color: "#fff",
          }}
        >
          Video<span style={{ color: "#FF3B30" }}>Tube</span>
        </h1>
        <p
          style={{
            fontSize: 24,
            color: "#888",
            marginTop: 8,
          }}
        >
          Discover, watch, and share videos
        </p>
      </div>
    ),
    { ...size }
  );
}
