// Database backup script
// Usage: node scripts/backup.cjs [output-dir]
// Requires mongodump in PATH or set MONGODB_URI env variable

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI environment variable is required");
  process.exit(1);
}

const outDir = path.resolve(process.argv[2] || path.join(__dirname, "..", "backups"));
fs.mkdirSync(outDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const dumpDir = path.join(outDir, `backup-${timestamp}`);

try {
  console.log(`Starting backup to ${dumpDir}`);
  execSync(`mongodump --uri="${uri}" --out="${dumpDir}" --gzip`, { stdio: "inherit" });
  console.log(`Backup completed: ${dumpDir}`);
} catch (err) {
  console.error("Backup failed:", err.message);
  process.exit(1);
}
