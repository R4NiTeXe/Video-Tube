import crypto from "crypto";
import fs from "fs";
import { Video } from "../models/video.model.js";
import { getRedis, isRedisAvailable } from "../utils/redis.js";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const IDEMPOTENCY_TTL = 86400; // 24h
const PENDING_STALE_MS = 30 * 1000; // 30s — stale pending is recoverable quickly after crash
const IDEM_PREFIX = "idem:upload:";

const getIdempotencyKey = (req) => {
  const raw =
    req.headers["idempotency-key"] ||
    req.headers["x-idempotency-key"] ||
    req.headers["Idempotency-Key"] ||
    req.headers["X-Idempotency-Key"];
  if (!raw) return null;
  const val = Array.isArray(raw) ? raw[0] : raw;
  return String(val).trim();
};

const computeFingerprint = async (req) => {
  const title = (req.body?.title || "").trim();
  const description = (req.body?.description || "").trim();
  const category = (req.body?.category || "General").trim();
  const tagsRaw = req.body?.tags ?? "";
  let tagsNorm = "";
  if (typeof tagsRaw === "string") {
    tagsNorm = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .sort()
      .join(",");
  } else if (Array.isArray(tagsRaw)) {
    tagsNorm = tagsRaw.map((t) => String(t).trim()).filter(Boolean).sort().join(",");
  }
  let chaptersNorm = "";
  const chaptersRaw = req.body?.chapters ?? "";
  if (chaptersRaw) {
    try {
      const parsed =
        typeof chaptersRaw === "string" ? JSON.parse(chaptersRaw) : chaptersRaw;
      if (Array.isArray(parsed)) {
        const filtered = parsed
          .filter((ch) => ch && ch.title && typeof ch.startTime === "number")
          .sort((a, b) => a.startTime - b.startTime);
        chaptersNorm = JSON.stringify(filtered);
      }
    } catch {
      chaptersNorm = String(chaptersRaw);
    }
  }
  const scheduledAt = String(req.body?.scheduledAt || "").trim();

  const videoFile = req.files?.videoFile?.[0];
  const thumbFile = req.files?.thumbnail?.[0];

  const videoMeta = videoFile
    ? `${videoFile.originalname}:${videoFile.size}:${videoFile.mimetype}`
    : "no-video";
  const thumbMeta = thumbFile
    ? `${thumbFile.originalname}:${thumbFile.size}:${thumbFile.mimetype}`
    : "no-thumb";

  // Strongest practical identity: include partial content hash (first 64KB)
  let videoHash = "";
  let thumbHash = "";
  try {
    if (videoFile?.path && fs.existsSync(videoFile.path)) {
      const hash = crypto.createHash("sha256");
      const fd = fs.openSync(videoFile.path, "r");
      const toRead = Math.min(65536, videoFile.size || 65536);
      const buf = Buffer.alloc(toRead);
      const bytes = fs.readSync(fd, buf, 0, toRead, 0);
      fs.closeSync(fd);
      hash.update(buf.subarray(0, bytes));
      videoHash = hash.digest("hex").slice(0, 16);
    }
    if (thumbFile?.path && fs.existsSync(thumbFile.path)) {
      const hash2 = crypto.createHash("sha256");
      const fd2 = fs.openSync(thumbFile.path, "r");
      const buf2 = Buffer.alloc(65536);
      const bytes2 = fs.readSync(fd2, buf2, 0, 65536, 0);
      fs.closeSync(fd2);
      hash2.update(buf2.subarray(0, bytes2));
      thumbHash = hash2.digest("hex").slice(0, 16);
    }
  } catch {
    // ignore hash errors, fallback to meta only
  }

  const payload = `${title}|${description}|${category}|${tagsNorm}|${chaptersNorm}|${scheduledAt}|${videoMeta}:${videoHash}|${thumbMeta}:${thumbHash}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
};

const cleanupTempFiles = (req) => {
  const files = [];
  if (req.files) {
    for (const arr of Object.values(req.files)) {
      for (const f of arr) if (f?.path) files.push(f.path);
    }
  }
  if (req.file?.path) files.push(req.file.path);
  for (const p of files) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      // best-effort
    }
  }
};

export const idempotencyMiddleware = async (req, res, next) => {
  const rawKey = getIdempotencyKey(req);
  if (!rawKey) return next();

  if (!UUID_V4_REGEX.test(rawKey)) {
    cleanupTempFiles(req);
    throw new ApiError(400, "Invalid Idempotency-Key: must be UUID v4");
  }
  const idempotencyKey = rawKey.toLowerCase();

  if (!req.user?._id) {
    // Should not happen — verifyJWT before this middleware
    return next();
  }

  const redisKey = `${IDEM_PREFIX}${req.user._id.toString()}:${idempotencyKey}`;
  let fingerprint;
  try {
    fingerprint = await computeFingerprint(req);
  } catch (err) {
    logger.warn("Failed to compute idempotency fingerprint", { error: err.message });
    fingerprint = "unknown";
  }

  req.idempotencyKey = idempotencyKey;
  req.idempotencyFingerprint = fingerprint;
  req.idempotencyRedisKey = redisKey;

  // 1) Redis fast path
  if (isRedisAvailable()) {
    try {
      const cachedStr = await getRedis().get(redisKey);
      if (cachedStr) {
        try {
          const cached = JSON.parse(cachedStr);
          if (cached.status === "pending") {
            // Always check DB first — crash after Video.create should replay, not 409
            const dbDoc = await Video.findOne({
              owner: req.user._id,
              idempotencyKey,
            }).lean();
            if (dbDoc) {
              if (dbDoc.idempotencyFingerprint && dbDoc.idempotencyFingerprint !== fingerprint) {
                cleanupTempFiles(req);
                throw new ApiError(422, "Idempotency-Key already used with different payload");
              }
              // DB already has completed document — stale Redis pending, clean and replay fresh
              try {
                await getRedis().del(redisKey);
              } catch (_e) {
                void _e;
              }
              const body = new ApiResponse(201, dbDoc, "Video published successfully");
              // Repopulate Redis completed for future lookups
              try {
                const completed = {
                  status: "completed",
                  fingerprint,
                  videoId: dbDoc._id.toString(),
                  statusCode: 201,
                  body,
                  createdAt: Date.now(),
                };
                await getRedis().setex(redisKey, IDEMPOTENCY_TTL, JSON.stringify(completed));
              } catch (_e) {
                void _e;
              }
              cleanupTempFiles(req);
              return res.status(201).json(body);
            }
            // No DB doc — check staleness
            const age = Date.now() - (cached.createdAt || 0);
            if (age >= PENDING_STALE_MS) {
              await getRedis().del(redisKey);
              logger.info("Cleared stale pending idempotency key", { redisKey, age });
              // fall through to DB check / reservation
            } else if (cached.fingerprint === fingerprint) {
              cleanupTempFiles(req);
              return res
                .status(409)
                .json(new ApiResponse(409, {}, "Request already in progress. Retry later."));
            } else {
              cleanupTempFiles(req);
              throw new ApiError(422, "Idempotency-Key already in use with different payload");
            }
          } else if (cached.status === "completed") {
            // Always verify against DB — MongoDB is source of truth, Redis may be stale
            const dbDoc = await Video.findOne({
              owner: req.user._id,
              idempotencyKey,
            }).lean();
            if (!dbDoc) {
              // Orphaned Redis entry — invalidate and continue
              try {
                await getRedis().del(redisKey);
              } catch (_e) {
                void _e;
              }
              // fall through to DB check section
            } else {
              if (dbDoc.idempotencyFingerprint && dbDoc.idempotencyFingerprint !== fingerprint) {
                cleanupTempFiles(req);
                throw new ApiError(422, "Idempotency-Key already used with different payload");
              }
              // Replay fresh DB document, not cached body
              const body = new ApiResponse(201, dbDoc, "Video published successfully");
              cleanupTempFiles(req);
              return res.status(201).json(body);
            }
          }
        } catch (parseErr) {
          if (parseErr instanceof ApiError) throw parseErr;
          logger.warn("Failed to parse idempotency Redis value", { error: parseErr.message });
        }
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      logger.warn("Idempotency Redis check failed", { error: err.message });
    }
  }

  // 2) DB check (source of truth when Redis unavailable or no Redis entry)
  try {
    const existingVideo = await Video.findOne({
      owner: req.user._id,
      idempotencyKey,
    }).lean();
    if (existingVideo) {
      if (existingVideo.idempotencyFingerprint && existingVideo.idempotencyFingerprint !== fingerprint) {
        cleanupTempFiles(req);
        throw new ApiError(422, "Idempotency-Key already used with different payload");
      }
      // Replay original response
      const body = new ApiResponse(201, existingVideo, "Video published successfully");
      // Populate Redis completed for faster future lookups
      if (isRedisAvailable()) {
        try {
          const completed = {
            status: "completed",
            fingerprint,
            videoId: existingVideo._id.toString(),
            statusCode: 201,
            body,
            createdAt: Date.now(),
          };
          await getRedis().setex(redisKey, IDEMPOTENCY_TTL, JSON.stringify(completed));
        } catch {
          // ignore
        }
      }
      cleanupTempFiles(req);
      return res.status(201).json(body);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.warn("Idempotency DB check failed", { error: err.message });
  }

  // 3) Reserve pending in Redis (NX) to coordinate concurrent retries
  if (isRedisAvailable()) {
    try {
      const pending = {
        status: "pending",
        fingerprint,
        createdAt: Date.now(),
      };
      const setRes = await getRedis().set(redisKey, JSON.stringify(pending), "NX", "EX", IDEMPOTENCY_TTL);
      if (setRes !== "OK") {
        // Another concurrent request just reserved — re-check
        const retryStr = await getRedis().get(redisKey);
        if (retryStr) {
          const retry = JSON.parse(retryStr);
          if (retry.status === "pending" && retry.fingerprint === fingerprint) {
            cleanupTempFiles(req);
            return res
              .status(409)
              .json(new ApiResponse(409, {}, "Request already in progress. Retry later."));
          }
          if (retry.status === "completed" && retry.fingerprint === fingerprint) {
            cleanupTempFiles(req);
            return res.status(retry.statusCode || 201).json(retry.body);
          }
          if (retry.fingerprint !== fingerprint) {
            cleanupTempFiles(req);
            throw new ApiError(422, "Idempotency-Key already in use with different payload");
          }
        }
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      logger.warn("Idempotency pending reservation failed", { error: err.message });
    }
  }

  // 4) Intercept response to store completed / cleanup on failure
  const originalJson = res.json.bind(res);
  const originalStatus = res.status.bind(res);
  let capturedStatus = 200;
  let statusOverridden = false;

  res.status = (code) => {
    capturedStatus = code;
    statusOverridden = true;
    return originalStatus(code);
  };

  res.json = async (body) => {
    const isSuccess = capturedStatus >= 200 && capturedStatus < 300;
    // Express may have called res.json without explicit res.status — default 200
    if (!statusOverridden && body?.statusCode) {
      capturedStatus = body.statusCode;
    }

    if (isSuccess && body?.data?._id) {
      const videoId = body.data._id.toString();
      if (isRedisAvailable()) {
        try {
          const completed = {
            status: "completed",
            fingerprint,
            videoId,
            statusCode: capturedStatus,
            body,
            createdAt: Date.now(),
          };
          await getRedis().setex(redisKey, IDEMPOTENCY_TTL, JSON.stringify(completed));
        } catch (err) {
          logger.warn("Failed to store idempotency completed", { error: err.message });
        }
      }
    } else if (capturedStatus >= 400) {
      // On failure, clear pending so retry can succeed (unless it's a fingerprint mismatch which already threw)
      if (isRedisAvailable()) {
        try {
          const curStr = await getRedis().get(redisKey);
          if (curStr) {
            const cur = JSON.parse(curStr);
            if (cur.status === "pending" && cur.fingerprint === fingerprint) {
              await getRedis().del(redisKey);
            }
          }
        } catch (_e) {
          void _e;
        }
      }
    }
    return originalJson(body);
  };

  // Handle client abort / error without response
  req.on("close", async () => {
    // If connection closed before response and we are still pending, keep pending for stale window to allow retry to get 409, then stale recovery will clear it
  });

  return next();
};
