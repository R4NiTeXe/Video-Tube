#!/usr/bin/env node

/**
 * MongoDB backup script for VideoTube.
 * Usage: node scripts/backup.cjs
 * Requires MONGODB_URI in environment or .env file.
 * Backups are saved to ./backups/ with timestamped filenames.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const BACKUP_DIR = path.join(__dirname, "..", "backups");
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_NAME = `videotube-backup-${TIMESTAMP}`;

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Error: MONGODB_URI environment variable is not set.");
    process.exit(1);
  }
  return uri;
}

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function runBackup() {
  const uri = getMongoUri();
  ensureBackupDir();

  const backupPath = path.join(BACKUP_DIR, BACKUP_NAME);
  const cmd = `mongodump --uri="${uri}" --out="${backupPath}" --gzip`;

  console.log(`Starting backup: ${BACKUP_NAME}`);
  console.log(`Output: ${backupPath}`);

  try {
    execSync(cmd, { stdio: "inherit" });
    console.log("Backup completed successfully.");

    const files = fs.readdirSync(BACKUP_DIR);
    const backups = files
      .filter((f) => f.startsWith("videotube-backup-"))
      .sort()
      .reverse();

    if (backups.length > 7) {
      const toDelete = backups.slice(7);
      toDelete.forEach((old) => {
        const oldPath = path.join(BACKUP_DIR, old);
        fs.rmSync(oldPath, { recursive: true, force: true });
        console.log(`Pruned old backup: ${old}`);
      });
    }
  } catch (err) {
    console.error("Backup failed:", err.message);
    process.exit(1);
  }
}

runBackup();
