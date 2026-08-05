import { ImageResponse } from "next/og";
import { API_FULL_URL } from "@/src/services/config";

export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "Channel on VideoTube";

export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  let name = username;
  let bio = "";
  let avatar: string | null = null;

  try {
    const res = await fetch(`${API_FULL_URL}/users/u/${username}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      name = data?.data?.fullName || name;
      bio = data?.data?.bio || "";
      avatar = data?.data?.avatar || null;
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            zIndex: 1,
          }}
        >
          {avatar && (
            <img
              src={avatar}
              alt=""
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                border: "4px solid #ff453a",
              }}
            />
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 20,
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
              fontSize: 44,
              fontWeight: 800,
              color: "#fff",
              textAlign: "center",
              lineHeight: 1.2,
              maxWidth: 900,
            }}
          >
            {name}
          </div>
          {bio && (
            <div
              style={{
                fontSize: 22,
                color: "#888",
                textAlign: "center",
                maxWidth: 700,
              }}
            >
              {bio.slice(0, 120)}
            </div>
          )}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
