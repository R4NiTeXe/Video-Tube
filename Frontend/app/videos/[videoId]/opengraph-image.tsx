import { ImageResponse } from "next/og";
import { API_FULL_URL } from "@/src/services/config";

export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "Video on VideoTube";

export default async function Image({
  params,
}: {
  params: Promise<{ videoId: string }>;
}) {
  const { videoId } = await params;
  let title = "Video on VideoTube";
  let thumbnail: string | null = null;

  try {
    const res = await fetch(`${API_FULL_URL}/videos/${videoId}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      title = data?.data?.title || title;
      thumbnail = data?.data?.thumbnail || null;
    }
  } catch {
    // API unreachable — use defaults.
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #050505 0%, #1a1a2e 50%, #16213e 100%)",
          justifyContent: "center",
          alignItems: "center",
          padding: "48px",
        }}
      >
        {thumbnail && (
          <img
            src={thumbnail}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.3,
            }}
          />
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 24,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: -0.5,
            }}
          >
            Video
            <span style={{ color: "#ff453a" }}>Tube</span>
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: "#fff",
              textAlign: "center",
              lineHeight: 1.2,
              maxWidth: 800,
              wordBreak: "break-word",
            }}
          >
            {title}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
