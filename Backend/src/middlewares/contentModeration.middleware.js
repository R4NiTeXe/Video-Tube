import { ApiError } from "../utils/ApiError.js";

const DEFAULT_BANNED_WORDS = [
  "spam", "scam", "hack", "cheat", "fake",
  "hate", "abuse", "harass", "bully", "kill",
  "stupid", "idiot", "moron", "dumb",
  "porn", "xxx", "nude", "sex",
  "damn", "hell", "crap", "ass",
  "nigger", "faggot", "retard",
];

const getBannedWords = () => {
  const envWords = process.env.CONTENT_BANNED_WORDS;
  if (envWords && typeof envWords === "string") {
    return envWords.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
  }
  return DEFAULT_BANNED_WORDS;
};

const contentModerator = (req, res, next) => {
  const bannedWords = getBannedWords();
  const fieldsToCheck = [];

  if (req.body?.content && typeof req.body.content === "string") {
    fieldsToCheck.push(req.body.content);
  }
  if (req.body?.title && typeof req.body.title === "string") {
    fieldsToCheck.push(req.body.title);
  }

  const combinedText = fieldsToCheck.join(" ").toLowerCase();

  for (const word of bannedWords) {
    if (combinedText.includes(word)) {
      throw new ApiError(400, "Content contains inappropriate language");
    }
  }

  next();
};

export { contentModerator };
