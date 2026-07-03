import passport from "passport";
import crypto from "crypto";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as DiscordStrategy } from "passport-discord";
import { User } from "../models/user.model.js";

const CALLBACK_URL = `${process.env.BACKEND_URL || "http://localhost:8000"}/api/v1/auth`;

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
  } else {
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const socialMap = new Map();
    socialMap.set(provider, providerId);

    const usernameBase = normalizedEmail.split("@")[0].replace(/[^a-z0-9]/g, "");
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
    });
  }

  return user;
};

export const configurePassport = () => {
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
          callbackURL: `${CALLBACK_URL}/google/callback`,
          scope: ["profile", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const user = await findOrCreateUser(
              "google",
              profile.id,
              profile.emails?.[0]?.value,
              profile.displayName,
              profile.photos?.[0]?.value
            );
            done(null, user);
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
          callbackURL: `${CALLBACK_URL}/github/callback`,
          scope: ["user:email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
            const user = await findOrCreateUser(
              "github",
              profile.id.toString(),
              email,
              profile.displayName || profile.username,
              profile.photos?.[0]?.value
            );
            done(null, user);
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
          callbackURL: `${CALLBACK_URL}/facebook/callback`,
          profileFields: ["id", "displayName", "photos"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value || `${profile.id}@facebook.local`;
            const user = await findOrCreateUser(
              "facebook",
              profile.id,
              email,
              profile.displayName,
              profile.photos?.[0]?.value
            );
            done(null, user);
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
          callbackURL: `${CALLBACK_URL}/discord/callback`,
          scope: ["identify", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.email || `${profile.id}@discord.local`;
            const user = await findOrCreateUser(
              "discord",
              profile.id,
              email,
              profile.username,
              profile.avatar
                ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
                : null
            );
            done(null, user);
          } catch (err) {
            done(err, null);
          }
        }
      )
    );
  }

  return passport;
};
