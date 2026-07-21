import { ApiError } from "../utils/ApiError.js";

const DEFAULT_BANNED_WORDS = [
  "spam", "scam", "hack", "cheat", "fake",
  "hate", "abuse", "harass", "bully", "kill",
  "stupid", "idiot", "moron", "dumb",
  "porn", "xxx", "nude", "sex",
  "damn", "hell", "crap", "ass",
  "nigger", "faggot", "retard",
];

const LEET_MAP = {
  "@": "a", "4": "a",
  "8": "b",
  "(": "c", "{": "c", "[": "c", "<": "c",
  "3": "e",
  "6": "g", "9": "g",
  "#": "h",
  "1": "i", "!": "i", "|": "i",
  "0": "o",
  "$": "s", "5": "s", "z": "s",
  "7": "t", "+": "t",
  "2": "z",
};

const normalizeText = (text) => {
  let normalized = text.toLowerCase();
  // Replace leet speak characters
  normalized = normalized.split("").map((c) => LEET_MAP[c] || c).join("");
  // Strip non-alphanumeric characters (except spaces) to catch s.p.a.m style bypass
  normalized = normalized.replace(/[^a-z0-9\s]/g, "");
  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
};

const getBannedWords = () => {
  const envWords = process.env.CONTENT_BANNED_WORDS;
  if (envWords && typeof envWords === "string") {
    return envWords.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
  }
  return DEFAULT_BANNED_WORDS;
};

const TEXT_FIELDS = ["content", "title", "description", "name", "bio", "comment", "text"];

const contentModerator = (req, res, next) => {
  const bannedWords = getBannedWords();
  const fieldsToCheck = [];

  for (const field of TEXT_FIELDS) {
    if (req.body?.[field] && typeof req.body[field] === "string") {
      fieldsToCheck.push(req.body[field]);
    }
  }

  const combinedText = normalizeText(fieldsToCheck.join(" "));

  const escapedWords = bannedWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`\\b(${escapedWords.join("|")})\\b`, "i");
  if (pattern.test(combinedText)) {
    throw new ApiError(400, "Content contains inappropriate language");
  }

  next();
};

export { contentModerator };
