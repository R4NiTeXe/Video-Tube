import passport from "passport";
import crypto from "crypto";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as DiscordStrategy } from "passport-discord";
import { User } from "../models/user.model.js";
import logger from "../utils/logger.js";

const getProviderCallbackUrl = (provider) => {
  const envVar = `${provider.toUpperCase()}_CALLBACK_URL`;
  const configured = process.env[envVar];
  if (configured) return configured.replace(/\/+$/, "");
  const baseCallbackUrl = `${process.env.BACKEND_URL || "http://localhost:8000"}/api/v1/auth`;
  return `${baseCallbackUrl}/${provider}/callback`;
};

const findOrCreateUser = async (provider, providerId, email, name, avatar) => {
  if (!email) throw new Error("Email is required from OAuth provider");

  const normalizedEmail = email.toLowerCase().trim();
  let user = await User.findOne({ email: normalizedEmail });

  if (user) {
    user.socialAccounts = user.socialAccounts || new Map();
    user.socialAccounts.set(provider, providerId);
    if (avatar && (!user.avatar || user.avatar === "")) {
      user.avatar = avatar;
    }
    await user.save({ validateBeforeSave: false });
    return { user, isNew: false };
  }

  const randomPassword = crypto.randomBytes(32).toString("hex");
  const socialMap = { [provider]: providerId };

  const usernameBase = normalizedEmail.split("@")[0].replace(/[^a-z0-9]/g, "") || "user";
  let username = usernameBase;
  let suffix = 1;
  while (await User.findOne({ username })) {
    username = `${usernameBase}${suffix}`;
    suffix++;
  }

  user = await User.create({
    username,
    fullName: name || normalizedEmail.split("@")[0],
    email: normalizedEmail,
    password: randomPassword,
    avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=6366f1&color=fff`,
    socialAccounts: socialMap,
    isEmailVerified: true,
  });

  return { user, isNew: true };
};

const sanitizeUser = (user, isNew) => {
  const obj = user.toObject({ virtuals: true });
  delete obj.password;
  delete obj.refreshToken;
  return { ...obj, _isNew: isNew };
};

export const configurePassport = () => {
  const googleCallbackUrl = getProviderCallbackUrl("google");
  const githubCallbackUrl = getProviderCallbackUrl("github");
  const facebookCallbackUrl = getProviderCallbackUrl("facebook");
  const discordCallbackUrl = getProviderCallbackUrl("discord");

  logger.info("OAuth callback URLs: ", {
    google: googleCallbackUrl,
    github: githubCallbackUrl,
    facebook: facebookCallbackUrl,
    discord: discordCallbackUrl,
  });

  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Google
  if (process.env.GOOGLE_CLIENT_ID) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: googleCallbackUrl,
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const { user, isNew } = await findOrCreateUser(
              "google",
              profile.id,
              profile.emails?.[0]?.value,
              profile.displayName,
              profile.photos?.[0]?.value
            );
            done(null, sanitizeUser(user, isNew));
          } catch (err) {
            done(err, null);
          }
        }
      )
    );
  }

  // GitHub
  if (process.env.GITHUB_CLIENT_ID) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: githubCallbackUrl,
          scope: ["user:email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
            const { user, isNew } = await findOrCreateUser(
              "github",
              profile.id.toString(),
              email,
              profile.displayName || profile.username,
              profile.photos?.[0]?.value
            );
            done(null, sanitizeUser(user, isNew));
          } catch (err) {
            done(err, null);
          }
        }
      )
    );
  }

  // Facebook
  if (process.env.FACEBOOK_APP_ID) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          callbackURL: facebookCallbackUrl,
          profileFields: ["id", "displayName", "photos", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value || `${profile.id}@facebook.local`;
            const { user, isNew } = await findOrCreateUser(
              "facebook",
              profile.id,
              email,
              profile.displayName,
              profile.photos?.[0]?.value
            );
            done(null, sanitizeUser(user, isNew));
          } catch (err) {
            done(err, null);
          }
        }
      )
    );
  }

  // Discord
  if (process.env.DISCORD_CLIENT_ID) {
    passport.use(
      new DiscordStrategy(
        {
          clientID: process.env.DISCORD_CLIENT_ID,
          clientSecret: process.env.DISCORD_CLIENT_SECRET,
          callbackURL: discordCallbackUrl,
          scope: ["identify", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.email || `${profile.id}@discord.local`;
            const { user, isNew } = await findOrCreateUser(
              "discord",
              profile.id,
              email,
              profile.username,
              profile.avatar
                ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
                : null
            );
            done(null, sanitizeUser(user, isNew));
          } catch (err) {
            done(err, null);
          }
        }
      )
    );
  }

  return passport;
};
