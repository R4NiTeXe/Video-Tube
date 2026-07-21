import { ApiError } from "./ApiError.js";

const PROVIDER_VERIFICATION_URLS = {
  google: "https://www.googleapis.com/oauth2/v3/userinfo",
  github: "https://api.github.com/user",
};

export const verifyOAuthToken = async (provider, token) => {
  if (!token) {
    throw new ApiError(400, "OAuth access token is required");
  }

  if (provider === "google") {
    const response = await fetch(PROVIDER_VERIFICATION_URLS.google, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new ApiError(401, "Invalid Google OAuth token");
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
    const response = await fetch(PROVIDER_VERIFICATION_URLS.github, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "VideoTube",
      },
    });
    if (!response.ok) {
      throw new ApiError(401, "Invalid GitHub OAuth token");
    }
    const data = await response.json();
    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "VideoTube",
      },
    });
    const emails = emailsResponse.ok ? await emailsResponse.json() : [];
    const primaryEmail = emails.find((e) => e.primary)?.email || data.email;
    return {
      email: primaryEmail,
      name: data.name || data.login,
      avatar: data.avatar_url,
      providerId: String(data.id),
    };
  }

  throw new ApiError(400, `OAuth token verification not implemented for provider: ${provider}. Use the server-side OAuth flow at /api/v1/auth/${provider}.`);
};