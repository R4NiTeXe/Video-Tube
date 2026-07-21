const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'app');
const pages = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.isFile() && entry.name === 'page.tsx') pages.push(p);
  }
}
walk(dir);
const report = pages.map((file) => {
  const src = fs.readFileSync(file, 'utf8');
  const hasMeta = /export\s+const\s+metadata/.test(src) || /<PageMeta\s/.test(src);
  return { file: path.relative(process.cwd(), file), hasMeta };
});
const missing = report.filter((r) => !r.hasMeta);
console.log(JSON.stringify({ total: report.length, missing }, null, 2));
