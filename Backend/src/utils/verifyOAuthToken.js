import { ApiError } from "./ApiError.js";

const fetchWithTimeout = (url, options = {}, ms = 10000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const verifyOAuthToken = async (provider, token) => {
  if (!token) {
    throw new ApiError(400, "OAuth access token is required");
  }

  if (provider === "google") {
    const response = await fetchWithTimeout(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      10000
    );
    if (!response.ok) {
      const body = await response.text();
      throw new ApiError(401, `Google OAuth token verification failed: ${response.status} ${body}`);
    }
    const data = await response.json();
    return {
      email: data.email,
      name: data.name,
      avatar: data.picture,
      providerId: data.sub,
    };
  }

  if (provider === "github") {
    const response = await fetchWithTimeout(
      "https://api.github.com/user",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": "VideoTube",
        },
      },
      10000
    );
    if (!response.ok) {
      const body = await response.text();
      throw new ApiError(401, `GitHub OAuth token verification failed: ${response.status} ${body}`);
    }
    const data = await response.json();
    const emailsResponse = await fetchWithTimeout(
      "https://api.github.com/user/emails",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": "VideoTube",
        },
      },
      10000
    );
    const emails = emailsResponse.ok ? await emailsResponse.json() : [];
    const primaryEmail = emails.find((e) => e.primary)?.email || data.email;
    return {
      email: primaryEmail,
      name: data.name || data.login,
      avatar: data.avatar_url,
      providerId: String(data.id),
    };
  }

  throw new ApiError(
    400,
    `OAuth token verification not implemented for provider: ${provider}. Use the server-side OAuth flow at /api/v1/auth/${provider}`
  );
};
